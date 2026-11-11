/* =====================================================================
 * 機制清單：全程模式依這個順序執行，也可在「練習範圍」單選（id）或選整段（grp）
 * 新增機制時：在 mechanics/ 加檔案、在這裡加一行、在 index.html 的 #mode 選單加選項。
 * 順序依菓子〈極青龍征魂戰 超詳解攻略〉影片最後的流程總結。
 * ===================================================================== */

const STEPS = [
  { id: 'open', grp: 'p1', name: '陰陽五行＋九字切＋紅圈', fn: (n) => p1Open(n) },
  { id: 'sigil', grp: 'p1', name: '固定鋼鐵（太極之印）', fn: (n) => p1Sigil(n) },
  { id: 'curse', grp: 'p1', name: '咒怨的替身（換 T）', fn: (n) => curseOnce(n) },
  { id: 'wheel', grp: 'p1', name: '式鬼召喚：車輪怪（紅藍直線）', fn: (n) => wheels(n) },
  { id: 'rock', grp: 'p1', name: '式鬼召喚：石頭怪（揮打＋四風＋截線）', fn: (n) => rocks(n) },
  { id: 'snake', grp: 'p2', name: '轉場＋蛇潮', fn: (n) => transition(() => snakes(n)) },
  { id: 'yama', grp: 'p2', name: '大太法師手印＋自然之力＋蛇潮', fn: (n) => yamaSeq(n) },
  { id: 'stack', grp: 'p2', name: '直線分攤＋荒魂燃燒', fn: (n) => stackBlaze(n) },
  { id: 'inout', grp: 'p2', name: '鋼鐵月環→九字切→鋼鐵月環', fn: (n) => inoutKuji(n) },
  { id: 'tower', grp: 'p2', name: '升龍踩塔＋AC 分攤', fn: (n) => towerAC(n) },
  { id: 'curse2', grp: 'p2', name: '全屏＋死刑 ×2', fn: (n) => curseDouble(n) },
  { id: 'rock2', grp: 'p2', name: '石頭怪＋鋼鐵月環→截線→車輪怪→紅圈', fn: (n) => rockInOut(n) },
  { id: 'mid', grp: 'p2', name: '九字切→大太蛇潮→鋼鐵月環→大太蛇潮→AC 分攤', fn: (n) => midCombo(n) },
  { id: 'curse3', grp: 'p2', name: '全屏＋死刑 ×2（第二次）', fn: (n) => curseDouble(n) },
  { id: 'final', grp: 'p2', name: '鋼鐵月環→升龍踩塔→九字切→狂暴', fn: (n) => finalCombo(n) },
];
