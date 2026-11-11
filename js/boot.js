/* =====================================================================
 * 啟動：先載入 Three.js，再依序載入程式檔
 * 程式檔都是一般 <script>（不是 ES module），所以直接雙擊 index.html 也能開。
 * 檔案之間共用全域的函式與常數，下面 APP_FILES 的順序就是執行順序。
 * ===================================================================== */

const APP_FILES = [
  'js/core/constants.js', // 常數、職能、場標、幾何判定
  'js/core/scene.js', // 渲染器、相機、地板、王
  'js/core/visuals.js', // 共用圖形與特效
  'js/core/members.js', // 8 名隊員
  'js/core/engine.js', // 設定、時間軸引擎、成功／失敗
  'js/core/seiryu.js', // 青龍共用機制零件
  'js/mechanics/p1.js',
  'js/mechanics/p2.js',
  'js/steps.js', // 機制順序清單
  'js/input.js', // 鍵盤、滑鼠、觸控
  'js/main.js', // 每幀更新與主迴圈（最後載入）
];

/* 顯示無法繼續的錯誤，並停止載入後面的檔案 */
window.__fatal = (msg) => {
  const e = document.getElementById('err');
  e.hidden = false;
  e.textContent = msg;
  window.__stopped = true;
};

/* 載入 Three.js：依序嘗試 同站檔案 → cdnjs → jsDelivr → unpkg，每個 6 秒逾時 */
function loadThree(done) {
  const srcs = [
    'three.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r152/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js',
    'https://unpkg.com/three@0.152.2/build/three.min.js',
  ];
  let i = 0;
  (function next() {
    if (window.THREE || i >= srcs.length) return done();
    const sc = document.createElement('script');
    let settled = false;
    const fin = () => {
      if (settled) return;
      settled = true;
      clearTimeout(to);
      window.THREE ? done() : next();
    };
    const to = setTimeout(() => {
      sc.remove();
      fin();
    }, 6000);
    sc.onload = fin;
    sc.onerror = fin;
    sc.src = srcs[i++];
    document.head.appendChild(sc);
  })();
}

/* 一個接一個載入（保持順序）；任何一個失敗就停下並顯示訊息 */
function loadApp(files) {
  if (window.__stopped || !files.length) return;
  const sc = document.createElement('script');
  sc.src = files[0];
  sc.onload = () => loadApp(files.slice(1));
  sc.onerror = () => window.__fatal(`程式檔 ${files[0]} 載入失敗，請重新整理。`);
  document.body.appendChild(sc);
}

loadThree(() => {
  if (!window.THREE)
    return window.__fatal(
      '3D 引擎（Three.js）載入失敗：同站檔案與三個 CDN 都連不上。請確認公司網路或擋廣告外掛沒有封鎖，然後重新整理。',
    );
  loadApp(APP_FILES);
});
