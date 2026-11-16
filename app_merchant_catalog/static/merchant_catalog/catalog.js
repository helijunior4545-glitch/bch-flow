(()=>{
'use strict';
const root=document.querySelector('[data-catalog]');if(!root)return;
const $=s=>root.querySelector(s);
const rows=$('[data-rows]'),form=$('[data-form]'),drawer=$('[data-drawer]'),overlay=$('[data-overlay]');
const canEdit=root.dataset.canEdit==='1';
let products=[],editing=null,lastFocus=null,previewObjectUrl=null,toastTimer=null;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico=name=>`<i data-lucide="${name}"></i>`;
const icons=()=>window.lucide?.createIcons?.();
function toast(message){const el=$('[data-toast]');if(!el)return;el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500)}
function cookie(name){const item=document.cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='));if(!item)return '';try{return decodeURIComponent(item.slice(name.length+1))}catch{return ''}}
function csrfToken(){return form?.querySelector('input[name="csrfmiddlewaretoken"]')?.value||cookie('lojasnova_admin_csrf_v2')||cookie('csrftoken')}
function errorMessage(data,status){if(typeof data?.error==='string'&&data.error)return data.error;if(data?.errors&&typeof data.errors==='object'){const messages=Object.values(data.errors).flatMap(items=>Array.isArray(items)?items.map(item=>typeof item==='string'?item:item?.message||''):[]).filter(Boolean);if(messages.length)return messages.join('; ')}return `Request failed (HTTP ${status})`}
async function api(url,body){
 const headers={'X-Requested-With':'XMLHttpRequest','Accept':'application/json'};
 const options={credentials:'same-origin',headers,redirect:'follow'};
 if(body!==undefined){options.method='POST';const token=csrfToken();if(token)headers['X-CSRFToken']=token;
  if(body instanceof FormData||body instanceof URLSearchParams){options.body=body}else{headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
 }
 let response;try{response=await fetch(url,options)}catch{throw Error('Network error. Check your connection and try again.')}
 if(response.redirected)throw Error(`The server redirected the request to ${new URL(response.url).pathname}. Check your session or server access rules.`);
 const type=response.headers.get('content-type')||'';
 if(!type.toLowerCase().includes('application/json')){
  if(response.status===403)throw Error('Access denied (HTTP 403). Check your login, permissions and CSRF token.');
  if(response.status===413)throw Error('The uploaded file is too large (HTTP 413).');
  throw Error(`The server returned a non-JSON response (HTTP ${response.status}). Check the server logs.`);
 }
 let data;try{data=await response.json()}catch{throw Error(`The server returned invalid JSON (HTTP ${response.status}).`)}
 if(!response.ok||!data?.ok)throw Error(errorMessage(data,response.status));
 return data;
}
function sorted(){return [...products].sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||Number(a.position??0)-Number(b.position??0)||String(a.name??'').localeCompare(String(b.name??'')))}
function imageUrl(p){return p.image_url?root.dataset.baseUrl+encodeURIComponent(p.id)+'/image/':''}
function render(){
 const search=($('[data-search]')?.value||'').trim().toLowerCase(),filter=$('[data-filter]')?.value||'active';
 const active=products.filter(p=>!p.archived);
 $('[data-stat-total]').textContent=products.length;$('[data-stat-active]').textContent=active.length;$('[data-stat-archived]').textContent=products.length-active.length;$('[data-stat-pinned]').textContent=active.filter(p=>p.pinned).length;
 const ordered=sorted(),shown=ordered.filter(p=>(filter==='all'||(filter==='active'?!p.archived:p.archived))&&(!search||`${p.name||''} ${p.sku||''} ${p.description||''}`.toLowerCase().includes(search)));
 rows.innerHTML=shown.length?shown.map(p=>{
  const group=ordered.filter(x=>!x.archived&&x.pinned===p.pinned),idx=group.findIndex(x=>x.id===p.id);
  return `<tr><td><div class="catalog-product"><span class="catalog-product-icon">${p.image_url?`<img loading="lazy" src="${esc(imageUrl(p))}" alt="">`:ico('package')}</span><div><strong>${esc(p.name)}</strong><small>${esc(p.sku||String(p.description||'').slice(0,55)||'—')}</small></div></div></td><td><strong class="catalog-price">${esc(p.price)} <small>${esc(p.currency)}</small></strong></td><td><span class="catalog-pill ${p.archived?'archived':''}">${p.archived?'Archived':'Active'}</span></td><td>${p.pinned?'<span class="catalog-pin">◆ Pinned</span>':'—'}</td><td><div class="catalog-actions">${canEdit&&!p.archived?`<button data-op="up" data-id="${esc(p.id)}" title="Move up" aria-label="Move ${esc(p.name)} up" ${idx<=0?'disabled':''}>${ico('arrow-up')}</button><button data-op="down" data-id="${esc(p.id)}" title="Move down" aria-label="Move ${esc(p.name)} down" ${idx>=group.length-1?'disabled':''}>${ico('arrow-down')}</button>`:'—'}</div></td><td><div class="catalog-actions">${canEdit?`<a href="${esc(p.publish_url)}" title="Publish software" aria-label="Publish ${esc(p.name)} software">${ico('upload')}</a><button data-op="edit" data-id="${esc(p.id)}" title="Edit" aria-label="Edit ${esc(p.name)}">${ico('pencil')}</button><button data-op="${p.archived?'restore':p.pinned?'unpin':'pin'}" data-id="${esc(p.id)}" title="${p.archived?'Restore':p.pinned?'Unpin':'Pin to top'}">${ico(p.archived?'archive-restore':p.pinned?'pin-off':'pin')}</button><button data-op="${p.archived?'restore':'archive'}" data-id="${esc(p.id)}" title="${p.archived?'Restore':'Archive'}">${ico(p.archived?'rotate-ccw':'archive')}</button>`:''}</div></td></tr>`;
 }).join(''):'<tr><td colspan="6" class="catalog-empty">No products found</td></tr>';
 icons();
}
async function reload(){const data=await api(root.dataset.listUrl);if(!Array.isArray(data.products))throw Error('Invalid product list returned by server.');products=data.products;render()}
function setPreview(url){const img=$('[data-image-preview]'),placeholder=$('[data-upload-placeholder]'),remove=$('[data-remove-image]');img.hidden=!url;placeholder.hidden=!!url;remove.hidden=!url;if(url)img.src=url;else img.removeAttribute('src')}
function clearObject(){if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null}}
function open(product){if(!canEdit)return;editing=product||null;lastFocus=document.activeElement;form.reset();clearObject();form.elements.remove_image.value='0';$('[data-edit-id]').value=product?.id||'';$('[data-drawer-title]').textContent=product?'Edit Product':'Add Product';$('[data-form-error]').textContent='';if(product)for(const key of ['name','sku','description','price','currency'])if(form.elements[key])form.elements[key].value=product[key]??'';setPreview(product?.image_url?imageUrl(product)+'?v='+encodeURIComponent(product.updated??''):'');drawer.hidden=false;overlay.hidden=false;document.body.style.overflow='hidden';form.elements.name.focus();icons()}
function close(){drawer.hidden=true;overlay.hidden=true;document.body.style.overflow='';clearObject();lastFocus?.focus?.()}
root.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',close));
overlay.addEventListener('click',close);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!drawer.hidden)close()});
$('[data-add]')?.addEventListener('click',()=>open());
$('[data-search]').addEventListener('input',render);
root.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{root.querySelectorAll('[data-tab]').forEach(item=>item.classList.toggle('is-active',item===button));$('[data-filter]').value=button.dataset.tab;render()}));
$('[data-image-input]').addEventListener('change',event=>{const file=event.target.files?.[0];if(!file)return;if(file.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){$('[data-form-error]').textContent='Choose a PNG, JPG or WEBP image up to 5 MB';event.target.value='';return}clearObject();previewObjectUrl=URL.createObjectURL(file);setPreview(previewObjectUrl);form.elements.remove_image.value='0';$('[data-form-error]').textContent=''});
$('[data-remove-image]').addEventListener('click',()=>{clearObject();form.elements.image.value='';form.elements.remove_image.value='1';setPreview('')});
form.addEventListener('submit',async event=>{event.preventDefault();if(!canEdit)return;const button=$('[data-save]');if(button.disabled)return;button.disabled=true;$('[data-form-error]').textContent='';try{await api(editing?root.dataset.baseUrl+encodeURIComponent(editing.id)+'/update/':root.dataset.createUrl,new FormData(form));close();try{await reload()}catch(reloadError){toast(`Product saved, but refresh failed: ${reloadError.message}`);return}toast('Product saved')}catch(error){$('[data-form-error]').textContent=error.message}finally{button.disabled=false}});
const confirmBackdrop=$('[data-confirm-backdrop]'),confirmAccept=$('[data-confirm-accept]'),confirmCancel=$('[data-confirm-cancel]');let confirmPending=false;
function confirmArchive(product){if(confirmPending)return Promise.resolve(false);confirmPending=true;const origin=document.activeElement,previousOverflow=document.body.style.overflow;confirmBackdrop.hidden=false;$('[data-confirm-product]').textContent=product.name+(product.sku?' · '+product.sku:'');document.body.style.overflow='hidden';icons();confirmCancel.focus();return new Promise(resolve=>{let settled=false;const finish=accepted=>{if(settled)return;settled=true;confirmBackdrop.hidden=true;document.body.style.overflow=previousOverflow;confirmPending=false;confirmAccept.removeEventListener('click',yes);confirmCancel.removeEventListener('click',no);confirmBackdrop.removeEventListener('click',backdrop);document.removeEventListener('keydown',keyboard,true);if(origin?.isConnected)origin.focus();resolve(accepted)};const yes=()=>finish(true),no=()=>finish(false),backdrop=event=>{if(event.target===confirmBackdrop)finish(false)},keyboard=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false)}else if(event.key==='Tab'){event.preventDefault();const target=document.activeElement===confirmCancel?confirmAccept:confirmCancel;target.focus()}};confirmAccept.addEventListener('click',yes);confirmCancel.addEventListener('click',no);confirmBackdrop.addEventListener('click',backdrop);document.addEventListener('keydown',keyboard,true)})}
rows.addEventListener('click',async event=>{const button=event.target.closest('button[data-op]');if(!button||!canEdit||button.disabled)return;const product=products.find(item=>item.id===button.dataset.id);if(!product)return;const op=button.dataset.op;if(op==='edit'){open(product);return}if(op==='archive'&&!await confirmArchive(product))return;button.disabled=true;try{await api(root.dataset.baseUrl+encodeURIComponent(product.id)+'/action/',new URLSearchParams({action:op}));await reload();toast('Catalog updated')}catch(error){toast(error.message)}finally{button.disabled=false}});
reload().catch(error=>{rows.innerHTML='<tr><td colspan="6"></td></tr>';rows.querySelector('td').textContent=error.message});
})();