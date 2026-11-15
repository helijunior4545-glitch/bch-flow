/* BCH_FLOW_INTEGRATIONS_BANDS_V2: UI-only disclosure controls. */
(function(){'use strict';
  document.querySelectorAll('[data-ig-v2-open]').forEach(function(button){
    button.addEventListener('click',function(){
      var details=document.getElementById(button.getAttribute('data-ig-v2-open'));
      if(!details)return;
      details.open=true;
      var target=details.querySelector('summary');
      if(target){target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});target.focus({preventScroll:true});}
    });
  });
  // Existing data-open-details and data-node-form handlers remain owned by flow-ui.js.
})();
