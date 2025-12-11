// Schoneveld Breeding
// QR Vergelijker met scanner
// 11-12-2025, DDamen


let firstValue = null;
let buffer = "";                // collects characters from HID scanner
let acceptingInput = false;     // prevents input bleeding across screens

// UI references
const statusEl = document.getElementById("status");
const readerEl = document.getElementById("reader");
const resultScreen = document.getElementById("resultScreen");
const resultText = document.getElementById("resultText");
const nextBtn = document.getElementById("nextBtn");
const welcomeScreen = document.getElementById("welcomeScreen");
const startBtn = document.getElementById("startBtn");
const midScreen = document.getElementById("midScreen");
const midNextBtn = document.getElementById("midNextBtn");

// PWA install
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn?.addEventListener("click", async () => {
  installBtn.hidden = true;
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(console.error);
}

// Normalize helper
function normalizeExact(s) {
  return s?.normalize("NFC").trim();
}

// -----------------------------------------------------
// SCANNING LOGIC — HID (Bluetooth) BARCODE SCANNER
// -----------------------------------------------------
document.addEventListener("keydown", (e) => {
  if (!acceptingInput) return;   // ignore input outside scan phases

  if (e.key === "Enter") {
    const scanned = buffer.trim();
    buffer = "";

    if (scanned.length > 0) {
      onScanSuccess(scanned);
    }
  } else {
    // Append typed character
    buffer += e.key;
  }
});

// -----------------------------------------------------
// APP FLOW
// -----------------------------------------------------
startBtn.addEventListener("click", () => {
  welcomeScreen.classList.add("hidden");
  startRound();
});

async function startRound() {
  // Reset states
  firstValue = null;
  buffer = "";
  acceptingInput = true;

  // UI Reset
  resultScreen.classList.add("hidden");
  midScreen.classList.add("hidden");

  statusEl.textContent = "Scan QR code 1";
  readerEl.style.display = "";  // used only as UI indicator

  // No camera start — HID scanner listens automatically
}

midNextBtn.addEventListener("click", () => {
  midScreen.classList.add("hidden");
  statusEl.textContent = "Scan 2e QR";
  acceptingInput = true;
});

nextBtn.addEventListener("click", () => {
  startRound();
});

// -----------------------------------------------------
// QR HANDLING
// -----------------------------------------------------
async function onScanSuccess(decodedText) {
  acceptingInput = false; // debounce

  const normalized = normalizeExact(decodedText);

  if (firstValue === null) {
    // Store first QR
    firstValue = normalized;

    statusEl.textContent = "Eerste QR gescand";

    // Hide scanner UI box
    readerEl.style.display = "none";

    // Show mid screen
    midScreen.classList.remove("hidden");

    // Prepare for next scan
    buffer = "";
    setTimeout(() => (acceptingInput = true), 300);
    return;
  }

  // Compare second QR
  const ok = firstValue === normalized;

  statusEl.textContent = "";
  setResult(ok);
}

function setResult(ok) {
  resultText.className = "result-text " + (ok ? "ok" : "no");

  const span = document.createElement("span");
  span.textContent = ok ? "Match" : "Fout";
  resultText.replaceChildren(span);

  resultScreen.classList.remove("hidden");
  readerEl.style.display = "none";

  if (navigator.vibrate) {
    navigator.vibrate(ok ? 80 : [120, 60, 120]);
  }
}