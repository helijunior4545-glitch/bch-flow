/* BCH_FLOW_INTEGRATIONS_MODAL_WORKFLOWS_V4 — UI only, no finance API calls. */
(function(){'use strict';
  function openModal(id){
    var modal=document.getElementById(id);
    if(!modal||typeof modal.showModal!=='function')return;
    modal.querySelectorAll('details.ig-v2-details,details.ig-v3-signing-disclosure').forEach(function(d){d.open=true;});
    if(!modal.open)modal.showModal();
  }
  document.addEventListener('click',function(event){
    var trigger=event.target.closest('[data-ig-v4-open]');
    if(trigger){event.preventDefault();event.stopImmediatePropagation();openModal(trigger.getAttribute('data-ig-v4-open'));return;}
    var close=event.target.closest('[data-ig-v4-close]');
    if(close){event.preventDefault();var modal=close.closest('dialog[data-ig-v4-modal]');if(modal)modal.close();return;}
    if(event.target.matches('dialog[data-ig-v4-modal]')){
      var r=event.target.getBoundingClientRect();
      if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();
    }
  },true);
  // When Django rerenders a form with errors, make the relevant modal visible.
  var errors=[
    ['ig-v4-blockchain-modal',document.querySelector('#ig-v4-blockchain-modal .errorlist')],
    ['ig-v4-pix-modal',document.querySelector('#ig-v4-pix-modal .errorlist')]
  ];
  errors.forEach(function(pair){if(pair[1])openModal(pair[0]);});
})();
