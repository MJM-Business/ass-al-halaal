const fullStyle=document.getElementById('full-style');
let fullStyleActive=false;

function activateFullStyle(){
  if(fullStyleActive||!fullStyle)return Promise.resolve();
  fullStyleActive=true;
  return new Promise(resolve=>{
    const apply=()=>{
      fullStyle.media='all';
      requestAnimationFrame(resolve);
    };
    if(fullStyle.sheet){apply();return}
    fullStyle.addEventListener('load',apply,{once:true});
  });
}

async function start(){
  const route=location.hash.replace('#','');
  const directHome=!route||route==='home';
  if(!directHome)await activateFullStyle();

  const app=await import('./dist/app.min.js?v=574');

  if(directHome){
    const arm=()=>{activateFullStyle().catch(()=>{})};
    window.addEventListener('pointerdown',arm,{once:true,capture:true,passive:true});
    window.addEventListener('touchstart',arm,{once:true,capture:true,passive:true});
    window.addEventListener('keydown',arm,{once:true,capture:true});
    window.addEventListener('hashchange',()=>{activateFullStyle().catch(()=>{})},{once:true});
  }

  return app;
}

start().catch(console.error);
