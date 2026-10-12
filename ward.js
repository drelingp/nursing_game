/* 病房探索 — traced Ward C, Pokémon orthographic walk. */
(function () {
  "use strict";

  var SHELL = window.WARD_SHELL;
  var CELL = SHELL.cell;
  var GW = SHELL.w;
  var GH = SHELL.h;
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

  function decode(rows) {
    var g = new Uint16Array(GW * GH);
    var r, i, c, k, v, n, runs;
    for (r = 0; r < GH; r++) {
      runs = rows[r];
      c = 0;
      for (i = 0; i < runs.length; i += 2) {
        v = runs[i];
        n = runs[i + 1];
        for (k = 0; k < n; k++) g[r * GW + c + k] = v;
        c += n;
      }
    }
    return g;
  }

  var walk = decode(SHELL.walk);
  var roomOf = decode(SHELL.room);
  var MARK = SHELL.marks;
  var roomById = {};
  SHELL.rooms.forEach(function (r, i) { roomById[r.id] = r; r.index = i + 2; });

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
    return { c: Math.floor(x / CELL), r: Math.floor(z / CELL) };
  }
  function walkAt(c, r) {
    return c >= 0 && r >= 0 && c < GW && r < GH && walk[r * GW + c] === 1;
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
    var id = roomOf[p.r * GW + p.c];
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
    camera.position.set(player.x + 7, 11, player.z + 7);
    camera.lookAt(player.x, 0.2, player.z);
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

  var enclosure = null;
  function occAt(c, r) {
    if (!walkAt(c, r)) return 0;
    return roomOf[r * GW + c] || 1;
  }
  function buildEnclosure() {
    if (enclosure) return enclosure;
    var edges = [];
    var row, c, r, above, below, left, right;
    for (row = 0; row <= GH; row++) {
      for (c = 0; c < GW; c++) {
        above = row === 0 ? 0 : occAt(c, row - 1);
        below = row === GH ? 0 : occAt(c, row);
        if (above === below) continue;
        edges.push({
          x1: c * CELL, z1: row * CELL, x2: (c + 1) * CELL, z2: row * CELL,
          horiz: true, a: above, b: below,
          solid: above === 0 || below === 0, door: false
        });
      }
    }
    for (c = 0; c <= GW; c++) {
      for (r = 0; r < GH; r++) {
        left = c === 0 ? 0 : occAt(c - 1, r);
        right = c === GW ? 0 : occAt(c, r);
        if (left === right) continue;
        edges.push({
          x1: c * CELL, z1: r * CELL, x2: c * CELL, z2: (r + 1) * CELL,
          horiz: false, a: left, b: right,
          solid: left === 0 || right === 0, door: false
        });
      }
    }
    function pairKey(e) {
      return e.a < e.b ? e.a + "," + e.b : e.b + "," + e.a;
    }
    function vkey(x, z) {
      return Math.round(x / CELL) + "," + Math.round(z / CELL);
    }
    var byPair = {};
    edges.forEach(function (e, i) {
      if (e.solid) return;
      var k = pairKey(e);
      if (!byPair[k]) byPair[k] = [];
      byPair[k].push(i);
    });
    var doorCells = Math.max(4, Math.round(1.1 / CELL));
    Object.keys(byPair).forEach(function (k) {
      var idxs = byPair[k];
      var adj = {};
      var at = {};
      idxs.forEach(function (i) {
        adj[i] = [];
        var e = edges[i];
        [vkey(e.x1, e.z1), vkey(e.x2, e.z2)].forEach(function (vk) {
          if (!at[vk]) at[vk] = [];
          at[vk].push(i);
        });
      });
      Object.keys(at).forEach(function (vk) {
        var list = at[vk];
        var i, j;
        for (i = 0; i < list.length; i++) {
          for (j = i + 1; j < list.length; j++) {
            adj[list[i]].push(list[j]);
            adj[list[j]].push(list[i]);
          }
        }
      });
      var seen = {};
      idxs.forEach(function (start) {
        if (seen[start]) return;
        var comp = [];
        var q = [start];
        seen[start] = 1;
        while (q.length) {
          var i = q.pop();
          comp.push(i);
          adj[i].forEach(function (n) {
            if (seen[n]) return;
            seen[n] = 1;
            q.push(n);
          });
        }
        if (comp.length * CELL < 0.7) return;
        if (comp.length <= doorCells) {
          comp.forEach(function (i) { edges[i].door = true; });
          return;
        }
        var cx = 0, cz = 0;
        comp.forEach(function (i) {
          var e = edges[i];
          cx += (e.x1 + e.x2) / 2;
          cz += (e.z1 + e.z2) / 2;
        });
        cx /= comp.length;
        cz /= comp.length;
        function away(i) {
          var e = edges[i];
          var mx = (e.x1 + e.x2) / 2, mz = (e.z1 + e.z2) / 2;
          return (mx - cx) * (mx - cx) + (mz - cz) * (mz - cz);
        }
        var best = comp[0], bestD = away(best);
        comp.forEach(function (i) {
          var d = away(i);
          if (d < bestD) { bestD = d; best = i; }
        });
        var doorSet = {};
        var qq = [best];
        doorSet[best] = 1;
        var count = 1;
        while (qq.length && count < doorCells) {
          var cur = qq.shift();
          var nbs = adj[cur].slice().sort(function (a, b) { return away(a) - away(b); });
          var t;
          for (t = 0; t < nbs.length && count < doorCells; t++) {
            if (doorSet[nbs[t]]) continue;
            doorSet[nbs[t]] = 1;
            qq.push(nbs[t]);
            count++;
          }
        }
        Object.keys(doorSet).forEach(function (i) { edges[i].door = true; });
      });
    });
    function merge(list) {
      var rows = {};
      list.forEach(function (e) {
        var key = (e.horiz ? "h" : "v") + Math.round((e.horiz ? e.z1 : e.x1) / CELL);
        if (!rows[key]) rows[key] = [];
        rows[key].push(e);
      });
      var out = [];
      Object.keys(rows).forEach(function (key) {
        var arr = rows[key];
        arr.sort(function (a, b) { return (a.horiz ? a.x1 - b.x1 : a.z1 - b.z1); });
        var cur = null;
        arr.forEach(function (e) {
          if (!cur) {
            cur = { x1: e.x1, z1: e.z1, x2: e.x2, z2: e.z2 };
            return;
          }
          var touch = e.horiz
            ? Math.abs(cur.x2 - e.x1) < 1e-3 && Math.abs(cur.z1 - e.z1) < 1e-3
            : Math.abs(cur.z2 - e.z1) < 1e-3 && Math.abs(cur.x1 - e.x1) < 1e-3;
          if (touch) { cur.x2 = e.x2; cur.z2 = e.z2; }
          else { out.push(cur); cur = { x1: e.x1, z1: e.z1, x2: e.x2, z2: e.z2 }; }
        });
        if (cur) out.push(cur);
      });
      return out;
    }
    var wallEdges = [];
    var doorEdges = [];
    edges.forEach(function (e) { (e.door ? doorEdges : wallEdges).push(e); });
    var walls = merge(wallEdges);
    var lintels = merge(doorEdges);
    var posts = [];
    var seenPost = {};
    function addPost(x, z, jamb) {
      var k = Math.round(x * 64) + "," + Math.round(z * 64);
      if (seenPost[k]) { if (jamb) seenPost[k].jamb = true; return; }
      var p = { x: x, z: z, jamb: !!jamb };
      seenPost[k] = p;
      posts.push(p);
    }
    walls.forEach(function (s) { addPost(s.x1, s.z1, false); addPost(s.x2, s.z2, false); });
    lintels.forEach(function (s) { addPost(s.x1, s.z1, true); addPost(s.x2, s.z2, true); });
    var byRoom = {};
    function bump(id, door) {
      if (id < 2 || !SHELL.rooms[id - 2]) return;
      var name = SHELL.rooms[id - 2].id;
      if (!byRoom[name]) byRoom[name] = { wall: 0, door: 0 };
      if (door) byRoom[name].door += 1;
      else byRoom[name].wall += 1;
    }
    edges.forEach(function (e) {
      bump(e.a, e.door);
      bump(e.b, e.door);
    });
    enclosure = { walls: walls, lintels: lintels, posts: posts, byRoom: byRoom };
    return enclosure;
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
    sun.position.set(12, 18, 8);
    scene.add(sun);

    var floorCanvas = document.createElement("canvas");
    floorCanvas.width = GW;
    floorCanvas.height = GH;
    var fg = floorCanvas.getContext("2d");
    var img = fg.createImageData(GW, GH);
    var data = img.data;
    var i, id, col, r, g, b, a;
    for (i = 0; i < GW * GH; i++) {
      if (walk[i] !== 1) continue;
      id = roomOf[i];
      col = id >= 2 ? SHELL.rooms[id - 2].color : 0xd7c4a3;
      r = (col >> 16) & 255; g = (col >> 8) & 255; b = col & 255;
      a = i * 4;
      data[a] = r; data[a + 1] = g; data[a + 2] = b; data[a + 3] = 255;
    }
    fg.putImageData(img, 0, 0);
    paintShellFill(fg, GW, GH);
    fg.save();
    fg.globalCompositeOperation = "destination-over";
    fg.fillStyle = "#8ec6ea";
    fg.fillRect(0, 0, GW, GH);
    fg.restore();
    var tex = new THREE.CanvasTexture(floorCanvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.flipY = false;
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(GW * CELL, GH * CELL), new THREE.MeshLambertMaterial({ map: tex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(GW * CELL / 2, -0.05, GH * CELL / 2);
    scene.add(floor);

    var shellWalls = buildEnclosure();
    var wallPieces = shellWalls.walls.length + shellWalls.posts.length;
    if (wallPieces) {
      var wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(0xf4efe2), wallPieces);
      var dummy = new THREE.Object3D();
      var widx = 0;
      shellWalls.walls.forEach(function (s) {
        var dx = s.x2 - s.x1, dz = s.z2 - s.z1;
        var len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.02) return;
        dummy.position.set((s.x1 + s.x2) / 2, 1.1, (s.z1 + s.z2) / 2);
        dummy.rotation.set(0, Math.atan2(dx, dz), 0);
        dummy.scale.set(0.4, 2.2, len);
        dummy.updateMatrix();
        wallMesh.setMatrixAt(widx, dummy.matrix);
        widx += 1;
      });
      shellWalls.posts.forEach(function (p) {
        dummy.position.set(p.x, 1.1, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.42, 2.2, 0.42);
        dummy.updateMatrix();
        wallMesh.setMatrixAt(widx, dummy.matrix);
        widx += 1;
      });
      while (widx < wallPieces) {
        dummy.position.set(0, -8, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        wallMesh.setMatrixAt(widx, dummy.matrix);
        widx += 1;
      }
      wallMesh.instanceMatrix.needsUpdate = true;
      scene.add(wallMesh);
    }
    if (shellWalls.lintels.length) {
      var beam = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(0xe7d3a4), shellWalls.lintels.length);
      var beamDummy = new THREE.Object3D();
      shellWalls.lintels.forEach(function (s, idx) {
        var dx = s.x2 - s.x1, dz = s.z2 - s.z1;
        var len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.02) {
          beamDummy.position.set(0, -8, 0);
          beamDummy.rotation.set(0, 0, 0);
          beamDummy.scale.set(0, 0, 0);
        } else {
          beamDummy.position.set((s.x1 + s.x2) / 2, 1.96, (s.z1 + s.z2) / 2);
          beamDummy.rotation.set(0, Math.atan2(dx, dz), 0);
          beamDummy.scale.set(0.4, 0.48, len);
        }
        beamDummy.updateMatrix();
        beam.setMatrixAt(idx, beamDummy.matrix);
      });
      beam.instanceMatrix.needsUpdate = true;
      scene.add(beam);
    }

    SHELL.rooms.forEach(function (room) {
      if (room.kind === "wc" || room.kind === "store") return;
      var tag = labelSprite(room.name);
      tag.position.set((room.c + 0.5) * CELL, 2.45, (room.r + 0.5) * CELL);
      scene.add(tag);
    });
    (SHELL.beds || []).forEach(function (bed) {
      var group = new THREE.Group();
      addBox(group, 0.95, 0.18, 1.7, 0xf7f1e4, 0, 0.2, 0);
      var blanket = addBox(group, 0.78, 0.08, 1.25, 0x6cb5d6, 0, 0.32, 0.05);
      blanket.userData.kind = "bed";
      blanket.userData.room = bed.room;
      addBox(group, 0.42, 0.08, 0.28, 0xfff8ee, 0, 0.4, -0.62);
      group.position.set(bed.x, 0, bed.z);
      group.rotation.y = bed.ang || 0;
      scene.add(group);
    });
    addBox(scene, 4.2, 0.5, 1.05, 0xefe6d4, MARK.nurse.x - 0.4, 0.32, MARK.nurse.z - 0.2);
    addBox(scene, 0.55, 0.22, 0.38, 0x2c3440, MARK.computer.x, 0.55, MARK.computer.z);
    addBox(scene, 0.5, 0.32, 0.08, 0x8fd0ff, MARK.computer.x, 0.86, MARK.computer.z);
    addBox(scene, 0.62, 0.3, 0.42, 0x4d5966, MARK.fax.x, 0.5, MARK.fax.z);
    addBox(scene, 0.7, 0.7, 0.5, 0xf4f7fb, MARK.treat.x - 1.2, 0.4, MARK.treat.z);
    addBox(scene, 0.18, 0.32, 0.08, 0xd6453d, MARK.treat.x - 1.2, 0.9, MARK.treat.z);

    playerMesh = new THREE.Group();
    addBox(playerMesh, 0.46, 0.48, 0.34, 0x2f6f9a, 0, 0.46, 0);
    addBox(playerMesh, 0.32, 0.28, 0.28, 0xf3c7a1, 0, 0.82, 0);
    addBox(playerMesh, 0.36, 0.1, 0.36, 0xfff8ee, 0, 0.98, 0);
    addBox(playerMesh, 0.08, 0.08, 0.08, 0x1b2830, 0.08, 0.84, 0.12);
    playerMesh.scale.set(0.9, 0.9, 0.9);
    scene.add(playerMesh);

    trolleyMesh = new THREE.Group();
    addBox(trolleyMesh, 0.7, 0.28, 0.46, 0xd6453d, 0, 0.42, 0);
    addBox(trolleyMesh, 0.22, 0.08, 0.08, 0xfff8ee, 0, 0.58, 0);
    addBox(trolleyMesh, 0.08, 0.22, 0.08, 0xfff8ee, 0, 0.5, 0);
    addBox(trolleyMesh, 0.12, 0.12, 0.12, 0x222222, -0.22, 0.16, 0.14);
    addBox(trolleyMesh, 0.12, 0.12, 0.12, 0x222222, 0.22, 0.16, 0.14);
    scene.add(trolleyMesh);

    incidentMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), mat(0xe23b32));
    incidentMesh.position.set(MARK.incident.x, 0.06, MARK.incident.z);
    incidentMesh.visible = false;
    scene.add(incidentMesh);
    built = true;
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
    g.font = "bold 40px PingFang TC, Microsoft JhengHei, Noto Sans TC, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 50);
    var tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(3.2, 0.6, 1);
    return sprite;
  }

  function paintShellFill(ctx, w, h) {
    var ring = SHELL.ring || [];
    if (ring.length < 3) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#f4efe2";
    ctx.beginPath();
    ctx.moveTo(ring[0][0] / CELL * (w / GW), ring[0][1] / CELL * (h / GH));
    var i;
    for (i = 1; i < ring.length; i++) ctx.lineTo(ring[i][0] / CELL * (w / GW), ring[i][1] / CELL * (h / GH));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  var mapCache = null;
  var mapBox = null;
  function ensureMapCache() {
    if (mapCache) return;
    var minC = GW, minR = GH, maxC = 0, maxR = 0, r, c, id, col, a;
    for (r = 0; r < GH; r++) {
      for (c = 0; c < GW; c++) {
        if (walk[r * GW + c] !== 1) continue;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
      }
    }
    minC = Math.max(0, minC - 3);
    minR = Math.max(0, minR - 3);
    maxC = Math.min(GW - 1, maxC + 3);
    maxR = Math.min(GH - 1, maxR + 3);
    mapBox = { minC: minC, minR: minR, bw: maxC - minC + 1, bh: maxR - minR + 1 };
    var img = new ImageData(GW, GH);
    var data = img.data;
    for (r = 0; r < GH; r++) {
      for (c = 0; c < GW; c++) {
        a = (r * GW + c) * 4;
        if (walk[r * GW + c] !== 1) { data[a + 3] = 0; continue; }
        id = roomOf[r * GW + c];
        col = id >= 2 ? SHELL.rooms[id - 2].color : 0xd7c4a3;
        data[a] = (col >> 16) & 255;
        data[a + 1] = (col >> 8) & 255;
        data[a + 2] = col & 255;
        data[a + 3] = 255;
      }
    }
    mapCache = document.createElement("canvas");
    mapCache.width = GW;
    mapCache.height = GH;
    var g = mapCache.getContext("2d");
    g.putImageData(img, 0, 0);
    paintShellFill(g, GW, GH);
  }
  function paintMap(ctx, w, h, labels) {
    ensureMapCache();
    var b = mapBox;
    ctx.fillStyle = "#10242c";
    ctx.fillRect(0, 0, w, h);
    var scale = Math.min((w - 16) / b.bw, (h - 16) / b.bh);
    var ox = (w - b.bw * scale) / 2;
    var oy = (h - b.bh * scale) / 2;
    function mx(x) { return ox + (x / CELL - b.minC) * scale; }
    function mz(z) { return oy + (z / CELL - b.minR) * scale; }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mapCache, b.minC, b.minR, b.bw, b.bh, ox, oy, b.bw * scale, b.bh * scale);
    var shellWalls = buildEnclosure();
    ctx.strokeStyle = "rgba(62, 48, 36, 0.92)";
    ctx.lineWidth = Math.max(1.25, scale * 0.55);
    ctx.lineCap = "square";
    shellWalls.walls.forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(mx(s.x1), mz(s.z1));
      ctx.lineTo(mx(s.x2), mz(s.z2));
      ctx.stroke();
    });
    ctx.strokeStyle = "rgba(180, 140, 70, 0.95)";
    ctx.lineWidth = Math.max(1, scale * 0.28);
    shellWalls.lintels.forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(mx(s.x1), mz(s.z1));
      ctx.lineTo(mx(s.x2), mz(s.z2));
      ctx.stroke();
    });
    if (labels) {
      ctx.fillStyle = "#142226";
      ctx.textAlign = "center";
      ctx.font = "bold 12px PingFang TC, Microsoft JhengHei, Noto Sans TC, sans-serif";
      SHELL.rooms.forEach(function (room) {
        if (room.kind === "wc" || room.kind === "store") return;
        ctx.fillText(room.name, mx((room.c + 0.5) * CELL), mz((room.r + 0.5) * CELL));
      });
    }
    ctx.fillStyle = "#e23b32";
    ctx.beginPath();
    ctx.arc(mx(player.x), mz(player.z), Math.max(3.5, scale * 1.3), 0, Math.PI * 2);
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
        var view = 6.4;
        var halfW = view * aspect;
        var halfH = view;
        if (halfW > 9.5) { halfH *= 9.5 / halfW; halfW = 9.5; }
        camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH;
        camera.updateProjectionMatrix();
        camera.position.set(player.x + 7, 11, player.z + 7);
        camera.lookAt(player.x, 0.2, player.z);
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
      if (cur[0] === b.c && cur[1] === b.r) return cur[2] * CELL;
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
      var e = buildEnclosure();
      var jambs = 0;
      e.posts.forEach(function (p) { if (p.jamb) jambs += 1; });
      return { walls: e.walls.length, lintels: e.lintels.length, posts: e.posts.length, jambs: jambs, byRoom: e.byRoom };
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
