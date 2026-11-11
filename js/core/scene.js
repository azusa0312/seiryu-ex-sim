/* =====================================================================
 * 場景：渲染器、相機、燈光、圓形場地（第一階段木造平台／第二階段水上岩島）、
 * 場標、青龍（王）模型
 * ===================================================================== */

let renderer;
try {
  renderer = new T.WebGLRenderer({ antialias: true });
} catch (e) {
  window.__fatal('無法建立 WebGL，請開啟瀏覽器硬體加速。');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);

const scene = new T.Scene();
scene.background = new T.Color(0x0a1a1d);
scene.fog = new T.Fog(0x0a1a1d, 40, 95);
const camera = new T.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 200);
const hemi = new T.HemisphereLight(0xdff7ee, 0x14221c, 0.95);
scene.add(hemi);
const sun = new T.DirectionalLight(0xfff2dc, 1.35);
sun.position.set(-12, 30, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
scene.add(sun);

function canvasTex(cv) {
  const t = new T.CanvasTexture(cv);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- 第一階段地板：木板圓台＋中央八角石框＋紅色內圈 ---------- */
function woodTexture() {
  const W = 1024,
    c = W / 2,
    k = W / (ARENA_R * 2),
    cv = document.createElement('canvas');
  cv.width = cv.height = W;
  const g = cv.getContext('2d');
  g.fillStyle = '#7a5a3a';
  g.fillRect(0, 0, W, W);
  // 木板：平行條紋
  for (let y = 0; y < W; y += 22) {
    g.fillStyle = `hsl(${28 + Math.random() * 6},${34 + Math.random() * 10}%,${30 + Math.random() * 10}%)`;
    g.fillRect(0, y, W, 21);
    g.fillStyle = 'rgba(30,18,8,.5)';
    g.fillRect(0, y + 20, W, 2);
    for (let x = Math.random() * 200; x < W; x += 160 + Math.random() * 200) g.fillRect(x, y, 2, 21);
  }
  // 八角形石框
  const oct = (r) => {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      g.lineTo(c + Math.cos(a) * r * k, c + Math.sin(a) * r * k);
    }
    g.closePath();
  };
  oct(11);
  g.fillStyle = '#52675e';
  g.fill();
  oct(8.6);
  g.fillStyle = '#3c4f49';
  g.fill();
  oct(7.4);
  const rg = g.createRadialGradient(c, c, 0, c, c, 7.4 * k);
  rg.addColorStop(0, '#d0603e');
  rg.addColorStop(1, '#a8452f');
  g.fillStyle = rg;
  g.fill();
  g.strokeStyle = 'rgba(255,220,180,.35)';
  g.lineWidth = 3;
  for (let r = 2; r < 7; r += 1.6) {
    g.beginPath();
    g.arc(c, c, r * k, 0, 7);
    g.stroke();
  }
  // 雲紋飾塊（八個方向）
  g.fillStyle = '#6d7f76';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath();
    g.arc(c + Math.cos(a) * 12.4 * k, c + Math.sin(a) * 12.4 * k, 1.3 * k, 0, 7);
    g.fill();
  }
  // 外緣欄杆
  g.strokeStyle = '#3a2412';
  g.lineWidth = 14;
  g.beginPath();
  g.arc(c, c, ARENA_R * k - 7, 0, 7);
  g.stroke();
  return canvasTex(cv);
}
/* ---------- 第二階段地板：裂紋岩島 ---------- */
function rockTexture() {
  const W = 1024,
    c = W / 2,
    k = W / (ARENA_R * 2),
    cv = document.createElement('canvas');
  cv.width = cv.height = W;
  const g = cv.getContext('2d');
  const bg = g.createRadialGradient(c, c, 0, c, c, c);
  bg.addColorStop(0, '#6b5236');
  bg.addColorStop(1, '#4a3826');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, W);
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,230,190' : '20,12,6'},${Math.random() * 0.08})`;
    g.fillRect(Math.random() * W, Math.random() * W, Math.random() * 7 + 1, Math.random() * 7 + 1);
  }
  g.strokeStyle = 'rgba(25,15,8,.75)';
  for (let i = 0; i < 26; i++) {
    g.lineWidth = 1 + Math.random() * 3;
    let x = Math.random() * W,
      y = Math.random() * W;
    g.beginPath();
    g.moveTo(x, y);
    for (let j = 0; j < 8; j++) {
      x += (Math.random() - 0.5) * 120;
      y += (Math.random() - 0.5) * 120;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.strokeStyle = 'rgba(200,240,255,.55)';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(c, c, ARENA_R * k - 3, 0, 7);
  g.stroke();
  return canvasTex(cv);
}
const floorMat = new T.MeshStandardMaterial({ map: woodTexture(), roughness: 0.9 });
const rockMap = rockTexture(),
  woodMap = floorMat.map;
const floor = new T.Mesh(new T.CircleGeometry(ARENA_R, 96).rotateX(-Math.PI / 2), floorMat);
floor.receiveShadow = true;
scene.add(floor);
// 平台側面
const rim = new T.Mesh(
  new T.CylinderGeometry(ARENA_R, ARENA_R - 0.4, 1.4, 96, 1, true),
  new T.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9 }),
);
rim.position.y = -0.7;
scene.add(rim);
// 外圍：第一階段是山谷（深綠），第二階段是水面
const ground = new T.Mesh(
  new T.PlaneGeometry(240, 240).rotateX(-Math.PI / 2),
  new T.MeshStandardMaterial({ color: 0x1d3328, roughness: 1 }),
);
ground.position.y = -3;
scene.add(ground);
const water = new T.Mesh(
  new T.RingGeometry(ARENA_R - 0.2, 120, 96).rotateX(-Math.PI / 2),
  new T.MeshStandardMaterial({
    color: 0x1f5a78,
    roughness: 0.25,
    metalness: 0.35,
    transparent: true,
    opacity: 0.92,
  }),
);
water.position.y = -0.25;
water.visible = false;
scene.add(water);
let arenaMode = 'p1';
function setArena(mode) {
  arenaMode = mode;
  const p2 = mode === 'p2';
  floorMat.map = p2 ? rockMap : woodMap;
  floorMat.needsUpdate = true;
  water.visible = p2;
  ground.visible = !p2;
  rim.material.color.setHex(p2 ? 0x3a2c1e : 0x4a3420);
  scene.background.setHex(p2 ? 0x1b2033 : 0x0a1a1d);
  scene.fog.color.setHex(p2 ? 0x1b2033 : 0x0a1a1d);
}

function markTex(lbl, col) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = col + '55';
  g.strokeStyle = col;
  g.lineWidth = 7;
  g.beginPath();
  g.arc(64, 64, 52, 0, 7);
  g.fill();
  g.stroke();
  g.fillStyle = '#fff';
  g.font = '900 64px system-ui,sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(lbl, 64, 68);
  return canvasTex(cv);
}
Object.entries(WAYMARKS).forEach(([l, w]) => {
  const m = new T.Mesh(
    new T.PlaneGeometry(1.7, 1.7).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ map: markTex(l, w.col), transparent: true, depthWrite: false }),
  );
  m.position.set(w.x, 0.04, w.z);
  m.renderOrder = 1;
  scene.add(m);
  const beam = new T.Mesh(
    new T.CylinderGeometry(0.5, 0.5, 3, 16, 1, true),
    new T.MeshBasicMaterial({ color: w.col, transparent: true, opacity: 0.25, depthWrite: false }),
  );
  beam.position.set(w.x, 1.5, w.z);
  scene.add(beam);
});

/* ---------- 王：青龍（盤成一圈的龍身＋騎乘的式神使） ---------- */
const boss = new T.Group();
{
  const scale = new T.MeshStandardMaterial({ color: 0x2f5f78, roughness: 0.45, metalness: 0.3 });
  const belly = new T.MeshStandardMaterial({ color: 0xd8c27a, roughness: 0.6 });
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2.4 + 0.6;
    const r = 2.4 - i * 0.012;
    pts.push(new T.Vector3(Math.cos(a) * r, 0.9 + i * 0.07 + Math.sin(i * 0.5) * 0.25, Math.sin(a) * r));
  }
  const curve = new T.CatmullRomCurve3(pts);
  const body = new T.Mesh(new T.TubeGeometry(curve, 120, 0.7, 12), scale);
  body.castShadow = true;
  const head = new T.Group();
  const skull = new T.Mesh(new T.BoxGeometry(1.2, 0.9, 2.2), scale);
  const jaw = new T.Mesh(new T.BoxGeometry(1.0, 0.35, 1.8), belly);
  jaw.position.set(0, -0.5, 0.2);
  const hornMat = new T.MeshStandardMaterial({ color: 0xe8d38a, roughness: 0.4 });
  [-1, 1].forEach((s) => {
    const h = new T.Mesh(new T.ConeGeometry(0.12, 1.4, 8), hornMat);
    h.position.set(s * 0.4, 0.8, -0.7);
    h.rotation.x = -0.9;
    head.add(h);
    const eye = new T.Mesh(
      new T.SphereGeometry(0.12, 8, 8),
      new T.MeshBasicMaterial({ color: 0x9fffe0 }),
    );
    eye.position.set(s * 0.5, 0.15, 0.7);
    head.add(eye);
  });
  head.add(skull, jaw);
  head.position.set(0, 4.6, 1.6);
  // 騎乘者
  const rider = new T.Group();
  const robe = new T.MeshStandardMaterial({ color: 0xe9e4f0, roughness: 0.6 });
  const torso = new T.Mesh(new T.CylinderGeometry(0.45, 0.7, 1.8, 14), robe);
  torso.position.y = 0.9;
  const rh = new T.Mesh(
    new T.SphereGeometry(0.38, 14, 12),
    new T.MeshStandardMaterial({ color: 0x8fb3d6, roughness: 0.5 }),
  );
  rh.position.y = 2.1;
  const crown = new T.Mesh(new T.TorusGeometry(0.5, 0.07, 8, 24), hornMat);
  crown.position.y = 2.5;
  crown.rotation.x = Math.PI / 2;
  rider.add(torso, rh, crown);
  rider.position.set(0, 3.6, -0.4);
  boss.add(body, head, rider);
}
boss.position.set(0, 0, 0);
scene.add(boss);
// 王面向：角度（由北順時針）
function faceBoss(a) {
  const d = dirOf(a);
  boss.rotation.y = Math.atan2(d.x, d.z);
}
faceBoss(0);
