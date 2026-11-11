/* =====================================================================
 * 時間軸引擎與結果
 * at(時間, fn) 排程事件；setCast 顯示讀條；setPlan 指定 NPC 目標位置；
 * fail／finish 結束這一輪並顯示結果。
 * ===================================================================== */

/* ---------- 設定 ---------- */
let cfg = {};
const VAR_IDS = ['markVar', 'blueVar', 'sigilVar', 'snakeVar'];
function readCfg() {
  cfg = { mode: $('mode').value, role: $('role').value, hintMe: $('hintMe').checked };
  VAR_IDS.forEach((id) => (cfg[id] = $(id).value));
}
// 依設定（或測試掛鉤 window.__forceX）決定變體
function variant(id, opts) {
  const forced = window['__force_' + id];
  if (forced !== undefined) return forced;
  const v = cfg[id];
  return v && v !== 'rand' ? v : pick(opts);
}
document.querySelectorAll('#panel select,#panel input').forEach((el) =>
  el.addEventListener('change', () => {
    el.blur();
    if (state !== 'running') {
      readCfg();
      placeIdle();
    }
  }),
);
if (innerWidth < 720) $('panel').open = false;

let stats = { tries: 0, clears: 0 };
try {
  const s = JSON.parse(localStorage.getItem('seiryu-stats') || 'null');
  if (s) stats = s;
} catch (e) {}
function saveStats() {
  try {
    localStorage.setItem('seiryu-stats', JSON.stringify(stats));
  } catch (e) {}
}

/* ---------- 時間軸引擎 ---------- */
let state = 'idle',
  t = 0,
  events = [],
  ticks = [],
  cast = null,
  advice = '',
  planFn = null,
  finishNote = '',
  tl = [];
function at(time, fn) {
  events.push({ at: time, fn });
  events.sort((a, b) => a.at - b.at);
}
function setCast(name, sub, len) {
  cast = { name, sub, start: t, len };
}
function setPlan(fn, delay = 0.3) {
  planFn = fn;
  members.forEach((m) => (m.reactAt = t + delay + Math.random() * 0.3));
}
// 每幀檢查（回傳 true 就移除）
function tick(fn) {
  ticks.push(fn);
}
function tlMark(i, cls) {
  tl.forEach((e, j) => {
    if (j === i) e.cls = cls;
    else if (cls === 'now' && e.cls === 'now') e.cls = 'ok';
  });
  renderTl();
}
function renderTl() {
  $('tlList').innerHTML = tl
    .map((e, i) => `<div class="ev ${e.cls || ''}"><i>${i + 1}</i><span>${e.name}</span></div>`)
    .join('');
}

function placeIdle() {
  buildMembers(cfg.role);
  members.forEach((m) => {
    const p = IDLE[m.id];
    m.x = m.tx = p.x;
    m.z = m.tz = p.z;
  });
  camYaw = 0;
  updateMeHud();
}

function resetWorld() {
  clearFx();
  setArena('p1');
  faceBoss(0);
  curTank = 'MT';
}

function start() {
  readCfg();
  resetWorld();
  events = [];
  ticks = [];
  cast = null;
  advice = '';
  finishNote = '';
  planFn = null;
  t = 0;
  state = 'running';
  placeIdle();
  $('banner').hidden = true;
  $('cast').hidden = true;
  $('panel').open = false;
  const list = cfg.mode === 'all' ? STEPS : STEPS.filter((x) => x.id === cfg.mode || x.grp === cfg.mode);
  tl = list.map((x) => ({ name: x.name }));
  $('timeline').hidden = list.length < 2;
  let i = 0;
  const go = () => {
    if (state !== 'running') return;
    if (i >= list.length) return finish(list.length > 1 ? '全部完成' : list[0].name + ' 完成');
    tlMark(i, 'now');
    list[i].fn(() => {
      tlMark(i, 'ok');
      i++;
      cast = null;
      at(t + 1.2, go);
    });
  };
  at(0.8, go);
  renderTl();
}

/* ---------- 結果 ---------- */
function fail(title, reasons) {
  if (state !== 'running') return;
  state = 'done';
  stats.tries++;
  saveStats();
  fx.forEach((f) => (f.fade = false));
  const i = tl.findIndex((e) => e.cls === 'now');
  if (i >= 0) tlMark(i, 'ng');
  const b = $('banner');
  b.className = 'hud box ng';
  b.hidden = false;
  b.innerHTML = `<h2>${title} 失敗</h2>${reasons.map((r) => `<p>${r}</p>`).join('')}<p class="sub">按 Enter 再來一次</p>`;
  $('cast').hidden = true;
  updateMeHud();
}
function finish(title) {
  if (state !== 'running') return;
  state = 'done';
  stats.tries++;
  stats.clears++;
  saveStats();
  const b = $('banner');
  b.className = 'hud box ok';
  b.hidden = false;
  b.innerHTML = `<h2>${title}</h2>${finishNote ? `<p>${finishNote}</p>` : ''}<p class="sub">按 Enter 再來一次</p>`;
  $('cast').hidden = true;
  members.forEach((m) => setTag(m, ''));
  updateMeHud();
}

/* ---------- 共用判定小工具 ---------- */
// 判定：對每個隊員跑 test(m) → 回傳失敗原因字串或空
function judge(title, test) {
  if (state !== 'running') return false;
  const reasons = [];
  members.forEach((m) => {
    const r = test(m);
    if (r) reasons.push(r);
  });
  if (reasons.length) {
    fail(title, reasons);
    return false;
  }
  return true;
}
// 易傷（魔法受傷加重）：給 sec 秒
function giveVuln(m, sec) {
  m.vuln = Math.max(m.vuln, t + sec);
}
const hasVuln = (m) => m.vuln > t;

/* ---------- 擊退 ---------- */
// 把隊員往 (dx,dz) 推一段距離（0.45 秒內滑過去）；落點在場外就失敗（掉進水裡／摔下平台）
function knock(m, dx, dz, title, why) {
  m.kb = { x0: m.x, z0: m.z, x1: m.x + dx, z1: m.z + dz, t0: t, t1: t + 0.45 };
  m.tx = m.kb.x1;
  m.tz = m.kb.z1;
  return len({ x: m.kb.x1, z: m.kb.z1 }) > ARENA_R - 0.2 ? `${who(m)} ${why}` : '';
}
// 對全隊套用擊退，回傳失敗原因
function knockAll(vecFn, why) {
  const r = [];
  members.forEach((m) => {
    const v = vecFn(m);
    if (!v) return;
    const s = knock(m, v.x, v.z, '', why);
    if (s) r.push(s);
  });
  return r;
}
const knocking = (m) => m.kb && t < m.kb.t1;
