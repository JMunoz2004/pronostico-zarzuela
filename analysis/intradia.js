// Prueba del "efecto del día". Uso: node analysis/intradia.js (después de node train.js)
const {GEN}=require("../src/generated.js"), M=require("../src/model.js");
const D={VISITORS:GEN.CARTA.visitantes||{}};
const J=GEN.JORNADAS, train=GEN.TRAIN, rows=GEN.TRAINED.rows;
const PTS=[1,.5,.3,.15,.08];
// Construye, para cada carrera, las desviaciones "del día" de jinete, preparador y sesgo de cajón usando sólo carreras anteriores de esa jornada
const items=[];
for(let i=1;i<J.length;i++){ const {W:w,T}=rows[i-1]; const day=train.filter(r=>r.d===J[i]).sort((a,b)=>a.r-b.r);
  const st=M.buildStats(train.filter(x=>J.indexOf(x.d)<i));
  day.forEach((r,k)=>{ const prev=day.slice(0,k);
    const jk={},tr={}; let biasN=0,biasS=0;
    for(const pr of prev){ const n=pr.h.length;
      for(const h of pr.h){ const pos=pr.arr.indexOf(h.no); const v=pos>=0?PTS[pos]:0, e=1.98/n;
        for(const [Mp,key] of [[jk,h.j],[tr,h.t]]){ if(key==="AMATEUR") continue; Mp[key]=Mp[key]||{d:0,n:0}; Mp[key].d+=v-e; Mp[key].n++; } }
      if(pr.dist<=2000 && n>3){ for(const no of pr.arr.slice(0,3)){ const h=pr.h.find(x=>x.no===no); biasS+=(1-(h.draw-1)/(n-1))-.5; biasN++; } } }
    const race={dist:r.dist,cat:r.cat,horses:r.h.map(h=>({...h,runs:M.autoRuns(h.name,train,i,J)}))};
    const res=M.scoreRace(race,st,w,1,D.VISITORS,null,T);
    const N=r.h.length;
    items.push({arr:r.arr,res:res.map(o=>({no:o.h.no,score:o.score,j:(jk[o.h.j]||{d:0}).d,t:(tr[o.h.t]||{d:0}).d,
      dr:(N>1?(1-(o.h.draw-1)/(N-1))-.5:0)*(biasN?biasS/biasN:0)*(r.dist<=2000?1:0)})),T,k});
  }); }
function loss(bj,bt,bd){ let ll=0,n=0; for(const it of items){ const s=it.res.map(o=>it.T*o.score+bj*o.j+bt*o.t+bd*o.dr); const mx=Math.max(...s); const e=s.map(x=>Math.exp(x-mx)); const Z=e.reduce((a,b)=>a+b,0);
  const wi=it.res.findIndex(o=>o.no===it.arr[0]); ll-=Math.log(e[wi]/Z); n++; } return ll/n; }
console.log("races",items.length,"base",loss(0,0,0).toFixed(4));
for(const b of [0.5,1,2,3,5]) console.log("jinete",b,loss(b,0,0).toFixed(4),"prep",loss(0,b,0).toFixed(4),"cajon",loss(0,0,b).toFixed(4));
// bootstrap-ish: por jornada, signo de la mejora con jinete b=2
for(let i=1;i<J.length;i++){}
for(const b of [-1,-0.5,-0.2,-0.1,0.1,0.2]) console.log("b",b,"jinete",loss(b,0,0).toFixed(4),"prep",loss(0,b,0).toFixed(4),"cajon",loss(0,0,b*5).toFixed(4));
// fuera de muestra: elegir b con las jornadas anteriores y probar en la siguiente
