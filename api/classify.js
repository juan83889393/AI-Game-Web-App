// Server function: POST /api/classify
//
// The browser sends one webcam photo here. This code runs on Vercel's servers
// (never in the browser), asks OpenAI which hand gesture the photo shows, and
// sends back one word: rock, paper, scissors or none.
//
// The photo only lives in memory while this request runs. It is never saved.

const OPENAI_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-6-luna";
const MAX_IMAGE_LENGTH = 1_000_000; // about 1 MB, far under Vercel's 4.5 MB limit
const MOVES = ["rock", "paper", "scissors", "none"];

const NO_HAND_MESSAGE = "Couldn't see your hand. Try again!";
const ERROR_MESSAGE = "Couldn't check your hand right now. Try again!";

const PROMPT =
  "Look at the hand in this photo. Is it making a rock (fist), paper (open flat hand), " +
  "or scissors (two fingers in a V) gesture for rock-paper-scissors? " +
  "Reply with exactly one lowercase word: rock, paper, scissors, or none. " +
  "Use none if no hand is clearly visible.";

export default {
  async fetch(request) {
    // 1. Only accept POST requests.
    if (request.method !== "POST") {
      return Response.json({ error: "Use POST." }, { status: 405, headers: { Allow: "POST" } });
    }

    // 2. Read the JSON body: { "image": "data:image/jpeg;base64,..." }
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Send JSON with an image field." }, { status: 400 });
    }

    const image = body?.image;
    if (typeof image !== "string" || !/^data:image\/(jpeg|png);base64,/.test(image)) {
      return Response.json({ error: "The image must be a JPEG or PNG data URL." }, { status: 400 });
    }
    if (image.length > MAX_IMAGE_LENGTH) {
      return Response.json({ error: "The photo is too big. Keep it under 1 MB." }, { status: 413 });
    }

    // 3. Read the secret key. It stays on the server and is never sent back.
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY is not set on the server.");
      return Response.json({ move: "none", message: ERROR_MESSAGE }, { status: 500 });
    }

    // 4. Ask OpenAI what the hand shows.
    try {
      const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          reasoning: { effort: "none" }, // answer right away, no "thinking" time
          max_output_tokens: 16,
          input: [
            {
              role: "user",
              content: [
                { type: "input_text", text: PROMPT },
                { type: "input_image", image_url: image, detail: "low" },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(15000), // give up after 15 seconds
      });

      const data = await response.json();

      if (!response.ok) {
        // Log only the error type. OpenAI's message can include part of the key.
        console.error("OpenAI error:", response.status, data?.error?.type, data?.error?.code);
        return Response.json({ move: "none", message: ERROR_MESSAGE }, { status: 502 });
      }

      // 5. Turn the reply into one of our four words.
      const move = toMove(getReplyText(data));
      if (move === "none") {
        return Response.json({ move, message: NO_HAND_MESSAGE });
      }
      return Response.json({ move });
    } catch (error) {
      console.error("Could not reach OpenAI:", error.name);
      return Response.json({ move: "none", message: ERROR_MESSAGE }, { status: 502 });
    }
  },
};

// Find the text in OpenAI's reply. Some replies have a ready-made
// "output_text" field; otherwise the text sits inside the "output" list.
function getReplyText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  for (const item of data.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === "output_text") return part.text;
    }
  }
  return "";
}

// Clean up the reply ("Rock." becomes "rock"). Anything unexpected becomes "none".
function toMove(text) {
  const word = String(text).toLowerCase().replace(/[^a-z]/g, "");
  return MOVES.includes(word) ? word : "none";
}
