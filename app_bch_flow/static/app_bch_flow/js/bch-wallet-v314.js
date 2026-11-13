/* BCH Flow V314: presentation-only enhancements; no signing, transfers, or network calls. */
(()=>{'use strict';const root=document.querySelector('.bwallet');if(!root)return;
const links=[...root.querySelectorAll('.bw-nav a[href^="#"]')];
links.forEach(link=>link.addEventListener('click',()=>{links.forEach(a=>{a.classList.remove('bw-active');a.removeAttribute('aria-current')});link.classList.add('bw-active');link.setAttribute('aria-current','location')}));
})();
