
/* BCHFLOW_FINAL_CATALOG_CONVERTER_V1: merchant-local input, catalog-aware conversion. */
(()=>{'use strict';
const root=document.querySelector('[data-rc2]');
if(!root)return;
const form=root.closest('form'),amount=form?.querySelector('[name="receive-amount"]');
const description=form?.querySelector('[name="receive-description"]');
const productSelect=root.querySelector('#rc2-product-select');
if(!form||!amount||!productSelect)return;
const crypto=(root.dataset.asset||document.querySelector('[data-payment-app]')?.dataset.asset||'').toUpperCase();
if(!['BTC','BCH'].includes(crypto))return;
const ratesUrl=document.querySelector('[data-bfc-rates-url]')?.dataset.bfcRatesUrl;
const currencies=['BRL','USD','EUR','GBP','JPY','CAD','AUD','MXN','ARS','CLP','COP'];
const block=document.createElement('div');
block.className='bfc-fiat';
block.innerHTML='<div class="bfc-fiat__heading"><strong>Price in your currency</strong><small>Indicative live rate</small></div><div class="bfc-fiat__controls"><input type="text" inputmode="decimal" maxlength="24" placeholder="0.00" aria-label="Local currency amount" data-bfc-value><select aria-label="Local currency" data-bfc-currency>'+currencies.map(c=>'<option value="'+c+'">'+c+'</option>').join('')+'</select></div><p class="bfc-fiat__feedback" role="status" aria-live="polite" data-bfc-message>Enter a price to calculate '+crypto+'.</p>';
const host=amount.closest('label')||amount.parentElement;
host.insertAdjacentElement('beforebegin',block);
const local=block.querySelector('[data-bfc-value]'),currency=block.querySelector('[data-bfc-currency]'),message=block.querySelector('[data-bfc-message]');
currency.value=(navigator.language||'').toLowerCase().startsWith('pt')?'BRL':'USD';
let generation=0,debounce=null;
function parseNumber(value){
 let s=String(value??'').trim().replace(/\s/g,'');
 if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 else s=s.replace(',','.');
 return /^\d+(?:\.\d+)?$/.test(s)?Number(s):NaN;
}
function feedback(text,error=false){message.textContent=text;message.dataset.error=String(error)}
function fill(value){amount.value=value;amount.dispatchEvent(new Event('input',{bubbles:true}));amount.dispatchEvent(new Event('change',{bubbles:true}))}
async function convert(n,fiat,productId){
 const id=++generation;
 feedback('Updating '+crypto+' rate…');
 try{
  if(!ratesUrl)throw Error('Rates endpoint missing');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
  let response;
  try{response=await fetch(ratesUrl,{credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}})}
  finally{clearTimeout(timeout)}
  if(!response.ok)throw Error('Rate unavailable');
  const data=await response.json();
  const price=Number(data.rates?.[crypto]?.prices?.[fiat]);
  if(!data.available||!data.indicative_only||!Number.isFinite(price)||price<=0)throw Error('Rate invalid');
  const result=(n/price).toFixed(8);
  if(Number(result)<=0)throw Error('Value below minimum precision');
  if(id!==generation||productId!==productSelect.value||fiat!==currency.value)return;
  fill(result);
  feedback(n.toLocaleString(undefined,{maximumFractionDigits:2})+' '+fiat+' ≈ '+result+' '+crypto+' · Check amount before creating request.');
 }catch(e){
  if(id!==generation)return;
  // Never preserve a stale quote as if it were current.
  fill('');
  feedback('Live rate unavailable. Enter '+crypto+' amount manually or retry.',true);
 }
}
function scheduleManual(){
 clearTimeout(debounce);
 const id=++generation;
 if(!local.value.trim()){feedback('Enter a price to calculate '+crypto+'.');return}
 const n=parseNumber(local.value);
 if(!Number.isFinite(n)||n<=0){feedback('Enter a valid positive price.',true);return}
 // Manual fiat price means a custom amount, not an unchanged catalog price.
 const mode=root.querySelector('[data-rc2-price-mode]');
 if(mode&&productSelect.value)mode.value='custom';
 const fiat=currency.value,productId=productSelect.value;
 debounce=setTimeout(()=>{if(id===generation)convert(n,fiat,productId)},300);
}
local.addEventListener('input',scheduleManual);
currency.addEventListener('change',scheduleManual);
// Product selection must fill amount/description even when catalog currency differs.
// Catalog code handles same-currency products; this listener handles cross-currency.
async function fromProduct(product){
 if(!product)return;
 const price=parseNumber(product.price),src=String(product.currency).toUpperCase();
 if(description)description.value=String(product.name||'').slice(0,160);
 clearTimeout(debounce);
 ++generation;
 if(src===crypto){
   local.value='';
   feedback('Catalog price applied directly in '+crypto+'.');
   return;
 }
 if(!Number.isFinite(price)||price<=0){fill('');feedback('Invalid catalog price.',true);return}
 if(!currencies.includes(src)){
   local.value='';fill('');feedback('This catalog currency cannot be converted automatically. Enter '+crypto+' manually.',true);return;
 }
 currency.value=src;
 local.value=String(product.price);
 fill('');
 await convert(price,src,productSelect.value);
}
window.BCHFlowCatalogCurrency={fromProduct,reset(){
 clearTimeout(debounce);++generation;local.value='';feedback('Enter a price to calculate '+crypto+'.');
}};
})();
