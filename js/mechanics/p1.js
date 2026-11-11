/* =====================================================================
 * 第一階段：陰陽五行 → 九字切＋紅圈 → 固定鋼鐵 → 死刑（換 T）→ 式鬼召喚
 * 式鬼：車輪怪（藍色直線分攤＋紅色直線）→ 石頭怪（百噸揮打、四風直線、金棒截線）
 * 位置依菓子影片的示意圖：藍車輪在北、紅車輪在東西；石頭怪在場地東西兩側。
 * ===================================================================== */

/* 九字切＋紅圈：所有人散開到格子裡，4 人腳下紅圈 */
const SPREAD_A = {
  MT: P(0, -12),
  D3: P(0, -4),
  ST: P(10, -4),
  D2: P(10, 4),
  H2: P(0, 12),
  D4: P(0, 4),
  H1: P(-10, 4),
  D1: P(-10, -4),
};
function p1Open(next) {
  fifthElement(() => kujiRed(next));
}
function kujiRed(next) {
  const LEN = 5;
  const marked = pickMarked();
  setCast('九字切', `格子直線＋${marked[0].grp === 'D' ? 'DPS' : '坦補'}紅圈點名：全員散開到格子裡`, LEN);
  advice = '每人一格散開（紅圈半徑 5m），不要站在黃線上。';
  markRed(marked);
  marked.forEach((m) => (m.waterDown = t + 20));
  const o = omen(kujiMesh('A'), LEN);
  setPlan((m) => SPREAD_A[m.id], 0.4);
  at(t + LEN, () => {
    if (state !== 'running') return;
    removeFx(o);
    strongFlash(kujiMesh('A'));
    const r = kujiHit('A').concat(redCircleHit(marked));
    if (r.length) return fail('九字切＋紅圈', r);
    cast = null;
    next();
  });
}

function p1Sigil(next) {
  onmyoSingle(next);
}
function curseOnce(next) {
  cursekeeper(curTank, (o) => {
    curTank = o;
    next();
  });
}

/* ---------- 車輪怪：藍色（北）連治療 → 直線分攤；紅色（東西）連 DPS → 各自朝外 ---------- */
const BLUE_POS = P(0, -7.5),
  RED_POS = { W: P(-7.5, 2.7), E: P(7.5, 2.7) };
const BLUE_HW = 2.2,
  RED_HW = 2;
function wheels(next) {
  setCast('式鬼召喚', '車輪怪：藍色連線治療、紅色連線 DPS', 3);
  advice = '看連線：藍線治療去南邊 C 點，其他人進藍色直線；紅線 DPS 把紅線朝場外引。';
  setPlan(UPTIME, 0.3);
  const blue = addFx(wheelShiki(0x3aa0ff), 14, false);
  blue.position.set(BLUE_POS.x, 0, BLUE_POS.z);
  const rw = addFx(wheelShiki(0xff4a3a), 14, false);
  rw.position.set(RED_POS.W.x, 0, RED_POS.W.z);
  const re = addFx(wheelShiki(0xff4a3a), 14, false);
  re.position.set(RED_POS.E.x, 0, RED_POS.E.z);
  at(t + 3, () => {
    if (state !== 'running') return;
    const bt = byId(variant('blueVar', ['H1', 'H2']));
    const ds = shuffle(members.filter((m) => m.grp === 'D'));
    const red = { W: ds[0], E: ds[1] };
    setTag(bt, '藍線', '#7cc8ff');
    setTag(red.W, '紅線', '#ff7b6b');
    setTag(red.E, '紅線', '#ff7b6b');
    const l1 = addFx(tetherLine(BLUE_POS, bt, 0x5ab8ff), 9, false);
    const l2 = addFx(tetherLine(RED_POS.W, red.W, 0xff5a4a), 9, false);
    const l3 = addFx(tetherLine(RED_POS.E, red.E, 0xff5a4a), 9, false);
    const LEN = 7;
    setCast('赤之衝擊／藍之雷擊', '紅色直線（單人）＋藍色直線（全員分攤）', LEN);
    const isRed = (m) => m === red.W || m === red.E;
    const stack = members.filter((m) => !isRed(m) && m !== bt);
    setPlan((m) => {
      if (m === bt) return P(0, 17.5);
      if (m === red.W) return P(-7.5, -15);
      if (m === red.E) return P(17.5, 2.7);
      const i = stack.indexOf(m);
      return P(i % 2 ? 0.7 : -0.7, 9 + i * 0.5);
    }, 0.6);
    at(t + LEN, () => {
      if (state !== 'running') return;
      [l1, l2, l3].forEach(removeFx);
      const bd = norm({ x: bt.x - BLUE_POS.x, z: bt.z - BLUE_POS.z });
      const bl = dist(bt, BLUE_POS) + 0.5;
      strongFlash(lineMesh(BLUE_POS, bd, bl, BLUE_HW, 0x3aa0ff, 0.5));
      const r = [];
      members.forEach((m) => {
        if (!isRed(m) && !inLine(m, BLUE_POS, bd, bl, BLUE_HW))
          r.push(`${who(m)} 沒進藍色直線分攤（藍線連在 ${bt.id} 身上，要站在藍車輪到 ${bt.id} 的直線上）。`);
      });
      ['W', 'E'].forEach((s) => {
        const tm = red[s],
          o = RED_POS[s];
        const d = norm({ x: tm.x - o.x, z: tm.z - o.z });
        strongFlash(lineMesh(o, d, 40, RED_HW, 0xff4a3a, 0.5));
        members.forEach((m) => {
          if (m !== tm && inLine(m, o, d, 40, RED_HW))
            r.push(`${who(m)} 被 ${tm.id} 的紅色直線打到。紅線的人要把直線朝場外、遠離大家。`);
        });
      });
      members.forEach((m) => setTag(m, ''));
      [blue, rw, re].forEach(removeFx);
      if (r.length) return fail('車輪怪（紅藍直線）', r);
      cast = null;
      next();
    });
  });
}

/* ---------- 石頭怪：百噸揮打（東西兩個大圓，只剩中間一條）→ 四風（橫線）→ 金棒（截線） ---------- */
const ROCK_POS = { W: P(-21, 0), E: P(21, 0) };
const SWING_C = 26,
  SWING_R = 23; // 安全帶：|x| < 3
function rocksSpawn(life) {
  const rs = ['W', 'E'].map((s) => {
    const r = addFx(rockShiki(), life, false);
    r.position.set(ROCK_POS[s].x, 0, ROCK_POS[s].z);
    r.rotation.y = s === 'W' ? Math.PI / 2 : -Math.PI / 2;
    return r;
  });
  return rs;
}
const swingMesh = (op) => {
  const g = new T.Group();
  g.add(circleMesh(-SWING_C, 0, SWING_R, 0xff9a3a, op), circleMesh(SWING_C, 0, SWING_R, 0xff9a3a, op));
  return g;
};
function swingHit() {
  const r = [];
  members.forEach((m) => {
    if (dist(m, P(-SWING_C, 0)) < SWING_R || dist(m, P(SWING_C, 0)) < SWING_R)
      r.push(`${who(m)} 被石頭怪的百噸揮打打到（${where(m)}）。東西兩側都會打，站中間那一條。`);
  });
  return r;
}
const SWING_SPOT = {
  MT: P(-1, -7),
  ST: P(1, -7),
  D1: P(-1, -3),
  D2: P(1, -3),
  D3: P(-1, 3),
  D4: P(1, 3),
  H1: P(-1, 7),
  H2: P(1, 7),
};
// 四風：橫向直線（安全帶 z≈0、±6.7、±13.3）
const WIND_Z = [-16.6, -10, -3.4, 3.4, 10, 16.6],
  WIND_HW = 1.4;
function windMesh(op) {
  const g = new T.Group();
  WIND_Z.forEach((z) => g.add(rectMesh(-ARENA_R, ARENA_R, z - WIND_HW, z + WIND_HW, 0x7ff0e0, op, 0.09)));
  return g;
}
function rocks(next) {
  const rs = rocksSpawn(30);
  const LEN = 4.5;
  setCast('百噸揮打', '石頭怪：東西兩側大範圍，站中間直線', LEN);
  advice = '東西兩側都會被打，只有中間一條安全。';
  const o = omen(swingMesh(0.22), LEN);
  setPlan((m) => SWING_SPOT[m.id], 0.3);
  at(t + LEN, () => {
    if (state !== 'running') return;
    removeFx(o);
    strongFlash(swingMesh(0.5));
    const r = swingHit();
    if (r.length) return fail('百噸揮打', r);
    windLines(() => kanabo(next, rs));
  });
}
function windLines(next) {
  const LEN = 4;
  setCast('式鬼召喚・風', '橫向直線：站在兩條線之間（王旁邊那條空隙）', LEN);
  advice = '站在王旁邊、兩條風線中間的空隙。';
  const o = omen(windMesh(0.25), LEN);
  setPlan((m) => P((ROLE_IDS.indexOf(m.id) - 3.5) * 0.8, 0), 0.3);
  at(t + LEN, () => {
    if (state !== 'running') return;
    removeFx(o);
    strongFlash(windMesh(0.55));
    const r = [];
    members.forEach((m) => {
      if (WIND_Z.some((z) => Math.abs(m.z - z) <= WIND_HW))
        r.push(`${who(m)} 站在風的橫線上（${where(m)}）。`);
    });
    if (r.length) return fail('四風直線', r);
    cast = null;
    next();
  });
}
/* 金棒：石頭怪連線 MT（西）、ST（東）→ 扇形打向連線的坦克。坦克把扇形朝北邊場外 */
const KANABO_HALF = 25;
const KANABO_SPOT = { MT: P(-15, -9), ST: P(15, -9) };
function kanabo(next, rs) {
  const LEN = 6;
  setCast('金棒', '石頭怪連線坦克：扇形死刑，坦克把扇形朝北邊引開', LEN);
  advice = 'MT 去西北、ST 去東北，讓石頭怪的扇形朝北；其他人留在王南側。';
  const tank = { W: byId('MT'), E: byId('ST') };
  const ls = ['W', 'E'].map((s) => addFx(tetherLine(ROCK_POS[s], tank[s], 0xffb050), LEN, false));
  setTag(tank.W, '截線', '#ffb050');
  setTag(tank.E, '截線', '#ffb050');
  setPlan((m) => KANABO_SPOT[m.id] || IDLE[m.id], 0.4);
  at(t + LEN, () => {
    if (state !== 'running') return;
    ls.forEach(removeFx);
    const r = [];
    ['W', 'E'].forEach((s) => {
      const o = ROCK_POS[s],
        tm = tank[s];
      const a = angOfPt(tm, o);
      strongFlash(coneMesh(o, a, KANABO_HALF, 40, 0xff7a2a, 0.5));
      members.forEach((m) => {
        if (m !== tm && inCone(m, o, a, KANABO_HALF, 40))
          r.push(`${who(m)} 被 ${tm.id} 引導的金棒扇形打到。${tm.id} 要把扇形朝北邊（遠離大家）引。`);
      });
      setTag(tm, '');
    });
    (rs || []).forEach(removeFx);
    if (r.length) return fail('金棒（截線）', r);
    cast = null;
    next();
  });
}
