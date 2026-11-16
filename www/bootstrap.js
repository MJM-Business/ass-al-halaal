const style=document.getElementById('full-style');

function enableFullStyle(){
  return new Promise(resolve=>{
    if(!style){resolve();return}
    const apply=()=>{
      style.media='all';
      requestAnimationFrame(()=>resolve());
    };
    if(style.sheet){apply();return}
    style.addEventListener('load',apply,{once:true});
  });
}

async function start(){
  await enableFullStyle();
  await import('./dist/app.min.js?v=572');
}

start().catch(console.error);
