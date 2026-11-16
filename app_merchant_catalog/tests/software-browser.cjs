/* Run by test_software_browser.py against its disposable Django live server. */
const {chromium} = require('playwright');
const fs = require('node:fs');
(async () => {
  const input = JSON.parse(process.env.SOFTWARE_BROWSER_INPUT);
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}, reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    if(input.cookie) await page.context().addCookies([{name:input.cookie.name,value:input.cookie.value,url:input.base}]);
    if(input.phase === 'purchase') {
      await page.goto(input.base+input.product);
      await page.getByRole('link',{name:'Sign in to purchase'}).click();
      await page.getByLabel('Email',{exact:true}).fill('buyer@software.invalid');
      await page.getByLabel('Password',{exact:true}).fill('long-software-password-123');
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await page.waitForURL('**'+input.product);
      await page.screenshot({path:input.artifacts+'/software-product-desktop.png',fullPage:true});
      await page.setViewportSize({width:390,height:844});
      if(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)) throw Error('Product overflows mobile viewport');
      await page.screenshot({path:input.artifacts+'/software-product-mobile.png',fullPage:true});
      const purchaseResponse=page.waitForResponse(response=>response.request().method()==='POST' && response.url().includes('/software/buy/'));
      await page.getByRole('button',{name:/BCH/}).click();
      const purchase=await purchaseResponse;
      if(purchase.status()>=400) throw Error('Purchase HTTP '+purchase.status()+': '+(await purchase.text()).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,2500));
      await page.screenshot({path:input.artifacts+'/software-after-purchase.png',fullPage:true});
      await page.waitForURL('**/software/orders/**');
      if(await page.getByRole('button',{name:'Download software'}).isVisible()) throw Error('Unpaid download exposed');
      await page.screenshot({path:input.artifacts+'/software-order-pending.png',fullPage:true});
      const cookie=(await page.context().cookies()).find(c=>c.name===input.cookieName);
      fs.writeFileSync(input.result,JSON.stringify({url:page.url(),cookie}),{mode:0o600});
    } else {
      await page.goto(input.order);
      await page.getByRole('heading',{name:'Your software is ready.'}).waitFor();
      const completed=page.waitForEvent('download');
      await page.getByRole('button',{name:'Download software'}).click();
      const download=await completed;
      await download.saveAs(input.artifacts+'/software-download.zip');
      if(await page.locator('form[data-submit-feedback]').getAttribute('aria-busy')) throw Error('Download button stayed busy');
      await page.screenshot({path:input.artifacts+'/software-order-ready.png',fullPage:true});
      await page.setViewportSize({width:390,height:844});
      if(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth)) throw Error('Order overflows mobile viewport');
    }
    if(errors.length) throw Error(errors.join('\n'));
    console.log('Browser '+input.phase+' passed; no JavaScript errors.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
