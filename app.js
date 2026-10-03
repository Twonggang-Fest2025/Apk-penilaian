*{box-sizing:border-box}
body{margin:0;background:#f3f6fb;color:#17213a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
.top{background:linear-gradient(110deg,#10234f,#4664b9);color:#fff;padding:22px 5%;display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;gap:14px;align-items:center}.logo{width:48px;height:48px;border-radius:14px;background:#fff;color:#24458f;display:grid;place-items:center;font-size:30px;font-weight:800}
.brand b{font-size:24px;display:block}.brand span{display:block;opacity:.85;margin-top:3px}.badge{padding:9px 14px;border-radius:999px;background:#fff;color:#26458d;font-weight:800;font-size:13px}.badge.soft{background:#edf2ff}
.wrap{max-width:1200px;margin:-12px auto 40px;padding:0 18px}.card{background:#fff;border:1px solid #dfe5f0;border-radius:22px;padding:24px;margin:18px 0;box-shadow:0 8px 28px rgba(31,51,92,.06)}
h1{margin:0 0 8px;font-size:30px}h2{margin:0;font-size:21px}.intro p{color:#65738f;line-height:1.55}
.sectionHead{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:15px}.settings{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.settings label{font-weight:700;display:grid;gap:7px}.settings input,.settings select,.rubric textarea{width:100%;border:1px solid #ccd6e7;border-radius:12px;padding:12px;font:inherit;background:#fff;color:#17213a}
.drop{border:2px dashed #b9caee;border-radius:18px;min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;background:#fbfcff}
.drop:hover{background:#f5f8ff}.drop input{display:none}.plus{font-size:44px;color:#4568c1;line-height:1}.drop strong{font-size:20px}.drop span:last-of-type{color:#71809d}
.fileList{margin-top:12px;display:grid;gap:7px}.fileItem{display:flex;justify-content:space-between;padding:9px 12px;border:1px solid #e0e6f0;border-radius:10px;font-size:14px}
.actions{display:flex;gap:10px;margin-top:15px}.actions button,.secondary,.primary{border:0;border-radius:11px;padding:12px 18px;font-weight:800;cursor:pointer}
.primary{background:#2e5dcc;color:#fff}.secondary{background:#edf1f8;color:#263652}.primary:disabled{opacity:.5;cursor:not-allowed}
.progress{height:8px;background:#e8edf6;border-radius:99px;overflow:hidden;margin-top:18px}.progress div{height:100%;width:0;background:#2e5dcc;transition:.2s}
.notice{background:#eef4ff;border-radius:12px;padding:12px;color:#31528e;margin-top:14px}.notice.ok{background:#eaf8f0;color:#197044}.notice.busy{background:#fff7df;color:#765400}
.muted{color:#71809d}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.summary div{border:1px solid #e0e6f0;border-radius:15px;padding:14px}.summary span,.summary b{display:block}.summary span{color:#71809d;font-size:14px}.summary b{font-size:25px;margin-top:5px}
.result{border:1px solid #dce4f0;border-radius:17px;margin:12px 0;overflow:hidden}.resultHead{padding:15px;background:#f8faff;display:flex;justify-content:space-between;gap:15px}
.student{font-size:19px;font-weight:800}.score{font-size:26px;font-weight:900}.status{font-size:13px;color:#167044;font-weight:800}
.questions{padding:0 15px}.qrow{display:grid;grid-template-columns:52px 1fr 65px;gap:12px;padding:14px 0;border-top:1px solid #edf0f5}
.qnum{font-weight:900;color:#294d99}.qscore{text-align:right;font-weight:900}.answer{color:#4d5d78;line-height:1.45;white-space:pre-wrap}.match{font-size:12px;color:#8390a7;margin-top:4px}
.empty{padding:30px;text-align:center;color:#8490a5}.rubric{display:grid;gap:12px}.rubric label{font-weight:800}.rubric textarea{margin-top:7px;min-height:70px;resize:vertical}
footer{text-align:center;color:#7b879c;padding:10px 20px 35px;font-size:13px}
@media(max-width:700px){.top{padding:17px}.brand b{font-size:20px}.brand span{font-size:12px}.wrap{padding:0 10px}.card{padding:17px;border-radius:17px}.settings,.summary{grid-template-columns:1fr}.sectionHead{align-items:flex-start}.qrow{grid-template-columns:40px 1fr 58px}.student{font-size:16px}.score{font-size:22px}.drop{min-height:155px}}
