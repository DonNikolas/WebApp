/* ===================== CONSTANTS ===================== */
const RACE='2026-12-28', START='2026-09-07', TARGET=240; // TARGET in minutes (4:00h)
const KEY='mc_v3', OLD_KEY='mc_v2';
const DELOAD_WEEKS=[4,8,12];

/* ===================== STATE & MIGRATION ===================== */
function emptyState(){
 return {profile:{}, done:{}, strengthSets:[], runs:[], weights:[], readinessHistory:[], projHistory:[], raceInputs:{}, migratedFromV2:false};
}
function migrateFromV2(o){
 let s=emptyState();
 s.done=o.done||{};
 s.strengthSets=(o.strength||[]).map(x=>({date:x.date,session:null,exercise:x.exercise,weight:x.weight,reps:x.reps,rir:x.rir}));
 s.runs=(o.runs||[]).map(x=>({date:x.date,type:x.type,dist:x.dist,time:x.time,hr:x.hr||null,hrmax:null,rpe:x.rpe||null,elevation:null,note:x.note||''}));
 s.weights=o.weights||[];
 s.readinessHistory=(o.scoreHistory||[]).map(x=>({date:x.date,score:x.score}));
 s.raceInputs={test5Override:o.raceInputs?.test5||null,test10Override:o.raceInputs?.test10||null,testHMOverride:null};
 s.profile=o.profile||{};
 s.migratedFromV2=true;
 return s;
}
let state;
{
 let raw=localStorage.getItem(KEY);
 if(raw){ state=JSON.parse(raw); }
 else {
  let old=localStorage.getItem(OLD_KEY);
  state = old ? migrateFromV2(JSON.parse(old)) : emptyState();
  localStorage.setItem(KEY, JSON.stringify(state));
 }
 state.profile=state.profile||{}; state.done=state.done||{}; state.strengthSets=state.strengthSets||[];
 state.runs=state.runs||[]; state.weights=state.weights||[]; state.readinessHistory=state.readinessHistory||[];
 state.projHistory=state.projHistory||[]; state.raceInputs=state.raceInputs||{};
}
function persist(){localStorage.setItem(KEY,JSON.stringify(state));}
function save(){persist(); renderAll();}

/* ===================== DATE / FORMAT HELPERS ===================== */
function pad(n){return String(n).padStart(2,'0')}
function fmtDate(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function dateObj(s){return new Date(s+'T12:00:00')}
function diffDays(a,b){return Math.round((dateObj(b)-dateObj(a))/86400000)}
function minToTime(m){if(!isFinite(m)||m==null)return '—';let h=Math.floor(m/60),x=Math.round(m%60);return h?`${h}:${pad(x)} h`:`${x} min`}
function pace(m,km){return km>0?m/km:0}
function paceText(p){if(!p||!isFinite(p))return '—';return `${Math.floor(p)}:${pad(Math.round((p%1)*60))} /km`}
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v))}
function isoWeekStart(i){let d=dateObj(START);d.setDate(d.getDate()+i*7);return d}
function weekForDate(s){let n=Math.floor(diffDays(START,s)/7)+1;return clamp(n,1,16)}
function go(tab){document.querySelector(`nav button[data-tab="${tab}"]`).click()}

/* ===================== 16-WEEK PLAN ===================== */
// [longKm, longLabel, qualityType, qualityKm, easyKm]
const weekPlanData=[
/*1*/ [12,'Long Run','Tempo',6,5],
/*2*/ [14,'Long Run','Intervalle',7,6],
/*3*/ [16,'Long Run','Tempo',7,6],
/*4*/ [12,'Deload Long Run','Easy + Strides',6,5],
/*5*/ [18,'Long Run','Intervalle',8,7],
/*6*/ [20,'Long Run','Tempo',8,7],
/*7*/ [22,'Long Run','Intervalle/Tempo',9,7],
/*8*/ [16,'Deload Long Run','Easy + Strides',7,6],
/*9*/ [24,'Long Run','Tempo',9,8],
/*10*/[26,'Long Run','Marathon Pace',10,8],
/*11*/[27,'Long Run','Intervalle',10,8],
/*12*/[20,'Deload Long Run','Easy + Strides',8,6],
/*13*/[29,'Peak Long Run','Marathon Pace',10,8],
/*14*/[24,'Long Run','Tempo kontrolliert',8,7],
/*15*/[18,'Taper Long Run','Easy + Strides',6,5],
/*16*/[42.195,'MARATHON 4:00 Ziel','Shakeout',4,3]
];
const strengthTemplates={
 A:{label:'Kraft A – schwer',exs:[['Weighted Pull-ups',4,4,6],['Weighted Dips',4,5,8],['Row',3,8,12],['Back Squat',3,5,8],['RDL / Deadlift',2,5,8],['Core',3,10,15]]},
 B:{label:'Kraft B – Oberkörper',exs:[['Pull-ups (weighted/normal)',3,6,10],['Dips (weighted/normal)',3,6,10],['Row',3,8,12],['Biceps Curls',3,8,15],['Triceps Extension',3,8,15],['Lateral Raises',3,12,20],['Shoulder Press / Pike Push-ups',2,8,12]]},
 C:{label:'Kraft C – leicht',exs:[['Pull-ups',3,6,10],['Dips',3,6,10],['Leg Press / leichte Squats',2,8,12],['Row / Lat Pulldown',2,10,12],['Calf Raises',3,10,15],['Core',3,10,15]]}
};
function makePlanDay(d){
 const dow=d.getDay(); const ds=fmtDate(d), w=weekForDate(ds); const wp=weekPlanData[w-1];
 if(dow===1)return {date:ds,type:'strength',session:'A',name:strengthTemplates.A.label,detail:'Weighted Pull-ups + Weighted Dips + Squat/RDL',week:w};
 if(dow===3)return {date:ds,type:'strength',session:'B',name:strengthTemplates.B.label,detail:'Pull-ups + Dips + Armvolumen',week:w};
 if(dow===6)return {date:ds,type:'strength',session:'C',name:strengthTemplates.C.label,detail:'Leicht — direkt vor dem Long Run',week:w};
 if(dow===2)return {date:ds,type:'run',name:wp[2],detail:`${wp[3]} km ${wp[2]}`,km:wp[3],week:w,runKind:'quality'};
 if(dow===4)return {date:ds,type:'run',name:'Easy Run',detail:`${wp[4]} km locker`,km:wp[4],week:w,runKind:'easy'};
 if(dow===0)return {date:ds,type:'run',name:wp[1],detail:`${wp[0]} km`,km:wp[0],week:w,runKind:'long'};
 return {date:ds,type:'rest',name:'Pause',detail:'Regeneration',week:w};
}
function getPlanDays(){let out=[];let d=dateObj(START);for(let i=0;i<112;i++){out.push(makePlanDay(d));d.setDate(d.getDate()+1)}return out}
const plan=getPlanDays();
function plannedWeeklyKm(w){let wp=weekPlanData[w-1];return +(wp[0]+wp[3]+wp[4]).toFixed(1)}

/* ===================== STRENGTH ===================== */
function estLoad(weight,reps){return weight*(1+reps/30)} // Epley-style estimated effective load / 1RM proxy
function exSets(ex){return state.strengthSets.filter(x=>x.exercise===ex).sort((a,b)=>a.date.localeCompare(b.date))}
function sessionsByDate(ex){ // group into one entry per date (a "session" = best set of that day for that exercise)
 let byDate={}; for(const s of exSets(ex)){ if(!byDate[s.date]||s.weight>byDate[s.date].weight) byDate[s.date]=s; }
 return Object.values(byDate).sort((a,b)=>a.date.localeCompare(b.date));
}
function progression(ex,maxR,minR){
 let sessions=sessionsByDate(ex); if(!sessions.length)return 'Startgewicht wählen, ca. 2 RIR lassen';
 let last=sessions.at(-1); let recent=sessions.slice(-3);
 let inc=/Pull-ups|Chin-ups|Dips/.test(ex)?1.25:2.5;
 let declining = recent.length===3 && estLoad(recent[0].weight,recent[0].reps)>estLoad(recent[1].weight,recent[1].reps) && estLoad(recent[1].weight,recent[1].reps)>estLoad(recent[2].weight,recent[2].reps);
 if(declining)return `Leistung sinkt seit 3 Einheiten — Gewicht halten oder leicht reduzieren, ggf. Deload erwägen`;
 if(last.rir<=2&&last.reps>=maxR)return `+${inc} kg testen`;
 if(last.reps<minR)return `${last.weight} kg halten/reduzieren`;
 return `${last.weight} kg halten, Reps steigern`;
}
function prFor(ex){let arr=state.strengthSets.filter(x=>x.exercise===ex);if(!arr.length)return null;return arr.reduce((a,b)=>estLoad(b.weight,b.reps)>estLoad(a.weight,a.reps)?b:a)}
function strengthSeries(ex){return sessionsByDate(ex).map(x=>({label:x.date.slice(5),y:+estLoad(x.weight,x.reps).toFixed(1)}))}
function logSet(ex,key,ei,i){
 let w=+document.getElementById(`w_${key}_${ei}_${i}`).value||0,r=+document.getElementById(`r_${key}_${ei}_${i}`).value||0,rir=+document.getElementById(`q_${key}_${ei}_${i}`).value||0;
 if(!r)return;
 state.strengthSets.push({date:fmtDate(new Date()),session:key,exercise:ex,weight:w,reps:r,rir});
 save();
}
function isDeloadWeek(w){return DELOAD_WEEKS.includes(w)}

/* ===================== RUNNING ===================== */
function saveRun(){
 let dist=+runDist.value,time=+runTime.value; if(!dist||!time)return alert('Distanz und Zeit eingeben.');
 state.runs.push({date:runDate.value||fmtDate(new Date()),type:runType.value,dist,time,hr:+runHr.value||null,hrmax:+runHrMax.value||null,rpe:+runRpe.value||null,elevation:+runElev.value||null,note:runNote.value});
 save();
 runDist.value='';runTime.value='';runHr.value='';runHrMax.value='';runRpe.value='';runElev.value='';runNote.value='';
}
function sortedRuns(){return [...state.runs].sort((a,b)=>a.date.localeCompare(b.date))}
function runsInLastDays(n){let cut=new Date();cut.setDate(cut.getDate()-n+1);let cutS=fmtDate(cut);return state.runs.filter(r=>r.date>=cutS)}
function kmInLastDays(n){return runsInLastDays(n).reduce((a,r)=>a+r.dist,0)}
function bestExact(lo,hi){let arr=state.runs.filter(r=>r.dist>=lo&&r.dist<=hi);if(!arr.length)return null;return arr.reduce((a,b)=>b.time<a.time?b:a)}
function autoBest5k(){return bestExact(4.85,5.25)}
function autoBest10k(){return bestExact(9.7,10.4)}
function autoBestHM(){return bestExact(20.5,21.6)}
function bestTimeSource(auto,overrideVal){
 // returns {time, source: 'measured'|'manual'|null}
 if(auto) return {time:auto.time, source:'measured', date:auto.date};
 if(overrideVal) return {time:+overrideVal, source:'manual', date:null};
 return null;
}
function predictedTime(t,d1,d2){return t*Math.pow(d2/d1,1.06)} // Riegel formula
function longestRunEver(){let arr=state.runs.filter(r=>r.type!=='Test/Race'||true);if(!arr.length)return 0;return Math.max(...arr.map(r=>r.dist))}
function latestLongRun(){let lr=sortedRuns().filter(r=>r.type==='Long Run');return lr.length?lr.at(-1):null}
function consistency4Weeks(){
 // % of planned run+strength days in the last 28 days that are marked done
 let cut=new Date();cut.setDate(cut.getDate()-28);let cutS=fmtDate(cut);let today=fmtDate(new Date());
 let relevant=plan.filter(x=>x.type!=='rest'&&x.date>=cutS&&x.date<=today);
 if(!relevant.length)return 1;
 return relevant.filter(x=>state.done[x.date]).length/relevant.length;
}
function renderRunDashboard(){
 let last7=kmInLastDays(7),last30=kmInLastDays(30);
 let sorted=sortedRuns(); let easyRuns=sorted.filter(r=>r.type==='Easy');
 let avgPace=sorted.length?sorted.reduce((a,r)=>a+pace(r.time,r.dist),0)/sorted.length:null;
 let easyPace=easyRuns.length?easyRuns.reduce((a,r)=>a+pace(r.time,r.dist),0)/easyRuns.length:null;
 let avgHr=sorted.filter(r=>r.hr).length?Math.round(sorted.filter(r=>r.hr).reduce((a,r)=>a+r.hr,0)/sorted.filter(r=>r.hr).length):null;
 document.getElementById('runDashboard').innerHTML=`<div class="grid">
  <div class="card"><div class="label">7-Tage-km</div><div class="value">${last7.toFixed(1)}</div></div>
  <div class="card"><div class="label">30-Tage-km</div><div class="value">${last30.toFixed(1)}</div></div>
  <div class="card"><div class="label">Ø Pace</div><div class="value">${avgPace?paceText(avgPace):'—'}</div></div>
  <div class="card"><div class="label">Easy-Pace</div><div class="value">${easyPace?paceText(easyPace):'—'}</div></div>
  <div class="card"><div class="label">Längster Lauf</div><div class="value">${longestRunEver().toFixed(1)} km</div></div>
  <div class="card"><div class="label">Ø HF</div><div class="value">${avgHr||'—'}</div></div>
 </div>`;
}
function renderAerobicEfficiency(){
 let easy=sortedRuns().filter(r=>r.type==='Easy'&&r.hr);
 if(easy.length<2){document.getElementById('aerobicBox').innerHTML='<div class="muted small">Mindestens 2 Easy Runs mit Herzfrequenz nötig, um aerobe Trends zu vergleichen.</div>';return;}
 let recent=easy.slice(-4);
 let rows=recent.map(r=>{let p=pace(r.time,r.dist); return `<tr><td>${r.date}</td><td>${r.dist} km</td><td>${paceText(p)}</td><td>${r.hr}</td><td>${(p*r.hr/10).toFixed(1)}</td></tr>`}).join('');
 let first=recent[0],last=recent.at(-1),pf=pace(first.time,first.dist),pl=pace(last.time,last.dist);
 let improving = pl<=pf && last.hr<=first.hr;
 let mixed = (pl<pf && last.hr>first.hr) || (pl>pf && last.hr<first.hr);
 let note = improving?'Deine Pace bei ähnlicher/niedrigerer Herzfrequenz verbessert sich — ein gutes Zeichen für aerobe Fitness.':mixed?'Pace und Herzfrequenz entwickeln sich in unterschiedliche Richtungen — noch kein klarer Trend.':'Kein klarer Effizienzgewinn in den letzten Easy Runs erkennbar.';
 document.getElementById('aerobicBox').innerHTML=`<div class="tablewrap"><table class="settable"><tr><th>Datum</th><th>km</th><th>Pace</th><th>HF</th><th>Pace×HF/10</th></tr>${rows}</table></div><div class="notice small" style="margin-top:8px">${note} <span class="tag tag-estimate">Schätzung</span></div>`;
}

/* ===================== MARATHON PROJECTION ===================== */
function computeProjection(){
 let auto5=autoBest5k(),auto10=autoBest10k(),autoHM=autoBestHM();
 let b5=bestTimeSource(auto5,state.raceInputs.test5Override);
 let b10=bestTimeSource(auto10,state.raceInputs.test10Override);
 let bHM=bestTimeSource(autoHM,state.raceInputs.testHMOverride);
 let theo=null,theoSrc=null,theoFrom=null;
 if(bHM){theo=predictedTime(bHM.time,21.0975,42.195);theoSrc=bHM.source;theoFrom='Halbmarathon';}
 else if(b10){theo=predictedTime(b10.time,10,42.195);theoSrc=b10.source;theoFrom='10 km';}
 else if(b5){theo=predictedTime(b5.time,5,42.195);theoSrc=b5.source;theoFrom='5 km';}
 let last7=kmInLastDays(7); let w=weekForDate(fmtDate(new Date())); let plannedKm=plannedWeeklyKm(w);
 let longest=longestRunEver(); let consistency=consistency4Weeks();
 let volFactor=clamp((plannedKm?last7/plannedKm:last7/45),0.55,1.15);
 let longFactor=clamp(longest/32,0.55,1.1);
 let consFactor=clamp(0.6+consistency*0.5,0.6,1.05);
 let combined=volFactor*0.4+longFactor*0.35+consFactor*0.25;
 let trainingLow=null,trainingHigh=null,probability=null;
 if(theo){
  let adj=theo/clamp(combined,0.55,1.15);
  trainingLow=adj*0.97; trainingHigh=adj*1.09;
  let mean=(trainingLow+trainingHigh)/2, spread=Math.max((trainingHigh-trainingLow)/2,5);
  let z=(TARGET-mean)/spread;
  probability=Math.round(clamp(1/(1+Math.exp(-z*1.15)),0.03,0.97)*100);
 }
 return {theo,theoSrc,theoFrom,trainingLow,trainingHigh,probability,volFactor,longFactor,consFactor,last7,plannedKm,longest,consistency};
}
function renderProjection(target){
 let p=computeProjection();
 if(!p.theo){document.getElementById(target).innerHTML='<div class="muted small">Noch keine 5-km-/10-km-/Halbmarathon-Zeit vorhanden. Trage einen Testlauf ein oder hinterlege eine manuelle Bestzeit.</div>';return p;}
 let srcTag=p.theoSrc==='measured'?'<span class="tag tag-measured">gemessen</span>':'<span class="tag tag-manual">manuell</span>';
 document.getElementById(target).innerHTML=`
  <div class="small">Theoretisch (Riegel-Formel, aus ${p.theoFrom}) ${srcTag}</div>
  <div class="value">${minToTime(p.theo)}</div>
  <hr>
  <div class="small">Trainingsbasierte Schätzung <span class="tag tag-forecast">Prognose</span></div>
  <div class="value">${minToTime(p.trainingLow)} – ${minToTime(p.trainingHigh)}</div>
  <div class="small muted">berücksichtigt Wochenkilometer (${p.last7.toFixed(0)}/${p.plannedKm||'–'} geplant), längsten Lauf (${p.longest.toFixed(0)} km), Konsistenz (${Math.round(p.consistency*100)}%)</div>
  <hr>
  <div class="small">Zielwahrscheinlichkeit für 4:00 h <span class="tag tag-estimate">grobe Heuristik</span></div>
  <div class="value">${p.probability}%</div>
  <div class="small muted">Keine echte Statistik — eine grobe Einordnung, wie dein Zieltempo im Verhältnis zur trainingsbasierten Spanne liegt.</div>`;
 return p;
}

/* ===================== TRAINING LOAD / FATIGUE ===================== */
function dailyLoad(){
 let loads={};
 for(const r of state.runs){loads[r.date]=(loads[r.date]||0)+(r.time||0)*(r.rpe||5)}
 let byDate={}; for(const s of state.strengthSets){(byDate[s.date]=byDate[s.date]||[]).push(s)}
 for(const [d,sets] of Object.entries(byDate)){let vol=sets.reduce((a,x)=>a+x.weight*x.reps,0); loads[d]=(loads[d]||0)+vol/6}
 return loads;
}
function loadSum(days){let loads=dailyLoad(),today=new Date(),s=0;for(let i=0;i<days;i++){let d=new Date(today);d.setDate(d.getDate()-i);s+=loads[fmtDate(d)]||0}return s/days}
function acwr(){let a=loadSum(7),c=loadSum(28);return c?a/c:null}
function loadCategory(){let r=acwr();if(r==null)return {label:'Zu wenig Daten',cls:''};if(r<0.8)return {label:'Niedrig',cls:'good'};if(r<=1.3)return {label:'Moderat',cls:''};if(r<=1.5)return {label:'Hoch',cls:'warn'};return {label:'Sehr hoch',cls:'bad'}}
function weeklyLoad(){let loads=dailyLoad(),map={};for(const [d,v] of Object.entries(loads)){let w=weekForDate(d);map[w]=(map[w]||0)+v}return Object.keys(map).map(Number).sort((a,b)=>a-b).map(w=>({label:`W${w}`,y:Math.round(map[w])}))}

/* ===================== WARNINGS ===================== */
function computeWarnings(){
 let warn=[]; let pos=[];
 let last7=kmInLastDays(7); let prev21=kmInLastDays(28)-last7; let prevAvg=prev21/3;
 if(prevAvg>3 && last7>prevAvg*1.3) warn.push(`Deine Laufbelastung diese Woche (${last7.toFixed(0)} km) ist deutlich höher als dein bisheriger Schnitt (${prevAvg.toFixed(0)} km/Woche).`);
 let longRuns=sortedRuns().filter(r=>r.type==='Long Run');
 if(longRuns.length>=2){let a=longRuns.at(-2),b=longRuns.at(-1); if(b.dist>a.dist*1.25) warn.push(`Dein letzter Long Run (${b.dist} km) ist deutlich weiter als der davor (${a.dist} km).`);}
 let recentRpe=sortedRuns().slice(-3).filter(r=>r.rpe); let olderRpe=sortedRuns().slice(-8,-3).filter(r=>r.rpe);
 if(recentRpe.length&&olderRpe.length){let ra=recentRpe.reduce((a,r)=>a+r.rpe,0)/recentRpe.length, oa=olderRpe.reduce((a,r)=>a+r.rpe,0)/olderRpe.length; if(ra-oa>=1.5) warn.push('Dein RPE ist in den letzten Läufen spürbar höher als zuvor.');}
 for(const ex of ['Weighted Pull-ups','Weighted Dips']){
  let s=sessionsByDate(ex).slice(-3);
  if(s.length===3 && estLoad(s[0].weight,s[0].reps)>estLoad(s[1].weight,s[1].reps) && estLoad(s[1].weight,s[1].reps)>estLoad(s[2].weight,s[2].reps))
   warn.push(`Deine ${ex}-Leistung ist in den letzten 3 Einheiten gefallen.`);
 }
 let cat=loadCategory();
 if(cat.label==='Sehr hoch') warn.push('Deine aktuelle Trainingsbelastung ist sehr hoch. Zusätzliches Volumen diese Woche eher vermeiden.');
 let easy=sortedRuns().filter(r=>r.type==='Easy'&&r.hr);
 if(easy.length>=4){let r=easy.slice(-4);let f=r[0],l=r.at(-1);let pf=pace(f.time,f.dist),pl=pace(l.time,l.dist); if(pl>pf*1.05 && l.hr>=f.hr) warn.push('Bei ähnlicher Herzfrequenz bist du zuletzt langsamer gelaufen als zuvor — mögliches Ermüdungszeichen.'); else if(pl<=pf && l.hr<f.hr) pos.push('Bei ähnlicher/niedrigerer Herzfrequenz läufst du zuletzt schneller — aerobe Fitness verbessert sich.');}
 return {warn,pos};
}

/* ===================== READINESS SCORE ===================== */
function computeReadiness(){
 let p=computeProjection(); let pos=[],neg=[]; let score=50;
 if(p.theo){
  let mean=(p.trainingLow+p.trainingHigh)/2;
  if(mean<=TARGET){let margin=clamp((TARGET-mean)/20,0,1); score+=Math.round(margin*20); pos.push(`Trainingsbasierte Prognose (${minToTime(mean)}) liegt unter deinem 4:00h-Ziel.`);}
  else {let margin=clamp((mean-TARGET)/20,0,1); score-=Math.round(margin*20); neg.push(`Trainingsbasierte Prognose (${minToTime(mean)}) liegt aktuell über deinem 4:00h-Ziel.`);}
 } else neg.push('Noch keine Testzeit (5/10 km) vorhanden — Prognose unsicher.');
 if(p.plannedKm){ let ratio=p.last7/p.plannedKm; if(ratio>=0.9){score+=10; pos.push(`Wochenkilometer (${p.last7.toFixed(0)} km) nah am Plan (${p.plannedKm} km).`);} else {score-=Math.round((1-ratio)*15); neg.push(`Wochenkilometer (${p.last7.toFixed(0)} km) liegen unter dem Plan (${p.plannedKm} km).`);} }
 if(p.longest>=20){score+=10; pos.push(`Längster Lauf bisher: ${p.longest.toFixed(0)} km.`);} else {score-=8; neg.push(`Längster Lauf bisher nur ${p.longest.toFixed(0)} km — noch deutlich unter Marathon-Distanz.`);}
 let consBonus=Math.round((p.consistency-0.5)*30); score+=consBonus;
 if(p.consistency>=0.75) pos.push(`Trainingskonsistenz gut (${Math.round(p.consistency*100)}% der letzten 4 Wochen).`);
 else neg.push(`Trainingskonsistenz zuletzt schwächer (${Math.round(p.consistency*100)}%).`);
 let cat=loadCategory();
 if(cat.label==='Sehr hoch'){score-=10; neg.push('Trainingsbelastung aktuell sehr hoch.');}
 else if(cat.label==='Niedrig'&&state.runs.length>3){neg.push('Belastung aktuell eher niedrig — evtl. Reserven für mehr Umfang.');}
 let puTrend=sessionsByDate('Weighted Pull-ups').slice(-3);
 if(puTrend.length===3){ let inc=estLoad(puTrend[2].weight,puTrend[2].reps)>estLoad(puTrend[0].weight,puTrend[0].reps); if(inc){score+=5;pos.push('Weighted Pull-ups entwickeln sich positiv.');} else {score-=5;neg.push('Weighted Pull-ups stagnieren/sinken zuletzt.');} }
 score=Math.round(clamp(score,0,100));
 return {score,pos,neg};
}
function recordDailySnapshots(){
 let today=fmtDate(new Date());
 let r=computeReadiness(); let last=state.readinessHistory.at(-1);
 if(last&&last.date===today){ if(last.score!==r.score){last.score=r.score;persist();} } else { state.readinessHistory.push({date:today,score:r.score}); if(state.readinessHistory.length>200)state.readinessHistory.shift(); persist(); }
 let p=computeProjection();
 if(p.theo){ let lastP=state.projHistory.at(-1);
  if(lastP&&lastP.date===today){ lastP.theoretical=p.theo; lastP.low=p.trainingLow; lastP.high=p.trainingHigh; persist(); }
  else { state.projHistory.push({date:today,theoretical:p.theo,low:p.trainingLow,high:p.trainingHigh}); if(state.projHistory.length>200)state.projHistory.shift(); persist(); }
 }
 return r;
}

/* ===================== WEEKLY REPORT ===================== */
function weekBounds(w){let s=isoWeekStart(w-1);let e=new Date(s);e.setDate(e.getDate()+6);return [fmtDate(s),fmtDate(e)]}
function weeklyReport(w){
 let [ws,we]=weekBounds(w);
 let runsW=state.runs.filter(r=>r.date>=ws&&r.date<=we);
 let actualKm=+runsW.reduce((a,r)=>a+r.dist,0).toFixed(1);
 let plannedKm=plannedWeeklyKm(w);
 let longRun=runsW.filter(r=>r.type==='Long Run').sort((a,b)=>b.dist-a.dist)[0];
 let avgRpe=runsW.filter(r=>r.rpe).length?(runsW.filter(r=>r.rpe).reduce((a,r)=>a+r.rpe,0)/runsW.filter(r=>r.rpe).length).toFixed(1):'—';
 let setsW=state.strengthSets.filter(s=>s.date>=ws&&s.date<=we);
 let puBest=setsW.filter(s=>s.exercise==='Weighted Pull-ups').sort((a,b)=>estLoad(b.weight,b.reps)-estLoad(a.weight,a.reps))[0];
 let dipBest=setsW.filter(s=>s.exercise==='Weighted Dips').sort((a,b)=>estLoad(b.weight,b.reps)-estLoad(a.weight,a.reps))[0];
 let weightsW=state.weights.filter(x=>x.date>=ws&&x.date<=we);
 let avgW=weightsW.length?(weightsW.reduce((a,x)=>a+x.weight,0)/weightsW.length).toFixed(1):null;
 let [ps,pe]=weekBounds(w-1); let prevW=state.weights.filter(x=>x.date>=ps&&x.date<=pe);
 let prevAvgW=prevW.length?(prevW.reduce((a,x)=>a+x.weight,0)/prevW.length):null;
 let change=avgW&&prevAvgW?(avgW-prevAvgW).toFixed(1):null;
 let r=computeReadiness();
 let fazit = actualKm>=plannedKm*0.85 ? 'Deine Ausdauer entwickelt sich planmäßig.' : 'Diese Woche liegst du unter dem geplanten Umfang.';
 let cat=loadCategory();
 let empfehlung = cat.label==='Sehr hoch' ? 'Nächste Woche eher kein zusätzliches Kraftvolumen, Fokus auf Lauf-Grundlagen und Regeneration.' : actualKm<plannedKm*0.7 ? 'Nächste Woche versuchen, näher an den geplanten Umfang heranzukommen.' : 'Plan wie vorgesehen fortsetzen.';
 return {w,plannedKm,actualKm,longRun,avgRpe,puBest,dipBest,avgW,change,readiness:r.score,fazit,empfehlung};
}
function renderWeeklyReport(){
 let w=weekForDate(fmtDate(new Date()));
 let r=weeklyReport(w);
 document.getElementById('weeklyReportBox').innerHTML=`<div class="small"><b>Woche ${r.w}</b></div>
 <div class="small" style="margin-top:6px"><b>Running</b><br>${r.plannedKm} km geplant • ${r.actualKm} km absolviert${r.longRun?` • Long Run: ${r.longRun.dist} km`:''} • Ø RPE: ${r.avgRpe}</div>
 <div class="small" style="margin-top:6px"><b>Strength</b><br>Pull-up: ${r.puBest?r.puBest.weight+' kg × '+r.puBest.reps:'—'} • Dip: ${r.dipBest?r.dipBest.weight+' kg × '+r.dipBest.reps:'—'}</div>
 <div class="small" style="margin-top:6px"><b>Gewicht</b><br>Ø diese Woche: ${r.avgW||'—'} kg${r.change!=null?` • Änderung: ${r.change>0?'+':''}${r.change} kg`:''}</div>
 <div class="small" style="margin-top:6px"><b>Readiness</b><br>${r.readiness}/100</div>
 <div class="notice" style="margin-top:8px"><b>Fazit:</b> ${r.fazit}<br><b>Empfehlung:</b> ${r.empfehlung}</div>`;
}

/* ===================== NUTRITION ===================== */
function calculateNutrition(){
 let a=+age.value,h=+height.value,w=+weightProfile.value,s=sex.value,act=+activity.value,gain=+gainRate.value,protRate=+proteinRate.value;
 state.profile={age:a,height:h,weight:w,sex:s,activity:act,gainRate:gain,proteinRate:protRate,startWeight:state.profile.startWeight||w,startDate:state.profile.startDate||fmtDate(new Date())};
 persist();
 renderNutritionResult();
}
function bmrMifflin(a,h,w,s){return s==='m'? (10*w+6.25*h-5*a+5) : (10*w+6.25*h-5*a-161)}
function renderNutritionResult(){
 let p=state.profile; if(!p.weight){document.getElementById('nutritionResult').innerHTML='';return;}
 let bmr=bmrMifflin(p.age,p.height,p.weight,p.sex); let tdee=bmr*p.activity;
 let target=Math.round(tdee + p.gainRate*7700/7);
 let protein=Math.round(p.weight*p.proteinRate);
 // adjust based on actual weight trend if enough data
 let adjNote='';
 let recentW=state.weights.slice(-14);
 if(recentW.length>=6){
  let first=recentW[0].weight,last=recentW.at(-1).weight; let days=diffDays(recentW[0].date,recentW.at(-1).date)||1;
  let weeklyChange=(last-first)/days*7;
  if(weeklyChange < p.gainRate*0.5){ target+=150; adjNote=`Dein Gewicht steigt zuletzt langsamer (${weeklyChange.toFixed(2)} kg/Woche) als dein Ziel (${p.gainRate} kg/Woche) — Kalorienziel wurde automatisch um ca. +150 kcal angepasst.`; }
  else if(weeklyChange > p.gainRate*1.8){ target-=150; adjNote=`Dein Gewicht steigt zuletzt schneller (${weeklyChange.toFixed(2)} kg/Woche) als geplant — Kalorienziel wurde automatisch um ca. −150 kcal angepasst.`; }
  else adjNote=`Deine tatsächliche Gewichtsentwicklung (${weeklyChange.toFixed(2)} kg/Woche) passt gut zu deinem Ziel — keine Anpassung nötig.`;
 } else adjNote='Noch nicht genug Gewichtsdaten (mind. ~2 Wochen) für eine automatische Anpassung. Aktuell Startschätzung.';
 document.getElementById('nutritionResult').innerHTML=`<div class="card"><div class="subtitle">Kalorienschätzung <span class="tag tag-estimate">Schätzung</span></div>
  <div class="grid"><div class="card"><div class="label">BMR</div><div class="value">${Math.round(bmr)}</div></div><div class="card"><div class="label">TDEE</div><div class="value">${Math.round(tdee)}</div></div>
  <div class="card"><div class="label">Kalorienziel</div><div class="value">${target}</div></div><div class="card"><div class="label">Protein</div><div class="value">${protein} g</div></div></div>
  <div class="notice small">${adjNote}</div></div>`;
}

/* ===================== SVG CHARTS ===================== */
function svgLine(points,{w=600,h=180,color='#111827',pad=30,fill=false,fmt=v=>v}={}){
 if(!points.length)return '<div class="muted small">Noch keine Daten.</div>';
 let ys=points.map(p=>p.y),minY=Math.min(...ys),maxY=Math.max(...ys); if(minY===maxY){minY-=1;maxY+=1}
 let x=i=>pad+(w-2*pad)*(points.length===1?0.5:i/(points.length-1));
 let y=v=>h-pad-(h-2*pad)*(v-minY)/(maxY-minY);
 let d=points.map((p,i)=>`${i===0?'M':'L'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
 let dots=points.map((p,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="3" fill="${color}"></circle>`).join('');
 let area=fill?`<path d="${d} L${x(points.length-1).toFixed(1)},${h-pad} L${x(0).toFixed(1)},${h-pad} Z" fill="${color}" opacity="0.08"></path>`:'';
 return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block"><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#e5e7eb"></line>${area}<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5"></path>${dots}<text x="${pad}" y="${pad-10}" font-size="11" fill="#6b7280">${fmt(maxY)}</text><text x="${pad}" y="${h-pad+18}" font-size="11" fill="#6b7280">${points[0].label||''}</text><text x="${w-pad}" y="${h-pad+18}" font-size="11" fill="#6b7280" text-anchor="end">${points.at(-1).label||''}</text></svg>`;
}
function svgMultiLine(seriesArr,{w=600,h=200,pad=30}={}){
 let all=seriesArr.flatMap(s=>s.points); if(!all.length)return '<div class="muted small">Noch keine Daten.</div>';
 let ys=all.map(p=>p.y),minY=Math.min(...ys),maxY=Math.max(...ys); if(minY===maxY){minY-=1;maxY+=1}
 let y=v=>h-pad-(h-2*pad)*(v-minY)/(maxY-minY);
 let paths=seriesArr.map(s=>{ if(!s.points.length)return '';
  let x=i=>pad+(w-2*pad)*(s.points.length===1?0.5:i/(s.points.length-1));
  let d=s.points.map((p,i)=>`${i===0?'M':'L'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5"></path>`;
 }).join('');
 let legend=seriesArr.map(s=>`<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px"><span style="width:9px;height:9px;border-radius:50%;background:${s.color};display:inline-block"></span>${s.name}</span>`).join('');
 return `<div class="small" style="margin-bottom:8px">${legend}</div><svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block"><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#e5e7eb"></line>${paths}</svg>`;
}
function svgBars(bars,{w=600,h=180,color='#111827',pad=28}={}){
 if(!bars.length)return '<div class="muted small">Noch keine Daten.</div>';
 let maxV=Math.max(...bars.map(b=>b.y),1),gap=(w-2*pad)/bars.length,bw=gap*0.6;
 let rects=bars.map((b,i)=>{let bh=(h-2*pad)*(b.y/maxV),x0=pad+i*gap+(gap-bw)/2,y0=h-pad-bh;
  return `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1,bh).toFixed(1)}" rx="4" fill="${b.color||color}"></rect><text x="${(x0+bw/2).toFixed(1)}" y="${h-pad+16}" font-size="10" fill="#6b7280" text-anchor="middle">${b.label}</text>`;
 }).join('');
 return `<svg viewBox="0 0 ${w} ${h+6}" style="width:100%;height:auto;display:block"><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#e5e7eb"></line>${rects}</svg>`;
}
function svgGroupedBars(labels,seriesArr,{w=600,h=190,pad=30}={}){
 if(!labels.length)return '<div class="muted small">Noch keine Daten.</div>';
 let maxV=Math.max(...seriesArr.flatMap(s=>s.values),1); let gap=(w-2*pad)/labels.length; let bw=gap/(seriesArr.length+1);
 let rects=labels.map((lab,i)=>seriesArr.map((s,si)=>{let v=s.values[i]||0;let bh=(h-2*pad)*(v/maxV);let x0=pad+i*gap+bw*0.5+si*bw;let y0=h-pad-bh;
   return `<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${(bw*0.85).toFixed(1)}" height="${Math.max(1,bh).toFixed(1)}" rx="3" fill="${s.color}"></rect>`}).join('')+`<text x="${(pad+i*gap+gap/2).toFixed(1)}" y="${h-pad+16}" font-size="10" fill="#6b7280" text-anchor="middle">${lab}</text>`).join('');
 let legend=seriesArr.map(s=>`<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px"><span style="width:9px;height:9px;border-radius:2px;background:${s.color};display:inline-block"></span>${s.name}</span>`).join('');
 return `<div class="small" style="margin-bottom:8px">${legend}</div><svg viewBox="0 0 ${w} ${h+6}" style="width:100%;height:auto;display:block"><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#e5e7eb"></line>${rects}</svg>`;
}

/* ===================== RENDER: DASHBOARD ===================== */
function renderDashboard(){
 let today=new Date(); let raceD=dateObj(RACE); let days=diffDays(fmtDate(today),RACE);
 document.getElementById('countdown').textContent = days>=0?`${days} Tage bis Marathon`:'Marathon war';
 document.getElementById('heroSub').textContent=`Ziel: 4:00 h (5:41 /km) • ${fmtDate(today)}`;
 let r=recordDailySnapshots();
 document.getElementById('readinessScore').textContent=r.score+'/100';
 document.getElementById('readinessMeter').style.width=r.score+'%';
 document.getElementById('readinessReasons').innerHTML=
  (r.pos.length?`<ul class="reasonlist pos">${r.pos.map(x=>`<li>${x}</li>`).join('')}</ul>`:'')+
  (r.neg.length?`<ul class="reasonlist neg">${r.neg.map(x=>`<li>${x}</li>`).join('')}</ul>`:'');
 renderProjection('projectionBox');
 let w=weekForDate(fmtDate(today)); let plannedKm=plannedWeeklyKm(w); let last7=kmInLastDays(7);
 document.getElementById('dashWeekKm').textContent=`${last7.toFixed(0)}/${plannedKm}`;
 document.getElementById('dashWeekKmSub').textContent=`Woche ${w} von 16`;
 document.getElementById('dashLongRun').textContent=weekPlanData[w-1][0]+' km';
 let cat=loadCategory();
 document.getElementById('dashLoad').innerHTML=`<span class="${cat.cls}">${cat.label}</span>`;
 let lastW=state.weights.at(-1);
 document.getElementById('dashWeight').textContent=lastW?lastW.weight+' kg':'—';
 document.getElementById('dashWeightSub').textContent=lastW?lastW.date:'noch kein Eintrag';
 let todayStr=fmtDate(today); let todayPlan=plan.find(p=>p.date===todayStr) || plan.filter(p=>p.date>todayStr)[0];
 if(todayPlan) document.getElementById('nextWorkout').innerHTML=`<div class="date">${todayPlan.date===todayStr?'Heute':todayPlan.date}</div><b>${todayPlan.name}</b><div class="small muted">${todayPlan.detail}</div><div class="btnrow"><button class="secondary" onclick="go('${todayPlan.type==='strength'?'strength':todayPlan.type==='run'?'running':'plan'}')">Öffnen</button></div>`;
 let warnings=computeWarnings();
 document.getElementById('warningsBox').innerHTML = warnings.warn.length
  ? warnings.warn.map(x=>`<div class="notice warn">⚠️ ${x}</div>`).join('') + warnings.pos.map(x=>`<div class="notice good">✅ ${x}</div>`).join('')
  : `<div class="notice good">Aktuell keine Warnzeichen erkannt.</div>` + warnings.pos.map(x=>`<div class="notice good">✅ ${x}</div>`).join('');
}

/* ===================== RENDER: PLAN ===================== */
function initWeekSelect(){ if(weekSelect.options.length)return; for(let i=1;i<=16;i++){let o=document.createElement('option');o.value=i;o.textContent=`Woche ${i}`;weekSelect.appendChild(o)} weekSelect.value=weekForDate(fmtDate(new Date())); }
function renderPlan(){
 initWeekSelect();
 let w=+weekSelect.value; let filter=planFilter.value;
 let days=plan.filter(p=>p.week===w && (filter==='all'||p.type===filter));
 let wp=weekPlanData[w-1];
 document.getElementById('weekSummary').innerHTML=`<div class="subtitle">Woche ${w}${isDeloadWeek(w)?' — Entlastungswoche':w===16?' — Marathon-Woche':w===13?' — Peak-Woche':''}</div><div class="small">Long Run: ${wp[0]} km • ${wp[1]} • Quality: ${wp[3]} km (${wp[2]}) • Easy: ${wp[4]} km</div>`;
 document.getElementById('planList').innerHTML=days.map(d=>`<div class="day"><div class="dayhead"><div><div class="date">${d.date}</div><b>${d.name}</b></div><span class="chip">${d.type}</span></div><div class="muted small">${d.detail}</div><div class="btnrow"><button class="secondary" onclick="toggleDone('${d.date}')">${state.done[d.date]?'✓ Erledigt':'Erledigt markieren'}</button>${d.type==='strength'?`<button class="secondary" onclick="go('strength')">Loggen</button>`:''}${d.type==='run'?`<button class="secondary" onclick="go('running')">Lauf loggen</button>`:''}</div></div>`).join('')||'<div class="muted small">Keine Tage in diesem Filter.</div>';
}
function toggleDone(d){state.done[d]=!state.done[d]; save();}

/* ===================== RENDER: STRENGTH ===================== */
function renderStrength(){
 let w=weekForDate(fmtDate(new Date()));
 document.getElementById('deloadBanner').innerHTML = isDeloadWeek(w) ? '<div class="notice warn">Diese Woche ist laut Plan eine Entlastungswoche — ruhig 1 Satz weniger oder etwas leichter trainieren.</div>' : '';
 let html='';
 for(const key of ['A','B','C']){
  let t=strengthTemplates[key];
  html+=`<details ${key==='A'?'open':''}><summary>${t.label}${key==='C'?' — bewusst leicht, direkt vor dem Long Run':''}</summary>`;
  t.exs.forEach((ex,ei)=>{
   let [name,sets,minR,maxR]=ex;
   html+=`<div class="card"><div class="small" style="display:flex;justify-content:space-between"><b>${name}</b><span class="muted">${sets}×${minR}–${maxR}</span></div>
    <div class="small muted" style="margin:4px 0 8px">Empfehlung: ${progression(name,maxR,minR)}</div>`;
   for(let i=0;i<sets;i++){
    html+=`<div class="three" style="margin-bottom:6px"><input id="w_${key}_${ei}_${i}" type="number" placeholder="kg" step="0.5"><input id="r_${key}_${ei}_${i}" type="number" placeholder="Wdh"><input id="q_${key}_${ei}_${i}" type="number" placeholder="RIR"></div>`;
   }
   html+=`<div class="btnrow">`;
   for(let i=0;i<sets;i++) html+=`<button class="secondary" onclick="logSet('${name}','${key}',${ei},${i})">Satz ${i+1} loggen</button>`;
   html+=`</div></div>`;
  });
  html+=`</details>`;
 }
 document.getElementById('strengthSessions').innerHTML=html;
 let hist=[...state.strengthSets].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,25);
 document.getElementById('strengthHistory').innerHTML = hist.length ? `<div class="tablewrap"><table class="settable"><tr><th>Datum</th><th>Übung</th><th>kg</th><th>Wdh</th><th>RIR</th></tr>${hist.map(s=>`<tr><td>${s.date}</td><td>${s.exercise}</td><td>${s.weight}</td><td>${s.reps}</td><td>${s.rir}</td></tr>`).join('')}</table></div>` : '<div class="muted small">Noch keine Sätze geloggt.</div>';
}

/* ===================== RENDER: RUNNING TAB ===================== */
function renderRunning(){
 renderRunDashboard(); renderAerobicEfficiency();
 let hist=sortedRuns().slice().reverse().slice(0,25);
 document.getElementById('runHistory').innerHTML = hist.length ? `<div class="tablewrap"><table class="settable"><tr><th>Datum</th><th>Art</th><th>km</th><th>Zeit</th><th>Pace</th><th>HF</th><th>RPE</th></tr>${hist.map(r=>`<tr><td>${r.date}</td><td>${r.type}</td><td>${r.dist}</td><td>${r.time}</td><td>${paceText(pace(r.time,r.dist))}</td><td>${r.hr||'—'}</td><td>${r.rpe||'—'}</td></tr>`).join('')}</table></div>` : '<div class="muted small">Noch keine Läufe erfasst.</div>';
}

/* ===================== RENDER: MARATHON TAB ===================== */
function renderMarathonTab(){
 document.getElementById('raceDateText').textContent=RACE;
 let auto5=autoBest5k(),auto10=autoBest10k(),autoHM=autoBestHM();
 document.getElementById('autoBestTimes').innerHTML=`5 km: ${auto5?minToTime(auto5.time)+' ('+auto5.date+')':'—'} • 10 km: ${auto10?minToTime(auto10.time)+' ('+auto10.date+')':'—'} • HM: ${autoHM?minToTime(autoHM.time)+' ('+autoHM.date+')':'—'}`;
 test5Override.value=state.raceInputs.test5Override||''; test10Override.value=state.raceInputs.test10Override||''; testHMOverride.value=state.raceInputs.testHMOverride||'';
 renderProjection('marathonProjectionFull');
 let r=computeReadiness();
 document.getElementById('marathonReadinessFull').innerHTML=`<div class="score">${r.score}/100</div><div class="meter"><div style="width:${r.score}%"></div></div>`+
  (r.pos.length?`<ul class="reasonlist pos">${r.pos.map(x=>`<li>${x}</li>`).join('')}</ul>`:'')+(r.neg.length?`<ul class="reasonlist neg">${r.neg.map(x=>`<li>${x}</li>`).join('')}</ul>`:'');
 renderWeeklyReport();
}
function saveOverrides(){
 state.raceInputs.test5Override=+test5Override.value||null;
 state.raceInputs.test10Override=+test10Override.value||null;
 state.raceInputs.testHMOverride=+testHMOverride.value||null;
 save();
}

/* ===================== RENDER: WEIGHT/NUTRITION ===================== */
function saveWeight(){
 let w=+weightInput.value; if(!w)return;
 state.weights.push({date:weightDate.value||fmtDate(new Date()),weight:w});
 state.weights.sort((a,b)=>a.date.localeCompare(b.date));
 save(); weightInput.value='';
}
function renderWeightDashboard(){
 let ws=state.weights;
 let last=ws.at(-1); let avg7=ws.slice(-7); let avg14=ws.slice(-14);
 let a7=avg7.length?(avg7.reduce((a,x)=>a+x.weight,0)/avg7.length).toFixed(1):null;
 let a14=avg14.length?(avg14.reduce((a,x)=>a+x.weight,0)/avg14.length).toFixed(1):null;
 let weekChange=ws.length>=8?(ws.at(-1).weight-ws.at(-8).weight).toFixed(1):null;
 let sinceStart = state.profile.startWeight && last ? (last.weight-state.profile.startWeight).toFixed(1) : null;
 document.getElementById('weightDashboard').innerHTML=`<div class="grid">
  <div class="card"><div class="label">Aktuell</div><div class="value">${last?last.weight+' kg':'—'}</div></div>
  <div class="card"><div class="label">7-Tage-Ø</div><div class="value">${a7?a7+' kg':'—'}</div></div>
  <div class="card"><div class="label">14-Tage-Ø</div><div class="value">${a14?a14+' kg':'—'}</div></div>
  <div class="card"><div class="label">Wochenänderung</div><div class="value">${weekChange!=null?(weekChange>0?'+':'')+weekChange+' kg':'—'}</div></div>
 </div>${sinceStart!=null?`<div class="small muted">Seit Start: ${sinceStart>0?'+':''}${sinceStart} kg</div>`:''}`;
 document.getElementById('weightHistory').innerHTML = ws.length? `<div class="tablewrap"><table class="settable"><tr><th>Datum</th><th>kg</th></tr>${[...ws].reverse().slice(0,20).map(x=>`<tr><td>${x.date}</td><td>${x.weight}</td></tr>`).join('')}</table></div>` : '<div class="muted small">Noch keine Gewichtseinträge.</div>';
 renderNutritionResult();
 if(state.profile.age){age.value=state.profile.age;height.value=state.profile.height;weightProfile.value=state.profile.weight;sex.value=state.profile.sex;activity.value=state.profile.activity;gainRate.value=state.profile.gainRate;proteinRate.value=state.profile.proteinRate;}
}

/* ===================== RENDER: PROGRESS ===================== */
function renderProgress(){
 document.getElementById('chartProjection').innerHTML=svgMultiLine([
  {name:'Theoretisch',color:'#2563eb',points:state.projHistory.map(p=>({label:p.date.slice(5),y:+p.theoretical.toFixed(0)}))},
  {name:'Training (niedrig)',color:'#15803d',points:state.projHistory.map(p=>({label:p.date.slice(5),y:+p.low.toFixed(0)}))},
  {name:'Training (hoch)',color:'#b45309',points:state.projHistory.map(p=>({label:p.date.slice(5),y:+p.high.toFixed(0)}))}
 ]);
 document.getElementById('chartReadiness').innerHTML=svgLine(state.readinessHistory.map(s=>({label:s.date.slice(5),y:s.score})),{color:'#2563eb',fill:true,fmt:v=>Math.round(v)+'/100'});
 let weeks=[...new Set(plan.map(p=>p.week))].filter(w=>weekForDate(fmtDate(new Date()))>=w-1 || state.runs.some(r=>weekForDate(r.date)===w));
 let labels=weeks.map(w=>`W${w}`);
 let plannedArr=weeks.map(w=>plannedWeeklyKm(w));
 let actualArr=weeks.map(w=>{let[ws,we]=weekBounds(w);return +state.runs.filter(r=>r.date>=ws&&r.date<=we).reduce((a,r)=>a+r.dist,0).toFixed(1)});
 document.getElementById('chartPlannedActual').innerHTML=svgGroupedBars(labels,[{name:'Geplant',color:'#e5e7eb',values:plannedArr},{name:'Absolviert',color:'#2563eb',values:actualArr}]);
 document.getElementById('chartLongRun').innerHTML=svgLine(sortedRuns().filter(r=>r.type==='Long Run').map(r=>({label:r.date.slice(5),y:r.dist})),{color:'#111827',fill:true,fmt:v=>v+' km'});
 document.getElementById('chartPace').innerHTML=svgLine(sortedRuns().map(r=>({label:r.date.slice(5),y:+pace(r.time,r.dist).toFixed(2)})),{color:'#b45309',fmt:v=>paceText(v)});
 document.getElementById('chartHr').innerHTML=svgLine(sortedRuns().filter(r=>r.hr).map(r=>({label:r.date.slice(5),y:r.hr})),{color:'#b91c1c',fmt:v=>Math.round(v)+' bpm'});
 document.getElementById('chartWeight').innerHTML=svgLine(state.weights.map(w=>({label:w.date.slice(5),y:w.weight})),{color:'#15803d',fill:true,fmt:v=>v.toFixed(1)+' kg'});
 document.getElementById('chartStrength').innerHTML=svgMultiLine([
  {name:'Weighted Pull-ups',color:'#111827',points:strengthSeries('Weighted Pull-ups')},
  {name:'Weighted Dips',color:'#b45309',points:strengthSeries('Weighted Dips')}
 ]);
 document.getElementById('chartLoad').innerHTML=svgBars(weeklyLoad(),{color:'#b91c1c'});
 let a=acwr();
 document.getElementById('acwrNote').innerHTML=a==null?'Noch nicht genug Daten für ein Belastungsverhältnis.':`Akut:Chronisch-Verhältnis: <b>${a.toFixed(2)}</b> (${loadCategory().label}) — grobe Schätzung, keine medizinische Bewertung.`;
 let prPU=prFor('Weighted Pull-ups'),prDip=prFor('Weighted Dips'),best5=autoBest5k(),best10=autoBest10k();
 document.getElementById('prList').innerHTML=`<div class="grid">
  <div class="card"><div class="label">Weighted Pull-ups</div><div class="value">${prPU?prPU.weight+' kg × '+prPU.reps:'—'}</div></div>
  <div class="card"><div class="label">Weighted Dips</div><div class="value">${prDip?prDip.weight+' kg × '+prDip.reps:'—'}</div></div>
  <div class="card"><div class="label">Beste 5 km</div><div class="value">${best5?minToTime(best5.time):'—'}</div></div>
  <div class="card"><div class="label">Beste 10 km</div><div class="value">${best10?minToTime(best10.time):'—'}</div></div>
 </div>`;
}

/* ===================== EXPORT / IMPORT ===================== */
function download(filename,content,type){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=filename;a.click();}
function exportData(){download('marathon-calisthenics-backup.json',JSON.stringify(state,null,2),'application/json');}
function importDataPrompt(){
 let inp=document.createElement('input');inp.type='file';inp.accept='application/json';
 inp.onchange=()=>{let f=inp.files[0];if(!f)return;let reader=new FileReader();reader.onload=()=>{try{let obj=JSON.parse(reader.result); state=Object.assign(emptyState(),obj); save(); alert('Import erfolgreich.');}catch(e){alert('Ungültige Datei.');}};reader.readAsText(f);};
 inp.click();
}
function toCsv(rows,headers){return [headers.join(','),...rows.map(r=>headers.map(h=>JSON.stringify(r[h]??'')).join(','))].join('\n')}
function exportRunsCsv(){download('runs.csv',toCsv(state.runs,['date','type','dist','time','hr','hrmax','rpe','elevation','note']),'text/csv');}
function exportStrengthCsv(){download('strength.csv',toCsv(state.strengthSets,['date','session','exercise','weight','reps','rir']),'text/csv');}
function exportGarminJson(){
 let workouts=plan.filter(p=>p.type!=='rest').map(p=>({date:p.date,type:p.type,name:p.name,detail:p.detail}));
 download('garmin-workouts.json',JSON.stringify(workouts,null,2),'application/json');
}
function exportICS(){
 let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Marathon Calisthenics v3//DE'];
 for(const p of plan){ if(p.type==='rest')continue;
  let d=p.date.replace(/-/g,'');
  lines.push('BEGIN:VEVENT',`UID:${p.date}-${p.type}@marathoncalisthenics`,`DTSTAMP:${d}T080000Z`,`DTSTART;VALUE=DATE:${d}`,`SUMMARY:${p.name}`,`DESCRIPTION:${p.detail}`,'END:VEVENT');
 }
 lines.push('END:VCALENDAR');
 download('trainingsplan.ics',lines.join('\r\n'),'text/calendar');
}
function resetAll(){ if(!confirm('Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden.'))return; state=emptyState(); save(); }

/* ===================== INIT ===================== */
function renderAll(){
 renderDashboard(); renderPlan(); renderStrength(); renderRunning(); renderMarathonTab(); renderWeightDashboard(); renderProgress();
 runDate.value=runDate.value||fmtDate(new Date()); weightDate.value=weightDate.value||fmtDate(new Date());
 document.getElementById('migrationNote').textContent = state.migratedFromV2 ? 'Deine V2-Daten (Läufe, Sets, Gewicht) wurden erfolgreich übernommen.' : 'Keine V2-Daten zum Migrieren gefunden — Start mit leerem Datensatz.';
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active')); b.classList.add('active');
 document.querySelectorAll('section').forEach(s=>s.classList.remove('activeSection'));
 document.getElementById(b.dataset.tab).classList.add('activeSection');
 window.scrollTo(0,0);
 if(b.dataset.tab==='progress')renderProgress();
}));
document.getElementById('planFilter')?.addEventListener('change',renderPlan);
document.getElementById('weekSelect')?.addEventListener('change',renderPlan);
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
renderAll();
