const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const input=JSON.parse(process.env.PRIVACY_TEST_INPUT);
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:800},isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(input.base+input.path);
  const root=page.locator('[data-bch-consent]');const banner=root.locator('[data-bch-consent-banner]');
  await banner.waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>BCHFlowPrivacy.allows('external_media')),false);
  await page.evaluate(()=>localStorage.setItem('site_terms_consent_v1','untouched'));
  await page.evaluate(()=>{window.starts=0;window.stops=0;BCHFlowPrivacy.register('external_media',()=>starts++,()=>stops++);});
  assert.equal(await page.evaluate(()=>starts),0);
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:800});
   assert.equal(await banner.evaluate(el=>el.getBoundingClientRect().right<=innerWidth),true);
   assert.equal(await root.evaluate(el=>el.scrollWidth<=innerWidth),true);
  }
  await banner.locator('[data-bch-consent-reject]').click();
  assert.equal(await banner.isVisible(),false);
  assert.equal(await page.evaluate(()=>BCHFlowPrivacy.allows('external_media')),false);
  await page.reload();
  await page.waitForFunction(()=>!!window.BCHFlowPrivacy);
  assert.equal(await banner.isVisible(),false);
  await root.locator('.bch-consent-links [data-bch-consent-open]').click();
  assert.equal(await root.locator('dialog input').isChecked(),false);
  await root.locator('dialog input').check();
  await root.locator('button[type=submit]').click();
  assert.equal(await page.evaluate(()=>BCHFlowPrivacy.allows('external_media')),true);
  await page.evaluate(()=>{window.starts=0;window.stops=0;BCHFlowPrivacy.register('external_media',()=>starts++,()=>stops++);});
  assert.equal(await page.evaluate(()=>starts),1);
  await root.locator('.bch-consent-links button').click();
  await root.locator('dialog [data-bch-consent-reject]').click();
  assert.equal(await page.evaluate(()=>stops),1);
  await page.goto(input.base+input.privacy);
  await page.waitForFunction(()=>!!window.BCHFlowPrivacy);
  assert.equal(await banner.isVisible(),false);
  // Invalid, obsolete and expired records must fail closed.
  for(const record of [{version:0,essential:true,external_media:true,saved_at:Date.now()}, {version:1,essential:true,external_media:true,saved_at:1}, {version:1,essential:true,external_media:'yes',saved_at:Date.now()}]){
   await page.evaluate(record=>{localStorage.setItem(`bchflow:privacy:${document.querySelector('[data-bch-consent]').dataset.scope}`,JSON.stringify(record));},record);
   await page.reload();await banner.waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>BCHFlowPrivacy.allows('external_media')),false);
  }
  // Other-tab withdrawal tears down optional integrations.
  await page.evaluate(()=>{window.stops=0;BCHFlowPrivacy.register('external_media',()=>{},()=>stops++);});
  await banner.locator('[data-bch-consent-accept]').click();
  const second=await context.newPage();await second.goto(input.base+input.privacy);
  await second.locator('.bch-consent-links button').click();
  await second.locator('dialog [data-bch-consent-reject]').click();
  await page.waitForFunction(()=>stops===1);
  await second.close();
  assert.equal(await page.evaluate(()=>localStorage.getItem('site_terms_consent_v1')),'untouched');
  for(const language of ['pt-br','es','fr','de']){
   await context.addCookies([{name:input.languageCookie,value:language,url:input.base}]);
   await page.setViewportSize({width:320,height:700});
   await page.reload();
   await root.locator('.bch-consent-links button').click();
   assert.equal(await page.locator('html').getAttribute('lang'),language);
   assert.equal(await root.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Translated dialog overflow: '+language);
   assert.notEqual(await root.locator('#bch-consent-preferences-title').textContent(),'Privacy choices');
   await page.keyboard.press('Escape');
  }
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('blocked')};});
  const blockedPage=await blocked.newPage();await blockedPage.goto(input.base+input.privacy);
  await blockedPage.locator('[data-bch-consent-banner] [data-bch-consent-reject]').click();
  assert.equal(await blockedPage.locator('[data-bch-consent-status]').textContent(),'Your browser could not save this choice. It applies to this page only.');
  const plain=await browser.newContext({javaScriptEnabled:false});const plainPage=await plain.newPage();await plainPage.goto(input.base+input.privacy);
  assert.equal(await plainPage.locator('.bch-consent-noscript').isVisible(),true);
  assert.equal(await plainPage.locator('[data-bch-consent-banner]').isVisible(),false);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('Privacy passed: default deny, reject/persist, allow/withdraw, cross-page/cross-tab, expiry/version/type validation, blocked storage, no JS and 320–1440px.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
