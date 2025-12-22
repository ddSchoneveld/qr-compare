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
// UI ELEMENTS
// -------------------------------------------------------------
const statusEl = document.getElementById("status");
const midScreen = document.getElementById("midScreen");
const midNextBtn = document.getElementById("midNextBtn");
const resultScreen = document.getElementById("resultScreen");
const resultText = document.getElementById("resultText");

const resetBtn = document.getElementById("resetBtn");
const modeEnkelBtn = document.getElementById("modeEnkel");
const modeMeerdereBtn = document.getElementById("modeMeerdere");

// -------------------------------------------------------------
// RESET
// -------------------------------------------------------------
function resetApp() {
  state = State.SCAN_1;
  firstValue = null;
  buffer = "";
  acceptingInput = true;

  midScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");

  statusEl.textContent = "Start scannen";
}

resetBtn.addEventListener("click", resetApp);

// -------------------------------------------------------------
// MODE SWITCH
// -------------------------------------------------------------
function setMode(newMode) {
  mode = newMode;

  modeEnkelBtn.classList.toggle("active", mode === "enkel");
  modeMeerdereBtn.classList.toggle("active", mode === "meerdere");

  resetApp();
}

modeEnkelBtn.addEventListener("click", () => setMode("enkel"));
modeMeerdereBtn.addEventListener("click", () => setMode("meerdere"));

// -------------------------------------------------------------
// INPUT (QR via HID)
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
// FLOW
// -------------------------------------------------------------
function handleScan(raw) {
  const value = normalize(raw);

  if (state === State.SCAN_1) {
    firstValue = value;
    acceptingInput = false;

    if (mode === "enkel") {
      state = State.SCAN_2;
      statusEl.textContent = "";
      midScreen.classList.remove("hidden");
    } else {
      // In meerdere mode, go directly to compare with future scans
      state = State.SCAN_2;
      statusEl.textContent = "Scan volgende QR";
      acceptingInput = true;
    }
  } else if (state === State.SCAN_2) {
    acceptingInput = false;
    state = State.RESULT;

    showResult(value === firstValue);
  }
}


midNextBtn.addEventListener("click", () => {
  midScreen.classList.add("hidden");
  acceptingInput = true;
  statusEl.textContent = "Scan volgende QR";
});

// -------------------------------------------------------------
// RESULT DISPLAY
// -------------------------------------------------------------
function showResult(ok) {
  resultText.textContent = ok ? "GOED" : "FOUT";
  resultText.className = "result-text " + (ok ? "ok" : "no");

  // Show scanned values
  document.getElementById("firstScannedValue").textContent = firstValue;
  document.getElementById("secondScannedValue").textContent = buffer;

  resultScreen.classList.remove("hidden");
  statusEl.textContent = "";

  playSound(ok);

  if (navigator.vibrate) {
    navigator.vibrate(ok ? 80 : [120, 60, 120]);
  }

  if (mode === "meerdere") {
    setTimeout(() => {
      state = State.SCAN_2;
      acceptingInput = true;
      resultScreen.classList.add("hidden");
      statusEl.textContent = "Scan volgende QR";
    }, 2000);
  } else {
    setTimeout(() => {
      resetApp();
    }, 2000);
  }
}


// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function normalize(s) {
  return s.normalize("NFC").trim();
}

// -------------------------------------------------------------
// AUDIO
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
    osc.type = "sine";
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } else {
    osc.type = "square";
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }
}

// -------------------------------------------------------------
// INIT
// -------------------------------------------------------------
setMode("enkel");
