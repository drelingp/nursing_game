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

async function enterWard(page, random = 0.999999) {
  await page.locator('#btnWard').click();
  await expect(page.locator('#wardFallback')).toBeHidden();
  await page.waitForFunction(() => window.WardMode && window.WardMode.state().camera === 'ortho');
  if (random !== null) await page.evaluate(value => { Math.random = () => value; }, random);
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

test('M10 catalog scopes every scored rule and preserves confirmed overrides', () => {
  const sandbox = { console: { warn() {} } };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(resolve(root, 'ward-shell.js'), 'utf8'), sandbox);
  vm.runInContext(readFileSync(resolve(root, 'ward.bundle.js'), 'utf8'), sandbox);
  const mode = sandbox.WardMode, catalog = mode.catalog();
  expect(catalog).toHaveLength(12);
  for (const family of catalog) {
    expect(family.variants.length, family.id).toBeGreaterThanOrEqual(2);
    expect(new Set(family.variants.map(variant => variant.id)).size).toBe(family.variants.length);
    for (const variant of family.variants) for (const stage of variant.stages) {
      expect(stage.source.section).toBeTruthy();
      expect(existsSync(resolve(root, stage.source.file))).toBe(true);
      expect(stage.options[stage.answer]).toBeTruthy();
      expect(stage.explain).toBeTruthy();
      expect(stage.recovery).toBeTruthy();
    }
    for (const ward of ['C9', 'C7']) for (const variant of mode.variants(family.id, ward)) {
      expect(family.wards.includes(ward)).toBe(true);
      expect(variant.stages.every(stage => ['shared', ward].includes(stage.source.scope))).toBe(true);
    }
  }
  const policy = mode.policies;
  expect(policy.dietRequired(59, false)).toBe(false);
  expect(policy.dietRequired(60, false)).toBe(true);
  expect(policy.dietRequired(59, true)).toBe(true);
  expect(policy.eveningBPAllowed(17, 59)).toBe(false);
  expect(policy.eveningBPAllowed(18, 0)).toBe(true);
  expect(policy.collection(false)).toContain('不用 OPA');
  expect(policy.collection(true)).toContain('先電話');
  expect(policy.chart).toBe('IPMOE');
  expect(policy.ue).toBe('入院無帶 HKID');
  expect(mode.variants('bowel', 'C9')).toHaveLength(0);
  expect(mode.variants('visit', 'C9').map(variant => variant.id)).toEqual(['c9food', 'c9privacy']);
  expect(mode.variants('visit', 'C7').map(variant => variant.id)).toEqual(['c7booking', 'c7walkin']);
});

test('M10 catalog quiz wording agrees with the confirmed policy updates', async ({ context, page }) => {
  await openOffline(context, page);
  const questions = await page.evaluate(() => window.__TRAINING_GAME.questions);
  const l1 = questions.find(question => question.category === '文件／法律／出院' && question.q.includes('轉 L1'));
  expect(l1.options[l1.answer]).toContain('IPMOE');
  expect(l1.explain).toContain('不用重開紙本 MAR');
  const evening = questions.find(question => question.q.includes('晚間時序'));
  expect(evening.options[evening.answer]).toContain('18:00');
  expect(evening.explain).toContain('不用硬等 19:00');
  expect(questions.flatMap(question => question.points).some(point => point.includes('≥60／MD'))).toBe(true);
  expect(questions.flatMap(question => question.points).some(point => point.includes('≥65／MD'))).toBe(false);
});

test('M10 workflow requires correction before an ordered stage can advance', async ({ context, page }) => {
  await openOffline(context, page);
  await enterWard(page);
  await walkMeters(page, 8);
  await dismissDialogs(page);
  expect((await state(page)).quest).toBe('admit');
  await moveToPoint(page, await marker(page, 'computer'));
  await interact(page);
  await page.locator('.battle-opt').nth(0).click();
  await expect(page.locator('#battleText')).toContainText('未係最適切');
  await page.keyboard.press('z');
  expect((await state(page)).stageIndex).toBe(0);
  expect((await state(page)).battle).toBe('ask');
  await page.locator('.battle-opt').nth(1).click();
  await page.keyboard.press('z');
  expect((await state(page)).target).toBe('lift');
  expect((await state(page)).stageResults[0]).toMatchObject({ corrected: true, correctFirstAttempt: false, attempts: 2 });
});

test('M10 profile switches safely and M10 prop targets are visible and reachable', async ({ context, page }) => {
  await openOffline(context, page);
  await enterWard(page);
  for (const ward of ['C9', 'C7']) {
    if ((await state(page)).ward !== ward) {
      await page.keyboard.press('b');
      await page.selectOption('#wardProfile', ward);
    }
    const audit = await page.evaluate(() => window.WardMode.audit());
    expect(audit.scenarios).toHaveLength(ward === 'C9' ? 11 : 12);
    for (const scenario of audit.scenarios) expect(scenario.problems, ward + scenario.id).toEqual([]);
    for (const id of ['bedside', 'medication', 'dining', 'visitor', 'isolation', 'handover']) {
      expect(audit.props.find(prop => prop.id === id).problems, ward + id).toEqual([]);
    }
    await page.click('#wardMinimap');
    await expect(page.locator('#wardMapGoal')).toContainText(ward);
    await page.keyboard.press('Escape');
  }
  await walkMeters(page, 8);
  await dismissDialogs(page);
  const before = await state(page);
  await page.keyboard.press('b');
  await page.selectOption('#wardProfile', 'C9');
  await expect(page.locator('#wardProfileConfirm')).toBeVisible();
  await page.click('#wardProfileCancel');
  expect((await state(page)).quest).toBe(before.quest);
  expect((await state(page)).ward).toBe('C7');
  await page.selectOption('#wardProfile', 'C9');
  await page.click('#wardProfileApply');
  expect(await state(page)).toMatchObject({ ward: 'C9', quest: '', travel: 0, stageIndex: 0 });
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

test('wall geometry follows exposed polygon edges without duplicate walls or blocked doors', () => {
  const sandbox = { console: { warn() {} } };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(resolve(root, 'ward-shell.js'), 'utf8'), sandbox);
  vm.runInContext(readFileSync(resolve(root, 'ward.bundle.js'), 'utf8'), sandbox);
  const geometry = sandbox.WardMode.audit().wallGeometry;
  const walls = Array.from(geometry.rendered);
  const corridors = Array.from(geometry.corridors);
  expect(corridors.length).toBeGreaterThan(5);
  expect(corridors.some(wall => Math.abs(wall.b[0] - wall.a[0]) > 1 && Math.abs(wall.b[1] - wall.a[1]) > 1)).toBe(true);
  expect(corridors.some(wall => Math.abs(wall.b[0] - wall.a[0]) < 0.00001)).toBe(true);
  const inside = (x, z, polygon) => {
    let contained = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
      const start = polygon[index], end = polygon[previous];
      if ((start[1] > z) !== (end[1] > z) && x < (end[0] - start[0]) * (z - start[1]) / (end[1] - start[1]) + start[0]) contained = !contained;
    }
    return contained;
  };
  const polygons = [...geometry.corridorPolygons, ...Object.values(geometry.roomPolygons)];
  for (const wall of corridors) {
    for (const fraction of [0.1, 0.5, 0.9]) {
      const x = wall.a[0] + (wall.b[0] - wall.a[0]) * fraction;
      const z = wall.a[1] + (wall.b[1] - wall.a[1]) * fraction;
      expect(polygons.some(polygon => inside(x + wall.nx * 0.001, z + wall.nz * 0.001, polygon))).toBe(true);
      expect(polygons.some(polygon => inside(x - wall.nx * 0.001, z - wall.nz * 0.001, polygon))).toBe(false);
    }
  }
  const overlaps = (wall, other) => {
    const dx = wall.b[0] - wall.a[0], dz = wall.b[1] - wall.a[1], length = Math.hypot(dx, dz);
    const projections = [other.a, other.b].map(point => ({
      across: Math.abs((point[0] - wall.a[0]) * dz - (point[1] - wall.a[1]) * dx) / length,
      along: ((point[0] - wall.a[0]) * dx + (point[1] - wall.a[1]) * dz) / length
    }));
    return projections.every(point => point.across < 0.00001) &&
      Math.min(length, Math.max(...projections.map(point => point.along))) - Math.max(0, Math.min(...projections.map(point => point.along))) > 0.00001;
  };
  for (let index = 0; index < walls.length; index++) {
    expect(Math.hypot(walls[index].b[0] - walls[index].a[0], walls[index].b[1] - walls[index].a[1])).toBeGreaterThan(0.00001);
    for (const other of walls.slice(index + 1)) expect(overlaps(walls[index], other)).toBe(false);
    for (const door of geometry.doors) expect(overlaps(walls[index], door)).toBe(false);
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

test('scenario props have visible models and reachable approach points before activation', async ({ context, page }) => {
  await openOffline(context, page);
  await enterWard(page);
  const audit = await page.evaluate(() => window.WardMode.audit());
  expect(audit.props.map(prop => prop.id).sort()).toEqual(['admitPatient', 'bedside', 'computer', 'dining', 'fax', 'handover', 'incident', 'intake', 'isolation', 'lift', 'medication', 'secl', 'trolley', 'visitor']);
  for (const scenario of audit.scenarios) expect(scenario.problems, scenario.id).toEqual([]);
  for (const prop of audit.props.filter(prop => !['incident', 'admitPatient', 'secl'].includes(prop.id))) {
    expect(prop.visible, prop.id).toBe(true);
    expect(prop.problems, prop.id).toEqual([]);
  }
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

async function answerQuestions(page, wrongFirst = true) {
  expect((await state(page)).battle).toBe('ask');
  if (wrongFirst) {
    const before = await state(page);
    await page.locator('.battle-opt').nth(0).click();
    await expect(page.locator('#battleText')).toContainText('未係最適切');
    await page.keyboard.press('z');
    expect((await state(page)).stageIndex).toBe(before.stageIndex);
    expect((await state(page)).battle).toBe('ask');
  }
  await page.locator('.battle-opt').nth(1).click();
  await expect(page.locator('#battleText')).toContainText('來源');
  await page.keyboard.press('z');
  await dismissDialogs(page);
}

async function walkMeters(page, meters) {
  return page.evaluate(meters => {
    const mode = window.WardMode, start = mode.state();
    const direction = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dz]) =>
      mode.walkable(start.x + dx * 0.06, start.z + dz * 0.06));
    if (!direction) throw new Error('No safe patrol step');
    let remaining = meters, forward = true;
    while (remaining > 0.000001 && !mode.state().dialog) {
      const step = Math.min(0.04, remaining) * (forward ? 1 : -1);
      const moved = mode.slide(direction[0] * step, direction[1] * step);
      if (!moved) throw new Error('Patrol step blocked');
      remaining -= moved;
      forward = !forward;
    }
    return mode.state();
  }, meters);
}

async function completeCurrentQuest(page) {
  const initial = await state(page);
  await dismissDialogs(page);
  for (let index = (await state(page)).stageIndex; index < initial.stages; index++) {
    const before = await state(page);
    const characters = await page.evaluate(() => window.WardMode.audit().npcs.filter(npc => npc.visible));
    for (const patient of characters.filter(npc => npc.role === 'patient')) {
      for (const nurse of characters.filter(npc => npc.role === 'nurse')) {
        expect(Math.hypot(patient.x - nurse.x, patient.z - nurse.z), patient.id + '/' + nurse.id).toBeGreaterThan(0.5);
      }
    }
    const movement = await moveToPoint(page, await marker(page, before.target));
    if (before.stageAction === 'deliver') {
      expect(movement.kind).toBe('interrupted');
      expect(before.pushing).toBe(true);
    } else {
      expect(movement.kind).toBe('arrived');
      await interact(page);
    }
    await answerQuestions(page, index === 0);
  }
  expect((await state(page)).quest).toBe('');
  expect((await state(page)).pushing).toBe(false);
  expect(await visiblePatients(page)).toEqual([]);
  const result = (await state(page)).lastResult;
  expect(result.family).toBe(initial.quest);
  expect(result.variant).toBe(initial.variant);
  expect(result.stages).toHaveLength(initial.stages);
  return result;
}

for (const ward of ['C9', 'C7']) {
  test('M10 workflow bag completes every eligible variant in ' + ward, async ({ context, page }) => {
    test.setTimeout(600000);
    const requests = await openOffline(context, page), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await enterWard(page);
    if (ward === 'C7') {
      await page.keyboard.press('b');
      await page.selectOption('#wardProfile', ward);
    }
    const expected = await page.evaluate(ward => window.WardMode.catalog().map(family => ({
      id: family.id, variants: window.WardMode.variants(family.id, ward).map(variant => variant.id)
    })).filter(family => family.variants.length), ward);
    const seen = new Map(expected.map(family => [family.id, new Set()]));
    let previous = '';
    for (let cycle = 0; cycle < 3; cycle++) {
      const bag = [];
      for (let index = 0; index < expected.length; index++) {
        const active = await walkMeters(page, 17);
        expect(active.quest).not.toBe(previous);
        previous = active.quest;
        bag.push(active.quest);
        seen.get(active.quest).add(active.variant);
        await completeCurrentQuest(page);
      }
      expect([...bag].sort()).toEqual(expected.map(family => family.id).sort());
    }
    for (const family of expected) expect([...seen.get(family.id)].sort(), family.id).toEqual([...family.variants].sort());
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
  });
}

test('M10 workflow triggers retain movement thresholds and restart clears the bag', async ({ context, page }) => {
  await openOffline(context, page);
  await enterWard(page);
  expect((await walkMeters(page, 6.9)).quest).toBe('');
  expect((await walkMeters(page, 0.2)).quest).toBe('admit');
  await completeCurrentQuest(page);
  expect((await walkMeters(page, 15.9)).quest).toBe('');
  expect((await walkMeters(page, 0.2)).quest).toBe('arrival');
  await page.locator('#btnHomeTop').click();
  await enterWard(page, 0.99);
  expect((await state(page)).quest).toBe('');
  expect((await walkMeters(page, 6.9)).quest).toBe('');
  expect((await walkMeters(page, 0.2)).quest).toBe('admit');
  const current = await state(page), trolley = await marker(page, 'trolley');
  expect(current.tx).toBeCloseTo(trolley.x);
  expect(current.tz).toBeCloseTo(trolley.z);
});

test('scenario props reject unreachable candidates without starting a broken task', async ({ context, page }) => {
  await openOffline(context, page);
  await enterWard(page);
  await page.evaluate(() => {
    const marks = window.WardMode.markers();
    for (const name of Object.keys(marks).filter(name => name !== 'start')) {
      marks[name].x = 0;
      marks[name].z = 0;
    }
  });
  const rejected = await walkMeters(page, 8);
  expect(rejected.quest).toBe('');
  expect(rejected.step).toBe('idle');
  await expect(page.locator('#wardDialogText')).toContainText('任務設備暫時未準備好');
  expect(await visiblePatients(page)).toEqual([]);
  const audit = await page.evaluate(() => window.WardMode.audit());
  for (const scenario of audit.scenarios) expect(scenario.problems.some(problem => problem.includes('unreachable approach'))).toBe(true);
  await dismissDialogs(page);
  expect((await state(page)).quest).toBe('');
});

async function exposeTestProps(page) {
  const bundle = readFileSync(resolve(root, 'ward.bundle.js'), 'utf8');
  const assignment = 'window.WardMode = {';
  expect(bundle).toContain(assignment);
  await page.route('**/ward.bundle.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: bundle.replace(assignment, 'window.__wardTestProps = taskProps; window.__wardTestCatalog = catalog; window.__wardTestCatalogAll = catalog.slice();\n' + assignment)
  }));
}

async function isolateScenario(page, family, variant) {
  await page.evaluate(({ family, variant }) => {
    const catalog = window.__wardTestCatalog;
    const original = window.__wardTestCatalogAll.find(entry => entry.id === family);
    const entry = { ...original, variants: original.variants.filter(entry => !variant || entry.id === variant) };
    catalog.splice(0, catalog.length, entry);
  }, { family, variant });
}

for (const failure of ['hidden model', 'missing model', 'misplaced model']) {
  test('scenario props reject and recover from ' + failure, async ({ context, page }) => {
    await exposeTestProps(page);
    await openOffline(context, page);
    await enterWard(page);
    await page.evaluate(failure => {
      const restores = [];
      for (const id of ['bedside', 'medication', 'dining', 'visitor', 'isolation', 'handover', 'lift', 'intake', 'computer', 'trolley']) {
        const mesh = window.__wardTestProps[id].mesh, parent = mesh.parent;
        const position = mesh.position.clone();
        restores.push(() => { parent.add(mesh); mesh.visible = true; mesh.position.copy(position); });
        if (failure === 'hidden model') mesh.visible = false;
        else if (failure === 'missing model') parent.remove(mesh);
        else mesh.position.x += 10;
      }
      window.__restoreWardProps = () => restores.forEach(restore => restore());
    }, failure);
    expect((await walkMeters(page, 8)).quest).toBe('');
    await expect(page.locator('#wardDialogText')).toContainText('任務設備暫時未準備好');
    const audit = await page.evaluate(() => window.WardMode.audit());
    for (const scenario of audit.scenarios) expect(scenario.problems.some(problem => problem.includes(failure)), scenario.id).toBe(true);
    await dismissDialogs(page);
    await page.evaluate(() => window.__restoreWardProps());
    expect((await walkMeters(page, 8)).quest).toBe('admit');
    await completeCurrentQuest(page);
  });
}

test('scenario props validate later admission destinations before choosing the task', async ({ context, page }) => {
  await openOffline(context, page);
  await enterWard(page, 0);
  await page.evaluate(() => {
    window.WARD_SHELL.layout.npcs.admitIntake = [0, 0];
    window.WARD_SHELL.layout.npcs.at_computer = [0, 0];
  });
  const audit = await page.evaluate(() => window.WardMode.audit());
  expect(audit.scenarios.find(scenario => scenario.id === 'admit').problems).toContain('patient: unreachable approach');
  expect((await walkMeters(page, 8)).quest).not.toBe('admit');
});

test('random scenario waits rather than repeating the only available task', async ({ context, page }) => {
  await exposeTestProps(page);
  await openOffline(context, page);
  await enterWard(page);
  await page.evaluate(() => {
    for (const [id, prop] of Object.entries(window.__wardTestProps)) {
      if (!['computer', 'intake', 'lift', 'admitPatient'].includes(id)) prop.mesh.visible = false;
    }
    window.WardMode.markers().secl.x = 0;
  });
  expect((await walkMeters(page, 8)).quest).toBe('admit');
  await completeCurrentQuest(page);
  expect((await walkMeters(page, 17)).quest).toBe('');
  await expect(page.locator('#wardDialogText')).toContainText('任務設備暫時未準備好');
  await dismissDialogs(page);
  await page.evaluate(() => { window.__wardTestProps.handover.mesh.visible = true; });
  expect((await walkMeters(page, 17)).quest).not.toBe('admit');
  await completeCurrentQuest(page);
});

test('M10 prop interactions reject walls, pause, menus, maps and wrong stages', async ({ context, page }) => {
  await exposeTestProps(page);
  await openOffline(context, page);
  await enterWard(page);
  await isolateScenario(page, 'admit', 'booking');
  await walkMeters(page, 8);
  await dismissDialogs(page);
  await moveToPoint(page, await marker(page, 'trolley'));
  await interact(page);
  await dismissDialogs(page);
  expect((await state(page)).stageIndex).toBe(0);
  expect((await state(page)).battle).toBe('');
  const outside = await page.evaluate(() => {
    const layout = window.WARD_SHELL.layout, rect = layout.rooms.nurse.rect, angle = layout.rooms.nurse.angle;
    const point = (x, z) => {
      const dx = x - rect[2] / 2, dz = z - rect[3] / 2;
      return { x: (rect[0] + rect[2] / 2 + dx * Math.cos(angle) + dz * Math.sin(angle)) * layout.tile,
        z: (rect[1] + rect[3] / 2 - dx * Math.sin(angle) + dz * Math.cos(angle)) * layout.tile };
    };
    Object.assign(window.WardMode.markers().computer, point(0.7, 1.4));
    window.__wardTestProps.computer.mesh.position.set(0.7 * layout.tile, 1.05, 1.4 * layout.tile);
    return point(-0.65, 1.4);
  });
  expect((await moveToPoint(page, outside)).kind).toBe('arrived');
  const current = await state(page), computer = await marker(page, 'computer');
  expect(Math.hypot(current.x - computer.x, current.z - computer.z)).toBeLessThan(1.55);
  expect(await page.evaluate(() => window.WardMode.audit().props.find(prop => prop.id === 'computer').problems)).toEqual([]);
  await interact(page);
  expect((await state(page)).battle).toBe('');
  await dismissDialogs(page);
  await moveToPoint(page, computer);
  await page.locator('#btnPause').click();
  await page.keyboard.press('z');
  expect((await state(page)).battle).toBe('');
  await page.keyboard.press('Escape');
  await page.keyboard.press('b');
  await page.keyboard.press('z');
  expect((await state(page)).battle).toBe('');
  await page.keyboard.press('b');
  await page.locator('#wardMinimap').click();
  await page.keyboard.press('z');
  expect((await state(page)).battle).toBe('');
  await page.keyboard.press('Escape');
  await interact(page);
  expect((await state(page)).battle).toBe('ask');
  await answerQuestions(page);
  expect((await state(page)).target).toBe('lift');
});

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
  await expect(page.locator('#wardDialogText')).toContainText('協助照顧病人');
  await dismissDialogs(page);
  expect((await state(page)).target).toBe('computer');
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
  expect((await state(page)).target).toBe('computer');

  await page.locator('#btnHomeTop').click();
  await enterWard(page);
  expect((await state(page)).quest).toBe('');
  expect(await visiblePatients(page)).toEqual([]);
  expect((await page.evaluate(() => window.WardMode.audit().npcs.filter(npc => npc.role === 'nurse' && npc.visible))).length).toBe(3);
});

test('quests complete through real interactions and small-step trolley turns', async ({ context, page }, testInfo) => {
  test.setTimeout(120000);
  await exposeTestProps(page);
  const requests = await openOffline(context, page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await enterWard(page);
  await isolateScenario(page, 'code', 'code000');

  expect((await moveToPoint(page, await marker(page, 'trolley'))).kind).toBe('interrupted');
  expect((await state(page)).quest).toBe('code');
  await dismissDialogs(page);
  expect((await state(page)).target).toBe('incident');
  expect(await visiblePatients(page)).toEqual(['codePatient']);
  const emergencyNurse = await character(page, 'nurse1'), emergencyPatient = await character(page, 'codePatient');
  expect(Math.hypot(emergencyNurse.x - emergencyPatient.x, emergencyNurse.z - emergencyPatient.z)).toBeLessThan(1.55);
  expect((await moveToPoint(page, await marker(page, 'incident'))).kind).toBe('arrived');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await attachScreenshot(page, testInfo, 'ward-emergency-characters');
  await interact(page);
  await expect(page.locator('#battleText')).toContainText('無反應');
  await answerQuestions(page);
  expect((await state(page)).target).toBe('trolley');
  expect((await moveToPoint(page, await marker(page, 'trolley'))).kind).toBe('arrived');
  await interact(page);
  await answerQuestions(page, false);
  expect((await state(page)).pushing).toBe(true);
  await dismissDialogs(page);
  expect((await moveToPoint(page, await marker(page, 'incident'))).kind).toBe('interrupted');
  expect((await state(page)).step).toBe('battle');
  await dismissDialogs(page);
  await answerQuestions(page);
  expect((await state(page)).target).toBe('computer');
  await completeCurrentQuest(page);
  expect(await visiblePatients(page)).toEqual([]);

  await isolateScenario(page, 'admit', 'booking');
  await walkMeters(page, 17);
  expect((await state(page)).quest).toBe('admit');
  await dismissDialogs(page);
  await moveToPoint(page, await marker(page, 'computer'));
  await interact(page);
  await answerQuestions(page);
  expect(await visiblePatients(page)).toEqual(['admitPatient']);
  const admissionAtLift = await character(page, 'admitPatient');
  expect((await moveToPoint(page, await marker(page, 'lift'))).kind).toBe('arrived');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await attachScreenshot(page, testInfo, 'ward-admission-character');
  await interact(page);
  await answerQuestions(page);
  expect((await state(page)).target).toBe('intake');
  const admissionAtIntake = await character(page, 'admitPatient');
  expect(Math.hypot(admissionAtIntake.x - admissionAtLift.x, admissionAtIntake.z - admissionAtLift.z)).toBeGreaterThan(2);
  await completeCurrentQuest(page);

  await isolateScenario(page, 'rest', 'deescalation');
  await walkMeters(page, 17);
  expect((await state(page)).quest).toBe('rest');
  await dismissDialogs(page);
  expect(await visiblePatients(page)).toEqual(['restPatient']);
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
  await completeCurrentQuest(page);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('wall geometry stays framed at the wing and corridor junction on desktop and mobile', async ({ browser }, testInfo) => {
  test.setTimeout(120000);
  for (const viewport of [
    { width: 1440, height: 900 }, { width: 768, height: 1024 },
    { width: 390, height: 844 }, { width: 568, height: 320 }
  ]) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 1024, hasTouch: viewport.width < 1024 });
    const page = await context.newPage();
    const requests = await openOffline(context, page);
    await enterWard(page);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const before = await page.locator('#wardCanvas').screenshot();
    await attachScreenshot(page, testInfo, 'ward-smooth-wing-' + viewport.width + 'x' + viewport.height);
    const junction = await page.evaluate(() => ({ x: 33.7 * window.WARD_SHELL.layout.tile, z: 36.5 * window.WARD_SHELL.layout.tile }));
    let movement = await moveToPoint(page, junction);
    if (movement.kind === 'interrupted') {
      await dismissDialogs(page);
      movement = await moveToPoint(page, junction);
    }
    expect(movement.kind).toBe('arrived');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const after = await page.locator('#wardCanvas').screenshot();
    const pixels = await canvasComparison(page, before, after);
    expect(pixels.colors).toBeGreaterThan(20);
    expect(pixels.changed).toBeGreaterThan(20);
    await attachScreenshot(page, testInfo, 'ward-smooth-junction-' + viewport.width + 'x' + viewport.height);
    expect(requests).toEqual([]);
    await context.close();
  }
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
  await exposeTestProps(page);
  await openOffline(context, page);
  await enterWard(page);
  await isolateScenario(page, 'code', 'code000');
  expect((await moveToPoint(page, await marker(page, 'trolley'))).kind).toBe('interrupted');
  while ((await state(page)).dialog) {
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
  expect((await state(page)).target).toBe('incident');
  expect((await moveToPoint(page, await marker(page, 'incident'))).kind).toBe('arrived');
  expect(await visiblePatients(page)).toEqual(['codePatient']);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await attachScreenshot(page, testInfo, 'ward-mobile-characters');
  await page.locator('#wardBtnA').tap();
  await expect(page.locator('#wardBattle')).toBeVisible();
  await expect(page.locator('#battleFoeName')).toHaveCSS('color', 'rgb(20, 34, 38)');
  await attachScreenshot(page, testInfo, 'ward-mobile-question');
  const battle = page.locator('#wardBattle');
  if (await battle.evaluate(node => node.scrollHeight > node.clientHeight + 1)) {
    const box = await battle.boundingBox(), cdp = await context.newCDPSession(page);
    await cdp.send('Input.synthesizeScrollGesture', {
      x: box.x + box.width / 2, y: box.y + box.height - 25,
      xDistance: 0, yDistance: -150, speed: 500, gestureSourceType: 'touch'
    });
    await cdp.detach();
    await expect.poll(() => battle.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  } else {
    for (const option of await page.locator('.battle-opt').all()) await expect(option).toBeInViewport();
  }
  await page.locator('.battle-opt').nth(0).tap();
  expect((await state(page)).battle).toBe('explain');
  await page.keyboard.press('z');
  expect((await state(page)).battle).toBe('ask');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.battle-opt.on')).toHaveAttribute('data-i', '1');
  await page.keyboard.press('z');
  await expect(page.locator('#battleText')).toContainText('答啱');
  await page.keyboard.press('z');
  expect((await state(page)).target).toBe('trolley');
  await page.locator('#wardBtnB').tap();
  const menuBounds = await page.locator('#wardMenu').boundingBox();
  const viewBounds = await page.locator('#wardView').boundingBox();
  expect(menuBounds.y).toBeGreaterThanOrEqual(viewBounds.y);
  expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(viewBounds.y + viewBounds.height);
  await page.selectOption('#wardProfile', 'C7');
  await expect(page.locator('#wardProfileConfirm')).toBeVisible();
  await page.locator('#wardProfileCancel').tap();
  expect((await state(page)).ward).toBe('C9');
  await page.locator('#wardMenu').evaluate(node => { node.scrollTop = 0; });
  await attachScreenshot(page, testInfo, 'ward-mobile-profile');
  await context.close();
});
