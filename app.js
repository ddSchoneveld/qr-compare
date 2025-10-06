// Exact comparison only; always use the rear camera; simple two-step flow.

let firstValue = null;
let scanner = null;

const statusEl = document.getElementById("status");
const readerEl = document.getElementById("reader");
const resultScreen = document.getElementById("resultScreen");
const resultText = document.getElementById("resultText");
const nextBtn = document.getElementById("nextBtn");

// PWA install prompt (kept from earlier)
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

// Service worker registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(console.error);
}

// ----- Flow control -----
function normalizeExact(s) {
  return s?.normalize("NFC").trim();
}

async function startRound() {
  // Reset UI
  firstValue = null;
  statusEl.textContent = "Scan first";
  resultScreen.classList.add("hidden");
  readerEl.style.display = ""; // show camera container

  // Start camera with environment lens
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
      statusEl.textContent = "Camera error. Check HTTPS and permissions.";
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
  resultText.textContent = ok ? "Match" : "No match";
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
    statusEl.textContent = "Scan second";
    // brief pause to avoid capturing the same code twice as "second"
    setTimeout(() => scanner.resume(), 600);
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
  startRound().catch(console.error);
});

// Kick off first round
startRound().catch(console.error);
