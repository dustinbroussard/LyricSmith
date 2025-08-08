document.addEventListener('DOMContentLoaded', () => {
  // Ensure touch devices trigger button actions
  document.addEventListener(
    'touchstart',
    (e) => {
      const btn = e.target.closest('button');
      if (btn) {
        e.preventDefault();
        btn.click();
      }
    },
    { passive: false }
  );
  // === THEME TOGGLE ===
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.dataset.theme = savedTheme;

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  themeToggleBtn?.addEventListener('click', () => {
    const newTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
  });

  // === CLIPBOARD MANAGER ===
  class ClipboardManager {
    static async copyToClipboard(text, showToast = true) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for mobile/older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
        
        if (showToast) {
          this.showToast('Copied to clipboard!', 'success');
        }
        return true;
      } catch (err) {
        console.error('Failed to copy:', err);
        if (showToast) {
          this.showToast('Failed to copy to clipboard', 'error');
        }
        return false;
      }
    }

    static showToast(message, type = 'info') {
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      container.appendChild(toast);

      // Trigger animation
      setTimeout(() => toast.classList.add('show'), 10);

      // Remove after 3 seconds with fade out
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    static formatLyricsWithChords(lyrics, chords) {
      const lyricLines = lyrics.split('\n');
      const chordLines = chords.split('\n');
      
      return lyricLines.map((lyricLine, i) => {
        const chordLine = chordLines[i] || '';
        if (chordLine.trim()) {
          return `${chordLine}\n${lyricLine}`;
        }
        return lyricLine;
      }).join('\n');
    }
  }

  // === APP LOGIC ===
  const app = {
    songList: document.getElementById('song-list'),
    songs: [],
    currentSongId: null,
    defaultSections: "[Intro]\n\n[Verse 1]\n\n[Pre-Chorus]\n\n[Chorus]\n\n[Verse 2]\n\n[Bridge]\n\n[Outro]",
    sortOrder: localStorage.getItem('songSortOrder') || 'titleAsc',

    init() {
      // Load mammoth for DOCX processing
      if (typeof mammoth === 'undefined') {
        console.warn('Mammoth.js not loaded - DOCX support will not work');
      }

      this.loadSongs();
      this.renderSongs();
      this.renderToolbar();
      this.bindEvents();
      this.initDragSort();
    },

    loadSongs() {
      this.songs = JSON.parse(localStorage.getItem('songs') || '[]');
      // Migrate old songs to new format
      this.songs = this.songs.map(song => this.migrateSongFormat(song));
      this.saveSongs();
    },

    migrateSongFormat(song) {
      // Ensure all songs have the new metadata fields
      return {
        id: song.id || Date.now().toString(),
        title: song.title || 'Untitled',
        lyrics: this.normalizeSectionLabels(song.lyrics || ''),
        chords: song.chords || '',
        key: song.key || '',
        tempo: song.tempo || 120,
        timeSignature: song.timeSignature || '4/4',
        notes: song.notes || '',
        createdAt: song.createdAt || new Date().toISOString(),
        lastEditedAt: song.lastEditedAt || new Date().toISOString(),
        tags: song.tags || []
      };
    },

    createSong(title, lyrics = '', chords = '') {
      const normalizedLyrics = lyrics.trim()
        ? this.normalizeSectionLabels(lyrics)
        : this.defaultSections;
      return {
        id: Date.now().toString(),
        title,
        lyrics: normalizedLyrics,
        chords,
        key: '',
        tempo: 120,
        timeSignature: '4/4',
        notes: '',
        createdAt: new Date().toISOString(),
        lastEditedAt: new Date().toISOString(),
        tags: []
      };
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

    normalizeSectionLabels(text = '') {
      const sectionKeywords = [
        'intro',
        'verse',
        'prechorus',
        'chorus',
        'bridge',
        'outro',
        'hook',
        'refrain',
        'coda',
        'solo',
        'interlude',
        'ending',
        'breakdown',
        'tag'
      ];
      return text.split(/\r?\n/).map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        const match = trimmed.match(/^[\*\s\-_=~`]*[\(\[\{]?\s*([^\]\)\}]+?)\s*[\)\]\}]?[\*\s\-_=~`]*:?$/);
        if (match) {
          const label = match[1].trim();
          const normalized = label.toLowerCase().replace(/[^a-z]/g, '');
          if (sectionKeywords.some(k => normalized.startsWith(k))) {
            const formatted = label
              .replace(/\s+/g, ' ')
              .replace(/(^|\s)\S/g, c => c.toUpperCase());
            return `[${formatted}]`;
          }
        }
        return line;
      }).join('\n');
    },

    formatTimeAgo(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return date.toLocaleDateString();
    },

    highlightMatch(text, query) {
      if (!query) return text;
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'ig');
      return text.replace(regex, match => `<strong>${match}</strong>`);
    },

    renderSongs(searchQuery = "") {
      this.songList.innerHTML = '';

      let filtered = this.songs;
      if (searchQuery && searchQuery.trim()) {
        const fuse = new Fuse(this.songs, {
          keys: ['title', 'tags', 'key'],
          threshold: 0.35,
          ignoreLocation: true,
          minMatchCharLength: 2
        });
        const results = fuse.search(searchQuery.trim());
        filtered = results.map(r => r.item);
      }

      filtered.sort((a, b) => {
        switch (this.sortOrder) {
          case 'titleDesc':
            return b.title.localeCompare(a.title);
          case 'recent':
            return new Date(b.lastEditedAt) - new Date(a.lastEditedAt);
          default:
            return a.title.localeCompare(b.title);
        }
      });

      if (filtered.length === 0) {
        this.songList.innerHTML = `<p class="empty-state">No songs found.</p>`;
        return;
      }

      for (const song of filtered) {
        const item = document.createElement('div');
        item.className = 'song-item';
        item.dataset.id = song.id;
        
        // Build metadata display
        const metadata = [];
        if (song.key) metadata.push(song.key);
        if (song.tempo && song.tempo !== 120) metadata.push(`${song.tempo} BPM`);
        if (song.timeSignature && song.timeSignature !== '4/4') metadata.push(song.timeSignature);
        
        const lastEdited = this.formatTimeAgo(song.lastEditedAt);

        item.innerHTML = `
          <div class="song-info">
            <span class="song-title">${this.highlightMatch(song.title, searchQuery)}</span>
            ${metadata.length > 0 ? `<div class="song-metadata">${metadata.join(' • ')}</div>` : ''}
            <div class="song-details">
              ${song.tags?.length > 0 ? `<span class="song-tags">${song.tags.map(tag => `<span class=\"song-tag\" data-tag=\"${tag}\">${this.highlightMatch(tag, searchQuery)}</span>`).join(', ')}</span>` : ''}
              <span class="song-edited">Last edited: ${lastEdited}</span>
            </div>
          </div>
          <div class="song-actions">
            <button class="song-copy-btn icon-btn" title="Quick Copy" aria-label="Quick copy ${song.title}" data-song-id="${song.id}">
              <i class="fas fa-copy"></i>
            </button>
            <a class="song-edit-btn edit-song-btn" href="editor/editor.html?songId=${song.id}" title="Edit" aria-label="Edit ${song.title}">
              <i class="fas fa-pen"></i>
            </a>
            <button class="song-delete-btn danger delete-song-btn" title="Delete" aria-label="Delete ${song.title}" data-song-id="${song.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;

        // Add event listeners
        const copyBtn = item.querySelector('.song-copy-btn');
        copyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.quickCopySong(song);
        });

        const deleteBtn = item.querySelector('.song-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (confirm(`Delete "${song.title}"?`)) {
            this.songs = this.songs.filter(s => s.id !== song.id);
            this.saveSongs();
            this.renderSongs(searchQuery);
          }
        });

        item.querySelectorAll('.song-tag').forEach(tagEl => {
          tagEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const tag = tagEl.dataset.tag;
            const input = document.getElementById('song-search-input');
            if (input) input.value = tag;
            this.renderSongs(tag.toLowerCase());
          });
        });

        item.addEventListener('click', (e) => {
          if (!e.target.closest('.song-actions')) {
            window.location.href = `editor/editor.html?songId=${song.id}`;
          }
      });

      this.songList.appendChild(item);
    }
  },

    initDragSort() {
      if (!this.songList) return;
      Sortable.create(this.songList, {
        handle: '.song-info',
        animation: 150,
        onEnd: () => {
          const order = Array.from(this.songList.children).map(child => child.dataset.id);
          const map = new Map(this.songs.map(s => [s.id, s]));
          this.songs = order.map(id => map.get(id)).filter(Boolean);
          this.saveSongs();
        }
      });
    },

    async quickCopySong(song) {
      // Default to lyrics with chords if available, otherwise just lyrics
      let textToCopy = '';
      if (song.chords && song.chords.trim()) {
        textToCopy = ClipboardManager.formatLyricsWithChords(song.lyrics, song.chords);
      } else {
        textToCopy = song.lyrics || '';
      }
      
      await ClipboardManager.copyToClipboard(textToCopy);
    },

    renderToolbar() {
      const toolbar = document.getElementById('tab-toolbar');
      toolbar.innerHTML = `
        <input type="text" id="song-search-input" class="search-input" placeholder="Search songs, tags, or keys...">
        <select id="song-sort-select" class="sort-select">
          <option value="titleAsc">Title A–Z</option>
          <option value="titleDesc">Title Z–A</option>
          <option value="recent">Recently Edited</option>
        </select>
        <div class="toolbar-buttons-group">
          <button id="add-song-btn" class="btn" title="Add Song"><i class="fas fa-plus"></i></button>
          <button id="export-library-btn" class="btn" title="Export Library"><i class="fas fa-download"></i></button>
          <button id="import-clipboard-btn" class="btn" title="Paste Song"><i class="fas fa-paste"></i></button>
          <button id="delete-all-songs-btn" class="btn danger" title="Delete All Songs"><i class="fas fa-trash"></i></button>
          <label for="song-upload-input" class="btn" title="Upload Files"><i class="fas fa-upload"></i></label>
        </div>
        <input type="file" id="song-upload-input" multiple accept=".txt,.docx,.json" class="hidden-file">
      `;

      document.getElementById('song-sort-select').value = this.sortOrder;
      document.getElementById('song-sort-select')?.addEventListener('change', (e) => {
        this.sortOrder = e.target.value;
        localStorage.setItem('songSortOrder', this.sortOrder);
        const query = document.getElementById('song-search-input')?.value.toLowerCase() || '';
        this.renderSongs(query);
      });

      document.getElementById('add-song-btn')?.addEventListener('click', () => this.createNewSong());
      document.getElementById('export-library-btn')?.addEventListener('click', () => {
        const includeMetadata = confirm('Include metadata in export?');
        this.exportLibrary(includeMetadata);
      });
      document.getElementById('import-clipboard-btn')?.addEventListener('click', async () => {
        const text = await navigator.clipboard.readText();
        if (text.trim()) {
          const title = prompt("Title for pasted song?", "New Song");
          if (title) {
            const newSong = this.createSong(title, text);
            this.songs.push(newSong);
            this.saveSongs();
            this.renderSongs();
          }
        }
      });
      document.getElementById('delete-all-songs-btn')?.addEventListener('click', () => this.confirmDeleteAll());
      document.getElementById('song-search-input')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        this.renderSongs(query);
      });

      document.getElementById('song-upload-input')?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // Check if it's a JSON library import
        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        if (jsonFiles.length > 0) {
          await this.importLibrary(jsonFiles[0]);
          e.target.value = "";
          return;
        }

        const processFile = async (file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
              let content = e.target.result;
              
              if (file.name.endsWith('.docx')) {
                try {
                  const result = await mammoth.extractRawText({arrayBuffer: e.target.result});
                  content = result.value;
                } catch (err) {
                  console.error('Error processing DOCX:', err);
                  return resolve(null);
                }
              }
              
              // Extract title from filename (without extension)
              const title = this.normalizeTitle(file.name);
              const lyrics = content.trim();
              
              if (title && lyrics) {
                resolve(this.createSong(title, lyrics));
              } else {
                resolve(null);
              }
            };
            
            if (file.name.endsWith('.docx')) {
              reader.readAsArrayBuffer(file);
            } else {
              reader.readAsText(file);
            }
          });
        };

        // Process files sequentially to avoid overwhelming the UI
        let importCount = 0;
        for (const file of files) {
          const song = await processFile(file);
          if (song) {
            this.songs.push(song);
            importCount++;
          }
        }

        this.saveSongs();
        this.renderSongs();
        ClipboardManager.showToast(`Imported ${importCount} song(s)`, 'success');
        e.target.value = ""; // Clear input
      });
    },

    createNewSong() {
      const newSong = this.createSong('New Song', '');
      this.songs.push(newSong);
      this.saveSongs();
      // Redirect to editor for the new song
      window.location.href = `editor/editor.html?songId=${newSong.id}`;
    },

    async exportLibrary(includeMetadata = true) {
      try {
        const songs = includeMetadata
          ? this.songs
          : this.songs.map(({ title, lyrics, chords }) => ({ title, lyrics, chords }));
        // Create export data
        const exportData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          songCount: songs.length,
          songs
        };

        // Create and download JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `lyricsmith-library-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        ClipboardManager.showToast(`Exported ${this.songs.length} songs`, 'success');
      } catch (err) {
        console.error('Export failed:', err);
        ClipboardManager.showToast('Export failed', 'error');
      }
    },

    async importLibrary(file) {
      try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        // Validate import data
        if (!importData.songs || !Array.isArray(importData.songs)) {
          throw new Error('Invalid library format');
        }

        // Confirm import
        const confirmMsg = `Import ${importData.songs.length} songs? This will add to your existing library.`;
        if (!confirm(confirmMsg)) return;

        // Process and migrate imported songs
        let importCount = 0;
        for (const songData of importData.songs) {
          const song = this.migrateSongFormat(songData);
          // Generate new ID to avoid conflicts
          song.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          song.lastEditedAt = new Date().toISOString();
          this.songs.push(song);
          importCount++;
        }

        this.saveSongs();
        this.renderSongs();
        ClipboardManager.showToast(`Imported ${importCount} songs`, 'success');
      } catch (err) {
        console.error('Import failed:', err);
        ClipboardManager.showToast('Import failed - invalid file format', 'error');
      }
    },

    confirmDeleteAll() {
      if (confirm("Delete all songs? This cannot be undone.")) {
        this.songs = [];
        this.saveSongs();
        this.renderSongs();
        ClipboardManager.showToast('All songs deleted', 'info');
      }
    },

    bindEvents() {
      // Add keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N for new song
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
          e.preventDefault();
          this.createNewSong();
        }
        
        // Ctrl/Cmd + E for export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
          e.preventDefault();
          this.exportLibrary();
        }
      });

      // Focus search on '/' key
      document.addEventListener('keydown', (e) => {
        if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          document.getElementById('song-search-input')?.focus();
        }
      });
    }
  };

  app.init();
  window.app = app;
});
