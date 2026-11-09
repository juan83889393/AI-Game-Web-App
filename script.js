// The game's browser code lives here.
// Never put the OpenAI key in this file: everyone can read browser code.

// ----- Settings -----
const ROUND_SECONDS = 10;
const MOVES = ["rock", "paper", "scissors"];
const EMOJI = { rock: "✊", paper: "✋", scissors: "✌️" };
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" }; // each move beats this one
const MAX_PHOTO_SIZE = 512;   // longest side of the photo, in pixels
const COOLDOWN_MS = 1000;     // short pause before Play works again

// ----- Page elements -----
const video = document.getElementById("webcam");
const cameraMessage = document.getElementById("camera-message");
const cameraStatus = document.getElementById("camera-status");
const computerEmoji = document.getElementById("computer-emoji");
const computerMoveText = document.getElementById("computer-move");
const computerStatus = document.getElementById("computer-status");
const timerValue = document.getElementById("timer-value");
const timerLabel = document.getElementById("timer-label");
const playButton = document.getElementById("play-button");
const message = document.getElementById("message");
const verdict = document.getElementById("verdict");
const scoreWins = document.getElementById("score-wins");
const scoreLosses = document.getElementById("score-losses");
const scoreTies = document.getElementById("score-ties");

// The score lives only in this page's memory. Refreshing resets it.
const score = { wins: 0, losses: 0, ties: 0 };

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let roundRunning = false;

startCamera();
playButton.addEventListener("click", playRound);

// ----- Camera -----

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showCameraProblem("This browser can't use a camera. Try Chrome, Safari or Firefox.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    cameraMessage.hidden = true;
    cameraStatus.textContent = "Live";
    playButton.disabled = false;
    message.textContent = "Click Play, then hold up your move before the timer hits zero.";
  } catch (error) {
    if (error.name === "NotAllowedError") {
      showCameraProblem("Camera access is blocked. Click the camera icon in the address bar, choose Allow, then reload the page.");
    } else if (error.name === "NotFoundError") {
      showCameraProblem("No camera found. Connect one, then reload the page.");
    } else {
      showCameraProblem("Couldn't start the camera. Close other apps that use it, then reload the page.");
    }
  }
}

function showCameraProblem(text) {
  cameraMessage.textContent = text;
  cameraMessage.hidden = false;
  cameraStatus.textContent = "Off";
  playButton.disabled = true;
  message.textContent = text;
}

// ----- One round -----

async function playRound() {
  if (roundRunning) return; // ignore extra clicks while a round runs
  roundRunning = true;
  playButton.disabled = true;

  try {
    video.play(); // unfreeze the camera if the last round froze it
    cameraStatus.textContent = "Live";
    computerStatus.textContent = "Shuffling";
    message.textContent = "Make your move and hold it steady!";

    await runCountdown();

    // Time's up: take the photo first, THEN the computer picks,
    // so it can't react to your move.
    const photo = capturePhoto();
    video.pause(); // freeze the camera screen on the photo moment
    cameraStatus.textContent = "Captured";

    const computerMove = randomMove();
    showComputerMove(computerMove);
    computerStatus.textContent = "Locked";

    message.textContent = "Reading your hand…";
    const result = await classifyPhoto(photo);

    if (result.move === "none") {
      // No hand found: this round doesn't count.
      message.textContent = result.message || "Couldn't see your hand. Try again!";
      verdict.textContent = "No round counted. Try again.";
    } else {
      message.textContent = `The AI saw ${result.move} ${EMOJI[result.move]}`;
      const outcome = getOutcome(result.move, computerMove);
      updateScore(outcome);
      verdict.textContent = describeRound(outcome, result.move, computerMove);
    }
  } finally {
    await wait(COOLDOWN_MS);
    roundRunning = false;
    playButton.disabled = false;
    playButton.textContent = "Play again";
  }
}

// Counts down from 10 to 0 while the computer's screen shuffles.
// The shuffle slows down in the last 2 seconds, like a slot machine.
function runCountdown() {
  return new Promise((resolve) => {
    const endTime = performance.now() + ROUND_SECONDS * 1000;
    let lastShuffle = 0;
    timerLabel.textContent = "Seconds";

    function tick(now) {
      const msLeft = Math.max(0, endTime - now);
      timerValue.textContent = Math.ceil(msLeft / 1000);

      if (now - lastShuffle >= shuffleDelay(msLeft)) {
        showComputerMove(randomMove(computerMoveText.dataset.move));
        lastShuffle = now;
      }

      if (msLeft > 0) {
        requestAnimationFrame(tick);
      } else {
        timerLabel.textContent = "Shoot!";
        resolve();
      }
    }

    requestAnimationFrame(tick);
  });
}

function shuffleDelay(msLeft) {
  if (reduceMotion) return 500;
  if (msLeft > 2000) return 100;
  return 100 + (2000 - msLeft) * 0.15; // up to 400ms at the very end
}

// Picks a random move. If "skip" is given, never picks that one
// (so the shuffle always visibly changes).
function randomMove(skip) {
  const choices = MOVES.filter((move) => move !== skip);
  return choices[Math.floor(Math.random() * choices.length)];
}

function showComputerMove(move) {
  computerEmoji.textContent = EMOJI[move];
  computerMoveText.textContent = move;
  computerMoveText.dataset.move = move;
}

// ----- Winner and score -----

// Returns "win", "lose" or "tie" from your point of view.
function getOutcome(playerMove, computerMove) {
  if (playerMove === computerMove) return "tie";
  if (BEATS[playerMove] === computerMove) return "win";
  return "lose";
}

function updateScore(outcome) {
  if (outcome === "win") score.wins += 1;
  if (outcome === "lose") score.losses += 1;
  if (outcome === "tie") score.ties += 1;

  scoreWins.textContent = score.wins;
  scoreLosses.textContent = score.losses;
  scoreTies.textContent = score.ties;
}

// Builds the sentence for the result card, e.g. "You win. Rock beats scissors."
function describeRound(outcome, playerMove, computerMove) {
  if (outcome === "tie") return `It's a tie. You both picked ${playerMove} ${EMOJI[playerMove]}.`;
  if (outcome === "win") return `You win. ${capitalize(playerMove)} ${EMOJI[playerMove]} beats ${computerMove} ${EMOJI[computerMove]}.`;
  return `Computer wins. ${capitalize(computerMove)} ${EMOJI[computerMove]} beats ${playerMove} ${EMOJI[playerMove]}.`;
}

function capitalize(word) {
  return word[0].toUpperCase() + word.slice(1);
}

// ----- Photo -----

// Draws the current video frame onto a small in-memory canvas and
// returns it as a compressed JPEG. Nothing is saved anywhere.
function capturePhoto() {
  const scale = Math.min(1, MAX_PHOTO_SIZE / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

// Send one photo to our server function and log what it saw.
// imageDataUrl looks like "data:image/jpeg;base64,...".
async function classifyPhoto(imageDataUrl) {
  try {
    const response = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageDataUrl }),
    });
    const result = await response.json();
    console.log("Server says:", result);
    return result;
  } catch (error) {
    console.error("Couldn't reach /api/classify:", error);
    return { move: "none", message: "Couldn't check your hand right now. Try again!" };
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
