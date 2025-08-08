window.addEventListener('DOMContentLoaded', () => {
  const darkSetting = document.getElementById('darkModeSetting');
  const showTips = document.getElementById('showTips');
  // Load from storage
  darkSetting.checked = localStorage.getItem('darkMode') === 'true';
  showTips.checked = localStorage.getItem('showTips') === 'true';

  document.getElementById('settingsForm').addEventListener('submit', e => {
    e.preventDefault();
    localStorage.setItem('darkMode', darkSetting.checked);
    localStorage.setItem('showTips', showTips.checked);
    document.getElementById('settingsMsg').textContent = "Settings saved!";
    document.body.classList.toggle('dark', darkSetting.checked);
  });
});
