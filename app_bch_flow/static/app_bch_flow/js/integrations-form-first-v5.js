/* BCH_FLOW_INTEGRATIONS_FORM_FIRST_V5 - presentation only. */
(function(){'use strict';
  function ready(){
    // The real server-side wallet form appears immediately when the modal opens.
    var wallet=document.querySelector('#ig-v4-blockchain-modal #wallet-add');
    if(wallet)wallet.open=true;
    // Preserve manual credential disclosure: only open if Django reported errors.
    var manual=document.querySelector('#ig-v4-pix-modal .pay-manual-credentials');
    if(manual && manual.querySelector('.errorlist'))manual.open=true;
    // Don't force-focus hidden fields or override the wallet SDK's QR dialog.
    document.querySelectorAll('dialog[data-ig-v4-modal]').forEach(function(modal){
      modal.addEventListener('close',function(){
        // Leave unsaved form inputs intact; closing a modal never submits or resets them.
      });
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);
  else ready();
})();
