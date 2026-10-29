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

  var ruleSources = {
    admission: { file: "m10-current-rules.md", section: "1. 收症／入院編配", scope: "shared" },
    safety: { file: "m10-practical-checklist.md", section: "病人安全／安檢", scope: "shared" },
    medication: { file: "m10-practical-checklist.md", section: "用藥／e-Vital", scope: "shared" },
    infection: { file: "m10-current-rules.md", section: "4. 感染控制／篩查", scope: "shared" },
    emergency: { file: "m10-current-rules.md", section: "5. 事故通報／緊急", scope: "shared" },
    transfer: { file: "m10-practical-checklist.md", section: "文件／法律／出院／運送", scope: "shared" },
    logistics: { file: "m10-practical-checklist.md", section: "鎖匙／日常／人力", scope: "shared" },
    c7admit: { file: "m10-c7-checklist.md", section: "收症／Rota", scope: "C7" },
    c7visit: { file: "m10-c7-checklist.md", section: "探病預約", scope: "C7" },
    c7care: { file: "m10-c7-checklist.md", section: "C7 本位運作速記", scope: "C7" },
    c9visit: { file: "m10-practical-checklist.md", section: "探訪／私隱", scope: "C9" },
    c9emergency: { file: "m10-current-rules.md", section: "6. 病人安全／安檢：A34", scope: "C9" },
    diet: { file: "m10-current-rules.md", section: "6. 病人安全／安檢", scope: "shared", override: "2026-10-29：所有收症 ≥60；保留 MD 條件。UE＝入院無帶 HKID，不限 UE。" },
    timing: { file: "m10-practical-checklist.md", section: "用藥／e-Vital", scope: "shared", override: "2026-10-29：晚間 BP 可由 18:00 開始，餐→BP→藥；仍依處方。" },
    collection: { file: "m10-current-rules.md", section: "2. 轉院／出院／法律表格", scope: "shared", override: "2026-10-29：OPA 只限緊急取藥，先電話藥房。" },
    ipmoe: { file: "m10-current-rules.md", section: "2. 轉院／出院／法律表格", scope: "shared", override: "2026-10-29：現用 IPMOE；急救毋須影印 MAR，L1 返回亦不用重開紙本 MAR。" }
  };
  var policies = {
    dietRequired: function (age, md) { return age >= 60 || !!md; },
    eveningBPAllowed: function (hour, minute) { return hour * 60 + minute >= 1080; },
    collection: function (urgent) { return urgent ? "先電話藥房，再安排 OPA" : "ADS／獲授權職員或病人安排；不用 OPA"; },
    chart: "IPMOE",
    ue: "入院無帶 HKID",
    precedence: "明確全院共用項有衝突用 C7；本位規則不跨病房套用"
  };
  function stage(target, rule, prompt, correct, wrong, detail, action) {
    return { target: target, source: ruleSources[rule], action: action || "choice",
      q: prompt, options: [wrong, correct], answer: 1, explain: detail || correct,
      points: [correct], recovery: "重新選擇安全做法，再完成呢一步。" };
  }
  function variant(id, title, stages) { return { id: id, title: title, stages: stages }; }
  function family(id, title, variants, wards) {
    return { id: id, title: title, wards: wards || ["C9", "C7"], variants: variants };
  }
  var catalog = [
    family("admit", "收症規劃", [
      variant("booking", "AED 催車；CMO 未完成", [
        stage("computer", "admission", "未 confirm 本 team 1:1，AED 催 book 車。", "先確認 1:1，填當期 rota 後 reload 確認已 save，才通知 book 車", "先叫車，之後補 rota"),
        stage("lift", "admission", "虛構病人及 escort 到達。", "核對身份及文件，跟當更收症安排", "請病人自己搵床"),
        stage("intake", "admission", "DMO 睇完，但 CMO 未完成 admission。", "保留 cover sheet，等 CMO 完成才抽起", "DMO 睇過即可抽起")
      ]),
      variant("rota", "分頁及覆核", [
        stage("computer", "admission", "當期虛構 rota 指定 LD／PULD 分頁。", "用指定分頁並 reload 確認；一星期 AL 同事不編新 primary case", "全部放 general，亦派畀放 AL 同事"),
        stage("intake", "admission", "TTO 文件到，CMO 已完成 admission procedure。", "核實 CMO 已完成後才抽起 cover sheet", "只睇 DMO 簽名就當完成")
      ]),
      variant("c7rota", "C7：LD／dual 分症", [
        stage("computer", "c7admit", "虛構當期表：CSD Diagnosis＝LD；另一宗 LD+SA dual。", "LD 跟 C7 流程；dual 依當期表轉 B7 等，勿一律當 LD 收", "見到 LD 字眼全部收 C7"),
        stage("intake", "c7admit", "C7 整理收症 rota 同 file。", "大 rota 派醫生、move-in rota 派病房；LD 橙／其他白／AC 綠；短 AL 保留 SKIP", "兩套 rota 合一；短 AL 直接跳過 SKIP")
      ])
    ]),
    family("arrival", "到院安檢及財物", [
      variant("ue60", "60 歲 UE，無私人物品", [
        stage("lift", "diet", "虛構 60 歲 UE 入院；UE 是甚麼？", "UE＝入院無帶 HKID；≥60 仍需核碎餐，唔係只限 UE", "UE 代表可略過身份及飲食核對"),
        stage("intake", "safety", "收症金屬探測及無物品記錄。", "屏風、解釋、雙人見證；有無物品均護士及病人簽名", "一人公開探測；無物品就不用簽"),
        stage("bedside", "diet", "60 歲病人要求正餐。", "按 ≥60 規則核最低碎餐；堅持正餐轉介言語治療並核處方", "只有 ≥65 才需要核碎餐")
      ]),
      variant("property59", "59 歲、無 MD，有危險品", [
        stage("intake", "safety", "虛構 59 歲無 MD 病人帶危險品。", "私隱下解釋及雙人探測，危險品交家人並寫 nursing note", "暫放床頭櫃不作記錄"),
        stage("bedside", "diet", "59 歲無 MD，已提供虛構餐單處方。", "核對處方；不因年齡未滿 60 自行改餐，MD 仍另有碎餐條件", "把 ≥60 規則錯套所有 59 歲病人"),
        stage("intake", "safety", "私家衫及個人物品需要封存。", "特厚透明袋封私家衫，護士及病人簽記錄，封存至出院，轉房簽收", "不用簽名，袋可隨便取出")
      ])
    ]),
    family("medication", "派藥及 e-Vital", [
      variant("evening", "晚餐及 BP", [
        stage("dining", "timing", "虛構醫囑晚餐後量 BP 再派藥；現為 17:59。", "先等至 18:00 開餐後按處方量 BP；不提早派藥", "17:59 先量當作晚間 BP"),
        stage("medication", "timing", "虛構時間已到 18:00，餐已開。", "按處方 BP 後才派藥，不用硬等 19:00", "一定等到 19:00，忽略處方"),
        stage("bedside", "medication", "大廳及房內都有病人等藥。", "先大廳再推藥車入房；同一人執派簽，DDA／指定針劑雙核雙簽", "叫 PCA 送藥，另一人代簽")
      ]),
      variant("downtime", "異常值及 downtime", [
        stage("medication", "medication", "e-Vital 有金色未量及異常讀數。", "跟進未量，先核異常，勿亂確認 upload；H'stix 選 A", "先全部確認 upload 再算"),
        stage("computer", "medication", "系統 downtime；虛構 Inderal order 要核 HR，現 HR 58。", "用指定 downtime 信封流程及 retrospective；HR 未達 ＞60，先評估依醫囑處理", "downtime 不記錄，HR 58 仍照派"),
        stage("medication", "medication", "病人質疑藥袋與 Omnicell 顯示不同。", "以藥袋核對再 double check；High Alert independent checking", "以螢幕為準忽略病人")
      ])
    ]),
    family("infection", "隔離及樣本", [
      variant("screen", "篩查名單及 CPE", [
        stage("computer", "infection", "虛構 ICN 最新指示：此院舍爆發須 C. auris PCR。", "核最新 ICN 指示安排 PCR，不憑舊名單", "憑記憶九西全部豁免"),
        stage("isolation", "infection", "虛構病人 CPE，已提供隔離指示。", "side／single 配 contact precaution，指定設備及手衛生", "安排大房共用設備")
      ]),
      variant("sample", "取樣本及疑 TB", [
        stage("isolation", "infection", "虛構新症疑 TB；已提供當期 ICN 指示。", "單人房及 N95，跟當期隔離指示", "只戴普通口罩留大房"),
        stage("handover", "infection", "到碧瑤收樣本，手上無膠箱。", "先取膠箱；無膠箱不收樣本", "用衫袋帶返病房"),
        stage("computer", "infection", "病人發燒，需要通報。", "依電子表流程 email ICN，清潔／消毒取樣器皿", "只口頭講，唔使通報")
      ])
    ]),
    family("visit", "探訪及私隱", [
      variant("c9food", "C9：家屬帶食物", [
        stage("visitor", "c9visit", "C9 當更 IC 確認 6 檯＋1 buffer。", "依 IC 確認名額預約，家屬面前檢查食物，核哽塞風險", "照抄 C7 時段並無限加檯"),
        stage("intake", "safety", "探病後病人準備回房。", "回房前私隱下解釋及雙人金屬探測", "每日已做過，所以不用再檢")
      ]),
      variant("c9privacy", "C9：拍攝及個案禁探", [
        stage("visitor", "c9visit", "有人拍攝，另有個案 CMO 禁探指示。", "制止擅自拍攝；個案限制按 CMO order，勿當全 ward SOP", "可自拍上傳，個案禁探套用全 ward"),
        stage("computer", "c9visit", "來電者查病人資料並想約見醫生。", "保障私隱，不洩資料；約見用 N96", "公開交代病人及 VIP 細節")
      ]),
      variant("c7booking", "C7：同 Party 連續預約", [
        stage("computer", "c7visit", "C7 家屬想連約下週兩節。", "只約下週一節；同 Party 不連續兩節，該節開始後才可再約", "照用 C9 6＋1 檯規則批准連續兩節"),
        stage("visitor", "c7visit", "虛構探病預約遲到 10 分鐘。", "15:30–16:30／16:30–17:30；保留 15 分鐘才釋放 walk-in，備餐紙 master list", "10 分鐘即放位，不用餐紙")
      ]),
      variant("c7walkin", "C7：walk-in 及家屬餵食", [
        stage("visitor", "c7visit", "C7 預約已遲到 16 分鐘。", "已過 15 分鐘才依安排釋放 walk-in；兩節中間清潔", "永遠留位或連續兩節全給同 Party"),
        stage("dining", "safety", "家屬想用未核餐單食物餵病人。", "先核餐紙及哽塞風險，面前檢查食物，拒絕不當物品", "家屬自行決定，不用檢查")
      ])
    ]),
    family("code", "緊急支援", [
      variant("code000", "真正 000", [
        stage("incident", "emergency", "走廊虛構病人無反應；同事留在旁邊。", "先 3999 講明 000／緊急／救命，真正 000 直接 Ambulance control", "先去影印 MAR，之後才叫支援"),
        stage("trolley", "emergency", "同事繼續留守病人，你負責設備。", "取 E-trolley 推返事發位置，病人不可無人看管", "叫同事同去取車，病人獨留", null, "collect"),
        stage("incident", "emergency", "急救車到場；情況暫時穩定。", "配合現場支援及設備，不等文書才援助", "先做完所有文件才處理病人", null, "deliver"),
        stage("computer", "ipmoe", "穩定後處理藥單及事件記錄。", "用 IPMOE 電子藥單；記錄及依 AIRS／Risk Alert 流程，不要求影印 MAR", "強制去傳真機影印紙本 MAR")
      ]),
      variant("p1delay", "CMS P1 等候超時", [
        stage("computer", "emergency", "虛構 CMS book P1 已過 5 分鐘無回覆。", "聯絡 Ambulance control，核 location、病房電話及 psychiatric patient", "繼續等，無時間限制"),
        stage("handover", "emergency", "準備支援及交更；不是已確認 000。", "清楚交代情況，真正救命用 3999／000，勿只依賴未回覆 booking", "所有 booking 都當完成，不用交更"),
        stage("computer", "ipmoe", "處理緊急轉送藥物記錄。", "使用 IPMOE 核對，完成事件及交接紀錄", "先印紙本 MAR 才准求援")
      ])
    ]),
    family("rest", "躁動及約束照顧", [
      variant("deescalation", "先評估，非懲罰", [
        stage("secl", "safety", "虛構病人緊張；同事想用約束懲罰。", "先確保安全、評估及解釋，依指引嘗試 de-escalation，約束不是懲罰", "立即約束當懲罰"),
        stage("computer", "safety", "CO for unpredictable behaviour 已有個案指示。", "Nurse notes 頂部 remark，記錄評估及照顧；依處方觀察", "只 tick，毋須文字紀錄")
      ]),
      variant("feeding", "已按醫囑約束，家屬餵食", [
        stage("secl", "safety", "虛構個案已按醫囑約束，家屬想瞓餵。", "先臨床評估，必須坐起餵；不准瞓餵，是否餵食由護士決定", "躺着餵快啲，可交家屬決定"),
        stage("bedside", "safety", "準備依現行指示解除約束。", "依指引評估及觀察，收回綁帶及紅帶，記錄照顧", "把綁帶留床邊，不作記錄"),
        stage("computer", "safety", "記錄約束期間照顧。", "記錄原因、時間及依醫囑的循環／皮膚觀察，不自行發明頻率", "所有病人統一自行定時限")
      ])
    ]),
    family("incidentReport", "事故通報", [
      variant("uncertain", "未確定 AIRS", [
        stage("handover", "emergency", "虛構 near miss；未定是否 AIRS。", "先通知經理，按 KCH Risk Alert 流程", "唔肯定就唔報"),
        stage("computer", "emergency", "今次入院曾有 Risk Alert，準備交出院摘要。", "Discharge Summary remarks 及 ePAF affirmative history 都交代", "只在自己筆記寫")
      ]),
      variant("submitted", "已 submit AIRS", [
        stage("computer", "emergency", "虛構 AIRS 已 submit。", "FU email 並 cc KCH Risk Alert，brief history／DASA score 寫清", "Submit 後不用再跟進"),
        stage("handover", "emergency", "嚴重事件需要 handover。", "Immediate management 同步 Brief description，出院 summary 及 ePAF 帶齊風險", "只填分數，不交代處理")
      ])
    ]),
    family("discharge", "轉院及出院", [
      variant("planned", "計劃出院，非緊急取藥", [
        stage("computer", "transfer", "虛構計劃出院，CPS referral 尚未做。", "安排最少 3 個工作天 referral；核陪同者、風險、覆診、藥及通知家人", "出院當刻才全部補做"),
        stage("medication", "collection", "非緊急出院藥，Pharmacy 2/F BC。", policies.collection(false), "照叫 OPA 作常規取藥"),
        stage("intake", "transfer", "準備出院交收。", "核財物／Deposit／個人物品簽收，帶齊覆診及用藥紀錄", "藥及財物下次先交")
      ]),
      variant("dama", "DAMA，緊急藥物", [
        stage("computer", "transfer", "虛構病人 DAMA。", "CMS code 用 DAMA 並 Telecare；不能套計劃出院 CPS 三工作天時限", "Code 用 HOME WITH FU"),
        stage("medication", "collection", "緊急出院藥需要職員取。", policies.collection(true), "未電話藥房就叫 OPA"),
        stage("lift", "transfer", "住院病人 NEATS 司機要求地面上車。", "LGM／F 上車，要求返 LG；交接過往 risks 及藥欄／頁碼完整", "照去地面，風險留接收方再問")
      ]),
      variant("l1", "L1 轉送及返回", [
        stage("computer", "transfer", "虛構轉 L1，CMS Transfer 選項。", "選 CH: Child & Adolescent，transfer slip 藥欄／MAR及NN頁碼／過往risks寫齊", "隨便選兒科項目"),
        stage("medication", "ipmoe", "虛構病人從 L1 返回。", "用 IPMOE 電子藥單核對；不用重開紙本 MAR", "一定先重開紙本 MAR")
      ])
    ]),
    family("legal", "法律提醒", [
      variant("dual", "F123／4 due", [
        stage("computer", "transfer", "虛構 F123／4，已由當期法律攻略核實 due 日期。", "把已核 due 同時入 Dashboard 及 PCHOS", "只靠水牌"),
        stage("handover", "transfer", "向 IC 交更法律 due。", "due 入 IC list；依已核日期及當期攻略交代，勿自己估生效算法", "自行猜法律有效期")
      ]),
      variant("reminder", "F4／7 三日前提醒", [
        stage("handover", "transfer", "虛構已核 F4／7 due；今天剛是 due 前三日。", "PCHOS 提醒及 IC list，日曆逐日核對當期攻略", "等 due 過後才補"),
        stage("computer", "transfer", "另有 DASA／SO 需要記錄。", "DASA／SO 可只入 Dashboard；法律 F123／4 仍雙入", "所有資料都只入 Dashboard")
      ])
    ]),
    family("shift", "交更安全", [
      variant("keys", "鎖匙及 access card", [
        stage("handover", "logistics", "未返到 ward，同事想預先取 key。", "返到 ward 才取；還 key 只交 IC／2nd IC，Learner Access Card 每更點算", "先大堂取匙再交任何同事"),
        stage("bedside", "safety", "星期日朝早例行檢查。", "每日環境及病人安檢外，加 weekly 床頭櫃／床／單人房安檢", "做過每日就不用 weekly")
      ]),
      variant("alarm", "夜更電門故障", [
        stage("handover", "emergency", "夜更離開護士站工作。", "隨身 personal security alarm 及 walkie talkie", "只帶私人手機就足夠"),
        stage("lift", "emergency", "虛構電門故障，需要逃生。", "按指引用 Break Glass；報告故障，不自行發明撤離順序", "等第二朝工程先算")
      ])
    ]),
    family("bowel", "C7 腸道及暫停藥", [
      variant("clozapine", "C7：clozapine／LD 腸塞風險", [
        stage("bedside", "c7care", "C7 虛構 clozapine／LD 個案，準備沖涼。", "先觀察並在 BO chart 記錄腸塞風險，依當期醫囑處理", "沖完涼先算，無需 BO chart"),
        stage("dining", "c7care", "有已處方 laxative。", "按醫囑給藥及確保足夠飲水，觀察並記錄，不自行加劑量", "不問醫囑自行加量，毋須飲水")
      ]),
      variant("withheld", "C7：withhold 藥交接", [
        stage("medication", "c7care", "C7 虛構病人已有 withhold 指示。", "TPR 獨立放藥紙籃，提醒同事，核當期醫囑", "TPR 混入普通文件，不提 withhold"),
        stage("handover", "c7care", "下一更接手。", "清楚交接 withhold 指示及觀察，依處方跟進；勿自行恢復藥物", "自行恢復原劑量")
      ])
    ], ["C7"])
  ];
  function eligibleVariants(item, ward) {
    return item.variants.filter(function (entry) {
      return item.wards.indexOf(ward) !== -1 && entry.stages.every(function (entryStage) {
        return entryStage.source.scope === "shared" || entryStage.source.scope === ward;
      });
    });
  }

  var roomById = {};
  SHELL.rooms.forEach(function (r, i) { roomById[r.id] = r; r.index = i + 2; });

  var tileWalk = new Uint8Array(CW * CH);
  var tileRoom = new Uint16Array(CW * CH);
  var roomPolygons = Object.create(null);
  var corridorPolygons = [];
  var wallSegments = [];
  var corridorWalls = [];
  var renderedWalls = [];
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

  function mergeWallSegments(segments) {
    var merged = [], tolerance = 0.00001;
    segments.forEach(function (source) {
      var segment = { a: source.a.slice(), b: source.b.slice(), nx: source.nx, nz: source.nz };
      for (var index = 0; index < merged.length; index++) {
        var other = merged[index], dx = segment.b[0] - segment.a[0], dz = segment.b[1] - segment.a[1];
        var length = Math.hypot(dx, dz), ux = dx / length, uz = dz / length;
        var from = (other.a[0] - segment.a[0]) * ux + (other.a[1] - segment.a[1]) * uz;
        var to = (other.b[0] - segment.a[0]) * ux + (other.b[1] - segment.a[1]) * uz;
        if (Math.abs((other.a[0] - segment.a[0]) * uz - (other.a[1] - segment.a[1]) * ux) > tolerance ||
            Math.abs((other.b[0] - segment.a[0]) * uz - (other.b[1] - segment.a[1]) * ux) > tolerance ||
            Math.max(from, to) < -tolerance || Math.min(from, to) > length + tolerance) continue;
        var low = Math.min(0, from, to), high = Math.max(length, from, to);
        segment.b = [segment.a[0] + ux * high, segment.a[1] + uz * high];
        segment.a = [segment.a[0] + ux * low, segment.a[1] + uz * low];
        merged.splice(index, 1);
        index = -1;
      }
      if (Math.hypot(segment.b[0] - segment.a[0], segment.b[1] - segment.a[1]) > tolerance) merged.push(segment);
    });
    return merged;
  }

  function buildCorridorWalls() {
    var polygons = corridorPolygons.concat(Object.keys(roomPolygons).map(function (id) { return roomPolygons[id]; }));
    var edges = [], tolerance = 0.00001, segments = [];
    polygons.forEach(function (polygon) {
      polygon.forEach(function (point, index) { edges.push({ a: point, b: polygon[(index + 1) % polygon.length] }); });
    });
    function onFloor(x, z) {
      return polygons.some(function (polygon) { return insidePolygon(x, z, polygon); });
    }
    corridorPolygons.forEach(function (polygon) {
      polygon.forEach(function (start, index) {
        var end = polygon[(index + 1) % polygon.length], dx = end[0] - start[0], dz = end[1] - start[1];
        var length = Math.hypot(dx, dz), cuts = [0, 1];
        edges.forEach(function (edge) {
          var ex = edge.b[0] - edge.a[0], ez = edge.b[1] - edge.a[1];
          var ax = edge.a[0] - start[0], az = edge.a[1] - start[1], cross = dx * ez - dz * ex;
          if (Math.abs(cross) > tolerance) {
            var along = (ax * ez - az * ex) / cross, across = (ax * dz - az * dx) / cross;
            if (along > 0 && along < 1 && across >= -tolerance && across <= 1 + tolerance) cuts.push(along);
          } else if (Math.abs(ax * dz - az * dx) < tolerance) {
            [edge.a, edge.b].forEach(function (point) {
              var along = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dz) / (length * length);
              if (along > 0 && along < 1) cuts.push(along);
            });
          }
        });
        cuts.sort(function (left, right) { return left - right; });
        for (var cut = 1; cut < cuts.length; cut++) {
          if ((cuts[cut] - cuts[cut - 1]) * length < tolerance) continue;
          var middle = (cuts[cut - 1] + cuts[cut]) / 2;
          var x = start[0] + dx * middle, z = start[1] + dz * middle;
          var nx = -dz / length, nz = dx / length;
          var left = onFloor(x + nx * 0.001, z + nz * 0.001), right = onFloor(x - nx * 0.001, z - nz * 0.001);
          if (left === right || wallSegments.concat(doorSegments).some(function (wall) {
            return distanceToSegment(x, z, wall) < tolerance;
          })) continue;
          segments.push({ a: [start[0] + dx * cuts[cut - 1], start[1] + dz * cuts[cut - 1]],
            b: [start[0] + dx * cuts[cut], start[1] + dz * cuts[cut]], nx: left ? nx : -nx, nz: left ? nz : -nz });
        }
      });
    });
    corridorWalls = mergeWallSegments(segments);
    renderedWalls = mergeWallSegments(wallSegments.concat(corridorWalls));
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
    buildCorridorWalls();
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
  var taskBag = [];
  var lastQuest = "";
  var ward = "C9";
  var currentVariant = null;
  var stageIndex = 0;
  var stageAttempts = 0;
  var stageResults = [];
  var lastResult = null;
  var variantBags = Object.create(null);
  var taskProps = Object.create(null);
  var scenarioProps = Object.fromEntries(catalog.map(function (item) {
    return [item.id, Array.from(new Set(item.variants.flatMap(function (entry) {
      return entry.stages.map(function (entryStage) { return entryStage.target; });
    })))];
  }));
  var targetNames = { computer: "護士站電腦", intake: "收症文件", lift: "升降機大堂核對點",
    bedside: "床邊評估", medication: "藥房核對枱", dining: "飯廳餐單", visitor: "探病室預約簿",
    isolation: "隔離房檢查表", handover: "護士站交更簿", secl: "冷靜房病人", trolley: "急救車", incident: "事發位置" };
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
    var entry = currentStage();
    var text = entry ? currentVariant.title + " · " + (stageIndex + 1) + "/" + currentVariant.stages.length +
      "：" + (step === "push" ? "推急救車到" : "前往") + targetNames[entry.target] : "巡房中";
    var node = el("wardQuestLabel");
    if (node) node.textContent = text;
    var room = el("wardRoomLabel");
    if (room) room.textContent = ward + " · " + roomNameAt(player.x, player.z);
  }
  function currentStage() { return currentVariant && currentVariant.stages[stageIndex]; }

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
    el("wardProfile").value = ward;
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
      var source = q.source;
      var reference = source ? " 來源：" + source.file + "／" + source.section + (source.override ? "（已確認更新）" : "") : "";
      el("battleText").textContent = (ok ? "答啱。 " : "呢個選擇未係最適切。 ") + q.explain +
        (ok ? "" : " " + q.recovery) + reference;
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
      if (!battle.lastOk) {
        battle.phase = "ask";
        battle.cursor = 0;
        renderBattle();
        return;
      }
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
    stageAttempts += 1;
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
    var entry = currentStage();
    stageResults.push({ index: stageIndex, target: entry.target, correctFirstAttempt: stageAttempts === 1,
      corrected: stageAttempts > 1, attempts: stageAttempts });
    if (entry.action === "collect") pushing = true;
    if (entry.action === "deliver") pushing = false;
    stageIndex += 1;
    stageAttempts = 0;
    if (!currentStage()) {
      lastResult = { ward: ward, family: quest, variant: currentVariant.id, stages: stageResults.slice() };
      say(["情境完成。已核對及記錄 " + stageResults.length + " 步；修正 " +
        stageResults.filter(function (result) { return result.corrected; }).length + " 步。全部個案均屬虛構。"], clearQuest);
    } else {
      step = currentStage().action === "deliver" ? "push" : "go:" + currentStage().target;
      updateNPCs();
      setQuestLabel();
    }
  }
  function clearQuest() {
    quest = "";
    step = "idle";
    pushing = false;
    triggeredPush = false;
    travel = 0;
    currentVariant = null;
    stageIndex = 0;
    stageResults = [];
    stageAttempts = 0;
    updateNPCs();
    setQuestLabel();
  }
  function beginScenario(item, entry) {
    quest = item.id;
    currentVariant = entry;
    stageIndex = 0;
    stageAttempts = 0;
    stageResults = [];
    step = "intro";
    trolley.x = MARK.trolley.x;
    trolley.z = MARK.trolley.z;
    if (trolleyMesh) trolleyMesh.position.set(trolley.x, 0, trolley.z);
    pushing = false;
    triggeredPush = false;
    updateNPCs();
    say([ward + " · " + item.title + "：" + entry.title + "（虛構）", entry.stages[0].q], function () {
      step = "go:" + currentStage().target;
      setQuestLabel();
    });
  }
  function onTravel(meters) {
    if (!active || paused || dialog || battle || menuOpen || mapOpen) return;
    if (quest && step === "push" && !triggeredPush && near(trolley.x, trolley.z, MARK.incident.x, MARK.incident.z) &&
      propStatus("incident").problems.length === 0 && clearPath(trolley.x, trolley.z, MARK.incident.x, MARK.incident.z)) {
      triggeredPush = true;
      step = "battle";
      openBattle(currentVariant.title, [currentStage()]);
      return;
    }
    if (quest) return;
    travel += meters;
    if (travel < (lastQuest ? 16 : 7)) return;
    travel = 0;
    var ready = catalog.filter(function (item) { return readyVariants(item).length > 0; }).map(function (item) { return item.id; });
    if (ready.length === 1 && ready[0] === lastQuest) ready = [];
    taskBag = taskBag.filter(function (id) { return ready.indexOf(id) !== -1; });
    if (!ready.length) {
      say(["任務設備暫時未準備好，請返回主畫面後重新進入病房。"]);
      return;
    }
    if (!taskBag.length) {
      taskBag = ready.slice();
      for (var index = taskBag.length - 1; index > 0; index--) {
        var target = Math.floor(Math.random() * (index + 1)), item = taskBag[index];
        taskBag[index] = taskBag[target];
        taskBag[target] = item;
      }
      if (taskBag.length > 1 && taskBag[0] === lastQuest) {
        var first = taskBag[0];
        taskBag[0] = taskBag[1];
        taskBag[1] = first;
      }
    }
    lastQuest = taskBag.shift();
    var selected = catalog.find(function (item) { return item.id === lastQuest; });
    var variants = readyVariants(selected);
    var available = variants.map(function (entry) { return entry.id; });
    var variantKey = ward + ":" + lastQuest;
    var bag = (variantBags[variantKey] || []).filter(function (id) { return available.indexOf(id) !== -1; });
    if (!bag.length) bag = available.slice();
    var variantId = bag.shift();
    variantBags[variantKey] = bag;
    beginScenario(selected, variants.find(function (entry) { return entry.id === variantId; }));
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
      if (trolleyMesh) trolleyMesh.position.set(trolley.x, 0, trolley.z);
    }
    player.x += dx;
    player.z += dz;
    if (dx || dz) player.rot = Math.atan2(dx, dz);
    return Math.sqrt(dx * dx + dz * dz);
  }

  function clearPath(ax, az, bx, bz) {
    var distance = dist(ax, az, bx, bz);
    var steps = Math.max(1, Math.ceil(distance / (NAV / 2)));
    for (var index = 0; index <= steps; index++) {
      var fraction = index / steps;
      if (!canStand(ax + (bx - ax) * fraction, az + (bz - az) * fraction)) return false;
    }
    return true;
  }

  function npcReachable(npc) {
    return near(player.x, player.z, npc.mesh.position.x, npc.mesh.position.z) &&
      clearPath(player.x, player.z, npc.mesh.position.x, npc.mesh.position.z);
  }

  function registerProp(id, mesh, anchor, scenario) {
    mesh.userData.prop = id;
    taskProps[id] = { mesh: mesh, anchor: anchor, scenario: scenario || "" };
    return mesh;
  }

  function propStatus(id, preparing) {
    var prop = taskProps[id], problems = [];
    if (!prop) return { id: id, problems: ["missing model"] };
    var point = MARK[prop.anchor];
    if (id === "trolley" && !preparing) point = trolley;
    if (id === "admitPatient") {
      var anchor = LAY.npcs[patientAnchor()];
      point = { x: anchor[0] * TILE, z: anchor[1] * TILE };
    }
    var attached = false, visible = true;
    for (var parent = prop.mesh; parent; parent = parent.parent) {
      if (!parent.visible) visible = false;
      if (parent === scene) attached = true;
    }
    var position = prop.mesh.getWorldPosition(new THREE.Vector3());
    if (!attached) problems.push("missing model");
    if (!visible && !(preparing && prop.scenario)) problems.push("hidden model");
    var approaches = [point];
    if (id === "admitPatient" && preparing) {
      ["admitLift", "admitIntake"].forEach(function (name) {
        var anchor = LAY.npcs[name];
        approaches.push(anchor && { x: anchor[0] * TILE, z: anchor[1] * TILE });
      });
    }
    if (approaches.some(function (approach) {
      return !approach || !Number.isFinite(approach.x) || !Number.isFinite(approach.z) || !canStand(approach.x, approach.z) ||
        pathMeters(MARK.start.x, MARK.start.z, approach.x, approach.z) < 0;
    })) problems.push("unreachable approach");
    if (point && !(id === "trolley" && preparing) && !near(point.x, point.z, position.x, position.z)) problems.push("misplaced model");
    return { id: id, x: position.x, z: position.z, anchor: point ? { x: point.x, z: point.z } : null,
      visible: visible, problems: problems };
  }

  function scenarioProblems(id) {
    var item = catalog.find(function (entry) { return entry.id === id; });
    if (!item || !eligibleVariants(item, ward).length) return ["not eligible for " + ward];
    var variants = eligibleVariants(item, ward);
    if (variants.some(function (entry) { return variantProblems(entry).length === 0; })) return [];
    return variants.flatMap(variantProblems);
  }
  function variantProblems(entry) {
    var props = Array.from(new Set(entry.stages.map(function (entryStage) { return entryStage.target; })));
    if (entry.stages.some(function (entryStage) { return entryStage.target === "lift"; })) props.push("admitPatient");
    var problems = props.flatMap(function (prop) {
      return propStatus(prop, true).problems.map(function (problem) { return prop + ": " + problem; });
    });
    entry.stages.forEach(function (entryStage) {
      var anchor = LAY.npcs[patientAnchor(entryStage.target)];
      if (!anchor || !canStand(anchor[0] * TILE, anchor[1] * TILE) ||
        pathMeters(MARK.start.x, MARK.start.z, anchor[0] * TILE, anchor[1] * TILE) < 0) {
        problems.push("patient: unreachable approach");
      }
    });
    return problems;
  }
  function readyVariants(item) {
    return eligibleVariants(item, ward).filter(function (entry) { return variantProblems(entry).length === 0; });
  }

  function canUseProp(id) {
    var status = propStatus(id);
    return !status.problems.length && near(player.x, player.z, status.anchor.x, status.anchor.z) &&
      clearPath(player.x, player.z, status.anchor.x, status.anchor.z);
  }

  function npcMessage(npc) {
    if (npc.id === "nurse1") return quest === "code" ? "我會留喺病人身邊。請帶急救車返嚟。" : "你好，我喺病房協助照顧病人。";
    if (npc.id === "nurse2") return "需要記錄或處理文件，可以返護士站。";
    if (npc.id === "nurse3") return "照顧病人時，記得核對身份同留意私隱。";
    if (npc.id === "codePatient") return "病人暫時沒有回應，同事正留在旁邊。";
    if (npc.id === "admitPatient") return "你好，我會等候同事核對及解釋安排。";
    return "我有啲緊張，可以先同我解釋嗎？";
  }

  function tryInteract() {
    if (!active || paused || menuOpen || mapOpen) return;
    if (battle) { confirmChoice(); return; }
    if (dialog) { advanceDialog(); return; }
    var entry = currentStage();
    if (entry && step !== "push" && canUseProp(entry.target)) {
      if (entry.target === "lift" && propStatus("admitPatient").problems.length) return;
      step = "battle";
      openBattle(currentVariant.title, [entry]);
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
    placeNPC(npcs.admitPatient, patientAnchor());
    npcs.admitPatient.mesh.visible = !!quest && quest !== "code" && quest !== "rest";
    placeNPC(npcs.restPatient, "restPatient");
    npcs.restPatient.mesh.visible = quest === "rest";
    if (incidentMesh) incidentMesh.visible = quest === "code" && currentVariant && currentVariant.id === "code000";
  }
  function patientAnchor(target) {
    target = target || (currentStage() && currentStage().target) || "lift";
    if (target === "lift") return "admitLift";
    if (target === "incident" || target === "trolley") return "codePatient";
    if (target === "secl") return "restPatient";
    return LAY.npcs["at_" + target] ? "at_" + target : "admitIntake";
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
    var walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.15, 0.18), mat(0xf0f2ec), renderedWalls.length);
    var dummy = new THREE.Object3D();
    renderedWalls.forEach(function (segment, index) {
      var dx = segment.b[0] - segment.a[0], dz = segment.b[1] - segment.a[1];
      dummy.position.set((segment.a[0] + segment.b[0]) / 2, 0.575, (segment.a[1] + segment.b[1]) / 2);
      dummy.rotation.set(0, -Math.atan2(dz, dx), 0);
      dummy.scale.set(Math.hypot(dx, dz), 1, 1);
      dummy.updateMatrix();
      walls.setMatrixAt(index, dummy.matrix);
    });
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
    registerProp("incident", npcs.codePatient.mesh, "incident", "code");
    registerProp("admitPatient", npcs.admitPatient.mesh, "lift", "admit");
    registerProp("secl", npcs.restPatient.mesh, "secl", "rest");
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
    registerProp("trolley", trolleyMesh, "trolley");
    scene.add(trolleyMesh);

    incidentMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), mat(0xe23b32));
    incidentMesh.position.set(MARK.incident.x, 0.08, MARK.incident.z);
    incidentMesh.visible = false;
    scene.add(incidentMesh);
    built = true;
  }

  function addCorridorDetails() {
    var rails = [];
    corridorWalls.forEach(function (wall) {
      var dx = wall.b[0] - wall.a[0], dz = wall.b[1] - wall.a[1], length = Math.hypot(dx, dz);
      for (var along = 0.55; along < length - 0.55; along += 0.85) {
        rails.push({ x: wall.a[0] + dx * along / length + wall.nx * 0.13,
          z: wall.a[1] + dz * along / length + wall.nz * 0.13, angle: -Math.atan2(dz, dx) });
      }
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
    registerProp("fax", addBox(room, 0.55, 0.25, 0.4, 0x687a79, faxX, 0.94, faxZ), "fax");
    addBox(room, 0.28, 0.035, 0.22, 0xf8faf8, faxX, 1.08, faxZ - 0.08);
    registerProp("computer", addBox(room, 0.45, 0.3, 0.07, 0x485c5d, computerX, 1.05, computerZ - 0.08), "computer");
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

    [["bedside", "b1"], ["medication", "med"], ["dining", "dine"],
      ["visitor", "vis1"], ["isolation", "iso1"], ["handover", "nurse"]].forEach(function (definition) {
      var id = definition[0], parent = roomGroup(definition[1]);
      var point = parent.worldToLocal(new THREE.Vector3(MARK[id].x, 0, MARK[id].z));
      if (id === "bedside" || id === "handover" || id === "isolation") addTable(parent, point.x, point.z, 0.65, 0.45);
      registerProp(id, addBox(parent, 0.3, 0.05, 0.38, 0x327d75, point.x, 0.87, point.z), id);
      var label = labelSprite(targetNames[id]);
      label.scale.set(1.3, 0.24, 1);
      label.position.set(point.x, 1.3, point.z);
      parent.add(label);
    });

    room = roomGroup("intake");
    addTable(room, 2.3, 2.95, 1.4, 0.7);
    registerProp("intake", addBox(room, 0.32, 0.025, 0.42, 0x667e79, 2.3, 0.83, 2.95), "intake");
    addBox(room, 0.26, 0.012, 0.32, 0xf8faf8, 2.3, 0.85, 2.95);
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
    registerProp("lift", addBox(room, 0.16, 0.18, 0.2, 0x52766d, 0.2, 1.2, 3.45), "lift");
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
    var objective = currentStage() && MARK[currentStage().target];
    if (objective) {
      ctx.strokeStyle = "#ffe04c";
      ctx.lineWidth = labels ? 4 : 3;
      ctx.beginPath();
      ctx.arc(mx(objective.x), mz(objective.z), labels ? 10 : 5, 0, Math.PI * 2);
      ctx.stroke();
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
    el("wardMapGoal").textContent = ward + " · " + (currentStage() ? targetNames[currentStage().target] : "巡房中");
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
    if (incidentMesh) incidentMesh.visible = quest === "code" && currentVariant && currentVariant.id === "code000";
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
    if (roomNode) roomNode.textContent = ward + " · " + roomNameAt(player.x, player.z);
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
    taskBag = [];
    lastQuest = "";
    currentVariant = null;
    stageIndex = 0;
    stageAttempts = 0;
    stageResults = [];
    lastResult = null;
    variantBags = Object.create(null);
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
    if (trolleyMesh) trolleyMesh.position.set(trolley.x, 0, trolley.z);
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
    el("wardProfile").addEventListener("change", function () {
      var next = el("wardProfile").value;
      if (next === ward) return;
      if (quest) {
        show("wardProfileConfirm", true);
      } else {
        changeWard(next);
      }
    });
    el("wardProfileCancel").addEventListener("click", function () {
      el("wardProfile").value = ward;
      show("wardProfileConfirm", false);
    });
    el("wardProfileApply").addEventListener("click", function () { changeWard(el("wardProfile").value); });
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
      if (e.target.matches && e.target.matches("select, input, textarea")) return;
      var dir = dirOfKey(e);
      if (dir) {
        e.preventDefault();
        if (paused) return;
        if (battle && battle.phase === "ask" && !e.repeat) {
          var count = battle.qs[battle.i].options.length;
          if (dir === "up" || dir === "left") battle.cursor = (battle.cursor + count - 1) % count;
          else battle.cursor = (battle.cursor + 1) % count;
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
  function changeWard(next) {
    if (next !== "C9" && next !== "C7") return;
    ward = next;
    resetPlay();
    show("wardProfileConfirm", false);
  }
  function stop() { active = false; keys = { up: false, down: false, left: false, right: false }; joy.on = false; }

  window.WardMode = {
    catalog: function () { return JSON.parse(JSON.stringify(catalog)); },
    policies: policies,
    variants: function (id, ward) {
      var item = catalog.find(function (entry) { return entry.id === id; });
      return item ? JSON.parse(JSON.stringify(eligibleVariants(item, ward))) : [];
    },
    start: start,
    stop: stop,
    setPaused: function (on) { paused = !!on; },
    active: function () { return active; },
    state: function () {
      return {
        x: player.x, z: player.z, rot: player.rot, pushing: pushing,
        tx: trolley.x, tz: trolley.z, quest: quest, step: step,
        ward: ward, variant: currentVariant ? currentVariant.id : "", stageIndex: stageIndex,
        target: currentStage() ? currentStage().target : "", stageAction: currentStage() ? currentStage().action : "",
        stages: currentVariant ? currentVariant.stages.length : 0, attempts: stageAttempts,
        stageResults: stageResults.slice(), lastResult: lastResult,
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
    slide: function (dx, dz) {
      if (!active || paused || dialog || battle || menuOpen || mapOpen) return 0;
      var m = slide(dx, dz); if (m) onTravel(m); return m;
    },
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
        wallGeometry: { corridors: corridorWalls, rendered: renderedWalls, doors: doorSegments,
          corridorPolygons: corridorPolygons, roomPolygons: roomPolygons },
        props: Object.keys(taskProps).map(function (id) { return propStatus(id); }),
        scenarios: built ? catalog.filter(function (item) { return eligibleVariants(item, ward).length > 0; }).map(function (item) {
          var id = item.id;
          return { id: id, props: scenarioProps[id].slice(), problems: scenarioProblems(id) };
        }) : [],
        npcs: Object.keys(npcs).map(function (id) {
          var npc = npcs[id];
          return { id: id, role: npc.role, x: npc.mesh.position.x, z: npc.mesh.position.z, visible: npc.mesh.visible };
        }), mapLabels: mapLabelPositions.map(function (label) {
          return { id: label.id, x: label.x, y: label.y, radius: label.radius };
        }), rooms: SHELL.rooms.map(function (r) { return r.id; }), problems: layoutProblems.slice() };
    }
  };
})();
