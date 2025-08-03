document.addEventListener('DOMContentLoaded', () => {
    const app = {
        // DOM Elements
        editorMode: document.getElementById('editor-mode'),
        editorSongInfo: document.getElementById('editor-song-info'),
        lyricsDisplay: document.getElementById('lyrics-display'),
        decreaseFontBtn: document.getElementById('decrease-font-btn'),
        increaseFontBtn: document.getElementById('increase-font-btn'),
        fontSizeDisplay: document.getElementById('font-size-display'),
        toggleThemeBtn: document.getElementById('theme-toggle-btn'),
        exitEditorBtn: document.getElementById('exit-editor-btn'),

        // State
        songs: [],
        editorSongs: [],
        currentEditorSongIndex: 0,
        fontSize: 32,
        minFontSize: 16,
        maxFontSize: 72,
        fontSizeStep: 1,
        perSongFontSizes: JSON.parse(localStorage.getItem('perSongFontSizes') || '{}'),
        resizeObserver: null,

        init() {
            this.loadData();
            this.setupEventListeners();
            this.loadEditorState();
            this.displayCurrentEditorSong();
            this.setupResizeObserver();
        },

        loadData() {
            this.songs = JSON.parse(localStorage.getItem('songs')) || [];
            const theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.dataset.theme = theme;
        },

        setupEventListeners() {
            this.decreaseFontBtn?.addEventListener('click', () => this.adjustFontSize(-this.fontSizeStep));
            this.increaseFontBtn?.addEventListener('click', () => this.adjustFontSize(this.fontSizeStep));
            this.toggleThemeBtn?.addEventListener('click', () => this.toggleTheme());
            this.exitEditorBtn?.addEventListener('click', () => this.exitEditorMode());
        },

        setupResizeObserver() {
            if (window.ResizeObserver) {
                this.resizeObserver = new ResizeObserver(() => {
                    clearTimeout(this.resizeTimeout);
                    this.resizeTimeout = setTimeout(() => {
                        // optional fit logic
                    }, 100);
                });
                this.resizeObserver.observe(this.editorMode);
            }
        },

        loadEditorState() {
            const params = new URLSearchParams(window.location.search);
            const songId = params.get('songId');
            this.editorSongs = this.songs;

            if (songId) {
                this.currentEditorSongIndex = this.editorSongs.findIndex(s => s.id === songId);
                if (this.currentEditorSongIndex === -1) this.currentEditorSongIndex = 0;
            } else {
                this.currentEditorSongIndex = -1; // new song mode
            }
        },

        displayCurrentEditorSong() {
            const song = this.editorSongs[this.currentEditorSongIndex];

            if (!song) {
                this.editorSongInfo.innerHTML = `<h2>Untitled Song</h2><div class="song-progress">New Song</div>`;
                this.lyricsDisplay.textContent = '';
                this.fontSize = 32;
                this.updateFontSize();
                return;
            }

            // Clean title from top of lyrics
            let lines = song.lyrics.split('\n').map(line => line.trim());
            const normTitle = song.title.trim().toLowerCase();
            lines = lines.filter((line, i) => i > 1 || (line && line.toLowerCase() !== normTitle));

            this.editorSongInfo.innerHTML = `
                <h2>${song.title}</h2>
                <div class="song-progress">${this.currentEditorSongIndex + 1} / ${this.editorSongs.length}</div>
            `;
            this.lyricsDisplay.textContent = lines.join('\n');

            let fs = this.perSongFontSizes[song.id];
            if (typeof fs !== 'number') fs = this.fontSize || 32;
            this.fontSize = fs;
            this.updateFontSize();
        },

        adjustFontSize(amount) {
            this.fontSize = Math.max(this.minFontSize, Math.min(this.maxFontSize, this.fontSize + amount));
            this.updateFontSize();

            const song = this.editorSongs[this.currentEditorSongIndex];
            if (song?.id) {
                this.perSongFontSizes[song.id] = this.fontSize;
                localStorage.setItem('perSongFontSizes', JSON.stringify(this.perSongFontSizes));
            }
        },

        updateFontSize() {
            this.lyricsDisplay.style.fontSize = `${this.fontSize}px`;
            this.fontSizeDisplay.textContent = `${Math.round(this.fontSize)}px`;
        },

        toggleTheme() {
            const currentTheme = document.documentElement.dataset.theme;
            const newTheme = currentTheme.includes('dark') ? 'light' : 'dark';
            document.documentElement.dataset.theme = newTheme;
            localStorage.setItem('theme', newTheme);
        },

        exitEditorMode() {
            if (this.resizeObserver) this.resizeObserver.disconnect();
            window.location.href = '../index.html';
        },
    };

    app.init();
});

