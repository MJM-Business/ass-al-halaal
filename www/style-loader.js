const fullStyle=document.getElementById('full-style');
if(fullStyle){
  const activate=()=>{fullStyle.media='all'};
  if(location.hash.startsWith('#admin')){
    activate();
  }else if(fullStyle.sheet){
    requestAnimationFrame(()=>requestAnimationFrame(activate));
  }else{
    fullStyle.addEventListener('load',()=>requestAnimationFrame(()=>requestAnimationFrame(activate)),{once:true});
  }
}
