/* =====================================================================
 * 每幀更新：玩家／NPC 移動、跳躍、讀條與 HUD、提示圈、相機，最後啟動主迴圈
 * ===================================================================== */

let dtRun = 0;
// 可走範圍：圓形場地（第二階段外面是水，一般移動也走不出去；只有擊退會把人推下去）
function clampArena(p) {
  const d = Math.hypot(p.x, p.z),
    lim = ARENA_R - 0.4;
  if (d > lim) {
    p.x *= lim / d;
    p.z *= lim / d;
  }
  return p;
}
// 擊退中：沿直線滑到落點，期間不能操作
function updateKnock(m) {
  if (!m.kb) return false;
  const k = Math.min(1, (t - m.kb.t0) / (m.kb.t1 - m.kb.t0));
  m.x = m.kb.x0 + (m.kb.x1 - m.kb.x0) * k;
  m.z = m.kb.z0 + (m.kb.z1 - m.kb.z0) * k;
  if (k >= 1) {
    m.kb = null;
    if (len(m) > ARENA_R - 0.4) {
      m.dead = true;
      m.y = -1.2;
    }
  }
  return true;
}
function moveToward(m, dt) {
  const dx = m.tx - m.x,
    dz = m.tz - m.z,
    d = Math.hypot(dx, dz);
  if (d < 1e-3) return;
  const s = Math.min(d, SPEED * dt);
  m.x += (dx / d) * s;
  m.z += (dz / d) * s;
}
// 跳躍：只有外觀，不影響判定（跟遊戲一樣）
function jump() {
  if (!player || player.dead || player.y > 0.01) return;
  player.vy = 7.5;
}
function updateJump(m, dt) {
  if (m.y <= 0 && m.vy <= 0) return;
  m.vy -= 24 * dt;
  m.y = Math.max(0, m.y + m.vy * dt);
  if (m.y === 0) m.vy = 0;
}
function updatePlayer(dt) {
  if (player.dead || updateKnock(player)) return;
  let f = 0,
    r = 0;
  if (keys.KeyW || keys.ArrowUp) f += 1;
  if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyD || keys.ArrowRight) r += 1;
  if (keys.KeyA || keys.ArrowLeft) r -= 1;
  f -= touchMove.y;
  r += touchMove.x;
  const l = Math.hypot(f, r);
  if (l < 0.05) return;
  if (l > 1) {
    f /= l;
    r /= l;
  }
  const fx_ = -Math.sin(camYaw),
    fz = -Math.cos(camYaw),
    rx = Math.cos(camYaw),
    rz = -Math.sin(camYaw);
  player.x += (fx_ * f + rx * r) * SPEED * dt;
  player.z += (fz * f + rz * r) * SPEED * dt;
  clampArena(player);
}
function updateNpcs(dt) {
  members.forEach((m) => {
    if ((m.isPlayer && !window.__autopilot) || m.dead) return;
    if (!m.isPlayer && updateKnock(m)) return;
    if (m.isPlayer && m.kb) return;
    if (state === 'running' && planFn && t >= m.reactAt) {
      const p = planFn(m);
      if (p) {
        const c = clampArena({ x: p.x, z: p.z });
        m.tx = c.x;
        m.tz = c.z;
      }
    }
    moveToward(m, dt);
    clampArena(m);
  });
}
function updateCastHud() {
  const c = $('cast');
  if (state !== 'running' || (!cast && !advice)) {
    c.hidden = true;
    return;
  }
  c.hidden = false;
  if (cast) {
    $('castName').innerHTML = `${cast.name}<span>${cast.sub}</span>`;
    $('castFill').style.width = Math.min(100, ((t - cast.start) / cast.len) * 100) + '%';
  } else {
    $('castName').innerHTML = '<span>準備</span>';
    $('castFill').style.width = '0%';
  }
  $('advice').textContent = cfg.hintMe && !player.dead ? advice : '';
}
// 提示圈：玩家該站的位置（金色）
const hintRing = new T.Group();
hintRing.add(ringMesh(0, 0, 0.5, 0.75, 0xffd34a, 0.95, 0.12), circleMesh(0, 0, 0.18, 0xffd34a, 0.95, 0.12));
hintRing.renderOrder = 10;
hintRing.children.forEach((c) => (c.renderOrder = 10));
hintRing.visible = false;
scene.add(hintRing);
function updateHint() {
  if (!cfg.hintMe || state !== 'running' || !planFn || window.__autopilot) {
    hintRing.visible = false;
    return;
  }
  const p = planFn(player);
  if (!p) return;
  const c = clampArena({ x: p.x, z: p.z });
  hintRing.visible = true;
  hintRing.position.set(c.x, 0, c.z);
  const s = 1 + Math.sin(performance.now() / 200) * 0.12;
  hintRing.scale.set(s, 1, s);
}
function updateMeHud() {
  if (!player) return;
  $('meRole').textContent = `${player.id}・${GROUP_NAME[player.grp]}`;
  const left = player.vuln - t;
  const deb = [];
  if (left > 0 && state === 'running') deb.push(`魔法受傷加重 ${left.toFixed(1)}s`);
  if (player.curse && state === 'running') deb.push('咒怨的替身（不能吃死刑）');
  if (player.waterDown > t && state === 'running') deb.push('水屬性耐性降低（不能踩塔）');
  $('meDeb').innerHTML = deb.map((d) => `<span class="deb">${d}</span>`).join('');
  $('meRec').textContent = `通過 ${stats.clears} / 嘗試 ${stats.tries}`;
}
function updateCamera() {
  const tx = player.x,
    tz = player.z,
    cp = Math.cos(camPitch);
  camera.position.set(
    tx + Math.sin(camYaw) * cp * camDist,
    Math.sin(camPitch) * camDist + 1 + player.y * 0.5,
    tz + Math.cos(camYaw) * cp * camDist,
  );
  camera.lookAt(tx, 1.8 + player.y * 0.5, tz);
}

/* 推進一步模擬：時間軸事件、移動、特效 */
function simulate(dt) {
  dtRun = state === 'running' ? dt : 0;
  if (state === 'running') {
    t += dt;
    while (state === 'running' && events.length && events[0].at <= t) {
      const e = events.shift();
      e.fn();
    }
    if (state === 'running') ticks = ticks.filter((fn) => !fn());
  }
  updatePlayer(dt);
  updateNpcs(dt);
  members.forEach((m) => {
    if (!m.dead) updateJump(m, dt);
    m.obj.position.set(m.x, m.y, m.z);
  });
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i];
    if (state === 'running' && t > f.until) {
      scene.remove(f.obj);
      fx.splice(i, 1);
      continue;
    }
    if (f.fade && f.obj.material)
      f.obj.material.opacity = (f.op0 || 0.55) * Math.max(0, 1 - (t - f.born) / (f.until - f.born));
  }
}

/* 畫面：相機、HUD、渲染 */
function render() {
  updateCamera();
  updateHint();
  updateCastHud();
  updateMeHud();
  renderer.render(scene, camera);
}

/* 主迴圈。window.__substeps 只給自動測試用（一幀跑多步，加快模擬） */
const clock = new T.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const steps = window.__substeps || 1;
  for (let i = 0; i < steps; i++) simulate(dt);
  render();
  requestAnimationFrame(frame);
}

readCfg();
placeIdle();
requestAnimationFrame(frame);
