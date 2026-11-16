const style=document.getElementById('full-style');

function enableFullStyle(){
  return new Promise(resolve=>{
    if(!style){resolve();return}
    const apply=()=>{
      style.media='all';
      requestAnimationFrame(()=>requestAnimationFrame(resolve));
    };
    if(style.sheet){apply();return}
    style.addEventListener('load',apply,{once:true});
  });
}

async function start(){
  await enableFullStyle();
  await import('./app.js?v=425');
}

if('requestIdleCallback' in window){
  requestIdleCallback(()=>{start().catch(console.error)},{timeout:1600});
}else{
  setTimeout(()=>{start().catch(console.error)},500);
}
