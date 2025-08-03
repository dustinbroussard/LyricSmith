document.addEventListener('DOMContentLoaded', () => {
  // === THEME TOGGLE ===
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.dataset.theme = savedTheme;

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  themeToggleBtn?.addEventListener('click', () => {
    const newTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
  });

  // === APP LOGIC ===
  const app = {
    songList: document.getElementById('song-list'),
    songModal: document.getElementById('song-modal'),
    songModalTitle: document.getElementById('song-modal-title'),
    saveSongBtn: document.getElementById('save-song-btn'),
    cancelSongBtn: document.getElementById('cancel-song-btn'),
    songTitleInput: document.getElementById('song-title-input'),
    songLyricsInput: document.getElementById('song-lyrics-input'),

    songs: [],
    currentSongId: null,

    init() {
      this.loadSongs();
      this.renderSongs();
      this.bindEvents();
    },

    loadSongs() {
      this.songs = JSON.parse(localStorage.getItem('songs') || '[]');
    },

    saveSongs() {
      localStorage.setItem('songs', JSON.stringify(this.songs));
    },

    normalizeTitle(title) {
      return title
        .replace(/\.[^/.]+$/, '')
        .replace(/[_\-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
    },

    renderSongs() {
      this.songList.innerHTML = '';

      const sorted = [...this.songs].sort((a, b) => a.title.localeCompare(b.title));

      for (const song of sorted) {
        const item = document.createElement('div');
        item.className = 'song-item';
        item.dataset.id = song.id;
        item.innerHTML = `
          <span>${song.title}</span>
          <div>
            <a class="btn" href="editor/performance.html?songId=${song.id}" title="Edit">
              <i class="fas fa-pen"></i>
            </a>
            <button class="btn danger delete-song-btn" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;

        item.querySelector('.delete-song-btn').addEventListener('click', () => {
          if (confirm(`Delete "${song.title}"?`)) {
            this.songs = this.songs.filter(s => s.id !== song.id);
            this.saveSongs();
            this.renderSongs();
          }
        });

        this.songList.appendChild(item);
      }
    },

    bindEvents() {
      this.saveSongBtn?.addEventListener('click', () => this.saveNewSong());
      this.cancelSongBtn?.addEventListener('click', () => this.closeModal());

      const addBtn = document.getElementById('add-song-btn');
      addBtn?.addEventListener('click', () => this.openModal());
    },

    openModal() {
      this.currentSongId = null;
      this.songTitleInput.value = '';
      this.songLyricsInput.value = '';
      this.songModalTitle.textContent = 'Add Song';
      this.songModal.style.display = 'block';
    },

    closeModal() {
      this.songModal.style.display = 'none';
    },

    saveNewSong() {
      const title = this.normalizeTitle(this.songTitleInput.value.trim());
      const lyrics = this.songLyricsInput.value.trim();
      if (!title || !lyrics) return;

      this.songs.push({
        id: Date.now().toString(),
        title,
        lyrics
      });

      this.saveSongs();
      this.renderSongs();
      this.closeModal();
    }
  };

  app.init();
});

