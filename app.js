// --- Normalization helpers ---
const TRACKING_KEYS = new Set(["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid"]);
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");

function flashOverlay(ok) {
  overlay.className = "overlay " + (ok ? "ok" : "no");
  overlayText.textContent = ok ? "MATCH ✅" : "NO MATCH ❌";
  overlay.classList.remove("hidden");
  setTimeout(() => overlay.classList.add("hidden"), 1200);
}

function normalizeExact(s) {
  return s.normalize("NFC").trim();
}
function normalizeCanonicalUrl(s) {
  try {
    const url = new URL(s);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    // strip trailing slash (except root)
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    // strip tracking params & sort remaining
    const kept = [];
    url.searchParams.forEach((v, k) => { if (!TRACKING_KEYS.has(k)) kept.push([k, v]); });
    kept.sort(([a],[b]) => a.localeCompare(b));
    url.search = "";
    kept.forEach(([k,v]) => url.searchParams.append(k, v));
    return url.toString();
  } catch {
    return normalizeExact(s);
  }
}
function normalizeDomainPath(s) {
  try {
    const url = new URL(s);
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "") || ""}`;
  } catch {
    return normalizeExact(s);
  }
}
function normalizeByMode(s, mode) {
  if (mode === "canonical-url") return normalizeCanonicalUrl(s);
  if (mode === "domain-path") return normalizeDomainPath(s);
  return normalizeExact(s);
}

// --- App state ---
let firstValue = null;
let scanner = null;
let currentCameraId = null;

const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const cameraSelect = document.getElementById("cameraSelect");
const modeSelect = document.getElementById("modeSelect");
const resetBtn = document.getElementById("resetBtn");
const beepOk = document.getElementById("beepOk");

// --- PWA install prompt handling ---
let deferredPrompt = null;
const installBtn = document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener("click", async () => {
  installBtn.hidden = true;
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
});

// --- Service worker registration ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(console.error);
}

// --- Controls ---
document.getElementById("beepTest").addEventListener("click", () => beepOk.play().catch(()=>{}));
resetBtn.addEventListener("click", () => resetFlow(true));
modeSelect.addEventListener("change", () => showStatus());

// --- Scanner setup ---
async function startScanner() {
  scanner = new Html5Qrcode("reader");
  await populateCameras();

  await startCameraStream(currentCameraId || { facingMode: "environment" });
  setTimeout(() => showStatus(), 150);
}

async function populateCameras() {
  const devices = await Html5Qrcode.getCameras();
  cameraSelect.innerHTML = "";
  devices.forEach((d,i) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.label || `Camera ${i+1}`;
    cameraSelect.appendChild(opt);
  });
  if (devices[0]) {
    currentCameraId = devices.find(d => /back|rear|environment/i.test(d.label))?.id || devices[0].id;
    cameraSelect.value = currentCameraId;
  }
  cameraSelect.onchange = async () => {
    currentCameraId = cameraSelect.value;
    await restartScanner();
  };
}

async function startCameraStream(cameraConfig) {
  await scanner.start(
    cameraConfig,
    { fps: 12, qrbox: calcQrBox(), aspectRatio: 1.777 },
    onScanSuccess,
    onScanFailure
  );
  window.addEventListener("resize", onResize, { passive: true });
}

async function restartScanner() {
  try { await scanner.stop(); } catch {}
  resultEl.textContent = "";
  await startCameraStream(currentCameraId);
}

function calcQrBox() {
  // square box ~70% of width up to 300px
  const w = Math.min(300, Math.floor(Math.min(window.innerWidth, 480) * 0.7));
  return { width: w, height: w };
}
function onResize() {
  // html5-qrcode doesn't dynamically resize qrbox; restart for best UX
  // Keep it simple: ignore unless user rotates; optional improvement.
}

// --- Scan handlers ---
function onScanSuccess(decodedText/*, decodedResult */) {
  scanner.pause(true); // pause stream while processing to avoid double reads
  const mode = modeSelect.value;
  const normalized = normalizeByMode(decodedText, mode);

  if (firstValue === null) {
    firstValue = normalized;
    flash("First captured. Now scan the second.");
    beepOk.play().catch(()=>{});
    setTimeout(() => { scanner.resume(); showStatus(); }, 350);
  } else {
    const second = normalized;
    const match = firstValue === second;
    showResult(match);
    beepOk.play().catch(()=>{});
    // Auto-reset after a few seconds
    setTimeout(() => resetFlow(false), 2500);
  }
}

function onScanFailure(/* error */) {
  // We can ignore per-frame failures to keep logs clean
}

function showStatus() {
  const modeLabel = {
    "exact": "Exact",
    "canonical-url": "Canonical URL",
    "domain-path": "Domain + Path"
  }[modeSelect.value];
  statusEl.textContent = firstValue === null
    ? `Scan first QR  •  Mode: ${modeLabel}`
    : `Scan second QR  •  Mode: ${modeLabel}`;
}
function showResult(ok) {
  resultEl.className = "result " + (ok ? "ok" : "no");
  resultEl.textContent = ok ? "✅ MATCH" : "❌ NO MATCH";
  statusEl.textContent = ok ? "Same payload" : "Different payloads";
  flashOverlay(ok); // add this line
}
function flash(text) {
  statusEl.textContent = text;
}

async function resetFlow(hard) {
  firstValue = null;
  resultEl.textContent = "";
  resultEl.className = "result";
  showStatus();
  try {
    if (hard) { await restartScanner(); } else { scanner.resume(); }
  } catch {}
}

// Kick off
startScanner().catch(err => {
  statusEl.textContent = "Camera error. Check HTTPS and permissions.";
  console.error(err);
});