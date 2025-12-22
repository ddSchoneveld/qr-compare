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
let secondValue = null;
let buffer = "";
let acceptingInput = true;

// -------------------------------------------------------------
// UI ELEMENTS
// -------------------------------------------------------------
const statusEl = document.getElementById("status");
const midScreen = document.getElementById("midScreen");
const resultScreen = document.getElementById("resultScreen");
const resultText = document.getElementById("resultText");

const firstScannedValueEl = document.getElementById("firstScannedValue");
const secondScannedValueEl = document.getElementById("secondScannedValue");

const resetBtn = document.getElementById("resetBtn");
const modeEnkelBtn = document.getElementById("modeEnkel");
const modeMeerdereBtn = document.getElementById("modeMeerdere");

// -------------------------------------------------------------
// RESET
// -------------------------------------------------------------
function resetApp() {
  state = State.SCAN_1;

  firstValue = null;
  secondValue = null;
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
  // Blokkeer standaard gedrag ALTIJD
  e.preventDefault();

  // Alleen verder als we scans accepteren
  if (!acceptingInput) return;

  if (e.key === "Enter") {
    const value = buffer.trim();
    buffer = "";
    if (value) handleScan(value);
  } else if (e.key.length === 1) {
    buffer += e.key;
  }
});


// -------------------------------------------------------------
// FLOW
// -------------------------------------------------------------
function handleScan(raw) {
  const value = normalize(raw);

  if (state === State.SCAN_1) {
    firstValue = value;
    buffer = "";
    if (mode === "enkel") {
      state = State.SCAN_2;
      midScreen.classList.remove("hidden");
      statusEl.textContent = "";
      acceptingInput = false;

      setTimeout(() => {
        midScreen.classList.add("hidden");
        statusEl.textContent = "Scan tweede QR";
        acceptingInput = true;
      }, 1000);
    } else {
      // meerdere modus
      state = State.SCAN_2;
      statusEl.textContent = "Scan tweede QR";
      acceptingInput = true;
    }

  } else if (state === State.SCAN_2) {
    secondValue = value;
    acceptingInput = false;
    state = State.RESULT;

    const match = value === firstValue;
    showResult(match);
  }
}

// -------------------------------------------------------------
// RESULT DISPLAY
// -------------------------------------------------------------
function showResult(ok) {
  resultText.textContent = ok ? "GOED" : "FOUT - Klik Reset";
  resultText.className = "result-text " + (ok ? "ok" : "no");

  firstScannedValueEl.textContent = firstValue || "";
  secondScannedValueEl.textContent = secondValue || "";

  resultScreen.classList.remove("hidden");
  statusEl.textContent = "";

  playSound(ok);

  if (navigator.vibrate) {
    navigator.vibrate(ok ? 80 : [120, 60, 120]);
  }

  // -----------------------------
  // LOGICA PER MODUS
  // -----------------------------

  if (mode === "meerdere") {
    if (ok) {
      // ✅ MEERDERE + GOED → klaar voor volgende 2e scan
      state = State.SCAN_2;
      secondValue = null;
      acceptingInput = true;
      statusEl.textContent = "Scan volgende QR";
    } else {
      // ❌ MEERDERE + FOUT → blokkeren tot reset
      acceptingInput = false;
    }
    return;
  }

  // ---- ENKEL ----
  if (ok) {
    // ✅ ENKEL + GOED → direct nieuwe 1e scan toestaan
    state = State.SCAN_1;
    firstValue = null;
    secondValue = null;
    acceptingInput = true;
    statusEl.textContent = "Scan nieuwe 1e QR";
  } else {
    // ❌ ENKEL + FOUT → verplicht reset
    acceptingInput = false;
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
  try {
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
  } catch (e) {
    console.warn("Audio kon niet worden afgespeeld:", e);
  }
}

// -------------------------------------------------------------
// INIT
// -------------------------------------------------------------
setMode("enkel");
