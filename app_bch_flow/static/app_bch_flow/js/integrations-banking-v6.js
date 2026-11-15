/* BCH_FLOW_INTEGRATIONS_BANKING_MODALS_V6: UI only, no network calls. */
(function(){'use strict';
  function ready(){
    // The V5 handler already opens the form. Preserve validation and the existing SDK.
    var form=document.querySelector('#ig-v4-blockchain-modal #wallet-add');
    if(form)form.open=true;
    // Explicitly keep merchant credential options collapsed unless they contain errors.
    var manual=document.querySelector('#ig-v4-pix-modal .pay-manual-credentials');
    if(manual&&!manual.querySelector('.errorlist'))manual.open=false;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);
  else ready();
})();
