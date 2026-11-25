// Modelo de pronóstico La Zarzuela.
// Cada factor se puntúa de 0 a 1 (0,5 = neutro); la puntuación es la media ponderada de los factores y la
// probabilidad de ganar sale de un softmax con "temperatura" T. Pesos y T se entrenan con las jornadas anteriores.
const FPTS = {1:1,2:.72,3:.55,4:.42,5:.33,6:.25,7:.18,8:.13,9:.1};
function posPts(p){ const s=String(p).trim(); if(/^(NP|P|C|Qdo|Ddo|Dto|Desc|TBE)$/i.test(s)) return .05; const n=parseInt(s,10); if(isNaN(n)) return .1; return FPTS[n] ?? .06; }
// Categorías españolas por importe del primer premio: Listed internacional ≥ 50.000 €, Listed local 35.000–49.999,
// A 24.000–34.999, B 15.000–23.999, C 8.000–14.999, D 3.500–7.999. FR = carrera en Francia (sin categoría española).
const CAT = {LI:6,LL:5,A:4,FR:3,B:3,C:2,D:1};
const CAT_INFO = {LI:["Listed internacional","1er premio ≥ 50.000 €"],LL:["Listed local","1er premio 35.000–49.999 €"],A:["Categoría A","1er premio 24.000–34.999 €"],
  B:["Categoría B","1er premio 15.000–23.999 €"],C:["Categoría C","1er premio 8.000–14.999 €"],D:["Categoría D","1er premio 3.500–7.999 €"],FR:["Francia","sin categoría española"]};
const catName=c=>c&&CAT_INFO[c]?CAT_INFO[c][0]:"categoría desconocida";
const catShort=c=>c==="LI"?"Listed int.":c==="LL"?"Listed local":c==="FR"?"Francia":c?"Cat. "+c:"cat. ?";
const TERR_NAMES = ["Bueno","Bueno a blando","Blando","Pesado"];
const BASE_T = {bueno:0,bb:1,blando:2,pesado:3};
const CIELO = {
  sol:{label:"Soleado",d:-.1}, nubes:{label:"Nublado",d:0}, llovizna:{label:"Llovizna",d:.25},
  lluvia:{label:"Lluvia",d:.6}, fuerte:{label:"Lluvia fuerte",d:1}
};
const DEF_W = {forma:27,distancia:13,jinete:13,preparador:13,peso:9,cajon:5,clase:10,terreno:5,rivales:10};
const DEF_T = 4;
const FNAMES = {forma:"Forma",distancia:"Distancia",jinete:"Jinete",preparador:"Preparador",peso:"Peso",cajon:"Cajón",clase:"Clase",terreno:"Terreno",rivales:"Rivales"};
const FKEYS = Object.keys(FNAMES);

function terrainFor(n, base, weather){
  let t=BASE_T[base]??1;
  for(let k=1;k<=n;k++){ const w=weather[k]; if(!w) continue; const c=CIELO[w.cielo]; if(!c) continue;
    let d=c.d; if(w.cielo==="sol" && (w.temp===""||w.temp==null||w.temp<14)) d=-.03; t+=d; }
  return Math.max(0,Math.min(3,t));
}
const terrLabel=t=>TERR_NAMES[Math.round(t)];
const normName=s=>String(s).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\(.*?\)/g,"").replace(/[^A-Z' ]/g,"").replace(/\s+/g," ").trim();

// Estadística de jinetes y preparadores con carreras de formato {d, arr, am, h:[{no,j,t}]}
function buildStats(races){
  const J={},T={}; let tot=0,n=0; const pts=[1,.5,.3,.15,.08];
  for(const r of races){ for(const h of r.h){ const i=r.arr.indexOf(h.no); const v=i>=0?pts[i]:0;
      for(const [M,k,skip] of [[J,h.j,r.am||h.j==="AMATEUR"],[T,h.t,false]]){ if(skip) continue;
        M[k]=M[k]||{rides:0,wins:0,top3:0,v:0}; M[k].rides++; M[k].v+=v; if(i===0)M[k].wins++; if(i>=0&&i<3)M[k].top3++; }
      tot+=v;n++; } }
  const mean=n?tot/n:.1, K=8;
  for(const M of [J,T]){ for(const k in M){ const s=M[k]; s.shr=(s.v+K*mean)/(s.rides+K); }
    const arr=Object.values(M).filter(s=>s.rides>=4).map(s=>s.shr).sort((a,b)=>a-b);
    for(const k in M){ const s=M[k]; let c=0; for(const x of arr) if(x<s.shr) c++; s.pct=arr.length?(c+.5)/arr.length:.5; s.f=.15+.7*s.pct; } }
  return {J,T,mean};
}
// Estado de la pista de cada jornada (datos/terreno.csv): {"AAAA-MM-DD": 0..3}
let GOING_BY_DATE={};
function setGoing(m){ GOING_BY_DATE=m||{}; }
// Carreras anteriores de un caballo dentro de las jornadas de entrenamiento (puesto exacto si fue 1º–5º; si no, "6+")
function autoRuns(name, train, beforeIdx, J){
  const key=normName(name), out=[];
  for(const r of train){ const idx=J.indexOf(r.d); if(idx<0||idx>=beforeIdx) continue;
    const h=r.h.find(x=>normName(x.name)===key); if(!h) continue; const i=r.arr.indexOf(h.no);
    const gg=GOING_BY_DATE[isoOf(r.d)]; out.push({d:r.d,idx,dist:r.dist,cat:r.cat,pos:i>=0?i+1:"6+",of:r.h.length,kg:h.kg,draw:h.draw,j:h.j,...(gg!=null?{g:gg}:{}),txt:`La Zarzuela, ${r.r}ª carrera`,auto:true}); }
  return out.sort((a,b)=>b.idx-a.idx);
}

// ---------- Historial con fecha: últimas 5 carreras en los últimos 12 meses, en cualquier hipódromo ----------
let REF_DATE="2026-11-29", WIN_FROM="2026-08-31"; const HIST_N=5, WIN_DAYS=365;
// Fecha de la carta: las carreras cuentan si son de los WIN_DAYS días anteriores
function setRefDate(iso){ REF_DATE=iso; WIN_FROM=new Date(Date.parse(iso)-WIN_DAYS*864e5).toISOString().slice(0,10); return WIN_FROM; }
const getWin=()=>({REF_DATE,WIN_FROM});
const GOING=["bueno","bueno a blando","blando","muy blando"];
// "dd/mm" (sin año: el más reciente que no pase de la fecha de la carta) o "dd/mm/aa"
function isoOf(d){ const m=/^(\d\d)\/(\d\d)(?:\/(\d\d))?$/.exec(String(d||"")); if(!m) return null;
  if(m[3]) return `20${m[3]}-${m[2]}-${m[1]}`; let y=+REF_DATE.slice(0,4); if(`${y}-${m[2]}-${m[1]}`>REF_DATE) y--; return `${y}-${m[2]}-${m[1]}`; }
const ddmm=iso=>iso.slice(8,10)+"/"+iso.slice(5,7);
function courseOf(r){ if(r.course) return r.course; const t=r.txt||""; const m=/\(([^)]*Francia[^)]*)\)/.exec(t);
  if(r.cat==="FR"){ const c=/(Nantes|Dax|Pau|Le Mans|La Teste|Lyon-Parilly|Marseille-Borély|Toulouse|Tarbes)/.exec(t); return (c?c[1]:"Francia")+(c?" (Francia)":""); } if(/San Sebasti/i.test(t)) return "San Sebastián"; return "La Zarzuela"; }
// Junta, por fecha, las carreras de la temporada en La Zarzuela (TRAIN), las de septiembre/octubre y las de otros hipódromos
// (extra) y las reconstruidas a mano en el programa (h.runs). Si una fecha aparece en varias fuentes, manda la más precisa.
function buildHist(h, train, J, extra, from, maxN){
  const key=normName(h.name), by={};
  const add=(r,pri)=>{ if(!r.date||r.date<from||r.date>=REF_DATE) return; if(/^(NP|TBE)$/i.test(String(r.pos))) { by[r.date]={skip:true,pri:9}; return; }
    const o=by[r.date]; if(o&&o.skip) return; by[r.date]=!o?{...r,pri}:pri>o.pri?{...o,...r,pri}:{...r,...o}; };
  for(const a of autoRuns(h.name,train,J.length,J)) add({...a,date:isoOf(a.d),course:"La Zarzuela"},1);
  for(const e of extra) if(normName(e.name)===key) add({...e,course:e.course||"La Zarzuela"},e.r?2:3);
  for(const m of (h.runs||[])){ const iso=isoOf(m.d); if(iso) add({...m,date:iso,course:courseOf(m)},4); }
  return Object.values(by).filter(r=>!r.skip).map(r=>{ const {pri,auto,...x}=r; return {...x,d:ddmm(r.date)}; })
    .sort((a,b)=>a.date<b.date?1:-1).slice(0,maxN||HIST_N);
}
// Puntos de una carrera teniendo en cuenta el nº de participantes (3º de 18 vale más que 3º de 6)
function runPts(r){ const s=String(r.pos); let p=parseInt(s,10); if(isNaN(p)) return .05;
  if(s.includes("+")) p=r.of?Math.max(6,Math.round((6+r.of)/2)):7;
  const rel=r.of>1?1-(p-1)/(r.of-1):.5; return .6*(FPTS[p]??.06)+.4*rel; }
const daysTo=iso=>(Date.parse(REF_DATE)-Date.parse(iso))/864e5;

// ---------- Rivales: enfrentamientos directos y cruzados ----------
// Todas las carreras conocidas se agrupan (misma carrera = mismo grupo) y de cada grupo salen pares «A llegó por delante de B».
// Con esos pares se ajusta un modelo de Bradley-Terry: un caballo que batió a rivales que a su vez batieron a otros sube aunque
// no se haya cruzado nunca con los de hoy (rivales cruzados). Cada resultado pesa según lo reciente que sea, lo parecida que sea
// la distancia y los kilos que llevaba cada uno.
function meetingGroups(train, extra, card){
  const G={}, trainDates=new Set(train.map(r=>isoOf(r.d)));
  const get=(key,base)=>G[key]||(G[key]={...base,key,ent:[]});
  const seenHD=new Set();
  for(const r of train){ const date=isoOf(r.d), gg=GOING_BY_DATE[date];
    const g=get(`${date}|La Zarzuela|${r.r}`,{date,course:"La Zarzuela",dist:r.dist,cat:r.cat,g:gg??null,of:r.h.length});
    for(const h of r.h){ const i=r.arr.indexOf(h.no); g.ent.push({name:normName(h.name),disp:h.name,pos:i>=0?i+1:null,out:i<0,kg:h.kg,draw:h.draw,j:h.j}); } }
  const addRun=(name,x)=>{ if(!x.date||/^(NP|TBE)$/i.test(String(x.pos))) return; const lz=/Zarzuela/.test(x.course||"");
    if(lz&&trainDates.has(x.date)){ // esa jornada ya está entera: solo se aprovecha el puesto exacto si allí figuraba como «6º o peor»
      const p=parseInt(String(x.pos),10), n=normName(name);
      if(!isNaN(p)) for(const k in G){ if(!k.startsWith(x.date+"|La Zarzuela|")) continue; const e=G[k].ent.find(e=>e.name===n); if(e&&e.pos==null) { e.pos=p; e.out=false; } }
      return; }
    const n=normName(name); if(seenHD.has(n+"|"+x.date)) return; seenHD.add(n+"|"+x.date); // un caballo no corre dos veces el mismo día
    const key=`${x.date}|${x.course}|${x.r||x.dist}`;
    const g=get(key,{date:x.date,course:x.course,dist:x.dist,cat:x.cat,g:x.g??(lz?GOING_BY_DATE[x.date]:null)??null,of:x.of});
    if(g.ent.some(e=>e.name===n)) return; const s=String(x.pos), p=parseInt(s,10);
    g.ent.push({name:n,disp:name,pos:isNaN(p)||s.includes("+")?null:p,out:s.includes("+"),kg:x.kg}); };
  for(const e of (extra||[])) addRun(e.name,e);
  for(const r of (card||[])) for(const h of r.horses) for(const m of (h.runs||[])){ const date=isoOf(m.d); if(date) addRun(h.name,{...m,date,course:courseOf(m)}); }
  return Object.values(G).filter(g=>g.ent.length>1).sort((a,b)=>a.date<b.date?-1:1);
}
// true si a llegó por delante de b, false si detrás, null si no se sabe (los dos fuera de los 5 primeros)
function ahead(a,b){ if(a.pos!=null&&b.pos!=null) return a.pos<b.pos; if(a.pos!=null&&a.pos<=5&&b.out) return true; if(b.pos!=null&&b.pos<=5&&a.out) return false; return null; }
function btFit(groups, asOf, dist){
  const pairs=[], seen=new Set();
  for(const g of groups){ if(g.date>=asOf) continue; const days=(Date.parse(asOf)-Date.parse(g.date))/864e5; if(days>200) continue;
    const wt=Math.exp(-days/90)*(.4+.6*Math.exp(-Math.abs((g.dist||dist)-dist)/(.3*dist)))*3/Math.max(2,g.ent.length-1); // cada carrera vale ~3 «partidos» por caballo
    for(let i=0;i<g.ent.length;i++) for(let k=i+1;k<g.ent.length;k++){ const a=g.ent[i], b=g.ent[k], res=ahead(a,b); if(res==null) continue;
      const [w,l]=res?[a,b]:[b,a]; let adj=1; if(w.kg&&l.kg) adj=Math.max(.7,Math.min(1.3,1+.05*(w.kg-l.kg)));
      pairs.push([w.name,l.name,wt*adj]); seen.add(w.name); seen.add(l.name); } }
  const r={}, W={}, n={}; for(const x of seen){ r[x]=1; W[x]=0; n[x]=0; }
  for(const [w,l,wt] of pairs){ W[w]+=wt; n[w]+=wt; n[l]+=wt; }
  const P=1.5; // partidos ficticios contra un rival medio: sin datos, el nivel se queda en 1
  for(let it=0;it<60;it++){ const den={}; for(const x of seen) den[x]=2*P/(r[x]+1);
    for(const [w,l,wt] of pairs){ const d=wt/(r[w]+r[l]); den[w]+=d; den[l]+=d; }
    for(const x of seen) r[x]=(W[x]+P)/den[x]; }
  return {r,n};
}
// Enfrentamientos directos de un caballo con los rivales que tiene hoy
function h2h(groups, name, others, asOf){
  const me=normName(name), set=new Set(others.map(normName)), out=[];
  for(const g of groups){ if(g.date>=asOf) continue; const a=g.ent.find(e=>e.name===me); if(!a) continue;
    for(const b of g.ent){ if(b===a||!set.has(b.name)) continue; out.push({date:g.date,course:g.course,dist:g.dist,cat:g.cat,g:g.g,of:g.of,me:a,rv:b,res:ahead(a,b)}); } }
  return out.sort((x,y)=>x.date<y.date?1:-1);
}
function rivalCtx(groups, race, asOf){ return {bt:btFit(groups,asOf,race.dist),groups,asOf}; }

// ---------- Lo que va de día ----------
// A partir de las llegadas ya introducidas hoy: puntos de cada jinete/preparador frente a lo esperado
// (1º=1, 2º=0,5, 3º=0,3, 4º=0,15, 5º=0,08; esperado = 1,98/participantes) y sesgo de cajón en carreras de hasta 2.000 m.
const DPTS=[1,.5,.3,.15,.08];
function dayContext(races,results,scratched,beforeN){
  const jk={},tr={}; let bS=0,bN=0; const done=[];
  for(const r of races){ if(r.n>=beforeN) continue; const arr=results[r.n]; if(!arr||!arr.length) continue;
    const sc=new Set(scratched[r.n]||[]); const H=r.horses.filter(h=>!sc.has(h.no)), n=H.length, N=r.horses.length;
    done.push({n:r.n,arr,h:H});
    for(const h of H){ const pos=arr.indexOf(h.no), v=pos>=0&&pos<5?DPTS[pos]:0, e=1.98/n;
      for(const [M,k,lab] of [[jk,h.j,h.jn],[tr,h.t,h.t]]){ if(k==="AMATEUR") continue; M[k]=M[k]||{d:0,rides:0,wins:0,places:0,lab}; const s=M[k]; s.d+=v-e; s.rides++; if(pos===0) s.wins++; if(pos>=0&&pos<3) s.places++; } }
    if(r.dist<=2000 && N>3) for(const no of arr.slice(0,3)){ const h=r.horses.find(x=>x.no===no); if(h){ bS+=(1-(h.draw-1)/(N-1))-.5; bN++; } } }
  return {jk,tr,bias:bN?bS/bN:0,biasN:bN,done};
}
// Carreras de hoy ya corridas, en el formato de entrenamiento (para sumar a la estadística de la temporada)
function todayAsTrain(races,results,scratched,beforeN){
  return races.filter(r=>r.n<beforeN && results[r.n]&&results[r.n].length).map(r=>{ const sc=new Set(scratched[r.n]||[]);
    return {d:REF_DATE.slice(8,10)+"/"+REF_DATE.slice(5,7),r:r.n,dist:r.dist,cat:r.cat,am:false,arr:results[r.n],h:r.horses.filter(h=>!sc.has(h.no)).map(h=>({no:h.no,name:h.name,kg:h.kg,draw:h.draw,j:h.j,t:h.t,form:h.form}))}; });
}

// Nivel de categoría de un caballo: cada carrera vale su categoría (D=1 … A=4, Listed local 5, Listed internacional 6)
// corregida por cómo quedó (ganar vale ~½ escalón más; quedar atrás, ~1 escalón menos). Cuentan todas las carreras con
// categoría conocida, más las recientes, y se mezcla la mejor con la media: un caballo que se ha medido bien en categorías
// altas suele ser superior a uno que solo ha corrido en las bajas.
const CLS={perf:1,best:.5,k:.18}; // peso del puesto dentro de la categoría, mezcla mejor/media, escala del factor
function classLevel(h){
  const seen=new Set(), L=[];
  for(const r of [...(h.hist||[]),...(h.runs||[])]){ if(!r.cat||CAT[r.cat]==null||seen.has(r.d)) continue; if(/^(NP|TBE)$/i.test(String(r.pos))) continue; seen.add(r.d);
    const iso=isoOf(r.d), days=iso?daysTo(iso):null; if(days!=null&&days<0) continue;
    const w=days==null?.35:Math.exp(-days/180); if(w<.05) continue;
    const perf=runPts(r), v=CAT[r.cat]+CLS.perf*(perf-.45); L.push({v,w,cat:r.cat,perf}); }
  if(!L.length) return null;
  const W=L.reduce((a,x)=>a+x.w,0), avg=L.reduce((a,x)=>a+x.w*x.v,0)/W, best=Math.max(...L.filter(x=>x.w>=.3).map(x=>x.v),avg);
  return {lvl:CLS.best*best+(1-CLS.best)*avg,n:W,L}; }
const lvlName=v=>v>=5.5?"Listed int.":v>=4.5?"Listed local":v>=3.5?"A":v>=2.5?"B":v>=1.5?"C":"D";
function features(race,stats,t,VIS,scratched,ctx,dayW){
  const sc=scratched||new Set();
  const H=race.horses.filter(h=>!sc.has(h.no)), N=race.horses.length;
  const meanKg=H.reduce((a,h)=>a+h.kg,0)/Math.max(1,H.length);
  const pesoM=1+.16*t, cajonM=1-.1*t, fondoM=1+.13*t;
  const dStr=race.dist<=1400?.6:race.dist<=1600?.45:race.dist<=2000?.25:.05;
  const anyForm=H.some(x=>x.form.length);
  const out=H.map(h=>{
    const f={}, why={};
    if(h.hist && h.hist.length){ let s=0,ws_=0; for(const r of h.hist){ const w=Math.exp(-daysTo(r.date)/90); s+=w*runPts(r); ws_+=w; }
      const n=h.hist.length, v=Math.min(1,.08+s/ws_*1.1); f.forma=.38+(v-.38)*n/(n+1);
      why.forma=`${n} carrera${n>1?"s":""} en 12 meses: `+h.hist.map(r=>`${r.pos}º/${r.of||"?"} (${r.d})`).join(", ")+(n<3?" · pocas carreras: se acerca al neutro":""); }
    else if(h.hist && h.lastOld){ f.forma=.32; why.forma=`sin carreras en los últimos 12 meses (última: ${h.lastOld})`; }
    else if(h.hist && h.form.length){ const ws=[1,.8,.6,.45,.35]; let s=0,ws_=0; h.form.slice(0,5).forEach((p,i)=>{s+=ws[i]*posPts(p);ws_+=ws[i];});
      const v=Math.min(1,.08+s/ws_*1.05), n=Math.min(5,h.form.length)/2; f.forma=.38+(v-.38)*n/(n+1); why.forma=h.form.join("-")+" (programa; fechas sin confirmar, cuenta a medias)"; }
    else if(h.form.length){ const ws=[1,.8,.6,.45,.35]; let s=0,ws_=0; h.form.slice(0,5).forEach((p,i)=>{s+=ws[i]*posPts(p);ws_+=ws[i];});
      f.forma=Math.min(1,.08+s/ws_*1.05); why.forma=h.form.join("-"); }
    else if(anyForm){ f.forma=.35; why.forma="debutante frente a caballos con experiencia"; }
    else { f.forma=.5; why.forma="debutante (todo el lote debuta: no cuenta)"; }
    const runs=(h.hist||h.runs||[]).filter(r=>!/^(NP|TBE)$/.test(String(r.pos))&&r.dist);
    if(runs.length){ let s=0,ws_=0; for(const r of runs){ const sim=Math.exp(-Math.abs(r.dist-race.dist)/(.25*race.dist)); s+=sim*(h.hist?runPts(r):posPts(r.pos)); ws_+=sim; }
      const conf=Math.min(1,ws_), raw=Math.min(1,.1+s/ws_); let v=.5+(raw-.5)*conf;
      if(race.dist>=3000 && Math.max(...runs.map(r=>r.dist))>=2800) v=.5+(v-.5)*fondoM;
      f.distancia=Math.max(.05,Math.min(.95,v)); why.distancia=runs.slice(0,6).map(r=>`${r.dist} m: ${r.pos}º`).join(", "); }
    else { f.distancia=.5; why.distancia="sin carreras conocidas a distancia comparable"; }
    if(VIS[h.j]!=null && !stats.J[h.j]){ f.jinete=VIS[h.j]; why.jinete="jinete internacional (valor previo, sin montas en la muestra)"; }
    else if(h.j==="AMATEUR"){ f.jinete=.3; why.jinete="amazona/gentleman"; }
    else { const s=stats.J[h.j]; f.jinete=s?s.f:.4; why.jinete=s?`${s.wins} vict. / ${s.rides} montas (${s.top3} en podio)`:"sin montas en la muestra"; }
    { const s=stats.T[h.t]; f.preparador=s?s.f:.4; why.preparador=s?`${s.wins} vict. / ${s.rides} salidas (${s.top3} en podio)`:"sin salidas en la muestra"; }
    if(ctx){ const dw=dayW||0;
      for(const [k,M,key] of [["jinete",ctx.jk,h.j],["preparador",ctx.tr,h.t]]){ const s=M[key]; if(!s) continue;
        f[k]=Math.max(.05,Math.min(.95,f[k]+dw*Math.max(-.15,Math.min(.15,.08*s.d))));
        why[k]+=` · hoy: ${s.wins} vict., ${s.places} en podio en ${s.rides} ${k==="jinete"?"montas":"salidas"}${dw?"":" (efecto del día desactivado)"}`; } }
    { const d=meanKg-h.kg; f.peso=Math.max(.05,Math.min(.95,.5+d*.07*pesoM*Math.sqrt(race.dist/1600)));
      why.peso=`${String(h.kg).replace(".",",")} kg (${d>=0?"−":"+"}${Math.abs(d).toFixed(1).replace(".",",")} respecto a la media)`; }
    { const rel=N>1?1-(h.draw-1)/(N-1):.5; let bias=0;
      if(ctx&&ctx.biasN&&race.dist<=2000) bias=(dayW||0)*ctx.bias*ctx.biasN/(ctx.biasN+6)*1.2;
      f.cajon=Math.max(.05,Math.min(.95,.5+(rel-.5)*(dStr*cajonM+bias))); why.cajon=`cajón ${h.draw} de ${N}`+(ctx&&ctx.biasN&&race.dist<=2000?` · hoy los 3 primeros salieron ${ctx.bias>.05?"más por dentro":ctx.bias<-.05?"más por fuera":"repartidos"}`:""); }
    f.clase=.5; why.clase=""; // se calcula abajo, comparando con el resto del lote

    { const hh=h.hist||[], gr=[...hh,...(h.runs||[]).filter(r=>!hh.some(x=>x.d===r.d))].filter(r=>r.g!=null);
      if(gr.length){ let s=0; for(const r of gr) s+=(posPts(r.pos)-.35)*(r.g/3); s/=gr.length;
        f.terreno=Math.max(.1,Math.min(.9,.5+s*3.2*(t/3)));
        why.terreno=gr.map(r=>`${TERR_NAMES[r.g].toLowerCase()}: ${r.pos}º`).join(", ")+(t<.5?" (hoy pista buena: apenas cuenta)":""); }
      else { f.terreno=.5; why.terreno="sin carreras con terreno conocido"; } }
    if(race.rival){ const {bt,groups,asOf}=race.rival, me=normName(h.name);
      // los caballos sin resultados comparables cuentan como la media (geométrica) de los que sí tienen
      const known=H.map(x=>bt.r[normName(x.name)]).filter(v=>v!=null), gm=known.length?Math.exp(known.reduce((a,v)=>a+Math.log(v),0)/known.length):1;
      const R=x=>bt.r[normName(x.name)]??gm, rh=R(h), others=H.filter(x=>x!==h), ps=others.map(o=>rh/(rh+R(o)));
      f.rivales=ps.length?Math.max(.05,Math.min(.95,ps.reduce((a,c)=>a+c,0)/ps.length)):.5;
      const d=h2h(groups,h.name,others.map(o=>o.name),asOf), w=d.filter(x=>x.res===true).length, l=d.filter(x=>x.res===false).length;
      const ev=bt.n[me]||0;
      why.rivales=(d.length?`directos con los de hoy: ${w} por delante, ${l} por detrás`:"sin enfrentamientos directos con los de hoy")+
        (bt.r[me]!=null?` · nivel por rivales cruzados ${rh.toFixed(2).replace(".",",")} (1 = caballo medio)`:" · sin resultados que lo comparen: neutro"); }
    else { f.rivales=.5; why.rivales="sin datos de rivales"; }
    return {h,f,why};
  });
  // Clase: nivel de categoría de cada caballo frente a la media del lote de hoy
  { const C=out.map(o=>classLevel(o.h)), known=C.filter(Boolean), raceC=CAT[race.cat]??2;
    const mean=known.length?known.reduce((a,c)=>a+c.lvl,0)/known.length:raceC;
    out.forEach((o,i)=>{ const c=C[i];
      if(!c){ o.f.clase=.5; o.why.clase=o.h.form&&o.h.form.length?"sin carreras con categoría conocida":"debutante: sin referencia de categoría"; return; }
      const sh=c.n/(c.n+.6), lv=mean+(c.lvl-mean)*sh;
      o.f.clase=Math.max(.08,Math.min(.92,.5+CLS.k*(lv-mean)));
      const cats={}; for(const x of c.L) cats[catShort(x.cat)]=(cats[catShort(x.cat)]||0)+1;
      o.why.clase=`nivel ${c.lvl.toFixed(1).replace(".",",")} (≈ ${lvlName(c.lvl)}) frente a ${mean.toFixed(1).replace(".",",")} de media del lote · hoy ${catShort(race.cat)} · ha corrido: `+Object.entries(cats).map(([k,v])=>v>1?`${k} ×${v}`:k).join(", "); }); }
  return out;
}
function softmax(scores,T){ const mx=Math.max(...scores); const ex=scores.map(s=>Math.exp(T*(s-mx))); const Z=ex.reduce((a,b)=>a+b,0); return ex.map(e=>e/Z); }
function scoreRace(race,stats,W,t,VIS,scratched,T,ctx,dayW){
  const out=features(race,stats,t,VIS,scratched,ctx,dayW); if(!out.length) return [];
  const ws=FKEYS.reduce((a,k)=>a+(W[k]||0),0)||1;
  for(const o of out){ o.score=FKEYS.reduce((a,k)=>a+(W[k]||0)*o.f[k],0)/ws; o.contrib={}; for(const k of FKEYS) o.contrib[k]=(W[k]||0)*(o.f[k]-.5)/ws; }
  const p=softmax(out.map(o=>o.score),T??DEF_T); out.forEach((o,i)=>o.p=p[i]);
  return out.sort((a,b)=>b.p-a.p);
}

// ---------- Gemelas y tríos ----------
// Harville con descuento (referencia): P(j 2º | i 1º) = q_j/(1−q_i), con q aplanadas (exponentes 0,81 y 0,65).
function norm(a){ const s=a.reduce((x,y)=>x+y,0); return a.map(x=>x/s); }
function harville(p){
  const q2=norm(p.map(x=>Math.pow(x,.81))), q3=norm(p.map(x=>Math.pow(x,.65)));
  return {p12:(i,j)=>p[i]*q2[j]/(1-q2[i]), p123:(i,j,k)=>p[i]*q2[j]/(1-q2[i])*q3[k]/(1-q3[i]-q3[j])};
}
// Regularidad de cada caballo: dispersión de sus últimos puestos. Un caballo regular (3-2-2-1-2) tiene σ baja;
// uno irregular (1-9-1-NP-8) tiene σ alta: gana a veces, pero entra menos en gemelas y tríos.
const SIG_SPREAD=.75;
function sigmaOf(h,spread=SIG_SPREAD){
  const pts=(h.form||[]).slice(0,5).map(posPts);
  if(pts.length<2) return .7+.7*spread;
  const m=pts.reduce((a,b)=>a+b,0)/pts.length, sd=Math.sqrt(pts.reduce((a,b)=>a+(b-m)**2,0)/(pts.length-1));
  return .7+Math.min(1,sd/.38)*spread;
}
function rng(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
// Simulación: rendimiento_i = μ_i + σ_i·ε (normal). Se ajustan las μ hasta que las victorias simuladas
// coinciden con las probabilidades del modelo; las gemelas y tríos salen de contar llegadas simuladas.
function simulate(res,pv,nSim=6000,seed=29,spread=SIG_SPREAD){
  const n=res.length, p=pv||res.map(o=>o.p), sig=res.map(o=>sigmaOf(o.h,spread));
  const R=rng(seed), Z=new Float64Array(nSim*n);
  for(let i=0;i<Z.length;i+=2){ const u=Math.max(1e-12,R()), v=R(), r=Math.sqrt(-2*Math.log(u)); Z[i]=r*Math.cos(2*Math.PI*v); if(i+1<Z.length) Z[i+1]=r*Math.sin(2*Math.PI*v); }
  const mu=p.map(x=>Math.log(x)*.9); const X=new Float64Array(n);
  for(let it=0;it<30;it++){ const w=new Array(n).fill(.5);
    for(let s=0;s<nSim;s++){ let b=-1,bv=-1e9; for(let i=0;i<n;i++){ const x=mu[i]+sig[i]*Z[s*n+i]; if(x>bv){bv=x;b=i;} } w[b]++; }
    let maxErr=0; for(let i=0;i<n;i++){ const ws=w[i]/(nSim+n*.5); const e=Math.log(p[i]/ws); maxErr=Math.max(maxErr,Math.abs(e)); mu[i]+=.6*e*sig[i]; }
    if(maxErr<.03) break; }
  const gem=new Map(), gemO=new Map(), tri=new Map(), triO=new Map(), top3=new Array(n).fill(0), win=new Array(n).fill(0), idx=[...Array(n).keys()];
  for(let s=0;s<nSim;s++){ for(let i=0;i<n;i++) X[i]=mu[i]+sig[i]*Z[s*n+i];
    let a=-1,b=-1,c=-1; for(const i of idx){ if(a<0||X[i]>X[a]){c=b;b=a;a=i;} else if(b<0||X[i]>X[b]){c=b;b=i;} else if(c<0||X[i]>X[c]) c=i; }
    win[a]++; top3[a]++; if(b>=0) top3[b]++; if(c>=0) top3[c]++;
    if(b>=0){ const ko=a+","+b, ku=[a,b].sort((x,y)=>x-y).join(","); gemO.set(ko,(gemO.get(ko)||0)+1); gem.set(ku,(gem.get(ku)||0)+1); }
    if(c>=0){ const ko=a+","+b+","+c, ku=[a,b,c].sort((x,y)=>x-y).join(","); triO.set(ko,(triO.get(ko)||0)+1); tri.set(ku,(tri.get(ku)||0)+1); } }
  const list=M=>[...M.entries()].map(([k,v])=>({h:k.split(",").map(i=>res[+i].h),p:v/nSim})).sort((x,y)=>y.p-x.p);
  return {gem:list(gem),gemO:list(gemO),tri:list(tri),triO:list(triO),top3:top3.map(v=>v/nSim),sig};
}
// Probabilidad exacta de una gemela/trío (sin orden) con Harville, para comparar
function harvilleUnordered(p,set){
  const O=harville(p);
  if(set.length===2){ const [i,j]=set; return O.p12(i,j)+O.p12(j,i); }
  const [i,j,k]=set, per=[[i,j,k],[i,k,j],[j,i,k],[j,k,i],[k,i,j],[k,j,i]]; return per.reduce((s,[a,b,c])=>s+O.p123(a,b,c),0);
}

// ---------- Valor frente a las cuotas ----------
const MARGIN=1.2;
function blendProbs(res,odds){
  if(!res.length || !res.every(o=>odds[o.h.no]>1)) return null;
  const pm=norm(res.map(o=>Math.pow(1/odds[o.h.no],1.15)));
  const pc=norm(res.map((o,i)=>Math.pow(pm[i],.65)*Math.pow(o.p,.35)));
  return {pm,pc};
}
function value(res,odds){
  const b=blendProbs(res,odds);
  return res.map((o,i)=>{ const od=odds[o.h.no]; const fair=1/o.p, minOdd=fair*MARGIN;
    if(!(od>1)) return {o,fair,minOdd};
    const pm=b?b.pm[i]:1/od, pc=b?b.pc[i]:o.p, ev=pc*od-1, kelly=Math.max(0,(pc*od-1)/(od-1))*.25;
    return {o,fair,minOdd,od,pm,pc,ev,kelly}; });
}
function riskyPick(res,odds){
  const v=value(res,odds); const c=v.filter(x=>x.od>=5 && x.ev>.05).sort((a,b)=>b.ev-a.ev);
  if(c.length) return {mode:"cuotas",pick:c[0]};
  if(v.some(x=>x.od)) return {mode:"sin-valor"};
  const cand=v.slice(2).filter(x=>x.fair>=5).sort((a,b)=>b.o.p-a.o.p)[0];
  return cand?{mode:"estimado",pick:cand}:{mode:"ninguno"};
}

// ---------- Entrenamiento ----------
// Prepara cada carrera de entrenamiento con estadística y carreras previas calculadas SOLO con jornadas anteriores.
function prepareTrain(train,J,VIS,groups){
  return train.map(r=>{ const idx=J.indexOf(r.d); const prev=train.filter(x=>J.indexOf(x.d)<idx);
    const st=buildStats(prev), date=isoOf(r.d);
    const race={dist:r.dist,cat:r.cat,horses:r.h.map(h=>({...h,runs:autoRuns(h.name,train,idx,J)}))};
    if(groups) race.rival=rivalCtx(groups,race,date);
    const fx=features(race,st,GOING_BY_DATE[date]??1,VIS||{},null);
    return {d:r.d,r:r.r,idx,arr:r.arr,n:r.h.length,nos:fx.map(o=>o.h.no),X:fx.map(o=>FKEYS.map(k=>o.f[k]))}; });
}
// Logit condicional "explotado" sobre los 3 primeros (pesos 1, 0,5, 0,3): maximiza la verosimilitud del orden de llegada.
// β_k = T·w_k/Σw ≥ 0; regularización L2 hacia los pesos por defecto para no sobreajustar con pocas carreras.
function fitWeights(prepared, opts={}){
  const lam=opts.lambda??4, it=opts.iters??1500, lr=opts.lr??.4;
  const fixed=opts.fixed||["terreno"]; // el terreno no se puede entrenar (no hay estado de pista de las jornadas pasadas)
  const ws0=FKEYS.reduce((a,k)=>a+DEF_W[k],0);
  const b0=FKEYS.map(k=>DEF_T*DEF_W[k]/ws0); let b=b0.slice();
  const dw=[1,.5,.3];
  for(let t=0;t<it;t++){ const g=new Array(FKEYS.length).fill(0); let nObs=0;
    for(const r of prepared){ let alive=r.nos.map((_,i)=>i);
      for(let k=0;k<3;k++){ const win=r.arr[k]; if(win==null) break; const wi=r.nos.indexOf(win); if(wi<0||!alive.includes(wi)) break;
        const s=alive.map(i=>r.X[i].reduce((a,x,q)=>a+b[q]*(x-.5),0)); const mx=Math.max(...s); const e=s.map(x=>Math.exp(x-mx)); const Z=e.reduce((a,c)=>a+c,0);
        for(let q=0;q<b.length;q++){ let ex=0; alive.forEach((i,ai)=>{ex+=e[ai]/Z*(r.X[i][q]-.5);}); g[q]+=dw[k]*((r.X[wi][q]-.5)-ex); }
        nObs+=dw[k]; alive=alive.filter(i=>i!==wi); } }
    for(let q=0;q<b.length;q++){ if(fixed.includes(FKEYS[q])) continue; g[q]=g[q]/Math.max(1,nObs)-lam*(b[q]-b0[q])/Math.max(1,nObs); b[q]=Math.max(0,b[q]+lr*g[q]*10); } }
  const sum=b.reduce((a,c)=>a+c,0)||1; const W={}; FKEYS.forEach((k,q)=>W[k]=Math.round(100*b[q]/sum)); return {W,T:+sum.toFixed(2)};
}
function evalRaces(prepared,W,T){
  const ws=FKEYS.reduce((a,k)=>a+(W[k]||0),0)||1; let ll=0,llU=0,hit=0,t3=0,n=0;
  for(const r of prepared){ const s=r.X.map(x=>FKEYS.reduce((a,k,q)=>a+(W[k]||0)*x[q],0)/ws); const p=softmax(s,T);
    const wi=r.nos.indexOf(r.arr[0]); ll-=Math.log(p[wi]); llU+=Math.log(r.n);
    const gt=p.filter(x=>x>p[wi]+1e-12).length, eq=p.filter(x=>Math.abs(x-p[wi])<=1e-12).length; // empates: acierto repartido
    hit+=gt===0?1/eq:0; t3+=Math.max(0,Math.min(eq,3-gt))/eq; n++; }
  return {n,ll:ll/n,llU:llU/n,hit:hit/n,t3:t3/n};
}
if (typeof module!=="undefined") module.exports={CLS,CAT_INFO,catName,catShort,setGoing,meetingGroups,btFit,h2h,rivalCtx,ahead,setRefDate,getWin,buildHist,runPts,isoOf,GOING,dayContext,todayAsTrain,posPts,normName,buildStats,autoRuns,features,scoreRace,softmax,harville,harvilleUnordered,sigmaOf,simulate,blendProbs,value,riskyPick,prepareTrain,fitWeights,evalRaces,terrainFor,terrLabel,DEF_W,DEF_T,FNAMES,FKEYS,CIELO,TERR_NAMES,BASE_T,MARGIN};
