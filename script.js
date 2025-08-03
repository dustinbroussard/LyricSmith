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
      this.renderToolbar();
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

    renderSongs(searchQuery = "") {
      this.songList.innerHTML = '';

      const filtered = this.songs
        .filter(song => song.title.toLowerCase().includes(searchQuery))
        .sort((a, b) => a.title.localeCompare(b.title));

      if (filtered.length === 0) {
        this.songList.innerHTML = `<p class="empty-state">No songs found.</p>`;
        return;
      }

      for (const song of filtered) {
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
            this.renderSongs(searchQuery);
          }
        });

        this.songList.appendChild(item);
      }
    },

    renderToolbar() {
      const toolbar = document.getElementById('tab-toolbar');
      toolbar.innerHTML = `
        <input type="text" id="song-search-input" class="search-input" placeholder="Search songs...">
        <div class="toolbar-buttons-group">
          <button id="add-song-btn" class="btn" title="Add Song"><i class="fas fa-plus"></i></button>
          <button id="delete-all-songs-btn" class="btn danger" title="Delete All Songs"><i class="fas fa-trash"></i></button>
          <label for="song-upload-input" class="btn" title="Upload Files"><i class="fas fa-upload"></i></label>
        </div>
        <input type="file" id="song-upload-input" multiple accept=".txt,.docx" class="hidden-file">
      `;

      document.getElementById('add-song-btn')?.addEventListener('click', () => this.openModal());
      document.getElementById('delete-all-songs-btn')?.addEventListener('click', () => this.confirmDeleteAll());
      document.getElementById('song-search-input')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        this.renderSongs(query);
      });

      // Upload handler (stubbed for now)
      document.getElementById('song-upload-input')?.addEventListener('change', (e) => {
        alert("Upload not implemented yet.");
        e.target.value = ""; // Clear input
      });
    },

    confirmDeleteAll() {
      if (confirm("Delete all songs? This cannot be undone.")) {
        this.songs = [];
        this.saveSongs();
        this.renderSongs();
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

