/* =====================================================================
 * 共用視覺：文字標籤、地面範圍（圓／環／扇／矩形／直線）、巨手模型、暫時性特效
 * renderOrder：地板 1–2、一般特效 5、預兆 8
 * ===================================================================== */

const labelCache = {};
function labelTex(text, color) {
  const key = text + color;
  if (labelCache[key]) return labelCache[key];
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 96;
  const g = cv.getContext('2d');
  g.font = '700 46px "Noto Sans TC",system-ui,sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(10,5,10,.9)';
  g.strokeText(text, 128, 50);
  g.fillStyle = color;
  g.fillText(text, 128, 50);
  return (labelCache[key] = canvasTex(cv));
}
function makeLabel(text, color) {
  const s = new T.Sprite(
    new T.SpriteMaterial({ map: labelTex(text, color), transparent: true, depthWrite: false }),
  );
  s.scale.set(1.9, 0.71, 1);
  return s;
}

// 暫時性特效：{obj, until, fade, born}
let fx = [];
function addFx(obj, life, fade = true) {
  if (!obj.renderOrder) obj.renderOrder = 5;
  obj.traverse((o) => {
    if (o !== obj && !o.renderOrder) o.renderOrder = obj.renderOrder;
  });
  scene.add(obj);
  fx.push({ obj, born: t, until: t + life, fade, op0: obj.material ? obj.material.opacity : 1 });
  return obj;
}
function removeFx(obj) {
  scene.remove(obj);
  fx = fx.filter((f) => f.obj !== obj);
}
// 預兆（讀條開始就顯示，判定時移除）
function omen(obj, life) {
  obj.renderOrder = 8;
  return addFx(obj, life, false);
}
// 判定瞬間的特效：加亮混色並淡出
function strongFlash(mesh) {
  mesh.traverse((o) => {
    if (o.material) {
      o.material = o.material.clone();
      o.material.blending = T.AdditiveBlending;
      o.material.opacity = Math.min(1, (o.material.opacity || 0.5) + 0.35);
    }
  });
  if (mesh.children.length && mesh.children[0].material) mesh.material = mesh.children[0].material;
  mesh.renderOrder = 9;
  addFx(mesh, 0.9);
}
function clearFx() {
  fx.forEach((f) => scene.remove(f.obj));
  fx = [];
}
function groundMat(color, op) {
  return new T.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: op,
    depthWrite: false,
    side: T.DoubleSide,
  });
}
function circleMesh(x, z, r, color, op = 0.45, y = 0.07) {
  const m = new T.Mesh(new T.CircleGeometry(r, 48).rotateX(-Math.PI / 2), groundMat(color, op));
  m.position.set(x, y, z);
  return m;
}
function ringMesh(x, z, r0, r1, color, op = 0.45, y = 0.07) {
  const m = new T.Mesh(new T.RingGeometry(r0, r1, 64).rotateX(-Math.PI / 2), groundMat(color, op));
  m.position.set(x, y, z);
  return m;
}
// 扇形：頂點 o、朝向角 a（度，由北順時針）、半角 half（度）
function coneMesh(o, a, half, len, color, op = 0.5, y = 0.08) {
  const h = (half * Math.PI) / 180;
  const m = new T.Mesh(new T.CircleGeometry(len, 32, -h, h * 2).rotateX(-Math.PI / 2), groundMat(color, op));
  const d = dirOf(a);
  m.position.set(o.x, y, o.z);
  m.rotation.y = Math.atan2(-d.z, d.x);
  return m;
}
// 軸對齊矩形
function rectMesh(x0, x1, z0, z1, color, op = 0.45, y = 0.07) {
  const m = new T.Mesh(
    new T.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)).rotateX(-Math.PI / 2),
    groundMat(color, op),
  );
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  return m;
}
// 直線：起點 o、方向 d、長 len、半寬 hw（外框加亮邊）
function lineMesh(o, d, len, hw, color, op = 0.45, y = 0.08) {
  const g = new T.Group();
  const fill = new T.Mesh(new T.PlaneGeometry(hw * 2, len).rotateX(-Math.PI / 2), groundMat(color, op));
  fill.position.z = len / 2;
  const e1 = new T.Mesh(new T.PlaneGeometry(0.12, len).rotateX(-Math.PI / 2), groundMat(color, 0.95));
  e1.position.set(hw, 0.005, len / 2);
  const e2 = e1.clone();
  e2.position.x = -hw;
  g.add(fill, e1, e2);
  g.position.set(o.x, y, o.z);
  g.rotation.y = Math.atan2(d.x, d.z);
  g.material = fill.material;
  return g;
}

/* ---------- 巨手模型（大太法師的手印） ---------- */
function handModel(scale = 1, color = 0x16101e) {
  const g = new T.Group();
  const mat = new T.MeshStandardMaterial({
    color,
    roughness: 0.4,
    emissive: 0x2a0a50,
    emissiveIntensity: 0.6,
  });
  const palm = new T.Mesh(new T.BoxGeometry(1.2, 0.35, 1.2), mat);
  palm.position.y = 0.9;
  const arm = new T.Mesh(new T.CylinderGeometry(0.35, 0.5, 1.0, 10), mat);
  arm.position.y = 0.4;
  g.add(palm, arm);
  for (let i = 0; i < 4; i++) {
    const f = new T.Mesh(new T.CylinderGeometry(0.09, 0.12, 1.1, 6), mat);
    f.rotation.x = Math.PI / 2 - 0.3;
    f.position.set((i - 1.5) * 0.3, 1.05, 0.95);
    g.add(f);
  }
  const th = new T.Mesh(new T.CylinderGeometry(0.1, 0.13, 0.8, 6), mat);
  th.rotation.z = 1.1;
  th.position.set(0.75, 0.95, 0.2);
  g.add(th);
  g.scale.setScalar(scale);
  return g;
}
// 黑手朝向：手指指向方向 d
function placeHand(h, p, d) {
  h.position.set(p.x, 0, p.z);
  h.rotation.y = Math.atan2(d.x, d.z);
  return h;
}

// 文字立牌（例如塔的人數、輪盤編號）
function floatLabel(text, color, x, z, y = 2.2, s = 1) {
  const l = makeLabel(text, color);
  l.position.set(x, y, z);
  l.scale.multiplyScalar(s);
  return l;
}

function screenFlash() {
  const f = $('flash');
  f.style.opacity = 1;
  setTimeout(() => (f.style.opacity = 0), 350);
}
