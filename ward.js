import * as THREE from "three";

(function () {
  "use strict";

  var SHELL = window.WARD_SHELL;
  if (!SHELL || !SHELL.layout || !Array.isArray(SHELL.rooms)) return;
  var LAY = SHELL.layout;
  var TILE = LAY.tile;
  var NAV = LAY.navTile || TILE;
  var CW = Math.ceil(LAY.cols * TILE / NAV);
  var CH = Math.ceil(LAY.rows * TILE / NAV);
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
  var roomPolygons = Object.create(null);
  var corridorPolygons = [];
  var wallSegments = [];
  var doorSegments = [];
  var wallSpots = [];
  var roomStat = {};
  var layoutProblems = [];
  var geometryProblems = [];

  function roomDoors(def) { return def && def.doors ? def.doors : []; }

  function polygonOf(def) {
    if (def.polygon) return def.polygon.map(function (point) { return [point[0] * TILE, point[1] * TILE]; });
    var rect = def.rect, angle = def.angle || 0;
    var centerX = (rect[0] + rect[2] / 2) * TILE;
    var centerZ = (rect[1] + rect[3] / 2) * TILE;
    var cos = Math.cos(angle), sin = Math.sin(angle);
    return [[0, 0], [rect[2], 0], [rect[2], rect[3]], [0, rect[3]]].map(function (point) {
      var x = (point[0] - rect[2] / 2) * TILE, z = (point[1] - rect[3] / 2) * TILE;
      return [centerX + x * cos + z * sin, centerZ - x * sin + z * cos];
    });
  }

  function insidePolygon(x, z, polygon) {
    var inside = false;
    for (var index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
      var a = polygon[index], b = polygon[previous];
      if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }

  function distanceToSegment(x, z, segment) {
    var dx = segment.b[0] - segment.a[0], dz = segment.b[1] - segment.a[1];
    var length = dx * dx + dz * dz;
    var fraction = length ? Math.max(0, Math.min(1, ((x - segment.a[0]) * dx + (z - segment.a[1]) * dz) / length)) : 0;
    var px = segment.a[0] + dx * fraction, pz = segment.a[1] + dz * fraction;
    return Math.hypot(x - px, z - pz);
  }

  function fillPolygon(polygon, id, overlaps) {
    var minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    polygon.forEach(function (point) {
      minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]);
      minZ = Math.min(minZ, point[1]); maxZ = Math.max(maxZ, point[1]);
    });
    for (var row = Math.max(0, Math.floor(minZ / NAV)); row <= Math.min(CH - 1, Math.floor(maxZ / NAV)); row++) {
      for (var col = Math.max(0, Math.floor(minX / NAV)); col <= Math.min(CW - 1, Math.floor(maxX / NAV)); col++) {
        var index = row * CW + col;
        if (!insidePolygon((col + 0.5) * NAV, (row + 0.5) * NAV, polygon)) continue;
        if (id >= 2 && tileRoom[index] >= 2 && tileRoom[index] !== id) {
          var names = [SHELL.rooms[tileRoom[index] - 2].id, SHELL.rooms[id - 2].id].sort();
          overlaps[names.join(" / ")] = true;
        }
        tileWalk[index] = 1;
        tileRoom[index] = id;
      }
    }
  }

  function buildRoomWalls(room, polygon) {
    var doors = roomDoors(LAY.rooms[room.id]);
    polygon.forEach(function (start, edge) {
      var end = polygon[(edge + 1) % polygon.length];
      var dx = end[0] - start[0], dz = end[1] - start[1];
      var length = Math.hypot(dx, dz), cuts = [];
      doors.filter(function (door) { return door.edge === edge; }).forEach(function (door) {
        var half = door.width * TILE / (2 * length);
        var from = door.at - half, to = door.at + half;
        if (from < 0 || to > 1 || from >= to) {
          geometryProblems.push(room.id + " 門口無效");
          return;
        }
        var opening = { room: room.id, a: [start[0] + dx * from, start[1] + dz * from],
          b: [start[0] + dx * to, start[1] + dz * to] };
        cuts.push({ from: from, to: to });
        doorSegments.push(opening);
      });
      cuts.sort(function (left, right) { return left.from - right.from; });
      var cursor = 0;
      cuts.concat([{ from: 1, to: 1 }]).forEach(function (cut) {
        if (cut.from < cursor) geometryProblems.push(room.id + " 門口重疊");
        if (cut.from > cursor) wallSegments.push({ room: room.id,
          a: [start[0] + dx * cursor, start[1] + dz * cursor],
          b: [start[0] + dx * cut.from, start[1] + dz * cut.from] });
        cursor = Math.max(cursor, cut.to);
      });
    });
    if (doors.length !== doorSegments.filter(function (door) { return door.room === room.id; }).length) {
      geometryProblems.push(room.id + " 門口未配置");
    }
  }

  function blockWall(segment) {
    var padding = NAV * 0.8;
    var minC = Math.max(0, Math.floor((Math.min(segment.a[0], segment.b[0]) - padding) / NAV));
    var maxC = Math.min(CW - 1, Math.floor((Math.max(segment.a[0], segment.b[0]) + padding) / NAV));
    var minR = Math.max(0, Math.floor((Math.min(segment.a[1], segment.b[1]) - padding) / NAV));
    var maxR = Math.min(CH - 1, Math.floor((Math.max(segment.a[1], segment.b[1]) + padding) / NAV));
    for (var row = minR; row <= maxR; row++) for (var col = minC; col <= maxC; col++) {
      if (distanceToSegment((col + 0.5) * NAV, (row + 0.5) * NAV, segment) <= padding) {
        tileWalk[row * CW + col] = 0;
        tileRoom[row * CW + col] = 0;
      }
    }
  }

  function buildLayout() {
    var overlaps = Object.create(null);
    LAY.corridors.forEach(function (def) {
      var polygon = polygonOf(def);
      corridorPolygons.push(polygon);
      fillPolygon(polygon, 1, overlaps);
    });
    SHELL.rooms.forEach(function (room) {
      var def = LAY.rooms[room.id];
      if (!def) { geometryProblems.push(room.id + " 冇配置"); return; }
      var polygon = polygonOf(def);
      roomPolygons[room.id] = polygon;
      fillPolygon(polygon, room.index, overlaps);
      buildRoomWalls(room, polygon);
    });
    Object.keys(overlaps).forEach(function (names) { geometryProblems.push(names + " 房間重疊"); });
    wallSegments.forEach(blockWall);
    collectWalls();
    auditLayout();
  }

  function collectWalls() {
    var nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    wallSpots = [];
    roomStat = {};
    SHELL.rooms.forEach(function (room) {
      roomStat[room.id] = { wall: wallSegments.filter(function (wall) { return wall.room === room.id; }).length,
        door: roomDoors(LAY.rooms[room.id]).length, n: 0 };
    });
    for (var row = 0; row < CH; row++) for (var col = 0; col < CW; col++) {
      var index = row * CW + col, id = tileRoom[index];
      if (tileWalk[index]) {
        if (id >= 2 && SHELL.rooms[id - 2]) roomStat[SHELL.rooms[id - 2].id].n++;
        continue;
      }
      var touchesCorridor = nbs.some(function (offset) {
        var x = col + offset[0], z = row + offset[1];
        return walkAt(x, z) && tileRoom[z * CW + x] === 1;
      });
      if (!touchesCorridor) continue;
      var x = (col + 0.5) * NAV, z = (row + 0.5) * NAV;
      if (!wallSegments.some(function (wall) { return distanceToSegment(x, z, wall) < NAV * 1.5; })) wallSpots.push([col, row]);
    }
  }

  function auditLayout() {
    var problems = geometryProblems.slice();
    var nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var start = cellAt(LAY.marks.start[0] * TILE, LAY.marks.start[1] * TILE);
    function flood(blocked) {
      var seen = new Uint8Array(CW * CH), queue = [];
      if (walkAt(start.c, start.r) && (!blocked || !blocked(start.c, start.r))) {
        seen[start.r * CW + start.c] = 1;
        queue.push(start.r * CW + start.c);
      }
      for (var index = 0; index < queue.length; index++) {
        var current = queue[index], col = current % CW, row = Math.floor(current / CW);
        nbs.forEach(function (offset) {
          var x = col + offset[0], z = row + offset[1], next = z * CW + x;
          if (!walkAt(x, z) || seen[next] || (blocked && blocked(x, z))) return;
          seen[next] = 1;
          queue.push(next);
        });
      }
      return seen;
    }
    var seen = flood(null), sealed = 0;
    for (var index = 0; index < tileWalk.length; index++) if (tileWalk[index] && !seen[index]) sealed++;
    if (sealed) problems.push(sealed + " 格行唔到");
    SHELL.rooms.forEach(function (room) {
      if (!roomStat[room.id] || !roomStat[room.id].n) problems.push(room.id + " 面積不正確");
    });
    doorSegments.forEach(function (door) {
      var dx = door.b[0] - door.a[0], dz = door.b[1] - door.a[1], length = Math.hypot(dx, dz);
      var x = (door.a[0] + door.b[0]) / 2, z = (door.a[1] + door.b[1]) / 2;
      var nx = -dz / length * 0.6, nz = dx / length * 0.6;
      if (!canStand(x + nx, z + nz) || !canStand(x - nx, z - nz)) problems.push(door.room + " 門口連接不正確");
    });
    var unmarked = Object.create(null);
    for (var row = 0; row < CH; row++) for (var col = 0; col < CW; col++) {
      var id = tileRoom[row * CW + col];
      if (!walkAt(col, row) || id < 2) continue;
      nbs.forEach(function (offset) {
        var nextCol = col + offset[0], nextRow = row + offset[1];
        if (!walkAt(nextCol, nextRow) || tileRoom[nextRow * CW + nextCol] === id) return;
        var name = SHELL.rooms[id - 2].id;
        var x = (col + 0.5 + offset[0] / 2) * NAV, z = (row + 0.5 + offset[1] / 2) * NAV;
        if (!doorSegments.some(function (door) { return door.room === name && distanceToSegment(x, z, door) < NAV; })) unmarked[name] = true;
      });
    }
    Object.keys(unmarked).forEach(function (name) { problems.push(name + " 有未標示出口"); });
    Object.keys(LAY.marks).forEach(function (name) {
      var mark = LAY.marks[name], x = mark[0] * TILE, z = mark[1] * TILE, cell = cellAt(x, z);
      if (!canStand(x, z) || !seen[cell.r * CW + cell.c]) problems.push(name + " 標記行唔到");
    });
    Object.keys(LAY.npcs).forEach(function (name) {
      var point = LAY.npcs[name], x = point[0] * TILE, z = point[1] * TILE, cell = cellAt(x, z);
      if (!canStand(x, z) || !seen[cell.r * CW + cell.c]) problems.push(name + " 角色位置行唔到");
    });
    var visit = roomById.vis1, lift = LAY.marks.lift;
    if (visit && lift) {
      var withoutVisit = flood(function (col, row) { return tileRoom[row * CW + col] === visit.index; });
      var liftCell = cellAt(lift[0] * TILE, lift[1] * TILE);
      if (withoutVisit[liftCell.r * CW + liftCell.c]) problems.push("升降機大堂直接連接病房");
    }
    layoutProblems = problems;
    if (problems.length) console.warn("ward layout 自檢: " + problems.join("; "));
  }

  function cellsOf(id) {
    var want = roomById[id] ? roomById[id].index : -1;
    var list = [];
    var r, c;
    for (r = 0; r < CH; r++) {
      for (c = 0; c < CW; c++) {
        if (tileWalk[r * CW + c] && tileRoom[r * CW + c] === want) {
          list.push({ c: c, r: r, x: (c + 0.5) * NAV, z: (r + 0.5) * NAV });
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
    MARK[key] = { x: t[0] * TILE, z: t[1] * TILE };
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
  var npcs = Object.create(null);

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
    return { c: Math.floor(x / NAV), r: Math.floor(z / NAV) };
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
      if (step === "intro" || step === "goElev") text = "任務：去升降機大堂，撳 A 核對收症。";
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
      "收症：虛構病人「林先生」同護送喺升降機大堂等候。",
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

  function npcReachable(npc) {
    var distance = dist(player.x, player.z, npc.mesh.position.x, npc.mesh.position.z);
    if (distance >= 1.55) return false;
    var steps = Math.max(1, Math.ceil(distance / (NAV / 2)));
    for (var index = 1; index <= steps; index++) {
      var fraction = index / steps;
      if (!canStand(player.x + (npc.mesh.position.x - player.x) * fraction,
          player.z + (npc.mesh.position.z - player.z) * fraction)) return false;
    }
    return true;
  }

  function npcMessage(npc) {
    if (npc.id === "nurse1") return quest === "code" ? "我會留喺病人身邊。請帶急救車返嚟。" : "你好，我喺病房協助照顧病人。";
    if (npc.id === "nurse2") return "需要記錄或處理文件，可以返護士站。";
    if (npc.id === "nurse3") return "照顧病人時，記得核對身份同留意私隱。";
    if (npc.id === "codePatient") return "病人暫時沒有回應，同事正留在旁邊。";
    if (npc.id === "admitPatient") return step === "goBed" ? "多謝，我會等候收症安排。" : "你好，我同護送喺度等候收症。";
    return "我有啲緊張，可以先同我解釋嗎？";
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
    var nearby = Object.keys(npcs).map(function (id) { return npcs[id]; }).filter(function (npc) {
      return npc.mesh.visible && npcReachable(npc);
    }).sort(function (left, right) {
      return dist(player.x, player.z, left.mesh.position.x, left.mesh.position.z) -
        dist(player.x, player.z, right.mesh.position.x, right.mesh.position.z);
    });
    if (nearby.length) {
      say([npcMessage(nearby[0])]);
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

  var materialCache = Object.create(null);
  var boxCache = Object.create(null);
  var shadowGeometry = new THREE.CircleGeometry(0.5, 16);
  var shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x344c47, transparent: true, opacity: 0.13, depthWrite: false });
  var leafGeometry = new THREE.SphereGeometry(1, 8, 6);

  function mat(color) {
    if (!materialCache[color]) materialCache[color] = new THREE.MeshStandardMaterial({ color: color, roughness: 0.82, metalness: 0.03 });
    return materialCache[color];
  }
  function addBox(parent, width, height, depth, color, x, y, z) {
    var key = [width, height, depth].join(":");
    if (!boxCache[key]) boxCache[key] = new THREE.BoxGeometry(width, height, depth);
    var mesh = new THREE.Mesh(boxCache[key], mat(color));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function addShadow(parent, x, z, width, depth) {
    var shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.012, z);
    shadow.scale.set(width, depth, 1);
    parent.add(shadow);
  }

  function addFloor(polygon, color, height) {
    var shape = new THREE.Shape();
    polygon.forEach(function (point, index) {
      if (index) shape.lineTo(point[0], -point[1]);
      else shape.moveTo(point[0], -point[1]);
    });
    shape.closePath();
    var mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat(color));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = height;
    mesh.userData.kind = "floor";
    scene.add(mesh);
  }

  function addWall(segment, color, height, thickness) {
    var dx = segment.b[0] - segment.a[0], dz = segment.b[1] - segment.a[1];
    var wall = addBox(scene, Math.hypot(dx, dz), height, thickness, color,
      (segment.a[0] + segment.b[0]) / 2, height / 2, (segment.a[1] + segment.b[1]) / 2);
    wall.rotation.y = -Math.atan2(dz, dx);
    wall.userData.kind = "wall";
    return wall;
  }

  function roomWorldPoint(id, x, z) {
    var origin = roomPolygons[id][0], angle = LAY.rooms[id].angle || 0;
    return { x: origin[0] + (x * Math.cos(angle) + z * Math.sin(angle)) * TILE,
      z: origin[1] + (-x * Math.sin(angle) + z * Math.cos(angle)) * TILE };
  }

  function addNPC(id, role, color, skin, name) {
    var mesh = new THREE.Group(), body = new THREE.Group();
    addShadow(mesh, 0, 0, 0.75, 0.55);
    addBox(body, 0.18, 0.35, 0.24, 0x52646b, -0.12, 0.18, 0);
    addBox(body, 0.18, 0.35, 0.24, 0x52646b, 0.12, 0.18, 0);
    addBox(body, 0.46, 0.47, 0.32, color, 0, 0.48, 0);
    addBox(body, 0.14, 0.34, 0.18, color, -0.29, 0.47, 0);
    addBox(body, 0.14, 0.34, 0.18, color, 0.29, 0.47, 0);
    addBox(body, 0.12, 0.12, 0.16, skin, -0.29, 0.27, 0);
    addBox(body, 0.12, 0.12, 0.16, skin, 0.29, 0.27, 0);
    addBox(body, 0.34, 0.3, 0.3, skin, 0, 0.86, 0);
    addBox(body, 0.36, 0.1, 0.32, 0x554943, 0, 1.02, 0);
    addBox(body, 0.04, 0.04, 0.04, 0x293832, -0.08, 0.87, 0.16);
    addBox(body, 0.04, 0.04, 0.04, 0x293832, 0.08, 0.87, 0.16);
    if (role === "nurse") {
      addBox(body, 0.36, 0.09, 0.34, 0xffffff, 0, 1.08, 0);
      addBox(body, 0.12, 0.04, 0.02, 0xe75d5a, 0, 0.54, 0.17);
      addBox(body, 0.04, 0.12, 0.02, 0xe75d5a, 0, 0.54, 0.17);
    }
    mesh.add(body);
    var tag = labelSprite(name);
    tag.scale.set(1.15, 0.22, 1);
    tag.position.y = role === "nurse" ? 1.35 : 1.18;
    mesh.add(tag);
    mesh.userData.kind = "npc";
    mesh.userData.id = id;
    scene.add(mesh);
    npcs[id] = { id: id, role: role, mesh: mesh, body: body, tag: tag };
  }

  function placeNPC(npc, anchor) {
    var position = LAY.npcs[anchor];
    npc.mesh.position.set(position[0] * TILE, 0, position[1] * TILE);
  }

  function updateNPCs() {
    if (!npcs.nurse1) return;
    ["nurse1", "nurse2", "nurse3"].forEach(function (id) {
      placeNPC(npcs[id], id);
      npcs[id].mesh.visible = true;
    });
    placeNPC(npcs.codePatient, "codePatient");
    npcs.codePatient.mesh.visible = quest === "code";
    placeNPC(npcs.admitPatient, step === "goBed" && quest === "admit" ? "admitIntake" : "admitLift");
    npcs.admitPatient.mesh.visible = quest === "admit";
    placeNPC(npcs.restPatient, "restPatient");
    npcs.restPatient.mesh.visible = quest === "rest";
  }

  function buildScene() {
    var canvas = el("wardCanvas");
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    if (!renderer.getContext()) throw new Error("WebGL");
    renderer.setClearColor(0xdce8e4, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 80);
    scene.add(new THREE.HemisphereLight(0xf5fbf8, 0xa2afa6, 1.5));
    var sun = new THREE.DirectionalLight(0xfff7e9, 1.15);
    sun.position.set(8, 16, 6);
    scene.add(sun);

    corridorPolygons.forEach(function (polygon, index) { addFloor(polygon, 0xe7efe1, -0.035 + index * 0.001); });
    SHELL.rooms.forEach(function (room) { addFloor(roomPolygons[room.id], room.color, -0.01); });
    wallSegments.forEach(function (segment) { addWall(segment, 0xf0f2ec, 1.15, 0.18); });
    var dummy = new THREE.Object3D();
    var walls = new THREE.InstancedMesh(
      new THREE.BoxGeometry(NAV * 1.04, 1.15, NAV * 1.04),
      mat(0xf0f2ec),
      Math.max(1, wallSpots.length)
    );
    wallSpots.forEach(function (s, idx) {
      dummy.position.set((s[0] + 0.5) * NAV, 0.575, (s[1] + 0.5) * NAV);
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
    addCorridorDetails();

    var drawnDoors = {};
    doorSegments.forEach(function (door) {
      var key = [door.a, door.b].map(function (point) { return point[0].toFixed(3) + "," + point[1].toFixed(3); }).sort().join(":");
      if (drawnDoors[key]) return;
      drawnDoors[key] = true;
      addBox(scene, 0.14, 1.15, 0.14, 0x769a92, door.a[0], 0.575, door.a[1]);
      addBox(scene, 0.14, 1.15, 0.14, 0x769a92, door.b[0], 0.575, door.b[1]);
      var header = addWall(door, 0x769a92, 0.16, 0.14);
      header.position.y = 1.19;
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
      var place = roomWorldPoint(bed.room, bed.x, bed.z);
      var group = new THREE.Group();
      group.userData.kind = "furniture";
      group.userData.room = bed.room;
      addShadow(group, 0, 0, 1.35, 1.85);
      addBox(group, 1.15, 0.16, 1.65, 0xbfcac6, 0, 0.22, 0);
      addBox(group, 1.02, 0.18, 1.53, 0xf7f9f5, 0, 0.39, 0);
      var blanket = addBox(group, 0.98, 0.09, 1.05, 0x91bbb0, 0, 0.53, 0.19);
      blanket.userData.kind = "bed";
      blanket.userData.room = bed.room;
      addBox(group, 0.62, 0.12, 0.32, 0xffffff, 0, 0.55, -0.53);
      addBox(group, 1.12, 0.46, 0.07, 0xabb9b3, 0, 0.44, -0.77);
      addBox(group, 0.38, 0.48, 0.42, 0xd3dad4, 0.84, 0.24, -0.42);
      addBox(group, 0.32, 0.035, 0.36, 0x9faea6, 0.84, 0.49, -0.42);
      group.position.set(place.x, 0, place.z);
      group.rotation.y = (LAY.rooms[bed.room].angle || 0) + (bed.ang || 0);
      scene.add(group);
    });

    addNurseStation();
    addTreatRoom();
    addOtherRoomFurniture();
    addNPC("nurse1", "nurse", 0x318e86, 0xe9bd9a, "護士一");
    addNPC("nurse2", "nurse", 0xd78086, 0xb8805d, "護士二");
    addNPC("nurse3", "nurse", 0x628fbb, 0xf0c7a6, "護士三");
    addNPC("codePatient", "patient", 0xe9bd82, 0xe5b690, "病人");
    addNPC("admitPatient", "patient", 0x9ca9cf, 0xd4a17d, "病人");
    addNPC("restPatient", "patient", 0xb2c996, 0xe8c09f, "病人");
    npcs.codePatient.body.rotation.x = -Math.PI / 2;
    npcs.codePatient.body.position.y = 0.2;
    npcs.codePatient.tag.position.y = 0.65;
    updateNPCs();

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

  function addCorridorDetails() {
    var directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var rails = [];
    wallSpots.forEach(function (wall, index) {
      if (index % 4) return;
      directions.forEach(function (direction) {
        var col = wall[0] + direction[0], row = wall[1] + direction[1];
        if (!walkAt(col, row) || tileRoom[row * CW + col] !== 1) return;
        rails.push({ x: (wall[0] + 0.5) * NAV + direction[0] * (NAV / 2 + 0.02),
          z: (wall[1] + 0.5) * NAV + direction[1] * (NAV / 2 + 0.02),
          angle: direction[0] ? Math.PI / 2 : 0 });
      });
    });
    if (!rails.length) return;
    var mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.07, 0.08), mat(0xa6b8b0), rails.length);
    var dummy = new THREE.Object3D();
    rails.forEach(function (rail, index) {
      dummy.position.set(rail.x, 0.73, rail.z);
      dummy.rotation.set(0, rail.angle, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    var lamps = rails.filter(function (rail, index) { return index % 8 === 0; });
    var lampMaterial = new THREE.MeshStandardMaterial({ color: 0xf6f5ea, emissive: 0xffe9c7, emissiveIntensity: 0.3 });
    var fixtures = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.14, 0.1), lampMaterial, lamps.length);
    lamps.forEach(function (lamp, index) {
      dummy.position.set(lamp.x, 1.03, lamp.z);
      dummy.rotation.set(0, lamp.angle, 0);
      dummy.updateMatrix();
      fixtures.setMatrixAt(index, dummy.matrix);
    });
    fixtures.instanceMatrix.needsUpdate = true;
    scene.add(fixtures);
  }

  function roomGroup(id) {
    var origin = roomWorldPoint(id, 0, 0);
    var group = new THREE.Group();
    group.position.set(origin.x, 0, origin.z);
    group.rotation.y = LAY.rooms[id].angle || 0;
    group.userData.kind = "furniture";
    group.userData.room = id;
    scene.add(group);
    return group;
  }
  function addTable(parent, x, z, width, depth) {
    addShadow(parent, x, z, width + 0.2, depth + 0.2);
    addBox(parent, width, 0.09, depth, 0xb7a58d, x, 0.76, z);
    addBox(parent, 0.09, 0.7, depth * 0.76, 0xb5c2bc, x - width * 0.38, 0.36, z);
    addBox(parent, 0.09, 0.7, depth * 0.76, 0xb5c2bc, x + width * 0.38, 0.36, z);
  }
  function addChair(parent, x, z, angle) {
    var chair = new THREE.Group();
    chair.position.set(x, 0, z);
    chair.rotation.y = angle || 0;
    addBox(chair, 0.5, 0.1, 0.5, 0x78948c, 0, 0.48, 0);
    addBox(chair, 0.5, 0.48, 0.08, 0x78948c, 0, 0.74, -0.22);
    addBox(chair, 0.38, 0.42, 0.38, 0xb2bdb5, 0, 0.23, 0);
    parent.add(chair);
  }
  function addCabinet(parent, x, z, width, depth, height) {
    addShadow(parent, x, z, width + 0.12, depth + 0.12);
    addBox(parent, width, height, depth, 0xd9e1dc, x, height / 2, z);
    addBox(parent, width * 0.88, 0.025, depth + 0.015, 0xaab8b1, x, height * 0.55, z);
    addBox(parent, 0.07, 0.07, 0.04, 0x7c9188, x + width * 0.3, height * 0.75, z + depth / 2 + 0.01);
  }
  function addSofa(parent, x, z, width) {
    addShadow(parent, x, z, width + 0.2, 0.9);
    addBox(parent, width, 0.32, 0.66, 0x8ba9a0, x, 0.35, z);
    addBox(parent, width, 0.55, 0.12, 0x7d9d93, x, 0.66, z - 0.28);
    addBox(parent, 0.1, 0.32, 0.66, 0x758e87, x - width / 2, 0.48, z);
    addBox(parent, 0.1, 0.32, 0.66, 0x758e87, x + width / 2, 0.48, z);
  }
  function addScreen(parent, x, z, width) {
    addBox(parent, width, 1.05, 0.05, 0xe9eeea, x, 0.8, z);
    addBox(parent, 0.06, 1.2, 0.06, 0x9bada5, x - width / 2, 0.6, z);
    addBox(parent, 0.06, 1.2, 0.06, 0x9bada5, x + width / 2, 0.6, z);
  }
  function addPlant(parent, x, z, scale, flowering) {
    var plant = new THREE.Group();
    plant.position.set(x, 0, z);
    plant.scale.setScalar(scale);
    plant.userData.kind = "plant";
    addBox(plant, 0.48, 0.36, 0.48, 0xa79280, 0, 0.18, 0);
    addBox(plant, 0.08, 0.5, 0.08, 0x6b8564, 0, 0.56, 0);
    [[-0.18, 0.72, 0, 0.31, 0x6e9875], [0.18, 0.8, 0.05, 0.33, 0x87a980], [0, 1.01, -0.04, 0.3, 0x5f8c6c]].forEach(function (leaf) {
      var mesh = new THREE.Mesh(leafGeometry, mat(leaf[4]));
      mesh.position.set(leaf[0], leaf[1], leaf[2]);
      mesh.scale.set(leaf[3], leaf[3] * 1.12, leaf[3]);
      plant.add(mesh);
    });
    if (flowering) {
      var flower = new THREE.Mesh(leafGeometry, mat(0xd8a39b));
      flower.position.set(0.16, 1.12, 0.08);
      flower.scale.setScalar(0.12);
      plant.add(flower);
    }
    parent.add(plant);
  }
  function addNurseStation() {
    var room = roomGroup("nurse");
    var fax = room.worldToLocal(new THREE.Vector3(MARK.fax.x, 0, MARK.fax.z));
    var computer = room.worldToLocal(new THREE.Vector3(MARK.computer.x, 0, MARK.computer.z));
    var faxX = fax.x, faxZ = fax.z, computerX = computer.x, computerZ = computer.z;
    addTable(room, faxX, faxZ, 1.15, 0.7);
    addTable(room, computerX, computerZ, 1.15, 0.7);
    addBox(room, 0.55, 0.25, 0.4, 0x687a79, faxX, 0.94, faxZ);
    addBox(room, 0.28, 0.035, 0.22, 0xf8faf8, faxX, 1.08, faxZ - 0.08);
    addBox(room, 0.45, 0.3, 0.07, 0x485c5d, computerX, 1.05, computerZ - 0.08);
    addBox(room, 0.36, 0.21, 0.01, 0x99c3bb, computerX, 1.05, computerZ - 0.035);
    addChair(room, faxX, faxZ + 0.85, Math.PI);
    addChair(room, computerX, computerZ + 0.85, Math.PI);
    addCabinet(room, 0.38, 3.5, 0.55, 1.35, 1.05);
  }
  function addTreatRoom() {
    var room = roomGroup("treat");
    addCabinet(room, 3.05, 0.4, 0.78, 0.5, 1.25);
    addShadow(room, 2.95, 3.65, 1.15, 2.0);
    addBox(room, 0.95, 0.16, 1.8, 0xa3b1ab, 2.95, 0.38, 3.65);
    addBox(room, 0.86, 0.18, 1.68, 0xf4f7f3, 2.95, 0.55, 3.65);
    addBox(room, 0.55, 0.1, 0.3, 0xd3e3da, 2.95, 0.69, 3.05);
  }
  function addOtherRoomFurniture() {
    ["b1", "b2"].forEach(function (id) {
      var ward = roomGroup(id), rect = LAY.rooms[id].rect;
      var northBeds = LAY.beds.filter(function (bed) { return bed.room === id && bed.ang === 0; });
      northBeds.sort(function (left, right) { return left.x - right.x; });
      for (var index = 0; index < northBeds.length - 1; index++) {
        var x = (northBeds[index].x + northBeds[index + 1].x) / 2 * TILE;
        [0.75, rect[3] * TILE - 0.75].forEach(function (z) {
          var partition = new THREE.Group();
          partition.userData.kind = "partition";
          partition.userData.room = id;
          partition.position.set(x, 0, z);
          partition.rotation.y = Math.PI / 2;
          addScreen(partition, 0, 0, 1.2);
          ward.add(partition);
        });
      }
    });
    var room = roomGroup("iso1");
    addScreen(room, 2.5, 1.0, 1.1);
    addCabinet(room, 0.45, 3.5, 0.65, 0.6, 1.1);

    room = roomGroup("intake");
    addTable(room, 2.3, 2.95, 1.4, 0.7);
    addChair(room, 2.3, 3.65, Math.PI);
    addScreen(room, 0.9, 2.5, 1.15);
    addCabinet(room, 0.45, 0.45, 0.7, 0.6, 1.1);

    room = roomGroup("secl");
    addSofa(room, 1.8, 0.55, 1.6);
    addBox(room, 1.1, 0.1, 0.85, 0xc3cfc5, 0.95, 0.08, 3.2);
    addPlant(room, 2.8, 0.55, 0.7, false);

    room = roomGroup("vis1");
    addSofa(room, 3.15, 0.55, 1.55);
    addTable(room, 3.1, 1.55, 0.95, 0.55);
    addChair(room, 4.05, 2.9, Math.PI / 2);
    addPlant(room, 4.15, 0.55, 0.65, true);

    room = roomGroup("dine");
    addTable(room, 3.75, 2.35, 1.45, 0.9);
    addChair(room, 3.55, 3.2, Math.PI);
    addChair(room, 4.8, 2.4, Math.PI / 2);
    addCabinet(room, 0.45, 3.9, 0.7, 0.55, 0.8);

    room = roomGroup("train");
    addTable(room, 3.75, 3.35, 1.5, 0.75);
    addChair(room, 3.25, 2.55, 0);
    addChair(room, 4.25, 2.55, 0);
    addCabinet(room, 0.45, 3.9, 0.7, 0.55, 1.15);

    room = roomGroup("con1");
    addTable(room, 2.8, 0.85, 1.35, 0.65);
    addChair(room, 2.8, 1.75, Math.PI);
    addBox(room, 0.95, 0.2, 1.75, 0xf3f6f1, 0.8, 0.53, 2.45);
    addBox(room, 0.9, 0.18, 1.8, 0xa9b8b2, 0.8, 0.34, 2.45);
    addScreen(room, 1.0, 3.65, 1.15);

    room = roomGroup("med");
    addCabinet(room, 0.45, 1.1, 0.55, 1.9, 1.35);
    addTable(room, 2.25, 0.5, 1.2, 0.6);
    addBox(room, 0.32, 0.22, 0.25, 0xb7cfc2, 2.25, 0.93, 0.5);

    room = roomGroup("lift");
    addBox(room, 0.12, 1.45, 1.65, 0x98aaa7, 0.12, 0.725, 2.35);
    addBox(room, 0.14, 1.15, 0.74, 0xcbd6d1, 0.2, 0.62, 1.94);
    addBox(room, 0.14, 1.15, 0.74, 0xcbd6d1, 0.2, 0.62, 2.76);
    addBox(room, 0.16, 0.18, 0.2, 0x52766d, 0.2, 1.2, 3.45);
    addSofa(room, 2.8, 0.55, 1.35);

    room = roomGroup("bath");
    addShadow(room, 0.65, 1.05, 1.25, 2.0);
    addBox(room, 1.08, 0.48, 1.85, 0xd7e3de, 0.65, 0.29, 1.05);
    addBox(room, 0.86, 0.12, 1.62, 0xf4f8f6, 0.65, 0.57, 1.05);
    addCabinet(room, 2.35, 0.4, 0.9, 0.55, 0.7);
    addBox(room, 0.65, 0.12, 0.45, 0xf8faf8, 2.35, 0.77, 0.4);
    addBox(room, 0.07, 0.08, 1.5, 0x9aaca7, 0.16, 0.98, 1.05);

    room = roomGroup("garden");
    addBox(room, 1.1, 0.025, 14.4, 0xe3dcc5, 9.7, 0.005, 8.0);
    addBox(room, 1.8, 0.025, 1.1, 0xe3dcc5, 10.4, 0.006, 1.9);
    addBox(room, 4.5, 0.22, 0.65, 0xa9937e, 4.45, 0.11, 1.0);
    addBox(room, 3.2, 0.22, 0.65, 0xa9937e, 2.6, 0.11, 11.8);
    [[1.0, 1.1, 0.85, true], [2.8, 1.0, 0.95, false], [4.6, 1.0, 0.8, true],
      [6.4, 1.0, 1.05, false], [6.7, 3.1, 0.8, true], [6.7, 9.0, 1.0, false],
      [5.9, 11.6, 0.9, true], [3.0, 11.8, 0.85, false], [1.1, 10.1, 1.0, true]].forEach(function (plant) {
      addPlant(room, plant[0], plant[1], plant[2], plant[3]);
    });
    addSofa(room, 3.6, 9.4, 1.6);
  }

  function labelSprite(text) {
    var c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    var g = c.getContext("2d");
    g.fillStyle = "rgba(32, 57, 54, 0.82)";
    g.fillRect(18, 18, 476, 60);
    g.fillStyle = "#f8faf7";
    g.font = "bold 38px PingFang TC, Microsoft JhengHei, Noto Sans TC, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 50);
    var tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(2.5, 0.47, 1);
    return sprite;
  }

  var mapCache = null;
  var mapBox = null;
  var mapLabelPositions = [];
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
    var padding = labels ? 16 : Math.min(w, h) * 0.36;
    var scale = Math.min((w - padding) / b.bw, (h - padding) / b.bh);
    var ox = (w - b.bw * scale) / 2;
    var oy = (h - b.bh * scale) / 2;
    function mx(x) { return ox + (x / NAV - b.minC) * scale; }
    function mz(z) { return oy + (z / NAV - b.minR) * scale; }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mapCache, ox, oy, b.bw * scale, b.bh * scale);
    if (labels) {
      var labelScale = Math.max(1, w / Math.max(1, ctx.canvas.clientWidth));
      var radius = Math.max(12, 7.5 * labelScale);
      var separation = radius * 2 + labelScale;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold " + Math.max(16, 10 * labelScale) + "px PingFang TC, Microsoft JhengHei, Noto Sans TC, sans-serif";
      mapLabelPositions = SHELL.rooms.map(function (room, index) {
        var center = roomCenter(room.id);
        return { id: room.id, number: index + 1, x: mx(center.x), y: mz(center.z),
          anchorX: mx(center.x), anchorY: mz(center.z), radius: radius };
      });
      for (var pass = 0; pass < 160; pass++) {
        mapLabelPositions.forEach(function (left, index) {
          for (var next = index + 1; next < mapLabelPositions.length; next++) {
            var right = mapLabelPositions[next], dx = right.x - left.x, dy = right.y - left.y;
            var distance = Math.hypot(dx, dy);
            if (distance >= separation) continue;
            if (distance < 0.001) { dx = 1; dy = 0; distance = 1; }
            var shift = (separation - distance) / 2;
            left.x -= dx / distance * shift; left.y -= dy / distance * shift;
            right.x += dx / distance * shift; right.y += dy / distance * shift;
          }
        });
        mapLabelPositions.forEach(function (label) {
          label.x = Math.max(radius, Math.min(w - radius, label.x));
          label.y = Math.max(radius, Math.min(h - radius, label.y));
        });
      }
      ctx.strokeStyle = "#284a45";
      ctx.lineWidth = Math.max(1, labelScale);
      mapLabelPositions.forEach(function (label) {
        if (Math.hypot(label.x - label.anchorX, label.y - label.anchorY) <= radius) return;
        ctx.beginPath();
        ctx.moveTo(label.anchorX, label.anchorY);
        ctx.lineTo(label.x, label.y);
        ctx.stroke();
      });
      mapLabelPositions.forEach(function (label) {
        ctx.fillStyle = "#203e3c";
        ctx.beginPath();
        ctx.arc(label.x, label.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(label.number), label.x, label.y);
      });
    }
    ctx.fillStyle = "#e23b32";
    ctx.beginPath();
    ctx.arc(mx(player.x), mz(player.z), labels ? Math.max(4, 4 * labelScale) : Math.max(3.5, scale * 0.42), 0, Math.PI * 2);
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
    var legend = el("wardMapLegend");
    if (legend && !legend.children.length) {
      SHELL.rooms.forEach(function (room, index) {
        var item = document.createElement("li");
        item.textContent = (index + 1) + ". " + room.name;
        legend.appendChild(item);
      });
    }
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
    updateNPCs();
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
    updateNPCs();
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
    if (overlay) overlay.addEventListener("pointerdown", function (ev) {
      if (mapOpen && !ev.target.closest("#wardMapLegend")) toggleMap();
    });
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
      if (cur[0] === b.c && cur[1] === b.r) return cur[2] * NAV;
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
      var beds = {}, bedPositions = [], partitions = [], furniture = {}, plants = 0;
      updateNPCs();
      if (scene) scene.updateMatrixWorld(true);
      if (scene) scene.traverse(function (obj) {
        if (!obj.userData) return;
        if (obj.userData.kind === "bed") {
          beds[obj.userData.room] = (beds[obj.userData.room] || 0) + 1;
          bedPositions.push({ room: obj.userData.room, x: obj.parent.position.x, z: obj.parent.position.z, rotation: obj.parent.rotation.y });
        } else if (obj.userData.kind === "partition") {
          var point = obj.getWorldPosition(new THREE.Vector3());
          partitions.push({ room: obj.userData.room, x: point.x, z: point.z });
        } else if (obj.userData.kind === "furniture") {
          furniture[obj.userData.room] = (furniture[obj.userData.room] || 0) + 1;
        } else if (obj.userData.kind === "plant") plants++;
      });
      return { beds: beds, bedPositions: bedPositions, partitions: partitions, furniture: furniture, plants: plants,
        npcs: Object.keys(npcs).map(function (id) {
          var npc = npcs[id];
          return { id: id, role: npc.role, x: npc.mesh.position.x, z: npc.mesh.position.z, visible: npc.mesh.visible };
        }), mapLabels: mapLabelPositions.map(function (label) {
          return { id: label.id, x: label.x, y: label.y, radius: label.radius };
        }), rooms: SHELL.rooms.map(function (r) { return r.id; }), problems: layoutProblems.slice() };
    }
  };
})();
