/* =====================================================================
 * 第二階段（水上岩島）：蛇潮、大太法師手印＋自然之力、禁術（分攤／AC 分攤）、
 * 荒魂燃燒、升龍踩塔、以及組合段落
 * ===================================================================== */

function ensureP2() {
  if (arenaMode !== 'p2') setArena('p2');
}
/* 轉場：力量的展現 → 龍之湧泉，場地變成水上岩島 */
function transition(next) {
  setCast('龍之湧泉', '轉場：場地被水淹沒，只剩中間岩島（掉進水裡＝出局）', 4);
  advice = '轉場全屏傷害，岩島外面是水，被擊退到水裡就出局。';
  setPlan(UPTIME, 0.3);
  at(t + 4, () => {
    if (state !== 'running') return;
    screenFlash();
    setArena('p2');
    cast = null;
    next();
  });
}

/* ---------- 蛇潮：蛇群從某一側衝過全場，把人往對面推 22m ---------- */
const SNAKE_PUSH = 22,
  FORCE_PUSH = 10;
function snakeWall(side, life) {
  const g = new T.Group();
  const mat = new T.MeshStandardMaterial({ color: 0x5fae6a, roughness: 0.5, emissive: 0x1a4020 });
  for (let i = -10; i <= 10; i++) {
    const s = new T.Mesh(new T.CylinderGeometry(0.22, 0.32, 1.6 + Math.random() * 0.8, 8), mat);
    s.position.set(i * 2, 0.9, Math.random() * 1.2);
    s.rotation.x = 0.4;
    g.add(s);
  }
  const p = posAt(DIR_ANG[side], ARENA_R + 2);
  g.position.set(p.x, 0, p.z);
  g.rotation.y = -(DIR_ANG[side] * Math.PI) / 180;
  return addFx(g, life, false);
}
// 蛇的位置 → 推的方向（往對面）
const snakeDir = (side) => dirOf((DIR_ANG[side] + 180) % 360);
function snakeArrows(side, life) {
  const d = snakeDir(side),
    g = new T.Group();
  [-10, 0, 10].forEach((o) => {
    const perp = { x: -d.z, z: d.x };
    const s = posAt(DIR_ANG[side], 16);
    g.add(lineMesh(P(s.x + perp.x * o, s.z + perp.z * o), d, 10, 0.5, 0x8ff0a0, 0.55, 0.1));
  });
  return omen(g, life);
}
// 站位：往蛇那一側 dd 公尺，左右散開
function snakeSpot(side, dd) {
  return (m) => {
    const a = DIR_ANG[side],
      perpA = a + 90;
    const lat = (ROLE_IDS.indexOf(m.id) - 3.5) * 0.9;
    const b = posAt(a, dd);
    const q = posAt(perpA, lat);
    return P(b.x + q.x, b.z + q.z);
  };
}
function riverPush(side) {
  const d = snakeDir(side);
  return knockAll(
    () => ({ x: d.x * SNAKE_PUSH, z: d.z * SNAKE_PUSH }),
    `被蛇潮往${DIR_NAME[{ N: 'S', S: 'N', E: 'W', W: 'E' }[side]]}推了 ${SNAKE_PUSH}m，掉進水裡。要站在蛇來的那一側。`,
  );
}
function snakes(next) {
  ensureP2();
  const side = variant('snakeVar', ['N', 'E', 'S', 'W']);
  setCast('式鬼召喚・蛇', `蛇群出現在${DIR_NAME[side]}邊`, 3);
  advice = `蛇在${DIR_NAME[side]}邊：會往對面推 ${SNAKE_PUSH}m → 站到${DIR_NAME[side]}側靠邊。`;
  snakeWall(side, 8);
  snakeArrows(side, 8);
  setPlan(snakeSpot(side, 12), 0.5);
  at(t + 3, () => {
    setCast('奔流', `蛇潮往對面推 ${SNAKE_PUSH}m`, 4);
    at(t + 4, () => {
      if (state !== 'running') return;
      const r = riverPush(side);
      setPlan(() => null);
      at(t + 0.6, () => {
        if (r.length) return fail('蛇潮（奔流）', r);
        cast = null;
        next();
      });
    });
  });
}

/* ---------- 大太法師：北邊的巨人舉起哪隻手，就拍哪半場 ---------- */
let yama = null;
function yamaShow(life) {
  const g = new T.Group();
  const mat = new T.MeshStandardMaterial({
    color: 0x6d6a8a,
    roughness: 0.6,
    transparent: true,
    opacity: 0.85,
  });
  const body = new T.Mesh(new T.SphereGeometry(9, 24, 18), mat);
  body.scale.set(1.3, 1, 0.8);
  body.position.y = 8;
  const head = new T.Mesh(new T.SphereGeometry(4, 18, 14), mat);
  head.position.y = 18;
  g.add(body, head);
  g.position.set(0, 0, -34);
  yama = addFx(g, life, false);
  return yama;
}
function handHalf(side, op) {
  return side === 'E' ? rectMesh(0, ARENA_R, -ARENA_R, ARENA_R, 0xffc04a, op) : rectMesh(-ARENA_R, 0, -ARENA_R, ARENA_R, 0xffc04a, op);
}
const HAND_MARGIN = 1;
function handprint(side, next, i) {
  const LEN = 4;
  setCast('手印', `大太法師舉起${side === 'E' ? '右（東）' : '左（西）'}手：拍${DIR_NAME[side]}半場`, LEN);
  advice = `拍${DIR_NAME[side]}半場 → 去${side === 'E' ? '西' : '東'}半場。`;
  const s = side === 'E' ? 1 : -1;
  const h = omen(handModel(5, 0x6d6a8a), LEN);
  h.position.set(s * 12, 9, -10);
  h.rotation.x = Math.PI;
  const o = omen(handHalf(side, 0.16), LEN);
  setPlan((m) => {
    const k = ROLE_IDS.indexOf(m.id);
    return P(-s * (5 + (k % 2) * 2.5), -6 + Math.floor(k / 2) * 4);
  }, 0.25);
  at(t + LEN, () => {
    if (state !== 'running') return;
    removeFx(h);
    removeFx(o);
    strongFlash(handHalf(side, 0.5));
    const r = [];
    members.forEach((m) => {
      if (m.x * s > -HAND_MARGIN)
        r.push(`${who(m)} 在${DIR_NAME[side]}半場被大太法師的手印拍到（要離中線 ${HAND_MARGIN}m 以上）。`);
    });
    if (r.length) return fail(`手印（第 ${i} 下）`, r);
    next();
  });
}
const handSide = (i) => {
  const f = window.__force_hand;
  return f ? f[i % f.length] : pick(['E', 'W']);
};
/* 自然之力：從中心往外擊退 10m；接著蛇潮推 22m */
function forceAndSnakes(side, next) {
  const LEN = 5;
  setCast('自然之力', `從中心往外擊退 ${FORCE_PUSH}m，接著${DIR_NAME[side]}邊的蛇潮推 ${SNAKE_PUSH}m`, LEN);
  advice = `離開正中央、往${DIR_NAME[side]}（蛇那側）站約 5m：先被彈到${DIR_NAME[side]}邊，再被蛇推回島上。`;
  const ring = omen(ringMesh(0, 0, 1, 2.2, 0xb0f0ff, 0.6), LEN);
  setPlan(snakeSpot(side, 5.5), 0.3);
  at(t + LEN, () => {
    if (state !== 'running') return;
    removeFx(ring);
    strongFlash(ringMesh(0, 0, 0.5, ARENA_R, 0xb0f0ff, 0.25));
    const away = snakeDir(side);
    const r = knockAll((m) => {
      let d = len(m) < 0.5 ? away : norm(m);
      return { x: d.x * FORCE_PUSH, z: d.z * FORCE_PUSH };
    }, `被自然之力從中心彈出 ${FORCE_PUSH}m 掉進水裡。不要站太外面（離中心 10m 內）。`);
    setPlan(() => null);
    at(t + 0.6, () => {
      if (r.length) return fail('自然之力', r);
      setCast('奔流', `蛇潮往對面推 ${SNAKE_PUSH}m`, 1.6);
      at(t + 1.6, () => {
        if (state !== 'running') return;
        const r2 = riverPush(side);
        at(t + 0.6, () => {
          if (r2.length) return fail('蛇潮（奔流）', r2);
          cast = null;
          next();
        });
      });
    });
  });
}
/* 大太法師三連手印 → 蛇出現 → 自然之力＋蛇潮 */
function yamaSeq(next) {
  ensureP2();
  setCast('式鬼召喚・山', '北邊出現大太法師：看舉起的手', 2.5);
  advice = '大太法師舉起哪邊的手，就躲到另一邊。';
  yamaShow(40);
  setPlan(UPTIME, 0.3);
  const side = variant('snakeVar', ['N', 'E', 'S', 'W']);
  at(t + 2.5, () =>
    handprint(handSide(0), () => {
      screenFlash(); // 中間夾一次陰陽五行
      handprint(handSide(1), () => {
        snakeWall(side, 12);
        snakeArrows(side, 12);
        handprint(handSide(2), () => forceAndSnakes(side, next), 3);
      }, 2);
    }, 1),
  );
}

/* ---------- 禁術：直線分攤（從王拉到治療） ---------- */
const STACK_HW = 2.2;
const ONE_STACK = {
  H1: P(-0.6, 12),
  H2: P(0.6, 12),
  MT: P(-0.8, 7),
  ST: P(0.8, 7),
  D1: P(-0.8, 8.5),
  D2: P(0.8, 8.5),
  D3: P(-0.8, 10),
  D4: P(0.8, 10),
};
const AC_SPOT = {
  H1: P(0, -12),
  MT: P(-0.9, -7.5),
  ST: P(0.9, -7.5),
  D4: P(0, -9.5),
  H2: P(0, 12),
  D1: P(-0.9, 7.5),
  D2: P(0.9, 7.5),
  D3: P(0, 9.5),
};
function stackLine(healer) {
  const h = byId(healer);
  const d = norm(len(h) < 0.5 ? P(0, 1) : h);
  return { o: P(0, 0), d };
}
// split=false：全員同一條（荒魂燃燒前）；split=true：A 組北（H1）、C 組南（H2），吃兩條會死
function forbiddenArts(split, next) {
  ensureP2();
  const LEN = 5;
  setCast(
    '禁術・雙重',
    split ? 'AC 分攤：A 組（北）跟 H1、C 組（南）跟 H2，吃到兩條會死' : '直線分攤兩次（H1 → H2），全員站在一起',
    LEN,
  );
  advice = split
    ? `你是 ${AC_GROUP[player.id]} 組：${AC_GROUP[player.id] === 'A' ? '去北邊 A 點方向，站在 H1 的直線上' : '去南邊 C 點方向，站在 H2 的直線上'}。`
    : '全員集合到王的南邊，兩次直線分攤都吃。';
  setTag(byId('H1'), '分攤', '#ffd34a');
  setPlan((m) => (split ? AC_SPOT : ONE_STACK)[m.id], 0.4);
  const hit = {};
  members.forEach((m) => (hit[m.id] = []));
  const fire = (healer, k, after) => {
    const L = stackLine(healer);
    strongFlash(lineMesh(L.o, L.d, 26, STACK_HW, 0xffd34a, 0.5));
    members.forEach((m) => {
      if (inLine(m, L.o, L.d, 26, STACK_HW)) hit[m.id].push(healer);
    });
    after();
  };
  at(t + LEN, () => {
    if (state !== 'running') return;
    fire('H1', 1, () => {
      setTag(byId('H1'), '');
      setCast('禁術・雙重', '第二條：H2', 2.2);
      at(t + 2.2, () => {
        if (state !== 'running') return;
        fire('H2', 2, () => {
          const r = [];
          members.forEach((m) => {
            const hs = hit[m.id];
            if (split) {
              const want = AC_GROUP[m.id] === 'A' ? 'H1' : 'H2';
              if (hs.length > 1)
                r.push(`${who(m)} 吃到兩條直線分攤（易傷疊加致死）。AC 分攤只吃自己組那條。`);
              else if (!hs.includes(want))
                r.push(
                  `${who(m)} 沒吃到自己組的分攤（${AC_GROUP[m.id]} 組要站在王到 ${want} 的直線上，往${AC_GROUP[m.id] === 'A' ? '北' : '南'}）。`,
                );
            } else if (hs.length < 2) r.push(`${who(m)} 沒有吃到${hs.length ? '其中一條' : '任何一條'}直線分攤（全員站在一起吃兩次）。`);
          });
          if (r.length) return fail(split ? 'AC 分攤' : '直線分攤', r);
          cast = null;
          next();
        });
      });
    });
  });
}
function blazing(next) {
  setCast('荒魂燃燒', '全屏＋之後的分攤會附加易傷（下一次要分兩組）', 3);
  advice = '全屏傷害。之後的禁術要 AC 兩組分開吃。';
  setPlan(UPTIME, 0.3);
  at(t + 3, () => {
    if (state !== 'running') return;
    screenFlash();
    cast = null;
    next();
  });
}

/* ---------- 升龍踩塔：先集合放水圈 → 點名 4 人放紅圈去正點、另外 4 人踩斜角塔 ---------- */
const TOWERS = { NW: P(-10.5, -10.5), NE: P(10.5, -10.5), SW: P(-10.5, 10.5), SE: P(10.5, 10.5) };
const TOWER_R = 3.5,
  PUDDLE_R = 3;
// 搭檔組：MT/D1 北／西北塔、ST/D2 東／東北塔、H1/D3 西／西南塔、H2/D4 南／東南塔
const PAIR_SLOT = {
  MT: ['N', 'NW'],
  D1: ['N', 'NW'],
  ST: ['E', 'NE'],
  D2: ['E', 'NE'],
  H1: ['W', 'SW'],
  D3: ['W', 'SW'],
  H2: ['S', 'SE'],
  D4: ['S', 'SE'],
};
const SPREAD_CARD = { N: P(0, -14), E: P(14, 0), W: P(-14, 0), S: P(0, 14) };
function towerMesh(c, op) {
  const g = new T.Group();
  g.add(circleMesh(c.x, c.z, TOWER_R, 0x7fd8ff, op), ringMesh(c.x, c.z, TOWER_R - 0.25, TOWER_R, 0xe0f8ff, 0.9));
  return g;
}
function serpentAscending(next) {
  ensureP2();
  setCast('升龍', '全員集合到王身上：腳下會留下水圈', 3.5);
  advice = '先全員集合在正中央（水圈疊在一起），之後再散開。';
  setPlan((m) => {
    const k = ROLE_IDS.indexOf(m.id);
    return P(((k % 3) - 1) * 0.6, (Math.floor(k / 3) - 1) * 0.6);
  }, 0.3);
  at(t + 3.5, () => {
    if (state !== 'running') return;
    const puddles = members.map((m) => {
      const p = P(m.x, m.z);
      addFx(circleMesh(p.x, p.z, PUDDLE_R, 0x2a7fb0, 0.5, 0.06), 9, false);
      return p;
    });
    const marked = pickMarked();
    markRed(marked);
    marked.forEach((m) => (m.waterDown = t + 20));
    const LEN = 6;
    setCast('蛇降', `${marked[0].grp === 'D' ? 'DPS' : '坦補'}點名紅圈去正點，另外 4 人踩斜角塔`, LEN);
    const isM = (m) => marked.includes(m);
    advice = isM(player)
      ? `你有紅圈（不能踩塔）：去${DIR_NAME[PAIR_SLOT[player.id][0]]}邊散開。`
      : `沒紅圈：去${{ NW: '西北', NE: '東北', SW: '西南', SE: '東南' }[PAIR_SLOT[player.id][1]]}的塔。`;
    const tw = Object.values(TOWERS).map((c) => omen(towerMesh(c, 0.3), LEN));
    setPlan((m) => (isM(m) ? SPREAD_CARD[PAIR_SLOT[m.id][0]] : TOWERS[PAIR_SLOT[m.id][1]]), 0.3);
    at(t + LEN, () => {
      if (state !== 'running') return;
      tw.forEach(removeFx);
      const r = [];
      Object.entries(TOWERS).forEach(([k, c]) => {
        strongFlash(towerMesh(c, 0.5));
        const inT = members.filter((m) => dist(m, c) <= TOWER_R);
        inT.filter(isM).forEach((m) => r.push(`${who(m)} 有紅圈（水屬性耐性降低）還踩了塔 → 死亡。`));
        if (!inT.some((m) => !isM(m)))
          r.push(`${{ NW: '西北', NE: '東北', SW: '西南', SE: '東南' }[k]}的塔沒人踩（沒紅圈的人要進塔）。`);
      });
      members.forEach((m) => {
        if (puddles.some((p) => dist(m, p) < PUDDLE_R))
          r.push(`${who(m)} 站在水圈上（${where(m)}）。剛才集合的水圈要離開。`);
      });
      const r2 = redCircleHit(marked);
      if (r.length || r2.length) return fail('升龍踩塔', r.concat(r2));
      cast = null;
      next();
    });
  });
}

/* ---------- 組合段落 ---------- */
// 普通分攤 → 荒魂燃燒
function stackBlaze(next) {
  forbiddenArts(false, () => blazing(next));
}
// 鋼鐵月環 → 九字切 → 鋼鐵月環 → 全屏
function inoutKuji(next) {
  ensureP2();
  onmyoDouble(() => kujiDouble(() => onmyoDouble(() => fifthElement(next))));
}
// 升龍踩塔 → AC 分攤
function towerAC(next) {
  serpentAscending(() => forbiddenArts(true, next));
}
// 全屏 → 死刑 ×2 → 全屏
function curseDouble(next) {
  ensureP2();
  fifthElement(() =>
    cursekeeper(curTank, (o) => {
      curTank = o;
      cursekeeper(curTank, (o2) => {
        curTank = o2;
        fifthElement(next);
      });
    }),
  );
}
let sigilKind1 = 'out';
// 石頭怪百噸揮打＋鋼鐵月環 → 截線 → 車輪怪 → 紅圈
function rockInOut(next) {
  ensureP2();
  const rs = rocksSpawn(40);
  let sw = null;
  const g = (m) => (m.grp === 'S' ? -1 : 1);
  const xoff = (m) => (ROLE_IDS.indexOf(m.id) % 2 ? 0.9 : -0.9);
  onmyoDouble(
    () => kanabo(() => wheels(() => redSpread(next)), rs),
    {
      len: 5,
      onStart: (k1) => {
        sigilKind1 = k1;
        sw = omen(swingMesh(0.2), 5);
      },
      spot1: (m) => P(xoff(m), g(m) * (sigilKind1 === 'out' ? 10.5 : 3)),
      extra1: () => {
        removeFx(sw);
        strongFlash(swingMesh(0.5));
        return swingHit();
      },
    },
  );
}
// 紅圈散開（蛇降）：8 人散到外圈
function redSpread(next) {
  const marked = pickMarked();
  const LEN = 5;
  setCast('蛇降', '4 人紅圈：全員散開', LEN);
  advice = '全員散開到外圈（各自方位），紅圈半徑 5m。';
  markRed(marked);
  setPlan((m) => posAt(CLOCK[m.id], 10.5), 0.3);
  at(t + LEN, () => {
    if (state !== 'running') return;
    const r = redCircleHit(marked);
    if (r.length) return fail('紅圈（蛇降）', r);
    cast = null;
    next();
  });
}
// 九字切 → 大太蛇潮 → 鋼鐵月環 → 大太蛇潮 → AC 分攤
function midCombo(next) {
  ensureP2();
  kujiDouble(() => yamaSeq(() => onmyoDouble(() => yamaSeq(() => forbiddenArts(true, next)))));
}
// 鋼鐵月環 → 升龍踩塔 → 九字切 → 全屏 ×3 → 狂暴
function finalCombo(next) {
  ensureP2();
  onmyoDouble(() =>
    serpentAscending(() =>
      kujiDouble(() =>
        fifthElement(() =>
          fifthElement(() =>
            fifthElement(() => {
              setCast('陰陽五行（狂暴）', '時間到：實戰要在這之前擊殺青龍', 4);
              advice = '';
              at(t + 4, () => {
                if (state !== 'running') return;
                screenFlash();
                finishNote = '練習到此結束：實戰要在狂暴的陰陽五行讀完前擊殺青龍。';
                cast = null;
                next();
              });
            }, '最後'),
          ),
        ),
      ),
    ),
  );
}
