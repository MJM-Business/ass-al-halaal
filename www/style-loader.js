const fullStyle=document.getElementById('full-style');

if(fullStyle){
  let activated=false;
  const activate=()=>{
    if(activated)return;
    activated=true;
    fullStyle.media='all';
  };

  window.__activateFullStyle=activate;

  const route=location.hash.replace('#','')||'home';

  if(route!=='home'){
    activate();
  }else{
    // Keep the first home viewport on critical.css only.
    // This avoids a late repaint when the 2MB production stylesheet finishes.
    const activateOnIntent=()=>activate();
    window.addEventListener('scroll',activateOnIntent,{once:true,passive:true});
    window.addEventListener('pointerdown',activateOnIntent,{once:true,passive:true});
    window.addEventListener('keydown',activateOnIntent,{once:true});
    window.addEventListener('touchstart',activateOnIntent,{once:true,passive:true});
    window.addEventListener('hashchange',()=>{
      const next=location.hash.replace('#','')||'home';
      if(next!=='home')activate();
    },{once:true});
  }
}
