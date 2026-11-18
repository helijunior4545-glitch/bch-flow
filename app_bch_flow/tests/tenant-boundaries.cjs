const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const input=JSON.parse(process.env.BCH_TENANT_TEST);
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    const context=await browser.newContext();
    await context.addCookies([{name:input.guestCookie,value:input.guestToken,url:input.base}]);
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(input.base+input.library);
    assert.equal(await page.locator(`a[href="${input.guestOrder}"]`).count(),1);
    async function login(email){
      await page.goto(input.base+input.login+'?next='+encodeURIComponent(input.library));
      await page.getByLabel('Email',{exact:true}).fill(email);
      await page.getByLabel('Password',{exact:true}).fill('long-software-password-123');
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await page.waitForURL('**'+input.library);
    }
    await login(input.buyer);
    assert.equal(await page.locator(`a[href="${input.buyerOrder}"]`).count(),1);
    assert.equal(await page.locator(`a[href="${input.guestOrder}"]`).count(),0);
    assert.equal((await page.request.get(input.base+input.guestStatus)).status(),404);
    const oldTab=await context.newPage();
    await oldTab.goto(input.base+input.library);
    assert.equal(await oldTab.locator(`a[href="${input.buyerOrder}"]`).count(),1);
    const csrf=await page.locator('input[name=csrfmiddlewaretoken]').first().inputValue();
    const logout=await page.request.post(input.base+input.logout,{headers:{'X-CSRFToken':csrf,'Referer':page.url()}});
    assert.equal(logout.ok(),true);
    await login(input.other);
    assert.equal(await page.locator(`a[href="${input.buyerOrder}"]`).count(),0);
    assert.equal(await page.locator(`a[href="${input.guestOrder}"]`).count(),0);
    const refreshed=oldTab.waitForResponse(r=>r.url().endsWith(input.library)&&r.request().isNavigationRequest());
    await oldTab.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await refreshed;
    await oldTab.waitForLoadState('domcontentloaded');
    assert.equal(await oldTab.locator(`a[href="${input.buyerOrder}"]`).count(),0);
    assert.equal((await page.request.get(input.base+input.buyerOrder)).status(),404);
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('Browser tenant isolation passed: guest → account A → logout → account B; old tab revalidated and foreign orders denied.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
