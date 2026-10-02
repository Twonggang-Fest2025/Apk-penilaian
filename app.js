// ===============================
// AI PENILAI LEMBAR JAWABAN
// ===============================

const WEB_APP_URL = "URL_WEB_APP_APPS_SCRIPT_ANDA";

const photo = document.getElementById("photo");
const camera = document.getElementById("camera");
const answers = document.getElementById("answers");

function setMsg(text) {
  const el = document.getElementById("msg");
  if (el) el.textContent = text;
}

function updateTotal() {
  let total = 0;

  for (let i = 0; i < 5; i++) {
    total += Number(
      document.getElementById(`s${i}`)?.value || 0
    );
  }

  const el = document.getElementById("total");
  if (el) el.textContent = `Total: ${total}`;
}


// ===============================
// TAMPILKAN PREVIEW FOTO
// ===============================

function showPreview(file) {

  const old = document.getElementById("preview-ai");

  if (old) old.remove();

  const img = document.createElement("img");

  img.id = "preview-ai";
  img.src = URL.createObjectURL(file);

  img.style.maxWidth = "100%";
  img.style.maxHeight = "500px";
  img.style.display = "block";
  img.style.margin = "15px auto";
  img.style.borderRadius = "10px";

  answers.prepend(img);
}


// ===============================
// TAMPILKAN HASIL AI
// ===============================

function renderResults(result) {

  answers.innerHTML = "";

  const list = result.answers || [];

  list.forEach((item, index) => {

    const box = document.createElement("div");

    box.className = "answer";

    const score = Number(item.score || 0);
    const max = Number(item.max_score || 20);

    const confidence = Math.round(
      Number(item.confidence || 0) * 100
    );

    box.innerHTML = `
      <h3>${item.question || `Q${index + 1}`}</h3>

      <div class="meta">
        Confidence AI: ${confidence}%
      </div>

      <textarea
        id="t${index}"
        placeholder="Jawaban terbaca AI"
      >${item.extracted_answer || ""}</textarea>

      <div class="scoreline">

        <label>
          Nilai

          <input
            id="s${index}"
            type="number"
            min="0"
            max="${max}"
            value="${score}"
          >
        </label>

        <span
          id="st${index}"
          class="${item.confidence < 0.75 ? "check" : ""}"
        >
          ${item.confidence < 0.75 ? "PERIKSA" : "OK"}
        </span>

      </div>

      <div class="meta">
        ${item.reason || ""}
      </div>
    `;

    answers.appendChild(box);
  });

  updateTotal();
}


// ===============================
// KIRIM FOTO KE GEMINI
// ===============================

async function sendToGemini(file) {

  if (
    !WEB_APP_URL ||
    WEB_APP_URL.includes("URL_WEB_APP")
  ) {
    throw new Error(
      "URL Web App Apps Script belum dimasukkan."
    );
  }

  setMsg("Mengirim foto ke AI Gemini...");

  const base64 = await fileToBase64(file);

  const response = await fetch(WEB_APP_URL, {

    method: "POST",

    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },

    body: JSON.stringify({
      image: base64,
      mimeType: file.type || "image/jpeg"
    })

  });

  if (!response.ok) {

    throw new Error(
      `Server gagal (${response.status})`
    );

  }

  const data = await response.json();

  if (!data.success) {

    throw new Error(
      data.error ||
      "AI gagal memproses lembar jawaban."
    );

  }

  return data.result;
}


// ===============================
// UBAH FOTO MENJADI BASE64
// ===============================

function fileToBase64(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => {

      const result = reader.result;

      const base64 =
        String(result).split(",")[1];

      resolve(base64);

    };

    reader.onerror = () => {

      reject(
        new Error("Foto gagal dibaca.")
      );

    };

    reader.readAsDataURL(file);

  });

}


// ===============================
// AMBIL FILE YANG DIPILIH
// BISA KAMERA ATAU FILE
// ===============================

function getSelectedFile() {

  // Jika foto dari kamera
  if (camera?.files?.length) {
    return camera.files[0];
  }

  // Jika memilih dari file/galeri
  if (photo?.files?.length) {
    return photo.files[0];
  }

  return null;
}


// ===============================
// TOMBOL PROSES
// ===============================

document.getElementById("process").onclick =
async () => {

  const file = getSelectedFile();

  if (!file) {

    alert(
      "Ambil foto dengan kamera atau pilih foto dari file terlebih dahulu."
    );

    return;
  }

  if (!file.type.startsWith("image/")) {

    alert(
      "File harus berupa JPG, JPEG, PNG, atau gambar."
    );

    return;
  }

  try {

    setMsg(
      "Membaca foto lembar jawaban..."
    );

    showPreview(file);

    const result =
      await sendToGemini(file);

    renderResults(result);

    const total =
      Number(result.total || 0);

    setMsg(
      `Selesai. Total nilai: ${total}`
    );

  } catch (error) {

    console.error(error);

    setMsg(
      "Terjadi kesalahan."
    );

    answers.innerHTML = `
      <div class="answer">

        <h3>Gagal memproses</h3>

        <div class="meta">
          ${error.message}
        </div>

      </div>
    `;

    alert(error.message);

  }

};


// ===============================
// UPDATE NILAI MANUAL
// ===============================

document.addEventListener(
  "input",
  (event) => {

    if (/^s[0-4]$/.test(event.target.id)) {
      updateTotal();
    }

  }
);


// ===============================
// EXPORT CSV
// ===============================

document.getElementById("csv").onclick = () => {

  const name =
    document.getElementById("name")?.value || "";

  const className =
    document.getElementById("class2")?.value || "";

  const number =
    document.getElementById("number")?.value || "";

  const classCode =
    document.getElementById("kelas")?.value || "";

  const scores = [];

  for (let i = 0; i < 5; i++) {

    scores.push(
      document.getElementById(`s${i}`)?.value || ""
    );

  }

  const total = scores.reduce(
    (sum, value) =>
      sum + Number(value || 0),
    0
  );

  const row = [
    name,
    className,
    number,
    ...scores,
    total
  ];

  const csv =
    "Nama,Kelas,Nomor,Q1,Q2,Q3,Q4,Q5,Total\n" +
    row
      .map(value =>
        `"${String(value).replaceAll('"', '""')}"`
      )
      .join(",");

  const blob = new Blob(
    [csv],
    {
      type: "text/csv;charset=utf-8"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    `hasil-${classCode || "penilaian"}.csv`;

  a.click();

  URL.revokeObjectURL(url);

};
