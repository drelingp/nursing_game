(function () {
  var wingAngle = Math.PI * 35 / 180;
  var cos = Math.cos(wingAngle), sin = Math.sin(wingAngle);

  function wingPoint(x, z) {
    return [5.25 + x * cos + z * sin, 24 - x * sin + z * cos];
  }
  function wingRect(x, z, width, depth) {
    var center = wingPoint(x + width / 2, z + depth / 2);
    return [center[0] - width / 2, center[1] - depth / 2, width, depth];
  }
  function roomPoint(room, x, z) {
    var rect = room.rect, angle = room.angle || 0;
    var dx = x - rect[2] / 2, dz = z - rect[3] / 2;
    return [rect[0] + rect[2] / 2 + dx * Math.cos(angle) + dz * Math.sin(angle),
      rect[1] + rect[3] / 2 - dx * Math.sin(angle) + dz * Math.cos(angle)];
  }
  function door(edge, at, width) {
    return { edge: edge, at: at, width: width || 2 };
  }

  var rooms = {
    b1: { rect: wingRect(16, 10, 8, 6), angle: wingAngle, doors: [door(3, 0.5)] },
    b2: { rect: wingRect(0, 10, 8, 6), angle: wingAngle, doors: [door(1, 0.5)] },
    iso1: { rect: wingRect(0, 20, 3.5, 4.5), angle: wingAngle, doors: [door(1, 0.5)] },
    secl: { rect: wingRect(0, 25, 3.5, 4.5), angle: wingAngle, doors: [door(1, 0.5)] },
    nurse: { rect: wingRect(11.5, 23.5, 5, 5), angle: wingAngle, doors: [door(3, 0.5), door(1, 0.5)] },
    train: { rect: wingRect(1, 30.5, 5.3, 5), angle: wingAngle, doors: [door(1, 0.5)] },
    bath: { rect: [31.3, 25.3, 3.4, 3.3], doors: [door(2, 0.5)] },
    con1: { rect: [35.8, 25.8, 4, 4.5], doors: [door(2, 0.5)] },
    vis1: { rect: [42, 25.8, 6, 5.5], doors: [door(3, 0.5), door(2, 5 / 12)] },
    lift: { rect: [43, 31.3, 5, 5], doors: [door(0, 0.5)] },
    intake: { rect: [36, 31.8, 4, 4.5], doors: [door(1, 0.5)] },
    treat: { rect: [37.5, 37.4, 4.2, 5], doors: [door(3, 0.5)] },
    med: { rect: [24.2, 53, 3.5, 2.5], doors: [door(1, 0.5)] },
    dine: { rect: [24, 55.8, 9, 7.2], doors: [door(1, 0.5), door(3, 2.5 / 7.2)] },
    garden: {
      rect: [12, 58.5, 18.4, 19.5],
      polygon: [[12, 58.5], [24, 58.5], [24, 75], [30.4, 75], [30.4, 78], [12, 78]],
      doors: [door(1, 2 / 16.5)]
    }
  };

  var beds = [];
  ["b1", "b2"].forEach(function (room) {
    [1.7, 4, 6.3].forEach(function (x) {
      beds.push({ room: room, x: x, z: 0.88, ang: 0 });
      beds.push({ room: room, x: x, z: 5.12, ang: Math.PI });
    });
  });
  beds.push({ room: "iso1", x: 1.75, z: 2.25, ang: Math.PI / 2 });

  window.WARD_SHELL = {
    layout: {
      tile: 0.9375,
      navTile: 0.234375,
      cols: 52,
      rows: 82,
      corridors: [
        { rect: wingRect(8, 0, 8, 26), angle: wingAngle },
        { rect: wingRect(3.5, 19, 18.5, 16), angle: wingAngle },
        { rect: [29, 26, 15, 20] },
        { rect: [29, 41, 12.5, 33] },
        { rect: [27.7, 52, 4, 4.5] }
      ],
      rooms: rooms,
      marks: {
        start: wingPoint(10, 20),
        trolley: roomPoint(rooms.treat, 1.5, 2.5),
        fax: roomPoint(rooms.nurse, 1.3, 1.4),
        computer: roomPoint(rooms.nurse, 3.7, 1.4),
        incident: wingPoint(8.8, 27.3),
        lift: roomPoint(rooms.lift, 1.4, 3.7),
        intake: roomPoint(rooms.intake, 2, 2.2),
        secl: roomPoint(rooms.secl, 2.4, 2.25),
        treat: roomPoint(rooms.treat, 2.2, 2),
        nurse: roomPoint(rooms.nurse, 2.5, 3.6)
      },
      npcs: {
        nurse1: wingPoint(10.3, 27.3),
        nurse2: roomPoint(rooms.nurse, 2.6, 3.6),
        nurse3: roomPoint(rooms.con1, 3.1, 3.8),
        codePatient: wingPoint(8.8, 27.3),
        admitLift: roomPoint(rooms.lift, 4, 3.7),
        admitIntake: roomPoint(rooms.intake, 0.8, 0.8),
        restPatient: roomPoint(rooms.secl, 0.8, 0.8)
      },
      beds: beds
    },
    rooms: [
      { id: "b1", name: "六人病房一", kind: "bed", beds: 6, color: 0xd6eaf7 },
      { id: "b2", name: "六人病房二", kind: "bed", beds: 6, color: 0xcbe5f3 },
      { id: "iso1", name: "單人隔離房", kind: "single", beds: 1, color: 0xf6d8cc },
      { id: "nurse", name: "護士站", kind: "nurse", beds: 0, color: 0xafe2d9 },
      { id: "treat", name: "治療室", kind: "treat", beds: 0, color: 0xf8d9c8 },
      { id: "intake", name: "收症房", kind: "intake", beds: 0, color: 0xffe6a8 },
      { id: "secl", name: "冷靜房", kind: "secl", beds: 0, color: 0xdad7ef },
      { id: "vis1", name: "探病室", kind: "living", beds: 0, color: 0xf8d7dc },
      { id: "dine", name: "飯廳", kind: "dine", beds: 0, color: 0xfce6a9 },
      { id: "train", name: "病人評估訓練室", kind: "train", beds: 0, color: 0xd9e8bf },
      { id: "con1", name: "診症室", kind: "consult", beds: 0, color: 0xd9eac7 },
      { id: "med", name: "藥房", kind: "med", beds: 0, color: 0xf3cdc4 },
      { id: "lift", name: "升降機大堂", kind: "elev", beds: 0, color: 0xd7e3ef },
      { id: "bath", name: "輔助浴室", kind: "bath", beds: 0, color: 0xbce9ef },
      { id: "garden", name: "花園", kind: "garden", beds: 0, color: 0xadd990 }
    ]
  };
})();
