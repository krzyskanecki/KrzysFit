// KrzyśFit – einfache PWA für Trainingstracking (LocalStorage)
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const LS_KEY = 'krzysfit_data_v1';
const TODAY = new Date();

const defaultData = () => ({
  goals: { weekly: 3 },
  workouts: {}, // key: YYYY-MM-DD|A/B/C -> {exercises:{id:[{sets,reps,weight}]}}
  days: {},     // key: YYYY-MM-DD -> {done:bool, workout:"A|B|C"}
  weighins: {}, // key: YYYY-MM-DD -> weight
});

let db = JSON.parse(localStorage.getItem(LS_KEY) || 'null') || defaultData();

function save(){ localStorage.setItem(LS_KEY, JSON.stringify(db)); updateUI(); }

function fmtDate(d){ return d.toISOString().slice(0,10); }
function getWeekDates(date){
  const d = new Date(date);
  const day = (d.getDay()+6)%7; // Monday=0
  const monday = new Date(d); monday.setDate(d.getDate()-day);
  return [...Array(7)].map((_,i)=>{const x = new Date(monday); x.setDate(monday.getDate()+i); return x;});
}

function updateWeek(){
  const week = getWeekDates(TODAY);
  const goal = db.goals.weekly || 3;
  const wrap = $('#weekSummary');
  wrap.innerHTML = '';
  let doneCount = 0;
  week.forEach(d=>{
    const key = fmtDate(d);
    const dayData = db.days[key] || {};
    if(dayData.done) doneCount++;
    const el = document.createElement('div');
    el.className='day-card';
    el.innerHTML = `
      <div class="dow">${['Mo','Di','Mi','Do','Fr','Sa','So'][ (d.getDay()+6)%7 ]}</div>
      <div class="date">${key}</div>
      <div>${dayData.workout?('Workout '+dayData.workout):'-'}</div>
      <label class="done"><input type="checkbox" data-day="${key}" ${dayData.done?'checked':''}> erledigt</label>
    `;
    wrap.appendChild(el);
  });
  $('#statDays').textContent = `${doneCount} / ${goal}`;
  wrap.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
    cb.addEventListener('change', (e)=>{
      const day = e.target.getAttribute('data-day');
      db.days[day] = db.days[day] || {};
      db.days[day].done = e.target.checked;
      save();
    })
  });
}

function openWorkout(code){
  const container = $('#todayWorkoutContainer');
  const key = fmtDate(TODAY);
  db.days[key] = db.days[key] || { done:false };
  db.days[key].workout = code;
  const workoutId = `${key}|${code}`;
  db.workouts[workoutId] = db.workouts[workoutId] || { exercises:{} };

  const plan = getPlan()[code];
  container.innerHTML = `<h3>Workout ${code}</h3>`;
  plan.forEach(ex =>{
    const exId = ex.id;
    const list = db.workouts[workoutId].exercises[exId] || [];
    const totalSets = list.reduce((a,b)=>a+(b.sets||0),0);
    const totalReps = list.reduce((a,b)=>a+(b.reps||0),0);
    const totalVol  = list.reduce((a,b)=>a+((b.sets||0)*(b.reps||0)*(b.weight||0)),0);
    const exEl = document.createElement('div');
    exEl.className='exercise';
    exEl.innerHTML = `
      <h4>${ex.name}</h4>
      <div class="mini">${ex.cue}</div>
      <div class="mini">Video: <a href="${ex.video}" target="_blank">${new URL(ex.video).host}</a></div>
      <form data-ex="${exId}">
        <label>Sätze<input name="sets" type="number" min="1" step="1"></label>
        <label>Wdh<input name="reps" type="number" min="1" step="1"></label>
        <label>Gewicht (kg)<input name="weight" type="number" min="0" step="0.5"></label>
        <span></span><span></span><button>Eintrag speichern</button>
      </form>
      <div class="mini">Bisher: Sätze ${totalSets} · Wdh ${totalReps} · Volumen ${Math.round(totalVol)}</div>
    `;
    container.appendChild(exEl);
  });

  container.querySelectorAll('form').forEach(f=>{
    f.addEventListener('submit', (e)=>{
      e.preventDefault();
      const exId = f.getAttribute('data-ex');
      const sets = parseInt(f.sets.value||'0',10);
      const reps = parseInt(f.reps.value||'0',10);
      const weight = parseFloat(f.weight.value||'0');
      if(sets>0 && reps>0){
        db.workouts[workoutId].exercises[exId] = db.workouts[workoutId].exercises[exId] || [];
        db.workouts[workoutId].exercises[exId].push({sets,reps,weight});
        save();
        openWorkout(code); // refresh
      }
      f.reset();
    });
  });
  save();
}

function getPlan(){
  return {
    'A': [
      {id:'kb_deadlift', name:'Kettlebell Deadlift', cue:'Hüfte schiebt nach hinten, Rücken neutral.', video:'https://www.youtube.com/watch?v=a9O3hmAmHbs'},
      {id:'band_row', name:'Band Rudern', cue:'Schulterblätter „in die Hosentaschen“.', video:'https://www.youtube.com/watch?v=gpR_kAH9xrM'},
      {id:'kb_goblet_squat', name:'Kettlebell Goblet Squat', cue:'Bell nah an der Brust, Knie folgen Zehen.', video:'https://www.youtube.com/watch?v=BR4tlEE_A98'},
      {id:'kb_good_morning', name:'Hip Hinge / Good Morning', cue:'Hüftknick, keine Rundung im Rücken.', video:'https://www.youtube.com/watch?v=A42LMU4iQWM'},
      {id:'kb_floor_press', name:'Kettlebell Floor Press', cue:'Ellbogen kontrolliert zum Boden, neutraler Griff.', video:'https://www.physitrack.com/exercise-library/how-to-perform-the-floor-press-kettlebell-exercise'},
      {id:'core_dead_bug', name:'Core: Dead Bug', cue:'LWS auf den Boden drücken, langsam arbeiten.', video:'https://www.youtube.com/watch?v=l9HeyPs7fLw'}
    ],
    'B': [
      {id:'step_back_band_row', name:'Step‑Back + Band Row', cue:'Aktiver Schritt zurück, Zug zum Rippenbogen.', video:'https://www.youtube.com/watch?v=t2Xp-U0rhXY'},
      {id:'kb_swing', name:'Kettlebell Swing', cue:'Hüfte treibt, Arme passiv, Stand hoch.', video:'https://www.youtube.com/watch?v=pAWaNCsncZA'},
      {id:'shadow_box', name:'Shadow Boxing', cue:'Locker, Hände hoch, atmen/timen.', video:'https://www.youtube.com/watch?v=ou8SvZnk1Uo'},
      {id:'kb_march_hold', name:'Kettlebell March Hold', cue:'Rumpf fest, kein Hohlkreuz, Knie bis Hüfte.', video:'https://www.youtube.com/watch?v=edIzJHViuO0'},
      {id:'russian_twist', name:'Russian Twist', cue:'Ohne Schwung drehen, Bauch fest.', video:'https://www.facebook.com/nezeeradams/videos/1334901581623139/'},
      {id:'bird_dog', name:'Bird Dog', cue:'Langsam diagonal, Hüfte stabil.', video:'https://www.youtube.com/watch?v=4XLEnwUr1d8'}
    ],
    'C': [
      {id:'kb_split_squat', name:'Kettlebell Split Squat', cue:'Vorderes Knie über Fuß, Oberkörper aufrecht.', video:'https://www.youtube.com/watch?v=ay-BI261RqA'},
      {id:'band_chest_press', name:'Band Chest Press', cue:'Rippen unten, Ellbogen 30–45°, ruhig drücken.', video:'https://hitmymacros.com/exercises/resistance-band-rows/'},
      {id:'kb_row', name:'Kettlebell Row einarmig', cue:'Becken stabil, Zug zum Hüftkamm.', video:'https://www.tiktok.com/@ifbbproismaelestrada/video/7332720767752277253'},
      {id:'hip_thrust', name:'Hip Thrust / Glute Bridge', cue:'Fersen erden, oben Po fest.', video:'https://www.youtube.com/watch?v=G2ee_YW82fs'},
      {id:'pallof_press', name:'Pallof Press (Band)', cue:'Widerstand gegen Rotation halten.', video:'https://www.youtube.com/watch?v=gpR_kAH9xrM'},
      {id:'farmer_walk', name:'Farmer Walk', cue:'Aufrecht, kurze Schritte, Griff stark.', video:'https://www.facebook.com/kbmhvadimf/videos/832171926341003/'}
    ]
  };
}

function updateStats(){
  // Trainingstage diese Woche
  const week = getWeekDates(TODAY).map(fmtDate);
  const daysDone = week.filter(d=> db.days[d]?.done).length;
  $('#statDays').textContent = `${daysDone} / ${db.goals.weekly||3}`;

  // Volumen gesamt (letzte 14 Tage)
  let totalVol = 0;
  Object.entries(db.workouts).forEach(([k,w])=>{
    Object.values(w.exercises||{}).forEach(arr=>{
      arr.forEach(set=>{ totalVol += (set.sets||0)*(set.reps||0)*(set.weight||0); });
    });
  });
  $('#statVolume').textContent = Math.round(totalVol);

  // Je Tag Volumen (für Mini-Chart)
  const byDay = {};
  Object.entries(db.workouts).forEach(([k,w])=>{
    const day = k.split('|')[0];
    let vol = 0; Object.values(w.exercises||{}).forEach(arr=>arr.forEach(s=> vol += (s.sets||0)*(s.reps||0)*(s.weight||0)));
    byDay[day] = (byDay[day]||0) + vol;
  });
  drawChart(byDay);

  // Bodyweight Anzeige
  const todayKey = fmtDate(TODAY);
  if(db.weighins[todayKey]) $('#lastWeight').textContent = `Heute: ${db.weighins[todayKey]} kg`;
  else {
    // zeige letzten Eintrag
    const keys = Object.keys(db.weighins).sort();
    if(keys.length) $('#lastWeight').textContent = `Letztes Gewicht (${keys[keys.length-1]}): ${db.weighins[keys[keys.length-1]]} kg`;
  }
}

function drawChart(byDay){
  const c = document.getElementById('chartVolume');
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  // axes
  ctx.strokeStyle = '#233'; ctx.lineWidth = 1; ctx.strokeRect(40,10,c.width-50,c.height-30);
  const days = Object.keys(byDay).sort().slice(-14);
  if(!days.length){ ctx.fillStyle='#789'; ctx.fillText('Noch keine Daten', c.width/2-40,c.height/2); return; }
  const vals = days.map(d=> byDay[d]);
  const maxV = Math.max(...vals, 10);
  const w = (c.width-60)/days.length;
  ctx.fillStyle = '#1f8a70';
  vals.forEach((v,i)=>{
    const h = (v/maxV)*(c.height-40);
    ctx.fillRect(40 + i*w + 4, c.height-10-h, w-8, h);
  });
  ctx.fillStyle = '#9aa3ad'; ctx.font = '10px system-ui';
  days.forEach((d,i)=>{ ctx.fillText(d.slice(5), 40 + i*w + 2, c.height-12); });
}

function bindNav(){
  $$('.tabs button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.tabs button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab').forEach(sec=>sec.classList.remove('active'));
      $('#'+btn.dataset.tab).classList.add('active');
    })
  });
}

function bindToday(){
  $('#startWorkout').addEventListener('click', ()=>{
    const code = $('#todayWorkout').value; openWorkout(code);
  });
  $('#markDone').addEventListener('change', (e)=>{
    const key = fmtDate(TODAY);
    db.days[key] = db.days[key]||{}; db.days[key].done = e.target.checked; save();
  });
}

function bindPlan(){
  $$('.open-workout').forEach(b=>{
    b.addEventListener('click', ()=>{ openWorkout(b.dataset.workout); $$('.tabs button')[0].click(); })
  });
}

function bindStats(){
  $('#saveWeight').addEventListener('click', ()=>{
    const val = parseFloat($('#bodyweight').value||'0');
    if(val>0){ db.weighins[fmtDate(TODAY)] = val; save(); $('#bodyweight').value=''; }
  });
}

function bindSettings(){
  $('#saveSettings').addEventListener('click', ()=>{
    const goal = parseInt($('#weeklyGoal').value||'3',10); db.goals.weekly = Math.min(Math.max(goal,1),7); save();
  });
  $('#exportData').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(db,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='krzysfit_data.json'; a.click(); URL.revokeObjectURL(url);
  });
  $('#importData').addEventListener('click', ()=>{
    const f = document.getElementById('importFile').files[0]; if(!f) return;
    const r = new FileReader(); r.onload = () => { try{ db = JSON.parse(r.result); save(); alert('Import erfolgreich'); }catch(e){ alert('Import fehlgeschlagen'); } };
    r.readAsText(f);
  });
}

function updateUI(){
  updateWeek();
  updateStats();
  // sync markDone toggle
  const key = fmtDate(TODAY); $('#markDone').checked = !!(db.days[key]&&db.days[key].done);
}

function init(){
  bindNav(); bindToday(); bindPlan(); bindStats(); bindSettings();
  // set default goal input
  $('#weeklyGoal').value = db.goals.weekly || 3;
  updateUI();
}

init();
