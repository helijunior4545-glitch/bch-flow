const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const input=JSON.parse(process.env.WALLET_LAYOUT_INPUT);
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const artifacts='/tmp/bch-wallet-mobile';fs.mkdirSync(artifacts,{recursive:true});
  try{
    const initial=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:700}});
    await initial.addCookies([{name:input.cookie,value:input.token,url:input.base}]);
    const plain=await initial.newPage();
    await plain.goto(input.base+input.path+'?asset=BCH&environment=live');
    assert.equal(await plain.locator('[data-bfr-environment-dock] [data-wizardconnect]').count(),1);
    assert.equal(await plain.locator('[data-bfr-environment-dock] form[data-financial-environment]').count(),1);
    assert.equal(await plain.locator('dialog:visible').count(),0);
    assert.equal(await plain.locator('[hidden]:visible').count(),0);
    assert.equal(await plain.locator('.bfr-eu-backdrop').isVisible(),false);
    await plain.screenshot({path:artifacts+'/first-paint-no-js.png',fullPage:true});
    await initial.close();
    const context=await browser.newContext({viewport:{width:390,height:700},hasTouch:true,isMobile:true,deviceScaleFactor:2,reducedMotion:'no-preference'});
    await context.addCookies([{name:input.cookie,value:input.token,url:input.base}]);
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/market-rates/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
    await page.route('**/api/live-ohlc/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
    await page.goto(input.base+input.path+'?asset=BTC&environment=sandbox');
    // Choose essentials before exercising unrelated wallet gestures.
    await page.locator('[data-bch-consent-banner] [data-bch-consent-reject]').click();
    const sidebar=page.locator('#bfr-eu-sidebar');
    const menu=page.locator('.bfr-eu-menu-button');
    await page.waitForFunction(()=>document.querySelector('#bfr-eu-sidebar').inert);
    for(const width of [320,390,768,800,801,850,1024,1440]){
      await page.setViewportSize({width,height:700});await page.waitForTimeout(100);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      if(overflow){console.log(await page.evaluate(()=>[...document.querySelectorAll('#main *')].map(el=>({tag:el.tagName,cls:el.className,x:el.getBoundingClientRect().x,w:el.getBoundingClientRect().width})).filter(el=>el.x+el.w>innerWidth+2).slice(0,12)));}
      assert.equal(overflow,false,'Horizontal overflow at '+width);
      if(width<=800){
        await sidebar.waitFor({state:'hidden'});
        await menu.click();
        assert.equal(await menu.getAttribute('aria-expanded'),'true');
        await sidebar.waitFor({state:'visible'});
        await page.waitForFunction(()=>Math.abs(document.querySelector('#bfr-eu-sidebar').getBoundingClientRect().left)<1);
        assert.equal(await sidebar.evaluate(el=>el.getBoundingClientRect().width)<=265,true);
        assert.equal(await sidebar.locator('.premium-menu a').first().evaluate(el=>el.getBoundingClientRect().width)<=209,true);
        assert.equal(await page.locator('.premium-main').evaluate(el=>el.inert),true);
        await page.keyboard.press('Escape');
        assert.equal(await menu.getAttribute('aria-expanded'),'false');
        assert.equal(await page.locator('.premium-main').evaluate(el=>el.inert),false);
      }else await sidebar.waitFor({state:'visible'});
    }
    await page.setViewportSize({width:390,height:400});
    await page.evaluate(()=>window.scrollTo({top:200,behavior:'instant'}));
    const y=await page.evaluate(()=>scrollY);
    await menu.evaluate(el=>el.click());
    assert.equal(await sidebar.evaluate(el=>el.scrollHeight>el.clientHeight),true);
    const touch=await context.newCDPSession(page);
    async function swipe(from,to){
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:from}]});
      for(let step=1;step<=8;step++){
        await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:130,y:from+(to-from)*step/8}]});
        await page.waitForTimeout(20);
      }
      await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.waitForTimeout(250);
    }
    await page.waitForFunction(()=>Math.abs(document.querySelector('#bfr-eu-sidebar').getBoundingClientRect().left)<1);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.body).position),'static');
    assert.equal(await sidebar.evaluate(el=>Math.abs(el.getBoundingClientRect().top)<1),true);
    await sidebar.evaluate(el=>el.scrollTop=0);
    await swipe(320,90);
    await page.waitForFunction(()=>document.querySelector('#bfr-eu-sidebar').scrollTop>20);
    const down=await sidebar.evaluate(el=>el.scrollTop);
    await swipe(100,330);
    await page.waitForFunction(old=>document.querySelector('#bfr-eu-sidebar').scrollTop<old,down);
    await swipe(320,90);
    assert.equal(await sidebar.evaluate(el=>el.scrollTop>0),true);
    await page.screenshot({path:artifacts+'/drawer-short-screen.png',fullPage:false});
    await page.keyboard.press('Escape');
    assert.equal(Math.abs(await page.evaluate(()=>scrollY)-y)<2,true,'Page position must be restored');
    await swipe(320,90);
    await page.waitForFunction(previous=>scrollY>previous,y);
    assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('bfr-drawer-scroll-lock')),false);
    await menu.click();
    await page.waitForFunction(()=>Math.abs(document.querySelector('#bfr-eu-sidebar').getBoundingClientRect().left)<1);
    await page.mouse.click(380,200);
    assert.equal(await menu.getAttribute('aria-expanded'),'false');
    await page.setViewportSize({width:390,height:800});
    await page.locator('.premium-assets a').filter({hasText:'BRL'}).click();
    await page.waitForFunction(()=>document.querySelector('[data-payment-app]').dataset.asset==='BRL');
    await page.waitForFunction(()=>document.querySelector('#bfr-eu-sidebar')?.inert===true);
    assert.equal(await page.locator('.bfr-eu-close').count(),1);
    assert.equal(await page.locator('[data-bfr-environment-dock] form[data-financial-environment]').count(),1);
    assert.equal(await page.locator('[data-bfr-environment-dock] .bfr-wizard-standby').count(),1);
    await menu.click();
    assert.equal(await menu.getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');
    await menu.click();
    await page.locator('.premium-menu a[href$="#requests"]').click();
    await page.waitForFunction(()=>location.hash==='#requests');
    assert.equal(await menu.getAttribute('aria-expanded'),'false');
    assert.equal(await page.locator('.premium-menu a[aria-current=page]').count(),1);
    assert.match(await page.locator('.premium-menu a[aria-current=page]').getAttribute('href'),/#requests$/);
    await page.locator('[data-open-dialog="receive-dialog"]').click();
    assert.equal(await page.locator('#receive-dialog').evaluate(el=>el.open),true);
    await page.locator('#receive-dialog [data-close-dialog]').click();
    assert.equal(await page.locator('dialog:visible').count(),0);
    await page.screenshot({path:artifacts+'/wallet-mobile.png',fullPage:true});
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('Wallet layout passed: no-JS first paint, 320–1440px, short-screen drawer scrolling, Escape/backdrop, scroll restoration, AJAX currency swap and payment dialog.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
