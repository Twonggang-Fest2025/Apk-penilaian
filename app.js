import { PaddleOCR } from "https://cdn.jsdelivr.net/npm/@paddleocr/paddleocr-js@0.4.2/+esm";

const fileInput = document.getElementById("file");
const preview = document.getElementById("preview");
const startBtn = document.getElementById("start");
const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");
const summaryEl = document.getElementById("summary");

let selectedFile = null;
let ocr = null;

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = "status " + type;
}

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files?.[0] || null;
  if (!selectedFile) {
    startBtn.disabled = true;
    preview.removeAttribute("src");
    setStatus("Belum ada foto.");
    return;
  }

  preview.src = URL.createObjectURL(selectedFile);
  startBtn.disabled = false;
  outputEl.textContent = "—";
  summaryEl.textContent = "Foto siap diuji.";
  setStatus(`Foto dipilih: ${selectedFile.name}`, "ok");
});

async function loadOCR() {
  if (ocr) return ocr;

  setStatus("Memuat mesin OCR dan model… pertama kali bisa agak lama.", "loading");

  ocr = await PaddleOCR.create({
    lang: "latin",
    ocrVersion: "PP-OCRv5",
    ortOptions: {
      backend: "auto"
    }
  });

  return ocr;
}

startBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  startBtn.disabled = true;
  outputEl.textContent = "Sedang membaca foto…";
  summaryEl.textContent = "Memproses…";

  try {
    const engine = await loadOCR();
    setStatus("OCR sedang membaca tulisan…", "loading");

    const [result] = await engine.predict(selectedFile);
    const items = Array.isArray(result?.items) ? result.items : [];

    if (!items.length) {
      summaryEl.textContent = "Tidak ada baris teks yang terdeteksi.";
      outputEl.textContent = "Tidak ada hasil OCR.";
      setStatus("Tes selesai, tetapi tulisan belum terdeteksi.", "warn");
      return;
    }

    const lines = items.map((item, i) => {
      const text = String(item?.text ?? "").trim();
      const score = Number(item?.score ?? 0);
      return `${i + 1}. [${(score * 100).toFixed(1)}%] ${text}`;
    }).filter(Boolean);

    const scores = items
      .map(x => Number(x?.score))
      .filter(x => Number.isFinite(x));

    const avg = scores.length
      ? scores.reduce((a,b) => a+b, 0) / scores.length
      : 0;

    summaryEl.textContent =
      `${items.length} baris terdeteksi • rata-rata confidence ${(avg * 100).toFixed(1)}%`;

    outputEl.textContent = lines.join("\n");
    setStatus("Tes OCR selesai.", "ok");
  } catch (err) {
    console.error(err);
    ocr = null;
    summaryEl.textContent = "OCR gagal dijalankan.";
    outputEl.textContent = String(err?.message || err);
    setStatus("Terjadi kesalahan saat memuat/menjalankan OCR.", "error");
  } finally {
    startBtn.disabled = false;
  }
});
