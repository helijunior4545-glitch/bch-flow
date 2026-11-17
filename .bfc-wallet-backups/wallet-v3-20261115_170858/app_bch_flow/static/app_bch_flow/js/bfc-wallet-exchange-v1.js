/* BCH Flow Wallet V1. Markets are visualization only, never authoritative settlement data. */
(()=>{'use strict';
 const root=document.querySelector('[data-bfc-market]');if(!root)return;
 const assetRoot=document.querySelector('[data-payment-app]');
 const pair=root.querySelector('[data-bfc-pair]'),price=root.querySelector('[data-bfc-price]');
 const plot=root.querySelector('canvas'),hint=root.querySelector('[data-bfc-empty]');
 const ctx=plot.getContext('2d');if(!ctx){hint.hidden=false;hint.textContent='Chart is not supported by this browser.';return}
 const money=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n<1?5:2}).format(n):'—';
 const prices=[...root.querySelectorAll('[data-bfc-rate]')];
 let asset=['BTC','BCH'].includes(assetRoot?.dataset.asset)?assetRoot.dataset.asset:'BCH';
 let period='1',points=[],seq=0,raf=0,progress=1,hover=-1,ready=false,disposed=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const buttons=[...root.querySelectorAll('[data-bfc-days]')];
 const observe=new IntersectionObserver(entries=>{ready=entries.some(e=>e.isIntersecting);if(ready&&points.length)draw();},{threshold:.02});observe.observe(plot);
 function resize(){if(!plot.isConnected)return;const r=plot.getBoundingClientRect();if(!r.width||!r.height)return;const d=Math.min(devicePixelRatio||1,2);plot.width=Math.round(r.width*d);plot.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0);draw()}
 let resizeObs;if('ResizeObserver'in window){resizeObs=new ResizeObserver(resize);resizeObs.observe(plot)}else addEventListener('resize',resize,{passive:true});
 function buildCandles(list){const clean=list.filter(x=>Array.isArray(x)&&x.length===2&&Number.isFinite(Number(x[0]))&&Number.isFinite(Number(x[1]))&&Number(x[1])>0).map(x=>[Number(x[0]),Number(x[1])]).sort((a,b)=>a[0]-b[0]);
  if(clean.length<2)return []; const count=Math.min(64,Math.floor(clean.length/2));const step=Math.max(1,Math.ceil(clean.length/count));const result=[];
  for(let i=0;i<clean.length;i+=step){const part=clean.slice(i,i+step);if(!part.length)continue;const vals=part.map(p=>p[1]);result.push({t:part[0][0],o:vals[0],c:vals[vals.length-1],h:Math.max(...vals),l:Math.min(...vals)})}
  return result;
 }
 function draw(){if(!plot.width||!points.length||!ready)return;const d=Math.min(devicePixelRatio||1,2),w=plot.width/d,h=plot.height/d,pL=9,pR=64,pT=14,pB=24;
 ctx.clearRect(0,0,w,h);const hi=Math.max(...points.map(x=>x.h)),lo=Math.min(...points.map(x=>x.l));const pad=(hi-lo)*.15||hi*.015;const min=lo-pad,max=hi+pad;const y=v=>pT+(max-v)/(max-min)*(h-pT-pB);const gw=w-pL-pR,gh=h-pT-pB;
 ctx.strokeStyle='rgba(153,170,195,.13)';ctx.lineWidth=1;ctx.font='10px system-ui';ctx.fillStyle='#9da8ba';ctx.textAlign='right';
 for(let j=0;j<5;j++){const yy=pT+j*gh/4;ctx.beginPath();ctx.moveTo(pL,yy);ctx.lineTo(w-pR+7,yy);ctx.stroke();ctx.fillText((max-j*(max-min)/4).toLocaleString('en-US',{maximumFractionDigits:2}),w-4,yy+3)}
 const width=Math.max(2.1,Math.min(12,gw/points.length*.68));const count=Math.max(1,Math.min(points.length,Math.floor(points.length*progress)));
 for(let i=0;i<count;i++){const c=points[i],x=pL+(i+.5)*gw/points.length,rise=c.c>=c.o,shade=rise?'#33cd91':'#ed6874';ctx.strokeStyle=shade;ctx.fillStyle=shade;ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x,y(c.h));ctx.lineTo(x,y(c.l));ctx.stroke();const t=y(Math.max(c.o,c.c)),b=y(Math.min(c.o,c.c));ctx.fillRect(x-width/2,t,width,Math.max(1.3,b-t));}
 const first=points[0],last=points[points.length-1];ctx.strokeStyle='#c99a42';ctx.lineWidth=1.2;ctx.beginPath();points.slice(0,count).forEach((p,i)=>{let x=pL+(i+.5)*gw/points.length,yy=y(p.c);if(i===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy)});ctx.stroke();
 ctx.fillStyle='#99a6bb';ctx.textAlign='center';ctx.font='10px system-ui';[0,.25,.5,.75,1].forEach(f=>{const c=points[Math.min(points.length-1,Math.floor(f*(points.length-1)))];const txt=new Date(c.t).toLocaleDateString('en-US',period==='1'?{hour:'2-digit',minute:'2-digit'}:{month:'short',day:'numeric'});ctx.fillText(txt,pL+f*gw,h-5)});
 if(hover>=0&&hover<points.length){const c=points[hover],x=pL+(hover+.5)*gw/points.length;ctx.setLineDash([4,4]);ctx.strokeStyle='#d9e3ee8c';ctx.beginPath();ctx.moveTo(x,pT);ctx.lineTo(x,h-pB);ctx.stroke();ctx.setLineDash([]);root.querySelector('[data-bfc-ohlc]').textContent=`O ${money(c.o)} · H ${money(c.h)} · L ${money(c.l)} · C ${money(c.c)}`}
 else root.querySelector('[data-bfc-ohlc]').textContent='Aggregated market observations · indicative';
 }
 function animate(){cancelAnimationFrame(raf);if(reduced){progress=1;draw();return}progress=.07;let start=0;const frame=ts=>{if(!start)start=ts;progress=Math.min(1,(ts-start)/800);draw();if(progress<1&&ready)raf=requestAnimationFrame(frame)};raf=requestAnimationFrame(frame)}
 function setAsset(a){asset=a;root.querySelector('[data-bfc-coin]').textContent=a==='BTC'?'₿':'₿';root.querySelector('[data-bfc-chart]').dataset.asset=a;pair.textContent=a+'/USD'}
 function updateRates(data){if(!data?.available||!data?.rates)return;for(const node of prices){const a=node.dataset.bfcRate;const usd=Number(data.rates?.[a]?.prices?.USD);node.textContent=money(usd)}const btc=Number(data.rates?.BTC?.prices?.USD),brl=Number(data.rates?.BTC?.prices?.BRL);const fx=btc>0&&brl>0?brl/btc:NaN;const fxNode=root.querySelector('[data-bfc-usdbrl]');fxNode.textContent=Number.isFinite(fx)?'R$ '+fx.toFixed(3):'—';const el=root.querySelector('[data-bfc-quote-time]');el.textContent='Indicative quotes · '+new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
 async function loadRates(){try{const r=await fetch(root.dataset.ratesUrl,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});if(r.ok)updateRates(await r.json());else root.querySelector('[data-bfc-quote-time]').textContent='Quotes currently unavailable'}catch{root.querySelector('[data-bfc-quote-time]').textContent='Quotes currently unavailable'}}
 async function load(){const id=++seq;hint.hidden=false;hint.textContent='Loading verified market observations…';points=[];hover=-1;setAsset(asset);try{const url=new URL(root.dataset.chartUrl,location.href);url.searchParams.set('asset',asset);url.searchParams.set('days',period);const r=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});const data=await r.json();if(id!==seq||disposed)return;if(!r.ok||!data.available||!Array.isArray(data.prices))throw Error();points=buildCandles(data.prices);if(points.length<2)throw Error();const current=points[points.length-1].c;price.textContent=money(current);hint.hidden=true;animate();root.querySelector('[data-bfc-source]').textContent='CoinGecko · '+(period==='1'?'24h':'7 days')+' · observed prices, not exchange trades';}catch{if(id!==seq)return;hint.hidden=false;hint.textContent='Historical market data is temporarily unavailable. Wallet functions remain available.';price.textContent='—';root.querySelector('[data-bfc-source]').textContent='No historical data. Never simulated.';draw()}}
 buttons.forEach(b=>b.addEventListener('click',()=>{period=b.dataset.bfcDays;buttons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));load()}));
 plot.addEventListener('pointermove',e=>{if(!points.length)return;const r=plot.getBoundingClientRect(),pL=9,pR=64;hover=Math.min(points.length-1,Math.max(0,Math.floor((e.clientX-r.left-pL)/(r.width-pL-pR)*points.length)));draw()},{passive:true});
 plot.addEventListener('pointerleave',()=>{hover=-1;draw()});
 setAsset(asset);resize();load();loadRates();
 const timer=setInterval(()=>{if(!document.hidden){loadRates();load()}},120000);
 addEventListener('pagehide',()=>{disposed=true;clearInterval(timer);cancelAnimationFrame(raf);resizeObs?.disconnect();observe.disconnect()},{once:true});
})();
