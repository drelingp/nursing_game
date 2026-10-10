/* 病房探索 — traced Ward C. Room names live in ward-map.js WARD_PACK.rooms. */
(function () {
  "use strict";

  var PACK = window.WARD_PACK;
  if (!PACK) return;

  var TILE = 1;
  var MAP_W = PACK.w;
  var MAP_H = PACK.h;
  var MOVE_MS = 130;
  var MARK = PACK.markers;

  var byCh = {};
  var byId = {};
  PACK.rooms.forEach(function (r) {
    byCh[r.ch] = r;
    byId[r.id] = r;
  });

  var grid = PACK.rows.map(function (row) { return row.split(""); });

  var CODE_QS = [
    { q: "模擬急救（虛構）：C座走廊有人呼叫。較適切的做法是？", options: ["自己一個做完先再叫人", "呼叫支援，去治療室推急救車返事發位置，期間唔好留病人無人看管", "先去護士站影印藥紙", "叫病人自己行去升降機"], answer: 1, explain: "急救先呼叫支援，帶 E-trolley 返事發點。唔好留低危急病人一個人。影印藥紙係情況穩定之後先做。", points: ["先呼叫支援。", "治療室攞急救車推返事發位置。", "唔好留病人無人看管。"] },
    { q: "模擬急救（虛構）：要用邊套設備？較適切的是？", options: ["邊張床近就用邊張，唔使指定車", "用治療室急救車（E-trolley），氧氣同吸引跟部門現場指引", "只用大廳梳化", "一定要先推去另一座病房先可以做"], answer: 1, explain: "訓練情境用治療室嘅急救車。氧氣、吸引同指定急救位以部門現場為準，唔好隨便用梳化代替。", points: ["用 E-trolley。", "氧氣／吸引跟現場指引。", "實際位置以部門為準。"] },
    { q: "模擬急救（虛構）：情況暫時穩定之後。較適切的是？", options: ["唔使寫，記得就得", "返護士站用傳真機影印藥紙，並寫低時間、做過嘅事同在場職員", "只同朋友講", "等一個星期再補"], answer: 1, explain: "穩定之後返護士站影印藥紙，並準備紀錄。分數只係學習回饋，唔係評核。實際工作跟部門指引。", points: ["護士站傳真機影印藥紙。", "寫時間、做法、在場人。", "跟部門指引交文件。"] }
  ];
  var ADMIT_QS = [
    { q: "模擬收症（虛構）：護送「林先生」同家屬到升降機口。較適切的是？", options: ["唔核對身份，快啲揾張床", "先核對身份同文件，再按部門指引安排床位", "叫病人自己喺走廊搵房", "見到護送就一律拒收"], answer: 1, explain: "收症先核對身份同文件，再安排床位。呢個係虛構個案，床位同 rota 以當更為準。", points: ["先核對身份同文件。", "再安排床位。", "當更安排跟部門。"] },
    { q: "模擬收症（虛構）：要做金屬探測。較適切的是？", options: ["一個人喺走廊公開掃就得", "屏風、解釋、雙人（一探測一見證），危險品交家人並記 note", "唔解釋，以免病人拒絕", "出院先做一次"], answer: 1, explain: "金屬探測要有私隱、解釋同雙人見證。危險品交家人並記低。", points: ["屏風同解釋。", "雙人：一探測一見證。", "危險品交家人並記 note。"] },
    { q: "模擬收症（虛構）：未 confirm 本 team 1:1，對方催住 book 車。較適切的是？", options: ["先 book 車，1:1 之後再算", "1:1 安排確認先，車後", "1:1 同車都唔使理", "叫家屬自己叫的士代替"], answer: 1, explain: "未確認 1:1 唔好因為催而先 book 車。確認人手安排先，交通其後。", points: ["1:1 先，車後。", "唔好被催打亂次序。", "實際調動跟當更 IC。"] }
  ];
  var REST_QS = [
    { q: "模擬躁動（虛構）：同事話「綁起佢嚟懲罰」。較適切的是？", options: ["躁動就可以當懲罰綁", "約束係最後手段，要有醫囑同部門指引，先試其他方法，並向病人解釋", "唔使評估，越快越好", "交俾家屬全權決定點綁"], answer: 1, explain: "約束唔係懲罰。係最後手段，要有醫囑同部門指引，先試其他方法，並解釋。", points: ["最後手段，唔係懲罰。", "要有醫囑／部門指引。", "先試其他方法並解釋。"] },
    { q: "模擬約束（虛構）：已經按指引用約束。較適切的觀察是？", options: ["綁完就可以唔再睇", "定時檢查血液循環、皮膚同松緊，並記錄", "綁得越緊越安全", "收起呼叫鐘以免嘈"], answer: 1, explain: "用約束之後要定時睇循環、皮膚同松緊，並且寫低。呼叫鐘唔好收起。", points: ["定時檢查循環同皮膚。", "檢查松緊。", "要記錄。"] },
    { q: "模擬餵食（虛構）：約束中的病人躺住，家屬想瞓餵。較適切的是？", options: ["瞓餵快啲，可以", "必須坐起餵，禁止瞓餵；餵唔餵係護士臨床決定", "一律連水都唔畀", "交俾家屬決定"], answer: 1, explain: "約束中餵食必須坐起，禁止瞓餵。餵唔餵係護士臨床決定。", points: ["坐起餵。", "禁止瞓餵。", "臨床決定，唔係家屬全權。"] }
  ];

  var DIRS = [{ x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }, { x: 0, z: -1 }];
  var player = { x: MARK.start.x, z: MARK.start.z };
  var facing = 0;
  var trolley = { x: MARK.trolley.x, z: MARK.trolley.z };
  var pushing = false;
  var quest = "";
  var step = "idle";
  var stepsWalked = 0;
  var seen = { code: false, admit: false, rest: false };
  var active = false;
  var paused = false;
  var built = false;
  var keys = {};
  var keyTimer = 0;
  var dialog = null;
  var battle = null;
  var menuOpen = false;
  var mapOpen = false;
  var raf = 0;
  var renderer, scene, camera, playerMesh, trolleyMesh, incidentMesh;
  var clock = 0;
  var triggeredPush = false;
  var stepFrame = 0;
  var legL, legR;

  function inMap(x, z) { return x >= 0 && z >= 0 && x < MAP_W && z < MAP_H; }
  function cell(x, z) { return inMap(x, z) ? grid[z][x] : "#"; }
  function walkable(x, z) {
    var ch = cell(x, z);
    return ch !== "#" && ch !== ".";
  }
  function roomAt(x, z) {
    var r = byCh[cell(x, z)];
    return r || null;
  }
  function roomNameAt(x, z) {
    var r = roomAt(x, z);
    if (r) return r.name;
    return walkable(x, z) ? "C座" : "牆";
  }
  function near(ax, az, bx, bz) { return Math.abs(ax - bx) + Math.abs(az - bz) <= 1; }
  function faceOf(dx, dz) {
    if (dx > 0) return 0;
    if (dz > 0) return 1;
    if (dx < 0) return 2;
    return 3;
  }
  function el(id) { return document.getElementById(id); }
  function show(id, on) {
    var node = el(id);
    if (node) node.classList.toggle("hidden", !on);
  }

  function setQuestLabel() {
    var text = "喺C座走走。突發事件唔會每兩步就出現。撳 B 睇任務目標。";
    if (quest === "code") {
      if (step === "intro" || step === "goTrolley") text = "任務：去治療室，撳 A 攞急救車。";
      else if (step === "push") text = "任務：推急救車返事發位置（走廊紅點）。";
      else if (step === "battle") text = "任務：急救認識問答。A 確認，B 取消選擇。";
      else if (step === "goFax") text = "任務：去護士站，撳 A 用傳真機影印藥紙。";
      else if (step === "docs") text = "任務：再撳 A，準備急救文件。";
    } else if (quest === "admit") {
      if (step === "intro" || step === "goElev") text = "任務：去升降機一，撳 A 核對收症。";
      else if (step === "battle") text = "任務：收症問答。A 確認，B 取消選擇。";
      else if (step === "goBed") text = "任務：去病房三，撳 A 安排床位。";
    } else if (quest === "rest") {
      if (step === "intro" || step === "goRoom") text = "任務：去病房二，撳 A 處理躁動。";
      else if (step === "battle") text = "任務：約束問答。A 確認，B 取消選擇。";
      else if (step === "goNurse") text = "任務：去護士站，撳 A 記錄約束。";
    }
    var node = el("wardQuestLabel");
    if (node) node.textContent = text;
    var room = el("wardRoomLabel");
    if (room) room.textContent = roomNameAt(player.x, player.z);
    var canvas = el("wardCanvas");
    if (canvas) {
      canvas.dataset.wx = String(player.x);
      canvas.dataset.wz = String(player.z);
      canvas.dataset.quest = quest || "none";
      canvas.dataset.step = step;
      canvas.dataset.pushing = pushing ? "1" : "0";
      canvas.dataset.tx = String(trolley.x);
      canvas.dataset.tz = String(trolley.z);
      canvas.dataset.dialog = dialog ? "1" : "0";
      canvas.dataset.battle = battle ? battle.phase : "";
      canvas.dataset.menu = menuOpen ? "1" : "0";
      canvas.dataset.map = mapOpen ? "1" : "0";
    }
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
    if (dialog || battle || mapOpen) return;
    menuOpen = true;
    show("wardMenu", true);
    var goal = el("wardQuestLabel") ? el("wardQuestLabel").textContent : "";
    el("wardMenuText").textContent = "任務目標\n" + goal;
  }
  function closeMenu() { menuOpen = false; show("wardMenu", false); }

  function renderBattle() {
    if (!battle) return;
    show("wardBattle", true);
    var q = battle.qs[battle.i];
    el("battleFoeName").textContent = battle.title + "  " + (battle.i + 1) + "/" + battle.qs.length;
    var box = el("battleOptions");
    if (battle.phase === "ask") {
      el("battleText").textContent = q.q;
      box.innerHTML = q.options.map(function (text, i) {
        return '<button type="button" class="battle-opt' + (i === battle.cursor ? " on" : "") + '" data-i="' + i + '">' + "ABCD"[i] + ". " + text + "</button>";
      }).join("");
      box.querySelectorAll(".battle-opt").forEach(function (btn) {
        btn.addEventListener("click", function () {
          battle.cursor = parseInt(btn.getAttribute("data-i"), 10);
          confirmChoice();
        });
      });
    } else {
      var points = q.points.map(function (p) { return "・" + p; }).join(" ");
      el("battleText").textContent = (battle.lastOk ? "答啱。 " : "呢個選擇未係最適切。 ") + q.explain + " 學習重點：" + points;
      box.innerHTML = '<p class="battle-next">撳 A 繼續</p>';
    }
    setQuestLabel();
  }
  function openBattle(title, qs) {
    battle = { title: title, qs: qs, i: 0, cursor: 0, phase: "ask", lastOk: false };
    dialog = null;
    show("wardDialog", false);
    var flash = el("wardFlash");
    if (flash) {
      flash.classList.remove("hidden");
      setTimeout(function () { flash.classList.add("hidden"); }, 420);
    }
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
    el("battleText").textContent = battle.qs[battle.i].q + "（已取消選擇，撳 A 先確認。）";
  }
  function onBattleDone() {
    if (quest === "code") {
      pushing = false;
      step = "goFax";
      say(["情況暫時穩定（虛構）。而家去護士站，用傳真機影印藥紙，再準備文件。"], function () { setQuestLabel(); });
    } else if (quest === "admit") {
      step = "goBed";
      say(["身份同安檢問答完。去病房三，撳 A 安排呢位虛構病人上床。"], function () { setQuestLabel(); });
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
    stepsWalked = 0;
    setQuestLabel();
  }
  function beginCode() {
    quest = "code";
    step = "intro";
    seen.code = true;
    triggeredPush = false;
    say(["突然：走廊有人呼叫！虛構病人「陳先生」情況危急。", "先去治療室，撳 A 攞急救車，推返事發位置（地面紅點）。", "本遊戲只供訓練用途，實際工作請依照部門指引。"], function () {
      step = "goTrolley";
      setQuestLabel();
    });
  }
  function beginAdmit() {
    quest = "admit";
    step = "intro";
    seen.admit = true;
    say(["收症：虛構病人「林先生」同護送喺升降機一等候。", "先去升降機一，撳 A 核對身份，再答收症問題，最後去病房三安排床位。"], function () {
      step = "goElev";
      setQuestLabel();
    });
  }
  function beginRest() {
    quest = "rest";
    step = "intro";
    seen.rest = true;
    say(["病房二：虛構病人躁動，同事想即刻綁起嚟。", "去病房二撳 A。約束唔係懲罰，跟指引先評估再答題，之後返護士站記錄。"], function () {
      step = "goRoom";
      setQuestLabel();
    });
  }
  function onStepLanded() {
    if (quest === "code" && step === "push" && !triggeredPush && trolley.x === MARK.incident.x && trolley.z === MARK.incident.z) {
      triggeredPush = true;
      step = "battle";
      say(["急救車趕到事發位置。進入急救認識。"], function () { openBattle("急救認識", CODE_QS); });
      return;
    }
    if (quest) return;
    stepsWalked += 1;
    if (!seen.code && stepsWalked >= 6) { beginCode(); return; }
    if (stepsWalked < 14) return;
    if (Math.random() < 0.18 || stepsWalked >= 22) {
      stepsWalked = 0;
      if (!seen.admit) beginAdmit();
      else if (!seen.rest) beginRest();
      else if (Math.random() < 0.5) beginAdmit();
      else beginRest();
    }
  }
  function tryMove(dx, dz) {
    if (!active || paused || dialog || battle || menuOpen || mapOpen) return;
    var face = faceOf(dx, dz);
    var next = { x: player.x + dx, z: player.z + dz };
    if (!walkable(next.x, next.z)) {
      if (!pushing) facing = face;
      setQuestLabel();
      return;
    }
    if (pushing) {
      var ahead = { x: next.x + dx, z: next.z + dz };
      if (!walkable(ahead.x, ahead.z)) {
        facing = face;
        trolley.x = next.x;
        trolley.z = next.z;
        setQuestLabel();
        return;
      }
      trolley.x = ahead.x;
      trolley.z = ahead.z;
    }
    facing = face;
    player.x = next.x;
    player.z = next.z;
    stepFrame ^= 1;
    setQuestLabel();
    onStepLanded();
  }
  function tryInteract() {
    if (!active || paused || menuOpen || mapOpen) return;
    if (battle) { confirmChoice(); return; }
    if (dialog) { advanceDialog(); return; }
    if (quest === "code" && step === "goTrolley" && near(player.x, player.z, trolley.x, trolley.z) && !pushing) {
      var fx = player.x + DIRS[facing].x;
      var fz = player.z + DIRS[facing].z;
      if (!walkable(fx, fz)) { say(["呢邊推唔到，轉個方向先再撳 A。"]); return; }
      pushing = true;
      trolley.x = fx;
      trolley.z = fz;
      step = "push";
      if (incidentMesh) incidentMesh.visible = true;
      say(["你推住急救車。行去紅色事發點。"], function () { setQuestLabel(); });
      return;
    }
    if (quest === "code" && step === "goFax" && near(player.x, player.z, MARK.fax.x, MARK.fax.z)) {
      step = "docs";
      say(["傳真機影印藥紙（虛構）。核對病人身份同藥單。"], function () { setQuestLabel(); });
      return;
    }
    if (quest === "code" && step === "docs" && near(player.x, player.z, MARK.fax.x, MARK.fax.z)) {
      say(["文件備好：時間、做過嘅事、邊個在場。今次急救事件完結。分數只係學習回饋。"], function () { clearQuest(); });
      return;
    }
    if (quest === "admit" && step === "goElev" && near(player.x, player.z, MARK.elev.x, MARK.elev.z)) {
      step = "battle";
      say(["核對「林先生」身份同護送文件（虛構）。接着答收症問題。"], function () { openBattle("收症", ADMIT_QS); });
      return;
    }
    if (quest === "admit" && step === "goBed" && near(player.x, player.z, MARK.admitBed.x, MARK.admitBed.z)) {
      say(["已安排虛構病人去病房三。收症流程完結。實際床位跟當更。"], function () { clearQuest(); });
      return;
    }
    if (quest === "rest" && step === "goRoom" && near(player.x, player.z, MARK.restBed.x, MARK.restBed.z)) {
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

  function mat(color) { return new THREE.MeshLambertMaterial({ color: color }); }
  function addBox(parent, w, h, d, color, x, y, z) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function labelSprite(text) {
    var c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    var g = c.getContext("2d");
    g.fillStyle = "rgba(12, 24, 32, 0.82)";
    g.fillRect(4, 8, 248, 48);
    g.strokeStyle = "#f6e27a";
    g.lineWidth = 4;
    g.strokeRect(4, 8, 248, 48);
    g.fillStyle = "#fff8ee";
    g.font = "bold 28px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 128, 34);
    var tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(3.2, 0.8, 1);
    return sprite;
  }
  function paintFloorTexture() {
    var px = 8;
    var c = document.createElement("canvas");
    c.width = MAP_W * px;
    c.height = MAP_H * px;
    var g = c.getContext("2d");
    var z, x, ch, room, col, sx, sy;
    for (z = 0; z < MAP_H; z++) {
      for (x = 0; x < MAP_W; x++) {
        ch = grid[z][x];
        sx = x * px;
        sy = z * px;
        if (ch === "#" || ch === ".") {
          g.fillStyle = ch === "#" ? "#241812" : "#8ec6ea";
          g.fillRect(sx, sy, px, px);
          if (ch === "#") {
            g.fillStyle = "#5a4336";
            g.fillRect(sx + 1, sy + 1, px - 2, px - 3);
            g.fillStyle = "#120c0a";
            g.fillRect(sx, sy, px, 1);
            g.fillRect(sx, sy, 1, px);
          }
        } else {
          room = byCh[ch];
          col = room ? "#" + room.floor : "#d7c4a3";
          g.fillStyle = col;
          g.fillRect(sx, sy, px, px);
          g.fillStyle = "rgba(0,0,0,0.18)";
          g.fillRect(sx, sy, px, 1);
          g.fillRect(sx, sy, 1, px);
          g.fillStyle = "rgba(255,255,255,0.25)";
          g.fillRect(sx + 2, sy + 2, 2, 2);
        }
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  function buildScene() {
    var canvas = el("wardCanvas");
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false });
    renderer.setClearColor(0x87b8d8, 1);
    renderer.setPixelRatio(1);
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 80);
    scene.add(new THREE.AmbientLight(0xfff6e8, 0.85));
    var sun = new THREE.DirectionalLight(0xffffff, 0.65);
    sun.position.set(6, 14, 8);
    scene.add(sun);

    var floor = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W, MAP_H), new THREE.MeshBasicMaterial({ map: paintFloorTexture() }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(MAP_W / 2, 0, MAP_H / 2);
    scene.add(floor);

    var wallCells = [];
    var z, x;
    for (z = 0; z < MAP_H; z++) {
      for (x = 0; x < MAP_W; x++) {
        if (grid[z][x] !== "#") continue;
        if (walkable(x + 1, z) || walkable(x - 1, z) || walkable(x, z + 1) || walkable(x, z - 1)) wallCells.push([x, z]);
      }
    }
    var wallGeo = new THREE.BoxGeometry(1, 0.85, 1);
    var walls = new THREE.InstancedMesh(wallGeo, mat(0x3b2a22), wallCells.length || 1);
    var edge = new THREE.InstancedMesh(new THREE.BoxGeometry(1.06, 0.9, 1.06), mat(0x120c0a), wallCells.length || 1);
    var dummy = new THREE.Object3D();
    wallCells.forEach(function (p, i) {
      dummy.position.set(p[0] + 0.5, 0.42, p[1] + 0.5);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      edge.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.48;
      dummy.scale.set(0.86, 0.7, 0.86);
      dummy.updateMatrix();
      walls.setMatrixAt(i, dummy.matrix);
    });
    walls.instanceMatrix.needsUpdate = true;
    edge.instanceMatrix.needsUpdate = true;
    scene.add(edge);
    scene.add(walls);

    PACK.rooms.forEach(function (room) {
      var cells = [];
      for (z = 0; z < MAP_H; z++) {
        for (x = 0; x < MAP_W; x++) if (grid[z][x] === room.ch) cells.push([x, z]);
      }
      if (!cells.length || room.kind === "hall") return;
      var cx = 0, cz = 0;
      cells.forEach(function (p) { cx += p[0]; cz += p[1]; });
      var sprite = labelSprite(room.name);
      sprite.position.set(cx / cells.length + 0.5, 1.7, cz / cells.length + 0.5);
      scene.add(sprite);
    });

    Object.keys(PACK.beds).forEach(function (id) {
      PACK.beds[id].forEach(function (p) {
        addBox(scene, 0.72, 0.22, 0.95, 0xf7f1e4, p[0] + 0.5, 0.16, p[1] + 0.5);
        addBox(scene, 0.62, 0.1, 0.7, 0x6cb5d6, p[0] + 0.5, 0.3, p[1] + 0.5);
        addBox(scene, 0.28, 0.1, 0.22, 0xfff8ee, p[0] + 0.5, 0.38, p[1] + 0.28);
      });
    });

    addBox(scene, 0.55, 0.42, 0.4, 0x223044, MARK.computer.x + 0.5, 0.35, MARK.computer.z + 0.5);
    addBox(scene, 0.42, 0.28, 0.06, 0x8fd0ff, MARK.computer.x + 0.5, 0.62, MARK.computer.z + 0.32);
    addBox(scene, 0.5, 0.28, 0.36, 0x4d5966, MARK.fax.x + 0.5, 0.28, MARK.fax.z + 0.5);
    addBox(scene, 0.28, 0.05, 0.2, 0xf4f7fb, MARK.fax.x + 0.5, 0.46, MARK.fax.z + 0.32);

    trolleyMesh = new THREE.Group();
    addBox(trolleyMesh, 0.72, 0.28, 0.48, 0xd6453d, 0, 0.36, 0);
    addBox(trolleyMesh, 0.78, 0.08, 0.54, 0x1a1a1a, 0, 0.2, 0);
    addBox(trolleyMesh, 0.16, 0.16, 0.16, 0xf6e27a, 0, 0.52, 0);
    scene.add(trolleyMesh);

    incidentMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), mat(0xe23b32));
    incidentMesh.position.set(MARK.incident.x + 0.5, 0.05, MARK.incident.z + 0.5);
    incidentMesh.visible = false;
    scene.add(incidentMesh);

    playerMesh = new THREE.Group();
    addBox(playerMesh, 0.62, 0.72, 0.46, 0x111111, 0, 0.62, 0);
    addBox(playerMesh, 0.48, 0.56, 0.34, 0x3c6ec4, 0, 0.66, 0);
    addBox(playerMesh, 0.36, 0.28, 0.28, 0xf2c7a0, 0, 1.02, 0.08);
    addBox(playerMesh, 0.4, 0.12, 0.32, 0x1a1a1a, 0, 1.18, 0.04);
    legL = addBox(playerMesh, 0.16, 0.28, 0.16, 0x1d3557, -0.14, 0.2, 0);
    legR = addBox(playerMesh, 0.16, 0.28, 0.16, 0x1d3557, 0.14, 0.2, 0);
    playerMesh.scale.set(1.45, 1.45, 1.45);
    scene.add(playerMesh);
    built = true;
  }

  function drawMinimap() {
    var map = el("wardMinimap");
    if (!map) return;
    var ctx = map.getContext("2d");
    var w = map.width;
    var h = map.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#142028";
    ctx.fillRect(0, 0, w, h);
    var span = 22;
    var scale = (w - 8) / span;
    var ox = w / 2 - (player.x + 0.5) * scale;
    var oy = h / 2 - (player.z + 0.5) * scale;
    var x0 = Math.max(0, player.x - 12);
    var x1 = Math.min(MAP_W - 1, player.x + 12);
    var z0 = Math.max(0, player.z - 12);
    var z1 = Math.min(MAP_H - 1, player.z + 12);
    var z, x, ch, room;
    for (z = z0; z <= z1; z++) {
      for (x = x0; x <= x1; x++) {
        ch = grid[z][x];
        if (ch === ".") continue;
        if (ch === "#") ctx.fillStyle = "#1a120e";
        else {
          room = byCh[ch];
          ctx.fillStyle = room ? "#" + room.floor : "#d7c4a3";
        }
        ctx.fillRect(ox + x * scale, oy + z * scale, Math.ceil(scale), Math.ceil(scale));
      }
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#f0d48a";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(facing * Math.PI / 2);
    ctx.fillStyle = "#ffe14a";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-7, -6);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBigMap() {
    var map = el("wardMapBig");
    if (!map) return;
    var ctx = map.getContext("2d");
    var w = map.width;
    var h = map.height;
    ctx.fillStyle = "#102028";
    ctx.fillRect(0, 0, w, h);
    var scale = Math.min((w - 16) / MAP_W, (h - 16) / MAP_H);
    var ox = (w - MAP_W * scale) / 2;
    var oy = (h - MAP_H * scale) / 2;
    var z, x, ch, room;
    for (z = 0; z < MAP_H; z++) {
      for (x = 0; x < MAP_W; x++) {
        ch = grid[z][x];
        if (ch === ".") continue;
        if (ch === "#") ctx.fillStyle = "#2a211c";
        else {
          room = byCh[ch];
          ctx.fillStyle = room ? "#" + room.floor : "#d7c4a3";
        }
        ctx.fillRect(ox + x * scale, oy + z * scale, Math.ceil(scale) + 0.2, Math.ceil(scale) + 0.2);
      }
    }
    ctx.fillStyle = "#142226";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    PACK.rooms.forEach(function (room) {
      if (room.kind === "hall") return;
      var n = 0, sx = 0, sz = 0;
      for (z = 0; z < MAP_H; z++) {
        for (x = 0; x < MAP_W; x++) if (grid[z][x] === room.ch) { n++; sx += x; sz += z; }
      }
      if (!n) return;
      ctx.fillText(room.name, ox + (sx / n + 0.5) * scale, oy + (sz / n + 0.5) * scale);
    });
    ctx.fillStyle = "#e23b32";
    ctx.beginPath();
    ctx.arc(ox + (player.x + 0.5) * scale, oy + (player.z + 0.5) * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!active) return;
    clock = ts || 0;
    if (!paused && (keys.up || keys.down || keys.left || keys.right)) {
      if (battle && battle.phase === "ask") {
        if (keys.up || keys.left) battle.cursor = (battle.cursor + 3) % 4;
        else battle.cursor = (battle.cursor + 1) % 4;
        keys.up = keys.down = keys.left = keys.right = false;
        renderBattle();
      } else {
        keyTimer += 16;
        if (keyTimer >= MOVE_MS) {
          keyTimer = 0;
          if (keys.up) tryMove(0, -1);
          else if (keys.down) tryMove(0, 1);
          else if (keys.left) tryMove(-1, 0);
          else if (keys.right) tryMove(1, 0);
        }
      }
    }
    if (playerMesh) {
      var bob = stepFrame ? 0.04 : 0;
      playerMesh.position.set(player.x + 0.5, bob, player.z + 0.5);
      playerMesh.rotation.y = [Math.PI / 2, 0, -Math.PI / 2, Math.PI][facing];
      if (legL && legR) {
        var swing = stepFrame ? 0.12 : -0.12;
        legL.position.z = swing;
        legR.position.z = -swing;
      }
    }
    if (trolleyMesh) trolleyMesh.position.set(trolley.x + 0.5, 0, trolley.z + 0.5);
    if (incidentMesh) incidentMesh.visible = quest === "code" && (step === "push" || step === "goTrolley");
    if (camera && renderer) {
      var aspect = Math.max(0.4, (renderer.domElement.clientWidth || 1) / Math.max(1, renderer.domElement.clientHeight || 1));
      var view = 8.2;
      camera.left = -view * aspect;
      camera.right = view * aspect;
      camera.top = view;
      camera.bottom = -view;
      camera.updateProjectionMatrix();
      camera.position.set(player.x + 0.5 + 6, 12, player.z + 0.5 + 8);
      camera.lookAt(player.x + 0.5, 0, player.z + 0.5);
      renderer.render(scene, camera);
    }
    drawMinimap();
  }

  function onResize() {
    var canvas = el("wardCanvas");
    var wrap = canvas && canvas.parentElement;
    if (!wrap || !renderer) return;
    var w = wrap.clientWidth || 300;
    var h = wrap.clientHeight || 200;
    renderer.setSize(w, h, false);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  }
  function resetPlay() {
    player.x = MARK.start.x;
    player.z = MARK.start.z;
    facing = 2;
    trolley.x = MARK.trolley.x;
    trolley.z = MARK.trolley.z;
    pushing = false;
    quest = "";
    step = "idle";
    stepsWalked = 0;
    seen = { code: false, admit: false, rest: false };
    dialog = null;
    battle = null;
    menuOpen = false;
    mapOpen = false;
    triggeredPush = false;
    stepFrame = 0;
    show("wardDialog", false);
    show("wardBattle", false);
    show("wardMenu", false);
    show("wardMapOverlay", false);
    if (incidentMesh) incidentMesh.visible = false;
    setQuestLabel();
  }
  function bind() {
    document.querySelectorAll(".ward-pad").forEach(function (btn) {
      function press(ev) {
        if (ev.cancelable) ev.preventDefault();
        keys[btn.getAttribute("data-k")] = true;
        keyTimer = MOVE_MS;
      }
      function release() { keys[btn.getAttribute("data-k")] = false; }
      btn.addEventListener("pointerdown", press);
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointerleave", release);
      btn.addEventListener("pointercancel", release);
    });
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
    if (mini) mini.addEventListener("click", function () { toggleMap(); });
    var overlay = el("wardMapOverlay");
    if (overlay) overlay.addEventListener("click", function () { if (mapOpen) toggleMap(); });
    window.addEventListener("keydown", function (e) {
      if (!active) return;
      var map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      if (map[e.key]) {
        e.preventDefault();
        if (paused || mapOpen) return;
        if (battle && battle.phase === "ask" && !e.repeat) {
          if (e.key === "ArrowUp" || e.key === "ArrowLeft") battle.cursor = (battle.cursor + 3) % 4;
          else battle.cursor = (battle.cursor + 1) % 4;
          renderBattle();
          return;
        }
        keys[map[e.key]] = true;
        if (e.repeat) return;
        keyTimer = 0;
        if (e.key === "ArrowUp") tryMove(0, -1);
        if (e.key === "ArrowDown") tryMove(0, 1);
        if (e.key === "ArrowLeft") tryMove(-1, 0);
        if (e.key === "ArrowRight") tryMove(1, 0);
        return;
      }
      var confirm = e.key === "z" || e.key === "Z" || e.key === "a" || e.key === "A" || e.key === "Enter";
      var cancel = e.key === "x" || e.key === "X" || e.key === "b" || e.key === "B" || e.key === "Escape";
      if (confirm) {
        e.preventDefault();
        if (!e.repeat) tryInteract();
      } else if (cancel) {
        e.preventDefault();
        if (!e.repeat) pressB();
      }
    }, true);
    window.addEventListener("keyup", function (e) {
      var map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      if (map[e.key]) keys[map[e.key]] = false;
    }, true);
    window.addEventListener("resize", onResize);
  }
  function start() {
    active = true;
    paused = false;
    if (!window.THREE) {
      el("wardQuestLabel").textContent = "Three.js 未載入。請同 game.html 一齊開啟 vendor/three.min.js。";
      return;
    }
    if (!built) {
      buildScene();
      bind();
    }
    resetPlay();
    if (!raf) raf = requestAnimationFrame(frame);
    requestAnimationFrame(function () {
      onResize();
      requestAnimationFrame(onResize);
    });
  }
  function stop() { active = false; keys = {}; }

  window.WardMode = {
    rooms: PACK.rooms,
    start: start,
    stop: stop,
    setPaused: function (on) { paused = !!on; },
    active: function () { return active; },
    state: function () {
      return {
        x: player.x, z: player.z, facing: facing, pushing: pushing,
        tx: trolley.x, tz: trolley.z, quest: quest, step: step,
        room: roomNameAt(player.x, player.z), dialog: !!dialog,
        battle: battle ? battle.phase : "", battleCursor: battle ? battle.cursor : -1,
        menu: menuOpen, map: mapOpen, steps: stepsWalked
      };
    },
    walkable: walkable,
    markers: function () { return MARK; },
    map: { w: MAP_W, h: MAP_H },
    audit: function () {
      var beds = {};
      PACK.rooms.forEach(function (r) {
        beds[r.id] = (PACK.beds[r.id] || []).length;
      });
      return { beds: beds, names: PACK.rooms.map(function (r) { return r.name; }) };
    }
  };
})();
