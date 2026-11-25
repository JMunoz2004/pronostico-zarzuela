// Entrena los pesos jornada a jornada (walk-forward) y escribe src/weights.js
// Uso: node train.js
const fs=require("fs");
const D=require("./src/data.js"), M=require("./src/model.js"), B=require("./src/backtest-data.js"), TD=require("./src/train-data.js");
const J=TD.JORNADAS, train=TD.buildTrain(B.BT,D.STATS_RACES);

// Comprobaciones de integridad
for(const r of train){ const nos=r.h.map(h=>h.no);
  for(const a of r.arr) if(!nos.includes(a)) throw new Error(`llegada ${a} no existe en ${r.d} ${r.r}ª`);
  if(new Set(nos).size!==nos.length) throw new Error(`nº repetido ${r.d} ${r.r}ª`);
  for(const h of r.h) if(!h.name||!h.j||!h.t||!(h.kg>40)) throw new Error(`dato incompleto ${r.d} ${r.r}ª nº${h.no}`); }
console.log("carreras:",train.length,"caballos:",train.reduce((a,r)=>a+r.h.length,0));

const prep=M.prepareTrain(train,J,D.VISITORS);
const rows=[];
// Pesos para cada jornada desde la 7ª (18/10) hasta la 13ª (29/11), entrenados con las jornadas anteriores desde la 6ª (11/10)
for(let i=1;i<=J.length;i++){
  const d=i<J.length?J[i]:"29/11";
  const fit=M.fitWeights(prep.filter(r=>r.idx<i));
  const row={d,jornada:i+6,trainedOn:J.slice(0,i).join(", "),nTrain:prep.filter(r=>r.idx<i).length,W:fit.W,T:fit.T};
  if(i<J.length){ const test=prep.filter(r=>r.idx===i);
    row.test=M.evalRaces(test,fit.W,fit.T); row.testDef=M.evalRaces(test,M.DEF_W,M.DEF_T); }
  rows.push(row);
  console.log(d,JSON.stringify(fit), row.test?`test ll ${row.test.ll.toFixed(3)} def ${row.testDef.ll.toFixed(3)} unif ${row.test.llU.toFixed(3)} hit ${row.test.hit.toFixed(2)}/${row.testDef.hit.toFixed(2)}`:"");
}
// Resumen fuera de muestra (18/10 → 22/11)
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
fs.writeFileSync("src/weights.js",`// Generado por train.js — pesos entrenados jornada a jornada (walk-forward) con el otoño 2026 desde la 6ª jornada.
const TRAINED = ${JSON.stringify({rows,summary,combo:g,final:{W:final.W,T:final.T}},null,1)};
if (typeof module!=="undefined") module.exports={TRAINED};
`);
// Carreras de entrenamiento en formato compacto para la web (estadística y carreras previas)
fs.writeFileSync("src/train-built.js",`// Generado por train.js
const TRAIN = ${JSON.stringify(train)};
if (typeof module!=="undefined") module.exports={TRAIN};
`);
