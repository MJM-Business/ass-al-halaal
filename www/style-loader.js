const fullStyle=document.getElementById('full-style');

if(fullStyle){
  let activated=false;
  const activate=()=>{
    if(activated)return;
    activated=true;
    fullStyle.media='all';
  };

  window.__activateFullStyle=activate;

  // Keep refresh/navigation visually stable: the production stylesheet must
  // participate in the first committed layout. The heavy DOM/JS work remains
  // deferred elsewhere, but CSS is not delayed anymore.
  activate();
}
