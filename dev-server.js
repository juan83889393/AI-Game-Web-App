// Local test server: shows the game AND runs api/classify.js,
// so the AI works on your computer without installing Vercel.
//
// Start it with:  npm start
// (npm start runs Node with --env-file=.env.local, which loads your key.)
//
// Vercel doesn't use this file. When the site is deployed, Vercel runs
// api/classify.js by itself.

import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import classify from "./api/classify.js";

const PORT = 3000;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MAX_BODY_BYTES = 4.5 * 1024 * 1024; // same limit as Vercel

// Only these files are ever sent to the browser.
// Anything else (like .env.local with your key) gets "Not found".
const PUBLIC_FILES = {
  "/index.html": "text/html; charset=utf-8",
  "/style.css": "text/css; charset=utf-8",
  "/script.js": "text/javascript; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // The AI function
    if (url.pathname === "/api/classify") {
      const body = await readBody(req);
      if (body === null) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "The photo is too big." }));
        return;
      }

      // Hand the request to api/classify.js the same way Vercel does
      const request = new Request(url, {
        method: req.method,
        headers: { "Content-Type": req.headers["content-type"] ?? "" },
        body: req.method === "POST" || req.method === "PUT" ? body : undefined,
      });
      const response = await classify.fetch(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    // The page files
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const contentType = PUBLIC_FILES[filePath];
    if (!contentType) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const file = await readFile(path.join(ROOT, filePath));
    res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
    res.end(file);
  } catch (error) {
    console.error("Server error:", error.message);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server error");
  }
});

// Reads the request body, or returns null if it's too big.
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

if (!process.env.OPENAI_API_KEY) {
  console.warn("Warning: OPENAI_API_KEY isn't set. Check that .env.local exists and has your key.");
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Game running at http://localhost:${PORT}  (press Control + C to stop)`);
});
