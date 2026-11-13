/* BCH Flow V313 — visual UX only, no financial event interception */
(()=>{'use strict';
const root=document.documentElement;
root.dataset.bchPremium='v313';
const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduced&&'IntersectionObserver'in window){
 const targets=document.querySelectorAll('.wallet-card,.balance-card,.payment-card,.stat-card');
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('bch-v313-visible');observer.unobserve(entry.target)}}},{threshold:.08});
 targets.forEach(el=>observer.observe(el));
}
})();
