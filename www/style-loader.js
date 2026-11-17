const fullStyle=document.getElementById('full-style');

if(fullStyle){
  let started=false;

  const activate=()=>{
    if(started)return;
    started=true;

    const href=String(fullStyle.dataset.href||'').trim();
    if(!href)return;

    fullStyle.addEventListener('load',()=>{
      fullStyle.media='all';
    },{once:true});

    fullStyle.href=href;
  };

  ['pointerdown','touchstart','keydown'].forEach(type=>{
    window.addEventListener(type,activate,{once:true,capture:true,passive:type!=='keydown'});
  });
}
