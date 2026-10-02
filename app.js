const RUBRICS={
X:[
 ["Pengertian seni",["ekspresi","ungkapan","perasaan","gagasan","karya","manusia"]],
 ["Prinsip seni rupa 2 dimensi",["kesatuan","keseimbangan","proporsi","irama","penekanan","harmoni","kontras"]],
 ["7 unsur seni rupa",["titik","garis","bidang","bentuk","gelap","terang","tekstur","warna"]],
 ["4 jenis warna dan contoh",["primer","sekunder","tersier","netral","merah","kuning","biru","hijau","ungu","putih","hitam"]],
 ["Seni rupa murni dan terapan",["murni","terapan","fungsi","keindahan","lukisan","patung","batik","keramik","meja","kursi"]]
],
XI:[
 ["Pengertian seni dan ekspresi diri",["seni","ekspresi","perasaan","pemikiran","gagasan","emosi","media"]],
 ["Tenaga, ruang, waktu",["tenaga","ruang","waktu","gerak","tempo","level","arah","pola"]],
 ["Wiraga, wirasa, wirama",["wiraga","wirasa","wirama","gerak","perasaan","ekspresi","irama","tempo"]],
 ["Tari imajinatif dan imitatif",["imajinatif","imajinasi","khayal","imitatif","meniru","binatang","alam"]],
 ["Kerangka komposisi tari",["tema","gerak","ruang","tenaga","waktu","pola lantai","iringan","komposisi","evaluasi"]]
],
XII:[
 ["Klasik, tradisional, modern, kontemporer",["klasik","tradisional","modern","kontemporer"]],
 ["Unsur musik pada kasus",["tempo","ritme","melodi","harmoni","dinamika","timbre","pengulangan","pola","vokal","bass","drum"]],
 ["Fungsi melodis, harmonis, ritmis",["melodis","harmonis","ritmis","melodi","harmoni","ritme","irama"]],
 ["Instrumen berdasarkan cara penggunaan",["dipukul","ditiup","dipetik","digesek","ditekan","digetarkan","perkusi","tiup","petik","gesek"]],
 ["Instrumen berdasarkan sumber bunyi",["idiophone","membranophone","chordophone","aerophone","electrophone","senar","membran","udara","elektrik"]]
]};

const photo=document.getElementById("photo"), canvas=document.getElementById("warped"), answers=document.getElementById("answers");
let crops=[], data={};

function norm(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s]/g," ")}
function scoreText(t,keys,max){
 const n=norm(t), found=[...new Set(keys.filter(k=>n.includes(norm(k))))];
 const ratio=found.length/Math.max(1,Math.ceil(keys.length*.4));
 if(!t.trim()) return {score:0,status:"PERIKSA",found};
 if(ratio<.7) return {score:Math.round(max*Math.min(.55,ratio*.65)),status:"PERIKSA",found};
 return {score:Math.min(max,Math.round(max*(.45+.55*Math.min(1,ratio)))),status:"PERIKSA",found};
}
function setMsg(x){document.getElementById("msg").textContent=x}

function showCrop(i,blob){
 const box=document.createElement("div");box.className="answer";
 box.innerHTML=`<h3>Soal ${i+1} — ${RUBRICS[document.getElementById("kelas").value][i][0]}</h3><div class="crop"><canvas id="c${i}"></canvas></div><div class="body"><div class="meta" id="m${i}">Membaca tulisan…</div><textarea id="t${i}" placeholder="Hasil bacaan akan muncul di sini. Anda boleh memperbaikinya."></textarea><div class="scoreline"><label>Nilai <input id="s${i}" type="number" min="0" value="0"></label><span id="st${i}" class="check">PERIKSA</span></div></div>`;
 answers.appendChild(box);
 const img=new Image();img.onload=async()=>{
   const c=document.getElementById(`c${i}`);c.width=img.width;c.height=img.height;c.getContext("2d").drawImage(img,0,0);
   try{
    const r=await Tesseract.recognize(blob,"ind");
    const txt=(r.data.text||"").trim();
    document.getElementById(`t${i}`).value=txt;
    const sc=scoreText(txt,RUBRICS[document.getElementById("kelas").value][i][1],+document.getElementById("max").value||20);
    document.getElementById(`s${i}`).value=sc.score;
    document.getElementById(`m${i}`).textContent=sc.found.length?`Indikator terbaca: ${sc.found.join(", ")}`:"Tulisan belum terbaca cukup baik.";
    document.getElementById(`st${i}`).textContent=sc.status;
    updateTotal();
   }catch(e){document.getElementById(`m${i}`).textContent="OCR gagal; tulis/perbaiki jawaban secara manual.";document.getElementById(`st${i}`).textContent="PERIKSA"}
   URL.revokeObjectURL(img.src);
 };
 img.src=URL.createObjectURL(blob);
}

function cropFromCanvas(){
 const w=canvas.width,h=canvas.height;
 // Berdasarkan template lembar yang Anda kirim: area jawaban dimulai sekitar 26% tinggi,
 // lalu dibagi menjadi lima zona yang saling berurutan. Zona sengaja diberi overlap agar tulisan
 // di garis batas tidak mudah terpotong.
 const top=Math.floor(h*.255), bottom=Math.floor(h*.93), usable=bottom-top, step=usable/5;
 let arr=[];
 for(let i=0;i<5;i++){
   const y=Math.max(0,Math.floor(top+i*step-step*.05));
   const y2=Math.min(h,Math.floor(top+(i+1)*step+step*.05));
   const c=document.createElement("canvas");c.width=w;c.height=y2-y;
   c.getContext("2d").drawImage(canvas,0,y,w,y2-y,0,0,w,y2-y);
   arr.push(c.toDataURL("image/jpeg",.9));
 }
 return arr;
}
function dataUrlToBlob(u){return fetch(u).then(r=>r.blob())}

function drawOriginal(file){
 const img=new Image();img.onload=()=>{canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext("2d").drawImage(img,0,0);processCrops();};img.src=URL.createObjectURL(file);
}
function processCrops(){
 answers.innerHTML="";crops=cropFromCanvas();
 crops.forEach((u,i)=>dataUrlToBlob(u).then(b=>showCrop(i,b)));
}
document.getElementById("process").onclick=()=>{
 const f=photo.files[0];if(!f){alert("Pilih 1 foto dulu.");return}
 setMsg("Memproses satu lembar…");
 drawOriginal(f);setMsg("Foto dimuat. Area jawaban sedang dipotong.");
 // V3 memakai template tetap sebagai baseline. Deteksi perspektif otomatis penuh akan ditambahkan setelah
 // satu foto terbukti stabil, karena foto dengan bayangan/latarnya bisa membuat deteksi sudut salah.
};

function updateTotal(){
 let total=0;for(let i=0;i<5;i++)total+=+(document.getElementById(`s${i}`)?.value||0);
 document.getElementById("total").textContent=`Total: ${total}`;
}
document.addEventListener("input",e=>{if(/^s[0-4]$/.test(e.target.id))updateTotal()});
document.getElementById("csv").onclick=()=>{
 const cls=document.getElementById("kelas").value,total=[0,1,2,3,4].reduce((a,i)=>a+(+document.getElementById(`s${i}`)?.value||0),0);
 let row=[document.getElementById("name").value,document.getElementById("class2").value,document.getElementById("number").value];
 for(let i=0;i<5;i++)row.push(document.getElementById(`s${i}`)?.value||"");
 row.push(total);
 const csv="Nama,Kelas,Nomor,Q1,Q2,Q3,Q4,Q5,Total\n"+row.map(x=>`"${String(x).replaceAll('"','""')}"`).join(",");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`hasil-${cls}.csv`;a.click();
};
