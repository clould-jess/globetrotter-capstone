// Explicitly authorized live smoke test. Only synthetic accounts/content.
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const { writeFile, mkdir } = require("node:fs/promises");
const { chromium, request } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = "https://cameroon-169-58-83-56.sslip.io";

async function main() {
  assert.equal(process.env.CONFIRM_LIVE_TESTS,"cameroon-v3","Explicit live-test opt-in required");
  const output = ".sites-runtime";
  await mkdir(output,{recursive:true});
  const manifest = {run:randomUUID(),users:[],groups:[],completed:false};
  const save = () => writeFile(output+"/messaging-live-manifest.json",JSON.stringify(manifest,null,2),{mode:0o600});
  await save();
  const clients = [];
  const passwords = [];
  let browser;
  let checks = 0;
  async function api(client,path,method="GET",data,expected=200) {
    const response = await client.fetch(base+"/api/v1"+path,{method,data});
    assert.equal(response.status(),expected,path+" returned "+response.status()+": "+(await response.text()).slice(0,200));
    checks++;
    return expected === 204 ? null : await response.json();
  }
  try {
    for (let i=0;i<2;i++) {
      const client = await request.newContext();
      clients.push(client);
      const password = randomBytes(24).toString("base64url"); passwords.push(password);
      const email = "messaging-v3-"+manifest.run+"-"+i+"@example.invalid";
      const user = await api(client,"/auth/register","POST",{email,password,display_name:"V3 verification "+i},201);
      manifest.users.push({id:user.id,email}); await save();
    }
    const [owner,member] = clients;
    const group = await api(owner,"/community/groups","POST",{name:"V3 private verification",description:"Temporary automated verification",is_private:true},201);
    manifest.groups.push(group.id); await save();
    const prefix = "/community/groups/"+group.id;
    assert.equal((await api(member,"/community/groups")).some(g => g.id === group.id),false); checks++;
    await api(member,"/community/rooms/"+group.id+"/messages","GET",undefined,404);
    const invite = await api(owner,prefix+"/invitation","POST");
    await api(member,"/community/groups/invitations/accept","POST",{token:invite.token});
    const parent = await api(member,"/community/rooms/"+group.id+"/messages","POST",{body:"On se retrouve à quelle heure samedi ?"},201);
    await api(owner,"/community/rooms/"+group.id+"/messages","POST",{body:"À 8 heures.",reply_to:parent.id},201);
    let messages = await api(member,"/community/rooms/"+group.id+"/messages");
    assert.equal(messages.at(-1).reply.id,parent.id); checks++;
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD2sAAAAASUVORK5CYII=","base64");
    let response = await owner.post(base+"/api/v1/community/rooms/"+group.id+"/attachments",{multipart:{kind:"image",body:"Photo synthétique",reply_to:parent.id,file:{name:"test.png",mimeType:"image/png",buffer:png}}});
    assert.equal(response.status(),201,"image upload: "+await response.text()); checks++;
    const photo = await response.json();
    response = await member.get(base+"/api/v1/community/media/"+photo.id);
    assert.equal(response.status(),200); assert.match(response.headers()["content-type"],/image\/jpeg/); checks++;
    const wav = Buffer.alloc(32044);
    wav.write("RIFF",0); wav.writeUInt32LE(wav.length-8,4); wav.write("WAVEfmt ",8);
    wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
    wav.writeUInt32LE(16000,24); wav.writeUInt32LE(32000,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34);
    wav.write("data",36); wav.writeUInt32LE(32000,40);
    response = await owner.post(base+"/api/v1/community/rooms/"+group.id+"/attachments",{multipart:{kind:"audio",body:"Vocal synthétique",file:{name:"voice.wav",mimeType:"audio/wav",buffer:wav}}});
    assert.equal(response.status(),201,"audio upload: "+await response.text()); checks++;
    const voice = await response.json();
    response = await member.get(base+"/api/v1/community/media/"+voice.id);
    assert.equal(response.status(),200); assert.match(response.headers()["content-type"],/audio\/ogg/); checks++;
    browser = await chromium.launch({channel:"msedge",headless:true});
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror",e => errors.push(e.message));
    await page.goto(base+"/account?next=%2Fcommunity",{waitUntil:"domcontentloaded"});
    await page.getByLabel("Adresse e-mail").fill(manifest.users[0].email);
    await page.getByLabel("Mot de passe").fill(passwords[0]);
    await page.getByRole("button",{name:"Se connecter →",exact:true}).click();
    await page.waitForURL("**/community",{waitUntil:"domcontentloaded"});
    await page.getByRole("button",{name:/V3 private verification/}).click();
    await page.getByRole("button",{name:"Répondre à V3 verification 1",exact:true}).click();
    await page.getByRole("textbox",{name:"Votre message",exact:true}).fill("Réponse envoyée depuis le navigateur.");
    await page.getByRole("button",{name:"Envoyer",exact:true}).click();
    await page.locator(".message-bubble p").filter({hasText:"Réponse envoyée depuis le navigateur."}).waitFor();
    await page.reload({waitUntil:"domcontentloaded"});
    await page.getByRole("button",{name:/V3 private verification/}).click();
    await page.locator(".message-bubble p").filter({hasText:"Réponse envoyée depuis le navigateur."}).waitFor(); checks++;
    const voiceElement = page.locator(".message-audio").first();
    await voiceElement.evaluate(async audio => { await audio.play(); audio.pause(); }); checks++;
    await page.screenshot({path:output+"/messaging-v3-live.png"});
    assert.deepEqual(errors,[]); checks++;
    await api(owner,prefix+"/members/"+manifest.users[1].id,"DELETE",undefined,204);
    await api(member,"/community/rooms/"+group.id+"/messages","GET",undefined,404);
    response = await member.get(base+"/api/v1/community/media/"+photo.id);
    assert.equal(response.status(),404); checks++;
    await api(member,"/community/groups/invitations/accept","POST",{token:invite.token},403);
    await api(owner,prefix+"/invitation","DELETE",undefined,204);
    manifest.completed = true; manifest.checks = checks; await save();
    console.log(JSON.stringify({status:"passed",checks,accounts:2,mode:"live HTTPS API and Edge; synthetic content only",cleanup:"required using manifest"}));
  } finally {
    if (browser) await browser.close();
    for (const client of clients) await client.dispose();
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
