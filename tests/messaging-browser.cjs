// Browser interaction tests with explicit API fixtures, not real-user tests.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { mkdir } = require("node:fs/promises");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

async function run() {
  const output = process.env.TEST_OUTPUT_DIR || ".sites-runtime";
  await mkdir(output,{recursive:true});
  const browser = await chromium.launch({channel:"msedge",headless:true,args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]});
  let checks = 0;
  try {
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,permissions:["camera","microphone"]});
    const user = {id:randomUUID(),display_name:"Jess",email:"test@example.invalid",role:"user",status:"active"};
    const other = randomUUID();
    let group = {id:"group-"+randomUUID(),name:"Week-end à Kribi",description:"Préparons notre sortie.",owner_id:user.id,is_private:true,joined:true,member_count:2};
    const makeMessage = (body,extra={}) => ({id:randomUUID(),destination_slug:group.id,user_id:other,display_name:"Amina",body,created_at:new Date().toISOString(),...extra});
    let messages = [makeMessage("On se retrouve à quelle heure samedi ?")];
    const parent = messages[0];
    const requests = [];
    let failNext = false;
    let signedIn = true;
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD2sAAAAASUVORK5CYII=","base64");
    await context.route("**/api/v1/**",async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace("/api/v1","");
      const method = request.method();
      const json = data => route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(data)});
      if (path === "/auth/session") return signedIn ? json(user) : route.fulfill({status:401,contentType:"application/json",body:'{"detail":"Authentication required"}'});
      if (path === "/auth/login") { signedIn=true; return json(user); }
      if (path === "/destinations") return json([]);
      if (path === "/community/groups" && method === "GET") return json([group]);
      if (path === "/community/groups" && method === "POST") { group = {...group,...request.postDataJSON()}; return json(group); }
      if (path.endsWith("/members")) return json([{user_id:user.id,display_name:"Jess",is_owner:true,blocked:false},{user_id:other,display_name:"Amina",is_owner:false,blocked:false}]);
      if (path.endsWith("/invitation")) return json({token:"a".repeat(43)});
      if (path === "/community/blocks") return json([]);
      if (path.includes("/media/")) return route.fulfill({status:200,contentType:"image/png",body:png});
      if (path.endsWith("/messages") && method === "GET") return json(messages);
      if (path.endsWith("/messages") && method === "POST") {
        if (failNext) { failNext=false; return route.abort("failed"); }
        const payload = request.postDataJSON(); requests.push(payload);
        const message = makeMessage(payload.body,{user_id:user.id,display_name:user.display_name,reply_to:payload.reply_to,is_reply:!!payload.reply_to,reply:messages.find(m => m.id === payload.reply_to) || null});
        messages.push(message); return json(message);
      }
      if (path.endsWith("/attachments")) {
        const text = request.postDataBuffer().toString();
        const message = makeMessage("",{user_id:user.id,display_name:user.display_name,media_kind:text.includes('name="kind"\r\n\r\naudio') ? "audio" : "image"});
        messages.push(message); return json(message);
      }
      if (method === "DELETE") { messages = messages.filter(m => !path.endsWith(m.id)); return route.fulfill({status:204}); }
      return json([]);
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror",e => errors.push(e.message));
    await page.goto((process.env.TEST_BASE_URL || "http://127.0.0.1:3911")+"/community",{waitUntil:"domcontentloaded",timeout:60000});
    await page.getByRole("button",{name:/Week-end à Kribi/}).click();
    await page.getByText(parent.body,{exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"Envoyer",exact:true}).count(),0);
    await page.getByRole("button",{name:"Enregistrer un vocal",exact:true}).waitFor(); checks++;
    await page.getByRole("button",{name:"Répondre à Amina",exact:true}).click();
    await page.locator(".reply-preview").waitFor();
    await page.getByRole("textbox",{name:"Votre message",exact:true}).fill("8 h, ça vous va ?");
    const send = page.getByRole("button",{name:"Envoyer",exact:true});
    assert.equal((await send.innerText()).trim(),"");
    await page.screenshot({path:output+"/messaging-v3-mobile.png"});
    await send.click();
    await page.locator(".message-bubble p").filter({hasText:"8 h, ça vous va ?"}).waitFor();
    assert.equal(requests.at(-1).reply_to,parent.id);
    assert.equal(await page.locator(".message-quote").count(),1); checks += 2;
    await page.getByRole("textbox",{name:"Votre message",exact:true}).fill("Brouillon conservé");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.getByRole("button",{name:/Week-end à Kribi/}).click();
    await page.waitForFunction(() => document.querySelector(".composer-input textarea")?.value === "Brouillon conservé"); checks++;
    failNext = true;
    await page.getByRole("button",{name:"Envoyer",exact:true}).click();
    await page.getByText(/Connexion interrompue/).waitFor();
    assert.equal(await page.getByRole("textbox",{name:"Votre message",exact:true}).inputValue(),"Brouillon conservé");
    await page.getByRole("button",{name:"Envoyer",exact:true}).click();
    await page.locator(".message-bubble p").filter({hasText:"Brouillon conservé"}).waitFor(); checks++;
    await page.getByRole("button",{name:"Choisir un émoji"}).click();
    await page.getByRole("button",{name:"😊",exact:true}).click();
    assert.equal(await page.getByRole("textbox",{name:"Votre message",exact:true}).inputValue(),"😊");
    await page.getByRole("textbox",{name:"Votre message",exact:true}).fill(""); checks++;
    const box = await page.locator("#msg-"+parent.id+" .message-bubble").boundingBox();
    await page.locator("#msg-"+parent.id).scrollIntoViewIfNeeded();
    const target = await page.locator("#msg-"+parent.id+" .message-bubble").boundingBox();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:target.x+30,y:target.y+20}]});
    await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:target.x+95,y:target.y+21}]});
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await page.locator(".reply-preview").waitFor();
    await page.getByRole("button",{name:"Annuler la réponse"}).click(); checks++;
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button",{name:"Joindre une photo",exact:true}).click();
    await (await chooserPromise).setFiles({name:"test.png",mimeType:"image/png",buffer:png});
    await page.getByAltText("Photo à envoyer").waitFor();
    await page.getByRole("button",{name:"Envoyer",exact:true}).click();
    await page.locator(".message-photo").waitFor(); checks++;
    await page.getByRole("button",{name:"Ouvrir la caméra"}).click();
    await page.getByRole("dialog",{name:"Prendre une photo"}).waitFor();
    await page.waitForFunction(() => document.querySelector(".camera-dialog video")?.videoWidth > 0);
    await page.getByRole("button",{name:"Prendre cette photo"}).click();
    await page.getByAltText("Photo à envoyer").waitFor();
    await page.getByRole("button",{name:"Retirer la pièce jointe"}).click(); checks++;
    await page.getByRole("button",{name:"Enregistrer un vocal"}).click();
    await page.getByRole("button",{name:"Arrêter et écouter"}).waitFor();
    await page.waitForFunction(() => document.querySelector(".recording-strip")?.innerText.includes("2s /"));
    await page.getByRole("button",{name:"Arrêter et écouter"}).click();
    await page.locator(".attachment-preview audio").waitFor();
    await page.getByRole("button",{name:"Retirer la pièce jointe"}).click(); checks++;
    await page.getByRole("button",{name:"Informations du groupe"}).click();
    await page.getByRole("button",{name:"Créer un nouveau lien d’invitation"}).click();
    await page.getByLabel("Lien à partager",{exact:false}).first().waitFor();
    assert.match(await page.locator(".group-invitation-controls input").inputValue(),/#invite=/);
    await page.getByRole("dialog").getByRole("button",{name:"Fermer",exact:true}).click(); checks++;
    for (const width of [320,390,820,1440]) {
      await page.setViewportSize({width,height:844});
      await page.waitForFunction(w => Math.abs(innerWidth-w)<2,width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1);
      assert.equal(overflow,false,"horizontal overflow at "+width);
      const toolbar = await page.locator(".composer-toolbar").boundingBox();
      assert.ok(toolbar.x >= 0 && toolbar.x+toolbar.width <= width+1);
      await page.screenshot({path:output+"/messaging-v3-"+width+".png"}); checks++;
    }
    await page.evaluate(() => { document.documentElement.dataset.lang="en"; });
    await page.getByRole("button",{name:"Record a voice message"}).waitFor(); checks++;
    signedIn = false;
    await page.goto((process.env.TEST_BASE_URL || "http://127.0.0.1:3911")+"/account#invite="+"a".repeat(43),{waitUntil:"domcontentloaded"});
    await page.getByLabel("Adresse e-mail").fill(user.email);
    await page.getByLabel("Mot de passe").fill("FixtureOnlyPassword123");
    await page.getByRole("button",{name:"Se connecter →",exact:true}).click();
    await page.waitForURL("**/community**");
    await page.locator(".invitation-prompt").waitFor(); checks++;
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({status:"passed",checks,mode:"Edge browser with API fixtures; not real-user testing",pageErrors:errors.length}));
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode=1; });
