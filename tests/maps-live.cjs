// Explicit live opt-in; synthetic accounts and public test coordinates only.
const assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto');
const {writeFile,mkdir}=require('node:fs/promises');
const {chromium,request}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base='https://cameroon-169-58-83-56.sslip.io';
async function main(){
  assert.equal(process.env.CONFIRM_LIVE_TESTS,'cameroon-map-v4');
  await mkdir('.sites-runtime',{recursive:true});
  const manifest={run:randomUUID(),users:[],journeys:[],completed:false,providers:[]};
  const persist=()=>writeFile('.sites-runtime/maps-live-manifest.json',JSON.stringify(manifest,null,2),{mode:0o600});
  await persist();let browser;const clients=[],passwords=[];let checks=0;
  async function api(client,path,method='GET',data,expected=200){
    const r=await client.fetch(base+'/api/v1'+path,{method,data,timeout:40000});
    assert.equal(r.status(),expected,path+' status '+r.status());checks++;
    return expected===204?null:r.json();
  }
  try{
    for(let i=0;i<2;i++){
      const c=await request.newContext();clients.push(c);
      const password=randomBytes(24).toString('base64url');passwords.push(password);
      const email='map-v4-'+manifest.run+'-'+i+'@example.invalid';
      const u=await api(c,'/auth/register','POST',{email,password,display_name:'Map verification '+i},201);
      manifest.users.push({id:u.id,email});await persist();
    }
    const [owner,other]=clients;
    const stops=[{name:'Départ test',lat:3.866,lng:11.517,approximate:false},{name:'Arrivée test',lat:3.870,lng:11.52,approximate:false}];
    const route=await api(owner,'/community/maps/route','POST',{stops:stops.map(({lat,lng})=>({lat,lng}))});
    assert.ok(route.distance>0 && route.duration>0 && route.geometry.coordinates.length>1);checks++;
    const j=await api(owner,'/community/journeys','POST',{name:'V4 verification '+manifest.run,stops},201);
    manifest.journeys.push(j.id);await persist();
    assert.equal((await api(other,'/community/journeys')).some(row=>row.id===j.id),false);checks++;
    await api(other,'/community/journeys/'+j.id,'PUT',{name:'Unauthorized edit',stops},404);
    await api(other,'/community/journeys/'+j.id,'DELETE',undefined,404);
    await api(owner,'/community/maps/places?kind=unknown&lat=3.86&lng=11.5','GET',undefined,422);
    browser=await chromium.launch({channel:'msedge',headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/account?next=%2Fmap',{waitUntil:'domcontentloaded'});
    await page.getByLabel('Adresse e-mail').fill(manifest.users[0].email);
    await page.getByLabel('Mot de passe').fill(passwords[0]);
    await page.getByRole('button',{name:'Se connecter →',exact:true}).click();
    await page.waitForURL('**/map',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Mes parcours',exact:true}).click();
    await page.locator('.map-results li > button').filter({hasText:j.name}).click();
    assert.equal(await page.locator('.map-route-stops li').count(),2);checks++;
    await page.getByRole('button',{name:'Calculer le trajet en voiture',exact:true}).click();
    await page.locator('.map-route-summary').waitFor({timeout:40000});checks++;
    const renamed='V4 verification '+manifest.run+' modified';
    await page.getByLabel('Nom du parcours',{exact:true}).fill(renamed);
    await page.getByRole('button',{name:'Mettre à jour le parcours',exact:true}).click();
    await page.locator('.map-notice').filter({hasText:'enregistré'}).waitFor();
    const saved=await api(owner,'/community/journeys');assert.equal(saved.find(row=>row.id===j.id).name,renamed);checks++;
    await page.locator('.map-panel-body').evaluate(el=>el.scrollTop=0);
    try{await page.waitForFunction(()=>{const imgs=[...document.querySelectorAll('.leaflet-tile')];return imgs.length>0 && imgs.every(i=>i.complete && i.naturalWidth>0);},{},{timeout:15000});}catch{/* Tile availability is reported separately. */}
    await page.screenshot({path:'.sites-runtime/maps-v4-live.png'});
    manifest.loadedTiles=await page.locator('.leaflet-tile-loaded').count();
    assert.deepEqual(errors,[]);checks++;
    for(const kind of ['restaurant','site','ministry']){
      const response=await owner.get(base+'/api/v1/community/maps/places?kind='+kind+'&lat=3.866&lng=11.517',{timeout:40000});
      assert.ok([200,429,503].includes(response.status()),kind+' unexpected status '+response.status());
      const data=await response.json();
      manifest.providers.push({kind,status:response.status(),places:data.places?.length??null});await persist();
      if(response.status()===200){assert.ok(Array.isArray(data.places));checks++;}
    }
    await api(owner,'/community/journeys/'+j.id,'DELETE',undefined,204);
    assert.equal((await api(owner,'/community/journeys')).some(row=>row.id===j.id),false);checks++;
    manifest.completed=true;manifest.checks=checks;await persist();
    console.log(JSON.stringify({status:'passed',checks,providers:manifest.providers,loadedTiles:manifest.loadedTiles,cleanup:'two test accounts still require audited cleanup'}));
  }finally{if(browser)await browser.close();for(const c of clients)await c.dispose();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
