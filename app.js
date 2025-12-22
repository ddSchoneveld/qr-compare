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

let audioCtx = null;

// -------------------------------------------------------------
// INIT
// -------------------------------------------------------------
function initApp() {
  bindUIEvents();
  setMode("enkel");
  updateStatus("Start scannen");
}

// -------------------------------------------------------------
// UI ELEMENTS
// -------------------------------------------------------------
function getEl(id) {
  return document.getElementById(id);
}

const UI = {
  status: getEl("status"),
  midScreen: getEl("midScreen"),
  resultScreen: getEl("resultScreen"),
  resultText: getEl("resultText"),
  firstValue: getEl("firstScannedValue"),
  secondValue: getEl("secondScannedValue"),
  resetBtn: getEl("resetBtn"),
  modeEnkelBtn: getEl("modeEnkel"),
  modeMeerdereBtn: getEl("modeMeerdere"),
};

// -------------------------------------------------------------
// BIND EVENTS
// -------------------------------------------------------------
function bindUIEvents() {
  UI.resetBtn.addEventListener("click", resetApp);
  UI.modeEnkelBtn.addEventListener("click", () => setMode("enkel"));
  UI.modeMeerdereBtn.addEventListener("click", () => setMode("meerdere"));

  document.addEventListener("keydown", handleKeyInput);
}

// -------------------------------------------------------------
// MODE & RESET
// -------------------------------------------------------------
function setMode(newMode) {
  mode = newMode;
  UI.modeEnkelBtn.classList.toggle("active", mode === "enkel");
  UI.modeMeerdereBtn.classList.toggle("active", mode === "meerdere");
  resetApp();
}

function resetApp() {
  state = State.SCAN_1;
  firstValue = null;
  secondValue = null;
  buffer = "";
  acceptingInput = true;

  hideElement(UI.midScreen);
  hideElement(UI.resultScreen);
  clearResultDisplay();
  updateStatus("Start scannen");
}

// -------------------------------------------------------------
// SCAN FLOW
// -------------------------------------------------------------
function handleScan(raw) {
  const value = normalize(raw);

  // Wis resultaat bij nieuwe eerste scan
  if (state === State.SCAN_1) {
    hideElement(UI.resultScreen);
    clearResultDisplay();
  }

  if (state === State.SCAN_1) {
    firstValue = value;
    buffer = "";

    if (mode === "enkel") {
      state = State.SCAN_2;
      showElement(UI.midScreen);
      updateStatus("");
      acceptingInput = false;

      setTimeout(() => {
        hideElement(UI.midScreen);
        updateStatus("Scan tweede QR");
        acceptingInput = true;
      }, 1000);
    } else {
      state = State.SCAN_2;
      updateStatus("Scan tweede QR");
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
// RESULT LOGIC
// -------------------------------------------------------------
function showResult(ok) {
  UI.resultText.textContent = ok ? "GOED" : "FOUT - Klik Reset";
  UI.resultText.className = "result-text " + (ok ? "ok" : "no");
  UI.firstValue.textContent = firstValue || "";
  UI.secondValue.textContent = secondValue || "";

  showElement(UI.resultScreen);
  updateStatus("");
  playSound(ok);
  vibrate(ok);

  if (mode === "meerdere") {
    if (ok) {
      state = State.SCAN_2;
      secondValue = null;
      acceptingInput = true;
      updateStatus("Scan volgende QR");
    } else {
      acceptingInput = false;
    }
    return;
  }

  if (ok) {
    state = State.SCAN_1;
    firstValue = null;
    secondValue = null;
    acceptingInput = true;
    updateStatus("Scan nieuwe 1e QR");
  } else {
    acceptingInput = false;
  }
}

// -------------------------------------------------------------
// KEYBOARD INPUT HANDLER
// -------------------------------------------------------------
function handleKeyInput(e) {
  e.preventDefault();

  if (!acceptingInput) {
    if (state === State.RESULT) {
      playSound(false);
      vibrate(false);
    }
    return;
  }

  if (e.key === "Enter") {
    const value = buffer.trim();
    buffer = "";
    if (value) handleScan(value);
  } else if (e.key.length === 1) {
    buffer += e.key;
  }
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function normalize(s) {
  return s.normalize("NFC").trim();
}

function updateStatus(text) {
  UI.status.textContent = text;
}

function showElement(el) {
  el.classList.remove("hidden");
}

function hideElement(el) {
  el.classList.add("hidden");
}

function clearResultDisplay() {
  UI.resultText.textContent = "";
  UI.firstValue.textContent = "";
  UI.secondValue.textContent = "";
}

// -------------------------------------------------------------
// FEEDBACK: AUDIO + VIBRATIE
// -------------------------------------------------------------
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

function vibrate(ok) {
  if (navigator.vibrate) {
    navigator.vibrate(ok ? 80 : [120, 60, 120]);
  }
}

// -------------------------------------------------------------
// START
// -------------------------------------------------------------
initApp();
