# PRD: Webcam Rock-Paper-Scissors

**Owner:** John (beginner, learning to code)
**Last updated:** 2026-11-02
**Status:** Step 1 (project setup) done. Next up: step 2, visual design. Steps 2–7 not started.

---

## 1. Summary

A browser game where you play rock-paper-scissors against the computer using your webcam. You click **Play**, a countdown runs, and at "Shoot!" the page takes one photo of your hand. A small server function sends that photo to OpenAI, which replies with one word: what your hand shows. The computer picks its move at random in code, and the page shows the result and a running score.

## 2. Goals

- A working, fun game that runs on a public Vercel URL.
- A beginner-friendly codebase: plain HTML, CSS and JavaScript, no frameworks, no build step.
- A clean, consistent look that follows the style guide in `DESIGN.md`.
- Built in small steps. Each step is tested and committed before moving on.
- The OpenAI API key stays secret at all times.

## 3. Out of scope

- User accounts, logins, leaderboards or a database.
- Saving photos or game history.
- Multiplayer.
- Frameworks (React, Next.js, etc.) or build tools.

---

## 4. How the game works (user flow)

1. The page loads and asks for webcam permission. The live webcam feed appears with a **Play** button.
2. The player clicks **Play**. The button is disabled right away.
3. A countdown shows: **Rock… Paper… Scissors… Shoot!** (about 0.7 seconds per word).
4. At **Shoot!**, the page captures one still frame from the webcam.
5. The frame is shrunk and compressed, then sent to `/api/classify`.
6. The server asks OpenAI what the hand shows and returns `rock`, `paper`, `scissors`, or `none`.
7. The computer's move is picked at random in the browser **after** the photo is taken, so it can't react to the player.
8. The page shows: your move, the computer's move, who won, and the updated score.
9. If no hand was found or something went wrong, the page shows a friendly **"Couldn't see your hand. Try again!"** message, and the score doesn't change.
10. The **Play** button turns back on.

---

## 5. Functional requirements

### 5.1 Webcam
| ID | Requirement |
|---|---|
| CAM-1 | Show the live webcam feed using `navigator.mediaDevices.getUserMedia({ video: true })`. |
| CAM-2 | If permission is denied or no camera exists, show a clear message explaining how to allow camera access. Keep **Play** disabled. |
| CAM-3 | Mirror the video preview (CSS `transform: scaleX(-1)`) so it feels like a mirror. The captured image doesn't need to be mirrored. |

### 5.2 Countdown and capture
| ID | Requirement |
|---|---|
| CAP-1 | Clicking **Play** starts the countdown: "Rock…", "Paper…", "Scissors…", "Shoot!". |
| CAP-2 | At "Shoot!", draw the current video frame onto a hidden `<canvas>`. |
| CAP-3 | Shrink the image so its longest side is at most **512 px**. |
| CAP-4 | Compress to JPEG at about **0.7 quality** with `canvas.toDataURL("image/jpeg", 0.7)`. The expected size is about 20–60 KB. |
| CAP-5 | The image exists only in memory. It is never saved to disk, local storage or any server. |

### 5.3 Server function (`/api/classify`)
| ID | Requirement |
|---|---|
| API-1 | Lives in `api/classify.js`. Vercel turns this into a serverless function automatically. |
| API-2 | Accepts only `POST` requests with a JSON body: `{ "image": "data:image/jpeg;base64,..." }`. Anything else gets a `405` or `400` error. |
| API-3 | Rejects images over ~1 MB (well under Vercel's 4.5 MB limit), and rejects anything that isn't a `data:image/jpeg` or `data:image/png` string. |
| API-4 | Reads the key from `process.env.OPENAI_API_KEY`. The key is never sent back to the browser or written to logs. |
| API-5 | Calls OpenAI's **Responses API** (`POST https://api.openai.com/v1/responses`) with the built-in `fetch`, so no npm packages are needed. See §7. |
| API-6 | Cleans up the reply (lowercase, trim spaces and punctuation). If it isn't exactly `rock`, `paper`, `scissors` or `none`, it returns `none`. |
| API-7 | Returns `{ "move": "rock" }` (or `paper`, `scissors`, `none`). On an OpenAI error or timeout, it returns `{ "move": "none", "error": "..." }` with a friendly message. |
| API-8 | Does not store the image. After the request finishes, it's gone. |

### 5.4 Game logic and scoring
| ID | Requirement |
|---|---|
| GAME-1 | The computer's move is `["rock","paper","scissors"][Math.floor(Math.random()*3)]`, picked in the browser. AI is not involved. |
| GAME-2 | Rules: rock beats scissors, scissors beats paper, paper beats rock, and matching moves are a tie. |
| GAME-3 | Score (wins, losses, ties) is kept in JavaScript variables on the page. Refreshing the page resets it. No database. |
| GAME-4 | Show each move with an emoji (✊ ✋ ✌️) and text. |
| GAME-5 | If the move is `none`, show "Try again" and don't count the round. |

### 5.5 Spam protection
| ID | Requirement |
|---|---|
| SPAM-1 | **Play** is disabled from the click until the result appears, including on errors. |
| SPAM-2 | Add a short cooldown (~1 second) after each round before **Play** turns back on. |
| SPAM-3 | Set a monthly **spending limit** in the OpenAI dashboard. The `/api` URL is public, so this is the safety net if someone calls it directly. |

---

## 6. Visual design requirements

All visual design follows **`DESIGN.md`** (the "Air" style guide) in the project root. Design is its own build step (step 2). It changes **only HTML and CSS**, not game logic or API code. When it's done, Claude shows what changed and waits for feedback before moving on.

### 6.1 Overall look
| ID | Requirement |
|---|---|
| DES-1 | Dark theme: Black Void (`#000000`) canvas and Whiteout (`#ffffff`) text, with light Haze (`#f5f5f5`) cards sitting on top as "islands." Text on Haze cards uses Ink (`#1b1b1b`). |
| DES-2 | Flat surfaces only: no shadows, no gradients, no solid colored buttons. |
| DES-3 | Copy the CSS custom properties from the **Quick Start** section of `DESIGN.md` into `style.css` under `:root`. Use those variables everywhere instead of hard-coding colors, sizes, spacing or radii. |
| DES-4 | The "Control" fonts are proprietary, so load these substitutes from Google Fonts and point the font variables at them: **Inter** (400, 500) for interface text, **Anton** for the compressed display style, and **Caveat** for cursive accent words. |
| DES-5 | Anton only comes in one weight (400), but it already looks ultra-heavy. Use it as-is rather than requesting weight 900, which would make the browser fake a bold. |

### 6.2 Applying it to the game
| ID | Element | Requirement |
|---|---|---|
| DES-6 | Header | A minimal top bar with the game's name on the left. |
| DES-7 | Title | A dual-style headline: mostly upright Inter, with one cursive Caveat word, e.g. "Rock, paper, *shoot*." |
| DES-8 | Webcam feed | Inside an image card with 11px rounded corners (`--radius-images`), centered, with a max width so it doesn't fill huge screens. |
| DES-9 | Play button | Ghost button: transparent, 1px white border, white text, 8px radius (`--radius-buttons`). |
| DES-10 | Countdown | "ROCK… PAPER… SCISSORS… SHOOT!" in the compressed display style (Anton, uppercase, line height 0.85). DESIGN.md's 259px is for desktop posters, so size it with `clamp()` so it also fits on phone screens. |
| DES-11 | Round result | A Haze card showing your move, the computer's move and who won. Win, lose and tie are shown with **words and layout**, not red or green, because DESIGN.md allows only one saturated accent color. |
| DES-12 | Score | A small Haze card or pill-style display with wins, losses and ties. |
| DES-13 | Error messages | "No hand detected, try again" shown as calm white or Haze text, not a red alert box. |
| DES-14 | Links (if any) | Signal Blue (`#2b7fff`) with an underline. Never use Signal Blue for buttons. |

### 6.3 Rules from DESIGN.md
| ID | Rule |
|---|---|
| DES-15 | Body text at least 16px. Weights 400–500 only. The heavy display style is only for the compressed countdown headline. |
| DES-16 | Radii: 4px inputs, 8px buttons, 11–14px cards and images, pills only for toggles (and the score pill, if used). No other radii. |
| DES-17 | Spacing comes from the spacing scale (4px base unit). Use 48px gaps between sections (`--section-gap`) and a 1150px max page width (`--page-max-width`). |

### 6.4 Responsive and accessible
| ID | Requirement |
|---|---|
| DES-18 | Works well on phones and desktops. No sideways scrolling on a 375px-wide phone. |
| DES-19 | All text has strong contrast against its background (WCAG AA: at least 4.5:1 for normal text). |
| DES-20 | Buttons have a visible focus style (for example, a white outline with a small offset) for keyboard users. |

**Contrast notes, checked against the DESIGN.md colors:**
- Twilight Blue (`#426188`) on black is only about 3.3:1. Use it only for large headings, never for body text.
- Signal Blue (`#2b7fff`) is fine on black (about 5.6:1) but too faint on Haze cards (about 3.5:1). Links inside a Haze card should use Ink with an underline instead.

### 6.5 What the design step builds
Most of the game doesn't work yet when step 2 runs. So the design step builds the full **static layout** with placeholder content: a gray box where the webcam will go, a sample countdown word, a sample result card and a sample score. Later steps hook real behavior into these elements without changing their look.

---

## 7. OpenAI API details

Checked against OpenAI's docs on 2026-11-02. Model names change often, so re-check the [models page](https://developers.openai.com/api/docs/models) before step 4.

- **Endpoint:** Responses API, `POST https://api.openai.com/v1/responses`
- **Model:** `gpt-6-luna`. It's OpenAI's cheapest current model ($0.10 per million input tokens) and supports image input. This is a simple task, so a small model is enough. If accuracy is poor, try `gpt-6.1-terra`.
- **Image detail:** `"low"`. It's cheaper and faster, and a hand gesture doesn't need fine detail.
- **Reasoning:** set to `"none"` (or the lowest level the model allows) so it answers fast.

Example request body (sent from the server function):

```json
{
  "model": "gpt-6-luna",
  "reasoning": { "effort": "none" },
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "Look at the hand in this photo. Is it making a rock (fist), paper (open flat hand), or scissors (two fingers in a V) gesture for rock-paper-scissors? Reply with exactly one lowercase word: rock, paper, scissors, or none. Use none if no hand is clearly visible."
        },
        {
          "type": "input_image",
          "image_url": "data:image/jpeg;base64,<IMAGE DATA>",
          "detail": "low"
        }
      ]
    }
  ],
  "max_output_tokens": 16
}
```

- **Headers:** `Authorization: Bearer ${process.env.OPENAI_API_KEY}` and `Content-Type: application/json`
- **Reading the answer:** use the `output_text` field of the response if it's there. Otherwise read the text from the `output` array.

---

## 8. Tech setup

| Part | Choice |
|---|---|
| Frontend | `index.html`, `style.css`, `script.js` (plain, no frameworks) |
| Styling | Follows `DESIGN.md`. Fonts from Google Fonts (Inter, Anton, Caveat). |
| Backend | `api/classify.js`, a Vercel serverless function (Node.js, built-in `fetch`) |
| Hosting | Vercel, with zero configuration (static files in the root, functions in `/api`) |
| Version control | Git and GitHub |
| Running locally | Steps 2–4: `npm run dev` (runs a simple static server, `serve`, at `http://localhost:3000`). From step 5: change the `dev` script in `package.json` to `vercel dev` (Vercel CLI). It serves the page **and** runs `/api` functions, and it loads `.env.local`. A plain static server can't run `/api`. |

**Folder structure**
```
AI Game Web App/
├── index.html        # page layout: video, Play button, results, score
├── style.css         # styling
├── script.js         # webcam, countdown, capture, game logic, score
├── api/
│   └── classify.js   # serverless function that calls OpenAI
├── .env.local        # real API key (NOT committed)
├── .env.example      # template with no key (committed)
├── .gitignore
├── DESIGN.md         # visual style guide (colors, fonts, spacing)
└── prd.md            # this document
```

Note: Before step 4, check Vercel's current docs for the function handler format. Vercel supports both a web-standard `export default { fetch(request) }` style and the older `(req, res)` style. Also check whether a small `package.json` with `"type": "module"` is needed.

---

## 9. Security requirements

| ID | Requirement | Status |
|---|---|---|
| SEC-1 | The API key is only in `.env.local` locally. | ✅ File exists |
| SEC-2 | `.env.local` is in `.gitignore` **before the first commit**. | ✅ Confirmed (`git check-ignore` matches) |
| SEC-3 | The key never appears in `index.html`, `script.js`, or any file sent to the browser. Only `api/classify.js` reads it. | Planned |
| SEC-4 | On Vercel, the key is added in the dashboard: **Project → Settings → Environment Variables →** name `OPENAI_API_KEY`, paste the value, select Production (and Preview if you want), save, then **redeploy**. | Planned (step 7) |
| SEC-5 | Before each push, run `git status` and check that `.env.local` is **not** listed. | Habit |
| SEC-6 | If the key ever leaks, revoke it at platform.openai.com/api-keys right away and create a new one. | Habit |
| SEC-7 | Webcam images are never saved by the browser or the server (CAP-5, API-8). | Planned |

---

## 10. Limits and performance

- **Vercel request body limit:** 4.5 MB (if exceeded, the request fails with `413 FUNCTION_PAYLOAD_TOO_LARGE`, and the limit can't be changed). A 512 px JPEG is about 1% of that.
- **Target response time:** under ~3 seconds from "Shoot!" to the result.
- **Cost:** with `gpt-6-luna` and low-detail images, each round costs a tiny fraction of a cent.
- **Browser:** webcam access only works on `https://` or `localhost`. Both Vercel and `vercel dev` handle this.

---

## 11. Build plan (stop and test after each step)

Design comes first, so every later step builds on the final look.

| Step | What gets built | How to test | Suggested commit message |
|---|---|---|---|
| 1 ✅ | Project setup, Git, `.gitignore`, folders | `git status` doesn't list `.env.local` | `Set up project structure and gitignore` |
| 2 | **Visual design** (HTML and CSS only, following `DESIGN.md` and §6). Static layout with placeholder content. Claude shows the changes and **waits for your feedback** before step 3. | Open the page on a laptop and at phone width. It matches §6: black canvas, Haze cards, ghost button, the three fonts, no shadows or gradients, and a visible focus outline when you press Tab. | `Add visual design from DESIGN.md` |
| 3 | Webcam feed and Play button | The page shows your live camera inside the image card. Denying permission shows a message. | `Add webcam feed and Play button` |
| 4 | Countdown and image capture | The countdown runs in the display style. A preview of the captured, shrunk image appears (temporary, for testing). | `Add countdown and image capture` |
| 5 | `api/classify.js` calling OpenAI | Run `vercel dev`, play a round, and see your move logged. Test with no hand and see `none`. | `Add serverless function to classify hand gesture` |
| 6 | Game logic and scoring | Play several rounds. Wins, losses and ties count correctly in the result and score cards. "Try again" works. Play is disabled during a round. | `Add game logic and scoreboard` |
| 7 | Push to GitHub and deploy on Vercel | The live URL works on your phone and laptop. | `Prepare for deployment` |

**After each working step, commit:**
```bash
git add .
git status          # make sure .env.local is NOT listed
git commit -m "your message here"
```

---

## 12. Acceptance criteria (definition of done)

- [ ] The page follows `DESIGN.md` (§6) on both phone and desktop.
- [ ] The live Vercel URL loads, asks for the camera, and shows the feed.
- [ ] Clicking Play runs the countdown, captures a photo and shows both moves and the winner.
- [ ] Rock, paper and scissors are each recognized correctly most of the time in decent lighting.
- [ ] No hand → a friendly "Try again" message, and the score doesn't change.
- [ ] Play can't be clicked again while a round is running.
- [ ] The score updates correctly and resets on page refresh.
- [ ] Searching the GitHub repo for the API key finds nothing. `.env.local` isn't in the repo.
- [ ] No images are saved anywhere.

---

## 13. Recommended Claude Code skills and plugins

**Already available (no install needed)**
| Skill | When to use it |
|---|---|
| `/run` | After each step, to launch the app and check it works. |
| `/security-review` | Before pushing to GitHub. It checks for leaked keys and unsafe code. Very useful for SEC-1 to SEC-7. |
| `/code-review` | After steps 4 and 5, to catch bugs in the game logic and API function. |
| `/simplify` | To keep the code short and readable, which helps while learning. |
| `/init` | Creates a `CLAUDE.md` with project notes, so future Claude sessions know the rules (plain JS, never expose the key, etc.). |

**Worth installing from the plugin directory**
| Plugin | Why |
|---|---|
| **frontend-design** (Anthropic) | Most useful in step 2. It helps apply `DESIGN.md` cleanly: layout, buttons, and the countdown's look. |
| **github** (GitHub, official) | Lets Claude create the GitHub repo and manage it for you in step 7. |
| **claude-socratic-plugin** (community) | A learning mode that explains concepts and keeps a glossary of terms you've learned. A good fit for a beginner. |

### 13.1 Skills from GitHub (checked 2026-11-02)

These are skill folders (each has a `SKILL.md`) from three official repos: [anthropics/skills](https://github.com/anthropics/skills), [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) and [openai/skills](https://github.com/openai/skills). Ranked by how much they help **this** project:

| Rank | Skill (repo) | Build step | Why it fits | Watch out for |
|---|---|---|---|---|
| 1 | **frontend-design** ([anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design)) | 2 | Strong at turning a style brief into clean HTML and CSS. Its rule is "the brief's own words always win," so it follows `DESIGN.md` instead of inventing its own look. | It's the same skill as the frontend-design plugin above, so install only one. Tell Claude "`DESIGN.md` is the brief" so it skips proposing its own colors and fonts. |
| 2 | **web-design-guidelines** ([vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines)) | 2, then before 7 | Reviews your HTML and CSS against a public checklist (accessibility, focus states, etc.) and lists problems as `file:line`. It doesn't depend on any framework, so plain JS is fine. Good for checking DES-18 to DES-20. | It downloads the latest checklist from GitHub on each run. It only reports problems, it doesn't fix them. |
| 3 | **webapp-testing** ([anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/webapp-testing)) | 3–6 | Opens your app in an automated browser (Playwright), clicks Play, takes screenshots and reads console errors. Useful for testing each step. | Needs Python and Playwright installed. A headless browser has no webcam, so Chromium must be started with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream` to fake a camera. The fake camera shows a test pattern, not a hand, so the API should return `none`. You'll still test real gestures yourself. |
| 4 | **deploy-to-vercel** ([vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/deploy-to-vercel)) | 7 | Vercel's own skill for deploying: links the project, uses git-push deploys, makes a preview URL first and only goes to production when you ask. | Its git flow runs `git add .` and commits with a generic message. **Always run `git status` first** and confirm `.env.local` isn't listed (SEC-5). It can also install the Vercel CLI and skip confirmation prompts, so ask Claude to tell you each command before running it. |

**Considered but not recommended:**
- **openai-docs** ([openai/skills](https://github.com/openai/skills/tree/main/skills/.curated/openai-docs)) is written for OpenAI's Codex tool (Codex paths and a Codex-only setup command), so it doesn't fit Claude Code without changes. Claude can read OpenAI's docs directly when step 5 starts.
- **vercel-deploy** (openai/skills) and **playwright** (openai/skills) are also Codex versions. The Vercel and Anthropic versions above cover the same ground.
- **react-best-practices**, **composition-patterns** and the other React skills (vercel-labs) don't apply, since this project uses no frameworks.
- **vercel-optimize** (vercel-labs) audits Vercel costs. It's overkill for one small function.

**How to install a GitHub skill.** Two options:

1. The `skills` command-line tool. It downloads the skill into Claude Code's skills folder:
   ```bash
   npx skills add anthropics/skills --skill frontend-design -a claude-code
   ```
2. By hand: copy the skill's folder from GitHub into `.claude/skills/<skill-name>/` in this project, so it sits next to your code.

**Safety tip:** skills are instructions (and sometimes scripts) that Claude follows. Read a skill's `SKILL.md` on GitHub before installing it, the same way you'd read a script before running it. Stick to well-known repos like the three above.

**Skipped on purpose:** React/Next.js-focused skills (this project uses no frameworks) and large "do everything" bundles (too much for a small project).

---

## 14. Sources

- [OpenAI: Images and vision guide](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI: Models](https://developers.openai.com/api/docs/models)
- [Vercel: Function limitations (4.5 MB body limit)](https://examples.vercel.com/docs/functions/limitations)
- [Vercel: How to bypass the body size limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)
- [anthropics/skills (GitHub)](https://github.com/anthropics/skills)
- [vercel-labs/agent-skills (GitHub)](https://github.com/vercel-labs/agent-skills)
- [openai/skills (GitHub)](https://github.com/openai/skills)
- [vercel-labs/skills CLI overview (Classmethod)](https://dev.classmethod.jp/en/articles/varcel-labs-skills/)
- [ComposioHQ/awesome-claude-skills (curated list)](https://www.context-awesome.com/list/ComposioHQ/awesome-claude-skills)
