const fullStyle=document.getElementById('full-style');

if(fullStyle){
  let activated=false;
  const activate=()=>{
    if(activated)return;
    activated=true;
    fullStyle.media='all';
  };

  const scheduleCustomerStyle=()=>{
    if(activated)return;
    if(window.requestIdleCallback){
      window.requestIdleCallback(activate,{timeout:8000});
    }else{
      setTimeout(activate,2200);
    }
  };

  if(location.hash.startsWith('#admin')){
    activate();
  }else if(fullStyle.sheet){
    scheduleCustomerStyle();
  }else{
    fullStyle.addEventListener('load',scheduleCustomerStyle,{once:true});
  }

  // If the visitor starts using the page before the idle callback,
  // keep the final stylesheet responsive without blocking first paint.
  const nudge=()=>{
    if(activated)return;
    if(window.requestIdleCallback)window.requestIdleCallback(activate,{timeout:1200});
    else setTimeout(activate,120);
  };
  window.addEventListener('pointerdown',nudge,{once:true,passive:true});
  window.addEventListener('keydown',nudge,{once:true});
  window.addEventListener('touchstart',nudge,{once:true,passive:true});
}
