// Schoneveld Breeding
// QR Vergelijker
// 20-11-2025, DDamen

let firstValue = null;
let scanner = null;

const statusEl = document.getElementById("status");
const readerEl = document.getElementById("reader");
const resultScreen = document.getElementById("resultScreen");
const resultText = document.getElementById("resultText");
const nextBtn = document.getElementById("nextBtn");
const welcomeScreen = document.getElementById("welcomeScreen");
const startBtn = document.getElementById("startBtn");
const midScreen = document.getElementById("midScreen");
const midNextBtn = document.getElementById("midNextBtn");

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

startBtn.addEventListener("click", () => {
  welcomeScreen.classList.add("hidden");
  startRound().catch(console.error);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(console.error);
}

function normalizeExact(s) {
  return s?.normalize("NFC").trim();
}

async function startRound() {
  resultScreen.classList.add("hidden");
  midScreen.classList.add("hidden");

  firstValue = null;
  statusEl.textContent = "Scan QR code 1";
  readerEl.style.display = "";
  
  await startScanner({ facingMode: { exact: "environment" } });
}

async function startScanner(cameraConfig) {
  if (scanner) {
    try { await scanner.stop(); } catch {}
  }
  scanner = new Html5Qrcode("reader", { formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ] });

  // Start with environment camera. If the device doesn't support it, fall back to default.
  try {
    await scanner.start(
      cameraConfig,
      { fps: 12, qrbox: calcQrBox(), aspectRatio: 1.777 },
      onScanSuccess,
      () => {}
    );
  } catch (e) {
    // Fallback: no exact environment — try generic environment keyword or default
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: calcQrBox(), aspectRatio: 1.777 },
        onScanSuccess,
        () => {}
      );
    } catch (err) {
      statusEl.textContent = "Camera error. Check HTTPS and toegang.";
      console.error(err);
    }
  }
}

function calcQrBox() {
  const w = Math.min(320, Math.floor(Math.min(window.innerWidth, 520) * 0.75));
  return { width: w, height: w };
}

function setResult(ok) {
  resultText.className = "result-text " + (ok ? "ok" : "no");
  const span = document.createElement("span");
  span.textContent = ok ? "Match" : "Fout";
  resultText.replaceChildren(span);  // ← replaces everything safely

  resultScreen.classList.remove("hidden");
  readerEl.style.display = "none";
  if (navigator.vibrate) navigator.vibrate(ok ? 80 : [120, 60, 120]);
}

async function onScanSuccess(decodedText /*, decodedResult */) {
  // Pause decode while processing to avoid double reads
  scanner.pause(true);

  const normalized = normalizeExact(decodedText);

  if (firstValue === null) {
      firstValue = normalized;

      // Hide any leftover UI
      resultScreen.classList.add("hidden");

      // Hide camera
      await scanner.stop();
      readerEl.style.display = "none";

      // Show mid-screen
      statusEl.textContent = "Eerste QR gescand";
      midScreen.classList.remove("hidden");
      return;
  } else {
    const second = normalized;
    const ok = firstValue === second;

    statusEl.textContent = ""; // we’ll show only the result screen now
    try { await scanner.stop(); } catch {} // fully stop camera
    setResult(ok);
  }
}

// “Next” starts a fresh round
nextBtn.addEventListener("click", () => {
  resultScreen.classList.add("hidden");
  startRound().catch(console.error);
});

midNextBtn.addEventListener("click", () => {
  midScreen.classList.add("hidden");
  statusEl.textContent = "Scan 2e QR";

  // Show camera
  readerEl.style.display = "";

  // Start scanner again (scan #2)
  startScanner({ facingMode: { exact: "environment" } })
    .catch(err => {
      // Fallback if exact camera fails
      startScanner({ facingMode: "environment" }).catch(console.error);
    });
});