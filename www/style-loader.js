(()=>{
  const link=document.getElementById('full-style');
  if(!link)return;
  const apply=()=>{link.rel='stylesheet'};
  link.addEventListener('load',apply,{once:true});
})();
