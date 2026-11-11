/* =====================================================================
 * 常數、職能、場標與小工具
 * 座標：x 往東為正、z 往南為正（北 = -z）。圓形場地半徑 ARENA_R，青龍在正中央。
 * 角度一律「由北起順時針」的度數。
 * ===================================================================== */

const $ = (id) => document.getElementById(id);
const T = THREE;

const ARENA_R = 20, // 場地半徑（影片示意圖的圓形平台）
  BOSS_R = 3.5, // 王的目標圈半徑（NPC 不會站進去）
  SPEED = 6;
const GROUP_NAME = { S: '坦補組', D: 'DPS 組' };
const ROLE_INFO = {
  MT: { grp: 'S', col: 0x4f8dff, tank: 1 },
  ST: { grp: 'S', col: 0x4f8dff, tank: 1 },
  H1: { grp: 'S', col: 0x47c27a, healer: 1 },
  H2: { grp: 'S', col: 0x47c27a, healer: 1 },
  D1: { grp: 'D', col: 0xe0565b },
  D2: { grp: 'D', col: 0xe0565b },
  D3: { grp: 'D', col: 0xe0565b },
  D4: { grp: 'D', col: 0xe0565b },
};
const ROLE_IDS = Object.keys(ROLE_INFO);
// 升龍踩塔的固定搭檔（影片：MT/D1、ST/D2、H1/D3、H2/D4）
const PARTNER = { MT: 'D1', D1: 'MT', ST: 'D2', D2: 'ST', H1: 'D3', D3: 'H1', H2: 'D4', D4: 'H2' };
// AC 分攤：A 組（北，H1 引導）／C 組（南，H2 引導）
const AC_GROUP = { MT: 'A', ST: 'A', H1: 'A', D4: 'A', D1: 'C', D2: 'C', D3: 'C', H2: 'C' };

// 場標：影片示意圖 A 北、B 東、C 南、D 西，都在場邊
const WAYMARKS = {
  A: { x: 0, z: -18.6, col: '#ff5a5a' },
  B: { x: 18.6, z: 0, col: '#ffd84a' },
  C: { x: 0, z: 18.6, col: '#4ab4ff' },
  D: { x: -18.6, z: 0, col: '#c77dff' },
};
// 開場／待機站位：坦克在王北側，其他人在南側
const IDLE = {
  MT: { x: -1.5, z: -5 },
  ST: { x: 1.5, z: -5.5 },
  H1: { x: -3, z: 7.5 },
  H2: { x: 3, z: 7.5 },
  D1: { x: -4.5, z: 2.5 },
  D2: { x: 4.5, z: 2.5 },
  D3: { x: -2, z: 5 },
  D4: { x: 2, z: 5 },
};

const P = (x, z) => ({ x, z });
const dirOf = (a) => {
  const r = (a * Math.PI) / 180;
  return { x: Math.sin(r), z: -Math.cos(r) };
};
const posAt = (a, r, c = { x: 0, z: 0 }) => {
  const d = dirOf(a);
  return { x: c.x + d.x * r, z: c.z + d.z * r };
};
const angOfPt = (p, c = { x: 0, z: 0 }) => {
  const a = (Math.atan2(p.x - c.x, -(p.z - c.z)) * 180) / Math.PI;
  return (a + 360) % 360;
};
const angDiff = (a, b) => {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const len = (p) => Math.hypot(p.x, p.z);
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const who = (m) => (m.isPlayer ? m.id + '（你）' : m.id);
const BOSS = { x: 0, z: 0 };

// 方位文字（給失敗訊息用）
function where(p) {
  if (len(p) < 4) return '中央';
  return ['北', '東北', '東', '東南', '南', '西南', '西', '西北'][Math.round(angOfPt(p) / 45) % 8];
}
const DIR_NAME = { N: '北', E: '東', S: '南', W: '西' };
const DIR_ANG = { N: 0, E: 90, S: 180, W: 270 };

/* ---------- 幾何判定 ---------- */
// 線段型（矩形）範圍：起點 o、方向 d（單位向量）、長 len、半寬 hw
function inLine(p, o, d, l, hw) {
  const vx = p.x - o.x,
    vz = p.z - o.z;
  const along = vx * d.x + vz * d.z;
  const side = Math.abs(vx * -d.z + vz * d.x);
  return along >= -0.3 && along <= l && side <= hw;
}
// 扇形：頂點 o、朝向角 a（度）、半角 half（度）
function inCone(p, o, a, half, l = 60) {
  if (dist(p, o) > l) return false;
  return angDiff(angOfPt(p, o), a) <= half;
}
const norm = (v) => {
  const l = Math.hypot(v.x, v.z) || 1;
  return { x: v.x / l, z: v.z / l };
};
