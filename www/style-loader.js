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
    const activateOnIntent=()=>activate();
    window.addEventListener('scroll',activateOnIntent,{once:true,passive:true});
    window.addEventListener('pointerdown',activateOnIntent,{once:true,passive:true});
    window.addEventListener('keydown',activateOnIntent,{once:true});
    window.addEventListener('hashchange',()=>{
      const next=location.hash.replace('#','')||'home';
      if(next!=='home')activate();
    },{once:true});

    // Safety fallback for users who leave the home page open without interaction.
    setTimeout(activate,12000);
  }
}
