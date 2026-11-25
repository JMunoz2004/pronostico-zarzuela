// Para cada caballo del 29/11: forma del programa vs. carreras con fecha conocidas (Madrid desde 20/09 + manuales)
const D=require("../src/data.js"),M=require("../src/model.js"),TB=require("../src/train-built.js"),S=require("../src/sept-runs.js");
const J=["11/10","18/10","25/10","01/11","08/11","15/11","22/11"];
const iso=d=>{const [dd,mm]=d.split("/");return `2026-${mm}-${dd}`;};
const formAt=(name,d)=>{ // forma con la que salió en esa carrera y su puesto real según la forma del programa siguiente
};
for(const r of D.RACES) for(const h of r.horses){ if(!h.form.length) continue;
  const key=M.normName(h.name); const runs=[];
  for(const t of TB.TRAIN){ const x=t.h.find(y=>M.normName(y.name)===key); if(!x) continue; const i=t.arr.indexOf(x.no);
    runs.push({date:iso(t.d),src:"HZ",dist:t.dist,pos:i>=0?i+1:"6+",of:t.h.length,form:x.form.join("-")}); }
  for(const s of S.SEPT_RUNS) if(s.name===key) runs.push({date:s.date,src:"HZ",dist:s.dist,pos:s.pos,of:s.of});
  for(const m of (h.runs||[])) if(!/HZ|Zarzuela|Hándicap|Premio|GP |Gran Premio/.test("")) runs.push({date:m.d,src:"man:"+m.txt.slice(0,28),dist:m.dist,pos:m.pos});
  runs.sort((a,b)=>a.date<b.date?1:-1);
  console.log(`${r.n}·${h.no} ${h.name} | forma ${h.form.join("-")}\n   `+runs.map(x=>`${x.date} ${x.src} ${x.dist} ${x.pos}${x.of?"/"+x.of:""}`).join("\n    "));
}
