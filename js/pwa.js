// Handle PWA install banner
let deferredPrompt;
const banner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const closeBtn = document.getElementById('close-install');

function dismissedThisSession() {
  return sessionStorage.getItem('pwaDismissed') === '1';
}

window.addEventListener('beforeinstallprompt', (e) => {
  if (dismissedThisSession() ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone) {
    return;
  }
  e.preventDefault();
  deferredPrompt = e;
  banner?.classList.add('show');
});

installBtn?.addEventListener('click', async () => {
  banner.classList.remove('show');
  sessionStorage.setItem('pwaDismissed', '1');
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});

closeBtn?.addEventListener('click', () => {
  banner.classList.remove('show');
  sessionStorage.setItem('pwaDismissed', '1');
});
