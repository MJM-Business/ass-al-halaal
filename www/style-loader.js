// Full production stylesheet now loads synchronously from index.html.
// Keep this file as a compatibility no-op so cached HTML references are harmless.
const fullStyle=document.getElementById('full-style');
if(fullStyle && fullStyle.media!=='all') fullStyle.media='all';
