// ======================================================
// AI PENILAI LEMBAR JAWABAN
// ======================================================

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwsyNf7WJjnyZdKc9kNIuN0Vf8D26tG6ORWYXA3R4_VfjcSUqLS8p7_8Uc_aIL3SsSMJA/exec";

const photo = document.getElementById("photo");
const camera = document.getElementById("camera");
const processButton = document.getElementById("process");
const answers = document.getElementById("answers");
const csvButton = document.getElementById("csv");


// ======================================================
// PESAN STATUS
// ======================================================

function setMsg(text) {
  const el = document.getElementById("msg");

  if (el) {
    el.textContent = text;
  }
}


// ======================================================
// HITUNG TOTAL NILAI
// ======================================================

function updateTotal() {
  let total = 0;

  for (let i = 0; i < 5; i++) {
    const input = document.getElementById(`s${i}`);

    if (input) {
      total += Number(input.value || 0);
    }
  }

  const totalElement = document.getElementById("total");

  if (totalElement) {
    totalElement.textContent = `Total: ${total}`;
  }
}


// ======================================================
// PREVIEW FOTO
// ======================================================

function showPreview(file) {
  if (!answers) return;

  const oldPreview =
    document.getElementById("preview-ai");

  if (oldPreview) {
    oldPreview.remove();
  }

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


// ======================================================
// FILE → BASE64
// ======================================================

function fileToBase64(file) {
  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => {

      const result = String(reader.result);

      const base64 =
        result.split(",")[1];

      if (!base64) {
        reject(
          new Error("Foto gagal dibaca.")
        );

        return;
      }

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


// ======================================================
// KOMPRES FOTO
// ======================================================

async function compressImage(file) {

  return new Promise((resolve, reject) => {

    const img = new Image();

    const url =
      URL.createObjectURL(file);

    img.onload = () => {

      URL.revokeObjectURL(url);

      const MAX_SIZE = 2200;

      let width = img.width;
      let height = img.height;

      if (
        width > MAX_SIZE ||
        height > MAX_SIZE
      ) {

        if (width > height) {

          height =
            Math.round(
              height * MAX_SIZE / width
            );

          width = MAX_SIZE;

        } else {

          width =
            Math.round(
              width * MAX_SIZE / height
            );

          height = MAX_SIZE;

        }
      }

      const canvas =
        document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const ctx =
        canvas.getContext("2d");

      if (!ctx) {

        reject(
          new Error(
            "Browser tidak mendukung pemrosesan foto."
          )
        );

        return;
      }

      // Latar putih
      ctx.fillStyle = "#ffffff";

      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      // Gambar
      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );

      canvas.toBlob(
        (blob) => {

          if (!blob) {

            reject(
              new Error(
                "Foto gagal dikompres."
              )
            );

            return;
          }

          const compressedFile =
            new File(
              [blob],
              "lembar-jawaban.jpg",
              {
                type: "image/jpeg",
                lastModified: Date.now()
              }
            );

          resolve(compressedFile);

        },
        "image/jpeg",
        0.88
      );

    };

    img.onerror = () => {

      URL.revokeObjectURL(url);

      reject(
        new Error(
          "Foto tidak dapat diproses."
        )
      );

    };

    img.src = url;

  });

}


// ======================================================
// AMBIL FOTO YANG DIPILIH
// ======================================================

function getSelectedFile() {

  // Kamera
  if (
    camera &&
    camera.files &&
    camera.files.length > 0
  ) {

    return camera.files[0];

  }

  // Galeri
  if (
    photo &&
    photo.files &&
    photo.files.length > 0
  ) {

    return photo.files[0];

  }

  return null;
}


// ======================================================
// KIRIM FOTO KE GOOGLE APPS SCRIPT → GEMINI
// ======================================================

async function sendToGemini(file) {

  if (
    !WEB_APP_URL ||
    WEB_APP_URL.includes("URL_WEB_APP")
  ) {

    throw new Error(
      "URL Web App Apps Script belum dimasukkan."
    );

  }

  setMsg(
    "Mengoptimalkan foto..."
  );

  const compressedFile =
    await compressImage(file);


  setMsg(
    "Membaca lembar jawaban dengan AI..."
  );

  const base64 =
    await fileToBase64(
      compressedFile
    );


  const response =
    await fetch(
      WEB_APP_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify({
          image: base64,
          mimeType: "image/jpeg"
        })
      }
    );


  if (!response.ok) {

    throw new Error(
      `Server gagal (${response.status}).`
    );

  }


  const data =
    await response.json();


  if (!data.success) {

    throw new Error(
      data.error ||
      "AI gagal memproses lembar jawaban."
    );

  }


  if (!data.result) {

    throw new Error(
      "AI tidak mengembalikan hasil penilaian."
    );

  }


  return data.result;

}


// ======================================================
// TAMPILKAN HASIL PENILAIAN
// ======================================================

function renderResults(result) {

  if (!answers) return;

  answers.innerHTML = "";


  const list =
    Array.isArray(result.answers)
      ? result.answers
      : [];


  if (list.length === 0) {

    answers.innerHTML = `
      <div class="answer">
        <h3>Tidak ada hasil</h3>

        <div class="meta">
          AI tidak menemukan jawaban yang dapat dinilai.
        </div>
      </div>
    `;

    updateTotal();

    return;
  }


  list.forEach(
    (item, index) => {

      const box =
        document.createElement("div");

      box.className = "answer";


      let score =
        Number(item.score || 0);

      if (score < 0) {
        score = 0;
      }

      if (score > 20) {
        score = 20;
      }


      const confidence =
        Number(item.confidence || 0);


      const confidencePercent =
        Math.round(
          confidence * 100
        );


      // Backend sekarang menggunakan "answer"
      // sedangkan versi lama menggunakan "extracted_answer"
      const answerText =
        item.answer ||
        item.extracted_answer ||
        "";


      // Backend sekarang menggunakan "note"
      // sedangkan versi lama menggunakan "reason"
      const note =
        item.note ||
        item.reason ||
        "";


      const status =
        confidence < 0.75
          ? "PERIKSA"
          : "OK";


      const statusClass =
        confidence < 0.75
          ? "check"
          : "";


      box.innerHTML = `

        <h3>
          Soal ${item.question || index + 1}
        </h3>

        <div class="meta">
          Confidence AI:
          ${confidencePercent}%
        </div>

        <textarea
          id="t${index}"
          placeholder="Jawaban yang terbaca AI"
        >${escapeHtml(answerText)}</textarea>

        <div class="scoreline">

          <label>
            Nilai

            <input
              id="s${index}"
              type="number"
              min="0"
              max="20"
              value="${score}"
            >
          </label>

          <span
            id="st${index}"
            class="${statusClass}"
          >
            ${status}
          </span>

        </div>

        <div class="meta">
          ${escapeHtml(note)}
        </div>

      `;


      answers.appendChild(box);

    }
  );


  updateTotal();

}


// ======================================================
// AMANKAN TEKS DARI AI
// ======================================================

function escapeHtml(text) {

  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// ======================================================
// TOMBOL "PERIKSA DENGAN AI"
// ======================================================

if (processButton) {

  processButton.addEventListener(
    "click",
    async () => {

      const file =
        getSelectedFile();


      // Belum ada foto
      if (!file) {

        alert(
          "Silakan ambil foto dengan kamera atau pilih foto dari galeri terlebih dahulu."
        );

        return;
      }


      // Pastikan gambar
      if (
        !file.type ||
        !file.type.startsWith("image/")
      ) {

        alert(
          "File harus berupa gambar JPG, JPEG, PNG, atau format gambar lainnya."
        );

        return;
      }


      try {

        // Matikan tombol selama proses
        processButton.disabled = true;

        processButton.textContent =
          "⏳ SEDANG MEMERIKSA...";


        setMsg(
          "Membaca foto lembar jawaban..."
        );


        // Tampilkan preview
        showPreview(file);


        // Kirim ke AI
        const result =
          await sendToGemini(file);


        // Tampilkan hasil
        renderResults(result);


        const total =
          Number(result.total || 0);


        if (result.status === "PERIKSA") {

          setMsg(
            `Selesai. Total nilai: ${total}. Ada jawaban yang perlu diperiksa.`
          );

        } else {

          setMsg(
            `Selesai. Total nilai: ${total}`
          );

        }


      } catch (error) {

        console.error(
          "ERROR:",
          error
        );


        setMsg(
          "Terjadi kesalahan saat memeriksa."
        );


        if (answers) {

          answers.innerHTML = `

            <div class="answer">

              <h3>
                ❌ Gagal memproses
              </h3>

              <div class="meta">
                ${escapeHtml(
                  error.message ||
                  "Kesalahan tidak diketahui."
                )}
              </div>

            </div>

          `;

        }


        alert(
          error.message ||
          "Terjadi kesalahan."
        );


      } finally {

        // Aktifkan tombol lagi
        processButton.disabled = false;

        processButton.textContent =
          "🤖 PERIKSA DENGAN AI";

      }

    }
  );

}


// ======================================================
// HITUNG ULANG NILAI JIKA DIUBAH MANUAL
// ======================================================

document.addEventListener(
  "input",
  (event) => {

    if (
      /^s[0-4]$/.test(
        event.target.id
      )
    ) {

      let value =
        Number(event.target.value || 0);


      if (value < 0) {
        value = 0;
      }

      if (value > 20) {
        value = 20;
      }


      event.target.value =
        value;


      updateTotal();

    }

  }
);


// ======================================================
// PILIH FOTO DARI GALERI
// ======================================================

if (photo) {

  photo.addEventListener(
    "change",
    () => {

      if (
        photo.files &&
        photo.files.length
      ) {

        setMsg(
          "Foto dipilih. Tekan PERIKSA DENGAN AI."
        );

      }

    }
  );

}


// ======================================================
// AMBIL FOTO DARI KAMERA
// ======================================================

if (camera) {

  camera.addEventListener(
    "change",
    () => {

      if (
        camera.files &&
        camera.files.length
      ) {

        setMsg(
          "Foto kamera diterima. Tekan PERIKSA DENGAN AI."
        );

      }

    }
  );

}


// ======================================================
// EXPORT CSV
// ======================================================

if (csvButton) {

  csvButton.addEventListener(
    "click",
    () => {

      const name =
        document.getElementById(
          "name"
        )?.value || "";


      const className =
        document.getElementById(
          "class2"
        )?.value || "";


      const number =
        document.getElementById(
          "number"
        )?.value || "";


      const classCode =
        document.getElementById(
          "kelas"
        )?.value || "";


      const scores = [];


      for (let i = 0; i < 5; i++) {

        scores.push(
          document.getElementById(
            `s${i}`
          )?.value || ""
        );

      }


      const total =
        scores.reduce(
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
          .map(
            value =>
              `"${String(value)
                .replaceAll('"', '""')}"`
          )
          .join(",");


      const blob =
        new Blob(
          [csv],
          {
            type:
              "text/csv;charset=utf-8"
          }
        );


      const url =
        URL.createObjectURL(blob);


      const link =
        document.createElement("a");


      link.href = url;


      link.download =
        `hasil-${classCode || "penilaian"}.csv`;


      document.body.appendChild(link);

      link.click();

      link.remove();


      URL.revokeObjectURL(url);

    }
  );

}


// ======================================================
// SELESAI
// ======================================================

setMsg(
  "Siap. Silakan masukkan foto lembar jawaban."
);
