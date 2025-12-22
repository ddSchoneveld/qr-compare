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
  setMode("enkel");
}

// MODE SWITCH
function setMode(newMode) {
  mode = newMode;
  UI.modeEnkelBtn.classList.remove("active", "enkel", "meerdere");
  UI.modeMeerdereBtn.classList.remove("active", "enkel", "meerdere");

  if (mode === "enkel") {
    UI.modeEnkelBtn.classList.add("active", "enkel");
  } else {
    UI.modeMeerdereBtn.classList.add("active", "meerdere");
  }

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
  UI.resetBtn.classList.remove("danger");
}

// SCAN FLOW
function handleScan(raw) {
  const value = normalize(raw);
  buffer = "";

  if (state === State.SCAN_1) {
    firstValue = value;

    // Laat direct de eerste scan zien
    UI.firstValue.textContent = firstValue;
    UI.secondValue.textContent = "";
    UI.resultText.textContent = "";
    UI.resultText.className = "result-text";
    showElement(UI.resultScreen);

    // Ga door naar tweede scan
    state = State.SCAN_2;
    updateStatus("Scan tweede QR");

  } else if (state === State.SCAN_2) {
    secondValue = value;
    acceptingInput = false;
    state = State.RESULT;

    // Vergelijk en toon resultaat
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

  if (!ok) {
    UI.resetBtn.classList.add("danger");
    } else {
      UI.resetBtn.classList.remove("danger");
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

    const now = audioCtx.currentTime;

    if (ok) {
      // ✅ Korte hoge beep (GOED)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.value = 1200;

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.start(now);
      osc.stop(now + 0.25);

    } else {
      // ❌ "boop‑boop" foutgeluid

      // Eerste boop
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();

      osc1.type = "square";
      osc1.frequency.value = 300;

      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);

      gain1.gain.setValueAtTime(0.3, now);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Tweede boop (iets lager, iets later)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();

      osc2.type = "square";
      osc2.frequency.value = 180;

      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      gain2.gain.setValueAtTime(0.3, now + 0.3);
      osc2.start(now + 0.3);
      osc2.stop(now + 0.6);
    }
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
