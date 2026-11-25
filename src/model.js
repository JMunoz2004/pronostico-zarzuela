// Modelo de pronóstico La Zarzuela.
// Cada factor se puntúa de 0 a 1 (0,5 = neutro), se combina con pesos y se convierte en probabilidad con softmax.
const FPTS = {1:1,2:.72,3:.55,4:.42,5:.33,6:.25,7:.18,8:.13,9:.1};
function posPts(p){ const s=String(p).trim(); if(/^(NP|P|C|Qdo|Ddo|Dto|Desc|TBE)$/i.test(s)) return .05; const n=parseInt(s,10); if(isNaN(n)) return .1; return FPTS[n] ?? .06; }
const CAT = {A:4,FR:3,B:3,C:2,D:1};
const TERR_NAMES = ["Bueno","Bueno a blando","Blando","Pesado"];
const BASE_T = {bueno:0,bb:1,blando:2,pesado:3};
// Tiempo en el momento de la carrera: cuánto ablanda la pista (acumulativo a lo largo de la jornada)
const CIELO = {
  sol:{label:"Soleado",d:-.1}, nubes:{label:"Nublado",d:0}, llovizna:{label:"Llovizna",d:.25},
  lluvia:{label:"Lluvia",d:.6}, fuerte:{label:"Lluvia fuerte",d:1}
};
const DEF_W = {forma:30,distancia:15,jinete:15,preparador:15,peso:10,cajon:5,clase:10,terreno:5};
const FNAMES = {forma:"Forma",distancia:"Distancia",jinete:"Jinete",preparador:"Preparador",peso:"Peso",cajon:"Cajón",clase:"Clase",terreno:"Terreno"};

// Índice de terreno continuo 0 (bueno) – 3 (pesado) para la carrera n, según la base y el tiempo de esa carrera y las anteriores.
function terrainFor(n, base, weather){
  let t=BASE_T[base]??1;
  for(let k=1;k<=n;k++){ const w=weather[k]; if(!w) continue; const c=CIELO[w.cielo]; if(!c) continue;
    let d=c.d; if(w.cielo==="sol" && (w.temp??10)<14) d=-.03; // con frío el sol apenas seca
    t+=d; }
  return Math.max(0,Math.min(3,t));
}
const terrLabel=t=>TERR_NAMES[Math.round(t)];

function buildStats(SR, onlyDates){
  const J={},T={}; let tot=0,n=0; const pts=[1,.5,.3,.15,.08];
  for(const r of SR){ if(onlyDates && !onlyDates.includes(r.d)) continue;
    for(const [no,j,t] of r.p){ const i=r.arr.indexOf(no); const v=i>=0?pts[i]:0;
      for(const [M,k,skip] of [[J,j,r.am||j==="AMATEUR"],[T,t,false]]){ if(skip) continue;
        M[k]=M[k]||{rides:0,wins:0,top3:0,v:0}; M[k].rides++; M[k].v+=v; if(i===0)M[k].wins++; if(i>=0&&i<3)M[k].top3++; }
      tot+=v;n++; } }
  const mean=n?tot/n:.1, K=8;
  for(const M of [J,T]){ for(const k in M){ const s=M[k]; s.shr=(s.v+K*mean)/(s.rides+K); }
    const arr=Object.values(M).filter(s=>s.rides>=4).map(s=>s.shr).sort((a,b)=>a-b);
    for(const k in M){ const s=M[k]; let c=0; for(const x of arr) if(x<s.shr) c++; s.pct=arr.length?(c+.5)/arr.length:.5; s.f=.15+.7*s.pct; } }
  return {J,T,mean};
}

function scoreRace(race,stats,W,t,VIS,scratched){
  const sc=scratched||new Set();
  const H=race.horses.filter(h=>!sc.has(h.no)), N=race.horses.length;
  if(!H.length) return [];
  const meanKg=H.reduce((a,h)=>a+h.kg,0)/H.length;
  const pesoM=1+.16*t, cajonM=1-.1*t, fondoM=1+.13*t;
  const dStr=race.dist<=1400?.6:race.dist<=1600?.45:race.dist<=2000?.25:.05;
  const anyForm=H.some(x=>x.form.length);
  const out=H.map(h=>{
    const f={}, why={};
    if(h.form.length){ const ws=[1,.8,.6,.45,.35]; let s=0,ws_=0; h.form.slice(0,5).forEach((p,i)=>{s+=ws[i]*posPts(p);ws_+=ws[i];});
      f.forma=Math.min(1,.08+s/ws_*1.05); why.forma=h.form.join("-"); }
    else if(anyForm){ f.forma=.35; why.forma="debutante frente a caballos con experiencia"; }
    else { f.forma=null; why.forma="debutante (todo el lote debuta)"; }
    const runs=(h.runs||[]).filter(r=>!/^(NP|TBE)$/.test(String(r.pos)));
    if(runs.length){ let s=0,ws_=0; for(const r of runs){ const sim=Math.exp(-Math.abs(r.dist-race.dist)/(.25*race.dist)); s+=sim*posPts(r.pos); ws_+=sim; }
      const conf=Math.min(1,ws_), raw=Math.min(1,.1+s/ws_); let v=.5+(raw-.5)*conf;
      if(race.dist>=3000 && Math.max(...runs.map(r=>r.dist))>=2800) v=.5+(v-.5)*fondoM;
      f.distancia=Math.max(.05,Math.min(.95,v)); why.distancia=runs.map(r=>`${r.dist} m: ${r.pos}º`).join(", "); }
    else { f.distancia=.5; why.distancia="sin carreras conocidas a distancia comparable"; }
    if(VIS[h.j]!=null){ f.jinete=VIS[h.j]; why.jinete="jinete internacional (valor previo, sin montas en la muestra)"; }
    else if(h.j==="AMATEUR"){ f.jinete=.3; why.jinete="amazona/gentleman"; }
    else { const s=stats.J[h.j]; f.jinete=s?s.f:.4; why.jinete=s?`${s.wins} vict. / ${s.rides} montas (${s.top3} en podio)`:"sin montas en la muestra"; }
    { const s=stats.T[h.t]; f.preparador=s?s.f:.4; why.preparador=s?`${s.wins} vict. / ${s.rides} salidas (${s.top3} en podio)`:"sin salidas en la muestra"; }
    { const d=meanKg-h.kg; f.peso=Math.max(.05,Math.min(.95,.5+d*.07*pesoM*Math.sqrt(race.dist/1600)));
      why.peso=`${String(h.kg).replace(".",",")} kg (${d>=0?"−":"+"}${Math.abs(d).toFixed(1).replace(".",",")} respecto a la media)`; }
    { const rel=N>1?1-(h.draw-1)/(N-1):.5; f.cajon=.5+(rel-.5)*dStr*cajonM; why.cajon=`cajón ${h.draw} de ${N}`; }
    if(runs.length){ const last=runs[0]; const dc=(CAT[last.cat]||2)-(CAT[race.cat]||2); f.clase=Math.max(.1,Math.min(.9,.5+.12*dc));
      why.clase=dc>0?`baja de categoría (${last.cat==="FR"?"Francia":last.cat} → ${race.cat})`:dc<0?`sube de categoría (${last.cat} → ${race.cat})`:`misma categoría (${race.cat})`; }
    else { f.clase=.5; why.clase="sin referencia"; }
    { const gr=(h.runs||[]).filter(r=>r.g!=null);
      if(gr.length){ let s=0; for(const r of gr) s+=(posPts(r.pos)-.35)*(r.g/3); s/=gr.length;
        f.terreno=Math.max(.1,Math.min(.9,.5+s*1.6*(t/3)*2));
        why.terreno=gr.map(r=>`${TERR_NAMES[r.g].toLowerCase()}: ${r.pos}º`).join(", ")+(t<.5?" (hoy pista buena: apenas cuenta)":""); }
      else { f.terreno=.5; why.terreno="sin carreras con terreno conocido"; } }
    let s=0,ws=0; const contrib={};
    for(const k in W){ if(f[k]==null) continue; s+=W[k]*f[k]; ws+=W[k]; }
    for(const k in W){ if(f[k]==null) continue; contrib[k]=ws?W[k]*(f[k]-.5)/ws:0; }
    return {h,f,why,score:ws?s/ws:.5,contrib};
  });
  const T=4, mx=Math.max(...out.map(o=>o.score));
  const ex=out.map(o=>Math.exp(T*(o.score-mx))), Z=ex.reduce((a,b)=>a+b,0);
  out.forEach((o,i)=>{o.p=ex[i]/Z;});
  // probabilidad de quedar entre los 3 primeros (Harville con descuento)
  const pl=placeProbs(out.map(o=>o.p)); out.forEach((o,i)=>{o.p2=pl.top2[i]; o.p3=pl.top3[i];});
  return out.sort((a,b)=>b.p-a.p);
}

// Harville con descuento (Henery/Lo): para 2º y 3º se aplanan las probabilidades (exponentes 0,81 y 0,65),
// porque el Harville puro sobrevalora a los favoritos en los puestos.
function norm(a){ const s=a.reduce((x,y)=>x+y,0); return a.map(x=>x/s); }
function ordered(p){
  const q2=norm(p.map(x=>Math.pow(x,.81))), q3=norm(p.map(x=>Math.pow(x,.65)));
  return {
    p12:(i,j)=>p[i]*q2[j]/(1-q2[i]),
    p123:(i,j,k)=>p[i]*q2[j]/(1-q2[i])*q3[k]/(1-q3[i]-q3[j])
  };
}
function placeProbs(p){
  const n=p.length, O=ordered(p), top2=new Array(n).fill(0), top3=new Array(n).fill(0);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){ if(i===j) continue; const a=O.p12(i,j); top2[i]+=a; top2[j]+=a;
    for(let k=0;k<n;k++){ if(k===i||k===j) continue; const b=O.p123(i,j,k); top3[i]+=b; top3[j]+=b; top3[k]+=b; } }
  return {top2,top3};
}
function combos(res,pv){
  const p=pv||res.map(o=>o.p), n=p.length, O=ordered(p), gem=[], gemO=[], tri=[], triO=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){ if(i===j) continue; const a=O.p12(i,j);
    gemO.push({h:[res[i].h,res[j].h],p:a}); if(i<j) gem.push({h:[res[i].h,res[j].h],p:a+O.p12(j,i)});
    for(let k=0;k<n;k++){ if(k===i||k===j) continue; triO.push({h:[res[i].h,res[j].h,res[k].h],p:O.p123(i,j,k)}); } }
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)for(let k=j+1;k<n;k++){ const per=[[i,j,k],[i,k,j],[j,i,k],[j,k,i],[k,i,j],[k,j,i]];
    tri.push({h:[res[i].h,res[j].h,res[k].h],p:per.reduce((s,[a,b,c])=>s+O.p123(a,b,c),0)}); }
  const srt=a=>a.sort((x,y)=>y.p-x.p);
  return {gem:srt(gem),gemO:srt(gemO),tri:srt(tri),triO:srt(triO)};
}

// Valor frente a las cuotas de la casa (decimales).
// Si hay cuota para todos los caballos activos, la probabilidad usada para apostar mezcla mercado y modelo
// (mercado^0,65 × modelo^0,35, normalizado): el mercado suele ser el mejor predictor y el modelo corrige.
const MARGIN=1.2;
function blendProbs(res,odds){
  if(!res.length || !res.every(o=>odds[o.h.no]>1)) return null;
  const over=res.reduce((s,o)=>s+1/odds[o.h.no],0);
  // método de potencia (k=1,15): corrige el sesgo favorito–sorpresa (las cuotas largas suelen pagar menos de lo justo)
  const pm=norm(res.map(o=>Math.pow(1/odds[o.h.no],1.15)));
  const pc=norm(res.map((o,i)=>Math.pow(pm[i],.65)*Math.pow(o.p,.35)));
  return {pm,pc,over};
}
function value(res,odds){
  const b=blendProbs(res,odds);
  return res.map((o,i)=>{ const od=odds[o.h.no]; const fair=1/o.p, minOdd=fair*MARGIN;
    if(!(od>1)) return {o,fair,minOdd};
    const pm=b?b.pm[i]:1/od, pc=b?b.pc[i]:o.p, ev=pc*od-1, kelly=Math.max(0,(pc*od-1)/(od-1))*.25;
    return {o,fair,minOdd,od,pm,pc,ev,kelly}; });
}
// Pick de riesgo: mayor valor esperado con cuota ≥ 5. Sin cuotas: el caballo con más probabilidad fuera de los 2 favoritos y cuota justa ≥ 5.
function riskyPick(res,odds){
  const v=value(res,odds); const c=v.filter(x=>x.od>=5 && x.ev>.05).sort((a,b)=>b.ev-a.ev);
  if(c.length) return {mode:"cuotas",pick:c[0]};
  if(v.some(x=>x.od)) return {mode:"sin-valor"};
  const cand=v.slice(2).filter(x=>x.fair>=5).sort((a,b)=>b.o.p-a.o.p)[0];
  return cand?{mode:"estimado",pick:cand}:{mode:"ninguno"};
}

// Validación con jornadas pasadas (sin mirar el resultado): estadística de jinetes y preparadores sólo con jornadas anteriores.
function backtest(BT,SR,W){
  const order=["01/11","08/11","15/11","22/11"]; const rows=[];
  for(const b of BT){ const prev=order.slice(0,order.indexOf(b.d)); const st=buildStats(SR,prev);
    const sr=SR.find(x=>x.d===b.d&&x.r===b.r);
    const race={dist:b.dist,cat:b.cat,horses:b.h.map(([no,kg,draw,form])=>{const pp=sr.p.find(x=>x[0]===no);return {no,kg,draw,form:form?form.split(","):[],j:pp[1],t:pp[2],runs:[]};})};
    const res=scoreRace(race,st,W,1,{},null); const win=sr.arr[0];
    const rank=res.findIndex(o=>o.h.no===win)+1, pw=res.find(o=>o.h.no===win).p;
    const top3=res.slice(0,3).map(o=>o.h.no); const realTop3=sr.arr.slice(0,3);
    rows.push({d:b.d,r:b.r,n:race.horses.length,pick:res[0].h.no,win,rank,pw,unif:1/race.horses.length,
      top3hit:top3.includes(win), placeHit:realTop3.includes(res[0].h.no)}); }
  const n=rows.length;
  return {rows,
    winHit:rows.filter(r=>r.rank===1).length/n, top3:rows.filter(r=>r.top3hit).length/n,
    placeHit:rows.filter(r=>r.placeHit).length/n,
    unifWin:rows.reduce((s,r)=>s+r.unif,0)/n,
    ll:rows.reduce((s,r)=>s-Math.log(r.pw),0)/n, llU:rows.reduce((s,r)=>s-Math.log(r.unif),0)/n};
}
if (typeof module!=="undefined") module.exports={blendProbs,buildStats,scoreRace,combos,value,riskyPick,backtest,terrainFor,terrLabel,DEF_W,FNAMES,CIELO,TERR_NAMES,BASE_T};
