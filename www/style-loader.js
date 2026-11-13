const fullStyle=document.getElementById('full-style');
if(fullStyle){
  const activate=()=>{fullStyle.media='all'};
  if(fullStyle.sheet){
    activate();
  }else{
    fullStyle.addEventListener('load',activate,{once:true});
  }
}
