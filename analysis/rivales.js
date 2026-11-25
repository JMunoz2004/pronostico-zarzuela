// ¿Tiene señal el factor rivales? Compara, carrera a carrera (sin mirar el futuro), el valor del factor del ganador y de los 3 primeros con la media del lote.
// Uso: node train.js && node analysis/rivales.js
const {GEN}=require("../src/generated.js"), M=require("../src/model.js");
M.setRefDate(GEN.CARTA.fecha); M.setGoing(GEN.GOING);
const J=GEN.JORNADAS, train=GEN.TRAIN, G=M.meetingGroups(train,GEN.RUNS_EXTRA,GEN.CARTA.carreras);
const prep=M.prepareTrain(train,J,GEN.CARTA.visitantes,G), q=M.FKEYS.indexOf("rivales");
for(const k of M.FKEYS){ const qi=M.FKEYS.indexOf(k); let n=0,dw=0,d3=0,inf=0,ll=0,llU=0;
  for(const r of prep){ if(r.idx<1) continue; const x=r.X.map(v=>v[qi]); if(x.every(v=>Math.abs(v-.5)<1e-9)) continue; inf++;
    const m=x.reduce((a,c)=>a+c,0)/x.length, wi=r.nos.indexOf(r.arr[0]); dw+=x[wi]-m;
    for(const a of r.arr.slice(0,3)){ const i=r.nos.indexOf(a); if(i>=0) d3+=(x[i]-m)/3; }
    // logit con solo este factor (escala fija 6)
    const e=x.map(v=>Math.exp(6*(v-.5))), Z=e.reduce((a,c)=>a+c,0); ll-=Math.log(e[wi]/Z); llU+=Math.log(x.length); n++; }
  console.log(k.padEnd(11),"carreras con info",String(inf).padStart(2),"| ganador vs media",(dw/n).toFixed(3),"| top3 vs media",(d3/n).toFixed(3),"| pérdida solo-factor",(ll/n).toFixed(3),"azar",(llU/n).toFixed(3)); }
