// Schoneveld Breeding
// QR Vergelijker met scanner
// 11-12-2025, DDamen

// -------------------------------------------------------------
// STATE & MODE
// -------------------------------------------------------------
const State = {
  SCAN_1: "SCAN_1",
  SCAN_2: "SCAN_2",
  RESULT: "RESULT",
};

let state = State.SCAN_1;
let mode = "enkel";

let firstValue = null;
let buffer = "";
let acceptingInput = false;

// -------------------------------------------------------------
// UI
// -------------------------------------------------------------
const welcomeScreen = document.getElementById("welcomeScreen");

const modeBar = document.getElementById("modeBar");
const modeEnkelBtn = document.getElementById("modeEnkel");
const modeMeerdereBtn = document.getElementById("modeMeerdere");
const resetBtn = document.getElementById("resetBtn");

const statusEl = document.getElementById("status");

const midScreen = document.getElementById("midScreen");
const midNextBtn = document.getElementById("midNextBtn");

const resultScreen = document.getElementById("resultScreen");
const resultText = document.getElementById("resultText");
const nextBtn = document.getElementById("nextBtn");

// Sounds
function playSound(ok) {
  const sound = ok ? soundGood : soundBad;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}


// -------------------------------------------------------------
// RESET

resetBtn.addEventListener("click", resetApp);

function resetApp() {
  state = State.SCAN_1;
  firstValue = null;
  buffer = "";
  acceptingInput = true;

  midScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");

  statusEl.textContent = "Scan 1e QR";
}
// -------------------------------------------------------------
// MODE SWITCH
// -------------------------------------------------------------
modeEnkelBtn.addEventListener("click", () => setMode("enkel"));
modeMeerdereBtn.addEventListener("click", () => setMode("meerdere"));

function setMode(newMode) {
  mode = newMode;

  modeEnkelBtn.classList.toggle("active", mode === "enkel");
  modeMeerdereBtn.classList.toggle("active", mode === "meerdere");

  resetApp();
}

// -------------------------------------------------------------
// INPUT (HID / KEYBOARD)
// -------------------------------------------------------------
document.addEventListener("keydown", (e) => {
  if (!acceptingInput) return;

  if (e.key === "Enter") {
    const value = buffer.trim();
    buffer = "";
    if (value) handleScan(value);
  } else if (e.key.length === 1) {
    buffer += e.key;
  }

  e.preventDefault();
});

// -------------------------------------------------------------
// FLOW LOGIC
// -------------------------------------------------------------
function handleScan(raw) {
  const value = normalize(raw);

  switch (state) {
    case State.SCAN_1:
    firstValue = value;
    state = State.SCAN_2;

    acceptingInput = false;

    statusEl.textContent = "";
    midScreen.classList.remove("hidden");
    break;

    case State.SCAN_2:
      acceptingInput = false;
      state = State.RESULT;

      showResult(value === firstValue);
      break;
  }
}

// -------------------------------------------------------------
// UI TRANSITIONS
// -------------------------------------------------------------
midNextBtn.addEventListener("click", () => {
  midScreen.classList.add("hidden");
  acceptingInput = true;
  statusEl.textContent = "Scan 2e QR";
});

nextBtn.addEventListener("click", () => {
  resultScreen.classList.add("hidden");

  if (mode === "meerdere") {
    state = State.SCAN_2;
    acceptingInput = true;
    statusEl.textContent = "Scan volgende 2e QR";
  } else {
    resetApp();
  }
});

// -------------------------------------------------------------
// RESULT
// -------------------------------------------------------------
function showResult(ok) {
  resultText.textContent = ok ? "GOED" : "FOUT";
  resultText.className = "result-text " + (ok ? "ok" : "no");

  resultScreen.classList.remove("hidden");
  statusEl.textContent = "";

  playSound(ok);

  if (navigator.vibrate) {
    navigator.vibrate(ok ? 80 : [120, 60, 120]);
  }
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function normalize(s) {
  return s.normalize("NFC").trim();
}

function playSound(ok) {
  const sound = ok ? soundGood : soundBad;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

// -------------------------------------------------------------
// SOUND (Web Audio API)
// -------------------------------------------------------------
let audioCtx = null;

function playSound(ok) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (ok) {
    // ✅ PLING (hoog & kort)
    osc.type = "sine";
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } else {
    // ❌ BEEP (laag & iets langer)
    osc.type = "square";
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }
}

// Init bij laden
resetApp();
setMode("enkel");