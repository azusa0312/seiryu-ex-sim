/* =====================================================================
 * 輸入：鍵盤（WASD 移動、空白鍵跳躍、Enter 開始）、滑鼠拖曳視角、滾輪縮放、手機虛擬搖桿
 * ===================================================================== */

const keys = {};
addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || (tag === 'BUTTON' && e.code !== 'Space')) return;
  // 空白鍵：進行中 = 跳躍；還沒開始／結束後 = 開始。Enter 一律開始／重來
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault();
    if (tag === 'BUTTON') e.target.blur();
    if (e.code === 'Space' && state === 'running') jump();
    else if (!e.repeat) start();
    return;
  }
  keys[e.code] = true;
});
addEventListener('keyup', (e) => {
  keys[e.code] = false;
});
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
});
$('go').addEventListener('click', (e) => {
  e.currentTarget.blur();
  start();
});

let camYaw = 0,
  camPitch = 0.72,
  camDist = 20;
const cvs = renderer.domElement;
let drag = null,
  joy = null;
const touchMove = { x: 0, y: 0 };
cvs.addEventListener('contextmenu', (e) => e.preventDefault());
cvs.addEventListener('pointerdown', (e) => {
  cvs.setPointerCapture(e.pointerId);
  if (e.pointerType === 'touch' && e.clientX < innerWidth / 2 && !joy) {
    joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
    const j = $('joy');
    j.hidden = false;
    j.style.left = e.clientX - 55 + 'px';
    j.style.top = e.clientY - 55 + 'px';
    return;
  }
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
cvs.addEventListener('pointermove', (e) => {
  if (joy && e.pointerId === joy.id) {
    let dx = e.clientX - joy.ox,
      dy = e.clientY - joy.oy;
    const l = Math.hypot(dx, dy),
      mx = 50;
    if (l > mx) {
      dx *= mx / l;
      dy *= mx / l;
    }
    touchMove.x = dx / mx;
    touchMove.y = dy / mx;
    $('knob').style.transform = `translate(${dx}px,${dy}px)`;
    return;
  }
  if (drag && e.pointerId === drag.id) {
    camYaw -= (e.clientX - drag.x) * 0.006;
    camPitch = Math.max(0.15, Math.min(1.35, camPitch + (e.clientY - drag.y) * 0.005));
    drag.x = e.clientX;
    drag.y = e.clientY;
  }
});
function endPtr(e) {
  if (joy && e.pointerId === joy.id) {
    joy = null;
    touchMove.x = touchMove.y = 0;
    $('joy').hidden = true;
    $('knob').style.transform = '';
  }
  if (drag && e.pointerId === drag.id) drag = null;
}
cvs.addEventListener('pointerup', endPtr);
cvs.addEventListener('pointercancel', endPtr);
cvs.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    camDist = Math.max(5, Math.min(40, camDist + e.deltaY * 0.012));
  },
  { passive: false },
);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
