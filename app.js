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

const UI = {
  status: document.getElementById("status"),
  resultScreen: document.getElementById("resultScreen"),
  resultText: document.getElementById("resultText"),
  firstValue: document.getElementById("firstScannedValue"),
  secondValue: document.getElementById("secondScannedValue"),
  resetBtn: document.getElementById("resetBtn"),
  modeEnkelBtn: document.getElementById("modeEnkel"),
  modeMeerdereBtn: document.getElementById("modeMeerdere"),
};

// INIT
function initApp() {
  UI.resetBtn.addEventListener("click", resetApp);
  UI.modeEnkelBtn.addEventListener("click", () => setMode("enkel"));
  UI.modeMeerdereBtn.addEventListener("click", () => setMode("meerdere"));
  document.addEventListener("keydown", handleKeyInput);
  resetApp();
}

// MODE SWITCH
function setMode(newMode) {
  mode = newMode;
  UI.modeEnkelBtn.classList.toggle("active", mode === "enkel");
  UI.modeMeerdereBtn.classList.toggle("active", mode === "meerdere");
  resetApp();
}

// RESET
function resetApp() {
  state = State.SCAN_1;
  firstValue = null;
  secondValue = null;
  buffer = "";
  acceptingInput = true;
  hideElement(UI.resultScreen);
  clearResultDisplay();
  updateStatus("Start scannen");
}

// SCAN FLOW
function handleScan(raw) {
  const value = normalize(raw);
  if (state === State.SCAN_1) {
    hideElement(UI.resultScreen);
    clearResultDisplay();
    buffer = "";
    firstValue = value;
    if (mode === "enkel") {
      state = State.SCAN_2;
      updateStatus("Scan tweede QR");
    } else {
      state = State.SCAN_2;
      updateStatus("Scan tweede QR");
    }
  } else if (state === State.SCAN_2) {
    secondValue = value;
    buffer = "";
    acceptingInput = false;
    state = State.RESULT;
    showResult(secondValue === firstValue);
  }
}

// SHOW RESULT
function showResult(ok) {
  UI.resultText.textContent = ok ? "GOED" : "FOUT - Klik Reset";
  UI.resultText.className = "result-text " + (ok ? "ok" : "no");
  UI.firstValue.textContent = firstValue || "";
  UI.secondValue.textContent = secondValue || "";
  showElement(UI.resultScreen);
  updateStatus(ok ? "Scan nieuwe 1e QR" : "");
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
  } else {
    if (ok) {
      state = State.SCAN_1;
      firstValue = null;
      secondValue = null;
      acceptingInput = true;
    } else {
      acceptingInput = false;
    }
  }
}

// INPUT
function handleKeyInput(e) {
  e.preventDefault();
  if (!acceptingInput && state === State.RESULT) {
    playSound(false);
    vibrate(false);
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

// HELPERS
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
function normalize(s) {
  return s.normalize("NFC").trim();
}

// FEEDBACK
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
    } else {
      osc.type = "square";
      osc.frequency.value = 220;
    }
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (ok ? 0.25 : 0.5));
    osc.start();
    osc.stop(audioCtx.currentTime + (ok ? 0.25 : 0.5));
  } catch (e) {
    console.warn("Geluid kon niet worden afgespeeld:", e);
  }
}

function vibrate(ok) {
  if (navigator.vibrate) {
    navigator.vibrate(ok ? 80 : [120, 60, 120]);
  }
}

initApp();
