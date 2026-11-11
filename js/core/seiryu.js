/* =====================================================================
 * 青龍共用機制零件：陰陽五行（全屏）、九字切、陰陽之印（鋼鐵／月環）、
 * 咒怨的替身（換 T）、紅圈點名（蛇降）、式鬼模型、擊退方向
 * ===================================================================== */

// 鋼鐵月環等需要散開時的方位（由北順時針）
const CLOCK = { MT: 0, ST: 45, D2: 90, H2: 135, D4: 180, H1: 225, D3: 270, D1: 315 };
// 一般輸出位置（王周圍）
const UPTIME = (m) => IDLE[m.id];

/* ---------- 陰陽五行：全屏 AOE（只有讀條，不用移動） ---------- */
function fifthElement(next, note = '') {
  setCast('陰陽五行', '全屏魔法 AOE' + (note ? '｜' + note : ''), 3);
  advice = '全屏傷害，留在王身邊輸出即可。';
  setPlan(UPTIME, 0.3);
  at(t + 3, () => {
    if (state !== 'running') return;
    screenFlash();
    cast = null;
    next();
  });
}

/* ---------- 九字切：格子狀的細長直線 ---------- */
// A 組：縱線 x=±5,±15、橫線 z=0,±8,±16；B 組（第二波）剛好蓋住 A 組的安全格
const KUJI = {
  A: { xs: [-15, -5, 5, 15], zs: [-16, -8, 0, 8, 16] },
  B: { xs: [-10, 0, 10], zs: [-12, -4, 4, 12] },
};
const KUJI_HW = 1.6;
function inKuji(p, set) {
  const k = KUJI[set];
  return k.xs.some((x) => Math.abs(p.x - x) <= KUJI_HW) || k.zs.some((z) => Math.abs(p.z - z) <= KUJI_HW);
}
// 某組的安全格中心
function kujiCells(set) {
  const k = KUJI[set],
    o = KUJI[set === 'A' ? 'B' : 'A'];
  const cs = [];
  o.xs.forEach((x) => o.zs.forEach((z) => len(P(x, z)) < ARENA_R - 1.5 && cs.push(P(x, z))));
  // A 組的安全格中心 = B 組的線位置，反之亦然（只取場內的）
  return cs.filter((c) => !inKuji(c, set));
}
function kujiMesh(set, color = 0xffd65a, op = 0.42) {
  const g = new T.Group();
  const k = KUJI[set];
  k.xs.forEach((x) => g.add(rectMesh(x - KUJI_HW, x + KUJI_HW, -ARENA_R, ARENA_R, color, op, 0.08)));
  k.zs.forEach((z) => g.add(rectMesh(-ARENA_R, ARENA_R, z - KUJI_HW, z + KUJI_HW, color, op, 0.085)));
  return g;
}
function kujiHit(set, name = '九字切') {
  const r = [];
  members.forEach((m) => {
    if (inKuji(m, set)) r.push(`${who(m)} 站在${name}的直線上（${where(m)}）。站到線與線之間的格子裡。`);
  });
  return r;
}
// 最近的安全格
function nearestCell(p, set) {
  let best = null,
    bd = 1e9;
  kujiCells(set).forEach((c) => {
    const d = dist(p, c);
    if (d < bd) {
      bd = d;
      best = c;
    }
  });
  return best;
}
/* 九字切（兩波）：A 先判定，3 秒後 B 判定。A 的線位置在 B 時是安全的 */
function kujiDouble(next) {
  setCast('九字切', '兩波格子直線：先站格子裡，第一波打完立刻踩到剛剛的線上', 4.5);
  advice = '第一波（黃）：站格子中間。第二波（藍）會打第一波的安全格 → 第一波結束就移到剛打過的線上。';
  const oA = omen(kujiMesh('A'), 4.5);
  const oB = omen(kujiMesh('B', 0x5ad8ff, 0.16), 7.5);
  const base = {};
  members.forEach((m) => (base[m.id] = nearestCell(UPTIME(m), 'A')));
  setPlan((m) => base[m.id], 0.3);
  at(t + 4.5, () => {
    if (state !== 'running') return;
    removeFx(oA);
    strongFlash(kujiMesh('A'));
    const r = kujiHit('A', '九字切第一波');
    if (r.length) return fail('九字切（第一波）', r);
    setCast('九字切', '第二波', 3);
    advice = '移到剛剛第一波的線上（現在安全）。';
    setPlan((m) => nearestCell(base[m.id], 'B'), 0.15);
    at(t + 3, () => {
      if (state !== 'running') return;
      removeFx(oB);
      strongFlash(kujiMesh('B', 0x5ad8ff, 0.5));
      const r2 = kujiHit('B', '九字切第二波');
      if (r2.length) return fail('九字切（第二波）', r2);
      cast = null;
      next();
    });
  });
}

/* ---------- 陰陽之印：太極（鋼鐵＝離開王）／蛇眼（月環＝貼近王） ---------- */
const SIGIL_R = 8, // 鋼鐵半徑
  DONUT_IN = 5; // 月環安全半徑
const SIGIL_NAME = { out: '太極之印（鋼鐵）', in: '蛇眼之印（月環）' };
function sigilMesh(kind, op = 0.4) {
  return kind === 'out'
    ? circleMesh(0, 0, SIGIL_R, 0xff8a3d, op)
    : ringMesh(0, 0, DONUT_IN, ARENA_R + 2, 0x5ad8ff, op * 0.8);
}
function sigilHit(kind) {
  const r = [];
  members.forEach((m) => {
    const d = len(m);
    if (kind === 'out' && d < SIGIL_R)
      r.push(`${who(m)} 在王身邊被太極鋼鐵打到（離王 ${d.toFixed(1)}m，要 ${SIGIL_R}m 以上）。`);
    if (kind === 'in' && d > DONUT_IN)
      r.push(`${who(m)} 離王太遠被蛇眼月環打到（離王 ${d.toFixed(1)}m，要貼近到 ${DONUT_IN}m 內）。`);
  });
  return r;
}
const sigilSpot = (kind) => (m) => posAt(CLOCK[m.id], kind === 'out' ? 10.5 : 3.6);
// 王身上的印記
function sigilIcon(kind, n) {
  const l = floatLabel(
    (n ? n + ' ' : '') + (kind === 'out' ? '☯ 鋼鐵' : '◎ 月環'),
    kind === 'out' ? '#ffb070' : '#8fe8ff',
    n === 2 ? 1.6 : -1.6,
    0,
    8.2,
    1.5,
  );
  return l;
}
/* 單次（第一階段固定鋼鐵） */
function onmyoSingle(next) {
  setCast('陰陽之印', '太極之印＝鋼鐵：離開王', 4);
  advice = '太極（鋼鐵）：離開王 8m 以上。';
  const o = omen(sigilMesh('out', 0.2), 4);
  const ic = omen(sigilIcon('out'), 4);
  setPlan(sigilSpot('out'), 0.3);
  at(t + 4, () => {
    if (state !== 'running') return;
    removeFx(o);
    removeFx(ic);
    strongFlash(sigilMesh('out', 0.5));
    const r = sigilHit('out');
    if (r.length) return fail('陰陽之印（鋼鐵）', r);
    cast = null;
    next();
  });
}
/* 兩次（荒魂燃燒後）：印記順序就是判定順序 */
function onmyoDouble(next, opt = {}) {
  const ord = variant('sigilVar', ['outin', 'inout']);
  const k1 = ord === 'outin' ? 'out' : 'in',
    k2 = k1 === 'out' ? 'in' : 'out';
  const LEN = opt.len || 4.5;
  setCast('陰陽之印', `${SIGIL_NAME[k1]} → ${SIGIL_NAME[k2]}`, LEN);
  advice = `看王頭上的順序：先${k1 === 'out' ? '離開（鋼鐵）' : '貼近（月環）'}，再${k2 === 'out' ? '離開' : '貼近'}。`;
  const o1 = omen(sigilMesh(k1, 0.22), LEN);
  const i1 = omen(sigilIcon(k1, 1), LEN);
  const i2 = omen(sigilIcon(k2, 2), LEN + 3);
  const spot1 = opt.spot1 || sigilSpot(k1),
    spot2 = opt.spot2 || sigilSpot(k2);
  setPlan(spot1, 0.3);
  if (opt.onStart) opt.onStart(k1, k2);
  at(t + LEN, () => {
    if (state !== 'running') return;
    removeFx(o1);
    removeFx(i1);
    strongFlash(sigilMesh(k1, 0.5));
    const r = sigilHit(k1).concat(opt.extra1 ? opt.extra1() : []);
    if (r.length) return fail('陰陽之印（第一下）', r);
    const o2 = omen(sigilMesh(k2, 0.22), 3);
    setCast('陰陽之印', '第二下：' + SIGIL_NAME[k2], 3);
    advice = k2 === 'out' ? '立刻離開王！' : '立刻貼近王！';
    setPlan(spot2, 0.1);
    at(t + 3, () => {
      if (state !== 'running') return;
      removeFx(o2);
      removeFx(i2);
      strongFlash(sigilMesh(k2, 0.5));
      const r2 = sigilHit(k2);
      if (r2.length) return fail('陰陽之印（第二下）', r2);
      cast = null;
      next();
    });
  });
}

/* ---------- 咒怨的替身：被點名的坦克之後不能吃死刑（要換 T） ---------- */
const TANK_SPOT = P(0, -5); // 王正面（北）
let curTank = 'MT'; // 目前拉著王的坦克
const INFIRM_R = 4.5;
// holder：目前拉著王的坦克；他身上會被放替身，另一位坦克要接手吃死刑
function cursekeeper(holder, next) {
  const other = holder === 'MT' ? 'ST' : 'MT';
  const LEN = 4;
  setCast('咒怨的替身', `${holder} 被詛咒：換 ${other} 站王正面吃死刑`, LEN);
  advice = `${other} 走到王正面（北側），${holder} 離開；其他人遠離坦克。`;
  const hm = byId(holder);
  hm.curse = true;
  setTag(hm, '替身', '#ff8ab0');
  setPlan((m) => {
    if (m.id === other) return TANK_SPOT;
    if (m.id === holder) return P(holder === 'MT' ? -7.5 : 7.5, -3);
    return IDLE[m.id];
  }, 0.4);
  at(t + LEN + 1.5, () => {
    if (state !== 'running') return;
    setCast('無情之魂', '死刑：打離王正面最近的坦克，6m 圓形', 1.5);
    at(t + 1.5, () => {
      if (state !== 'running') return;
      const tanks = members.filter((m) => m.tank);
      const tgt = tanks.sort((a, b) => dist(a, TANK_SPOT) - dist(b, TANK_SPOT))[0];
      strongFlash(circleMesh(tgt.x, tgt.z, INFIRM_R, 0xff4d6d, 0.5));
      const r = [];
      if (tgt.curse)
        r.push(
          `${who(tgt)} 身上有「咒怨的替身」還吃了死刑，傷害會轉成全屏 → 團滅。要讓 ${other} 站到王正面接手。`,
        );
      members.forEach((m) => {
        if (m !== tgt && dist(m, tgt) < INFIRM_R)
          r.push(`${who(m)} 離吃死刑的 ${tgt.id} 太近（${dist(m, tgt).toFixed(1)}m），被死刑波及。`);
      });
      hm.curse = false;
      setTag(hm, '');
      if (r.length) return fail('咒怨的替身（換 T）', r);
      cast = null;
      next(other);
    });
  });
}

/* ---------- 紅圈點名（蛇降）：4 人腳下放圓圈，旁邊不能有人 ---------- */
const DESC_R = 5;
function pickMarked() {
  const g = variant('markVar', ['D', 'S']);
  return members.filter((m) => m.grp === g);
}
function markRed(list) {
  list.forEach((m) => setTag(m, '紅圈', '#ff6b6b'));
}
function redCircleHit(list) {
  const r = [];
  list.forEach((mk) => {
    strongFlash(circleMesh(mk.x, mk.z, DESC_R, 0xff5050, 0.45));
    members.forEach((m) => {
      if (m !== mk && dist(m, mk) < DESC_R)
        r.push(`${who(m)} 被 ${mk.id} 的紅圈打到（相距 ${dist(m, mk).toFixed(1)}m，紅圈半徑 ${DESC_R}m）。`);
    });
    setTag(mk, '');
  });
  return r;
}

/* ---------- 式鬼模型 ---------- */
function wheelShiki(color) {
  const g = new T.Group();
  const mat = new T.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.25 });
  const rim = new T.Mesh(new T.TorusGeometry(1.1, 0.22, 10, 28), mat);
  rim.position.y = 1.5;
  const face = new T.Mesh(new T.SphereGeometry(0.6, 16, 12), mat);
  face.position.y = 1.5;
  g.add(rim, face);
  for (let i = 0; i < 6; i++) {
    const s = new T.Mesh(new T.BoxGeometry(0.1, 2.2, 0.1), mat);
    s.position.y = 1.5;
    s.rotation.z = (i / 6) * Math.PI;
    g.add(s);
  }
  g.userData.spin = rim;
  return g;
}
function rockShiki() {
  const g = new T.Group();
  const mat = new T.MeshStandardMaterial({ color: 0x7a3a2a, roughness: 0.8, emissive: 0x401008 });
  const body = new T.Mesh(new T.DodecahedronGeometry(1.8, 0), mat);
  body.position.y = 2;
  const club = new T.Mesh(new T.CylinderGeometry(0.25, 0.45, 4, 8), new T.MeshStandardMaterial({ color: 0x3a2a22 }));
  club.position.set(1.6, 3.2, 0);
  club.rotation.z = -0.6;
  g.add(body, club);
  return g;
}
// 連線（式鬼 → 目標隊員）
function tetherLine(from, m, color) {
  const geo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
  const line = new T.Line(geo, new T.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
  line.renderOrder = 9;
  tick(() => {
    const p = geo.attributes.position;
    p.setXYZ(0, from.x, 1.5, from.z);
    p.setXYZ(1, m.x, 1.2, m.z);
    p.needsUpdate = true;
    return !line.parent;
  });
  return line;
}
