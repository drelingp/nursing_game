/* Ward C: one room per function, two six-bed wards, each a rectangle with one door. */
window.WARD_SHELL = {
  "layout": {
    "tile": 0.9375,
    "cols": 52,
    "rows": 40,
    "corridors": [
      [1, 7, 38, 2],
      [1, 17, 38, 2],
      [1, 27, 38, 2],
      [36, 7, 3, 28]
    ],
    "rooms": {
      "lift": { "rect": [1, 1, 5, 5], "door": [3, 6] },
      "con1": { "rect": [7, 1, 5, 5], "door": [9, 6] },
      "comm": { "rect": [13, 1, 5, 5], "door": [15, 6] },
      "secl": { "rect": [19, 1, 5, 5], "door": [21, 6] },
      "calm": { "rect": [25, 1, 5, 5], "door": [27, 6] },
      "duty": { "rect": [31, 1, 4, 5], "door": [32, 6] },
      "b1": { "rect": [1, 10, 8, 6], "door": [4, 16] },
      "bath": { "rect": [10, 10, 5, 6], "door": [12, 16] },
      "treat": { "rect": [16, 10, 8, 6], "door": [19, 16] },
      "intake": { "rect": [25, 10, 10, 6], "door": [29, 16] },
      "b2": { "rect": [1, 20, 8, 6], "door": [4, 19] },
      "iso1": { "rect": [10, 20, 6, 6], "door": [12, 19] },
      "nurse": { "rect": [17, 20, 18, 6], "door": [35, 22] },
      "vis1": { "rect": [1, 30, 5, 5], "door": [3, 29] },
      "train": { "rect": [7, 30, 6, 5], "door": [9, 29] },
      "med": { "rect": [14, 30, 4, 5], "door": [15, 29] },
      "pantry": { "rect": [19, 30, 4, 5], "door": [20, 29] },
      "dine": { "rect": [24, 30, 6, 5], "door": [26, 29] },
      "group": { "rect": [31, 30, 4, 5], "door": [32, 29] },
      "garden": { "rect": [40, 17, 8, 14], "door": [39, 23] }
    },
    "marks": {
      "start": [8, 17],
      "trolley": [19, 12],
      "fax": [20, 22],
      "computer": [22, 22],
      "incident": [19, 17],
      "lift": [3, 3],
      "intake": [29, 12],
      "secl": [21, 3],
      "treat": [21, 13],
      "nurse": [20, 23]
    },
    "beds": [
      { "room": "b1", "c": 2, "r": 11, "ang": 1.5708 }, { "room": "b1", "c": 4, "r": 11, "ang": 1.5708 }, { "room": "b1", "c": 6, "r": 11, "ang": 1.5708 },
      { "room": "b1", "c": 2, "r": 13, "ang": 1.5708 }, { "room": "b1", "c": 4, "r": 13, "ang": 1.5708 }, { "room": "b1", "c": 6, "r": 13, "ang": 1.5708 },
      { "room": "b2", "c": 2, "r": 22, "ang": 1.5708 }, { "room": "b2", "c": 4, "r": 22, "ang": 1.5708 }, { "room": "b2", "c": 6, "r": 22, "ang": 1.5708 },
      { "room": "b2", "c": 2, "r": 24, "ang": 1.5708 }, { "room": "b2", "c": 4, "r": 24, "ang": 1.5708 }, { "room": "b2", "c": 6, "r": 24, "ang": 1.5708 },
      { "room": "iso1", "c": 12, "r": 22, "ang": 1.5708 }
    ]
  },
  "rooms": [
    { "id": "b1", "name": "六人病房一", "kind": "bed", "beds": 6, "color": 15782568 },
    { "id": "b2", "name": "六人病房二", "kind": "bed", "beds": 6, "color": 15980464 },
    { "id": "iso1", "name": "單人隔離房", "kind": "single", "beds": 1, "color": 16245444 },
    { "id": "nurse", "name": "護士站", "kind": "nurse", "beds": 0, "color": 10473672 },
    { "id": "treat", "name": "治療室", "kind": "treat", "beds": 0, "color": 16239044 },
    { "id": "intake", "name": "收症房", "kind": "intake", "beds": 0, "color": 15910608 },
    { "id": "calm", "name": "緩和區", "kind": "calm", "beds": 0, "color": 12965104 },
    { "id": "secl", "name": "冷靜房", "kind": "secl", "beds": 0, "color": 14141162 },
    { "id": "vis1", "name": "探訪活動區", "kind": "living", "beds": 0, "color": 14016666 },
    { "id": "comm", "name": "公共區", "kind": "living", "beds": 0, "color": 14016666 },
    { "id": "dine", "name": "飯廳", "kind": "dine", "beds": 0, "color": 15786152 },
    { "id": "group", "name": "集體治療室", "kind": "therapy", "beds": 0, "color": 15192304 },
    { "id": "train", "name": "病人評估訓練室", "kind": "train", "beds": 0, "color": 16246689 },
    { "id": "con1", "name": "診症室", "kind": "consult", "beds": 0, "color": 16179888 },
    { "id": "duty", "name": "共用當值室", "kind": "office", "beds": 0, "color": 14993562 },
    { "id": "med", "name": "藥房", "kind": "med", "beds": 0, "color": 15786152 },
    { "id": "pantry", "name": "茶水間", "kind": "pantry", "beds": 0, "color": 16177064 },
    { "id": "lift", "name": "病人及職員升降機大堂", "kind": "elev", "beds": 0, "color": 14015974 },
    { "id": "bath", "name": "輔助浴室", "kind": "bath", "beds": 0, "color": 9357034 },
    { "id": "garden", "name": "花園", "kind": "garden", "beds": 0, "color": 9424506 }
  ]
};
