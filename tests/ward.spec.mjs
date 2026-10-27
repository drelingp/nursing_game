import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gameUrl = pathToFileURL(resolve(root, 'game.html')).href;
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);
const chromePath = chromeCandidates.find(path => existsSync(path));

test.use({
  viewport: { width: 1440, height: 900 },
  launchOptions: {
    ...(chromePath ? { executablePath: chromePath } : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  }
});

async function openOffline(context, page) {
  const externalRequests = [];
  await context.route(/^https?:/, route => {
    externalRequests.push(route.request().url());
    return route.abort();
  });
  await context.setOffline(true);
  await page.goto(gameUrl);
  return externalRequests;
}

async function enterWard(page) {
  await page.locator('#btnWard').click();
  await expect(page.locator('#wardFallback')).toBeHidden();
  await page.waitForFunction(() => window.WardMode && window.WardMode.state().camera === 'ortho');
}

async function attachScreenshot(page, testInfo, name) {
  const path = testInfo.outputPath(name + '.png');
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test('reference layout retains the bedroom scale and diagonal wing', () => {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(resolve(root, 'ward-shell.js'), 'utf8'), sandbox);
  const layout = sandbox.window.WARD_SHELL.layout;
  const first = layout.rooms.b1;
  const second = layout.rooms.b2;
  expect(Array.from(first.rect.slice(2))).toEqual([8, 6]);
  expect(Array.from(second.rect.slice(2))).toEqual([8, 6]);
  expect(Math.abs(first.angle || 0)).toBeGreaterThan(0.4);
  expect(Math.abs(first.angle || 0)).toBeLessThan(0.8);
  expect(second.angle).toBeCloseTo(first.angle);
  expect(first.rect[0]).toBeGreaterThan(second.rect[0]);
  expect(first.rect[1]).toBeLessThan(second.rect[1]);
  const area = room => {
    if (!room.polygon) return room.rect[2] * room.rect[3];
    return Math.abs(room.polygon.reduce((sum, point, index) => {
      const next = room.polygon[(index + 1) % room.polygon.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0)) / 2;
  };
  const bedroom = area(first);
  for (const [ids, min, max] of [
    [['iso1', 'secl'], 0.2, 0.4],
    [['bath', 'med'], 0.1, 0.3],
    [['treat', 'con1', 'vis1', 'train', 'lift', 'intake'], 0.35, 0.75],
    [['nurse'], 0.3, 0.65], [['dine'], 1.1, 1.7], [['garden'], 3.8, 5.4]
  ]) {
    for (const id of ids) {
      expect(area(layout.rooms[id]) / bedroom, id).toBeGreaterThanOrEqual(min);
      expect(area(layout.rooms[id]) / bedroom, id).toBeLessThanOrEqual(max);
    }
  }
  expect(layout.rooms.bath.rect[0]).toBeLessThan(layout.rooms.con1.rect[0]);
  expect(layout.rooms.con1.rect[0]).toBeLessThan(layout.rooms.vis1.rect[0]);
  expect(layout.rooms.lift.rect[1]).toBeGreaterThan(layout.rooms.vis1.rect[1]);
  expect(layout.rooms.garden.rect[0]).toBeLessThan(layout.rooms.dine.rect[0]);
});

test('reference layout keeps all mission markers reachable', () => {
  const sandbox = { console: { warn() {} } };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(resolve(root, 'ward-shell.js'), 'utf8'), sandbox);
  vm.runInContext(readFileSync(resolve(root, 'ward.bundle.js'), 'utf8'), sandbox);
  const mode = sandbox.WardMode;
  const markers = mode.markers();
  expect(Array.from(mode.audit().problems)).toEqual([]);
  for (const [name, point] of Object.entries(markers)) {
    expect(mode.walkable(point.x, point.z), name).toBe(true);
    expect(mode.pathMeters(markers.start.x, markers.start.z, point.x, point.z), name).toBeGreaterThanOrEqual(0);
  }
  const layout = sandbox.window.WARD_SHELL.layout;
  for (const [name, roomId] of Object.entries({ trolley: 'treat', fax: 'nurse', computer: 'nurse',
    lift: 'lift', intake: 'intake', secl: 'secl', treat: 'treat', nurse: 'nurse' })) {
    const room = layout.rooms[roomId], [left, top, width, depth] = room.rect;
    const angle = room.angle || 0, point = markers[name];
    const dx = point.x / layout.tile - left - width / 2, dz = point.z / layout.tile - top - depth / 2;
    const x = dx * Math.cos(angle) - dz * Math.sin(angle) + width / 2;
    const z = dx * Math.sin(angle) + dz * Math.cos(angle) + depth / 2;
    expect(x, name + ' room x').toBeGreaterThan(0);
    expect(x, name + ' room x').toBeLessThan(width);
    expect(z, name + ' room z').toBeGreaterThan(0);
    expect(z, name + ' room z').toBeLessThan(depth);
  }
});

test('map preserves exact rooms, doors, markers, and lift isolation', async ({ context, page }) => {
  const externalRequests = await openOffline(context, page);
  const result = await page.evaluate(() => {
    const layout = window.WARD_SHELL.layout;
    const mode = window.WardMode;
    const start = mode.markers().start;
    const rooms = mode.rooms.map(room => {
      const def = layout.rooms[room.id];
      const center = { x: (def.rect[0] + def.rect[2] / 2) * layout.tile, z: (def.rect[1] + def.rect[3] / 2) * layout.tile };
      return { id: room.id, name: room.name, rect: def.rect, doors: def.doors,
        reachable: mode.walkable(center.x, center.z) && mode.pathMeters(start.x, start.z, center.x, center.z) >= 0 };
    });
    const markers = Object.fromEntries(Object.entries(mode.markers()).map(([name, point]) => [name, mode.walkable(point.x, point.z) && mode.pathMeters(start.x, start.z, point.x, point.z) >= 0]));
    const visit = layout.rooms.vis1;
    const nav = layout.navTile;
    const seen = new Set(), queue = [[Math.floor(start.x / nav), Math.floor(start.z / nav)]];
    for (let index = 0; index < queue.length; index++) {
      const [col, row] = queue[index], key = col + ',' + row;
      const x = (col + 0.5) * nav, z = (row + 0.5) * nav;
      const insideVisit = x >= visit.rect[0] * layout.tile && x <= (visit.rect[0] + visit.rect[2]) * layout.tile &&
        z >= visit.rect[1] * layout.tile && z <= (visit.rect[1] + visit.rect[3]) * layout.tile;
      if (seen.has(key) || insideVisit || !mode.walkable(x, z)) continue;
      seen.add(key);
      queue.push([col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]);
    }
    const lift = mode.markers().lift;
    const first = layout.rooms.b1, angle = first.angle;
    const wallX = (first.rect[0] + first.rect[2] / 2 - first.rect[3] / 2 * Math.sin(angle)) * layout.tile;
    const wallZ = (first.rect[1] + first.rect[3] / 2 - first.rect[3] / 2 * Math.cos(angle)) * layout.tile;
    return { rooms, markers, enclosure: mode.enclosure(), problems: mode.audit().problems,
      liftReachableWithoutVisit: seen.has(Math.floor(lift.x / nav) + ',' + Math.floor(lift.z / nav)),
      wallWalkable: mode.walkable(wallX, wallZ), outsideWalkable: mode.walkable(-1, -1) };
  });
  expect(externalRequests).toEqual([]);
  expect(result.problems).toEqual([]);
  expect(result.rooms).toHaveLength(15);
  expect(result.rooms.map(room => room.id)).not.toContain('comm');
  for (const id of ['calm', 'duty', 'pantry', 'group']) expect(result.rooms.map(room => room.id)).not.toContain(id);
  for (const room of result.rooms) {
    const stat = result.enclosure.byRoom[room.id];
    expect(stat.n, room.id + ' area').toBeGreaterThan(0);
    expect(stat.door, room.id + ' doors').toBe(room.doors.length);
    expect(room.reachable, room.id + ' reachable').toBe(true);
  }
  const visit = result.rooms.find(room => room.id === 'vis1');
  const lift = result.rooms.find(room => room.id === 'lift');
  const nurse = result.rooms.find(room => room.id === 'nurse');
  expect(visit.name).toBe('探病室');
  expect(lift.name).toBe('升降機大堂');
  expect(visit.doors).toHaveLength(2);
  expect(lift.doors).toHaveLength(1);
  expect(nurse.doors).toHaveLength(2);
  expect(nurse.doors.map(door => door.edge).sort()).toEqual([1, 3]);
  expect(Object.values(result.markers).every(Boolean)).toBe(true);
  expect(result.liftReachableWithoutVisit).toBe(false);
  expect(result.wallWalkable).toBe(false);
  expect(result.outsideWalkable).toBe(false);
});

test('map audit rejects invalid doors, overlaps, bypasses, and unreachable markers', () => {
  const shell = readFileSync(resolve(root, 'ward-shell.js'), 'utf8');
  const bundle = readFileSync(resolve(root, 'ward.bundle.js'), 'utf8');
  function inspect(change) {
    const sandbox = { console: { warn() {} } };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(shell, sandbox);
    change(sandbox.WARD_SHELL.layout);
    vm.runInContext(bundle, sandbox);
    return Array.from(sandbox.WardMode.audit().problems);
  }
  const bypass = inspect(layout => layout.rooms.lift.doors.push({ edge: 3, at: 0.5, width: 2 }));
  expect(bypass.some(problem => problem.includes('直接連接病房'))).toBe(true);
  const invalidDoor = inspect(layout => { layout.rooms.treat.doors[0].at = 0; });
  expect(invalidDoor.some(problem => problem.includes('treat 門口無效'))).toBe(true);
  const overlap = inspect(layout => { layout.rooms.intake.rect = [36.7, 37.4, 4, 4.5]; });
  expect(overlap.some(problem => problem.includes('intake / treat 房間重疊'))).toBe(true);
  expect(overlap.some(problem => problem.includes('treat 有未標示出口'))).toBe(true);
  const marker = inspect(layout => { layout.marks.intake = [0, 0]; });
  expect(marker.some(problem => problem.includes('intake 標記行唔到'))).toBe(true);
});

test('reference layout renders beds and furniture inside rotated rooms', async ({ context, page }) => {
  await openOffline(context, page);
  await enterWard(page);
  const result = await page.evaluate(() => ({ audit: window.WardMode.audit(), layout: window.WARD_SHELL.layout }));
  expect(result.audit.problems).toEqual([]);
  expect(result.audit.beds).toEqual({ b1: 6, b2: 6, iso1: 1 });
  expect(result.audit.plants).toBeGreaterThanOrEqual(9);
  for (const room of result.audit.rooms) expect(result.audit.furniture[room], room + ' furniture').toBeGreaterThan(0);
  for (const id of ['b1', 'b2']) {
    const def = result.layout.rooms[id], rect = def.rect, tile = result.layout.tile;
    const center = [(rect[0] + rect[2] / 2) * tile, (rect[1] + rect[3] / 2) * tile];
    const local = point => {
      const dx = point.x - center[0], dz = point.z - center[1];
      return { x: dx * Math.cos(def.angle) - dz * Math.sin(def.angle) + rect[2] * tile / 2,
        z: dx * Math.sin(def.angle) + dz * Math.cos(def.angle) + rect[3] * tile / 2,
        rotation: point.rotation };
    };
    const beds = result.audit.bedPositions.filter(bed => bed.room === id).map(local)
      .sort((a, b) => Math.abs(a.z - b.z) > 0.01 ? a.z - b.z : a.x - b.x);
    expect(beds).toHaveLength(6);
    for (const bed of beds.slice(0, 3)) {
      expect(bed.z).toBeCloseTo(0.88 * tile);
      expect(bed.rotation).toBeCloseTo(def.angle);
    }
    for (const bed of beds.slice(3)) {
      expect(bed.z).toBeCloseTo(5.12 * tile);
      expect(bed.rotation).toBeCloseTo(def.angle + Math.PI);
    }
    for (const row of [beds.slice(0, 3), beds.slice(3)]) {
      expect(row[1].x - row[0].x).toBeGreaterThan(1.15);
      expect(row[2].x - row[1].x).toBeGreaterThan(1.15);
      for (const bed of row) expect(bed.x).toBeGreaterThan(0.6);
      for (const bed of row) expect(bed.x).toBeLessThan(rect[2] * tile - 0.6);
    }
    const partitions = result.audit.partitions.filter(partition => partition.room === id).map(local);
    expect(partitions).toHaveLength(4);
    for (const partition of partitions) {
      const row = beds.filter(bed => Math.abs(bed.z - partition.z) < 0.2).sort((a, b) => a.x - b.x);
      expect(row).toHaveLength(3);
      expect(row.some((bed, index) => index < 2 && partition.x > bed.x + 0.6 && partition.x < row[index + 1].x - 0.6)).toBe(true);
    }
  }
});

test('NPC nurses remain present while mission patients start hidden', async ({ context, page }) => {
  await openOffline(context, page);
  await enterWard(page);
  const result = await page.evaluate(() => {
    const npcs = window.WardMode.audit().npcs || [];
    return { npcs, walkable: npcs.filter(npc => npc.role === 'nurse').map(npc => window.WardMode.walkable(npc.x, npc.z)) };
  });
  expect(result.npcs.filter(npc => npc.role === 'nurse' && npc.visible)).toHaveLength(3);
  expect(result.npcs.filter(npc => npc.role === 'patient')).toHaveLength(3);
  expect(result.npcs.filter(npc => npc.role === 'patient' && npc.visible)).toHaveLength(0);
  expect(result.walkable.every(Boolean)).toBe(true);
});

async function moveToPoint(page, target) {
  const result = await page.evaluate(target => {
    const mode = window.WardMode, tile = window.WARD_SHELL.layout.navTile, state = mode.state();
    const start = [Math.floor(state.x / tile), Math.floor(state.z / tile)];
    const targetCol = Math.floor(target.x / tile), targetRow = Math.floor(target.z / tile);
    const key = (col, row) => col + ',' + row;
    const queue = [start], previous = new Map([[key(...start), null]]);
    for (let index = 0; index < queue.length; index++) {
      const [col, row] = queue[index];
      if (col === targetCol && row === targetRow) break;
      for (const [nextCol, nextRow] of [[col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]]) {
        const nextKey = key(nextCol, nextRow);
        if (previous.has(nextKey)) continue;
        const dx = nextCol - col, dz = nextRow - row;
        let clear = true;
        for (let part = 1; part <= 4; part++) {
          const x = (col + 0.5 + dx * part / 4) * tile, z = (row + 0.5 + dz * part / 4) * tile;
          if (!mode.walkable(x, z) || (state.pushing && !mode.walkable(x + dx * 0.85, z + dz * 0.85))) {
            clear = false;
            break;
          }
        }
        if (!clear) continue;
        previous.set(nextKey, key(col, row));
        queue.push([nextCol, nextRow]);
      }
    }
    const destination = key(targetCol, targetRow);
    if (!previous.has(destination)) return { kind: 'blocked', reason: 'no path', start, targetCol, targetRow };
    const path = [];
    for (let cursor = destination; cursor !== null; cursor = previous.get(cursor)) path.push(cursor.split(',').map(Number));
    path.reverse();
    for (const [col, row] of path) {
      const center = [(col + 0.5) * tile, (row + 0.5) * tile];
      for (const axis of ['x', 'z']) {
        const target = center[axis === 'x' ? 0 : 1];
        while (Math.abs(mode.state()[axis] - target) > 0.001) {
          const before = mode.state();
          if (before.dialog || before.battle) return { kind: 'interrupted', state: before };
          const delta = Math.sign(target - before[axis]) * Math.min(0.06, Math.abs(target - before[axis]));
          const moved = axis === 'x' ? mode.slide(delta, 0) : mode.slide(0, delta);
          if (!moved) return { kind: 'blocked', axis, delta, state: before, next: [col, row] };
          const after = mode.state();
          if (after.dialog || after.battle) return { kind: 'interrupted', state: after };
        }
      }
    }
    return { kind: 'arrived', state: mode.state() };
  }, target);
  expect(result.kind, JSON.stringify(result)).not.toBe('blocked');
  return result;
}

async function marker(page, name) {
  return page.evaluate(name => window.WardMode.markers()[name], name);
}

async function character(page, id) {
  return page.evaluate(id => window.WardMode.audit().npcs.find(npc => npc.id === id), id);
}

async function visiblePatients(page) {
  return page.evaluate(() => window.WardMode.audit().npcs.filter(npc => npc.role === 'patient' && npc.visible).map(npc => npc.id));
}

async function state(page) {
  return page.evaluate(() => window.WardMode.state());
}

async function dismissDialogs(page) {
  for (let index = 0; index < 8 && (await state(page)).dialog; index++) await page.keyboard.press('z');
  expect((await state(page)).dialog).toBe(false);
}

async function interact(page) {
  await page.locator('#wardBtnA').click();
}

async function answerQuestions(page, firstQuestion = 0) {
  for (let index = firstQuestion; index < 3; index++) {
    expect((await state(page)).battle).toBe('ask');
    await page.locator('.battle-opt').nth(index === 0 ? 0 : 1).click();
    expect((await state(page)).battle).toBe('explain');
    if (index === 0) await expect(page.locator('#battleText')).toContainText('未係最適切');
    await page.keyboard.press('z');
  }
  await dismissDialogs(page);
}

test('NPC interactions respect walls, pause, and restart', async ({ context, page }) => {
  test.setTimeout(120000);
  await openOffline(context, page);
  await enterWard(page);
  let nurse = await character(page, 'nurse1');
  let movement = await moveToPoint(page, nurse);
  if (movement.kind === 'interrupted') {
    await dismissDialogs(page);
    movement = await moveToPoint(page, nurse);
  }
  expect(movement.kind).toBe('arrived');
  await page.locator('#btnPause').click();
  await page.keyboard.press('z');
  expect((await state(page)).dialog).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlayPause')).toBeHidden();
  expect((await state(page)).menu).toBe(false);
  await page.locator('#wardMinimap').click();
  await page.keyboard.press('z');
  expect((await state(page)).dialog).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator('#wardMapOverlay')).toBeHidden();
  await interact(page);
  await expect(page.locator('#wardDialogText')).toContainText('留喺病人身邊');
  await dismissDialogs(page);
  expect((await state(page)).step).toBe('goTrolley');

  expect((await moveToPoint(page, await character(page, 'nurse2'))).kind).toBe('arrived');
  await interact(page);
  await expect(page.locator('#wardDialogText')).toContainText('處理文件');
  await dismissDialogs(page);
  expect((await moveToPoint(page, await character(page, 'nurse3'))).kind).toBe('arrived');
  await interact(page);
  await expect(page.locator('#wardDialogText')).toContainText('核對身份');
  await dismissDialogs(page);

  const outside = await page.evaluate(() => {
    const layout = window.WARD_SHELL.layout, rect = layout.rooms.con1.rect;
    const nurse = window.WardMode.audit().npcs.find(npc => npc.id === 'nurse3');
    return { x: (rect[0] + rect[2] + 0.65) * layout.tile, z: nurse.z };
  });
  expect((await moveToPoint(page, outside)).kind).toBe('arrived');
  nurse = await character(page, 'nurse3');
  const current = await state(page);
  expect(Math.hypot(current.x - nurse.x, current.z - nurse.z)).toBeLessThan(1.55);
  await interact(page);
  await expect(page.locator('#wardDialogText')).not.toContainText('核對身份');
  await dismissDialogs(page);
  expect((await state(page)).step).toBe('goTrolley');

  await page.locator('#btnHomeTop').click();
  await enterWard(page);
  expect((await state(page)).quest).toBe('');
  expect(await visiblePatients(page)).toEqual([]);
  expect((await page.evaluate(() => window.WardMode.audit().npcs.filter(npc => npc.role === 'nurse' && npc.visible))).length).toBe(3);
});

test('quests complete through real interactions and small-step trolley turns', async ({ context, page }, testInfo) => {
  test.setTimeout(120000);
  const requests = await openOffline(context, page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await enterWard(page);

  expect((await moveToPoint(page, await marker(page, 'trolley'))).kind).toBe('interrupted');
  expect((await state(page)).quest).toBe('code');
  await dismissDialogs(page);
  expect((await state(page)).step).toBe('goTrolley');
  expect(await visiblePatients(page)).toEqual(['codePatient']);
  const emergencyNurse = await character(page, 'nurse1'), emergencyPatient = await character(page, 'codePatient');
  expect(Math.hypot(emergencyNurse.x - emergencyPatient.x, emergencyNurse.z - emergencyPatient.z)).toBeLessThan(1.55);
  expect((await moveToPoint(page, { x: emergencyPatient.x + 0.7, z: emergencyPatient.z })).kind).toBe('arrived');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await attachScreenshot(page, testInfo, 'ward-emergency-characters');
  await interact(page);
  await expect(page.locator('#wardDialogText')).toContainText('病人暫時沒有回應');
  await dismissDialogs(page);
  expect((await state(page)).step).toBe('goTrolley');
  expect((await moveToPoint(page, await marker(page, 'trolley'))).kind).toBe('arrived');
  await interact(page);
  expect((await state(page)).pushing).toBe(true);
  await dismissDialogs(page);
  expect((await moveToPoint(page, await marker(page, 'incident'))).kind).toBe('interrupted');
  expect((await state(page)).step).toBe('battle');
  await dismissDialogs(page);
  await answerQuestions(page);
  expect((await state(page)).step).toBe('goFax');
  expect((await moveToPoint(page, await marker(page, 'fax'))).kind).toBe('arrived');
  await interact(page);
  expect((await state(page)).step).toBe('docs');
  await dismissDialogs(page);
  await interact(page);
  await dismissDialogs(page);
  expect((await state(page)).quest).toBe('');
  expect(await visiblePatients(page)).toEqual([]);

  expect((await moveToPoint(page, await marker(page, 'lift'))).kind).toBe('interrupted');
  expect((await state(page)).quest).toBe('admit');
  await dismissDialogs(page);
  expect(await visiblePatients(page)).toEqual(['admitPatient']);
  const admissionAtLift = await character(page, 'admitPatient');
  expect((await moveToPoint(page, { x: admissionAtLift.x - 0.7, z: admissionAtLift.z })).kind).toBe('arrived');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await attachScreenshot(page, testInfo, 'ward-admission-character');
  await interact(page);
  await expect(page.locator('#wardDialogText')).toContainText('等候收症');
  await dismissDialogs(page);
  expect((await state(page)).step).toBe('goElev');
  expect((await moveToPoint(page, await marker(page, 'lift'))).kind).toBe('arrived');
  await interact(page);
  await dismissDialogs(page);
  await answerQuestions(page);
  expect((await state(page)).step).toBe('goBed');
  const admissionAtIntake = await character(page, 'admitPatient');
  expect(Math.hypot(admissionAtIntake.x - admissionAtLift.x, admissionAtIntake.z - admissionAtLift.z)).toBeGreaterThan(2);
  expect((await moveToPoint(page, admissionAtIntake)).kind).toBe('arrived');
  await interact(page);
  await expect(page.locator('#wardDialogText')).toContainText('等候收症安排');
  await dismissDialogs(page);
  expect((await state(page)).step).toBe('goBed');
  expect((await moveToPoint(page, await marker(page, 'intake'))).kind).toBe('arrived');
  await interact(page);
  await dismissDialogs(page);
  expect((await state(page)).quest).toBe('');

  expect((await moveToPoint(page, await marker(page, 'secl'))).kind).toBe('interrupted');
  expect((await state(page)).quest).toBe('rest');
  await dismissDialogs(page);
  expect(await visiblePatients(page)).toEqual(['restPatient']);
  expect((await moveToPoint(page, await character(page, 'restPatient'))).kind).toBe('arrived');
  await interact(page);
  await expect(page.locator('#wardDialogText')).toContainText('先同我解釋');
  await dismissDialogs(page);
  expect((await state(page)).step).toBe('goRoom');
  expect((await moveToPoint(page, await marker(page, 'secl'))).kind).toBe('arrived');
  await interact(page);
  await dismissDialogs(page);
  await answerQuestions(page);
  expect((await state(page)).step).toBe('goNurse');
  expect((await moveToPoint(page, await marker(page, 'fax'))).kind).toBe('arrived');
  await interact(page);
  await dismissDialogs(page);
  expect((await state(page)).quest).toBe('');
  expect(await visiblePatients(page)).toEqual([]);
  const gardenPoint = await page.evaluate(() => {
    const layout = window.WARD_SHELL.layout, rect = layout.rooms.garden.rect;
    return { x: (rect[0] + 4) * layout.tile, z: (rect[1] + 6) * layout.tile };
  });
  let garden = await moveToPoint(page, gardenPoint);
  if (garden.kind === 'interrupted') {
    await dismissDialogs(page);
    expect(await visiblePatients(page)).toHaveLength(1);
    garden = await moveToPoint(page, gardenPoint);
  }
  expect(garden.kind).toBe('arrived');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await attachScreenshot(page, testInfo, 'ward-garden');
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

async function openOtherGames(page) {
  await page.locator('#btnHomeTop').click();
  await expect(page.locator('#screenHome')).toBeVisible();
  await page.locator('#btnSnake').click();
  await expect(page.locator('#screenPlay')).toBeVisible();
  await expect(page.locator('#questionText')).not.toBeEmpty();
  await page.keyboard.press('ArrowRight');
  await page.locator('#btnPause').click();
  await expect(page.locator('#overlayPause')).toBeVisible();
  await page.locator('#btnResume').click();
  await expect(page.locator('#overlayPause')).toBeHidden();
  await page.locator('#btnHomeTop').click();
  await page.locator('#btnBird').click();
  await expect(page.locator('#screenPlay')).toBeVisible();
  await expect(page.locator('#btnFlap')).toBeVisible();
  await page.locator('#btnFlap').click();
  await page.locator('#btnHomeTop').click();
}

test('all three games switch, pause, and restart without network', async ({ context, page }) => {
  const requests = await openOffline(context, page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || message.text().includes('ward layout 自檢')) errors.push(message.text());
  });
  await enterWard(page);
  await page.locator('#btnPause').click();
  await expect(page.locator('#overlayPause')).toBeVisible();
  await page.locator('#btnResume').click();
  await expect(page.locator('#overlayPause')).toBeHidden();
  await openOtherGames(page);
  await enterWard(page);
  expect((await state(page)).quest).toBe('');
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

for (const missing of ['ward.bundle.js', 'ward-shell.js']) {
  test('missing ' + missing + ' shows a fallback and leaves other games playable', async ({ context, page }) => {
    await page.route('**/' + missing, route => route.abort());
    const requests = await openOffline(context, page);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('#btnWard').click();
    await expect(page.locator('#wardFallback')).toBeVisible();
    await expect(page.locator('#wardFallback')).toContainText('病房檔案未載入');
    await openOtherGames(page);
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('WebGL failure shows a fallback and leaves other games playable', async ({ context, page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return original.call(this, type, ...args);
    };
  });
  const requests = await openOffline(context, page);
  await page.locator('#btnWard').click();
  await expect(page.locator('#wardFallback')).toBeVisible();
  await expect(page.locator('#wardFallback')).toContainText('立體畫面開唔到');
  await openOtherGames(page);
  expect(requests).toEqual([]);
});

async function canvasComparison(page, first, second) {
  return page.evaluate(async ({ first, second }) => {
    async function pixels(base64) {
      const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    const before = await pixels(first), after = await pixels(second), colors = new Set();
    let changed = 0;
    for (let index = 0; index < before.length; index += 64) {
      colors.add([before[index], before[index + 1], before[index + 2]].join(','));
      if (Math.abs(before[index] - after[index]) + Math.abs(before[index + 1] - after[index + 1]) + Math.abs(before[index + 2] - after[index + 2]) > 25) changed++;
    }
    return { colors: colors.size, changed };
  }, { first: first.toString('base64'), second: second.toString('base64') });
}

test('responsive canvas remains visible, animated, and interactive on desktop and mobile', async ({ browser }, testInfo) => {
  test.setTimeout(180000);
  for (const viewport of [
    { width: 1440, height: 900 }, { width: 768, height: 1024 },
    { width: 390, height: 844 }, { width: 320, height: 568 },
    { width: 844, height: 390 }, { width: 568, height: 320 }
  ]) {
    const mobile = viewport.width < 1024;
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    const requests = await openOffline(context, page);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await enterWard(page);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const before = await page.locator('#wardCanvas').screenshot();
    const start = await state(page);
    if (mobile) {
      const joy = await page.locator('#wardJoy').boundingBox();
      const x = joy.x + joy.width / 2, y = joy.y + joy.height / 2;
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + joy.width * 0.28, y }] });
      await page.waitForFunction(({ x, z }) => Math.hypot(window.WardMode.state().x - x, window.WardMode.state().z - z) > 0.12, start);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    } else {
      await page.keyboard.down('ArrowLeft');
      await page.waitForFunction(({ x, z }) => Math.hypot(window.WardMode.state().x - x, window.WardMode.state().z - z) > 0.12, start);
      await page.keyboard.up('ArrowLeft');
    }
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const after = await page.locator('#wardCanvas').screenshot();
    const pixels = await canvasComparison(page, before, after);
    expect(pixels.colors, JSON.stringify(viewport)).toBeGreaterThan(20);
    expect(pixels.changed, JSON.stringify(viewport)).toBeGreaterThan(20);
    const rects = await page.evaluate(() => {
      const ids = ['wardCanvas', 'wardRoomLabel', 'wardQuestLabel', 'wardMinimap', 'wardJoy', 'wardBtnA', 'wardBtnB'];
      return Object.fromEntries(ids.map(id => {
        const node = document.getElementById(id), rect = node.getBoundingClientRect();
        return [id, { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, overflow: node.scrollWidth > node.clientWidth + 1 }];
      }));
    });
    for (const [id, rect] of Object.entries(rects)) {
      expect(rect.width, id).toBeGreaterThan(0);
      expect(rect.height, id).toBeGreaterThan(0);
      expect(rect.x, id).toBeGreaterThanOrEqual(-1);
      expect(rect.y, id).toBeGreaterThanOrEqual(-1);
      expect(rect.right, id).toBeLessThanOrEqual(viewport.width + 1);
      expect(rect.bottom, id).toBeLessThanOrEqual(viewport.height + 1);
      expect(rect.overflow, id).toBe(false);
    }
    const overlap = (left, right) => left.x < right.right && left.right > right.x && left.y < right.bottom && left.bottom > right.y;
    expect(overlap(rects.wardJoy, rects.wardBtnA), JSON.stringify(viewport)).toBe(false);
    expect(overlap(rects.wardJoy, rects.wardBtnB), JSON.stringify(viewport)).toBe(false);
    expect(overlap(rects.wardQuestLabel, rects.wardMinimap), JSON.stringify(viewport)).toBe(false);
    await page.locator('#wardMinimap').click();
    await expect(page.locator('#wardMapOverlay')).toBeVisible();
    await expect(page.locator('#wardMapLegend li')).toHaveCount(15);
    const mapRects = await page.evaluate(() => {
      const map = document.getElementById('wardMapBig'), legend = document.getElementById('wardMapLegend');
      const mapBox = map.getBoundingClientRect(), legendBox = legend.getBoundingClientRect();
      return { map: { x: mapBox.x, y: mapBox.y, right: mapBox.right, bottom: mapBox.bottom, width: mapBox.width, height: mapBox.height },
        legend: { x: legendBox.x, y: legendBox.y, right: legendBox.right, bottom: legendBox.bottom,
          overflow: legend.scrollWidth > legend.clientWidth + 1 } };
    });
    expect(mapRects.map.width / mapRects.map.height, JSON.stringify(viewport)).toBeCloseTo(480 / 680, 1);
    expect(mapRects.map.x).toBeGreaterThanOrEqual(0);
    expect(mapRects.map.y).toBeGreaterThanOrEqual(0);
    expect(mapRects.map.right).toBeLessThanOrEqual(viewport.width);
    expect(mapRects.map.bottom).toBeLessThanOrEqual(viewport.height);
    expect(overlap(mapRects.map, mapRects.legend), JSON.stringify(viewport)).toBe(false);
    expect(mapRects.legend.overflow, JSON.stringify(viewport)).toBe(false);
    const labels = await page.evaluate(() => window.WardMode.audit().mapLabels);
    expect(labels).toHaveLength(15);
    for (let left = 0; left < labels.length; left++) for (let right = left + 1; right < labels.length; right++) {
      expect(Math.hypot(labels[left].x - labels[right].x, labels[left].y - labels[right].y),
        JSON.stringify({ viewport, left: labels[left].id, right: labels[right].id }))
        .toBeGreaterThanOrEqual(labels[left].radius + labels[right].radius);
    }
    await attachScreenshot(page, testInfo, 'ward-map-' + viewport.width + 'x' + viewport.height);
    const canScrollLegend = await page.locator('#wardMapLegend').evaluate(node => node.scrollHeight > node.clientHeight + 1);
    if (mobile && canScrollLegend) {
      const box = await page.locator('#wardMapLegend').boundingBox();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.synthesizeScrollGesture', {
        x: box.x + box.width / 2, y: box.y + box.height - 15,
        xDistance: 0, yDistance: -100, speed: 500, gestureSourceType: 'touch'
      });
      await cdp.detach();
      await expect.poll(() => page.locator('#wardMapLegend').evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    } else await page.locator('#wardMapLegend li').last().scrollIntoViewIfNeeded();
    await expect(page.locator('#wardMapOverlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#wardMapOverlay')).toBeHidden();
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
    await attachScreenshot(page, testInfo, 'ward-' + viewport.width + 'x' + viewport.height);
    await context.close();
  }
});


test('mobile dialog and questions remain readable and actionable', async ({ browser }, testInfo) => {
  test.setTimeout(120000);
  const context = await browser.newContext({ viewport: { width: 568, height: 320 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await openOffline(context, page);
  await enterWard(page);
  expect((await moveToPoint(page, await marker(page, 'trolley'))).kind).toBe('interrupted');
  for (let index = 0; index < 3; index++) {
    const rects = await page.evaluate(() => {
      const ids = ['wardView', 'wardQuestLabel', 'wardMinimap', 'wardDialog'];
      return Object.fromEntries(ids.map(id => {
        const node = document.getElementById(id), rect = node.getBoundingClientRect();
        return [id, { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, overflow: node.scrollHeight > node.clientHeight + 1 }];
      }));
    });
    const overlap = (left, right) => left.x < right.right && left.right > right.x && left.y < right.bottom && left.bottom > right.y;
    expect(rects.wardDialog.y).toBeGreaterThanOrEqual(rects.wardView.y);
    expect(rects.wardDialog.bottom).toBeLessThanOrEqual(rects.wardView.bottom);
    expect(rects.wardDialog.overflow).toBe(false);
    expect(overlap(rects.wardDialog, rects.wardQuestLabel)).toBe(false);
    expect(overlap(rects.wardDialog, rects.wardMinimap)).toBe(false);
    await page.keyboard.press('z');
  }
  expect((await state(page)).step).toBe('goTrolley');
  const nurse = await character(page, 'nurse1');
  expect((await moveToPoint(page, { x: nurse.x - 0.7, z: nurse.z })).kind).toBe('arrived');
  expect(await visiblePatients(page)).toEqual(['codePatient']);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await attachScreenshot(page, testInfo, 'ward-mobile-characters');
  await page.locator('#wardBtnA').tap();
  await expect(page.locator('#wardDialogText')).toContainText('留喺病人身邊');
  await page.locator('#wardBtnA').tap();
  expect((await state(page)).dialog).toBe(false);
  await moveToPoint(page, await marker(page, 'trolley'));
  await page.locator('#wardBtnA').tap();
  await dismissDialogs(page);
  expect((await moveToPoint(page, await marker(page, 'incident'))).kind).toBe('interrupted');
  await dismissDialogs(page);
  await expect(page.locator('#wardBattle')).toBeVisible();
  await expect(page.locator('#battleFoeName')).toHaveCSS('color', 'rgb(20, 34, 38)');
  await attachScreenshot(page, testInfo, 'ward-mobile-question');
  const battle = page.locator('#wardBattle'), box = await battle.boundingBox();
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width / 2, startY = box.y + box.height - 25;
  await cdp.send('Input.synthesizeScrollGesture', {
    x, y: startY, xDistance: 0, yDistance: -150, speed: 500, gestureSourceType: 'touch'
  });
  await cdp.detach();
  await expect.poll(() => battle.evaluate(node => node.scrollTop), { timeout: 5000 }).toBeGreaterThan(0);
  await page.locator('.battle-opt').nth(3).tap();
  expect((await state(page)).battle).toBe('explain');
  await page.keyboard.press('z');
  await answerQuestions(page, 1);
  expect((await state(page)).step).toBe('goFax');
  await context.close();
});
