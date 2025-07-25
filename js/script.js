document.addEventListener('DOMContentLoaded', () => {
  const loginToggle = document.getElementById('loginToggle');
  const loginMenu = document.getElementById('loginMenu');
  const loginForm = document.getElementById('loginForm');

  const cleaningForm = document.getElementById('cleaningForm');
  const repairForm = document.getElementById('repairForm');
  const postForm = document.getElementById('communityPostForm');
  const postList = document.getElementById('communityPosts');

  /** Login Dropdown Behavior **/
  loginToggle?.addEventListener('click', e => {
    e.preventDefault();
    const expanded = loginToggle.getAttribute('aria-expanded') === 'true';
    loginToggle.setAttribute('aria-expanded', !expanded);
    loginMenu.classList.toggle('hidden');
    loginMenu.classList.toggle('show');
  });

  document.addEventListener('click', e => {
    if (!loginMenu.contains(e.target) && !loginToggle.contains(e.target)) {
      loginMenu.classList.add('hidden');
      loginMenu.classList.remove('show');
      loginToggle.setAttribute('aria-expanded', 'false');
    }
  });

  /** Form Submissions **/
  cleaningForm?.addEventListener('submit', e => {
    e.preventDefault();
    alert(`Cleaning scheduled for ${cleaningForm.cleaningDate.value}`);
    cleaningForm.reset();
  });

  repairForm?.addEventListener('submit', e => {
    e.preventDefault();
    alert(`Repair submitted: ${repairForm.repairIssue.value}`);
    repairForm.reset();
  });

  loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    const email = loginForm.loginEmail.value;
    alert(`Logging in as ${email}`);
    loginMenu.classList.add('hidden');
    loginMenu.classList.remove('show');
  });

  postForm?.addEventListener('submit', e => {
    e.preventDefault();
    const name = postForm.posterName.value.trim();
    const message = postForm.posterMessage.value.trim();
    if (!name || !message) return;

    const li = document.createElement('li');
    li.className = 'animated-card';
    li.innerHTML = `
      <strong>${name}</strong><br />
      <small>${new Date().toLocaleString()}</small>
      <p>${message}</p>
    `;
    postList.prepend(li);
    postForm.reset();
  });
});
