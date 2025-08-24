window.CONFIG = {
  chordsModeEnabled: true,
  autosaveEnabled: true,
  autoscrollDefaultEnabled: true,
  chordLinePrefix: "~",
  assumeNoChords: true,
  openrouterApiKey: "",
  defaultModel: "openrouter/auto",
  systemPrompt: ""
};

// Bootstrap from localStorage so tools see the saved values immediately.
(function syncConfigFromLocalStorage(){
  try {
    const ls = localStorage;
    window.CONFIG.openrouterApiKey = ls.getItem('openrouterApiKey') || window.CONFIG.openrouterApiKey;
    window.CONFIG.defaultModel    = ls.getItem('openrouterModel')   || window.CONFIG.defaultModel;
    window.CONFIG.systemPrompt    = ls.getItem('systemPrompt')      || window.CONFIG.systemPrompt;
    // Theme is used elsewhere; ensure dataset when present.
    const theme = ls.getItem('theme');
    if (theme) document.documentElement.dataset.theme = theme;
  } catch {}
})();
