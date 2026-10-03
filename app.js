// ============================================================
// AI PENILAI LEMBAR JAWABAN
// ============================================================

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwsyNf7WJjnyZdKc9kNIuN0Vf8D26tG6ORWYXA3R4_VfjcSUqLS8p7_8Uc_aIL3SsSMJA/exec";


const MAX_FILES = 10;

// Dua foto diproses bersamaan.
// Lebih cepat, tetapi lebih aman daripada 10 sekaligus.
const CONCURRENT = 2;

const MAX_RETRY = 3;


const photo =
  document.getElementById("photo");

const camera =
  document.getElementById("camera");

const processButton =
  document.getElementById("process");

const answers =
  document.getElementById("answers");

const csvButton =
  document.getElementById("csv");

const fileList =
  document.getElementById("fileList");

const progressBox =
  document.getElementById("progressBox");

const progressText =
  document.getElementById("progressText");

const progressBar =
  document.getElementById("progressBar");

const msg =
  document.getElementById("msg");


let selectedFiles = [];

let gradingResults = [];


// ============================================================
// PESAN
// ============================================================

function setMsg(text) {

  if (msg) {

    msg.textContent =
      text;

  }

}


// ============================================================
// PILIH FOTO
// ============================================================

function addFiles(files) {

  const incoming =
    Array.from(files);


  selectedFiles = [
    ...selectedFiles,
    ...incoming
  ];


  // Maksimal 10
  selectedFiles =
    selectedFiles.slice(
      0,
      MAX_FILES
    );


  showFileList();

}


// ============================================================
// DAFTAR FOTO
// ============================================================

function showFileList() {

  if (!fileList) {
    return;
  }


  fileList.innerHTML =
    "";


  if (
    selectedFiles.length === 0
  ) {

    fileList.innerHTML =
      "<div class='meta'>Belum ada foto dipilih.</div>";

    return;

  }


  selectedFiles.forEach(
    function(file, index) {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "file-item";


      item.innerHTML = `

        <strong>
          ${index + 1}.
        </strong>

        ${escapeHtml(
          file.name
        )}

        <span class="meta">
          ${
            (
              file.size /
              1024 /
              1024
            ).toFixed(2)
          }
          MB
        </span>

      `;


      fileList.appendChild(
        item
      );

    }
  );


  if (
    selectedFiles.length >=
    MAX_FILES
  ) {

    const info =
      document.createElement(
        "div"
      );


    info.className =
      "meta";


    info.textContent =
      "Maksimal 10 foto.";

    fileList.appendChild(
      info
    );

  }

}


// ============================================================
// KAMERA
// ============================================================

if (camera) {

  camera.addEventListener(
    "change",
    function() {

      if (
        camera.files &&
        camera.files.length > 0
      ) {

        addFiles(
          camera.files
        );

        camera.value =
          "";

      }

    }
  );

}


// ============================================================
// GALERI
// ============================================================

if (photo) {

  photo.addEventListener(
    "change",
    function() {

      if (
        photo.files &&
        photo.files.length > 0
      ) {

        addFiles(
          photo.files
        );

        photo.value =
          "";

      }

    }
  );

}


// ============================================================
// KOMPRES FOTO
// ============================================================

async function compressImage(file) {

  return new Promise(
    function(resolve, reject) {

      const img =
        new Image();


      const url =
        URL.createObjectURL(
          file
        );


      img.onload =
        function() {

          URL.revokeObjectURL(
            url
          );


          const MAX_SIZE =
            2200;


          let width =
            img.width;

          let height =
            img.height;


          if (
            width > MAX_SIZE ||
            height > MAX_SIZE
          ) {

            if (
              width > height
            ) {

              height =
                Math.round(
                  height *
                  MAX_SIZE /
                  width
                );

              width =
                MAX_SIZE;

            } else {

              width =
                Math.round(
                  width *
                  MAX_SIZE /
                  height
                );

              height =
                MAX_SIZE;

            }

          }


          const canvas =
            document.createElement(
              "canvas"
            );


          canvas.width =
            width;

          canvas.height =
            height;


          const ctx =
            canvas.getContext(
              "2d"
            );


          // Latar putih
          ctx.fillStyle =
            "#ffffff";


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

            function(blob) {

              if (!blob) {

                reject(
                  new Error(
                    "Foto gagal dikompres."
                  )
                );

                return;

              }


              resolve(
                blob
              );

            },

            "image/jpeg",

            0.86

          );

        };


      img.onerror =
        function() {

          URL.revokeObjectURL(
            url
          );


          reject(
            new Error(
              "Foto tidak dapat dibaca."
            )
          );

        };


      img.src =
        url;

    }
  );

}


// ============================================================
// BLOB → BASE64
// ============================================================

function blobToBase64(blob) {

  return new Promise(
    function(resolve, reject) {

      const reader =
        new FileReader();


      reader.onload =
        function() {

          const result =
            reader.result;


          const base64 =
            result
              .split(",")[1];


          resolve(
            base64
          );

        };


      reader.onerror =
        function() {

          reject(
            new Error(
              "Foto gagal dibaca."
            )
          );

        };


      reader.readAsDataURL(
        blob
      );

    }
  );

}


// ============================================================
// KIRIM KE AI
// ============================================================

async function sendToAI(file) {

  const compressed =
    await compressImage(
      file
    );


  const base64 =
    await blobToBase64(
      compressed
    );


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

            method:
              "POST",

            headers: {

              "Content-Type":
                "text/plain;charset=utf-8"

            },

            body:
              JSON.stringify({

                image:
                  base64,

                mimeType:
                  "image/jpeg"

              })

          }

        );


      const text =
        await response.text();


      let data;


      try {

        data =
          JSON.parse(
            text
          );

      } catch (error) {

        throw new Error(
          "Server mengembalikan data tidak valid."
        );

      }


      if (
        !data ||
        data.success !== true
      ) {

        throw new Error(
          data?.error ||
          "Penilaian gagal."
        );

      }


      return data.result;


    } catch (error) {

      lastError =
        error.message ||
        "Terjadi kesalahan.";


      if (
        attempt <
        MAX_RETRY
      ) {

        // Retry cepat
        await sleep(
          1000 * attempt
        );

      }

    }

  }


  throw new Error(
    lastError
  );

}


// ============================================================
// SLEEP
// ============================================================

function sleep(ms) {

  return new Promise(
    function(resolve) {

      setTimeout(
        resolve,
        ms
      );

    }
  );

}


// ============================================================
// PROSES SEMUA FOTO
// ============================================================

async function processAll() {

  if (
    selectedFiles.length === 0
  ) {

    alert(
      "Silakan pilih minimal 1 foto."
    );

    return;

  }


  processButton.disabled =
    true;


  gradingResults = [];

  answers.innerHTML =
    "";


  progressBox.style.display =
    "block";


  progressBar.style.width =
    "0%";


  setMsg(
    "AI sedang membaca lembar jawaban..."
  );


  const total =
    selectedFiles.length;


  let completed =
    0;


  let nextIndex =
    0;


  // ----------------------------------------------------------
  // Ambil pekerjaan berikutnya
  // ----------------------------------------------------------

  function getNextIndex() {

    if (
      nextIndex >= total
    ) {

      return null;

    }


    const index =
      nextIndex;


    nextIndex++;


    return index;

  }


  // ----------------------------------------------------------
  // Worker
  // ----------------------------------------------------------

  async function worker() {

    while (true) {

      const index =
        getNextIndex();


      if (
        index === null
      ) {

        return;

      }


      const file =
        selectedFiles[index];


      try {

        updateProgress(
          completed,
          total,
          "Membaca lembar "
          + (index + 1)
          + " dari "
          + total
          + "..."
        );


        const result =
          await sendToAI(
            file
          );


        gradingResults[index] = {

          index:
            index,

          fileName:
            file.name,

          result:
            result,

          success:
            true

        };


      } catch (error) {

        gradingResults[index] = {

          index:
            index,

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
        "Selesai "
        + completed
        + " dari "
        + total
        + " lembar"
      );


      renderResults();

    }

  }


  // ----------------------------------------------------------
  // Jalankan 2 bersamaan
  // ----------------------------------------------------------

  const workers = [];


  const workerCount =
    Math.min(
      CONCURRENT,
      total
    );


  for (
    let i = 0;
    i < workerCount;
    i++
  ) {

    workers.push(
      worker()
    );

  }


  await Promise.all(
    workers
  );


  renderResults();


  processButton.disabled =
    false;


  progressBar.style.width =
    "100%";


  const berhasil =
    gradingResults.filter(
      function(item) {

        return (
          item &&
          item.success
        );

      }
    ).length;


  const gagal =
    total -
    berhasil;


  if (
    gagal === 0
  ) {

    setMsg(
      "✅ Semua "
      + total
      + " lembar berhasil dinilai."
    );

  } else {

    setMsg(
      "⚠️ "
      + berhasil
      + " berhasil dan "
      + gagal
      + " perlu dicoba lagi."
    );

  }

}


// ============================================================
// PROGRESS
// ============================================================

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
        completed /
        total *
        100
      );


    progressBar.style.width =
      percent + "%";

  }

}


// ============================================================
// TAMPILKAN HASIL
// ============================================================

function renderResults() {

  answers.innerHTML =
    "";


  let grandTotal =
    0;


  let successCount =
    0;


  const sorted =
    gradingResults
      .filter(Boolean)
      .sort(
        function(a, b) {

          return (
            a.index -
            b.index
          );

        }
      );


  sorted.forEach(
    function(item) {

      const box =
        document.createElement(
          "div"
        );


      box.className =
        "result-box";


      // ------------------------------------------------------
      // GAGAL
      // ------------------------------------------------------

      if (
        !item.success
      ) {

        box.innerHTML = `

          <div class="result-header">

            <div>

              <strong class="student-name">
                Penilaian belum berhasil
              </strong>

              <div class="meta">
                ${escapeHtml(
                  item.fileName
                )}
              </div>

            </div>

          </div>

          <div class="error-box">

            ⚠️ ${escapeHtml(
              item.error
            )}

          </div>

        `;


        answers.appendChild(
          box
        );


        return;

      }


      successCount++;


      const result =
        item.result ||
        {};


      const studentName =
        result.studentName &&
        String(
          result.studentName
        ).trim()
          ? String(
              result.studentName
            ).trim()
          : "Nama tidak terbaca";


      const answerList =
        Array.isArray(
          result.answers
        )
          ? result.answers
          : [];


      let total =
        0;


      // ------------------------------------------------------
      // Pastikan Q1-Q5
      // ------------------------------------------------------

      const fixedAnswers = [];


      for (
        let q = 1;
        q <= 5;
        q++
      ) {

        let answer =
          answerList.find(
            function(item) {

              return (
                Number(
                  item.question
                ) === q
              );

            }
          );


        if (!answer) {

          answer = {

            question:
              q,

            answer:
              "Jawaban tidak terbaca.",

            score:
              0,

            confidence:
              0,

            note:
              "Jawaban tidak ditemukan."

          };

        }


        let score =
          Number(
            answer.score
          );


        if (
          isNaN(score)
        ) {

          score = 0;

        }


        score =
          Math.max(
            0,
            Math.min(
              20,
              Math.round(
                score
              )
            )
          );


        total +=
          score;


        fixedAnswers.push({

          question:
            q,

          answer:
            String(
              answer.answer ||
              ""
            ),

          score:
            score,

          confidence:
            Number(
              answer.confidence
            ),

          note:
            String(
              answer.note ||
              ""
            )

        });

      }


      grandTotal +=
        total;


      // ------------------------------------------------------
      // HEADER SISWA
      // ------------------------------------------------------

      let html = `

        <div class="result-header">

          <div>

            <strong class="student-name">

              ${escapeHtml(
                studentName
              )}

            </strong>

            <div class="meta">
              ${escapeHtml(
                item.fileName
              )}
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


      // ------------------------------------------------------
      // Q1-Q5
      // ------------------------------------------------------

      fixedAnswers.forEach(
        function(answer) {

          let confidenceText =
            "";


          if (
            !isNaN(
              answer.confidence
            )
          ) {

            confidenceText =
              " | Keyakinan AI: "
              +
              Math.round(
                answer.confidence *
                100
              )
              +
              "%";

          }


          html += `

            <div class="answer-item">

              <div class="answer-title">

                <strong>
                  Soal ${answer.question}
                </strong>

                <span>
                  ${answer.score}/20
                </span>

              </div>


              <div class="answer-text">

                ${escapeHtml(
                  answer.answer
                )}

              </div>


              <div class="meta">

                ${escapeHtml(
                  answer.note
                )}

                ${confidenceText}

              </div>

            </div>

          `;

        }
      );


      // ------------------------------------------------------
      // STATUS
      // ------------------------------------------------------

      const status =
        result.status ||
        "OK";


      html += `

        <div class="answer-item">

          <div class="meta">

            Status penilaian:
            <strong>
              ${escapeHtml(
                status
              )}
            </strong>

          </div>

        </div>

      `;


      box.innerHTML =
        html;


      answers.appendChild(
        box
      );

    }
  );


  // ==========================================================
  // TOTAL KESELURUHAN
  // ==========================================================

  if (
    successCount > 0
  ) {

    const totalBox =
      document.createElement(
        "div"
      );


    totalBox.className =
      "grand-total";


    totalBox.innerHTML = `

      <div>
        TOTAL NILAI KESELURUHAN
      </div>

      <strong>
        ${grandTotal}
      </strong>

      <div class="meta">
        ${successCount}
        siswa berhasil dinilai
      </div>

    `;


    answers.appendChild(
      totalBox
    );

  }

}


// ============================================================
// DOWNLOAD CSV
// ============================================================

if (csvButton) {

  csvButton.addEventListener(
    "click",
    downloadCSV
  );

}


function downloadCSV() {

  const successful =
    gradingResults.filter(
      function(item) {

        return (
          item &&
          item.success
        );

      }
    );


  if (
    successful.length === 0
  ) {

    alert(
      "Belum ada hasil penilaian."
    );

    return;

  }


  const rows = [

    [
      "Nama Siswa",
      "Nama File",
      "Soal 1",
      "Soal 2",
      "Soal 3",
      "Soal 4",
      "Soal 5",
      "Total",
      "Status"
    ]

  ];


  successful.forEach(
    function(item) {

      const result =
        item.result ||
        {};


      const name =
        result.studentName ||
        "Nama tidak terbaca";


      const list =
        Array.isArray(
          result.answers
        )
          ? result.answers
          : [];


      const scores =
        [
          0,
          0,
          0,
          0,
          0
        ];


      list.forEach(
        function(answer) {

          const q =
            Number(
              answer.question
            );


          if (
            q >= 1 &&
            q <= 5
          ) {

            scores[q - 1] =
              Number(
                answer.score
              ) || 0;

          }

        }
      );


      const total =
        scores.reduce(
          function(a, b) {

            return a + b;

          },
          0
        );


      rows.push([

        name,

        item.fileName,

        ...scores,

        total,

        result.status ||
          "OK"

      ]);

    }
  );


  const csv =
    rows
      .map(
        function(row) {

          return row
            .map(
              function(value) {

                return (
                  '"'
                  +
                  String(value)
                    .replace(
                      /"/g,
                      '""'
                    )
                  +
                  '"'
                );

              }
            )
            .join(",");

        }
      )
      .join("\n");


  const blob =
    new Blob(
      [
        "\ufeff" +
        csv
      ],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;


  link.download =
    "hasil-penilaian-seni-budaya.csv";


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();


  URL.revokeObjectURL(
    url
  );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


// ============================================================
// TOMBOL PERIKSA
// ============================================================

if (processButton) {

  processButton.addEventListener(
    "click",
    processAll
  );

}
