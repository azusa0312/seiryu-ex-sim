/* =====================================================================
 * 隊員：8 人的模型、頭頂標籤、建立隊伍
 * ===================================================================== */

let members = [],
  player = null;
function makeMember(id, isPlayer) {
  const info = ROLE_INFO[id],
    grp = new T.Group();
  const mat = new T.MeshStandardMaterial({ color: info.col, roughness: 0.5, metalness: 0.1 });
  const body = new T.Mesh(new T.CylinderGeometry(0.26, 0.32, 1.0, 16), mat);
  body.position.y = 0.7;
  body.castShadow = true;
  const head = new T.Mesh(new T.SphereGeometry(0.24, 16, 12), mat);
  head.position.y = 1.42;
  head.castShadow = true;
  const ring = new T.Mesh(
    new T.RingGeometry(0.42, 0.54, 32).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({
      color: isPlayer ? 0xe9c46a : info.col,
      transparent: true,
      opacity: isPlayer ? 1 : 0.55,
    }),
  );
  ring.position.y = 0.06;
  const lbl = makeLabel(isPlayer ? id + ' 你' : id, isPlayer ? '#e9c46a' : '#f4eaef');
  lbl.position.y = 2.1;
  const tag = makeLabel('', '#fff');
  tag.position.y = 2.75;
  tag.scale.multiplyScalar(0.8);
  tag.visible = false;
  grp.add(body, head, ring, lbl, tag);
  scene.add(grp);
  return {
    id,
    grp: info.grp,
    tank: !!info.tank,
    isPlayer,
    obj: grp,
    mat,
    tag,
    x: 0,
    z: 0,
    y: 0,
    vy: 0,
    vuln: 0,
    curse: false,
    waterDown: 0,
    kb: null,
    healer: !!info.healer,
    tx: 0,
    tz: 0,
    slash: -1,
    dead: false,
    reactAt: 0,
    jit: Math.random() * 0.5 - 0.25,
  };
}
function setTag(m, text, color, slash) {
  m._slashTag = !!slash;
  if (!text) {
    m.tag.visible = false;
    return;
  }
  m.tag.material.map = labelTex(text, color);
  m.tag.material.needsUpdate = true;
  m.tag.visible = true;
}
function buildMembers(myId) {
  members.forEach((m) => scene.remove(m.obj));
  members = ROLE_IDS.map((id) => makeMember(id, id === myId));
  player = members.find((m) => m.isPlayer);
}
const byId = (id) => members.find((m) => m.id === id);
