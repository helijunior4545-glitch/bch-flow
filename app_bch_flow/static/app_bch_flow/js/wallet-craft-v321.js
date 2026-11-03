/* BCH Flow V321: tactile, progressive enhancement. No payment, auth or navigation interception. */
(()=>{'use strict';const root=document.querySelector('.v320[data-wallet-root]');if(!root)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const reveal=root.querySelectorAll('.v320-top,.v320-stage,.v320-info,.v320-pocket-card,.v320-security');
if('IntersectionObserver'in window&&!reduced.matches){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('b321-visible');observer.unobserve(e.target)}})},{threshold:.07});reveal.forEach(el=>{el.dataset.b321Reveal='';observer.observe(el)})}else reveal.forEach(el=>el.classList.add('b321-visible'));
const wallet=root.querySelector('.v320-wallet');if(wallet&&matchMedia('(hover:hover) and (pointer:fine)').matches&&!reduced.matches){let frame=0;wallet.addEventListener('pointermove',e=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const r=wallet.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;wallet.style.transform=`perspective(1300px) rotateY(${(x*4).toFixed(2)}deg) rotateX(${(-y*3).toFixed(2)}deg)`})});wallet.addEventListener('pointerleave',()=>{wallet.style.transform=''})}
root.querySelectorAll('.v320-action-grid a').forEach(a=>{a.addEventListener('pointerdown',()=>{if(reduced.matches||!a.animate)return;a.animate([{transform:'scale(1)'},{transform:'scale(.965)'},{transform:'scale(1)'}],{duration:260,easing:'ease-out'})})});
const dialog=root.querySelector('#v320-dialog');if(dialog){dialog.addEventListener('close',()=>{if(!reduced.matches&&dialog.animate)dialog.animate([{opacity:.8},{opacity:1}],{duration:120})})}
})();
