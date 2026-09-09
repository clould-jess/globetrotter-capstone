// Browser fixtures are synthetic; no user account or geographic fact is asserted.
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {mkdir} = require('node:fs/promises');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
async function main() {
  await mkdir('.sites-runtime',{recursive:true});
  const browser=await chromium.launch({channel:'msedge',headless:true});
  let checks=0;
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,geolocation:{latitude:3.866,longitude:11.517,accuracy:15},permissions:['geolocation']});
    const user={id:randomUUID(),display_name:'Map test',email:'map@example.invalid',role:'user',status:'active'};
    let saved=[], failRoute=false, failPlaces=false; const calls=[];
    await context.route('**/api/v1/**',async route=>{
      const request=route.request(),url=new URL(request.url()),path=url.pathname.replace('/api/v1',''),method=request.method();
      calls.push({path,method,kind:url.searchParams.get('kind')});
      const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(path==='/auth/session') return json(user);
      if(path==='/destinations') return json([]);
      if(path==='/community/maps/places') {
        if(failPlaces){failPlaces=false;return json({detail:'Map provider unavailable'},503);}
        const kind=url.searchParams.get('kind');
        return json({places:[{id:'test-'+kind,name:kind==='gym'?'Salle de sport test':'Monument test',lat:kind==='gym'?3.867:3.870,lng:kind==='gym'?11.524:11.52,address:'Adresse de test',kind,source:'https://www.openstreetmap.org/node/1',distance_m:800}]});
      }
      if(path==='/community/maps/route') {
        if(failRoute){failRoute=false;return json({detail:'No drivable route'},422);}
        const stops=request.postDataJSON().stops;
        return json({distance:6200,duration:1080,geometry:{type:'LineString',coordinates:stops.map(p=>[p.lng,p.lat])},legs:stops.slice(1).map(()=>({distance:3100,duration:540})),live_traffic:false});
      }
      if(path==='/community/journeys' && method==='GET') return json(saved);
      if(path==='/community/journeys' && method==='POST') {const j={...request.postDataJSON(),id:randomUUID()};saved.push(j);return json(j,201);}
      if(path.startsWith('/community/journeys/') && method==='PUT'){const id=path.split('/').at(-1),j={...request.postDataJSON(),id};saved=saved.map(old=>old.id===id?j:old);return json(j);}
      if(path.startsWith('/community/journeys/') && method==='DELETE'){saved=saved.filter(j=>j.id!==path.split('/').at(-1));return route.fulfill({status:204});}
      return json([]);
    });
    const page=await context.newPage(), errors=[];
    const tileFailures=[];
    page.on('response',r=>{if(r.url().includes('tile.openstreetmap.org') && r.status()>=400) tileFailures.push(r.status());});
    const waitTiles=async()=>{
      try { await page.waitForFunction(()=>{const tiles=[...document.querySelectorAll('.leaflet-tile')];return tiles.length>0 && tiles.every(i=>i.complete && i.naturalWidth>0);},{},{timeout:15000}); }
      catch { console.log('Tile availability:',JSON.stringify({failedStatuses:[...new Set(tileFailures)],loaded:await page.locator('.leaflet-tile-loaded').count()})); }
    };
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:3911';
    await page.goto(base+'/map',{waitUntil:'domcontentloaded',timeout:60000});
    await page.getByRole('button',{name:'Afficher ma position',exact:true}).waitFor();
    await page.waitForFunction(()=>document.querySelector('.map-locate') && !document.querySelector('.map-locate').disabled);
    assert.equal(await page.locator('vite-error-overlay').count(),0);checks++;
    await waitTiles();
    await page.screenshot({path:'.sites-runtime/maps-v4-initial.png'});
    console.log('Baseline: map and controls rendered.');
    await page.getByRole('button',{name:'Afficher ma position',exact:true}).click();
    await page.getByRole('button',{name:'Utiliser comme départ',exact:true}).click();
    assert.equal(await page.locator('.map-route-stops li').count(),1);checks++;
    for(const category of ['Gyms','Monuments']){
      await page.getByRole('button',{name:category,exact:true}).click();
      await page.locator('.map-results li > button').filter({hasText:category==='Gyms'?'Salle de sport test':'Monument test'}).click();
      await page.getByRole('button',{name:'Ajouter une étape',exact:true}).click();
    }
    assert.equal(await page.locator('.map-route-stops li').count(),3);checks++;
    await page.getByRole('button',{name:'Monter Monument test',exact:true}).click();
    assert.match(await page.locator('.map-route-stops li').nth(1).innerText(),/Monument test/);checks++;
    failRoute=true;
    await page.getByRole('button',{name:'Calculer le trajet en voiture',exact:true}).click();
    await page.getByRole('alert').waitFor();assert.equal(await page.locator('.map-route-stops li').count(),3);checks++;
    await page.getByRole('button',{name:'Calculer le trajet en voiture',exact:true}).click();
    await page.locator('.map-route-summary').waitFor();
    assert.match(await page.locator('.map-sheet-summary').innerText(),/6,2 km.*18 min/s);
    await page.getByRole('button',{name:'Agrandir le panneau',exact:true}).click();
    await page.getByRole('button',{name:'Réduire le panneau',exact:true}).click();checks++;
    assert.match(await page.locator('.map-route-summary').innerText(),/6,2 km.*18 min/s);checks++;
    await page.getByLabel('Nom du parcours',{exact:true}).fill('Sortie de test');
    await page.getByRole('button',{name:'Enregistrer le parcours',exact:true}).click();
    await page.getByRole('button',{name:'Mettre à jour le parcours',exact:true}).waitFor();
    await page.getByLabel('Nom du parcours',{exact:true}).fill('Sortie corrigée');
    await page.getByRole('button',{name:'Mettre à jour le parcours',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.map-notice')?.textContent.includes('enregistré'));
    assert.equal(saved.length,1);assert.equal(saved[0].name,'Sortie corrigée');checks++;
    await page.locator('.map-panel-body').evaluate(el=>el.scrollTop=0);
    for(const width of [320,390,820,1440]){
      await page.setViewportSize({width,height:844});
      await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      await waitTiles();
      await page.screenshot({path:'.sites-runtime/maps-v4-'+width+'.png'});checks++;
    }
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Replier le panneau',exact:true}).click();
    assert.equal(await page.locator('.map-panel-body').isVisible(),false);
    await page.getByRole('button',{name:'Ouvrir le panneau',exact:true}).click();checks++;
    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Mes parcours',exact:true}).click();
    await page.locator('.map-results li > button').filter({hasText:'Sortie corrigée'}).click();
    assert.equal(await page.locator('.map-route-stops li').count(),3);checks++;
    await page.getByRole('button',{name:'Retirer Salle de sport test',exact:true}).click();
    assert.equal(await page.locator('.map-route-summary').count(),0);checks++;
    await page.getByLabel('Rechercher un lieu au Cameroun',{exact:true}).fill('yaounde');
    assert.ok(await page.locator('.map-results li').count()>0);checks++;
    await page.getByRole('button',{name:'Changer la langue',exact:true}).click();
    await page.getByRole('heading',{name:'Map & journeys',exact:true}).waitFor();checks++;
    await page.getByRole('button',{name:'Change language',exact:true}).click();
    failPlaces=true;
    await page.getByRole('button',{name:'Ministères',exact:true}).click();
    await page.getByRole('alert').waitFor();checks++;
    for(const label of ['Restaurants','Sites','Hôtels']){
      await page.getByRole('button',{name:label,exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('.map-categories button')?.disabled);
    }
    assert.equal(new Set(calls.filter(c=>c.kind).map(c=>c.kind)).size,6);checks++;
    await context.clearPermissions();
    await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_ok,bad)=>bad({code:1})}}));
    await page.getByRole('button',{name:'Afficher ma position',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Position refusée'}).waitFor();checks++;
    await page.getByRole('button',{name:'Mes parcours',exact:true}).click();
    await page.getByRole('button',{name:'Supprimer Sortie corrigée',exact:true}).click();
    await page.getByText(/Aucun parcours enregistré/).waitFor();assert.equal(saved.length,0);checks++;
    assert.deepEqual(errors,[]);checks++;
    console.log(JSON.stringify({status:'passed',checks,mode:'Edge with synthetic API and location; real OSM tiles when available'}));
  } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
