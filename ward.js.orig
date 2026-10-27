/* 病房探索 — Ward C resampled to Pokémon blocks, orthographic walk. */
(function () {
  "use strict";

  var SHELL = window.WARD_SHELL;
  var LAY = SHELL.layout;
  var TILE = LAY.tile;
  var CW = LAY.cols;
  var CH = LAY.rows;
  var SPEED = 2.55;
  var RADIUS = 0.28;

  var CODE_QS = [
    {
      q: "模擬急救（虛構）：C座走廊有人呼叫。較適切的做法是？",
      options: [
        "自己一個做完先再叫人",
        "呼叫支援，去治療室推急救車返事發位置，期間唔好留病人無人看管",
        "先去護士站影印藥紙",
        "叫病人自己行去升降機"
      ],
      answer: 1,
      explain: "急救先呼叫支援，帶 E-trolley 返事發點。唔好留低危急病人一個人。影印藥紙係情況穩定之後先做。",
      points: ["先呼叫支援。", "治療室攞急救車推返事發位置。", "唔好留病人無人看管。"]
    },
    {
      q: "模擬急救（虛構）：要用邊套設備？較適切的是？",
      options: [
        "邊張床近就用邊張，唔使指定車",
        "用治療室急救車（E-trolley），氧氣同吸引跟部門現場指引",
        "只用大廳梳化",
        "一定要先推去另一座病房先可以做"
      ],
      answer: 1,
      explain: "訓練情境用治療室嘅急救車。氧氣、吸引同指定急救位以部門現場為準，唔好隨便用梳化代替。",
      points: ["用 E-trolley。", "氧氣／吸引跟現場指引。", "實際位置以部門為準。"]
    },
    {
      q: "模擬急救（虛構）：情況暫時穩定之後。較適切的是？",
      options: [
        "唔使寫，記得就得",
        "返護士站用傳真機影印藥紙，並寫低時間、做過嘅事同在場職員",
        "只同朋友講",
        "等一個星期再補"
      ],
      answer: 1,
      explain: "穩定之後返護士站影印藥紙，並準備紀錄。分數只係學習回饋，唔係評核。實際工作跟部門指引。",
      points: ["護士站傳真機影印藥紙。", "寫時間、做法、在場人。", "跟部門指引交文件。"]
    }
  ];

  var ADMIT_QS = [
    {
      q: "模擬收症（虛構）：護送「林先生」同家屬到升降機口。較適切的是？",
      options: [
        "唔核對身份，快啲揾張床",
        "先核對身份同文件，再按部門指引安排床位",
        "叫病人自己喺走廊搵房",
        "見到護送就一律拒收"
      ],
      answer: 1,
      explain: "收症先核對身份同文件，再安排床位。呢個係虛構個案，床位同 rota 以當更為準。",
      points: ["先核對身份同文件。", "再安排床位。", "當更安排跟部門。"]
    },
    {
      q: "模擬收症（虛構）：要做金屬探測。較適切的是？",
      options: [
        "一個人喺走廊公開掃就得",
        "屏風、解釋、雙人（一探測一見證），危險品交家人並記 note",
        "唔解釋，以免病人拒絕",
        "出院先做一次"
      ],
      answer: 1,
      explain: "金屬探測要有私隱、解釋同雙人見證。危險品交家人並記低。",
      points: ["屏風同解釋。", "雙人：一探測一見證。", "危險品交家人並記 note。"]
    },
    {
      q: "模擬收症（虛構）：未 confirm 本 team 1:1，對方催住 book 車。較適切的是？",
      options: [
        "先 book 車，1:1 之後再算",
        "1:1 安排確認先，車後",
        "1:1 同車都唔使理",
        "叫家屬自己叫的士代替"
      ],
      answer: 1,
      explain: "未確認 1:1 唔好因為催而先 book 車。確認人手安排先，交通其後。",
      points: ["1:1 先，車後。", "唔好被催打亂次序。", "實際調動跟當更 IC。"]
    }
  ];

  var REST_QS = [
    {
      q: "模擬躁動（虛構）：同事話「綁起佢嚟懲罰」。較適切的是？",
      options: [
        "躁動就可以當懲罰綁",
        "約束係最後手段，要有醫囑同部門指引，先試其他方法，並向病人解釋",
        "唔使評估，越快越好",
        "交俾家屬全權決定點綁"
      ],
      answer: 1,
      explain: "約束唔係懲罰。係最後手段，要有醫囑同部門指引，先試其他方法，並解釋。",
      points: ["最後手段，唔係懲罰。", "要有醫囑／部門指引。", "先試其他方法並解釋。"]
    },
    {
      q: "模擬約束（虛構）：已經按指引用約束。較適切的觀察是？",
      options: [
        "綁完就可以唔再睇",
        "定時檢查血液循環、皮膚同松緊，並記錄",
        "綁得越緊越安全",
        "收起呼叫鐘以免嘈"
      ],
      answer: 1,
      explain: "用約束之後要定時睇循環、皮膚同松緊，並且寫低。呼叫鐘唔好收起。",
      points: ["定時檢查循環同皮膚。", "檢查松緊。", "要記錄。"]
    },
    {
      q: "模擬餵食（虛構）：約束中的病人躺住，家屬想瞓餵。較適切的是？",
      options: [
        "瞓餵快啲，可以",
        "必須坐起餵，禁止瞓餵；餵唔餵係護士臨床決定",
        "一律連水都唔畀",
        "交俾家屬決定"
      ],
      answer: 1,
      explain: "約束中餵食必須坐起，禁止瞓餵。餵唔餵係護士臨床決定。",
      points: ["坐起餵。", "禁止瞓餵。", "臨床決定，唔係家屬全權。"]
    }
  ];

  var roomById = {};
  SHELL.rooms.forEach(function (r, i) { roomById[r.id] = r; r.index = i + 2; });

  var tileWalk = new Uint8Array(CW * CH);
  var tileRoom = new Uint16Array(CW * CH);
  var wallSpots = [];
  var roomStat = {};

  function fillRect(c, r, w, h, id) {
    var z, x;
    for (z = r; z < r + h; z++) {
      for (x = c; x < c + w; x++) {
        if (x < 0 || z < 0 || x >= CW || z >= CH) continue;
        tileWalk[z * CW + x] = 1;
        tileRoom[z * CW + x] = id;
      }
    }
  }

  function buildLayout() {
    LAY.corridors.forEach(function (rc) { fillRect(rc[0], rc[1], rc[2], rc[3], 1); });
    SHELL.rooms.forEach(function (room) {
      var def = LAY.rooms[room.id];
      if (!def) { console.warn("ward layout: 未配置房間 " + room.id); return; }
      fillRect(def.rect[0], def.rect[1], def.rect[2], def.rect[3], room.index);
      tileWalk[def.door[1] * CW + def.door[0]] = 1;
      tileRoom[def.door[1] * CW + def.door[0]] = room.index;
    });
    auditLayout();
    collectWalls();
  }

  function auditLayout() {
    var nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var problems = [];
    var r, c, k, nc, nr;
    SHELL.rooms.forEach(function (room) {
      var openings = 0, size = 0;
      for (r = 0; r < CH; r++) {
        for (c = 0; c < CW; c++) {
          if (!tileWalk[r * CW + c] || tileRoom[r * CW + c] !== room.index) continue;
          size++;
          for (k = 0; k < 4; k++) {
            nc = c + nbs[k][0];
            nr = r + nbs[k][1];
            if (nc < 0 || nr < 0 || nc >= CW || nr >= CH) continue;
            if (tileWalk[nr * CW + nc] && tileRoom[nr * CW + nc] !== room.index) openings++;
          }
        }
      }
      if (!size) problems.push(room.id + " 冇地板");
      else if (openings !== 1) problems.push(room.id + " 有 " + openings + " 度門");
    });
    var seen = new Uint8Array(CW * CH);
    var queue = [];
    var startC = LAY.marks.start[0], startR = LAY.marks.start[1];
    if (tileWalk[startR * CW + startC]) {
      seen[startR * CW + startC] = 1;
      queue.push([startC, startR]);
    }
    while (queue.length) {
      var cur = queue.pop();
      for (k = 0; k < 4; k++) {
        nc = cur[0] + nbs[k][0];
        nr = cur[1] + nbs[k][1];
        if (nc < 0 || nr < 0 || nc >= CW || nr >= CH) continue;
        if (seen[nr * CW + nc] || !tileWalk[nr * CW + nc]) continue;
        seen[nr * CW + nc] = 1;
        queue.push([nc, nr]);
      }
    }
    var sealed = 0;
    for (r = 0; r < CH; r++) for (c = 0; c < CW; c++) if (tileWalk[r * CW + c] && !seen[r * CW + c]) sealed++;
    if (sealed) problems.push(sealed + " 格行唔到");
    if (problems.length) console.warn("ward layout 自檢: " + problems.join("; "));
  }

  function collectWalls() {
    var nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var r, c, k, nc, nr, id, near;
    wallSpots = [];
    roomStat = {};
    SHELL.rooms.forEach(function (room) { roomStat[room.id] = { wall: 0, door: 0, n: 0 }; });
    for (r = 0; r < CH; r++) {
      for (c = 0; c < CW; c++) {
        if (tileWalk[r * CW + c]) {
          id = tileRoom[r * CW + c];
          if (id >= 2 && SHELL.rooms[id - 2]) {
            var name = SHELL.rooms[id - 2].id;
            roomStat[name].n += 1;
            for (k = 0; k < 4; k++) {
              nc = c + nbs[k][0];
              nr = r + nbs[k][1];
              if (nc < 0 || nr < 0 || nc >= CW || nr >= CH) continue;
              if (tileWalk[nr * CW + nc] && tileRoom[nr * CW + nc] !== id) roomStat[name].door += 1;
            }
          }
          continue;
        }
        near = false;
        var touch = {};
        for (k = 0; k < 4; k++) {
          nc = c + nbs[k][0];
          nr = r + nbs[k][1];
          if (nc < 0 || nr < 0 || nc >= CW || nr >= CH || !tileWalk[nr * CW + nc]) continue;
          near = true;
          id = tileRoom[nr * CW + nc];
          if (id >= 2 && SHELL.rooms[id - 2]) touch[SHELL.rooms[id - 2].id] = 1;
        }
        if (!near) continue;
        wallSpots.push([c, r]);
        Object.keys(touch).forEach(function (nm) { roomStat[nm].wall += 1; });
      }
    }
  }

  function snapPoint(x, z, prefer) {
    var best = null, bestD = 1e18, fallback = null, fallD = 1e18;
    var r, c, cx, cz, d, id;
    for (r = 0; r < CH; r++) {
      for (c = 0; c < CW; c++) {
        if (!tileWalk[r * CW + c]) continue;
        cx = (c + 0.5) * TILE;
        cz = (r + 0.5) * TILE;
        d = (cx - x) * (cx - x) + (cz - z) * (cz - z);
        if (d < fallD) { fallD = d; fallback = { x: cx, z: cz, c: c, r: r }; }
        id = tileRoom[r * CW + c];
        if (prefer && id !== prefer) continue;
        if (d < bestD) { bestD = d; best = { x: cx, z: cz, c: c, r: r }; }
      }
    }
    return best || fallback || { x: x, z: z, c: 0, r: 0 };
  }

  function cellsOf(id) {
    var want = roomById[id] ? roomById[id].index : -1;
    var list = [];
    var r, c;
    for (r = 0; r < CH; r++) {
      for (c = 0; c < CW; c++) {
        if (tileWalk[r * CW + c] && tileRoom[r * CW + c] === want) {
          list.push({ c: c, r: r, x: (c + 0.5) * TILE, z: (r + 0.5) * TILE });
        }
      }
    }
    return list;
  }

  function roomCenter(id) {
    var cells = cellsOf(id);
    if (!cells.length) return null;
    var x = 0, z = 0, i;
    for (i = 0; i < cells.length; i++) { x += cells[i].x; z += cells[i].z; }
    return { x: x / cells.length, z: z / cells.length };
  }

  buildLayout();

  var MARK = {};
  Object.keys(LAY.marks).forEach(function (key) {
    var t = LAY.marks[key];
    MARK[key] = { x: (t[0] + 0.5) * TILE, z: (t[1] + 0.5) * TILE };
  });

  var player = { x: MARK.start.x, z: MARK.start.z, rot: 0 };
  var trolley = { x: MARK.trolley.x, z: MARK.trolley.z };
  var pushing = false;
  var quest = "";
  var step = "idle";
  var travel = 0;
  var seen = { code: false, admit: false, rest: false };
  var active = false;
  var paused = false;
  var built = false;
  var keys = { up: false, down: false, left: false, right: false };
  var joy = { x: 0, y: 0, on: false };
  var dialog = null;
  var battle = null;
  var menuOpen = false;
  var mapOpen = false;
  var raf = 0;
  var lastTs = 0;
  var glFailed = false;
  var triggeredPush = false;
  var renderer, scene, camera, playerMesh, trolleyMesh, incidentMesh;

  function el(id) { return document.getElementById(id); }
  function show(id, on) {
    var node = el(id);
    if (node) node.classList.toggle("hidden", !on);
  }
  function showGlError(msg) {
    var node = el("wardFallback");
    if (!node) return;
    node.textContent = msg || "立體畫面開唔到。請用 Chrome 雙擊 game.html。唔使密碼。";
    node.classList.add("show");
  }
  function cellAt(x, z) {
    return { c: Math.floor(x / TILE), r: Math.floor(z / TILE) };
  }
  function walkAt(c, r) {
    return c >= 0 && r >= 0 && c < CW && r < CH && tileWalk[r * CW + c] === 1;
  }
  function blocked(x, z) {
    var p = cellAt(x, z);
    return !walkAt(p.c, p.r);
  }
  function canStand(x, z) {
    return !blocked(x, z) && !blocked(x + RADIUS, z) && !blocked(x - RADIUS, z) && !blocked(x, z + RADIUS) && !blocked(x, z - RADIUS);
  }
  function roomNameAt(x, z) {
    var p = cellAt(x, z);
    if (!walkAt(p.c, p.r)) return "牆";
    var id = tileRoom[p.r * CW + p.c];
    if (id >= 2 && SHELL.rooms[id - 2]) return SHELL.rooms[id - 2].name;
    return "走廊";
  }
  function dist(ax, az, bx, bz) {
    var dx = ax - bx, dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  }
  function near(ax, az, bx, bz) { return dist(ax, az, bx, bz) < 1.55; }

  function setQuestLabel() {
    var text = "搖桿任意方向行。W A S D 或方向鍵係八向。A 互動，B 任務。唔使密碼。";
    if (quest === "code") {
      if (step === "intro" || step === "goTrolley") text = "任務：去治療室，撳 A 攞急救車。";
      else if (step === "push") text = "任務：推急救車沿走廊返事發位置。";
      else if (step === "battle") text = "任務：急救認識問答。A 確認，B 取消選擇。";
      else if (step === "goFax") text = "任務：去護士站，撳 A 用傳真機影印藥紙。";
      else if (step === "docs") text = "任務：再撳 A，準備急救文件。";
    } else if (quest === "admit") {
      if (step === "intro" || step === "goElev") text = "任務：去病人及職員升降機大堂，撳 A 核對收症。";
      else if (step === "battle") text = "任務：收症問答。A 確認，B 取消選擇。";
      else if (step === "goBed") text = "任務：去收症房，撳 A 完成安排。";
    } else if (quest === "rest") {
      if (step === "intro" || step === "goRoom") text = "任務：去冷靜房，撳 A 處理躁動。";
      else if (step === "battle") text = "任務：約束問答。A 確認，B 取消選擇。";
      else if (step === "goNurse") text = "任務：去護士站，撳 A 記錄約束。";
    }
    var node = el("wardQuestLabel");
    if (node) node.textContent = text;
    var room = el("wardRoomLabel");
    if (room) room.textContent = roomNameAt(player.x, player.z);
  }

  function say(lines, done) {
    dialog = { lines: lines, i: 0, done: done || function () {} };
    menuOpen = false;
    show("wardMenu", false);
    show("wardDialog", true);
    el("wardDialogText").textContent = lines[0];
    setQuestLabel();
  }
  function advanceDialog() {
    if (!dialog) return;
    dialog.i += 1;
    if (dialog.i >= dialog.lines.length) {
      var done = dialog.done;
      dialog = null;
      show("wardDialog", false);
      setQuestLabel();
      done();
      return;
    }
    el("wardDialogText").textContent = dialog.lines[dialog.i];
  }
  function openMenu() {
    if (dialog || battle) return;
    menuOpen = true;
    show("wardMenu", true);
    var goal = el("wardQuestLabel") ? el("wardQuestLabel").textContent : "";
    el("wardMenuText").textContent = "任務目標\n" + goal;
  }
  function closeMenu() {
    menuOpen = false;
    show("wardMenu", false);
  }
  function renderBattle() {
    if (!battle) return;
    show("wardBattle", true);
    var q = battle.qs[battle.i];
    el("battleFoeName").textContent = battle.title + "  " + (battle.i + 1) + "/" + battle.qs.length;
    var box = el("battleOptions");
    if (battle.phase === "ask") {
      el("battleText").textContent = q.q;
      box.innerHTML = q.options.map(function (text, i) {
        return '<button type="button" class="battle-opt' + (i === battle.cursor ? " on" : "") + '" data-i="' + i + '">' +
          "ABCD"[i] + ". " + text + "</button>";
      }).join("");
      box.querySelectorAll(".battle-opt").forEach(function (btn) {
        btn.addEventListener("click", function () {
          battle.cursor = parseInt(btn.getAttribute("data-i"), 10);
          confirmChoice();
        });
      });
    } else {
      var ok = battle.lastOk;
      var points = q.points.map(function (p) { return "・" + p; }).join(" ");
      el("battleText").textContent = (ok ? "答啱。 " : "呢個選擇未係最適切。 ") + q.explain + " 學習重點：" + points;
      box.innerHTML = '<p class="battle-next">撳 A 繼續</p>';
    }
    setQuestLabel();
  }
  function openBattle(title, qs) {
    battle = { title: title, qs: qs, i: 0, cursor: 0, phase: "ask", lastOk: false };
    dialog = null;
    show("wardDialog", false);
    renderBattle();
  }
  function confirmChoice() {
    if (!battle) return;
    var q = battle.qs[battle.i];
    if (battle.phase === "explain") {
      battle.i += 1;
      battle.cursor = 0;
      if (battle.i >= battle.qs.length) {
        battle = null;
        show("wardBattle", false);
        onBattleDone();
        return;
      }
      battle.phase = "ask";
      renderBattle();
      return;
    }
    battle.lastOk = battle.cursor === q.answer;
    battle.phase = "explain";
    renderBattle();
  }
  function backChoice() {
    if (!battle) return;
    if (battle.phase === "explain") { confirmChoice(); return; }
    battle.cursor = 0;
    renderBattle();
  }
  function onBattleDone() {
    if (quest === "code") {
      pushing = false;
      step = "goFax";
      say(["情況暫時穩定（虛構）。而家去護士站，用傳真機影印藥紙，再準備文件。"], function () { setQuestLabel(); });
    } else if (quest === "admit") {
      step = "goBed";
      say(["身份同安檢問答完。去收症房，撳 A 完成呢位虛構病人嘅安排。"], function () { setQuestLabel(); });
    } else if (quest === "rest") {
      step = "goNurse";
      say(["問答完。去護士站撳 A，記錄約束原因、時間同循環檢查。"], function () { setQuestLabel(); });
    }
    if (incidentMesh) incidentMesh.visible = false;
  }
  function clearQuest() {
    quest = "";
    step = "idle";
    pushing = false;
    triggeredPush = false;
    travel = 0;
    setQuestLabel();
  }
  function beginCode() {
    quest = "code";
    step = "intro";
    seen.code = true;
    triggeredPush = false;
    say([
      "突然：走廊有人呼叫！虛構病人「陳先生」情況危急。",
      "先去治療室，撳 A 攞急救車，沿走廊推返事發位置。",
      "本遊戲只供訓練用途，實際工作請依照部門指引。"
    ], function () { step = "goTrolley"; setQuestLabel(); });
  }
  function beginAdmit() {
    quest = "admit";
    step = "intro";
    seen.admit = true;
    say([
      "收症：虛構病人「林先生」同護送喺病人及職員升降機大堂等候。",
      "先去升降機大堂，撳 A 核對身份，再答收症問題，最後去收症房。"
    ], function () { step = "goElev"; setQuestLabel(); });
  }
  function beginRest() {
    quest = "rest";
    step = "intro";
    seen.rest = true;
    say([
      "冷靜房：虛構病人躁動，同事想即刻綁起嚟。",
      "去冷靜房撳 A。約束唔係懲罰，跟指引先評估再答題，之後返護士站記錄。"
    ], function () { step = "goRoom"; setQuestLabel(); });
  }
  function onTravel(meters) {
    if (quest === "code" && step === "push" && !triggeredPush && near(trolley.x, trolley.z, MARK.incident.x, MARK.incident.z)) {
      triggeredPush = true;
      step = "battle";
      say(["急救車趕到事發位置。進入急救認識。"], function () { openBattle("急救認識", CODE_QS); });
      return;
    }
    if (quest) return;
    travel += meters;
    if (!seen.code && travel >= 7) { beginCode(); return; }
    if (travel < 16) return;
    travel = 0;
    if (!seen.admit) beginAdmit();
    else if (!seen.rest) beginRest();
    else if (Math.random() < 0.5) beginAdmit();
    else beginRest();
  }

  function screenAxes() {
    if (!camera) {
      return { upX: -0.70710678, upZ: -0.70710678, rightX: 0.70710678, rightZ: -0.70710678 };
    }
    camera.position.set(player.x + 7.5, 11, player.z + 7.5);
    camera.lookAt(player.x, 0, player.z);
    camera.updateMatrixWorld(true);
    var e = camera.matrixWorld.elements;
    var rightX = e[0], rightZ = e[2];
    var rl = Math.sqrt(rightX * rightX + rightZ * rightZ) || 1;
    rightX /= rl;
    rightZ /= rl;
    var upX = -e[8], upZ = -e[10];
    var ul = Math.sqrt(upX * upX + upZ * upZ) || 1;
    upX /= ul;
    upZ /= ul;
    return { upX: upX, upZ: upZ, rightX: rightX, rightZ: rightZ };
  }
  function wishVector() {
    var ax = screenAxes();
    var ix = 0, iy = 0, mag = 1;
    if (joy.on) {
      ix += joy.x;
      iy += joy.y;
      mag = Math.min(1, Math.sqrt(joy.x * joy.x + joy.y * joy.y));
    }
    if (keys.right) ix += 1;
    if (keys.left) ix -= 1;
    if (keys.up) iy += 1;
    if (keys.down) iy -= 1;
    if (keys.up || keys.down || keys.left || keys.right) mag = 1;
    var len = Math.sqrt(ix * ix + iy * iy);
    if (len < 0.04) return { x: 0, z: 0 };
    ix /= len;
    iy /= len;
    return {
      x: (ix * ax.rightX + iy * ax.upX) * SPEED * mag,
      z: (ix * ax.rightZ + iy * ax.upZ) * SPEED * mag
    };
  }
  function slide(dx, dz) {
    if (!canStand(player.x + dx, player.z)) dx = 0;
    if (!canStand(player.x, player.z + dz)) dz = 0;
    if (!dx && !dz) return 0;
    if (pushing) {
      var rot = Math.atan2(dx, dz);
      var fx = Math.sin(rot), fz = Math.cos(rot);
      var tx = player.x + dx + fx * 0.85;
      var tz = player.z + dz + fz * 0.85;
      if (!canStand(tx, tz)) return 0;
      trolley.x = tx;
      trolley.z = tz;
    }
    player.x += dx;
    player.z += dz;
    if (dx || dz) player.rot = Math.atan2(dx, dz);
    return Math.sqrt(dx * dx + dz * dz);
  }

  function tryInteract() {
    if (!active || paused || menuOpen || mapOpen) return;
    if (battle) { confirmChoice(); return; }
    if (dialog) { advanceDialog(); return; }
    if (quest === "code" && step === "goTrolley" && near(player.x, player.z, trolley.x, trolley.z) && !pushing) {
      pushing = true;
      step = "push";
      if (incidentMesh) incidentMesh.visible = true;
      say(["你推住急救車。沿走廊行去事發位置。"], function () { setQuestLabel(); });
      return;
    }
    if (quest === "code" && (step === "goFax" || step === "docs") && near(player.x, player.z, MARK.fax.x, MARK.fax.z)) {
      if (step === "goFax") {
        step = "docs";
        say(["傳真機影印藥紙（虛構）。核對病人身份同藥單。"], function () { setQuestLabel(); });
        return;
      }
      say(["文件備好：時間、做過嘅事、邊個在場。今次急救事件完結。分數只係學習回饋。"], function () { clearQuest(); });
      return;
    }
    if (quest === "admit" && step === "goElev" && near(player.x, player.z, MARK.lift.x, MARK.lift.z)) {
      step = "battle";
      say(["核對「林先生」身份同護送文件（虛構）。接着答收症問題。"], function () { openBattle("收症", ADMIT_QS); });
      return;
    }
    if (quest === "admit" && step === "goBed" && near(player.x, player.z, MARK.intake.x, MARK.intake.z)) {
      say(["已喺收症房完成虛構安排。實際床位跟當更。"], function () { clearQuest(); });
      return;
    }
    if (quest === "rest" && step === "goRoom" && near(player.x, player.z, MARK.secl.x, MARK.secl.z)) {
      step = "battle";
      say(["先確保安全，唔好當懲罰。接着答約束問題。"], function () { openBattle("約束", REST_QS); });
      return;
    }
    if (quest === "rest" && step === "goNurse" && near(player.x, player.z, MARK.fax.x, MARK.fax.z)) {
      say(["已喺護士站記錄約束原因、時間同循環檢查（虛構）。事件完結。"], function () { clearQuest(); });
      return;
    }
    say([roomNameAt(player.x, player.z) + "。撳 B 可以睇任務目標。"]);
  }
  function toggleMap() {
    mapOpen = !mapOpen;
    show("wardMapOverlay", mapOpen);
    if (mapOpen) drawBigMap();
    setQuestLabel();
  }
  function pressB() {
    if (!active || paused) return;
    if (mapOpen) { mapOpen = false; show("wardMapOverlay", false); setQuestLabel(); return; }
    if (battle) { backChoice(); return; }
    if (dialog) { advanceDialog(); return; }
    if (menuOpen) closeMenu();
    else openMenu();
  }

  function mat(color) {
    return new THREE.MeshLambertMaterial({ color: color, flatShading: true });
  }
  function addBox(parent, w, h, d, color, x, y, z) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function buildScene() {
    var canvas = el("wardCanvas");
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false });
    if (!renderer.getContext()) throw new Error("WebGL");
    renderer.setClearColor(0x8ec6ea, 1);
    renderer.setPixelRatio(1);
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 80);
    scene.add(new THREE.AmbientLight(0xfff4dd, 0.72));
    var sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(8, 16, 6);
    scene.add(sun);

    var floorN = 0;
    var r, c, id, col;
    for (r = 0; r < CH; r++) for (c = 0; c < CW; c++) if (tileWalk[r * CW + c]) floorN += 1;
    var floors = new THREE.InstancedMesh(
      new THREE.BoxGeometry(TILE * 0.98, 0.18, TILE * 0.98),
      new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
      Math.max(1, floorN)
    );
    var dummy = new THREE.Object3D();
    var color = new THREE.Color();
    var fi = 0;
    for (r = 0; r < CH; r++) {
      for (c = 0; c < CW; c++) {
        if (!tileWalk[r * CW + c]) continue;
        id = tileRoom[r * CW + c];
        col = id >= 2 && SHELL.rooms[id - 2] ? SHELL.rooms[id - 2].color : 0xc6d48b;
        dummy.position.set((c + 0.5) * TILE, -0.09, (r + 0.5) * TILE);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        floors.setMatrixAt(fi, dummy.matrix);
        floors.setColorAt(fi, color.setHex(col));
        fi += 1;
      }
    }
    floors.instanceMatrix.needsUpdate = true;
    if (floors.instanceColor) floors.instanceColor.needsUpdate = true;
    floors.userData.kind = "floor";
    scene.add(floors);

    var walls = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.98, 1.15, 0.98),
      mat(0xf4efe2),
      Math.max(1, wallSpots.length)
    );
    wallSpots.forEach(function (s, idx) {
      dummy.position.set((s[0] + 0.5) * TILE, 0.57, (s[1] + 0.5) * TILE);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      walls.setMatrixAt(idx, dummy.matrix);
    });
    if (!wallSpots.length) {
      dummy.position.set(0, -20, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      walls.setMatrixAt(0, dummy.matrix);
    }
    walls.instanceMatrix.needsUpdate = true;
    walls.userData.kind = "wall";
    scene.add(walls);

    SHELL.rooms.forEach(function (room) {
      var def = LAY.rooms[room.id];
      if (!def) return;
      var dc = def.door[0], dr = def.door[1];
      var dx = (dc + 0.5) * TILE, dz = (dr + 0.5) * TILE;
      var off = TILE / 2 - 0.09;
      if (walkAt(dc, dr - 1) && walkAt(dc, dr + 1)) {
        addBox(scene, 0.18, 1.15, 0.18, 0x7a4a22, dx - off, 0.575, dz);
        addBox(scene, 0.18, 1.15, 0.18, 0x7a4a22, dx + off, 0.575, dz);
        addBox(scene, TILE, 0.22, 0.18, 0x7a4a22, dx, 1.26, dz);
      } else {
        addBox(scene, 0.18, 1.15, 0.18, 0x7a4a22, dx, 0.575, dz - off);
        addBox(scene, 0.18, 1.15, 0.18, 0x7a4a22, dx, 0.575, dz + off);
        addBox(scene, 0.18, 0.22, TILE, 0x7a4a22, dx, 1.26, dz);
      }
    });

    SHELL.rooms.forEach(function (room) {
      if (room.kind === "wc" || room.kind === "store") return;
      var center = roomCenter(room.id);
      if (!center) return;
      var tag = labelSprite(room.name);
      tag.position.set(center.x, 1.7, center.z);
      scene.add(tag);
    });

    (LAY.beds || []).forEach(function (bed) {
      var prefer = roomById[bed.room] ? roomById[bed.room].index : 0;
      var place = snapPoint((bed.c + 0.5) * TILE, (bed.r + 0.5) * TILE, prefer);
      var group = new THREE.Group();
      addBox(group, 1.15, 0.28, 1.65, 0xf7f1e4, 0, 0.28, 0);
      var blanket = addBox(group, 0.95, 0.16, 1.25, 0x6cb5d6, 0, 0.46, 0.05);
      blanket.userData.kind = "bed";
      blanket.userData.room = bed.room;
      addBox(group, 0.6, 0.18, 0.36, 0xfff8ee, 0, 0.58, -0.5);
      group.position.set(place.x, 0, place.z);
      group.rotation.y = bed.ang || 0;
      scene.add(group);
    });

    addNurseStation();
    addTreatRoom();

    playerMesh = new THREE.Group();
    addBox(playerMesh, 0.46, 0.48, 0.34, 0x2f6f9a, 0, 0.46, 0);
    addBox(playerMesh, 0.32, 0.28, 0.28, 0xf3c7a1, 0, 0.82, 0);
    addBox(playerMesh, 0.36, 0.1, 0.36, 0xfff8ee, 0, 0.98, 0);
    addBox(playerMesh, 0.08, 0.08, 0.08, 0x1b2830, 0.08, 0.84, 0.12);
    scene.add(playerMesh);

    trolleyMesh = new THREE.Group();
    addBox(trolleyMesh, 0.7, 0.28, 0.46, 0xd6453d, 0, 0.42, 0);
    addBox(trolleyMesh, 0.22, 0.08, 0.08, 0xfff8ee, 0, 0.58, 0);
    addBox(trolleyMesh, 0.08, 0.22, 0.08, 0xfff8ee, 0, 0.5, 0);
    addBox(trolleyMesh, 0.12, 0.12, 0.12, 0x222222, -0.22, 0.16, 0.14);
    addBox(trolleyMesh, 0.12, 0.12, 0.12, 0x222222, 0.22, 0.16, 0.14);
    scene.add(trolleyMesh);

    incidentMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), mat(0xe23b32));
    incidentMesh.position.set(MARK.incident.x, 0.08, MARK.incident.z);
    incidentMesh.visible = false;
    scene.add(incidentMesh);
    built = true;
  }

  function addNurseStation() {
    var cells = cellsOf("nurse");
    var cx = 0, cz = 0, i;
    cells.forEach(function (p) { cx += p.x; cz += p.z; });
    if (cells.length) { cx /= cells.length; cz /= cells.length; }
    cells.sort(function (a, b) {
      var da = (a.x - cx) * (a.x - cx) + (a.z - cz) * (a.z - cz);
      var db = (b.x - cx) * (b.x - cx) + (b.z - cz) * (b.z - cz);
      return da - db;
    });
    function key(x, z) { return Math.round(x * 8) + "," + Math.round(z * 8); }
    var used = {};
    used[key(MARK.fax.x, MARK.fax.z)] = 1;
    used[key(MARK.computer.x, MARK.computer.z)] = 1;
    var n = 0;
    for (i = 0; i < cells.length && n < 6; i++) {
      if (used[key(cells[i].x, cells[i].z)]) continue;
      addBox(scene, 0.7, 0.7, 0.55, 0xefe6d4, cells[i].x, 0.4, cells[i].z);
      n += 1;
    }
    addBox(scene, 0.55, 0.28, 0.4, 0x4d5966, MARK.fax.x, 0.7, MARK.fax.z);
    addBox(scene, 0.28, 0.04, 0.22, 0xf4f7fb, MARK.fax.x, 0.88, MARK.fax.z - 0.12);
    addBox(scene, 0.5, 0.22, 0.36, 0x2c3440, MARK.computer.x, 0.55, MARK.computer.z);
    addBox(scene, 0.46, 0.3, 0.08, 0x8fd0ff, MARK.computer.x, 0.84, MARK.computer.z);
  }

  function addTreatRoom() {
    var cells = cellsOf("treat");
    if (!cells.length) return;
    var spot = cells[0];
    var best = 1e9;
    cells.forEach(function (p) {
      var d = (p.x - MARK.trolley.x) * (p.x - MARK.trolley.x) + (p.z - MARK.trolley.z) * (p.z - MARK.trolley.z);
      if (d > 0.5 && d < best) { best = d; spot = p; }
    });
    addBox(scene, 0.9, 0.9, 0.7, 0xf4f7fb, spot.x, 0.5, spot.z);
    addBox(scene, 0.28, 0.5, 0.08, 0xd6453d, spot.x, 1.15, spot.z);
  }

  function labelSprite(text) {
    var c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    var g = c.getContext("2d");
    g.fillStyle = "rgba(12, 40, 48, 0.78)";
    g.fillRect(8, 8, 496, 80);
    g.strokeStyle = "#f6e27a";
    g.lineWidth = 6;
    g.strokeRect(8, 8, 496, 80);
    g.fillStyle = "#fff8ee";
    g.font = "bold 42px PingFang TC, Microsoft JhengHei, Noto Sans TC, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 50);
    var tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(3.4, 0.64, 1);
    return sprite;
  }

  var mapCache = null;
  var mapBox = null;
  function ensureMapCache() {
    if (mapCache) return;
    var minC = CW, minR = CH, maxC = 0, maxR = 0, r, c, seenWall = {};
    wallSpots.forEach(function (s) { seenWall[s[0] + "," + s[1]] = 1; });
    for (r = 0; r < CH; r++) {
      for (c = 0; c < CW; c++) {
        if (!tileWalk[r * CW + c] && !seenWall[c + "," + r]) continue;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
      }
    }
    minC = Math.max(0, minC - 1);
    minR = Math.max(0, minR - 1);
    maxC = Math.min(CW - 1, maxC + 1);
    maxR = Math.min(CH - 1, maxR + 1);
    mapBox = { minC: minC, minR: minR, bw: maxC - minC + 1, bh: maxR - minR + 1 };
    mapCache = document.createElement("canvas");
    mapCache.width = mapBox.bw;
    mapCache.height = mapBox.bh;
    var g = mapCache.getContext("2d");
    var img = g.createImageData(mapBox.bw, mapBox.bh);
    var data = img.data;
    for (r = minR; r <= maxR; r++) {
      for (c = minC; c <= maxC; c++) {
        var a = ((r - minR) * mapBox.bw + (c - minC)) * 4;
        var col = 0;
        if (tileWalk[r * CW + c]) {
          var id = tileRoom[r * CW + c];
          col = id >= 2 && SHELL.rooms[id - 2] ? SHELL.rooms[id - 2].color : 0xc6d48b;
        } else if (seenWall[c + "," + r]) {
          col = 0xf4efe2;
        } else continue;
        data[a] = (col >> 16) & 255;
        data[a + 1] = (col >> 8) & 255;
        data[a + 2] = col & 255;
        data[a + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }
  function paintMap(ctx, w, h, labels) {
    ensureMapCache();
    var b = mapBox;
    ctx.fillStyle = "#10242c";
    ctx.fillRect(0, 0, w, h);
    var scale = Math.min((w - 16) / b.bw, (h - 16) / b.bh);
    var ox = (w - b.bw * scale) / 2;
    var oy = (h - b.bh * scale) / 2;
    function mx(x) { return ox + (x / TILE - b.minC) * scale; }
    function mz(z) { return oy + (z / TILE - b.minR) * scale; }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mapCache, ox, oy, b.bw * scale, b.bh * scale);
    if (labels) {
      ctx.fillStyle = "#142226";
      ctx.textAlign = "center";
      ctx.font = "bold 12px PingFang TC, Microsoft JhengHei, Noto Sans TC, sans-serif";
      SHELL.rooms.forEach(function (room) {
        if (room.kind === "wc" || room.kind === "store") return;
        var center = roomCenter(room.id);
        if (!center) return;
        ctx.fillText(room.name, mx(center.x), mz(center.z));
      });
    }
    ctx.fillStyle = "#e23b32";
    ctx.beginPath();
    ctx.arc(mx(player.x), mz(player.z), Math.max(3.5, scale * 0.42), 0, Math.PI * 2);
    ctx.fill();
  }
  function drawMinimap() {
    var map = el("wardMinimap");
    if (!map) return;
    var ctx = map.getContext("2d");
    var w = map.width, h = map.height;
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    paintMap(ctx, w, h, false);
    ctx.restore();
    ctx.strokeStyle = "#f0d48a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  function drawBigMap() {
    var map = el("wardMapBig");
    if (!map) return;
    paintMap(map.getContext("2d"), map.width, map.height, true);
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!active) return;
    var dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0.016);
    lastTs = ts || 0;
    if (!paused && !dialog && !battle && !menuOpen && !mapOpen) {
      var wish = wishVector();
      if (wish.x || wish.z) {
        var moved = slide(wish.x * dt, wish.z * dt);
        if (moved) onTravel(moved);
      }
    }
    if (playerMesh) {
      var bob = paused ? 0 : Math.sin((ts || 0) * 0.008) * 0.03;
      playerMesh.position.set(player.x, bob, player.z);
      playerMesh.rotation.y = player.rot;
    }
    if (trolleyMesh) trolleyMesh.position.set(trolley.x, 0, trolley.z);
    if (incidentMesh) incidentMesh.visible = quest === "code" && (step === "push" || step === "goTrolley");
    drawMinimap();
    if (camera && renderer && !glFailed) {
      try {
        var aspect = Math.max(0.45, (renderer.domElement.clientWidth || 1) / Math.max(1, renderer.domElement.clientHeight || 1));
        var view = 7.2;
        camera.left = -view * aspect;
        camera.right = view * aspect;
        camera.top = view;
        camera.bottom = -view;
        camera.updateProjectionMatrix();
        camera.position.set(player.x + 7.5, 11, player.z + 7.5);
        camera.lookAt(player.x, 0, player.z);
        renderer.render(scene, camera);
      } catch (err) {
        glFailed = true;
        showGlError("立體畫面開唔到。請用 Chrome 雙擊 game.html。唔使密碼。");
      }
    }
    var roomNode = el("wardRoomLabel");
    if (roomNode) roomNode.textContent = roomNameAt(player.x, player.z);
  }

  function onResize() {
    var canvas = el("wardCanvas");
    var wrap = canvas && canvas.parentElement;
    if (!wrap || !renderer) return;
    var w = wrap.clientWidth || 300;
    var h = wrap.clientHeight || 200;
    renderer.setSize(w, h, false);
  }

  function resetPlay() {
    player.x = MARK.start.x;
    player.z = MARK.start.z;
    player.rot = 0.4;
    trolley.x = MARK.trolley.x;
    trolley.z = MARK.trolley.z;
    pushing = false;
    quest = "";
    step = "idle";
    travel = 0;
    seen = { code: false, admit: false, rest: false };
    dialog = null;
    battle = null;
    menuOpen = false;
    mapOpen = false;
    triggeredPush = false;
    joy.x = joy.y = 0; joy.on = false;
    keys.up = keys.down = keys.left = keys.right = false;
    show("wardDialog", false);
    show("wardBattle", false);
    show("wardMenu", false);
    show("wardMapOverlay", false);
    if (incidentMesh) incidentMesh.visible = false;
    setQuestLabel();
  }

  function dirOfKey(e) {
    var code = e.code || "";
    var key = e.key || "";
    if (code === "ArrowUp" || code === "KeyW" || key === "ArrowUp" || key === "w" || key === "W") return "up";
    if (code === "ArrowDown" || code === "KeyS" || key === "ArrowDown" || key === "s" || key === "S") return "down";
    if (code === "ArrowLeft" || code === "KeyA" || key === "ArrowLeft" || key === "a" || key === "A") return "left";
    if (code === "ArrowRight" || code === "KeyD" || key === "ArrowRight" || key === "d" || key === "D") return "right";
    return "";
  }

  function bind() {
    var joyEl = el("wardJoy");
    var knob = el("wardJoyKnob");
    if (joyEl) {
      var pid = null;
      function center() {
        var rect = joyEl.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, r: rect.width * 0.38 };
      }
      function setJoy(clientX, clientY) {
        var c = center();
        var dx = clientX - c.x;
        var dy = c.y - clientY;
        var mag = Math.sqrt(dx * dx + dy * dy) || 1;
        var lim = c.r;
        var cl = Math.min(lim, mag);
        joy.x = (dx / mag) * (cl / lim);
        joy.y = (dy / mag) * (cl / lim);
        joy.on = true;
        if (knob) knob.style.transform = "translate(" + (dx / mag) * cl + "px," + (-dy / mag) * cl + "px)";
      }
      function endJoy() {
        pid = null;
        joy.on = false; joy.x = 0; joy.y = 0;
        if (knob) knob.style.transform = "translate(0,0)";
      }
      joyEl.addEventListener("pointerdown", function (ev) {
        if (ev.cancelable) ev.preventDefault();
        pid = ev.pointerId;
        try { joyEl.setPointerCapture(ev.pointerId); } catch (err) { /* mouse fallback still tracks */ }
        setJoy(ev.clientX, ev.clientY);
      });
      window.addEventListener("pointermove", function (ev) {
        if (pid == null || ev.pointerId !== pid) return;
        if (ev.cancelable) ev.preventDefault();
        setJoy(ev.clientX, ev.clientY);
      });
      window.addEventListener("pointerup", function (ev) {
        if (pid == null || ev.pointerId !== pid) return;
        endJoy();
      });
      window.addEventListener("pointercancel", function (ev) {
        if (pid == null || ev.pointerId !== pid) return;
        endJoy();
      });
    }
    el("wardBtnA").addEventListener("pointerdown", function (ev) {
      if (ev.cancelable) ev.preventDefault();
      tryInteract();
    });
    el("wardBtnB").addEventListener("pointerdown", function (ev) {
      if (ev.cancelable) ev.preventDefault();
      pressB();
    });
    el("wardMenuClose").addEventListener("click", closeMenu);
    var mini = el("wardMinimap");
    if (mini) mini.addEventListener("pointerdown", function (ev) {
      if (ev.cancelable) ev.preventDefault();
      toggleMap();
    });
    var overlay = el("wardMapOverlay");
    if (overlay) overlay.addEventListener("pointerdown", function () { if (mapOpen) toggleMap(); });
    window.addEventListener("keydown", function (e) {
      if (!active) return;
      var dir = dirOfKey(e);
      if (dir) {
        e.preventDefault();
        if (paused) return;
        if (battle && battle.phase === "ask" && !e.repeat) {
          if (dir === "up" || dir === "left") battle.cursor = (battle.cursor + 3) % 4;
          else battle.cursor = (battle.cursor + 1) % 4;
          renderBattle();
          return;
        }
        keys[dir] = true;
        return;
      }
      var code = e.code || "";
      var key = e.key || "";
      var confirm = code === "KeyZ" || code === "Enter" || code === "NumpadEnter" || key === "z" || key === "Z" || key === "Enter";
      var cancel = code === "KeyX" || code === "KeyB" || code === "Escape" || key === "x" || key === "X" || key === "b" || key === "B" || key === "Escape";
      if (confirm) { e.preventDefault(); if (!e.repeat) tryInteract(); }
      else if (cancel) { e.preventDefault(); if (!e.repeat) pressB(); }
    }, true);
    window.addEventListener("keyup", function (e) {
      var dir = dirOfKey(e);
      if (dir) keys[dir] = false;
    }, true);
    window.addEventListener("resize", onResize);
  }

  function pathMeters(ax, az, bx, bz) {
    var a = cellAt(ax, az), b = cellAt(bx, bz);
    if (!walkAt(a.c, a.r) || !walkAt(b.c, b.r)) return -1;
    var q = [[a.c, a.r, 0]];
    var seenT = {};
    seenT[a.c + "," + a.r] = 1;
    var i, cur, k, nx, ny;
    var nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (i = 0; i < q.length; i++) {
      cur = q[i];
      if (cur[0] === b.c && cur[1] === b.r) return cur[2] * TILE;
      for (k = 0; k < 4; k++) {
        nx = cur[0] + nbs[k][0];
        ny = cur[1] + nbs[k][1];
        if (!walkAt(nx, ny) || seenT[nx + "," + ny]) continue;
        seenT[nx + "," + ny] = 1;
        q.push([nx, ny, cur[2] + 1]);
      }
    }
    return -1;
  }

  function start() {
    active = true;
    paused = false;
    if (!window.THREE || !SHELL) {
      showGlError("畫面未載入。請同 game.html 一齊開啟 vendor/three.min.js 同 ward-shell.js。唔使密碼。");
      return;
    }
    if (!built) {
      try { buildScene(); bind(); }
      catch (err) {
        showGlError("立體畫面開唔到。請用 Chrome 雙擊 game.html。唔使密碼。");
        return;
      }
    }
    resetPlay();
    if (!raf) raf = requestAnimationFrame(frame);
    requestAnimationFrame(function () { onResize(); requestAnimationFrame(onResize); });
  }
  function stop() { active = false; keys = { up: false, down: false, left: false, right: false }; joy.on = false; }

  window.WardMode = {
    start: start,
    stop: stop,
    setPaused: function (on) { paused = !!on; },
    active: function () { return active; },
    state: function () {
      return {
        x: player.x, z: player.z, rot: player.rot, pushing: pushing,
        tx: trolley.x, tz: trolley.z, quest: quest, step: step,
        room: roomNameAt(player.x, player.z),
        dialog: !!dialog, battle: battle ? battle.phase : "",
        menu: menuOpen, map: mapOpen, travel: travel,
        camera: camera && camera.isOrthographicCamera ? "ortho" : ""
      };
    },
    markers: function () { return MARK; },
    rooms: SHELL.rooms,
    pathMeters: pathMeters,
    axes: function () { return screenAxes(); },
    enclosure: function () {
      return { tile: TILE, walls: wallSpots.length, byRoom: roomStat };
    },
    look: function () {
      var wall = null;
      if (scene) scene.traverse(function (obj) {
        if (obj.userData && obj.userData.kind === "wall" && obj.geometry && obj.geometry.parameters) wall = obj.geometry.parameters;
      });
      var clear = "";
      if (renderer && renderer.getClearColor) {
        var col = new THREE.Color();
        renderer.getClearColor(col);
        clear = col.getHexString();
      }
      return { tile: TILE, wall: wall, clear: clear, ortho: !!(camera && camera.isOrthographicCamera) };
    },
    walkable: function (x, z) { return canStand(x, z); },
    slide: function (dx, dz) { var m = slide(dx, dz); if (m) onTravel(m); return m; },
    audit: function () {
      var beds = {};
      if (scene) scene.traverse(function (obj) {
        if (obj.userData && obj.userData.kind === "bed") beds[obj.userData.room] = (beds[obj.userData.room] || 0) + 1;
      });
      return { beds: beds, rooms: SHELL.rooms.map(function (r) { return r.id; }) };
    }
  };
})();
