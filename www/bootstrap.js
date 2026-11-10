const start=()=>import('./app.js?v=424');
if('requestIdleCallback' in window){
  requestIdleCallback(start,{timeout:1800});
}else{
  setTimeout(start,600);
}
