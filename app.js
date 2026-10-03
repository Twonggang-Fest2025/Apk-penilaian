import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm";

const MODEL = "Xenova/trocr-small-handwritten";
const fileEl=document.querySelector("#file"), run=document.querySelector("#run");
const preview=document.querySelector("#preview"), bar=document.querySelector("#bar");
const status=document.querySelector("#status"), out=document.querySelector("#out");
let file=null, reader=null;

fileEl.onchange=()=>{
  file=fileEl.files?.[0]||null;
  if(!file)return;
  preview.src=URL.createObjectURL(file);
  preview.classList.remove("hidden");
  run.disabled=false;
  status.textContent="Foto siap. Tekan Mulai Membaca.";
  out.textContent="Belum ada hasil.";
};

function prog(n,t){bar.style.width=n+"%";status.textContent=t}

async function imageURL(f){
  const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=URL.createObjectURL(f)});
  const max=1800, s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
  const c=document.createElement("canvas"); c.width=Math.round(img.naturalWidth*s); c.height=Math.round(img.naturalHeight*s);
  const x=c.getContext("2d"); x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
  return c.toDataURL("image/jpeg",.94);
}

run.onclick=async()=>{
  if(!file)return;
  run.disabled=true; out.textContent="Menyiapkan OCR…";
  try{
    if(!reader){
      reader=await pipeline("image-to-text",MODEL,{
        device:navigator.gpu?"webgpu":"wasm",
        dtype:"q8",
        progress_callback:x=>{
          if(typeof x?.progress==="number")prog(Math.round(x.progress*.85),`Mengunduh model OCR… ${Math.round(x.progress)}%`);
        }
      });
    }
    prog(88,"Membaca foto…");
    const img=await imageURL(file);
    const result=await reader(img,{max_new_tokens:120});
    const text=result?.[0]?.generated_text||"Tidak ada teks.";
    out.textContent=text;
    prog(100,"Tes OCR selesai.");
  }catch(e){
    console.error(e);
    out.textContent="GAGAL:\n"+(e?.message||String(e));
    prog(0,"Tes gagal.");
  }finally{run.disabled=false}
};