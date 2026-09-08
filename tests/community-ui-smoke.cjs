// UI fixture tests only: backend/PostgreSQL integration is tested separately.
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS test with runtime-supplied Playwright. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}), args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['geolocation', 'microphone', 'camera'], geolocation: { latitude: 3.866, longitude: 11.517 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let signedIn = true;
    let groups = [];
    let messages = [];
    let journeys = [];
    const user = { id: '00000000-0000-4000-8000-000000000001', display_name: 'Test traveller', email: 'fixture@example.test', role: 'user', status: 'active' };
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    await page.route('**/api/v1/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.replace('/api/v1', '');
      const method = request.method();
      let result = {}; let status = 200;
      if (path === '/auth/session') { result = signedIn ? user : { detail: 'Authentication required' }; status = signedIn ? 200 : 401; }
      else if (path === '/auth/logout') { signedIn = false; status = 204; }
      else if (path === '/discovery/destinations') result = [{ slug: 'kribi', name: 'Kribi', region_fr: 'Sud', region_en: 'South', summary_fr: 'La plage', summary_en: 'Beach', categories: ['beach'], image_url: '/places/kribi-guide.webp', published: true }];
      else if (path === '/community/groups') {
        if (method === 'POST') { const payload = request.postDataJSON(); const group = { ...payload, id: 'group-00000000-0000-4000-8000-000000000002', joined: true, member_count: 1 }; groups.push(group); result = group; status = 201; }
        else result = groups;
      } else if (/\/messages$/.test(path)) {
        if (method === 'POST') { const payload = request.postDataJSON(); result = { ...payload, id: 'message-'+messages.length, user_id: user.id, display_name: user.display_name, created_at: new Date().toISOString() }; messages.push(result); status = 201; }
        else result = messages;
      } else if (/\/attachments$/.test(path)) {
        assert.ok(request.headers()['content-type'].startsWith('multipart/form-data;'));
        result = { id: 'photo-fixture', user_id: user.id, display_name: user.display_name, body: 'Photo test', media_kind: 'image', created_at: new Date().toISOString() }; messages.push(result); status = 201;
      } else if (path.startsWith('/community/media/')) { await route.fulfill({ contentType: 'image/png', body: png }); return; }
      else if (path.startsWith('/community/reviews/')) result = { count: 0, average: null, reviews: [] };
      else if (path === '/community/maps/route') {
        const stops = request.postDataJSON().stops;
        assert.ok(stops.length >= 2);
        result = { distance: 5600, duration: 840, legs: [{ distance: 5600, duration: 840 }], geometry: { coordinates: stops.map(stop => [stop.lng, stop.lat]) } };
      } else if (path === '/community/maps/places') result = { places: [{ id: 'osm-node-1', name: 'Gym fixture', kind: 'gym', lat: 3.86, lng: 11.51, address: '', source: 'https://www.openstreetmap.org/node/1' }] };
      else if (path === '/community/journeys') {
        if (method === 'POST') { result = { ...request.postDataJSON(), id: 'journey-1' }; journeys.push(result); status = 201; }
        else result = journeys;
      } else { status = 404; result = { detail: 'Unmocked endpoint: '+path }; }
      await route.fulfill({ status, contentType: 'application/json', body: status === 204 ? '' : JSON.stringify(result) });
    });
    const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3911';
    await page.goto(base+'/community');
    await page.getByText('Créer un groupe', { exact: true }).waitFor({ timeout: 15000 }).catch(async error => {
      console.error('UI text:', (await page.locator('body').innerText()).slice(0,2500), 'Runtime errors:', errors);
      await page.screenshot({ path: '.sites-runtime/community-failure.png', fullPage: true }); throw error;
    });
    await page.getByText('Créer un groupe', { exact: true }).click();
    await page.getByLabel('Nom du groupe').fill('Voyageurs de Kribi');
    await page.getByLabel('Description', { exact: true }).fill('Sortie du week-end');
    await page.getByRole('button', { name: 'Créer et rejoindre' }).click();
    await page.locator('.chat-composer textarea').fill('Bonjour les voyageurs !');
    await page.locator('.chat-composer button[type=submit]').click();
    await page.getByText('Bonjour les voyageurs !', { exact: true }).waitFor();
    await page.locator('input[type=file][accept="image/jpeg,image/png,image/webp"]').last().setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Envoyer le fichier' }).click();
    await page.locator('.chat-photo').waitFor();
    assert.equal(messages.length, 2);
    await page.getByRole('button', { name: 'Ouvrir la caméra' }).click();
    await page.waitForFunction(() => document.querySelector('.photo-capture video')?.videoWidth > 0);
    await page.getByRole('button', { name: 'Prendre cette photo' }).click();
    await page.locator('.media-preview img').waitFor();
    assert.equal(await page.locator('.photo-capture video').evaluate(video => video.srcObject === null), true);
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await page.getByRole('button', { name: 'Enregistrer un vocal' }).click();
    await page.getByRole('button', { name: /Arrêter ·/ }).waitFor();
    await page.waitForTimeout(1100);
    await page.getByRole('button', { name: /Arrêter ·/ }).click();
    await page.locator('.media-preview audio').waitFor();
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await page.screenshot({ path: '.sites-runtime/community-desktop.png', fullPage: true });
    await page.goto(base+'/itinerary');
    await page.locator('.leaflet-container').waitFor();
    await page.getByRole('button', { name: 'Afficher ma position' }).click();
    await page.getByRole('button', { name: 'Ajouter comme étape' }).click();
    await page.getByRole('button', { name: 'Repérer ce lieu' }).click();
    await page.getByRole('button', { name: 'Ajouter au parcours' }).click();
    await page.getByRole('button', { name: 'Calculer le trajet en voiture' }).click();
    await page.getByText('5.6 km · 14 min', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Enregistrer dans mon compte' }).click();
    await page.getByText('Parcours enregistré dans votre compte.').waitFor();
    assert.equal(journeys.length, 1);
    await page.getByRole('button', { name: 'Rechercher dans cette zone' }).click();
    await page.getByRole('button', { name: 'Gym fixture', exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.sites-runtime/itinerary-mobile.png', fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobile page must not overflow horizontally');
    signedIn = false;
    await page.goto(base+'/community');
    await page.waitForURL('**/account?next=*');
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log('PASS: fixture UI group creation, text, photo preview/upload, camera capture/cleanup, voice recording preview, geolocation, multi-stop route, saved journey, nearby gym, mobile width and login redirect.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
