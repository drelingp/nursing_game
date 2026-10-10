/* 病房探索 — Pokemon-style ward sim. Room names live in WARD_ROOMS. */
(function () {
  "use strict";

  var TILE = 1;
  var MAP_W = 36;
  var MAP_H = 28;
  var MOVE_MS = 130;

  /* Compact Ward C. Same rooms and neighbours as the labeled plan, short doors. Edit names here. */
  var WARD_ROOMS = [
    { id: "livA", name: "活動區A", x: 8, z: 3, w: 8, h: 6, floor: 0xc6d48b, kind: "living" },
    { id: "stairTop", name: "樓梯", x: 2, z: 1, w: 6, h: 3, floor: 0xc8cdd4, kind: "stair" },
    { id: "b4", name: "病房四", x: 2, z: 4, w: 6, h: 4, floor: 0xf6dcc0, kind: "bed", beds: 6 },
    { id: "b5", name: "病房五", x: 2, z: 8, w: 6, h: 4, floor: 0xe7d0b8, kind: "bed", beds: 6 },
    { id: "b6", name: "病房六", x: 2, z: 12, w: 6, h: 4, floor: 0xf0d8c4, kind: "bed", beds: 6 },
    { id: "wc1", name: "廁所", x: 2, z: 16, w: 4, h: 3, floor: 0xb7d4e8, kind: "toilet" },
    { id: "b3", name: "病房三", x: 16, z: 1, w: 6, h: 4, floor: 0xedd0b4, kind: "bed", beds: 6 },
    { id: "b2", name: "病房二", x: 16, z: 5, w: 6, h: 4, floor: 0xf3d7b0, kind: "bed", beds: 6 },
    { id: "b1", name: "病房一", x: 16, z: 9, w: 6, h: 4, floor: 0xf0d2a8, kind: "bed", beds: 6 },
    { id: "bath", name: "浴室", x: 22, z: 1, w: 4, h: 3, floor: 0x8ec6ea, kind: "bath" },
    { id: "consult", name: "診症室", x: 22, z: 4, w: 4, h: 3, floor: 0xf7e7a1, kind: "consult" },
    { id: "visit", name: "探訪室", x: 26, z: 1, w: 4, h: 4, floor: 0xf2c6d0, kind: "visit" },
    { id: "wc4", name: "廁所", x: 22, z: 7, w: 4, h: 3, floor: 0xc5e0f0, kind: "toilet" },
    { id: "livB", name: "活動區B", x: 8, z: 9, w: 8, h: 5, floor: 0xd5e09a, kind: "living" },
    { id: "nurse", name: "護士站", x: 16, z: 13, w: 6, h: 4, floor: 0x9fd0c8, kind: "nurse" },
    { id: "treat", name: "治療室", x: 22, z: 13, w: 5, h: 4, floor: 0xf7c9c4, kind: "treat" },
    { id: "elev1", name: "升降機一", x: 27, z: 11, w: 4, h: 3, floor: 0xd5dde6, kind: "elev" },
    { id: "elev2", name: "升降機二", x: 27, z: 14, w: 4, h: 3, floor: 0xc9d3de, kind: "elev" },
    { id: "blue", name: "藍區", x: 31, z: 11, w: 3, h: 6, floor: 0x6aa6e8, kind: "blue" },
    { id: "single1", name: "單人房一", x: 8, z: 14, w: 4, h: 3, floor: 0xf7e2c4, kind: "single", beds: 1 },
    { id: "single2", name: "單人房二", x: 12, z: 14, w: 4, h: 3, floor: 0xf3dcc0, kind: "single", beds: 1 },
    { id: "therapy1", name: "治療活動室", x: 8, z: 17, w: 8, h: 3, floor: 0xe7d0f0, kind: "therapy" },
    { id: "wc2", name: "廁所", x: 16, z: 17, w: 3, h: 3, floor: 0xa9cfe6, kind: "toilet" },
    { id: "manager", name: "病房經理室", x: 19, z: 17, w: 5, h: 3, floor: 0xe4c89a, kind: "office" },
    { id: "wc3", name: "廁所", x: 24, z: 17, w: 3, h: 3, floor: 0xb9d7ea, kind: "toilet" },
    { id: "med", name: "藥房", x: 2, z: 20, w: 6, h: 3, floor: 0xf0e0a8, kind: "med" },
    { id: "livC", name: "活動區C", x: 8, z: 20, w: 8, h: 4, floor: 0xc9d992, kind: "living" },
    { id: "stairBot", name: "樓梯", x: 16, z: 20, w: 5, h: 4, floor: 0xbcc3cc, kind: "stair" },
    { id: "garden", name: "花園", x: 1, z: 23, w: 7, h: 4, floor: 0x8fce7a, kind: "garden" },
    { id: "therapy2", name: "治療活動室", x: 8, z: 24, w: 8, h: 3, floor: 0xdcc6ee, kind: "therapy" }
  ];

  var MARK = {
    trolley: { x: 24, z: 14 },
    fax: { x: 18, z: 14 },
    computer: { x: 20, z: 14 },
    incident: { x: 12, z: 11 },
    elev: { x: 28, z: 12 },
    admitBed: { x: 18, z: 2 },
    restBed: { x: 18, z: 6 },
    start: { x: 11, z: 11 }
  };

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

  var DIRS = [
    { x: 1, z: 0 },
    { x: 0, z: 1 },
    { x: -1, z: 0 },
    { x: 0, z: -1 }
  ];

  var walk = [];
  var owner = [];
  var roomById = {};
  var player = { x: MARK.start.x, z: MARK.start.z };
  var mapOpen = false;
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
  var raf = 0;
  var renderer, scene, camera, playerMesh, trolleyMesh, incidentMesh;
  var clock = 0;
  var triggeredPush = false;

  WARD_ROOMS.forEach(function (r) { roomById[r.id] = r; });

  function inMap(x, z) {
    return x >= 0 && z >= 0 && x < MAP_W && z < MAP_H;
  }

  function paint(x, z, id) {
    if (!inMap(x, z)) return;
    walk[z][x] = 1;
    owner[z][x] = id;
  }

  function paintRect(room) {
    var x, z;
    for (z = room.z; z < room.z + room.h; z++) {
      for (x = room.x; x < room.x + room.w; x++) paint(x, z, room.id);
    }
    (room.door || []).forEach(function (d) { paint(d[0], d[1], room.id); });
  }

  function buildGrid() {
    var z, x;
    walk = [];
    owner = [];
    for (z = 0; z < MAP_H; z++) {
      walk[z] = [];
      owner[z] = [];
      for (x = 0; x < MAP_W; x++) {
        walk[z][x] = 0;
        owner[z][x] = "";
      }
    }
    WARD_ROOMS.forEach(paintRect);
    sealDoors();
  }

  function sealDoors() {
    var edges = {};
    var ids = WARD_ROOMS.map(function (r) { return r.id; });
    var nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    function roomCells(id) {
      var room = roomById[id];
      var out = [];
      var zz, xx;
      for (zz = room.z; zz < room.z + room.h; zz++) {
        for (xx = room.x; xx < room.x + room.w; xx++) out.push([xx, zz]);
      }
      return out;
    }
    var ai, bi, a, b, key, cellsA, setB, i, k, x, z, dx, dz;
    for (ai = 0; ai < ids.length; ai++) {
      for (bi = ai + 1; bi < ids.length; bi++) {
        a = ids[ai];
        b = ids[bi];
        key = a + "|" + b;
        cellsA = roomCells(a);
        setB = {};
        roomCells(b).forEach(function (p) { setB[p[0] + "," + p[1]] = 1; });
        for (i = 0; i < cellsA.length; i++) {
          x = cellsA[i][0];
          z = cellsA[i][1];
          for (k = 0; k < 4; k++) {
            dx = nbs[k][0];
            dz = nbs[k][1];
            if (setB[(x + dx) + "," + (z + dz)]) {
              if (!edges[key]) edges[key] = [];
              edges[key].push([x, z, x + dx, z + dz]);
            }
          }
        }
      }
    }
    var protect = {};
    Object.keys(edges).forEach(function (ek) {
      var lst = edges[ek];
      lst.sort(function (p, q) {
        return p[0] - q[0] || p[1] - q[1] || p[2] - q[2] || p[3] - q[3];
      });
      var mid = lst[Math.floor(lst.length / 2)];
      var ix = mid[0] - mid[2];
      var iz = mid[1] - mid[3];
      [[mid[0], mid[1]], [mid[2], mid[3]], [mid[0] + ix, mid[1] + iz], [mid[2] - ix, mid[3] - iz]].forEach(function (p) {
        protect[p[0] + "," + p[1]] = 1;
      });
    });
    Object.keys(edges).forEach(function (ek) {
      edges[ek].forEach(function (e) {
        if (protect[e[0] + "," + e[1]]) return;
        if (!inMap(e[0], e[1])) return;
        walk[e[1]][e[0]] = 0;
        owner[e[1]][e[0]] = "";
      });
    });
  }

  function walkable(x, z) {
    return inMap(x, z) && walk[z][x] === 1;
  }

  function roomNameAt(x, z) {
    if (!inMap(x, z)) return "牆";
    var id = owner[z][x];
    var room = roomById[id];
    if (!room) return "C座";
    if (room.kind === "hall") return "C座走廊";
    return room.name;
  }

  function near(ax, az, bx, bz) {
    return Math.abs(ax - bx) + Math.abs(az - bz) <= 1;
  }

  function faceOf(dx, dz) {
    if (dx > 0) return 0;
    if (dz > 0) return 1;
    if (dx < 0) return 2;
    return 3;
  }

  function frontOf(x, z, face) {
    return { x: x + DIRS[face].x, z: z + DIRS[face].z };
  }

  function el(id) { return document.getElementById(id); }

  function show(id, on) {
    var node = el(id);
    if (node) node.classList.toggle("hidden", !on);
  }

  function setQuestLabel() {
    var text = "W／↑ 上，A／← 左，S／↓ 下，D／→ 右。A 互動，B 任務。唔使密碼。";
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
    if (battle.phase === "explain") {
      confirmChoice();
      return;
    }
    battle.cursor = 0;
    el("battleText").textContent = battle.qs[battle.i].q + "（已取消選擇，撳 A 先確認。）";
    renderBattle();
    el("battleText").textContent = battle.qs[battle.i].q + "（已取消選擇，撳 A 先確認。）";
  }

  function onBattleDone() {
    if (quest === "code") {
      pushing = false;
      step = "goFax";
      say(["情況暫時穩定（虛構）。而家去護士站，用傳真機影印藥紙，再準備文件。"], function () {
        setQuestLabel();
      });
    } else if (quest === "admit") {
      step = "goBed";
      say(["身份同安檢問答完。去病房三，撳 A 安排呢位虛構病人上床。"], function () {
        setQuestLabel();
      });
    } else if (quest === "rest") {
      step = "goNurse";
      say(["問答完。去護士站撳 A，記錄約束原因、時間同循環檢查。"], function () {
        setQuestLabel();
      });
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
    say([
      "突然：走廊有人呼叫！虛構病人「陳先生」情況危急。",
      "先去治療室，撳 A 攞急救車，推返事發位置（地面紅點）。",
      "本遊戲只供訓練用途，實際工作請依照部門指引。"
    ], function () {
      step = "goTrolley";
      setQuestLabel();
    });
  }

  function beginAdmit() {
    quest = "admit";
    step = "intro";
    seen.admit = true;
    say([
      "收症：虛構病人「林先生」同護送喺升降機一等候。",
      "先去升降機一，撳 A 核對身份，再答收症問題，最後去病房三安排床位。"
    ], function () {
      step = "goElev";
      setQuestLabel();
    });
  }

  function beginRest() {
    quest = "rest";
    step = "intro";
    seen.rest = true;
    say([
      "病房二：虛構病人躁動，同事想即刻綁起嚟。",
      "去病房二撳 A。約束唔係懲罰，跟指引先評估再答題，之後返護士站記錄。"
    ], function () {
      step = "goRoom";
      setQuestLabel();
    });
  }

  function onStepLanded() {
    if (quest === "code" && step === "push" && !triggeredPush && trolley.x === MARK.incident.x && trolley.z === MARK.incident.z) {
      triggeredPush = true;
      step = "battle";
      say(["急救車趕到事發位置。進入急救認識。"], function () {
        openBattle("急救認識", CODE_QS);
      });
      return;
    }
    if (quest) return;
    stepsWalked += 1;
    if (!seen.code && stepsWalked >= 6) {
      beginCode();
      return;
    }
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
    setQuestLabel();
    onStepLanded();
  }

  function tryInteract() {
    if (!active || paused || menuOpen) return;
    if (battle) {
      confirmChoice();
      return;
    }
    if (dialog) {
      advanceDialog();
      return;
    }
    if (quest === "code" && step === "goTrolley" && near(player.x, player.z, trolley.x, trolley.z) && !pushing) {
      var swing = frontOf(player.x, player.z, facing);
      if (!walkable(swing.x, swing.z)) {
        say(["呢邊推唔到，轉個方向先再撳 A。"]);
        return;
      }
      pushing = true;
      trolley.x = swing.x;
      trolley.z = swing.z;
      step = "push";
      if (incidentMesh) incidentMesh.visible = true;
      say(["你推住急救車。行去走廊紅色事發點。"], function () { setQuestLabel(); });
      return;
    }
    if (quest === "code" && step === "goFax" && near(player.x, player.z, MARK.fax.x, MARK.fax.z)) {
      step = "docs";
      say(["傳真機影印藥紙（虛構）。核對病人身份同藥單。"], function () { setQuestLabel(); });
      return;
    }
    if (quest === "code" && step === "docs" && near(player.x, player.z, MARK.fax.x, MARK.fax.z)) {
      say(["文件備好：時間、做過嘅事、邊個在場。今次急救事件完結。分數只係學習回饋。"], function () {
        clearQuest();
      });
      return;
    }
    if (quest === "admit" && step === "goElev" && near(player.x, player.z, MARK.elev.x, MARK.elev.z)) {
      step = "battle";
      say(["核對「林先生」身份同護送文件（虛構）。接着答收症問題。"], function () {
        openBattle("收症", ADMIT_QS);
      });
      return;
    }
    if (quest === "admit" && step === "goBed" && near(player.x, player.z, MARK.admitBed.x, MARK.admitBed.z)) {
      say(["已安排虛構病人去病房三。收症流程完結。實際床位跟當更。"], function () { clearQuest(); });
      return;
    }
    if (quest === "rest" && step === "goRoom" && near(player.x, player.z, MARK.restBed.x, MARK.restBed.z)) {
      step = "battle";
      say(["先確保安全，唔好當懲罰。接着答約束問題。"], function () {
        openBattle("約束", REST_QS);
      });
      return;
    }
    if (quest === "rest" && step === "goNurse" && near(player.x, player.z, MARK.fax.x, MARK.fax.z)) {
      say(["已喺護士站記錄約束原因、時間同循環檢查（虛構）。事件完結。"], function () { clearQuest(); });
      return;
    }
    var here = roomNameAt(player.x, player.z);
    say([here + "。撳 B 可以睇任務目標。"]);
  }

  function toggleMap() {
    mapOpen = !mapOpen;
    show("wardMapOverlay", mapOpen);
    if (mapOpen) drawBigMap();
    setQuestLabel();
  }

  function pressB() {
    if (!active || paused) return;
    if (mapOpen) {
      mapOpen = false;
      show("wardMapOverlay", false);
      setQuestLabel();
      return;
    }
    if (battle) {
      backChoice();
      return;
    }
    if (dialog) {
      advanceDialog();
      return;
    }
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

  function labelSprite(text, color) {
    var c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    var g = c.getContext("2d");
    g.fillStyle = "rgba(12, 40, 48, 0.78)";
    g.fillRect(8, 8, 496, 80);
    g.strokeStyle = color || "#f6e27a";
    g.lineWidth = 6;
    g.strokeRect(8, 8, 496, 80);
    g.fillStyle = "#fff8ee";
    g.font = "bold 42px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 50);
    var tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(3.4, 0.64, 1);
    return sprite;
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

    var floors = new THREE.Group();
    scene.add(floors);
    WARD_ROOMS.forEach(function (room) {
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(room.w * TILE, 0.18, room.h * TILE), mat(room.floor));
      mesh.position.set(room.x + room.w / 2, -0.09, room.z + room.h / 2);
      floors.add(mesh);
      (room.door || []).forEach(function (d) {
        var plate = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.18, 0.96), mat(room.floor));
        plate.position.set(d[0] + 0.5, -0.09, d[1] + 0.5);
        floors.add(plate);
      });
      var tag = labelSprite(room.name, room.kind === "blue" ? "#9fd0ff" : "#f6e27a");
      tag.position.set(room.x + room.w / 2, 1.55, room.z + room.h / 2);
      tag.scale.set(Math.min(2.8, room.w * 0.7), 0.5, 1);
      scene.add(tag);
      if (room.kind === "bed") addBeds(room, room.beds || 6);
      if (room.kind === "single") addBeds(room, 1);
      if (room.kind === "nurse") addNurse(room);
      if (room.kind === "treat") addTreat(room);
      if (room.kind === "elev") addElev(room);
      if (room.kind === "blue") addBlue(room);
      if (room.kind === "stair") addStair(room);
      if (room.kind === "living") addLiving(room);
      if (room.kind === "toilet") addToilet(room);
      if (room.kind === "bath") addBath(room);
      if (room.kind === "consult" || room.kind === "office") addDesk(room);
      if (room.kind === "visit") addVisit(room);
      if (room.kind === "therapy") addTherapy(room);
      if (room.kind === "med") addMed(room);
      if (room.kind === "garden") addGarden(room);
    });

    var spots = [];
    var z, x, i, nx, nz, nearWall;
    var nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (z = 0; z < MAP_H; z++) {
      for (x = 0; x < MAP_W; x++) {
        if (walk[z][x]) continue;
        nearWall = false;
        for (i = 0; i < 4; i++) {
          nx = x + nbs[i][0];
          nz = z + nbs[i][1];
          if (walkable(nx, nz)) nearWall = true;
        }
        if (nearWall) spots.push([x, z]);
      }
    }
    var wallGeo = new THREE.BoxGeometry(0.98, 1.15, 0.98);
    var walls = new THREE.InstancedMesh(wallGeo, mat(0xf4efe2), spots.length);
    var dummy = new THREE.Object3D();
    spots.forEach(function (s, idx) {
      dummy.position.set(s[0] + 0.5, 0.57, s[1] + 0.5);
      dummy.updateMatrix();
      walls.setMatrixAt(idx, dummy.matrix);
    });
    walls.instanceMatrix.needsUpdate = true;
    scene.add(walls);

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
    incidentMesh.position.set(MARK.incident.x + 0.5, 0.08, MARK.incident.z + 0.5);
    incidentMesh.visible = false;
    scene.add(incidentMesh);
    built = true;
  }

  function addBeds(room, count) {
    var cols = count === 1 ? 1 : 3;
    var i, col, row, x, z;
    for (i = 0; i < count; i++) {
      col = i % cols;
      row = Math.floor(i / cols);
      x = cols === 1 ? room.x + room.w / 2 : room.x + 1.15 + col * ((room.w - 2.3) / 2);
      z = room.z + 1.2 + row * 1.45;
      addBox(scene, 0.58, 0.16, 0.9, 0xf7f1e4, x, 0.2, z);
      var blanket = addBox(scene, 0.46, 0.08, 0.68, 0x6cb5d6, x, 0.32, z);
      blanket.userData.kind = "bed";
      blanket.userData.room = room.id;
      addBox(scene, 0.24, 0.07, 0.18, 0xfff8ee, x, 0.38, z - 0.28);
    }
  }
  function addNurse(room) {
    addBox(scene, room.w * 0.72, 0.55, 0.7, 0xefe6d4, room.x + room.w * 0.48, 0.35, room.z + 1.15);
    addBox(scene, 0.42, 0.22, 0.32, 0x2c3440, MARK.computer.x + 0.5, 0.55, MARK.computer.z + 0.5);
    addBox(scene, 0.4, 0.28, 0.08, 0x8fd0ff, MARK.computer.x + 0.5, 0.82, MARK.computer.z + 0.35);
    addBox(scene, 0.48, 0.26, 0.36, 0x4d5966, MARK.fax.x + 0.5, 0.5, MARK.fax.z + 0.5);
    addBox(scene, 0.26, 0.05, 0.18, 0xf4f7fb, MARK.fax.x + 0.5, 0.68, MARK.fax.z + 0.32);
  }
  function addTreat(room) {
    addBox(scene, 0.7, 0.7, 0.55, 0xf4f7fb, room.x + 1.3, 0.4, room.z + 1.4);
    addBox(scene, 0.18, 0.35, 0.08, 0xd6453d, room.x + 1.3, 0.9, room.z + 1.4);
  }
  function addElev(room) {
    addBox(scene, room.w * 0.62, 0.9, 0.16, 0xb7c3cf, room.x + room.w / 2, 0.5, room.z + 0.45);
    addBox(scene, 0.1, 0.35, 0.1, 0xf0d050, room.x + room.w / 2, 0.55, room.z + 0.7);
  }
  function addBlue(room) {
    addBox(scene, 1.1, 0.28, 0.4, 0x2a4f86, room.x + room.w / 2, 0.2, room.z + 1.2);
    addBox(scene, 1.1, 0.28, 0.4, 0x2a4f86, room.x + room.w / 2, 0.2, room.z + room.h - 1.2);
  }
  function addStair(room) {
    var i, n = Math.min(4, room.h);
    for (i = 0; i < n; i++) {
      addBox(scene, room.w * 0.62, 0.14, 0.45, 0x9aa3ad, room.x + room.w / 2, 0.1 + i * 0.14, room.z + 0.6 + i * 0.55);
    }
  }
  function addLiving(room) {
    addBox(scene, 1.1, 0.18, 0.6, 0xc48a4a, room.x + room.w / 2, 0.16, room.z + room.h / 2);
  }
  function addToilet(room) {
    addBox(scene, 0.4, 0.35, 0.45, 0xf7f7f7, room.x + room.w / 2, 0.22, room.z + room.h / 2);
  }
  function addBath(room) {
    addBox(scene, 1.1, 0.28, 0.6, 0xd7eef8, room.x + room.w / 2, 0.2, room.z + 1.3);
  }
  function addDesk(room) {
    addBox(scene, 0.9, 0.4, 0.5, 0x8a5a32, room.x + room.w / 2, 0.28, room.z + 1.2);
  }
  function addVisit(room) {
    addBox(scene, 0.4, 0.4, 0.4, 0xc47b8a, room.x + 1.1, 0.25, room.z + 1.4);
    addBox(scene, 0.4, 0.4, 0.4, 0xc47b8a, room.x + room.w - 1.1, 0.25, room.z + 1.4);
  }
  function addTherapy(room) {
    addBox(scene, 1.2, 0.1, 0.8, 0xf2d2f6, room.x + room.w / 2, 0.12, room.z + room.h / 2);
  }
  function addMed(room) {
    addBox(scene, 0.35, 0.7, 0.8, 0xf7f1e4, room.x + 1, 0.4, room.z + 1.2);
    addBox(scene, 0.35, 0.7, 0.8, 0xe7d7b0, room.x + room.w - 1, 0.4, room.z + 1.2);
  }
  function addGarden(room) {
    addBox(scene, 0.6, 0.45, 0.6, 0x3d8f4a, room.x + 1.5, 0.28, room.z + 1.4);
    addBox(scene, 0.5, 0.35, 0.5, 0x2f7a3a, room.x + room.w - 1.6, 0.22, room.z + room.h - 1.3);
  }

  function hexColor(n) {
    return "#" + n.toString(16).padStart(6, "0");
  }

  function paintWardMap(ctx, w, h, labels) {
    var pad = labels ? 28 : 10;
    var scale = Math.min((w - pad * 2) / MAP_W, (h - pad * 2) / MAP_H);
    var ox = (w - MAP_W * scale) / 2;
    var oy = (h - MAP_H * scale) / 2;
    ctx.fillStyle = "#10242c";
    ctx.fillRect(0, 0, w, h);
    var z, x, id, room;
    for (z = 0; z < MAP_H; z++) {
      for (x = 0; x < MAP_W; x++) {
        if (!walk[z] || !walk[z][x]) continue;
        id = owner[z][x];
        room = roomById[id];
        ctx.fillStyle = room ? hexColor(room.floor) : "#d7c4a3";
        ctx.fillRect(ox + x * scale, oy + z * scale, scale + 0.4, scale + 0.4);
      }
    }
    if (labels) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold " + Math.max(9, Math.floor(scale * 1.15)) + "px PingFang TC, Microsoft JhengHei, Noto Sans TC, sans-serif";
      WARD_ROOMS.forEach(function (r) {
        ctx.fillStyle = "#142226";
        ctx.fillText(r.name, ox + (r.x + r.w / 2) * scale, oy + (r.z + r.h / 2) * scale);
      });
    }
    ctx.fillStyle = "#e23b32";
    ctx.beginPath();
    ctx.arc(ox + (player.x + 0.5) * scale, oy + (player.z + 0.5) * scale, Math.max(3, scale * 0.42), 0, Math.PI * 2);
    ctx.fill();
    var face = DIRS[facing] || DIRS[0];
    ctx.strokeStyle = "#fff8ee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + (player.x + 0.5) * scale, oy + (player.z + 0.5) * scale);
    ctx.lineTo(ox + (player.x + 0.5 + face.x * 0.7) * scale, oy + (player.z + 0.5 + face.z * 0.7) * scale);
    ctx.stroke();
    if (pushing || quest === "code") {
      ctx.fillStyle = "#ffd15c";
      ctx.fillRect(ox + trolley.x * scale, oy + trolley.z * scale, Math.max(2, scale * 0.7), Math.max(2, scale * 0.7));
    }
  }

  function drawMinimap() {
    var map = el("wardMinimap");
    if (!map || !walk.length) return;
    var ctx = map.getContext("2d");
    var w = map.width;
    var h = map.height;
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    paintWardMap(ctx, w, h, false);
    ctx.restore();
    ctx.strokeStyle = "#f0d48a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawBigMap() {
    var map = el("wardMapBig");
    if (!map || !walk.length) return;
    var ctx = map.getContext("2d");
    paintWardMap(ctx, map.width, map.height, true);
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
      var bob = paused ? 0 : Math.sin(clock * 0.008) * 0.03;
      playerMesh.position.set(player.x + 0.5, bob, player.z + 0.5);
      playerMesh.rotation.y = [Math.PI / 2, 0, -Math.PI / 2, Math.PI][facing];
    }
    if (trolleyMesh) {
      trolleyMesh.position.set(trolley.x + 0.5, 0, trolley.z + 0.5);
      trolleyMesh.visible = true;
    }
    if (incidentMesh) incidentMesh.visible = quest === "code" && (step === "push" || step === "goTrolley");
    drawMinimap();
    if (camera && renderer && !glFailed) {
      try {
        var aspect = Math.max(0.4, (renderer.domElement.clientWidth || 1) / Math.max(1, renderer.domElement.clientHeight || 1));
        var view = 7.2;
        var halfW = view * aspect;
        var halfH = view;
        var cap = 10.5;
        if (halfW > cap) {
          halfH *= cap / halfW;
          halfW = cap;
        }
        camera.left = -halfW;
        camera.right = halfW;
        camera.top = halfH;
        camera.bottom = -halfH;
        camera.updateProjectionMatrix();
        camera.position.set(player.x + 0.5 + 7.5, 11, player.z + 0.5 + 7.5);
        camera.lookAt(player.x + 0.5, 0, player.z + 0.5);
        renderer.render(scene, camera);
      } catch (err) {
        glFailed = true;
        showGlError("立體畫面開唔到。請用 Chrome 雙擊 game.html。唔使密碼。");
      }
    }
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
    facing = 0;
    mapOpen = false;
    show("wardMapOverlay", false);
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
    triggeredPush = false;
    show("wardDialog", false);
    show("wardBattle", false);
    show("wardMenu", false);
    if (incidentMesh) incidentMesh.visible = false;
    setQuestLabel();
  }

  var glFailed = false;

  function showGlError(msg) {
    var node = el("wardFallback");
    if (!node) return;
    node.textContent = msg || "立體畫面開唔到。請用 Chrome 雙擊 game.html。唔使密碼。";
    node.classList.add("show");
  }

  function dirOfKey(e) {
    var code = e.code || "";
    if (code === "ArrowUp" || code === "KeyW") return "up";
    if (code === "ArrowDown" || code === "KeyS") return "down";
    if (code === "ArrowLeft" || code === "KeyA") return "left";
    if (code === "ArrowRight" || code === "KeyD") return "right";
    return "";
  }

  function stepKey(name) {
    if (name === "up") tryMove(0, -1);
    else if (name === "down") tryMove(0, 1);
    else if (name === "left") tryMove(-1, 0);
    else if (name === "right") tryMove(1, 0);
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
    if (mini) {
      mini.addEventListener("pointerdown", function (ev) {
        if (ev.cancelable) ev.preventDefault();
        toggleMap();
      });
    }
    var overlay = el("wardMapOverlay");
    if (overlay) {
      overlay.addEventListener("pointerdown", function () {
        if (mapOpen) toggleMap();
      });
    }
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
        if (e.repeat) return;
        keyTimer = 0;
        stepKey(dir);
        return;
      }
      var code = e.code || "";
      var confirm = code === "KeyZ" || code === "Enter" || code === "NumpadEnter";
      var cancel = code === "KeyX" || code === "KeyB" || code === "Escape";
      if (confirm) {
        e.preventDefault();
        if (!e.repeat) tryInteract();
      } else if (cancel) {
        e.preventDefault();
        if (!e.repeat) pressB();
      }
    }, true);
    window.addEventListener("keyup", function (e) {
      var dir = dirOfKey(e);
      if (dir) keys[dir] = false;
    }, true);
    window.addEventListener("resize", onResize);
  }

  function tileDistance(ax, az, bx, bz) {
    if (!walkable(ax, az) || !walkable(bx, bz)) return -1;
    var q = [[ax, az, 0]];
    var seenT = {};
    seenT[ax + "," + az] = 1;
    var i, cur, nx, nz, k;
    var nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (i = 0; i < q.length; i++) {
      cur = q[i];
      if (cur[0] === bx && cur[1] === bz) return cur[2];
      for (k = 0; k < 4; k++) {
        nx = cur[0] + nbs[k][0];
        nz = cur[1] + nbs[k][1];
        if (!walkable(nx, nz) || seenT[nx + "," + nz]) continue;
        seenT[nx + "," + nz] = 1;
        q.push([nx, nz, cur[2] + 1]);
      }
    }
    return -1;
  }

  function reachableRooms() {
    var seenR = {};
    var q = [[MARK.start.x, MARK.start.z]];
    var seenT = {};
    seenT[MARK.start.x + "," + MARK.start.z] = 1;
    var i, cur, nx, nz, k, id;
    var nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (i = 0; i < q.length; i++) {
      cur = q[i];
      id = owner[cur[1]][cur[0]];
      if (id) seenR[id] = 1;
      for (k = 0; k < 4; k++) {
        nx = cur[0] + nbs[k][0];
        nz = cur[1] + nbs[k][1];
        if (!walkable(nx, nz) || seenT[nx + "," + nz]) continue;
        seenT[nx + "," + nz] = 1;
        q.push([nx, nz]);
      }
    }
    return Object.keys(seenR);
  }

  function start() {
    active = true;
    paused = false;
    if (!window.THREE) {
      showGlError("Three.js 未載入。請同 game.html 一齊開啟 vendor/three.min.js。唔使密碼。");
      return;
    }
    if (!built) {
      try {
        buildGrid();
        buildScene();
        bind();
      } catch (err) {
        showGlError("立體畫面開唔到。請用 Chrome 雙擊 game.html。唔使密碼。");
        return;
      }
    }
    resetPlay();
    if (!raf) raf = requestAnimationFrame(frame);
    requestAnimationFrame(function () {
      onResize();
      requestAnimationFrame(onResize);
    });
  }

  function stop() {
    active = false;
    keys = {};
  }

  window.WardMode = {
    rooms: WARD_ROOMS,
    start: start,
    stop: stop,
    setPaused: function (on) { paused = !!on; },
    active: function () { return active; },
    state: function () {
      return {
        x: player.x,
        z: player.z,
        facing: facing,
        pushing: pushing,
        tx: trolley.x,
        tz: trolley.z,
        quest: quest,
        step: step,
        room: roomNameAt(player.x, player.z),
        dialog: !!dialog,
        battle: battle ? battle.phase : "",
        battleCursor: battle ? battle.cursor : -1,
        menu: menuOpen,
        map: mapOpen,
        steps: stepsWalked,
        camera: camera && camera.isOrthographicCamera ? "ortho" : ""
      };
    },
    walkable: walkable,
    distance: tileDistance,
    reachable: reachableRooms,
    audit: function () {
      var beds = {};
      if (scene) {
        scene.traverse(function (obj) {
          if (obj.userData && obj.userData.kind === "bed") {
            beds[obj.userData.room] = (beds[obj.userData.room] || 0) + 1;
          }
        });
      }
      return { beds: beds, rooms: WARD_ROOMS.map(function (r) { return r.id; }) };
    },
    markers: function () { return MARK; },
    map: { w: MAP_W, h: MAP_H }
  };
})();
