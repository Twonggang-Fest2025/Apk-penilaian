const DATA = {
  X: [
    ["pengertian seni", ["ekspresi","ungkapan","perasaan","pikiran","gagasan","karya manusia","keindahan"]],
    ["prinsip seni rupa", ["kesatuan","keseimbangan","irama","penekanan","proporsi","harmoni","komposisi"]],
    ["unsur seni rupa", ["titik","garis","bidang","bentuk","ruang","tekstur","warna"]],
    ["jenis warna", ["primer","sekunder","tersier","netral","merah","kuning","biru","hijau","ungu"]],
    ["seni murni terapan", ["murni","terapan","estetika","fungsi","lukisan","patung","batik","keramik"]]
  ],
  XI: [
    ["pengertian seni dan ekspresi", ["seni","ekspresi","perasaan","gagasan","pengalaman","gerak","tari"]],
    ["tenaga ruang waktu", ["tenaga","ruang","waktu","tempo","ritme","level","arah","pola lantai"]],
    ["wiraga wirasa wirama", ["wiraga","wirasa","wirama","gerak","perasaan","irama","tempo"]],
    ["imitatif imajinatif", ["imitatif","meniru","hewan","imajinatif","imajinasi","khayal","gerakan"]],
    ["komposisi tari", ["tema","gagasan","gerak","ruang","tenaga","waktu","pola lantai","iringan","evaluasi"]]
  ],
  XII: [
    ["jenis musik", ["klasik","tradisional","modern","kontemporer"]],
    ["unsur musik", ["melodi","ritme","harmoni","tempo","dinamika","timbre","bentuk","ekspresi"]],
    ["fungsi instrumen", ["melodis","harmonis","ritmis","melodi","harmoni","irama"]],
    ["cara memainkan", ["dipukul","ditiup","dipetik","digesek","ditekan","digetarkan"]],
    ["sumber bunyi", ["idiophone","membranophone","chordophone","aerophone","electrophone","senar","membran"]]
  ]
};

const filesEl=document.getElementById("files"), list=document.getElementById("fileList");
filesEl.addEventListener("change",()=>{list.innerHTML=""; [...filesEl.files].forEach((f,i)=>{let d=document.createElement("div");d.className="file-item";d.textContent=`${i+1}. ${f.name}`;list.appendChild(d)})});

let allResults=[];
function norm(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s]/g," ")}
function scoreText(text, keys, max){
  const t=norm(text);
  let hits=0;
  keys.forEach(k=>{if(t.includes(norm(k)))hits++});
  const ratio=Math.min(1,hits/Math.max(3,Math.ceil(keys.length*.45)));
  return Math.round(ratio*max);
}
function extractAnswers(text){
  // Best-effort split for handwritten/typed sheets. If numbering is not detected,
  // distribute text into five chunks so the teacher can review.
  const clean=text.replace(/\r/g,"");
  const parts=clean.split(/(?:^|\n)\s*(?:soal\s*)?([1-5])\s*[\.\):\-]/i);
  if(parts.length>=11){
    const a=["","","","",""];
    for(let i=1;i<parts.length;i+=2){let n=parseInt(parts[i])-1;if(n>=0&&n<5)a[n]=parts[i+1]||""}
    return a;
  }
  const lines=clean.split("\n").filter(x=>x.trim());
  const out=["","","","",""];
  const chunk=Math.max(1,Math.ceil(lines.length/5));
  for(let i=0;i<5;i++)out[i]=lines.slice(i*chunk,(i+1)*chunk).join(" ");
  return out;
}
async function ocr(file){
  const {data}=await Tesseract.recognize(file,"ind",{logger:m=>{
    if(m.status==="recognizing text") document.getElementById("status").textContent=`OCR ${Math.round((m.progress||0)*100)}%`;
  }});
  return data.text||"";
}
function addLog(s){const l=document.getElementById("log");l.textContent+=s+"\n";l.scrollTop=l.scrollHeight}
function render(){
 const body=document.getElementById("results");body.innerHTML="";
 allResults.forEach((r,i)=>{let tr=document.createElement("tr");tr.innerHTML=`<td>${i+1}</td><td>${r.file}</td>${r.scores.map(x=>`<td>${x}</td>`).join("")}<td><b>${r.total}</b></td><td class="${r.status==="OK"?"ok":"check"}">${r.status}</td>`;body.appendChild(tr)})
}
document.getElementById("start").onclick=async()=>{
 const files=[...filesEl.files]; if(!files.length){alert("Pilih foto lembar jawaban dulu.");return}
 const kelas=document.getElementById("kelas").value, max=Number(document.getElementById("bobot").value), rubric=DATA[kelas];
 allResults=[]; document.getElementById("bar").style.width="0%"; document.getElementById("log").textContent="";
 for(let i=0;i<files.length;i++){
   document.getElementById("status").textContent=`Memproses ${i+1}/${files.length}: ${files[i].name}`;
   addLog(`\n[${i+1}/${files.length}] ${files[i].name}`);
   try{
     const text=await ocr(files[i]);
     const answers=extractAnswers(text);
     const scores=answers.map((a,j)=>scoreText(a,rubric[j][1],max));
     const total=scores.reduce((a,b)=>a+b,0);
     const uncertain=scores.filter(s=>s<max*.55).length;
     allResults.push({file:files[i].name,scores,total,status:uncertain>=2?"PERIKSA":"OK"});
     addLog(`Skor: ${scores.join(" | ")} = ${total} | ${uncertain>=2?"PERIKSA":"OK"}`);
   }catch(e){allResults.push({file:files[i].name,scores:[0,0,0,0,0],total:0,status:"PERIKSA"});addLog("Gagal OCR: "+e.message)}
   document.getElementById("bar").style.width=`${Math.round((i+1)/files.length*100)}%`;
   render();
 }
 document.getElementById("status").textContent=`Selesai: ${files.length} lembar`;
};
document.getElementById("clear").onclick=()=>{allResults=[];render();document.getElementById("log").textContent="";document.getElementById("status").textContent="Menunggu foto...";document.getElementById("bar").style.width="0%"};
document.getElementById("csv").onclick=()=>{
 if(!allResults.length){alert("Belum ada hasil.");return}
 let csv="No,File,Q1,Q2,Q3,Q4,Q5,Total,Status\n";
 allResults.forEach((r,i)=>csv+=`${i+1},"${r.file.replace(/"/g,'""')}",${r.scores.join(",")},${r.total},${r.status}\n`);
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="hasil_penilaian.csv";a.click();
};
