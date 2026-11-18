/* Uses a disposable database and the existing installed Chromium. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const input = JSON.parse(process.env.STOREFRONT_BROWSER_INPUT);
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox']});
  const artifacts = '/tmp/bch-storefront'; fs.mkdirSync(artifacts,{recursive:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1100},hasTouch:true});
    const errors=[];page.on('pageerror', error=>errors.push(error.message));
    await page.goto(input.base+input.path);
    await page.locator('[data-bch-consent-banner] [data-bch-consent-reject]').click();
    await page.locator('.sw-carousel-page').first().waitFor();
    assert.equal(await page.locator('.sw-carousel-page').count(),2);
    assert.equal(await page.locator('.sw-carousel-page').first().locator('[data-software-card]').count(),6);
    assert.equal(await page.locator('.bch-locale .bch-utility-links').count(),0);
    assert.equal(await page.locator('.sw-nav nav a').count(),3);
    const workspace=page.locator('.sw-nav nav a').last();
    await workspace.hover();
    await page.waitForFunction(el=>getComputedStyle(el).color==='rgb(255, 255, 255)'&&getComputedStyle(el).backgroundColor==='rgb(52, 58, 64)',await workspace.elementHandle());
    const colors=await workspace.evaluate(el=>({ink:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));
    assert.equal(colors.ink,'rgb(255, 255, 255)');
    assert.equal(colors.background,'rgb(52, 58, 64)');
    await page.mouse.move(0,0);
    assert.equal(await page.locator('.sw-download-button').count(),8);
    assert.equal(await page.locator('.sw-download-button svg').first().getAttribute('data-lucide'),'download');
    assert.match(await page.locator('.sw-download-button').first().getAttribute('href'),/#checkout-title$/);
    const ribbon=page.locator('[data-technologies]');
    assert.equal(await page.locator('[data-tech-group]:not([aria-hidden]) img').count(),30);
    await ribbon.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!document.querySelector('[data-technologies]').hasAttribute('data-away'));
    const track=page.locator('[data-tech-track]');
    const initial=await track.evaluate(el=>getComputedStyle(el).transform);
    await page.waitForTimeout(200);
    assert.notEqual(await track.evaluate(el=>getComputedStyle(el).transform),initial);
    await page.locator('[data-tech-play]').click();
    await page.locator('[data-tech-group]:not([aria-hidden]) [data-technology=Python]').click();
    assert.equal(await ribbon.getAttribute('data-paused'),'');
    assert.equal(await page.locator('[data-tech-caption]').textContent(),'Python');
    await page.locator('[data-tech-play]').click();
    await page.mouse.move(0,0);
    assert.equal(await ribbon.getAttribute('data-paused'),null);
    assert.equal(await track.evaluate(el=>getComputedStyle(el).animationPlayState),'running');
    const symbols=await page.locator('[data-tech-group]:not([aria-hidden]) [data-technology]').count();
    assert.equal(symbols,30);
    assert.equal(await page.locator('.bch-tech-item').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.equal(await page.locator('.bch-tech-item').first().evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
    const atlas=page.locator('[data-tech-group]:not([aria-hidden]) img').first();
    await page.waitForFunction(()=>document.querySelector('[data-tech-group] img')?.naturalWidth>0);
    const announcementHref=await page.locator('[data-announcement-item]:visible').getAttribute('href');
    await page.waitForFunction(href=>document.querySelector('[data-announcement-item]:not([hidden])').getAttribute('href')!==href,announcementHref,{timeout:11000});
    await page.locator('[data-announcement-toggle]').click();
    assert.equal(await page.locator('[data-announcement-toggle]').getAttribute('aria-pressed'),'false');
    const height=await page.locator('.bch-locale').evaluate(el=>el.getBoundingClientRect().height);
    assert.equal(height,42);
    await page.locator('[data-language-menu] summary').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-language-menu]').getAttribute('open'),null);
    await page.locator('[data-showcase]').scrollIntoViewIfNeeded();
    await page.mouse.move(0,0);
    await page.screenshot({path:artifacts+'/desktop.png',fullPage:true});
    await page.waitForFunction(()=>document.querySelector('[data-carousel-position]').textContent==='2 / 2', {timeout:9000});
    await page.getByRole('button',{name:'Previous software',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-carousel-position]').textContent==='1 / 2');
    await page.getByRole('button',{name:'Next software',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-carousel-position]').textContent==='2 / 2');
    assert.equal(await page.getByRole('button',{name:'Start automatic rotation'}).count(),1);
    const carousel=page.locator('[data-software-carousel]');
    // Position the viewport before issuing keyboard navigation. A subsequent
    // automation scroll can interrupt the browser's native smooth scroll.
    await carousel.scrollIntoViewIfNeeded();
    await carousel.focus();
    await page.keyboard.press('Home');
    await page.waitForFunction(()=>document.querySelector('[data-carousel-position]').textContent==='1 / 2');
    await page.waitForFunction(el=>Math.abs(el.scrollLeft)<el.clientWidth*.05,await carousel.elementHandle());
    const box=await carousel.boundingBox();
    const dragY=(Math.max(0,box.y)+Math.min(page.viewportSize().height,box.y+box.height))/2;
    await page.mouse.move(box.x+box.width*.8,dragY);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width*.15,dragY,{steps:15});
    await page.mouse.up();
    await page.waitForFunction(()=>document.querySelector('[data-carousel-position]').textContent==='2 / 2');
    await page.getByRole('searchbox').fill('Report builder');
    assert.equal(await page.locator('[data-software-track] [data-software-card]').count(),1);
    const image=page.locator('[data-software-track] img');
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('[data-software-track] img')?.naturalWidth>0);
    await image.hover();
    await page.waitForTimeout(220);
    const fitted=await image.evaluate(el=>({image:el.getBoundingClientRect().height,frame:el.parentElement.getBoundingClientRect().height}));
    assert.equal(fitted.image<=fitted.frame+1,true,'Image element must stay inside its frame');
    const imageStyle=await image.evaluate(el=>({fit:getComputedStyle(el).objectFit,transform:getComputedStyle(el).transform}));
    assert.equal(imageStyle.fit,'cover');
    assert.equal(imageStyle.transform,'none');
    await page.getByRole('searchbox').fill('no-match-xyz');
    assert.equal(await page.locator('[data-no-results]').isVisible(),true);
    await page.getByRole('searchbox').fill('');
    await page.getByRole('button',{name:'Pix',exact:true}).click();
    assert.equal(await page.locator('[data-software-track] [data-software-card]').count(),1);
    await page.getByRole('button',{name:'All software',exact:true}).click();
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:900});
      await page.waitForTimeout(150);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      if(overflow){await page.screenshot({path:artifacts+`/overflow-${width}.png`,fullPage:true}); console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).map(el=>({tag:el.tagName,cls:el.className,x:el.getBoundingClientRect().x,width:el.getBoundingClientRect().width,overflow:getComputedStyle(el).overflow})).filter(el=>el.x+el.width>innerWidth+1).slice(0,25)));}
      assert.equal(overflow,false,`Overflow at ${width}`);
      const size=width>=1000?6:width>=620?4:2;
      assert.equal(await page.locator('.sw-carousel-page').first().locator('[data-software-card]').count(),size);
      const geometry=await page.locator('.sw-carousel-page').first().locator('[data-software-card]').first().evaluate(card=>{
        const rect=card.getBoundingClientRect();
        const title=card.querySelector('h3 a');
        const description=card.querySelector('.sw-product-summary');
        const image=card.querySelector('.sw-product-visual');
        const price=card.querySelector('.sw-price-list').getBoundingClientRect();
        const action=card.querySelector('.sw-download-button').getBoundingClientRect();
        return {width:rect.width,height:rect.height,screen:innerHeight,
          titleTruncated:title.scrollWidth>title.clientWidth,
          titleFits:title.clientWidth<=rect.width,
          descriptionHeight:description.getBoundingClientRect().height,
          descriptionLimit:parseFloat(getComputedStyle(description).lineHeight)*2,
          imageHeight:image.getBoundingClientRect().height,
          sameRow:Math.abs((price.top+price.bottom)/2-(action.top+action.bottom)/2)<3};
      });
      assert.equal(geometry.height<Math.min(460,geometry.screen-80),true,JSON.stringify(geometry));
      assert.equal(geometry.titleTruncated,true,'Long software title must be ellipsized');
      assert.equal(geometry.titleFits,true);
      assert.equal(geometry.descriptionHeight<=geometry.descriptionLimit+1,true);
      assert.equal(geometry.imageHeight<=134,true);
      assert.equal(geometry.sameRow,true,'Price and Download must share a row');

      await page.locator('[data-language-menu] summary').click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Language menu overflows');
      await page.keyboard.press('Escape');
      if(width===390) {
        await ribbon.scrollIntoViewIfNeeded();
        const touchBox=await ribbon.boundingBox();
        await page.touchscreen.tap(touchBox.x+25,touchBox.y+25);
        assert.equal(await ribbon.getAttribute('data-paused'),'');
        await page.screenshot({path:artifacts+'/mobile.png',fullPage:true});
      }
    }
    await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
    await page.locator('.sw-carousel-page').first().waitFor();
    assert.equal(await page.getByRole('button',{name:'Start automatic rotation'}).count(),1);
    assert.equal(await track.evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.locator('[data-language-menu] summary').click();
    await page.locator('button[name=language][value=pt-br]').click();
    await page.getByRole('heading',{name:'Encontre sua próxima ferramenta.'}).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'),'pt-br');
    await page.locator('.sw-download-button').first().click();
    await page.waitForURL('**/software/products/**#checkout-title');
    assert.equal(await page.locator('#checkout-title').isVisible(),true);
    assert.equal(await page.locator('form[data-pending-form]').count(),1);
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('Storefront browser passed: 6/4/2 cards, 320–1440px, image, search, filter, keyboard, reduced motion and language picker.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
