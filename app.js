import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.1/+esm";

const MODEL_ID = "wolfofbackstreet/GLM-OCR-ONNX-q4f16";
const fileEl = document.querySelector("#file");
const runBtn = document.querySelector("#run");
const previewBox = document.querySelector("#previewBox");
const preview = document.querySelector("#preview");
const statusEl = document.querySelector("#status");
const out = document.querySelector("#out");
const bar = document.querySelector("#bar");

let file = null;

fileEl.addEventListener("change", () => {
  file = fileEl.files?.[0] || null;
  if (!file) return;
  preview.src = URL.createObjectURL(file);
  previewBox.classList.remove("hidden");
  runBtn.disabled = false;
  statusEl.textContent = "Foto siap. Tekan Mulai Membaca.";
  out.textContent = "Belum ada hasil.";
});

function setProgress(p, msg) {
  bar.style.width = `${Math.max(0, Math.min(100, p))}%`;
  statusEl.textContent = msg;
}

async function loadImage(file) {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function makeDataURL(file) {
  const img = await loadImage(file);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0,0,c.width,c.height);
  ctx.drawImage(img,0,0,c.width,c.height);
  return c.toDataURL("image/jpeg", .92);
}

let ocr = null;

runBtn.addEventListener("click", async () => {
  if (!file) return;
  runBtn.disabled = true;
  out.textContent = "Memuat model OCR…";

  try {
    if (!navigator.gpu) {
      throw new Error("WebGPU tidak tersedia di browser ini. Gunakan Safari/iPadOS yang mendukung WebGPU.");
    }

    setProgress(2, "Menyiapkan model OCR…");

    if (!ocr) {
      ocr = await pipeline("image-text-to-text", MODEL_ID, {
        device: "webgpu",
        dtype: "q4f16",
        progress_callback: (x) => {
          if (typeof x?.progress === "number") {
            const p = Math.round(x.progress);
            setProgress(Math.min(88, Math.max(2, p * .88)), `Mengunduh model OCR… ${p}%`);
          }
        }
      });
    }

    setProgress(90, "Membaca tulisan pada foto…");
    const image = await makeDataURL(file);

    const messages = [{
      role: "user",
      content: [
        { type: "image", url: image },
        { type: "text", text:
          "Text Recognition: Baca seluruh tulisan tangan pada lembar jawaban ini. Pertahankan nomor soal 1, 2, 3, 4, 5 dan tulis jawaban siswa apa adanya semampu mungkin. Jangan mengarang teks yang tidak terlihat. Gunakan bahasa Indonesia."
        }
      ]
    }];

    const result = await ocr(messages, {
      max_new_tokens: 1200,
      return_full_text: false
    });

    let text = result?.[0]?.generated_text;
    if (Array.isArray(text)) {
      text = text.map(x => x?.content || x?.text || "").join("\n");
    }
    if (typeof text !== "string") text = JSON.stringify(result, null, 2);

    out.textContent = text.trim() || "Model tidak menghasilkan teks.";
    setProgress(100, "Tes OCR selesai.");
  } catch (err) {
    console.error(err);
    out.textContent = "GAGAL:\n" + (err?.message || String(err));
    setProgress(0, "Tes gagal. Lihat pesan di bawah.");
  } finally {
    runBtn.disabled = false;
  }
});
