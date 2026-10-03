(() => {
"use strict";
const $=id=>document.getElementById(id);
const state={file:null,ocr:null,loading:false,result:null};

const defaults=[
"seni rupa, pengertian, karya seni, visual",
"kesatuan, keseimbangan, penekanan, harmoni, proporsi, irama, kontras",
"titik, garis, bidang, bentuk, ruang, tekstur, warna, gelap terang",
"primer, sekunder, tersier, netral, merah, kuning, biru, hijau, jingga, ungu",
"seni rupa murni, seni rupa terapan, fungsi, estetis, pakai, lukisan, patung, kriya, desain"
];

function msg(t){$("message").textContent=t}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderRubric(){
 const v=JSON.parse(localStorage.getItem("rubric-v5")||"null")||defaults;
 $("rubricGrid").innerHTML=v.map((x,i)=>`<div class="rubric"><label>Soal ${i+1}</label><textarea id="r${i}">${esc(x)}</textarea></div>`).join("");
}
function rubric(){
 return [0,1,2,3,4].map(i=>$("r"+i).value.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean))
}
function saveRubric(){localStorage.setItem("rubric-v5",JSON.stringify([0,1,2,3,4].map(i=>$("r"+i).value)));msg("Kunci penilaian sudah disimpan.")}
function setModel(stage,pct,detail){
 $("modelStage").textContent=stage;$("modelPct").textContent=(pct==null?"":Math.round(pct)+"%");
 $("modelBar").style.width=(pct==null?0:pct)+"%";$("modelDetail").textContent=detail||"";
}
function setProg(p,t){$("progressBar").style.width=p+"%";$("progressPercent").textContent=Math.round(p)+"%";$("progressText").textContent=t}
function setStatus(t){$("systemStatus").textContent=t}

$("fileInput").addEventListener("change",e=>{
 const files=Array.from(e.target.files||[]);
 state.file=files[0]||null;
 if(state.file){
   $("fileNames").textContent=state.file.name || "1 foto dipilih";
   msg("1 foto sudah masuk. Sekarang tekan Mulai Penilaian.");
 }else{
   $("fileNames").textContent="Belum ada file dipilih";
   msg("Belum ada lembar diproses.");
 }
});

async function getOCR(){
 if(state.ocr)return state.ocr;
 if(state.loading)return state.loadingPromise;
 state.loading=true;
 $("modelPanel").classList.remove("hidden");
 setStatus("Memuat OCR…");
 msg("Memuat mesin OCR. Ini hanya perlu pada pemakaian pertama di perangkat ini.");

 state.loadingPromise=(async()=>{
   const mod=await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm");
   const {pipeline,env}=mod;
   env.useBrowserCache=true;
   if(env.backends?.onnx?.wasm)env.backends.onnx.wasm.numThreads=2;

   let last;
   // Untuk iPad V5 kita utamakan WASM q8 yang lebih konsisten daripada
   // mencoba WebGPU terlebih dahulu.
   try{
     setModel("Mengunduh model OCR…",0,"Ukuran repositori model cukup besar. Jangan tutup halaman.");
     const pipe=await pipeline("image-to-text","Xenova/trocr-small-handwritten",{
       dtype:"q8",
       device:"wasm",
       progress_callback:(p)=>{
         if(p && typeof p.progress==="number"){
           const pct=Math.max(0,Math.min(100,p.progress));
           const file=p.file||"";
           setModel("Mengunduh model OCR…",pct,file?`${file} • ${Math.round(pct)}%`:"Model sedang disiapkan…");
         }else if(p && p.status==="ready"){
           setModel("Model OCR siap",100,"Mesin pembaca tulisan tangan sudah siap.");
         }
       }
     });
     state.ocr=pipe;
     setModel("Model OCR siap",100,"Sekarang foto akan dibaca.");
     setStatus("OCR siap");
     return pipe;
   }catch(e){last=e;throw last}
 })().catch(e=>{
   console.error(e);
   setStatus("OCR gagal");
   setModel("OCR gagal",0,(e&&e.message)?e.message:"Model tidak dapat dimuat.");
   throw e;
 }).finally(()=>{state.loading=false});
 return state.loadingPromise;
}

function loadImage(file){return new Promise((res,rej)=>{
 const im=new Image(),u=URL.createObjectURL(file);
 im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("Foto tidak dapat dibaca."))};im.src=u;
})}

function makeBands(im){
 const max=1300,s=Math.min(1,max/im.naturalWidth),w=Math.round(im.naturalWidth*s),h=Math.round(im.naturalHeight*s);
 const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(im,0,0,w,h);
 const bands=[],n=12,mx=Math.round(w*.05),uw=w-mx*2;
 for(let i=0;i<n;i++){
   const y=Math.floor(h*i/n),y2=Math.floor(h*(i+1)/n),o=document.createElement("canvas");
   o.width=Math.min(1300,uw);o.height=Math.min(260,y2-y);
   const x=o.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,o.width,o.height);x.drawImage(c,mx,y,uw,y2-y,0,0,o.width,o.height);bands.push(o)
 }
 return bands
}
async function readBand(pipe,c){
 const out=await pipe(c.toDataURL("image/jpeg",.9),{max_new_tokens:48,num_beams:2});
 return String(Array.isArray(out)?(out[0]?.generated_text||""):(out?.generated_text||"")).replace(/\s+/g," ").trim()
}
function answers(lines){
 const b=[[],[],[],[],[]],use=lines.filter(x=>x.length>1);let cur=0,found=false;
 for(const l of use){
   const m=l.match(/(?:^|\s)([1-5])[\.\):\-]\s*/);
   if(m){cur=+m[1]-1;found=true}
   b[cur].push(l)
 }
 if(!found){for(let i=0;i<use.length;i++)b[Math.min(4,Math.floor(i/Math.max(1,Math.ceil(use.length/5))))].push(use[i])}
 return b.map(x=>x.join(" "))
}
function name(lines,file){
 for(const l of lines){const m=l.match(/nama\s*[:\-]?\s*(.+)/i);if(m&&m[1].trim().length>2)return m[1].trim()}
 return file.replace(/\.[^.]+$/,"")
}
function score(t,k,max){if(!t)return 0;let hit=k.filter(x=>t.toLowerCase().includes(x)).length;return Math.min(max,Math.round(hit/Math.max(1,k.length)*max))}
function render(r){
 $("count").textContent="1";$("total").textContent=r.score;$("average").textContent=r.score.toFixed(1);
 $("results").innerHTML=`<article class="result"><div class="result-top"><div><div class="name">${esc(r.name)}</div><div class="badge">Sudah dinilai</div></div><div class="score">${r.score}/100</div></div><div class="qgrid">${r.scores.map((s,i)=>`<div class="q"><b>Q${i+1}: ${s}</b><div class="answer">${esc(r.answers[i]||"Tidak terbaca")}</div></div>`).join("")}</div></article>`
}
async function start(){
 if(!state.file){msg("Pilih 1 foto terlebih dahulu.");return}
 $("startBtn").disabled=true;$("clearBtn").disabled=true;$("progressWrap").classList.remove("hidden");
 try{
   const pipe=await getOCR();
   const im=await loadImage(state.file),bands=makeBands(im),lines=[];
   for(let i=0;i<bands.length;i++){msg(`Membaca tulisan tangan • bagian ${i+1}/${bands.length}`);setProg(i/bands.length*100,`Membaca foto • bagian ${i+1}/${bands.length}`);try{const t=await readBand(pipe,bands[i]);if(t)lines.push(t)}catch(e){}}
   const a=answers(lines),max=Number($("maxPerQuestion").value)||20,k=rubric(),scores=a.map((x,i)=>score(x,k[i],max)),total=scores.reduce((x,y)=>x+y,0);
   state.result={name:name(lines,state.file.name),score:total,scores,answers:a};
   render(state.result);setProg(100,"Selesai");msg("1 lembar sudah selesai dinilai.");setStatus("Selesai");
 }catch(e){msg("Penilaian belum dapat dimulai karena mesin OCR gagal dimuat. Lihat kotak OCR di atas untuk oopsinya.");}
 finally{$("startBtn").disabled=false;$("clearBtn").disabled=false}
}
function clearAll(){location.reload()}
function csv(){
 if(!state.result)return;
 const r=state.result,rows=[["Nama","Q1","Q2","Q3","Q4","Q5","Total"],[r.name,...r.scores,r.score]];
 const s=rows.map(x=>x.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n"),a=document.createElement("a");
 a.href=URL.createObjectURL(new Blob(["\ufeff"+s],{type:"text/csv"}));a.download="hasil-penilaian.csv";a.click()
}
$("startBtn").addEventListener("click",start);$("clearBtn").addEventListener("click",clearAll);$("csvBtn").addEventListener("click",csv);$("saveRubric").addEventListener("click",saveRubric);
renderRubric();
})();