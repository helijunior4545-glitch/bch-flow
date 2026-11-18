(()=>{
'use strict';
const root=document.querySelector('[data-catalog]');if(!root)return;
const $=s=>root.querySelector(s);
const rows=$('[data-rows]'),form=$('[data-form]'),drawer=$('[data-drawer]'),overlay=$('[data-overlay]');
const canEdit=root.dataset.canEdit==='1';
let preparedMedia=null,mediaController=null,mediaTask=0;
let products=[],editing=null,lastFocus=null,previewObjectUrl=null,toastTimer=null;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico=name=>`<i data-lucide="${name}"></i>`;
const icons=()=>{if(!window.lucide)return;const nodes=[...root.querySelectorAll('i[data-lucide]')];if(!nodes.length)return;nodes.forEach(node=>{node.setAttribute('data-catalog-icon',node.dataset.lucide);node.removeAttribute('data-lucide')});window.lucide.createIcons({nameAttr:'data-catalog-icon'});root.querySelectorAll('svg[data-catalog-icon]').forEach(node=>node.removeAttribute('data-catalog-icon'))};
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
 if([502,504,520,522,524].includes(response.status))throw Error(`${root.dataset.gatewayError} (HTTP ${response.status}). ${root.dataset.referenceLabel}: ${response.headers.get('cf-ray')||response.headers.get('X-BCH-Upload-ID')||'—'}`);
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
 const groups=new Map();for(const p of products){if(!p.archived){const key=Boolean(p.pinned);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p)}}
 for(const group of groups.values())group.sort((a,b)=>Number(a.position??0)-Number(b.position??0)||String(a.name??'').localeCompare(String(b.name??'')));
 const locations=new Map();for(const group of groups.values())group.forEach((p,index)=>locations.set(p.id,{index,total:group.length}));
 const ordered=sorted(),shown=ordered.filter(p=>(filter==='all'||(filter==='active'?!p.archived:p.archived))&&(!search||`${p.name||''} ${p.sku||''} ${p.description||''}`.toLowerCase().includes(search)));
 rows.innerHTML=shown.length?shown.map(p=>{
  const location=locations.get(p.id)||{index:0,total:0},idx=location.index;
  return `<tr><td><div class="catalog-product"><span class="catalog-product-icon">${p.image_url?`<img loading="lazy" src="${esc(imageUrl(p))}" alt="">`:ico('package')}</span><div><strong>${esc(p.name)}</strong><small>${esc(p.sku||String(p.description||'').slice(0,55)||'—')}</small></div></div></td><td><strong class="catalog-price">${esc(p.price)} <small>${esc(p.currency)}</small></strong></td><td><span class="catalog-pill ${p.archived?'archived':''}">${p.archived?'Archived':'Active'}</span></td><td>${p.pinned?'<span class="catalog-pin">◆ Pinned</span>':'—'}</td><td><div class="catalog-actions">${canEdit&&!p.archived?`<button data-op="up" data-id="${esc(p.id)}" title="Move up" aria-label="Move ${esc(p.name)} up" ${idx<=0?'disabled':''}>${ico('arrow-up')}</button><button data-op="down" data-id="${esc(p.id)}" title="Move down" aria-label="Move ${esc(p.name)} down" ${idx>=location.total-1?'disabled':''}>${ico('arrow-down')}</button>`:'—'}</div></td><td><div class="catalog-actions">${canEdit?`<a href="${esc(p.publish_url)}" title="Publish software" aria-label="Publish ${esc(p.name)} software">${ico('upload')}</a><button data-op="edit" data-id="${esc(p.id)}" title="Edit" aria-label="Edit ${esc(p.name)}">${ico('pencil')}</button><button data-op="${p.archived?'restore':p.pinned?'unpin':'pin'}" data-id="${esc(p.id)}" title="${p.archived?'Restore':p.pinned?'Unpin':'Pin to top'}">${ico(p.archived?'archive-restore':p.pinned?'pin-off':'pin')}</button><button data-op="${p.archived?'restore':'archive'}" data-id="${esc(p.id)}" title="${p.archived?'Restore':'Archive'}">${ico(p.archived?'rotate-ccw':'archive')}</button>`:''}</div></td></tr>`;
 }).join(''):'<tr><td colspan="6" class="catalog-empty">No products found</td></tr>';
 icons();
}
async function reload(){const data=await api(root.dataset.listUrl);if(!Array.isArray(data.products))throw Error('Invalid product list returned by server.');products=data.products;render()}
function setPreview(url,video=false){const img=$('[data-image-preview]'),clip=$('[data-video-preview]'),placeholder=$('[data-upload-placeholder]');img.hidden=!url||video;clip.hidden=!url||!video;placeholder.hidden=!!url;$('[data-remove-media]').hidden=!url;img.removeAttribute('src');clip.pause();clip.removeAttribute('src');clip.load();if(url){if(video){clip.src=url;clip.play().catch(()=>{})}else img.src=url}}
function releaseMode(){const enabled=!editing||!!form.elements.archive.files.length;const fields=$('[data-software-fields]');fields.hidden=false;fields.querySelectorAll('input,select,textarea').forEach(el=>{el.disabled=el.name!=='archive'&&!enabled;if(el.name!=='notes')el.required=enabled});form.elements.archive.disabled=false;form.elements.archive.required=!editing;form.elements.currency.disabled=enabled}
function clearObject(){if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null}}
function open(product){if(!canEdit)return;editing=product||null;lastFocus=document.activeElement;form.reset();$('[data-save]').disabled=false;form.removeAttribute('aria-busy');mediaController?.abort();mediaTask++;preparedMedia=null;$('[data-media-status]').textContent='';clearObject();$('[data-create-note]').hidden=!!product;$('[data-edit-note]').hidden=!product;form.elements.remove_video.value='0';if(product)form.elements.version.value='';releaseMode();form.elements.remove_image.value='0';$('[data-edit-id]').value=product?.id||'';$('[data-drawer-title]').textContent=product?root.dataset.editLabel:root.dataset.addLabel;$('[data-form-error]').textContent='';if(product)for(const key of ['name','sku','description','price','currency'])if(form.elements[key])form.elements[key].value=product[key]??'';setPreview(product?.has_video?product.video_url+'?v='+encodeURIComponent(product.updated??''):product?.image_url?imageUrl(product)+'?v='+encodeURIComponent(product.updated??''):'',!!product?.has_video);drawer.hidden=false;overlay.hidden=false;document.body.style.overflow='hidden';form.elements.name.focus();icons()}
function close(){mediaController?.abort();mediaTask++;preparedMedia=null;drawer.hidden=true;overlay.hidden=true;document.body.style.overflow='';clearObject();setPreview('');lastFocus?.focus?.()}
root.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',close));
overlay.addEventListener('click',close);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!drawer.hidden)close()});
$('[data-add]')?.addEventListener('click',()=>open());
$('[data-search]').addEventListener('input',render);
root.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{root.querySelectorAll('[data-tab]').forEach(item=>item.classList.toggle('is-active',item===button));$('[data-filter]').value=button.dataset.tab;render()}));
$('[data-media-input]').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 mediaController?.abort();mediaController=new AbortController();const task=++mediaTask;preparedMedia=null;
 const video=file.type.startsWith('video/')||/\.(mp4|mov|m4v|webm)$/i.test(file.name);
 if(file.size>(video?100:5)*1024*1024||(!video&&!['image/png','image/jpeg','image/webp'].includes(file.type))){$('[data-save]').disabled=false;$('[data-media-status]').textContent='';form.elements.remove_image.value='0';form.elements.remove_video.value='0';$('[data-form-error]').textContent=root.dataset.videoError;event.target.value='';return}
 const button=$('[data-save]'),status=$('[data-media-status]');
 try{
  let preview=file;
  if(video){button.disabled=true;status.textContent=root.dataset.convertingLabel;
   try{preview=await window.BCHVideoOptimizer(file,mediaController.signal)}catch(error){if(error.name==='AbortError')return;if(file.size>20*1024*1024)throw error;preview=file;}
   if(task!==mediaTask)return;
   preparedMedia=preview;status.textContent=preview===file?root.dataset.serverConversionLabel:root.dataset.convertedLabel;
  }else status.textContent='';
  clearObject();previewObjectUrl=URL.createObjectURL(preview);setPreview(previewObjectUrl,video);
  form.elements.remove_image.value=video?'1':'0';form.elements.remove_video.value=video?'0':'1';$('[data-form-error]').textContent='';
 }catch(error){if(task===mediaTask){event.target.value='';status.textContent='';$('[data-form-error]').textContent=root.dataset.conversionError}}
 finally{if(task===mediaTask)button.disabled=false}
});
$('[data-remove-media]').addEventListener('click',()=>{mediaController?.abort();mediaTask++;preparedMedia=null;$('[data-save]').disabled=false;$('[data-media-status]').textContent='';clearObject();form.elements.media.value='';form.elements.remove_image.value='1';form.elements.remove_video.value='1';setPreview('')});
form.elements.archive.addEventListener('change',releaseMode);
form.elements.account.addEventListener('change',()=>{form.elements.currency.value=form.elements.account.selectedOptions[0]?.dataset.currency||'BCH'});
function uploadData(){const data=new FormData(form);const file=preparedMedia||form.elements.media.files[0];data.delete('media');if(file)data.set(file.type.startsWith('video/')||/\.(mp4|mov|m4v|webm)$/i.test(file.name)?'video':'image',file);return data}
form.addEventListener('submit',async event=>{event.preventDefault();if(!canEdit)return;const button=$('[data-save]');if(button.disabled)return;button.disabled=true;form.setAttribute('aria-busy','true');$('[data-form-error]').textContent='';try{const result=await api(editing?root.dataset.baseUrl+encodeURIComponent(editing.id)+'/update/':root.dataset.createUrl,uploadData());close();try{await reload()}catch(reloadError){toast(`Product saved, but refresh failed: ${reloadError.message}`);return}toast(root.dataset.savedLabel+(result.media_message?' · '+result.media_message:''))}catch(error){$('[data-form-error]').textContent=error.message}finally{button.disabled=false;form.removeAttribute('aria-busy')}});
const confirmBackdrop=$('[data-confirm-backdrop]'),confirmAccept=$('[data-confirm-accept]'),confirmCancel=$('[data-confirm-cancel]');let confirmPending=false;
function confirmArchive(product){if(confirmPending)return Promise.resolve(false);confirmPending=true;const origin=document.activeElement,previousOverflow=document.body.style.overflow;confirmBackdrop.hidden=false;$('[data-confirm-product]').textContent=product.name+(product.sku?' · '+product.sku:'');document.body.style.overflow='hidden';icons();confirmCancel.focus();return new Promise(resolve=>{let settled=false;const finish=accepted=>{if(settled)return;settled=true;confirmBackdrop.hidden=true;document.body.style.overflow=previousOverflow;confirmPending=false;confirmAccept.removeEventListener('click',yes);confirmCancel.removeEventListener('click',no);confirmBackdrop.removeEventListener('click',backdrop);document.removeEventListener('keydown',keyboard,true);if(origin?.isConnected)origin.focus();resolve(accepted)};const yes=()=>finish(true),no=()=>finish(false),backdrop=event=>{if(event.target===confirmBackdrop)finish(false)},keyboard=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false)}else if(event.key==='Tab'){event.preventDefault();const target=document.activeElement===confirmCancel?confirmAccept:confirmCancel;target.focus()}};confirmAccept.addEventListener('click',yes);confirmCancel.addEventListener('click',no);confirmBackdrop.addEventListener('click',backdrop);document.addEventListener('keydown',keyboard,true)})}
rows.addEventListener('click',async event=>{const button=event.target.closest('button[data-op]');if(!button||!canEdit||button.disabled)return;const product=products.find(item=>item.id===button.dataset.id);if(!product)return;const op=button.dataset.op;if(op==='edit'){open(product);return}if(op==='archive'&&!await confirmArchive(product))return;button.disabled=true;try{await api(root.dataset.baseUrl+encodeURIComponent(product.id)+'/action/',new URLSearchParams({action:op}));await reload();toast('Catalog updated')}catch(error){toast(error.message)}finally{button.disabled=false}});
reload().catch(error=>{rows.innerHTML='<tr><td colspan="6"></td></tr>';rows.querySelector('td').textContent=error.message});
})();