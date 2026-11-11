const fullStyle=document.getElementById('full-style');

if(fullStyle){
  let activated=false;
  let idleId=0;
  let fallbackTimer=0;

  const activate=()=>{
    if(activated)return;
    activated=true;
    fullStyle.media='all';

    ['pointerdown','keydown','touchstart','wheel','scroll'].forEach(type=>{
      window.removeEventListener(type,activate,true);
    });

    if(idleId && 'cancelIdleCallback' in window){
      try{cancelIdleCallback(idleId)}catch{}
    }
    if(fallbackTimer)clearTimeout(fallbackTimer);
  };

  if(location.hash.startsWith('#admin')){
    activate();
  }else{
    // Critical CSS owns the first paint. Apply the 2 MB full stylesheet only
    // when the visitor actually interacts, or in a later idle window.
    ['pointerdown','keydown','touchstart','wheel','scroll'].forEach(type=>{
      window.addEventListener(type,activate,{once:true,passive:true,capture:true});
    });

    const scheduleIdle=()=>{
      if(activated)return;
      if('requestIdleCallback' in window){
        idleId=requestIdleCallback(activate,{timeout:12000});
      }else{
        fallbackTimer=setTimeout(activate,10000);
      }
    };

    if(fullStyle.sheet){
      fallbackTimer=setTimeout(scheduleIdle,3500);
    }else{
      fullStyle.addEventListener('load',()=>{
        fallbackTimer=setTimeout(scheduleIdle,3500);
      },{once:true});
    }
  }
}
