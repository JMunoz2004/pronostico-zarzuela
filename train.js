// Lee los datos de datos/, entrena los pesos jornada a jornada (walk-forward) y escribe src/generated.js
// Uso: node train.js   (después: python3 build.py)
const fs=require("fs"), path=require("path");
const M=require("./src/model.js");
const CARTA=JSON.parse(fs.readFileSync("datos/carta.json","utf8"));
M.setRefDate(CARTA.fecha);
const FILES=fs.readdirSync("datos/jornadas").filter(f=>/^\d{4}-\d\d-\d\d\.txt$/.test(f)&&f.slice(0,10)<CARTA.fecha).sort();
const parseJornada=txt=>{ const races=[]; let cur=null;
  for(const raw of txt.split("\n")){ const line=raw.trim(); if(!line||line.startsWith("#")) continue;
    if(line.startsWith("@")){ const [d,r,dist,cat,am,arr]=line.slice(1).split("|");
      cur={d,r:+r,dist:+dist,cat,am:am==="am",arr:(arr||"").split(",").filter(Boolean).map(Number),h:[]}; races.push(cur); continue; }
    const [no,name,kg,draw,j,t,form]=line.split("|");
    cur.h.push({no:+no,name:name.trim(),kg:+kg,draw:+draw,j:j.trim(),t:t.trim(),form:form?form.split(",").map(x=>x.trim()).filter(Boolean):[]}); }
  return races; };
const train=FILES.flatMap(f=>parseJornada(fs.readFileSync(path.join("datos/jornadas",f),"utf8")));
const J=FILES.map(f=>f.slice(8,10)+"/"+f.slice(5,7));
for(const d of new Set(train.map(r=>r.d))) if(!J.includes(d)) throw new Error(`la fecha @${d} no coincide con el nombre de su archivo`);
const J0=(CARTA.jornada||J.length+1)-J.length;  // nº de la primera jornada de entrenamiento
const DREF=CARTA.fecha.slice(8,10)+"/"+CARTA.fecha.slice(5,7);
const csv=fs.readFileSync("datos/otras-carreras.csv","utf8").split("\n").filter(l=>l.trim()&&!l.startsWith("#"));
const cols=csv.shift().split(";").map(s=>s.trim());
const RUNS_EXTRA=csv.map(l=>{ const v=l.split(";"), o={}; cols.forEach((c,i)=>{ const x=(v[i]??"").trim(); if(x==="") return;
  o[c]=["r","dist","of","g","kg"].includes(c)?+x:c==="pos"&&/^\d+$/.test(x)?+x:x; }); return o; });
const D={VISITORS:CARTA.visitantes||{}};

// Comprobaciones de integridad
for(const r of train){ const nos=r.h.map(h=>h.no);
  for(const a of r.arr) if(!nos.includes(a)) throw new Error(`llegada ${a} no existe en ${r.d} ${r.r}ª`);
  if(new Set(nos).size!==nos.length) throw new Error(`nº repetido ${r.d} ${r.r}ª`);
  for(const h of r.h) if(!h.name||!h.j||!h.t||!(h.kg>40)) throw new Error(`dato incompleto ${r.d} ${r.r}ª nº${h.no}`); }
console.log("carreras:",train.length,"caballos:",train.reduce((a,r)=>a+r.h.length,0));

const prep=M.prepareTrain(train,J,D.VISITORS);
const rows=[];
// Pesos para cada jornada desde la segunda hasta la de la carta, entrenados con todas las anteriores
for(let i=1;i<=J.length;i++){
  const d=i<J.length?J[i]:DREF;
  const fit=M.fitWeights(prep.filter(r=>r.idx<i));
  const row={d,jornada:i+J0,trainedOn:J.slice(0,i).join(", "),nTrain:prep.filter(r=>r.idx<i).length,W:fit.W,T:fit.T};
  if(i<J.length){ const test=prep.filter(r=>r.idx===i);
    row.test=M.evalRaces(test,fit.W,fit.T); row.testDef=M.evalRaces(test,M.DEF_W,M.DEF_T); }
  rows.push(row);
  console.log(d,JSON.stringify(fit), row.test?`test ll ${row.test.ll.toFixed(3)} def ${row.testDef.ll.toFixed(3)} unif ${row.test.llU.toFixed(3)} hit ${row.test.hit.toFixed(2)}/${row.testDef.hit.toFixed(2)}`:"");
}
// Resumen fuera de muestra
const agg=(k)=>{ let n=0,ll=0,llU=0,hit=0,t3=0; for(const r of rows.filter(r=>r[k])){ const t=r[k]; n+=t.n; ll+=t.ll*t.n; llU+=t.llU*t.n; hit+=t.hit*t.n; t3+=t.t3*t.n; } return {n,ll:ll/n,llU:llU/n,hit:hit/n,t3:t3/n}; };
const summary={trained:agg("test"),def:agg("testDef")};
console.log("RESUMEN",JSON.stringify(summary));

// Gemelas y tríos: Harville vs simulación, fuera de muestra con los pesos entrenados de cada jornada
let g={h2:0,s2:0,h3:0,s3:0,n:0};
for(let i=1;i<J.length;i++){ const {W,T}=rows[i-1];
  for(const r of train.filter(x=>x.d===J[i])){ if(r.arr.length<3) continue;
    const prevRaces=train.filter(x=>J.indexOf(x.d)<i); const st=M.buildStats(prevRaces);
    const race={dist:r.dist,cat:r.cat,horses:r.h.map(h=>({...h,runs:M.autoRuns(h.name,train,i,J)}))};
    const res=M.scoreRace(race,st,W,1,D.VISITORS,null,T); const p=res.map(o=>o.p); const pos=no=>res.findIndex(o=>o.h.no===no);
    const s2=[pos(r.arr[0]),pos(r.arr[1])], s3=[...s2,pos(r.arr[2])];
    const sim=M.simulate(res,null,6000,r.r*31+i);
    const key=a=>a.map(x=>res[x].h.no).sort((x,y)=>x-y).join(",");
    const find=(L,a)=>{const k=key(a); const e=L.find(x=>x.h.map(h=>h.no).sort((x,y)=>x-y).join(",")===k); return e?e.p:1/6000;};
    g.h2-=Math.log(M.harvilleUnordered(p,s2)); g.s2-=Math.log(find(sim.gem,s2));
    g.h3-=Math.log(M.harvilleUnordered(p,s3)); g.s3-=Math.log(find(sim.tri,s3)); g.n++; } }
for(const k of ["h2","s2","h3","s3"]) g[k]/=g.n;
console.log("GEMELAS/TRIOS (log-pérdida media, menos es mejor):",JSON.stringify(g));

const final=rows[rows.length-1];
const out={CARTA,TRAIN:train,JORNADAS:J,J0,RUNS_EXTRA,TRAINED:{rows,summary,combo:g,final:{W:final.W,T:final.T}}};
fs.writeFileSync("src/generated.js",`// Generado por train.js a partir de datos/ — no editar a mano.
const GEN = ${JSON.stringify(out)};
if (typeof module!=="undefined") module.exports={GEN};
`);
console.log("src/generated.js escrito:",FILES.length,"jornadas,",train.length,"carreras; carta del",CARTA.fecha);
