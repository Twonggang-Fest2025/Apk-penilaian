const RUBRICS={
X:[
 {q:"Pengertian seni",keys:["ekspresi","ungkapan","perasaan","gagasan","audio","visual","sastra","karya manusia"],must:2},
 {q:"Prinsip seni rupa 2 dimensi",keys:["kesatuan","keseimbangan","proporsi","irama","penekanan","harmoni","kontras"],must:3},
 {q:"7 unsur seni rupa",keys:["titik","garis","bidang","bentuk","gelap terang","gelap","terang","tekstur","warna"],must:5},
 {q:"4 jenis warna dan contoh",keys:["primer","sekunder","tersier","netral","merah","kuning","biru","hijau","ungu","putih","hitam"],must:4},
 {q:"Seni rupa murni dan terapan",keys:["murni","terapan","fungsi","keindahan","estetika","lukisan","patung","meja","kursi","keramik","batik"],must:4}
],
XI:[
 {q:"Pengertian seni dan ekspresi diri",keys:["seni","ekspresi","perasaan","pemikiran","gagasan","emosi","media"],must:2},
 {q:"Tenaga, ruang, waktu",keys:["tenaga","ruang","waktu","gerak","tempo","level","arah","pola"],must:3},
 {q:"Wiraga, wirasa, wirama",keys:["wiraga","wirasa","wirama","gerak","perasaan","ekspresi","irama","tempo"],must:3},
 {q:"Tari imajinatif dan imitatif",keys:["imajinatif","imajinasi","khayal","tidak nyata","imitatif","meniru","binatang","alam"],must:2},
 {q:"Kerangka komposisi tari",keys:["tema","gerak","ruang","tenaga","waktu","pola lantai","iringan","komposisi","evaluasi"],must:3}
],
XII:[
 {q:"Klasik, tradisional, modern, kontemporer",keys:["klasik","tradisional","modern","kontemporer"],must:3},
 {q:"Seluruh unsur musik pada kasus",keys:["tempo","ritme","melodi","harmoni","dinamika","timbre","pengulangan","pola","vokal","bass","drum"],must:5},
 {q:"Fungsi melodis, harmonis, ritmis",keys:["melodis","harmonis","ritmis","melodi","harmoni","ritme","irama"],must:3},
 {q:"Instrumen berdasarkan cara penggunaan",keys:["dipukul","ditiup","dipetik","digesek","ditekan","digetarkan","perkusi","tiup","petik","gesek"],must:3},
 {q:"Instrumen berdasarkan sumber bunyi",keys:["idiophone","membranophone","chordophone","aerophone","electrophone","senar","membran","udara","elektrik"],must:3}
]};

const filesEl=document.getElementById("files"), selected=document.getElementById("selected");
filesEl.onchange=()=>{selected.innerHTML="";[...filesEl.files].forEach((f,i)=>{let d=document.createElement("div");d.className="file";d.textContent=`${i+1}. ${f.name}`;selected.appendChild(d)})};

const norm=s=>(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s]/g," ");
function wordsFound(text,keys){let t=norm(text);return [...new Set(keys.filter(k=>t.includes(norm(k))))]}
function extractIdentity(text){
 const n=text.match(/(?:nama)\s*[:.]?\s*([^\n]+)/i);
 const k=text.match(/(?:kelas)\s*[:.]?\s*([^\n]+)/i);
 const no=text.match(/(?:nomor ujian|no\.?\s*ujian)\s*[:.]?\s*([^\n]+)/i);
 return {name:n?n[1].trim():"Tidak terbaca",kelas:k?k[1].trim():"Tidak terbaca",nomor:no?no[1].trim():"Tidak terbaca"};
}
function splitAnswers(text){
 let p=text.replace(/\r/g,"").split(/(?:^|\n)\s*(?:soal\s*)?([1-5])\s*[\.\):\-]/i);
 if(p.length>=11){let a=["","","","",""];for(let i=1;i<p.length;i+=2){let n=+p[i]-1;if(n>=0&&n<5)a[n]=p[i+1]||""}return a}
 // Try lines beginning with "1.", "2.", etc.
 const lines=text.split("\n"), a=["","","","",""];let current=-1;
 for(const line of lines){let m=line.match(/^\s*([1-5])\s*[\.\):\-]/);if(m)current=+m[1]-1;else if(current>=0)a[current]+=" "+line}
 return a;
}
function scoreAnswer(answer,rubric,max){
 const found=wordsFound(answer,rubric.keys);
 if(!answer.trim()||found.length<rubric.must)return {score:Math.round(max*Math.min(.5,found.length/Math.max(1,rubric.must)*.5)),status:"PERIKSA",found};
 let coverage=Math.min(1,found.length/Math.max(rubric.must,Math.ceil(rubric.keys.length*.45)));
 let score=Math.round(max*(0.45+0.55*coverage));
 return {score:Math.min(max,score),status:found.length>=rubric.must+2?"OK":"PERIKSA",found};
}
function addLog(s){let l=document.getElementById("log");l.textContent+=s+"\n";l.scrollTop=l.scrollHeight}
function renderRubric(){
 let el=document.getElementById("rubric"), cls=document.getElementById("kelas").value;el.innerHTML="";
 RUBRICS[cls].forEach((r,i)=>{el.innerHTML+=`<details class="rubricbox"><summary>Soal ${i+1} — ${r.q}</summary><div class="body">Indikator: ${r.keys.join(", ")}.</div></details>`})
}
document.getElementById("kelas").onchange=renderRubric;renderRubric();

let results=[];
function render(){
 let tb=document.getElementById("tbody");tb.innerHTML="";
 results.forEach((r,i)=>{let tr=document.createElement("tr");tr.innerHTML=`<td>${i+1}</td><td>${r.name}</td><td>${r.kelas}</td><td>${r.nomor}</td>${r.scores.map(x=>`<td>${x}</td>`).join("")}<td><b>${r.total}</b></td><td class="${r.status==="OK"?"ok":"check"}">${r.status}</td>`;tb.appendChild(tr)})
}
async function ocr(file){
 const {data}=await Tesseract.recognize(file,"ind",{logger:m=>{
   if(m.status==="recognizing text")document.getElementById("status").textContent=`Membaca ${Math.round((m.progress||0)*100)}%`;
 }});
 return data.text||"";
}
document.getElementById("run").onclick=async()=>{
 const files=[...filesEl.files];if(!files.length){alert("Pilih foto terlebih dahulu.");return}
 const cls=document.getElementById("kelas").value,max=Number(document.getElementById("maxScore").value)||20;
 results=[];document.getElementById("log").textContent="";
 for(let i=0;i<files.length;i++){
   document.getElementById("status").textContent=`Memproses ${i+1}/${files.length}: ${files[i].name}`;
   addLog(`\n[${i+1}/${files.length}] ${files[i].name}`);
   try{
     const text=await ocr(files[i]), id=extractIdentity(text), ans=splitAnswers(text);
     const details=ans.map((a,j)=>scoreAnswer(a,RUBRICS[cls][j],max));
     const scores=details.map(d=>d.score), total=scores.reduce((a,b)=>a+b,0);
     const status=details.filter(d=>d.status==="PERIKSA").length>=2||id.name==="Tidak terbaca"?"PERIKSA":"OK";
     results.push({name:id.name,kelas:id.kelas==="Tidak terbaca"?cls:id.kelas,nomor:id.nomor,scores,total,status});
     addLog(`Siswa: ${id.name} | Skor: ${scores.join(" / ")} | Total: ${total} | ${status}`);
   }catch(e){results.push({name:"Tidak terbaca",kelas:cls,nomor:"",scores:[0,0,0,0,0],total:0,status:"PERIKSA"});addLog("OCR gagal: "+e.message)}
   document.getElementById("bar").style.width=`${Math.round((i+1)/files.length*100)}%`;render();
 }
 document.getElementById("status").textContent=`Selesai: ${files.length} foto`;
};
document.getElementById("clear").onclick=()=>{results=[];render();document.getElementById("log").textContent="";document.getElementById("bar").style.width="0%";document.getElementById("status").textContent="Menunggu foto…"};
document.getElementById("csv").onclick=()=>{
 if(!results.length){alert("Belum ada hasil.");return}
 let s="No,Siswa,Kelas,Nomor,Q1,Q2,Q3,Q4,Q5,Total,Status\n";
 results.forEach((r,i)=>s+=`${i+1},"${r.name.replace(/"/g,'""')}","${r.kelas}",${r.nomor},${r.scores.join(",")},${r.total},${r.status}\n`);
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([s],{type:"text/csv;charset=utf-8"}));a.download="hasil_penilaian_v2.csv";a.click();
};
