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

test('map preserves exact rooms, doors, markers, and lift isolation', async ({ context, page }) => {
  const externalRequests = await openOffline(context, page);
  const result = await page.evaluate(() => {
    const layout = window.WARD_SHELL.layout;
    const mode = window.WardMode;
    const start = mode.markers().start;
    const rooms = mode.rooms.map(room => {
      const def = layout.rooms[room.id];
      const center = { x: (def.rect[0] + 0.5) * layout.tile, z: (def.rect[1] + 0.5) * layout.tile };
      return { id: room.id, name: room.name, rect: def.rect, doors: def.doors || [def.door], reachable: mode.pathMeters(start.x, start.z, center.x, center.z) >= 0 };
    });
    const markers = Object.fromEntries(Object.entries(mode.markers()).map(([name, point]) => [name, mode.walkable(point.x, point.z) && mode.pathMeters(start.x, start.z, point.x, point.z) >= 0]));
    const visit = layout.rooms.vis1;
    const blocked = new Set(visit.doors.map(door => door.join(',')));
    for (let row = visit.rect[1]; row < visit.rect[1] + visit.rect[3]; row++) {
      for (let col = visit.rect[0]; col < visit.rect[0] + visit.rect[2]; col++) blocked.add(col + ',' + row);
    }
    const seen = new Set(), queue = [layout.marks.start];
    for (let index = 0; index < queue.length; index++) {
      const [col, row] = queue[index], key = col + ',' + row;
      if (seen.has(key) || blocked.has(key) || !mode.walkable((col + 0.5) * layout.tile, (row + 0.5) * layout.tile)) continue;
      seen.add(key);
      queue.push([col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]);
    }
    return { rooms, markers, enclosure: mode.enclosure(), problems: mode.audit().problems, liftReachableWithoutVisit: seen.has(layout.marks.lift.join(',')), wallWalkable: mode.walkable(6.5 * layout.tile, 1.5 * layout.tile), outsideWalkable: mode.walkable(-1, -1) };
  });
  expect(externalRequests).toEqual([]);
  expect(result.problems).toEqual([]);
  expect(result.rooms).toHaveLength(15);
  expect(result.rooms.map(room => room.id)).not.toContain('comm');
  for (const id of ['calm', 'duty', 'pantry', 'group']) expect(result.rooms.map(room => room.id)).not.toContain(id);
  for (const room of result.rooms) {
    const stat = result.enclosure.byRoom[room.id];
    expect(stat.n, room.id + ' area').toBe(room.rect[2] * room.rect[3]);
    expect(stat.door, room.id + ' doors').toBe(room.doors.length);
    expect(room.reachable, room.id + ' reachable').toBe(true);
  }
  expect(result.enclosure.byRoom.treat.n).toBe(24);
  expect(result.enclosure.byRoom.intake.n).toBe(30);
  expect(result.enclosure.byRoom.nurse.n).toBe(54);
  const visit = result.rooms.find(room => room.id === 'vis1');
  const lift = result.rooms.find(room => room.id === 'lift');
  const nurse = result.rooms.find(room => room.id === 'nurse');
  expect(visit.name).toBe('探病室');
  expect(lift.name).toBe('升降機大堂');
  expect(visit.doors).toHaveLength(2);
  expect(lift.doors).toHaveLength(1);
  expect(visit.doors).toContainEqual(lift.doors[0]);
  expect(nurse.doors).toHaveLength(2);
  expect(nurse.doors[0][0]).toBe(nurse.doors[1][0]);
  expect(nurse.doors.map(door => door[1]).sort((a, b) => a - b)).toEqual([nurse.rect[1] - 1, nurse.rect[1] + nurse.rect[3]]);
  expect(Object.values(result.markers).every(Boolean)).toBe(true);
  expect(result.liftReachableWithoutVisit).toBe(false);
  expect(result.wallWalkable).toBe(false);
  expect(result.outsideWalkable).toBe(false);
});

test('map audit rejects a direct lift bypass and an unreachable marker', () => {
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
  const bypass = inspect(layout => layout.corridors.push([1, 6, 1, 1]));
  expect(bypass.some(problem => problem.includes('未標示出口'))).toBe(true);
  expect(bypass.some(problem => problem.includes('直接連接病房'))).toBe(true);
  const marker = inspect(layout => { layout.marks.intake = [0, 0]; });
  expect(marker.some(problem => problem.includes('intake 標記行唔到'))).toBe(true);
});

test('map scene contains correctly placed beds and furniture in every room', async ({ context, page }) => {
  await openOffline(context, page);
  await enterWard(page);
  const result = await page.evaluate(() => ({ audit: window.WardMode.audit(), layout: window.WARD_SHELL.layout }));
  expect(result.audit.problems).toEqual([]);
  expect(result.audit.beds).toEqual({ b1: 6, b2: 6, iso1: 1 });
  expect(result.audit.plants).toBeGreaterThanOrEqual(9);
  for (const room of result.audit.rooms) expect(result.audit.furniture[room], room + ' furniture').toBeGreaterThan(0);
  for (const id of ['b1', 'b2']) {
    const rect = result.layout.rooms[id].rect, tile = result.layout.tile;
    const beds = result.audit.bedPositions.filter(bed => bed.room === id).sort((a, b) => a.z - b.z || a.x - b.x);
    expect(beds).toHaveLength(6);
    for (const bed of beds.slice(0, 3)) {
      expect(Math.abs(bed.z - (rect[1] * tile + 1.65 / 2))).toBeLessThan(0.02);
      expect(bed.rotation).toBe(0);
    }
    for (const bed of beds.slice(3)) {
      expect(Math.abs(bed.z - ((rect[1] + rect[3]) * tile - 1.65 / 2))).toBeLessThan(0.02);
      expect(bed.rotation).toBeCloseTo(Math.PI);
    }
    for (const row of [beds.slice(0, 3), beds.slice(3)]) {
      expect(row[1].x - row[0].x).toBeGreaterThan(1.15);
      expect(row[2].x - row[1].x).toBeGreaterThan(1.15);
    }
    const partitions = result.audit.partitions.filter(partition => partition.room === id);
    expect(partitions).toHaveLength(4);
    for (const partition of partitions) {
      const row = beds.filter(bed => Math.abs(bed.z - partition.z) < 0.2).sort((a, b) => a.x - b.x);
      expect(row).toHaveLength(3);
      expect(row.some((bed, index) => index < 2 && partition.x > bed.x + 0.6 && partition.x < row[index + 1].x - 0.6)).toBe(true);
      const door = result.layout.rooms[id].door;
      expect(Math.hypot(partition.x - (door[0] + 0.5) * tile, partition.z - (door[1] + 0.5) * tile)).toBeGreaterThan(tile);
    }
  }
});

async function moveToCell(page, targetCol, targetRow) {
  const result = await page.evaluate(({ targetCol, targetRow }) => {
    const mode = window.WardMode, tile = window.WARD_SHELL.layout.tile, state = mode.state();
    const start = [Math.floor(state.x / tile), Math.floor(state.z / tile)];
    const key = (col, row) => col + ',' + row;
    const queue = [start], previous = new Map([[key(...start), null]]);
    for (let index = 0; index < queue.length; index++) {
      const [col, row] = queue[index];
      if (col === targetCol && row === targetRow) break;
      for (const [nextCol, nextRow] of [[col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]]) {
        const nextKey = key(nextCol, nextRow);
        if (previous.has(nextKey) || !mode.walkable((nextCol + 0.5) * tile, (nextRow + 0.5) * tile)) continue;
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
  }, { targetCol, targetRow });
  expect(result.kind, JSON.stringify(result)).not.toBe('blocked');
  return result;
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

test('quests complete through real interactions and small-step trolley turns', async ({ context, page }, testInfo) => {
  test.setTimeout(120000);
  const requests = await openOffline(context, page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await enterWard(page);

  expect((await moveToCell(page, 18, 17)).kind).toBe('interrupted');
  expect((await state(page)).quest).toBe('code');
  await dismissDialogs(page);
  expect((await state(page)).step).toBe('goTrolley');
  expect((await moveToCell(page, 22, 12)).kind).toBe('arrived');
  await interact(page);
  expect((await state(page)).pushing).toBe(true);
  await dismissDialogs(page);
  expect((await moveToCell(page, 18, 12)).kind).toBe('arrived');
  expect((await moveToCell(page, 18, 17)).kind).toBe('arrived');
  expect((await moveToCell(page, 22, 17)).kind).toBe('interrupted');
  expect((await state(page)).step).toBe('battle');
  await dismissDialogs(page);
  await answerQuestions(page);
  expect((await state(page)).step).toBe('goFax');
  expect((await moveToCell(page, 21, 22)).kind).toBe('arrived');
  await interact(page);
  expect((await state(page)).step).toBe('docs');
  await dismissDialogs(page);
  await interact(page);
  await dismissDialogs(page);
  expect((await state(page)).quest).toBe('');

  expect((await moveToCell(page, 3, 3)).kind).toBe('interrupted');
  expect((await state(page)).quest).toBe('admit');
  await dismissDialogs(page);
  expect((await moveToCell(page, 3, 3)).kind).toBe('arrived');
  await interact(page);
  await dismissDialogs(page);
  await answerQuestions(page);
  expect((await state(page)).step).toBe('goBed');
  expect((await moveToCell(page, 27, 13)).kind).toBe('arrived');
  await interact(page);
  await dismissDialogs(page);
  expect((await state(page)).quest).toBe('');

  expect((await moveToCell(page, 21, 3)).kind).toBe('interrupted');
  expect((await state(page)).quest).toBe('rest');
  await dismissDialogs(page);
  expect((await moveToCell(page, 21, 3)).kind).toBe('arrived');
  await interact(page);
  await dismissDialogs(page);
  await answerQuestions(page);
  expect((await state(page)).step).toBe('goNurse');
  expect((await moveToCell(page, 21, 22)).kind).toBe('arrived');
  await interact(page);
  await dismissDialogs(page);
  expect((await state(page)).quest).toBe('');
  let garden = await moveToCell(page, 44, 24);
  if (garden.kind === 'interrupted') {
    await dismissDialogs(page);
    garden = await moveToCell(page, 44, 24);
  }
  expect(garden.kind).toBe('arrived');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await testInfo.attach('ward-garden', { body: await page.screenshot(), contentType: 'image/png' });
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
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
    await testInfo.attach('ward-' + viewport.width + 'x' + viewport.height, { body: await page.screenshot(), contentType: 'image/png' });
    await context.close();
  }
});


test('mobile dialog and questions remain readable and actionable', async ({ browser }, testInfo) => {
  test.setTimeout(120000);
  const context = await browser.newContext({ viewport: { width: 568, height: 320 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await openOffline(context, page);
  await enterWard(page);
  expect((await moveToCell(page, 18, 17)).kind).toBe('interrupted');
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
  await moveToCell(page, 22, 12);
  await interact(page);
  await dismissDialogs(page);
  await moveToCell(page, 18, 12);
  await moveToCell(page, 18, 17);
  expect((await moveToCell(page, 22, 17)).kind).toBe('interrupted');
  await dismissDialogs(page);
  await expect(page.locator('#wardBattle')).toBeVisible();
  await expect(page.locator('#battleFoeName')).toHaveCSS('color', 'rgb(20, 34, 38)');
  await testInfo.attach('ward-mobile-question', { body: await page.screenshot(), contentType: 'image/png' });
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
