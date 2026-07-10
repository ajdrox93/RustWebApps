document.querySelectorAll('.nav a').forEach(a=>{if(new URL(a.href,location.href).pathname===location.pathname)a.classList.add('active')});
