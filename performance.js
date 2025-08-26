(function(){
  const fontSizeStep = 2;
  const perSongFontSizes = JSON.parse(localStorage.getItem('perSongFontSizes') || '{}');
  const songId = new URLSearchParams(location.search).get('songId') || 'default';
  const lyricsEl = document.getElementById('lyrics');

  let currentFontSize = perSongFontSizes[songId] || 16;
  applyFontSize();

  function applyFontSize(){
    if (lyricsEl) {
      lyricsEl.style.fontSize = currentFontSize + 'px';
    }
    updateFontSize();
  }

  function updateFontSize(){
    const footerDisplay = document.getElementById('footer-font-size-display');
    if (footerDisplay) footerDisplay.textContent = currentFontSize + 'px';
    const headerDisplay = document.getElementById('font-size-display');
    if (headerDisplay) headerDisplay.textContent = currentFontSize + 'px';
  }

  function adjustFontSize(delta){
    currentFontSize = Math.max(8, currentFontSize + delta);
    perSongFontSizes[songId] = currentFontSize;
    localStorage.setItem('perSongFontSizes', JSON.stringify(perSongFontSizes));
    applyFontSize();
  }

  document.getElementById('footer-decrease-font-btn')?.addEventListener('click', () => adjustFontSize(-fontSizeStep));
  document.getElementById('footer-increase-font-btn')?.addEventListener('click', () => adjustFontSize(fontSizeStep));

  // Modal helpers
  function closeModals(){
    document.querySelectorAll('.modal.is-open').forEach(m => m.classList.remove('is-open'));
  }
  function openModal(id){
    const m = document.getElementById(id);
    if (m) m.classList.add('is-open');
  }

  document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModals));

  document.getElementById('footer-perf-menu-btn')?.addEventListener('click', () => openModal('performance-menu-modal'));
  document.getElementById('footer-autoscroll-settings-btn')?.addEventListener('click', () => openModal('autoscroll-delay-modal'));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
  });

  // Theme toggle
  document.getElementById('footer-theme-toggle-btn')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = current;
    localStorage.setItem('theme', current);
  });

  document.getElementById('footer-exit-performance-btn')?.addEventListener('click', () => {
    window.location.href = '/';
  });
})();
