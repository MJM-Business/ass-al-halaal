const fullStyle=document.getElementById('full-style');

function activateFullStyle(){
  return new Promise(resolve=>{
    if(!fullStyle){resolve();return}
    const apply=()=>{
      fullStyle.media='all';
      requestAnimationFrame(resolve);
    };
    if(fullStyle.sheet){apply();return}
    fullStyle.addEventListener('load',apply,{once:true});
  });
}

async function start(){
  const directAdmin=location.hash.replace('#','').startsWith('admin');
  if(directAdmin)await activateFullStyle();
  await import('./dist/app.min.js?v=573');
}

start().catch(console.error);
