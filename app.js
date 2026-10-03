// =====================================================
// AI PENILAI LEMBAR JAWABAN
// =====================================================

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwsyNf7WJjnyZdKc9kNIuN0Vf8D26tG6ORWYXA3R4_VfjcSUqLS8p7_8Uc_aIL3SsSMJA/exec";

const MAX_FILES = 10;
const CONCURRENT = 2;
const MAX_RETRY = 3;

const photo = document.getElementById("photo");
const camera = document.getElementById("camera");
const processButton = document.getElementById("process");
const answers = document.getElementById("answers");
const csvButton = document.getElementById("csv");

const fileList = document.getElementById("fileList");
const progressBox = document.getElementById("progressBox");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const msg = document.getElementById("msg");

let selectedFiles = [];
let gradingResults = [];


// =====================================================
// PESAN
// =====================================================

function setMsg(text) {
  if (msg) {
    msg.textContent = text;
  }
}


// =====================================================
// PILIH FILE
// =====================================================

function addFiles(files) {

  const incoming = Array.from(files);

  selectedFiles = [
    ...selectedFiles,
    ...incoming
  ];

  // Maksimal 10 foto
  selectedFiles = selectedFiles.slice(0, MAX_FILES);

  showFileList();
}


// =====================================================
// TAMPILKAN DAFTAR FILE
// =====================================================

function showFileList() {

  if (!fileList) return;

  fileList.innerHTML = "";

  if (selectedFiles.length === 0) {
    fileList.innerHTML =
      "<div class='meta'>Belum ada foto dipilih.</div>";
    return;
  }

  selectedFiles.forEach((file, index) => {

    const item = document.createElement("div");

    item.className = "file-item";

    item.innerHTML = `
      <strong>${index + 1}.</strong>
      ${escapeHtml(file.name)}
      <span class="meta">
        ${(file.size / 1024 / 1024).toFixed(2)} MB
      </span>
    `;

    fileList.appendChild(item);

  });

  if (selectedFiles.length >= MAX_FILES) {

    const info = document.createElement("div");

    info.className = "meta";

    info.textContent =
      "Maksimal 10 foto sudah tercapai.";

    fileList.appendChild(info);
  }
}


// =====================================================
// CAMERA
// =====================================================

if (camera) {

  camera.addEventListener("change", function () {

    if (camera.files.length > 0) {

      addFiles(camera.files);

      camera.value = "";

    }

  });

}


// =====================================================
// GALERI
// =====================================================

if (photo) {

  photo.addEventListener("change", function () {

    if (photo.files.length > 0) {

      addFiles(photo.files);

      photo.value = "";

    }

  });

}


// =====================================================
// KOMPRES FOTO
// =====================================================

async function compressImage(file) {

  return new Promise((resolve, reject) => {

    const img = new Image();

    const url = URL.createObjectURL(file);

    img.onload = () => {

      URL.revokeObjectURL(url);

      const MAX_SIZE = 2200;

      let width = img.width;
      let height = img.height;

      if (width > MAX_SIZE || height > MAX_SIZE) {

        if (width > height) {

          height = Math.round(
            height * MAX_SIZE / width
          );

          width = MAX_SIZE;

        } else {

          width = Math.round(
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

      ctx.fillStyle = "#ffffff";

      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );

      canvas.toBlob(

        blob => {

          if (!blob) {

            reject(
              new Error(
                "Foto gagal dikompres."
              )
            );

            return;
          }

          resolve(blob);

        },

        "image/jpeg",

        0.86

      );

    };

    img.onerror = () => {

      URL.revokeObjectURL(url);

      reject(
        new Error(
          "Foto tidak dapat dibaca."
        )
      );

    };

    img.src = url;

  });

}


// =====================================================
// FILE → BASE64
// =====================================================

function blobToBase64(blob) {

  return new Promise((resolve, reject) => {

    const reader =
      new FileReader();

    reader.onload = () => {

      const result =
        reader.result;

      const base64 =
        result.split(",")[1];

      resolve(base64);

    };

    reader.onerror = () => {

      reject(
        new Error(
          "Foto gagal dibaca."
        )
      );

    };

    reader.readAsDataURL(blob);

  });

}


// =====================================================
// KIRIM KE AI
// =====================================================

async function sendToAI(file) {

  const compressed =
    await compressImage(file);

  const base64 =
    await blobToBase64(compressed);

  let lastError =
    "Tidak diketahui.";

  for (
    let attempt = 1;
    attempt <= MAX_RETRY;
    attempt++
  ) {

    try {

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

              mimeType:
                "image/jpeg"

            })
          }
        );

      const text =
        await response.text();

      let data;

      try {

        data = JSON.parse(text);

      } catch (e) {

        throw new Error(
          "Server mengembalikan data yang tidak valid."
        );

      }

      if (
        !data ||
        data.success !== true
      ) {

        throw new Error(
          data?.error ||
          "Penilaian gagal diproses."
        );

      }

      return data.result;

    } catch (error) {

      lastError =
        error.message ||
        "Terjadi kesalahan.";

      // Tunggu sebelum mencoba lagi
      if (attempt < MAX_RETRY) {

        await sleep(
          1200 * attempt
        );

      }

    }

  }

  throw new Error(lastError);

}


// =====================================================
// JEDA
// =====================================================

function sleep(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );

}


// =====================================================
// PROSES BEBERAPA FOTO
// =====================================================

async function processAll() {

  if (selectedFiles.length === 0) {

    alert(
      "Silakan pilih minimal 1 foto lembar jawaban."
    );

    return;

  }

  processButton.disabled = true;

  selectedFiles.forEach(() => {});

  gradingResults = [];

  answers.innerHTML = "";

  progressBox.style.display =
    "block";

  progressBar.style.width =
    "0%";

  setMsg(
    "AI sedang memeriksa lembar jawaban..."
  );

  const total =
    selectedFiles.length;

  let completed = 0;

  // ---------------------------------------------------
  // Worker
  // ---------------------------------------------------

  async function worker() {

    while (true) {

      const index =
        getNextIndex();

      if (index === null) {
        return;
      }

      const file =
        selectedFiles[index];

      try {

        updateProgress(
          completed,
          total,
          `Memeriksa lembar ${index + 1} dari ${total}...`
        );

        const result =
          await sendToAI(file);

        gradingResults[index] = {

          index: index,

          fileName:
            file.name,

          result:
            result,

          success:
            true

        };

      } catch (error) {

        gradingResults[index] = {

          index: index,

          fileName:
            file.name,

          result:
            null,

          success:
            false,

          error:
            error.message

        };

      }

      completed++;

      updateProgress(
        completed,
        total,
        `Selesai ${completed} dari ${total} lembar`
      );

      renderResults();

    }

  }


  let nextIndex = 0;

  function getNextIndex() {

    if (nextIndex >= total) {
      return null;
    }

    const index =
      nextIndex;

    nextIndex++;

    return index;

  }


  // Jalankan 2 proses bersamaan
  await Promise.all([

    worker(),

    worker()

  ]);


  renderResults();

  processButton.disabled = false;

  progressBar.style.width =
    "100%";

  const berhasil =
    gradingResults.filter(
      x => x && x.success
    ).length;

  const gagal =
    total - berhasil;

  if (gagal === 0) {

    setMsg(
      `✅ Semua ${total} lembar berhasil dinilai.`
    );

  } else {

    setMsg(
      `⚠️ ${berhasil} berhasil, ${gagal} perlu diproses ulang.`
    );

  }

}


// =====================================================
// PROGRESS
// =====================================================

function updateProgress(
  completed,
  total,
  text
) {

  if (progressText) {

    progressText.textContent =
      text;

  }

  if (progressBar) {

    const percent =
      Math.round(
        completed / total * 100
      );

    progressBar.style.width =
      percent + "%";

  }

}


// =====================================================
// TAMPILKAN HASIL
// =====================================================

function renderResults() {

  answers.innerHTML = "";

  let grandTotal = 0;

  let successCount = 0;

  gradingResults
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.index - b.index
    )
    .forEach(item => {

      const box =
        document.createElement("div");

      box.className =
        "result-box";


      // ------------------------------------------------
      // GAGAL
      // ------------------------------------------------

      if (!item.success) {

        box.innerHTML = `

          <div class="result-header">
            <strong>
              Lembar ${item.index + 1}
            </strong>
          </div>

          <div class="error-box">

            ❌ Penilaian belum berhasil.

            <br><br>

            <small>
              ${escapeHtml(item.error)}
            </small>

          </div>

        `;

        answers.appendChild(box);

        return;

      }


      successCount++;


      const result =
        item.result || {};

      const answerList =
        Array.isArray(result.answers)
          ? result.answers
          : [];


      let total =
        Number(result.total) || 0;


      // Hitung ulang dari Q1-Q5
      // supaya total selalu akurat

      if (answerList.length > 0) {

        total =
          answerList.reduce(
            (sum, answer) => {

              const score =
                Number(answer.score) || 0;

              return sum + score;

            },

            0
          );

      }


      grandTotal += total;


      let html = `

        <div class="result-header">

          <div>

            <strong>
              Lembar ${item.index + 1}
            </strong>

            <div class="meta">
              ${escapeHtml(item.fileName)}
            </div>

          </div>

          <div class="total-score">

            TOTAL
            <strong>
              ${total}
            </strong>
            / 100

          </div>

        </div>

      `;


      answerList.forEach(
        (answer, i) => {

          const question =
            answer.question ||
            i + 1;

          const score =
            Number(answer.score) || 0;

          const confidence =
            Number(answer.confidence);

          const note =
            answer.note || "";

          const studentAnswer =
            answer.answer || "";


          html += `

            <div class="answer-item">

              <div class="answer-title">

                <strong>
                  Soal ${question}
                </strong>

                <span>
                  ${score}/20
                </span>

              </div>

              <div class="answer-text">

                ${escapeHtml(
                  studentAnswer
                )}

              </div>

              <div class="meta">

                ${escapeHtml(note)}

                ${
                  !isNaN(confidence)
                    ? " | Keyakinan AI: " +
                      Math.round(
                        confidence * 100
                      ) +
                      "%"
                    : ""
                }

              </div>

            </div>

          `;

        }
      );


      answers.appendChild(
        createResultElement(html)
      );

    });


  // =================================================
  // TOTAL SEMUA
  // =================================================

  if (successCount > 0) {

    const totalBox =
      document.createElement("div");

    totalBox.className =
      "grand-total";

    totalBox.innerHTML = `

      <div>
        TOTAL SEMUA HASIL
      </div>

      <strong>
        ${grandTotal}
      </strong>

      <div class="meta">
        ${successCount} lembar berhasil dinilai
      </div>

    `;

    answers.appendChild(
      totalBox
    );

  }

}


// =====================================================
// CREATE ELEMENT
// =====================================================

function createResultElement(html) {

  const div =
    document.createElement("div");

  div.innerHTML =
    html;

  return div.firstElementChild ||
    div;

}


// =====================================================
// CSV
// =====================================================

if (csvButton) {

  csvButton.addEventListener(
    "click",
    downloadCSV
  );

}


function downloadCSV() {

  const successful =
    gradingResults.filter(
      item =>
        item &&
        item.success
    );

  if (successful.length === 0) {

    alert(
      "Belum ada hasil penilaian."
    );

    return;

  }


  const rows = [

    [
      "Lembar",
      "Nama File",
      "Soal 1",
      "Soal 2",
      "Soal 3",
      "Soal 4",
      "Soal 5",
      "Total"
    ]

  ];


  successful.forEach(item => {

    const result =
      item.result || {};

    const list =
      Array.isArray(result.answers)
        ? result.answers
        : [];


    const scores = [
      0, 0, 0, 0, 0
    ];


    list.forEach(answer => {

      const q =
        Number(answer.question);

      if (
        q >= 1 &&
        q <= 5
      ) {

        scores[q - 1] =
          Number(answer.score) || 0;

      }

    });


    const total =
      scores.reduce(
        (a, b) => a + b,
        0
      );


    rows.push([

      item.index + 1,

      item.fileName,

      ...scores,

      total

    ]);

  });


  const csv =
    rows
      .map(row =>
        row
          .map(value =>
            `"${String(value)
              .replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");


  const blob =
    new Blob(
      ["\ufeff" + csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "hasil-penilaian.csv";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// =====================================================
// TOMBOL PERIKSA
// =====================================================

if (processButton) {

  processButton.addEventListener(
    "click",
    processAll
  );

}
