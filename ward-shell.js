window.WARD_SHELL = {
  "layout": {
    "tile": 0.9375,
    "cols": 52,
    "rows": 40,
    "corridors": [
      [1, 7, 38, 2],
      [1, 17, 38, 2],
      [1, 27, 38, 2],
      [36, 7, 3, 28],
      [17, 7, 2, 22],
      [31, 7, 2, 22]
    ],
    "rooms": {
      "lift": { "rect": [1, 1, 5, 5], "door": [6, 3] },
      "vis1": { "rect": [7, 1, 5, 5], "doors": [[6, 3], [9, 6]] },
      "con1": { "rect": [13, 1, 5, 5], "door": [15, 6] },
      "secl": { "rect": [19, 1, 5, 5], "door": [21, 6] },
      "b1": { "rect": [1, 10, 8, 6], "door": [1, 16] },
      "bath": { "rect": [11, 10, 5, 6], "door": [16, 12] },
      "treat": { "rect": [20, 10, 4, 6], "door": [19, 12] },
      "intake": { "rect": [25, 10, 5, 6], "door": [30, 12] },
      "b2": { "rect": [1, 20, 8, 6], "door": [1, 19] },
      "iso1": { "rect": [10, 20, 6, 6], "door": [16, 22] },
      "nurse": { "rect": [20, 20, 9, 6], "doors": [[24, 19], [24, 26]] },
      "train": { "rect": [1, 30, 6, 5], "door": [3, 29] },
      "med": { "rect": [8, 30, 4, 5], "door": [9, 29] },
      "dine": { "rect": [13, 30, 6, 5], "door": [15, 29] },
      "garden": { "rect": [40, 17, 8, 14], "door": [39, 23] }
    },
    "marks": {
      "start": [8, 17],
      "trolley": [21, 12],
      "fax": [22, 22],
      "computer": [26, 22],
      "incident": [22, 17],
      "lift": [3, 3],
      "intake": [27, 12],
      "secl": [21, 3],
      "treat": [21, 13],
      "nurse": [24, 23]
    },
    "beds": [
      { "room": "b1", "c": 2.2, "r": 10.38, "ang": 0 }, { "room": "b1", "c": 4.5, "r": 10.38, "ang": 0 }, { "room": "b1", "c": 6.8, "r": 10.38, "ang": 0 },
      { "room": "b1", "c": 2.2, "r": 14.62, "ang": 3.141592653589793 }, { "room": "b1", "c": 4.5, "r": 14.62, "ang": 3.141592653589793 }, { "room": "b1", "c": 6.8, "r": 14.62, "ang": 3.141592653589793 },
      { "room": "b2", "c": 2.2, "r": 20.38, "ang": 0 }, { "room": "b2", "c": 4.5, "r": 20.38, "ang": 0 }, { "room": "b2", "c": 6.8, "r": 20.38, "ang": 0 },
      { "room": "b2", "c": 2.2, "r": 24.62, "ang": 3.141592653589793 }, { "room": "b2", "c": 4.5, "r": 24.62, "ang": 3.141592653589793 }, { "room": "b2", "c": 6.8, "r": 24.62, "ang": 3.141592653589793 },
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
    { "id": "secl", "name": "冷靜房", "kind": "secl", "beds": 0, "color": 14141162 },
    { "id": "vis1", "name": "探病室", "kind": "living", "beds": 0, "color": 14016666 },
    { "id": "dine", "name": "飯廳", "kind": "dine", "beds": 0, "color": 15786152 },
    { "id": "train", "name": "病人評估訓練室", "kind": "train", "beds": 0, "color": 16246689 },
    { "id": "con1", "name": "診症室", "kind": "consult", "beds": 0, "color": 16179888 },
    { "id": "med", "name": "藥房", "kind": "med", "beds": 0, "color": 15786152 },
    { "id": "lift", "name": "升降機大堂", "kind": "elev", "beds": 0, "color": 14015974 },
    { "id": "bath", "name": "輔助浴室", "kind": "bath", "beds": 0, "color": 9357034 },
    { "id": "garden", "name": "花園", "kind": "garden", "beds": 0, "color": 9424506 }
  ]
};
