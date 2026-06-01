
"use strict";

const APP_VERSION = "mobile-v1-test";

const DATA = window.ACTION_DIRECTE_DATA;
const BOARD_W = DATA.BOARD_W;
const BOARD_H = DATA.BOARD_H;
const HOLD_ZONES = DATA.HOLD_ZONES;
const HOLDS = DATA.HOLDS;
const SESSION_TEMPLATES = DATA.SESSION_TEMPLATES;

const DEFAULT_STATE = {
  page:"home", goal:"bloc", level:3, cycleIndex:1, selectedWeek:0, showOff:false,
  programWeeks:[], activeSession:null, reviews:[], feedback:"ok", finger:"ras",
  timer:null, test:null, cycleDecision:null,
  cycleStartDate:null,
  settings:{notificationsEnabled:false, reminderTime:"09:00", followUpEnabled:true, followUpTime:"18:00"},
  notificationLog:{}
};

let state = loadState();
let interval = null;
let testInterval = null;

const LEVELS = {1:["N1","reprise"],2:["N2","début."],3:["N3","inter."],4:["N4","confirmé"],5:["N5","expert"]};
const TEST_STEPS = [
  {level:1, holdId:"1", seconds:7},
  {level:2, holdId:"3", seconds:7},
  {level:3, holdId:"8", seconds:7},
  {level:4, holdId:"6", seconds:7},
  {level:5, holdId:"11", seconds:7}
];

function $(id){ return document.getElementById(id); }
function all(sel){ return Array.from(document.querySelectorAll(sel)); }
function clone(obj){ return JSON.parse(JSON.stringify(obj)); }


function todayISO(){
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}

function parseISODate(iso){
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDaysISO(iso, days){
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}

function formatDateShort(iso){
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", { weekday:"short", day:"2-digit", month:"short" }).format(parseISODate(iso));
}

function daysBetween(aISO, bISO){
  const a = parseISODate(aISO);
  const b = parseISODate(bISO);
  return Math.round((b - a) / 86400000);
}

function getNowHHMM(){
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function isPast(iso){
  return iso && iso < todayISO();
}

function isToday(iso){
  return iso === todayISO();
}

function getSessionPattern(totalSessions){
  return totalSessions >= 3 ? [0,2,5] : [0,3];
}

function computePlannedDate(weekIndex, sessionIndex, totalSessions){
  const start = state.cycleStartDate || todayISO();
  const offsets = getSessionPattern(totalSessions);
  const offset = weekIndex * 7 + (offsets[sessionIndex - 1] ?? 0);
  return addDaysISO(start, offset);
}


function loadState(){
  try {
    const saved = localStorage.getItem("actionDirecteStateV9");
    return saved ? {...clone(DEFAULT_STATE), ...JSON.parse(saved)} : clone(DEFAULT_STATE);
  } catch {
    return clone(DEFAULT_STATE);
  }
}

function saveState(){
  try {
    localStorage.setItem("actionDirecteStateV9", JSON.stringify({
      ...state, timer:null, test:null
    }));
  } catch {}
}

function showPage(page){
  state.page = page;
  all(".page").forEach(p => p.classList.toggle("active", p.id === page));
  const navPage = page === "test" ? "eval" : page;
  all(".nav button").forEach(b => b.classList.toggle("active", b.dataset.page === navPage));
  $("app").classList.toggle("homeMode", page === "home");
  render();
  saveState();
}

function setGoal(goal){
  state.goal = goal;
  all("[data-goal]").forEach(el => el.classList.toggle("active", el.dataset.goal === goal));
  render();
}

function setLevel(level){
  state.level = Number(level);
  render();
}

function renderLevels(){
  const box = $("levelChoices");
  if (!box) return;
  box.innerHTML = "";
  Object.entries(LEVELS).forEach(([level, parts]) => {
    const btn = document.createElement("button");
    btn.className = "choice" + (Number(level) === state.level ? " active" : "");
    btn.innerHTML = `${parts[0]}<small>${parts[1]}</small>`;
    btn.onclick = () => setLevel(level);
    box.appendChild(btn);
  });
}

function renderProfile(){
  $("profilePill").textContent = `N${state.level} · ${state.goal === "bloc" ? "Bloc" : "Diff"}`;
}

function createSession(goal = state.goal, level = state.level, options = {}){
  const template = SESSION_TEMPLATES[goal][String(level)];
  const repDelta = options.repDelta || 0;
  const restDelta = options.restDelta || 0;
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()),
    goal, level, name: template.name,
    hangSeconds: template.hang,
    shortRestSeconds: template.shortRest,
    longRestSeconds: Math.max(60, template.longRest + restDelta),
    status:"todo",
    isLight: !!options.isLight,
    sets: template.sets.map((holdId, index) => ({
      block:"work",
      setNumber:index+1,
      holdId,
      repsPerSet:Math.max(2, template.reps + repDelta),
      hangSeconds:template.hang,
      shortRestSeconds:template.shortRest
    }))
  };
}

function createProgram(decision = null){
  if (!state.cycleStartDate) state.cycleStartDate = todayISO();

  const dayNames = ["J1","J2","J3","J4","J5","J6","J7"];
  const sessionCounts = [2,2,3,2];

  state.programWeeks = sessionCounts.map((sessionCount, weekIndex) => {
    const offsets = getSessionPattern(sessionCount);
    return dayNames.map((day, dayOffset) => {
      const sessionSlot = offsets.indexOf(dayOffset);
      const plannedDate = addDaysISO(state.cycleStartDate, weekIndex * 7 + dayOffset);

      if (sessionSlot === -1) {
        return {
          id:`c${state.cycleIndex}w${weekIndex}d${dayOffset}`,
          week:weekIndex,
          day,
          plannedDate,
          isSession:false,
          status:"off"
        };
      }

      return {
        id:`c${state.cycleIndex}w${weekIndex}d${dayOffset}`,
        week:weekIndex,
        day,
        plannedDate,
        isSession:true,
        status:"todo",
        sessionNumber:sessionSlot + 1,
        totalSessions:sessionCount,
        isLight:weekIndex === 2 && sessionSlot === 1,
        notificationSent:false,
        followUpSent:false,
        completedAt:null,
        skippedAt:null,
        postponedFrom:null
      };
    });
  });

  state.selectedWeek = 0;
  state.activeSession = createSessionWithDecision(decision);
  renderResult();
  showPage("result");
}

function getAllSessions(){
  return state.programWeeks.flat().filter(x => x.isSession);
}




function updateMissedSessions(){
  getAllSessions().forEach(session => {
    if (session.status === "todo" && isPast(session.plannedDate)) {
      session.status = "missed";
    }
  });
}

function getLastCompletedDate(){
  const done = getAllSessions()
    .filter(s => s.status === "done" && s.completedAt)
    .map(s => s.completedAt.slice(0,10))
    .sort();
  return done[done.length - 1] || null;
}

function postponeSession(sessionId = null){
  const sessions = getAllSessions();
  const target = sessionId
    ? sessions.find(s => s.id === sessionId)
    : (sessions.find(s => ["todo","missed"].includes(s.status)) || getNextScheduled());

  if (!target) return;

  const lastDone = getLastCompletedDate();
  let newDate = todayISO();

  // sécurité simple : 48 h après la dernière séance faite
  if (lastDone && daysBetween(lastDone, newDate) < 2) {
    newDate = addDaysISO(lastDone, 2);
  }

  const oldDate = target.plannedDate;
  const shift = Math.max(0, daysBetween(oldDate, newDate));

  target.postponedFrom = oldDate;
  target.plannedDate = newDate;
  target.status = "todo";
  target.notificationSent = false;
  target.followUpSent = false;

  // Décaler toutes les séances suivantes pour conserver l’espacement.
  sessions.forEach(s => {
    if (s.id !== target.id && ["todo","missed"].includes(s.status) && s.plannedDate > oldDate) {
      s.plannedDate = addDaysISO(s.plannedDate, shift);
      s.status = "todo";
      s.notificationSent = false;
      s.followUpSent = false;
    }
  });

  renderProgram();
  saveState();
}

function getNextScheduled(){
  updateMissedSessions();
  const sessions = getAllSessions();
  return sessions.find(x => ["todo","missed"].includes(x.status)) || null;
}

function setActiveFromScheduled(scheduled, decision = null){
  if (!scheduled) { state.activeSession = null; return; }
  const opts = scheduled.isLight ? "allegement" : decision;
  state.activeSession = createSessionWithDecision(opts);
}

function renderResult(){
  $("resultBadge").textContent = `N${state.level}`;
  $("resultTitle").textContent = LEVELS[state.level][1].replace(/^./, c => c.toUpperCase());
  $("resultText").textContent = `Objectif ${state.goal === "bloc" ? "bloc" : "difficulté"} · cycle ${state.cycleIndex}.`;
}

function renderProgram(){
  const hasProgram = state.programWeeks.length > 0;
  updateMissedSessions();
  const next = hasProgram ? getNextScheduled() : null;

  $("includedWarmup").style.display = next ? "block" : "none";
  $("nextStats").style.display = next ? "grid" : "none";
  $("launchSession").style.display = next && next.status !== "missed" ? "block" : "none";
  if ($("postponeSession")) $("postponeSession").style.display = next && next.status === "missed" ? "block" : "none";

  if ($("cycleDateInfo")) {
    $("cycleDateInfo").textContent = state.cycleStartDate
      ? `Cycle glissant · départ ${formatDateShort(state.cycleStartDate)}`
      : "Cycle glissant · départ non défini";
  }

  if (!next) {
    $("nextTitle").textContent = hasProgram ? "Cycle terminé" : "Aucune programmation";
    $("nextSub").textContent = hasProgram ? "Analyse le cycle pour préparer la suite." : "Crée une programmation depuis l’évaluation.";
  } else {
    if (!state.activeSession || state.activeSession.status === "done") setActiveFromScheduled(next);
    const s = state.activeSession;
    const statusLabel = next.status === "missed" ? " · manquée, à reporter" : "";
    $("nextTitle").textContent = `${formatDateShort(next.plannedDate)} · Séance ${next.sessionNumber}/${next.totalSessions}`;
    $("nextSub").textContent = s.name + (next.isLight ? " · légère" : "") + statusLabel;
    $("statHolds").textContent = s.sets.map(x => "P"+x.holdId).join(" · ");
    $("statFormat").textContent = `${s.sets[0].repsPerSet} reps · ${s.hangSeconds}/${s.shortRestSeconds}`;
    $("statRest").textContent = `${s.longRestSeconds} s`;
  }

  renderWeeks();
}

function renderWeeks(){
  const strip = $("weekStrip");
  strip.innerHTML = "";
  ["base","progression","charge","allègement"].forEach((name, i) => {
    const el = document.createElement("button");
    el.className = "week" + (state.selectedWeek === i ? " active" : "") + (i === 2 ? " charge" : "");
    const weekStart = state.cycleStartDate ? addDaysISO(state.cycleStartDate, i * 7) : "";
    el.innerHTML = `<b>S${i+1}</b><span>${name}</span><span>${weekStart ? formatDateShort(weekStart) : ""}</span>`;
    el.onclick = () => { state.selectedWeek = i; renderProgram(); };
    strip.appendChild(el);
  });

  const list = $("weekList");
  list.className = state.showOff ? "showOff" : "";
  list.innerHTML = "";
  const next = getNextScheduled();
  const week = state.programWeeks[state.selectedWeek] || [];
  week.forEach(item => {
    const isNext = next && item.id === next.id;
    const row = document.createElement("div");
    row.className = "sessionRow"
      + (!item.isSession ? " off" : "")
      + (item.isLight ? " light" : "")
      + (isNext ? " next" : "")
      + (item.status === "missed" ? " missed" : "");

    const badge = item.status === "done" ? "FAIT ✓"
      : item.status === "missed" ? "MANQUÉ"
      : isNext ? "À FAIRE ▶"
      : item.isSession ? (item.isLight ? "LIGHT" : "ON")
      : "OFF";

    row.innerHTML = `
      <div class="day">${item.day}</div>
      <div class="sessionText">
        <b>${item.isSession ? (item.isLight ? "Séance légère" : "Séance") : "Sans séance"}</b>
        <span>${formatDateShort(item.plannedDate)}</span>
        ${item.postponedFrom ? `<em>reportée depuis ${formatDateShort(item.postponedFrom)}</em>` : ""}
      </div>
      <div class="badge">${badge}</div>`;
    list.appendChild(row);
  });
  $("toggleOff").textContent = state.showOff ? "Masquer les jours sans séance" : "Voir semaine complète";
}

function renderZones(overlayId, ids, assistStartIndex = 1){
  const overlay = $(overlayId);
  overlay.innerHTML = "";
  ids.forEach((id, index) => {
    (HOLD_ZONES[id] || []).forEach(z => {
      const div = document.createElement("div");
      div.className = "zone" + (index >= assistStartIndex ? " assist" : "");
      div.style.left = `${z.x / BOARD_W * 100}%`;
      div.style.top = `${z.y / BOARD_H * 100}%`;
      div.style.width = `${z.w / BOARD_W * 100}%`;
      div.style.height = `${z.h / BOARD_H * 100}%`;
      overlay.appendChild(div);
    });
  });
}

function resetTest(){
  clearInterval(testInterval);
  state.test = {index:0, phase:"ready", seconds:7, running:false, canAnswer:false};
  renderTest();
}

function currentTestStep(){
  if (!state.test) resetTest();
  return TEST_STEPS[state.test.index] || TEST_STEPS[0];
}

function startTestHang(){
  const step = currentTestStep();
  state.test.phase = "hang";
  state.test.seconds = step.seconds;
  state.test.running = true;
  state.test.canAnswer = false;
  clearInterval(testInterval);
  testInterval = setInterval(testTick, 1000);
  renderTest();
}

function testTick(){
  if (!state.test?.running) return;
  if (state.test.seconds > 1) {
    state.test.seconds -= 1;
    renderTest();
    return;
  }
  clearInterval(testInterval);
  state.test.seconds = 0;
  state.test.phase = "answer";
  state.test.running = false;
  state.test.canAnswer = true;
  renderTest();
}

function answerTest(answer){
  if (!state.test?.canAnswer) return;
  const step = currentTestStep();
  if (answer === "fail") return finishTest(Math.max(1, step.level - 1));
  if (answer === "limit") return finishTest(step.level);
  if (state.test.index >= TEST_STEPS.length - 1) return finishTest(5);
  state.test.index += 1;
  const next = currentTestStep();
  state.test.phase = "ready";
  state.test.seconds = next.seconds;
  state.test.canAnswer = false;
  renderTest();
}

function finishTest(level){
  clearInterval(testInterval);
  state.level = level;
  renderResult();
  showPage("result");
}

function renderTest(){
  if (!state.test) return;
  const t = state.test, step = currentTestStep(), hold = HOLDS[step.holdId];
  $("testLevel").textContent = `N${step.level}`;
  $("testPhase").textContent = t.phase === "ready" ? "Prêt" : t.phase === "hang" ? "Suspension" : "Réponds";
  $("testSeconds").textContent = t.seconds;
  $("testHold").textContent = `P${step.holdId} — ${hold.name}`;
  $("testDetails").textContent = `${hold.fingers} · ${hold.grip}`;
  $("testStep").textContent = `Étape ${t.index+1}/${TEST_STEPS.length}`;
  $("testProgress").style.width = `${Math.max(0, Math.min(100, t.seconds / step.seconds * 100))}%`;
  $("startTest").disabled = t.running || t.canAnswer;
  all(".testAnswer").forEach(b => b.disabled = !t.canAnswer);
  renderZones("testOverlay", [step.holdId], 99);
}

function safeWarmupTarget(){
  const target = state.activeSession?.sets?.[0]?.holdId || (state.goal === "bloc" ? "6" : "3");
  return ["2","7","9","10"].includes(target) ? (state.goal === "bloc" ? "6" : "8") : target;
}

function buildWarmup(){
  const target = safeWarmupTarget();
  const steps = [
    {block:"warmup", holdId:"1", display:["1"], reps:2, hang:5, rest:10, label:"Mise en route", mode:"sym"},
    {block:"warmup", holdId:"3", display:["3"], reps:2, hang:5, rest:10, label:"Deuxième palier", mode:"sym"},
    {block:"warmup", holdId:"10", display:["10","1"], reps:1, hang:5, rest:10, label:"Asymétrique facile", mode:"asym", hand:"gauche", assist:"1"},
    {block:"warmup", holdId:"10", display:["10","1"], reps:1, hang:5, rest:10, label:"Asymétrique facile", mode:"asym", hand:"droite", assist:"1"},
    {block:"warmup", holdId:"10", display:["10","3"], reps:1, hang:5, rest:12, label:"Asymétrique spécifique", mode:"asym", hand:"gauche", assist:"3"},
    {block:"warmup", holdId:"10", display:["10","3"], reps:1, hang:5, rest:15, label:"Asymétrique spécifique", mode:"asym", hand:"droite", assist:"3"},
    {block:"warmup", holdId:target, display:[target], reps:1, hang:5, rest:20, label:"Pré-activation", mode:"sym"}
  ];
  return steps.map((s, i) => ({...s, setNumber:i+1}));
}

function resetTimer(){
  const first = buildWarmup()[0];
  state.timer = {block:"warmup", phase:"ready", seconds:first.hang, warmIndex:0, workIndex:0, rep:1, running:false, finished:false};
}

function currentTimerSet(){
  if (!state.timer) resetTimer();
  if (state.timer.block === "warmup") return buildWarmup()[state.timer.warmIndex];
  return state.activeSession?.sets?.[state.timer.workIndex] || null;
}

function phaseTotal(){
  const set = currentTimerSet();
  if (!set) return 1;
  if (state.timer.phase === "hang") return set.hang || set.hangSeconds || state.activeSession.hangSeconds;
  if (state.timer.phase === "shortRest") return set.rest || set.shortRestSeconds || state.activeSession.shortRestSeconds;
  if (state.timer.phase === "longRest") return state.activeSession.longRestSeconds;
  return set.hang || set.hangSeconds || 1;
}

function startTimer(){
  if (!state.activeSession) return;
  if (!state.timer || state.timer.phase === "done") resetTimer();
  const set = currentTimerSet();
  state.timer.phase = "hang";
  state.timer.seconds = set.hang || set.hangSeconds || state.activeSession.hangSeconds;
  state.timer.running = true;
  clearInterval(interval);
  interval = setInterval(timerTick, 1000);
  renderTimer();
}

function pauseTimer(){
  if (!state.timer) return;
  state.timer.running = !state.timer.running;
  clearInterval(interval);
  if (state.timer.running) interval = setInterval(timerTick, 1000);
  renderTimer();
}

function stopTimer(){
  clearInterval(interval);
  if (!state.timer) resetTimer();
  state.timer.phase = "done";
  state.timer.running = false;
  showPage("review");
}

function timerTick(){
  if (!state.timer?.running) return;
  if (state.timer.seconds > 1) {
    state.timer.seconds -= 1;
    renderTimer();
    return;
  }
  advanceTimer();
  renderTimer();
}

function advanceTimer(){
  const t = state.timer, set = currentTimerSet();
  if (!set) return;

  if (t.block === "warmup") {
    const warmup = buildWarmup();
    if (t.phase === "hang") {
      t.phase = "shortRest";
      t.seconds = set.rest;
      return;
    }
    if (t.phase === "shortRest") {
      if (t.rep < set.reps) {
        t.rep += 1;
        t.phase = "hang";
        t.seconds = set.hang;
        return;
      }
      if (t.warmIndex < warmup.length - 1) {
        t.warmIndex += 1;
        t.rep = 1;
        t.phase = "hang";
        t.seconds = warmup[t.warmIndex].hang;
        return;
      }
      t.block = "work";
      t.workIndex = 0;
      t.rep = 1;
      t.phase = "hang";
      t.seconds = state.activeSession.hangSeconds;
      return;
    }
  }

  if (t.phase === "hang") {
    if (t.rep < set.repsPerSet) {
      t.phase = "shortRest";
      t.seconds = state.activeSession.shortRestSeconds;
      return;
    }
    if (t.workIndex < state.activeSession.sets.length - 1) {
      t.phase = "longRest";
      t.seconds = state.activeSession.longRestSeconds;
      return;
    }
    t.phase = "done";
    t.running = false;
    clearInterval(interval);
    showPage("review");
    return;
  }

  if (t.phase === "shortRest") {
    t.rep += 1;
    t.phase = "hang";
    t.seconds = state.activeSession.hangSeconds;
    return;
  }

  if (t.phase === "longRest") {
    t.workIndex += 1;
    t.rep = 1;
    t.phase = "hang";
    t.seconds = state.activeSession.hangSeconds;
  }
}

function renderTimer(){
  if (!state.timer) resetTimer();
  const t = state.timer, set = currentTimerSet();
  $("blockLabel").textContent = t.block === "warmup" ? "Échauffement" : "Travail";
  $("blockLabel").className = "phase " + (t.block === "warmup" ? "warmup" : "work");
  const phaseText = {ready:"Prêt", hang:"Suspension", shortRest:"Repos court", longRest:"Repos long", done:"Terminé"}[t.phase] || "Prêt";
  $("phaseLabel").textContent = phaseText;
  $("phaseLabel").className = "phase " + (t.phase.includes("Rest") ? "rest" : "");
  $("timerSeconds").textContent = t.seconds;

  if (!set) return;

  if (t.block === "warmup") {
    const warmup = buildWarmup();
    $("timerSet").textContent = `Étape ${t.warmIndex+1}/${warmup.length}`;
    $("timerRep").textContent = `Rép ${t.rep}/${set.reps}`;
    $("timerRest").textContent = `Repos ${set.rest}s`;
    if (set.mode === "asym") {
      $("timerHold").textContent = "P10 asymétrique";
      $("timerDetails").textContent = `Main ${set.hand} : P10 · autre main : P${set.assist} assistance`;
    } else {
      const h = HOLDS[set.holdId];
      $("timerHold").textContent = `P${set.holdId} — ${h.name}`;
      $("timerDetails").textContent = `${set.label} · ${h.grip}`;
    }
    renderZones("timerOverlay", set.display, 1);
  } else {
    const h = HOLDS[set.holdId];
    $("timerSet").textContent = `Série ${t.workIndex+1}/${state.activeSession.sets.length}`;
    $("timerRep").textContent = `Rép ${t.rep}/${set.repsPerSet}`;
    $("timerRest").textContent = `Repos ${state.activeSession.longRestSeconds}s`;
    $("timerHold").textContent = `P${set.holdId} — ${h.name}`;
    $("timerDetails").textContent = `${h.fingers} · ${h.grip}`;
    renderZones("timerOverlay", [set.holdId], 99);
  }

  $("timerProgress").style.width = `${Math.max(0, Math.min(100, t.seconds / phaseTotal() * 100))}%`;
  const ready = t.phase === "ready" || t.phase === "done";
  $("readyActions").style.display = ready ? "grid" : "none";
  $("runActions").style.display = ready ? "none" : "grid";
  $("pauseTimer").textContent = t.running ? "Pause" : "Reprendre";
}

function renderAdvice(){
  let txt = "La séance suivante sera conservée telle quelle.";
  if (state.feedback === "easy" && state.finger === "ras") txt = "Proposition : progression légère possible.";
  if (state.feedback === "hard") txt = "Proposition : réduire légèrement le volume.";
  if (state.finger === "tire") txt = "Proposition : prochaine séance plus légère.";
  if (state.finger === "signal") txt = "Proposition : repos ou forte réduction de charge.";
  $("adviceBox").textContent = txt;
}

function saveReview(){
  const next = getNextScheduled();
  if (next) { next.status = "done"; next.completedAt = new Date().toISOString(); }
  state.reviews.push({cycleIndex:state.cycleIndex, feedback:state.feedback, finger:state.finger, at:new Date().toISOString()});
  if (state.activeSession) state.activeSession.status = "done";
  state.timer = null;

  if (isCycleComplete()) {
    renderCycle();
    showPage("cycle");
    return;
  }

  setActiveFromScheduled(getNextScheduled());
  showPage("prog");
}

function isCycleComplete(){
  const sessions = getAllSessions();
  return sessions.length > 0 && sessions.every(s => s.status === "done");
}

function analyseCycle(){
  const sessions = getAllSessions();
  const total = sessions.length || 1;
  const done = sessions.filter(s => s.status === "done").length;
  const regularity = Math.round(done / total * 100);
  const recent = state.reviews.slice(-total);
  let score = 0, fingerPenalty = 0, hard = 0, signal = 0;

  recent.forEach(r => {
    if (r.feedback === "easy" && r.finger === "ras") score += 2;
    else if (r.feedback === "ok" && r.finger === "ras") score += 1;
    else if (r.feedback === "hard") { score -= 1; hard += 1; }
    if (r.finger === "tire") { score -= 1; fingerPenalty += 1; }
    if (r.finger === "signal") { score -= 3; fingerPenalty += 3; signal += 1; }
  });

  if (regularity < 80) score -= 2;
  if (regularity < 60) score -= 3;

  let decision = "maintien", lever = "Aucun changement majeur", title = "Cycle stable.", explain = "Le prochain cycle consolide le niveau actuel.";
  if (signal > 0 || score <= -3) { decision = "allegement"; lever = "Volume réduit"; title = "Allègement recommandé."; explain = "Des signaux de fatigue ou de difficulté ont été détectés."; }
  else if (score >= 6 && regularity >= 85 && fingerPenalty === 0) { decision = "progression"; lever = "Volume"; title = "Progression légère."; explain = "Le cycle est validé. On augmente légèrement le stimulus."; }
  else if (score <= 1 || hard >= 2) { decision = "consolidation"; lever = "Repos / volume"; title = "Consolidation."; explain = "Le cycle est passé, mais il reste chargé."; }
  if (state.cycleIndex > 0 && state.cycleIndex % 4 === 0 && decision !== "allegement") { decision = "retest"; lever = "Réévaluation"; title = "Re-test conseillé."; explain = "Après plusieurs cycles, une réévaluation permet de recalibrer le niveau."; }

  return {decision, lever, title, explain, regularity, done, total, score, feeling:score >= 6 ? "facile" : score >= 2 ? "stable" : score >= -2 ? "chargé" : "dur", fingers:signal ? "alerte" : fingerPenalty ? "à surveiller" : "RAS"};
}

function renderCycle(){
  const a = analyseCycle();
  state.cycleDecision = a;
  $("cycleTitle").textContent = a.title;
  $("cycleSub").textContent = `Cycle ${state.cycleIndex} · ${a.done}/${a.total} séances réalisées`;
  $("cycleRegularity").textContent = `${a.regularity}%`;
  $("cycleFeeling").textContent = a.feeling;
  $("cycleFingers").textContent = a.fingers;
  const badge = $("cycleDecision");
  const labels = {progression:"Progression", maintien:"Maintien", consolidation:"Consolidation", allegement:"Allègement", retest:"Re-test"};
  badge.textContent = labels[a.decision];
  badge.className = "decisionBadge " + a.decision;
  $("cycleExplain").textContent = a.explain;
  $("cycleLever").textContent = a.lever;
}

function generateNextCycle(){
  const a = state.cycleDecision || analyseCycle();
  if (a.decision === "retest") {
    resetTest();
    showPage("test");
    return;
  }
  if (a.decision === "progression" && state.cycleIndex >= 2 && a.score >= 8 && state.level < 5) state.level += 1;
  state.cycleIndex += 1;
  state.cycleStartDate = todayISO();
  createProgram(a.decision);
}

async function enableNotifications(){
  if (!("Notification" in window)) {
    alert("Notifications non disponibles dans ce navigateur.");
    return;
  }

  const permission = await Notification.requestPermission();
  state.settings.notificationsEnabled = permission === "granted";
  renderSettings();

  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("sw.js"); } catch {}
  }

  saveState();
}

function shouldSendAt(timeHHMM){
  return getNowHHMM() >= timeHHMM;
}

function notificationKey(session, type){
  return `${session.id}:${session.plannedDate}:${type}`;
}

function sendLocalNotification(title, body){
  if (!state.settings.notificationsEnabled || Notification.permission !== "granted") return;
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) reg.showNotification(title, { body, icon:"assets/home.png", badge:"assets/home.png" });
      else new Notification(title, { body });
    });
  } else {
    new Notification(title, { body });
  }
}

function checkSessionNotifications(){
  if (!state.settings.notificationsEnabled) return;
  const todaySessions = getAllSessions().filter(s => s.isSession && isToday(s.plannedDate) && s.status === "todo");

  todaySessions.forEach(session => {
    const mainKey = notificationKey(session, "main");
    const followKey = notificationKey(session, "follow");

    if (!state.notificationLog[mainKey] && shouldSendAt(state.settings.reminderTime)) {
      sendLocalNotification("Action Directe — séance aujourd’hui", `Séance ${session.sessionNumber}/${session.totalSessions} prévue aujourd’hui.`);
      state.notificationLog[mainKey] = true;
    }

    if (state.settings.followUpEnabled && !state.notificationLog[followKey] && shouldSendAt(state.settings.followUpTime)) {
      sendLocalNotification("Action Directe — séance non faite", "Tu peux la faire, la reporter, ou la marquer comme sautée.");
      state.notificationLog[followKey] = true;
    }
  });
}

function renderSettings(){
  if (!$("reminderTime")) return;
  $("reminderTime").value = state.settings.reminderTime;
  $("followUpTime").value = state.settings.followUpTime;
  $("toggleFollowUp").textContent = state.settings.followUpEnabled ? "Oui" : "Non";
  $("enableNotifications").textContent = state.settings.notificationsEnabled ? "Activées" : "Activer";
}

function render(){
  renderProfile();
  renderLevels();
  renderResult();
  if (state.programWeeks.length) renderProgram();
  if (state.page === "test") renderTest();
  if (state.page === "timer") renderTimer();
  if (state.page === "cycle") renderCycle();
  if (state.page === "settings") renderSettings();
  renderAdvice();
  checkSessionNotifications();
  saveState();
}

function bind(){
  $("homeStart").onclick = () => showPage("eval");
  $("createProgram").onclick = () => createProgram();
  $("openTest").onclick = () => { resetTest(); showPage("test"); };
  $("backEval").onclick = () => showPage("eval");
  $("startTest").onclick = startTestHang;
  all(".testAnswer").forEach(btn => btn.onclick = () => answerTest(btn.dataset.answer));
  $("openProgram").onclick = () => showPage("prog");
  $("launchSession").onclick = () => { setActiveFromScheduled(getNextScheduled()); resetTimer(); showPage("timer"); };
  if ($("postponeSession")) $("postponeSession").onclick = () => postponeSession();
  $("toggleOff").onclick = () => { state.showOff = !state.showOff; renderProgram(); };
  $("backProgram").onclick = () => showPage("prog");
  $("startTimer").onclick = startTimer;
  $("pauseTimer").onclick = pauseTimer;
  $("stopTimer").onclick = stopTimer;
  $("saveReview").onclick = saveReview;
  $("nextCycle").onclick = generateNextCycle;
  $("cycleBack").onclick = () => showPage("prog");
  if ($("enableNotifications")) $("enableNotifications").onclick = enableNotifications;
  if ($("toggleFollowUp")) $("toggleFollowUp").onclick = () => { state.settings.followUpEnabled = !state.settings.followUpEnabled; renderSettings(); saveState(); };
  if ($("reminderTime")) $("reminderTime").onchange = (e) => { state.settings.reminderTime = e.target.value; saveState(); };
  if ($("followUpTime")) $("followUpTime").onchange = (e) => { state.settings.followUpTime = e.target.value; saveState(); };
  if ($("rebuildDatesBtn")) $("rebuildDatesBtn").onclick = () => { state.cycleStartDate = todayISO(); createProgram(); };
  all("[data-goal]").forEach(el => el.onclick = () => setGoal(el.dataset.goal));
  all("[data-feedback]").forEach(el => el.onclick = () => { state.feedback = el.dataset.feedback; all("[data-feedback]").forEach(x => x.classList.toggle("active", x === el)); renderAdvice(); });
  all("[data-finger]").forEach(el => el.onclick = () => { state.finger = el.dataset.finger; all("[data-finger]").forEach(x => x.classList.toggle("active", x === el)); renderAdvice(); });
  all(".nav button").forEach(btn => btn.onclick = () => showPage(btn.dataset.page));
  document.addEventListener("keydown", e => { if (e.key.toLowerCase() === "d") document.body.classList.toggle("debugHome"); });
}

function init(){
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  setInterval(checkSessionNotifications, 60000);
  bind();
  showPage(state.page || "home");
  if (!state.programWeeks.length) {
    $("includedWarmup").style.display = "none";
    $("nextStats").style.display = "none";
    $("launchSession").style.display = "none";
  }
}

init();


// Outil de test mobile : dans la console, appeler resetActionDirecteTestData()
window.resetActionDirecteTestData = function(){
  localStorage.removeItem("actionDirecteStateV9");
  location.reload();
};
