(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const state = { files: [], results: [], ocr: null, loadingModel: false };

  const defaultRubric = [
    "seni rupa, pengertian, karya seni, visual",
    "kesatuan, keseimbangan, penekanan, harmoni, proporsi, irama, kontras",
    "titik, garis, bidang, bentuk, ruang, tekstur, warna, gelap terang",
    "primer, sekunder, tersier, netral, merah, kuning, biru, hijau, jingga, ungu",
    "seni rupa murni, seni rupa terapan, fungsi, estetis, pakai, lukisan, patung, kriya, desain"
  ];

  function setMessage(text, kind="") {
    const el = $("message");
    el.textContent = text;
    el.className = "message " + kind;
  }

  function setProgress(current, total, text) {
    const pct = total ? Math.round(current / total * 100) : 0;
    $("progressBar").style.width = pct + "%";
    $("progressPercent").textContent = pct + "%";
    $("progressText").textContent = text;
  }

  function renderRubric() {
    const saved = JSON.parse(localStorage.getItem("nilai_rubric_v4") || "null") || defaultRubric;
    $("rubricGrid").innerHTML = saved.map((v,i) =>
      `<div class="rubric"><label>Soal ${i+1}</label><textarea id="rubric${i}">${escapeHtml(v)}</textarea></div>`
    ).join("");
  }

  function getRubric() {
    return [0,1,2,3,4].map(i => $("rubric"+i).value.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean));
  }

  function saveRubric() {
    const vals = [0,1,2,3,4].map(i => $("rubric"+i).value);
    localStorage.setItem("nilai_rubric_v4", JSON.stringify(vals));
    setMessage("Kunci penilaian sudah disimpan.");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function updateFiles() {
    const input = $("fileInput");
    state.files = Array.from(input.files || []).slice(0,10);
    $("fileNames").textContent = state.files.length
      ? state.files.map(f => f.name).join(", ")
      : "Belum ada file dipilih";
    setMessage(state.files.length ? `${state.files.length} lembar siap dinilai.` : "Belum ada lembar diproses.");
  }

  function clearAll() {
    $("fileInput").value = "";
    state.files = [];
    state.results = [];
    $("fileNames").textContent = "Belum ada file dipilih";
    $("results").innerHTML = "Belum ada hasil.";
    $("count").textContent = "0";
    $("total").textContent = "0";
    $("average").textContent = "0.0";
    $("progressWrap").classList.add("hidden");
    setMessage("Belum ada lembar diproses.");
    $("systemStatus").textContent = "Siap";
  }

  async function loadOCR() {
    if (state.ocr) return state.ocr;
    if (state.loadingModel) return state.loadingModelPromise;

    state.loadingModel = true;
    $("systemStatus").textContent = "Memuat OCR…";
    setMessage("Memuat mesin pembaca tulisan tangan. Pertama kali bisa cukup lama karena model perlu diunduh dan disimpan di cache.");

    state.loadingModelPromise = (async () => {
      // Dynamic import is intentional: the page itself remains functional even
      // if the OCR CDN/model cannot be loaded.
      const mod = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm");
      const { pipeline, env } = mod;
      env.useBrowserCache = true;
      if (env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);

      let lastError;
      for (const device of (navigator.gpu ? ["webgpu","wasm"] : ["wasm"])) {
        try {
          setMessage(`Menyiapkan OCR (${device}). Mohon tunggu…`);
          const options = { dtype: "q8", device };
          const pipe = await pipeline("image-to-text", "Xenova/trocr-small-handwritten", options);
          state.ocr = pipe;
          state.loadingModel = false;
          $("systemStatus").textContent = "OCR siap";
          return pipe;
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError || new Error("OCR gagal dimuat.");
    })().catch(err => {
      state.loadingModel = false;
      $("systemStatus").textContent = "OCR gagal";
      throw err;
    });

    return state.loadingModelPromise;
  }

  function loadImage(file) {
    return new Promise((resolve,reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Foto tidak dapat dibaca.")); };
      img.src = url;
    });
  }

  function makeLineCanvases(img) {
    const maxW = 1500;
    const scale = Math.min(1, maxW / img.naturalWidth);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", {willReadFrequently:true});
    ctx.drawImage(img,0,0,w,h);

    // Crop a small margin and divide the sheet into horizontal bands.
    // TrOCR is a line-level handwriting model, so each band is sent separately.
    const bandCount = 18;
    const marginX = Math.round(w * .06);
    const usableW = w - marginX * 2;
    const bands = [];

    for (let i=0;i<bandCount;i++) {
      const y0 = Math.floor(h * (i / bandCount));
      const y1 = Math.floor(h * ((i+1) / bandCount));
      if (y1-y0 < 20) continue;
      const out = document.createElement("canvas");
      out.width = Math.min(1400, usableW);
      out.height = Math.min(220, y1-y0);
      const octx = out.getContext("2d");
      octx.fillStyle = "#fff";
      octx.fillRect(0,0,out.width,out.height);
      octx.drawImage(canvas, marginX,y0,usableW,y1-y0,0,0,out.width,out.height);
      bands.push(out);
    }
    return bands;
  }

  async function ocrCanvas(pipe, canvas) {
    const dataUrl = canvas.toDataURL("image/jpeg", .92);
    const out = await pipe(dataUrl, {max_new_tokens: 64, num_beams: 2});
    if (Array.isArray(out)) return (out[0]?.generated_text || "").trim();
    return String(out?.generated_text || "").trim();
  }

  function cleanText(s) {
    return s.replace(/\s+/g," ").replace(/[|]/g," ").trim();
  }

  function buildAnswers(lines) {
    const useful = lines.filter(x => x && x.length > 1);
    const buckets = [[],[],[],[],[]];

    // Detect explicit question numbers first.
    let current = -1;
    for (const line of useful) {
      const m = line.match(/(?:^|\s)([1-5])[\.\):\-]\s*/);
      if (m) current = Number(m[1])-1;
      if (current >= 0) buckets[current].push(line);
    }

    const detected = buckets.some(b => b.length);
    if (!detected) {
      const per = Math.max(1, Math.ceil(useful.length / 5));
      for (let i=0;i<useful.length;i++) buckets[Math.min(4,Math.floor(i/per))].push(useful[i]);
    } else {
      // Lines before Q1 or gaps are assigned to the nearest active bucket.
      let last = 0;
      for (const line of useful) {
        const m = line.match(/(?:^|\s)([1-5])[\.\):\-]\s*/);
        if (m) last = Number(m[1])-1;
        if (!m) buckets[last].push(line);
      }
    }
    return buckets.map(b => b.join(" "));
  }

  function guessName(lines, fileName) {
    for (const line of lines) {
      const m = line.match(/nama\s*[:\-]?\s*(.+)/i);
      if (m && m[1].trim().length >= 3) return m[1].trim();
    }
    const candidate = lines.find(x => x.length >= 5 && x.length <= 45 && !/^(seni|rupa|budaya|kelas|soal|jawaban)\b/i.test(x));
    return candidate || fileName.replace(/\.[^.]+$/,"");
  }

  function scoreAnswer(text, keywords, max) {
    const t = text.toLowerCase();
    if (!t) return 0;
    const hits = keywords.filter(k => t.includes(k));
    // Full match of the supplied key terms reaches max.
    return Math.min(max, Math.round((hits.length / Math.max(1, keywords.length)) * max));
  }

  async function processFile(pipe, file, index, total) {
    setProgress(index, total, `Membaca ${index+1} dari ${total}: ${file.name}`);
    const img = await loadImage(file);
    const bands = makeLineCanvases(img);
    const lines = [];

    // Limit OCR bands to avoid unnecessary model calls on a blank sheet.
    for (let i=0;i<bands.length;i++) {
      try {
        const text = cleanText(await ocrCanvas(pipe,bands[i]));
        if (text) lines.push(text);
      } catch (_) {
        // One bad band must not abort the entire sheet.
      }
      setProgress(index + (i+1)/bands.length, total, `Membaca ${file.name} • baris ${i+1}/${bands.length}`);
    }

    const answers = buildAnswers(lines);
    const rubric = getRubric();
    const max = Number($("maxPerQuestion").value) || 20;
    const scores = answers.map((a,i)=>scoreAnswer(a,rubric[i],max));
    const totalScore = scores.reduce((a,b)=>a+b,0);

    return {
      name: guessName(lines,file.name),
      file: file.name,
      status: "Sudah dinilai",
      score: totalScore,
      scores,
      answers,
      raw: lines.join("\n")
    };
  }

  function renderResults() {
    $("count").textContent = state.results.length;
    const total = state.results.reduce((a,r)=>a+r.score,0);
    $("total").textContent = total;
    $("average").textContent = state.results.length ? (total/state.results.length).toFixed(1) : "0.0";

    if (!state.results.length) {
      $("results").innerHTML = "Belum ada hasil.";
      return;
    }

    $("results").innerHTML = state.results.map(r => `
      <article class="result">
        <div class="result-top">
          <div>
            <div class="name">${escapeHtml(r.name)}</div>
            <div class="badge">${escapeHtml(r.status)}</div>
          </div>
          <div class="score">${r.score}/100</div>
        </div>
        <div class="qgrid">
          ${r.scores.map((s,i)=>`
            <div class="q">
              <b>Q${i+1}: ${s}</b>
              <div class="answer">${escapeHtml(r.answers[i] || "Tidak terbaca")}</div>
            </div>`).join("")}
        </div>
      </article>`).join("");
  }

  async function start() {
    if (!state.files.length) {
      setMessage("Silakan pilih minimal 1 foto terlebih dahulu.");
      return;
    }

    $("startBtn").disabled = true;
    $("clearBtn").disabled = true;
    $("progressWrap").classList.remove("hidden");

    try {
      const pipe = await loadOCR();
      state.results = [];

      for (let i=0;i<state.files.length;i++) {
        try {
          state.results.push(await processFile(pipe,state.files[i],i,state.files.length));
        } catch (err) {
          state.results.push({
            name: state.files[i].name.replace(/\.[^.]+$/,""),
            file: state.files[i].name,
            status: "Pembacaan gagal",
            score: 0,
            scores: [0,0,0,0,0],
            answers: ["Foto tidak berhasil dibaca oleh OCR.","","","",""],
            raw: ""
          });
        }
        renderResults();
      }

      setProgress(state.files.length,state.files.length,"Selesai");
      setMessage(`${state.results.length} lembar selesai diproses.`);
      $("systemStatus").textContent = "Selesai";
    } catch (err) {
      console.error(err);
      const detail = err?.message ? ` ${err.message}` : "";
      setMessage("OCR tidak dapat dimuat." + detail + " Coba muat ulang halaman dan tekan Mulai Penilaian lagi.");
      $("systemStatus").textContent = "OCR gagal";
    } finally {
      $("startBtn").disabled = false;
      $("clearBtn").disabled = false;
    }
  }

  function exportCSV() {
    if (!state.results.length) return;
    const rows = [["Nama","File","Status","Q1","Q2","Q3","Q4","Q5","Total"]];
    for (const r of state.results) rows.push([r.name,r.file,r.status,...r.scores,r.score]);
    const csv = rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download="hasil-penilaian.csv"; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  $("fileInput").addEventListener("change",updateFiles);
  $("startBtn").addEventListener("click",start);
  $("clearBtn").addEventListener("click",clearAll);
  $("csvBtn").addEventListener("click",exportCSV);
  $("saveRubric").addEventListener("click",saveRubric);
  renderRubric();
})();
