const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const input=JSON.parse(process.env.OVERVIEW_TEST_INPUT);
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const artifacts='/tmp/bch-dashboard-overview';fs.mkdirSync(artifacts,{recursive:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:800},isMobile:true,hasTouch:true});
    await context.addCookies([{name:input.cookie,value:input.token,url:input.base}]);
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(input.base+input.path);
    await page.waitForSelector('[data-overview][data-ready]');
    await page.locator('[data-bch-consent-banner] [data-bch-consent-reject]').click();
    for(const width of [320,390,700,768,1079,1080,1280,1440]){
      await page.setViewportSize({width,height:800});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Overflow at '+width);
      assert.equal(await page.locator('[data-organization]:visible').count(),2);
      for(const link of await page.locator('.overview-card-actions a').all()){
        assert.equal(await link.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Action text overflow at '+width);
      }
      if(width<1080){
        await page.locator('[data-navigation-open]').click();
        assert.equal(await page.locator('#overview-navigation').evaluate(el=>el.matches(':modal')),true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('[data-navigation-open]').getAttribute('aria-expanded'),'false');
        assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('overview-navigation-open')),false);
      }else assert.equal(await page.locator('#overview-navigation').isVisible(),true);
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:artifacts+'/desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:800});
    const search=page.locator('#organization-search');
    await search.fill('ESTUDIO');
    assert.equal(await page.locator('[data-organization]:visible').count(),1);
    await search.fill('not a real organization');
    assert.equal(await page.locator('[data-organization]:visible').count(),0);
    assert.equal(await page.locator('[data-no-results]').isVisible(),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-organization]:visible').count(),2);
    await search.fill('<script>');
    assert.equal(await page.locator('[data-no-results]').isVisible(),true);
    await search.fill('');
    await search.blur();
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:artifacts+'/mobile.png',fullPage:true});
    await page.setViewportSize({width:390,height:400});
    await page.locator('[data-navigation-open]').click();
    const dialog=page.locator('#overview-navigation');
    const touch=await context.newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:320}]});
    for(let i=1;i<=8;i++){
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:120,y:320-i*28}]});
      await page.waitForTimeout(20);
    }
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>document.querySelector('#overview-navigation').scrollTop>10);
    await page.locator('.overview-menu a[href="#organizations"]').click();
    assert.equal(await dialog.evaluate(el=>el.open),false);
    await page.locator('[data-navigation-open]').click();
    await page.mouse.click(380,150);
    assert.equal(await dialog.evaluate(el=>el.open),false);
    await page.locator('[data-navigation-open]').click();
    await page.setViewportSize({width:1280,height:800});
    assert.equal(await dialog.evaluate(el=>el.open),false);
    assert.equal(await dialog.isVisible(),true);
    assert.equal(errors.length,0,errors.join('\n'));
    for(const language of ['pt-br','es','fr','de']){
      await context.addCookies([{name:input.languageCookie,value:language,url:input.base}]);
      await page.setViewportSize({width:320,height:800});
      await page.goto(input.base+input.path);
      await page.waitForSelector('[data-overview][data-ready]');
      assert.equal(await page.locator('html').getAttribute('lang'),language);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Translated overflow: '+language);
      assert.equal((await page.locator('#overview-title').textContent()).includes('One clear overview.'),false);
      for(const link of await page.locator('.overview-card-actions a').all()){
        assert.equal(await link.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Translated action overflow: '+language);
      }
    }
    const plainContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:700}});
    await plainContext.addCookies([{name:input.cookie,value:input.token,url:input.base}]);
    const plain=await plainContext.newPage();await plain.goto(input.base+input.path);
    assert.equal(await plain.locator('.overview-menu').isVisible(),true);
    assert.equal(await plain.locator('[data-organization]').count(),2);
    assert.equal(await plain.locator('[data-search-control]').isVisible(),false);
    assert.equal(await plain.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await plainContext.close();
    console.log('Overview passed: 320–1440px, long organization names, accent-insensitive search, empty results, modal touch scrolling, Escape/backdrop/resize, no-JS navigation.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
