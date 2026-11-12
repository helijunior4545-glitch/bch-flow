/* BCH Flow microinteractions: presentation only; no payment state modifications. */
(()=>{'use strict';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const root=document.documentElement;root.classList.add('bch-rewrite-2026');
const observer=!reduce&&'IntersectionObserver'in window?new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){e.target.classList.add('bch-in-view');observer.unobserve(e.target)}}},{threshold:.08,rootMargin:'0px 0px -24px 0px'}):null;
if(observer){document.querySelectorAll('main h1, main h2, main .card, main .panel, main .premium-asset, main .premium-hero').forEach(el=>{if(el.closest('[aria-hidden="true"]'))return;el.classList.add('bch-reveal');observer.observe(el)})}
const nav=document.querySelectorAll('.premium-menu a[href^="#"]');nav.forEach(a=>a.addEventListener('click',()=>{nav.forEach(x=>x.classList.remove('bch-nav-tapped'));a.classList.add('bch-nav-tapped')}));
const buttons=document.querySelectorAll('button,[role="button"]');buttons.forEach(el=>{el.addEventListener('pointerdown',()=>el.classList.add('bch-pressed'));['pointerup','pointercancel','pointerleave','blur'].forEach(ev=>el.addEventListener(ev,()=>el.classList.remove('bch-pressed')))});
})();