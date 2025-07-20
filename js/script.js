document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:5000/api'; // ← your API

  // Utilities
  const fadeIn = (el, d=300) => {
    el.style.opacity = 0;
    el.style.display = '';
    el.style.transition = `opacity ${d}ms`;
    requestAnimationFrame(() => el.style.opacity = 1);
    setTimeout(() => el.style.transition = '', d);
  };
  const fadeOut = (el, d=300) => {
    el.style.opacity = 1;
    el.style.transition = `opacity ${d}ms`;
    requestAnimationFrame(() => el.style.opacity = 0);
    setTimeout(() => { el.style.display='none'; el.style.transition=''; }, d);
  };

  // 1) Properties
  (async function loadProperties() {
    const c = document.getElementById('properties-container');
    if (!c) return;
    try {
      let res = await fetch(`${API}/properties`);
      let list = await res.json();
      if (!Array.isArray(list) || !list.length) {
        c.innerHTML = '<p>No properties available.</p>';
      } else {
        c.innerHTML = list.map(p=>`
          <div class="property-card">
            <h3>${p.name}</h3><p>${p.location}</p>
          </div>
        `).join('');
        c.querySelectorAll('.property-card').forEach((card,i)=>{
          card.style.opacity=0;
          card.style.transition='opacity 600ms';
          setTimeout(()=>card.style.opacity=1, i*100);
        });
      }
    } catch(e) {
      console.error(e);
      c.innerHTML = '<p>Error loading properties.</p>';
    }
  })();

  // 2) Nav & Dropdown
  const hamb = document.getElementById('hamburgerBtn'),
        navLinks = document.getElementById('navLinks');
  if (hamb && navLinks) {
    hamb.addEventListener('click', ()=>{
      let open = hamb.getAttribute('aria-expanded')==='true';
      hamb.setAttribute('aria-expanded', !open);
      navLinks.classList.toggle('show');
      if (!open) {
        navLinks.querySelectorAll('li').forEach((li,i)=>{
          li.style.opacity=0; li.style.transition='opacity 300ms';
          setTimeout(()=>li.style.opacity=1, i*80);
        });
      }
    });
  }
  const loginToggle = document.getElementById('loginToggle'),
        loginMenu   = document.getElementById('loginMenu');
  if (loginToggle && loginMenu) {
    loginToggle.addEventListener('click', e=>{
      e.stopPropagation();
      let open = loginToggle.getAttribute('aria-expanded')==='true';
      loginToggle.setAttribute('aria-expanded', !open);
      loginMenu.classList.toggle('hidden');
      if (!open) fadeIn(loginMenu, 200);
    });
    document.addEventListener('click', e=>{
      if (!loginToggle.contains(e.target) && !loginMenu.contains(e.target)) {
        loginMenu.classList.add('hidden');
        loginToggle.setAttribute('aria-expanded','false');
      }
    });
  }

  // 3) Dark Mode
  const darkToggle = document.getElementById('darkToggle');
  if (darkToggle) {
    let saved = localStorage.getItem('darkMode')==='true';
    darkToggle.checked = saved;
    document.body.classList.toggle('dark', saved);
    darkToggle.addEventListener('change', ()=>{
      document.body.classList.toggle('dark', darkToggle.checked);
      localStorage.setItem('darkMode', darkToggle.checked);
      darkToggle.parentElement.classList.add('bumped');
      setTimeout(()=>darkToggle.parentElement.classList.remove('bumped'),300);
    });
  }

  // 4) Collapsible
  document.querySelectorAll('.collapsible').forEach(panel=>{
    let hdr = panel.querySelector('.collapsible-header'),
        body= panel.querySelector('.collapsible-body');
    hdr?.addEventListener('click', ()=>{
      let open = panel.classList.toggle('open');
      hdr.setAttribute('aria-expanded', open);
      body.style.maxHeight = open ? body.scrollHeight+'px' : '0';
    });
  });

  // 5) Modals & Auth
  const loginModal     = document.getElementById('loginModal'),
        registerModal  = document.getElementById('registerModal'),
        openLoginLinks = document.querySelectorAll('.openLogin'),
        showRegister   = document.getElementById('showRegister'),
        closeBtns      = document.querySelectorAll('.modal .close'),
        loginForm      = document.getElementById('loginForm'),
        registerForm   = document.getElementById('registerForm'),
        logoutBtn      = document.getElementById('logoutBtn'),
        loginToggleBtn = loginToggle;

  function openModal(modal){ modal.classList.remove('hidden'); fadeIn(modal.querySelector('.modal-content'),200); }
  function closeModal(modal){ fadeOut(modal.querySelector('.modal-content'),200); setTimeout(()=>modal.classList.add('hidden'),200); }
  openLoginLinks.forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();
    document.getElementById('loginRole').value = a.dataset.role;
    openModal(loginModal);
  }));
  showRegister?.addEventListener('click',e=>{
    e.preventDefault();
    closeModal(loginModal);
    openModal(registerModal);
  });
  closeBtns.forEach(b=>b.addEventListener('click',()=>closeModal(document.getElementById(b.dataset.modal))));
  document.addEventListener('keydown',e=>{
    if (e.key==='Escape') [loginModal,registerModal].forEach(m=>!m.classList.contains('hidden')&&closeModal(m));
  });

  async function updateNav(){
    try {
      let res = await fetch(`${API}/user`,{credentials:'include'});
      if (!res.ok) throw '';
      let {user} = await res.json();
      loginToggleBtn.textContent = user?.email ? `${user.email} ▼` : 'Login ▼';
    } catch {
      loginToggleBtn.textContent = 'Login ▼';
    }
  }
  updateNav();

  // Register
  registerForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    let email     = document.getElementById('registerEmail').value,
        pass      = document.getElementById('registerPassword').value,
        confirm   = document.getElementById('registerConfirm').value,
        role      = document.getElementById('registerRole').value,
        btn       = registerForm.querySelector('button');
    if (pass!==confirm){ alert('Passwords must match'); return; }
    btn.disabled=true;
    try{
      let r=await fetch(`${API}/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass,role})});
      let j=await r.json(); if(!r.ok) throw j.message;
      // auto login
      r=await fetch(`${API}/login`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass,role})});
      j=await r.json(); if(!r.ok) throw j.message;
      closeModal(registerModal);
      updateNav();
    }catch(err){ alert(`Error: ${err}`); }
    finally{ btn.disabled=false; }
  });
  // Login
  loginForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    let email   = document.getElementById('loginEmail').value,
        pass    = document.getElementById('loginPassword').value,
        role    = document.getElementById('loginRole').value,
        btn     = loginForm.querySelector('button');
    btn.disabled=true;
    try{
      let r=await fetch(`${API}/login`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass,role})});
      let j=await r.json(); if(!r.ok) throw j.message;
      closeModal(loginModal);
      updateNav();
    }catch(err){ alert(`Error: ${err}`); }
    finally{ btn.disabled=false; }
  });
  // Logout
  logoutBtn?.addEventListener('click',async e=>{
    e.preventDefault();
    await fetch(`${API}/logout`,{method:'POST',credentials:'include'});
    updateNav();
  });

  // 6) Task forms
  [
    {id:'repairForm',endpoint:'repair', fields:['repairName','repairAddress','repairIssue'], msg:'Repair sent!'},
    {id:'cleaningForm',endpoint:'cleaning',fields:['cleaningName','cleaningAddress','cleaningDate'],msg:'Cleaning scheduled!'},
    {id:'messageForm',endpoint:'message', fields:['messageName','messageEmail','messageBody'], msg:'Message sent!'}
  ].forEach(cfg=>{
    let f=document.getElementById(cfg.id);
    if(!f) return;
    f.addEventListener('submit',async e=>{
      e.preventDefault();
      let btn=f.querySelector('button'); btn.disabled=true;
      let body={};
      cfg.fields.forEach(id=> body[id.replace(/(Name|Address|Issue|Date|Email|Body)$/,'').toLowerCase()] = document.getElementById(id).value );
      try {
        let r=await fetch(`${API}/${cfg.endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        let j=await r.json(); if(!r.ok) throw j.message;
        alert(cfg.msg);
        f.reset();
      } catch(err){
        btn.classList.add('jiggle');
        setTimeout(()=>btn.classList.remove('jiggle'),300);
        alert(`Error: ${err}`);
      } finally{ btn.disabled=false; }
    });
  });

  // 7) Dashboard → Collapsible
  document.querySelectorAll('.dashboard-card').forEach((card,i)=>{
    card.style.setProperty('--i', i);
    card.addEventListener('click',()=>{
      let t=card.dataset.target;
      document.querySelectorAll('.collapsible').forEach(panel=>{
        let hdr=panel.querySelector('.collapsible-header'),
            bd =panel.querySelector('.collapsible-body');
        if(panel.dataset.target===t){
          panel.classList.add('open');
          hdr.setAttribute('aria-expanded',true);
          bd.style.maxHeight=bd.scrollHeight+'px';
        } else {
          panel.classList.remove('open');
          hdr.setAttribute('aria-expanded',false);
          bd.style.maxHeight=0;
        }
      });
    });
  });

  // 8) Community
  const postForm = document.getElementById('communityPostForm'),
        postList = document.getElementById('communityPosts');
  async function loadPosts(){
    if(!postList) return;
    try {
      let res=await fetch(`${API}/posts`), posts=await res.json();
      postList.innerHTML = posts.length
        ? '' : '<li>No posts yet—be the first!</li>';
      posts.forEach((p,i)=>{
        let li=document.createElement('li');
        li.className='community-post';
        li.style.setProperty('--delay',`${i*0.1}s`);
        let av = p.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(p.name)}`;
        li.innerHTML=`
          <div class="community-avatar" style="background-image:url('${av}')"></div>
          <div class="community-body">
            <div class="community-meta">
              <strong>${p.name}</strong>
              <time datetime="${p.date}">${new Date(p.date).toLocaleString()}</time>
            </div>
            <div class="community-message">${p.message}</div>
          </div>
        `;
        postList.appendChild(li);
      });
      // scroll reveal
      new IntersectionObserver((eos,obs)=>{
        eos.forEach(eo=>eo.isIntersecting&&(eo.target.classList.add('visible'), obs.unobserve(eo.target)));
      },{threshold:0.1})
      .observeAll && postList.querySelectorAll('.community-post').forEach(li=>observer.observe(li));
    } catch {
      postList.innerHTML = '<li>Error loading posts.</li>';
    }
  }
  if(postForm){
    postForm.addEventListener('submit',async e=>{
      e.preventDefault();
      let n=document.getElementById('posterName').value.trim(),
          m=document.getElementById('posterMessage').value.trim();
      if(!n||!m) return;
      let btn=postForm.querySelector('button'); btn.disabled=true;
      try{
        await fetch(`${API}/posts`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ name:n,message:m,avatar:`https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(n)}`})
        });
        postForm.reset();
        await loadPosts();
      }catch{ alert('Error posting.'); }
      finally{ btn.disabled=false; }
    });
  }
  loadPosts();
});
