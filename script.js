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

  function setThemeColorMeta(theme) {
    try {
      const meta = document.querySelector('meta[name="theme-color"]') || (function(){
        const m = document.createElement('meta');
        m.name = 'theme-color';
        document.head.appendChild(m);
        return m;
      })();
      meta.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
    } catch {}
  }
  setThemeColorMeta(savedTheme);

  function attachThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    themeToggleBtn?.addEventListener('click', () => {
      const newTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = newTheme;
      localStorage.setItem('theme', newTheme);
      setThemeColorMeta(newTheme);
      try { ClipboardManager.showToast(`Theme: ${newTheme[0].toUpperCase()}${newTheme.slice(1)}`, 'info'); } catch {}
    });
  }

  // Global busy overlay helpers
  function showGlobalBusy(text = 'Working…') {
    try {
      const overlay = document.getElementById('busy-overlay');
      const label = document.getElementById('busy-text');
      if (!overlay || !label) return;
      label.textContent = text;
      overlay.hidden = false;
      overlay.classList.add('show');
    } catch {}
  }
  function hideGlobalBusy() {
    try {
      const overlay = document.getElementById('busy-overlay');
      if (!overlay) return;
      overlay.classList.remove('show');
      overlay.hidden = true;
    } catch {}
  }
  attachThemeToggle();

  // === HOOK MILL INTEGRATION ===
  function attachHookMillButton() {
    const btn = document.getElementById('hookmill-btn');
    if (!btn) return;

    btn.addEventListener('click', async (e) => {
      // Quick open shortcut: Shift or Meta key
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        window.open('hook-mill/index.html', '_blank');
        return;
      }

      const choice = (prompt('Hook Mill: type "open" to open, "starred" to sync starred, or "all" to sync all.', 'starred') || '').trim().toLowerCase();
      if (choice === 'open') {
        window.open('hook-mill/index.html', '_blank');
        return;
      }
      if (choice === 'all' || choice === 'starred' || choice === '') {
        const starredOnly = choice !== 'all';
        btn.classList.add('loading');
        try {
          await app.syncHookMill(starredOnly);
        } finally {
          btn.classList.remove('loading');
        }
      }
    });
  }

  // Open Hook Mill IndexedDB, fall back to localStorage mirror if needed
  async function getHookMillItems() {
    const fromLocal = () => {
      const items = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('HM_LIB_') && k !== 'HM_LIB_') {
            const raw = localStorage.getItem(k);
            if (!raw) continue;
            try { items.push(JSON.parse(raw)); } catch {}
          }
        }
      } catch {}
      return items;
    };

    try {
      if (!('indexedDB' in window)) return fromLocal();
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('hook-mill', 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (!db) return fromLocal();
      const items = await new Promise((resolve) => {
        try {
          const tx = db.transaction('library', 'readonly');
          const store = tx.objectStore('library');
          const all = store.getAll();
          all.onsuccess = () => resolve(all.result || []);
          all.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });
      return Array.isArray(items) ? items : [];
    } catch {
      return fromLocal();
    }
  }

  // === TEXT → {lyrics, chords} SPLITTER ===
  function splitLyricsAndChordsFromText(rawText = '') {
    const prefix = (window.CONFIG && window.CONFIG.chordLinePrefix) || '~';
    const hasMarker = rawText
      .split(/\r?\n/)
      .some(line => line.trim().startsWith(prefix));
    // Fast path: no chord markers at all → purely lyrics
    if (!hasMarker && window.CONFIG?.assumeNoChords !== false) {
      return { lyrics: app.normalizeSectionLabels(rawText || ''), chords: '' };
    }

    const lines = (rawText || '').replace(/\r\n?/g, '\n').split('\n');
    const lyricsLines = [];
    const chordLines = [];
    let pendingChord = null;
    const isSection = (s) =>
      /^\s*[\(\[\{].*[\)\]\}]\s*$/.test(s.trim()) || /^\s*\[.*\]\s*$/.test(s.trim());

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const trimmed = line.trim();
      if (trimmed.startsWith(prefix)) {
        // chord line → keep last one wins
        const chord = trimmed.slice(prefix.length).replace(/^\s/, '');
        pendingChord = chord;
        continue;
      }
      // Treat the line as lyrics (including section labels and blank lines)
      lyricsLines.push(line);
      if (trimmed === '' || isSection(trimmed)) {
        // Never attach chords to empty lines or section labels
        chordLines.push('');
        pendingChord = null;
      } else {
        chordLines.push(pendingChord || '');
        pendingChord = null;
      }
    }

    return {
      lyrics: app.normalizeSectionLabels(lyricsLines.join('\n')),
      chords: chordLines.join('\n')
    };
  }

  // === CLIPBOARD MANAGER ===
  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
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

    static showToast(message, type = 'info', duration = 3000) {
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.setAttribute('role', 'status');
      toast.setAttribute('tabindex', '0');

      const content = document.createElement('div');
      content.className = 'toast-content';
      content.textContent = message;
      toast.appendChild(content);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      };
      toast.appendChild(closeBtn);

      toast.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      });

      toast.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);
        }
      });

      container.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 10);

      if (duration <= 0) {
        toast.classList.add('toast-sticky');
        return;
      }

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, duration);
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

    async init() {
      try { await window.StorageSafe?.init?.(); } catch {}
      // Load mammoth for DOCX processing
      if (typeof mammoth === 'undefined') {
        console.warn('Mammoth.js not loaded - DOCX support will not work');
      }

      this.loadSongs();
      this.renderSongs();
      this.renderToolbar();
      this.setupExportModal();
      this.bindEvents();
      this.initDragSort();

      // Handle PWA shortcut-triggered creation
      if (window.__CREATE_NEW_SONG_ON_LOAD__ === true) {
        // Create and navigate to the editor for the new song
        this.createNewSong();
        // Ensure the flag is single-use
        window.__CREATE_NEW_SONG_ON_LOAD__ = false;
      }
    },

    loadSongs() {
      this.songs = JSON.parse(localStorage.getItem('songs') || '[]');
      // Migrate old songs to new format
      this.songs = this.songs.map(song => this.migrateSongFormat(song));
      // Ensure unique IDs across the library
      const changed = this.ensureUniqueIds();
      if (changed) this.saveSongs();
    },

    migrateSongFormat(song) {
      // Ensure all songs have the new metadata fields
      const updated = {
        id: song.id || this.generateId(),
        title: song.title || 'Untitled',
        lyrics: this.stripTitleFromLyrics(song.title || 'Untitled', this.normalizeSectionLabels(song.lyrics || '')),
        chords: song.chords || '',
        key: song.key || '',
        tempo: song.tempo || 120,
        timeSignature: song.timeSignature || '4/4',
        notes: song.notes || '',
        createdAt: song.createdAt || new Date().toISOString(),
        lastEditedAt: song.lastEditedAt || new Date().toISOString(),
        tags: song.tags || []
      };
      const spaced = this.normalizeSectionSpacing(updated.lyrics, updated.chords);
      updated.lyrics = spaced.lyrics;
      updated.chords = spaced.chords;
      return updated;
    },

    createSong(title, lyrics = '', chords = '') {
      const normalizedLyrics = lyrics.trim()
        ? this.normalizeSectionLabels(lyrics)
        : this.defaultSections;
      const cleanLyrics = this.stripTitleFromLyrics(title, normalizedLyrics);
      const spaced = this.normalizeSectionSpacing(cleanLyrics, chords);
      return {
        id: this.generateId(),
        title,
        lyrics: spaced.lyrics,
        chords: spaced.chords,
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
      const data = JSON.stringify(this.songs);
      try {
        localStorage.setItem('songs', data);
      } catch (e) {
        console.warn('localStorage write failed', e);
        try { window.StorageSafe?.snapshotWithData?.(data, 'main:lsFail'); } catch {}
      }
      try { window.StorageSafe?.snapshotLater?.('saveSongs'); } catch {}
    },

    generateId() {
      return (
        Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
      );
    },

    ensureUniqueIds() {
      const seen = new Set();
      let changed = false;
      for (const song of this.songs) {
        let id = String(song.id || '');
        if (!id || seen.has(id)) {
          id = this.generateId();
          song.id = id;
          changed = true;
        }
        seen.add(id);
      }
      return changed;
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

    stripTitleFromLyrics(title = '', text = '') {
      const t = String(title || '').trim().replace(/\s+/g, '');
      if (!t) return String(text || '');
      return String(text || '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .filter(line => {
          const trimmed = (line || '').trim();
          // Keep section labels intact
          if (/^\s*\[[^\n\]]+\]\s*$/.test(trimmed)) return true;
          const norm = trimmed.replace(/\s+/g, '').toLowerCase();
          return norm !== t.toLowerCase();
        })
        .join('\n');
    },

    normalizeSectionSpacing(lyricsText = '', chordsText = '') {
      const isLabel = (line = '') => /^\s*\[[^\n\]]+\]\s*$/.test(line || '');
      const lyricsIn = String(lyricsText || '').replace(/\r\n?/g, '\n').split('\n');
      const chordsIn = String(chordsText || '').replace(/\r\n?/g, '\n').split('\n');

      const outLyrics = [];
      const outChords = [];
      let chordIdx = 0;

      // Ensure first non-empty is a section label; if not, insert a default one
      const firstNonEmpty = lyricsIn.find(l => (l || '').trim() !== '') || '';
      if (!isLabel(firstNonEmpty)) {
        outLyrics.push('[Verse 1]');
        outChords.push('');
      }

      for (let i = 0; i < lyricsIn.length; i++) {
        const raw = lyricsIn[i] ?? '';
        const trimmed = raw.trim();
        if (isLabel(trimmed)) {
          // Ensure a single blank line before each section label (except at very start)
          if (outLyrics.length > 0) {
            const last = outLyrics[outLyrics.length - 1] ?? '';
            if (last.trim() !== '') {
              outLyrics.push('');
              outChords.push('');
            }
          }
          outLyrics.push(trimmed);
          outChords.push('');
          continue;
        }
        if (trimmed === '') {
          // Drop blank lyric lines inside sections; still consume corresponding chord line
          if (lyricsIn[i] !== undefined) {
            // consume a chord entry if present for this lyric line
            if (chordIdx < chordsIn.length) chordIdx++;
          }
          continue;
        }
        // Regular lyric line
        outLyrics.push(raw);
        outChords.push(chordsIn[chordIdx] ?? '');
        chordIdx++;
      }

      // Trim trailing blanks
      while (outLyrics.length && outLyrics[outLyrics.length - 1].trim() === '') {
        outLyrics.pop();
        outChords.pop();
      }

      return { lyrics: outLyrics.join('\n'), chords: outChords.join('\n') };
    },

    cleanAIOutput(text) {
      return text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/^(Verse|Chorus|Bridge|Outro)[^\n]*$/gmi, '[$1]')
        .replace(/^#+\s*/gm, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^(Capo|Key|Tempo|Time Signature).*$/gmi, '')
        .trim();
    },

    enforceAlternating(lines) {
      const chords = [];
      const lyrics = [];
      for (let i = 0; i < lines.length; i++) {
        if (i % 2 === 0) {
          chords.push(lines[i] || '');
        } else {
          lyrics.push(lines[i] || '');
        }
      }
      return { chords, lyrics };
    },

    parseSongContent(content) {
      const cleaned = this.cleanAIOutput(content || '');
      const lines = cleaned.split(/\r?\n/);
      let lyricsText = cleaned;
      let chordsText = '';
      if (lines.length > 1) {
        const { chords, lyrics } = this.enforceAlternating(lines);
        if (chords.some(line => line.trim() !== '')) {
          chordsText = chords.join('\n');
          lyricsText = lyrics.join('\n');
        }
      }
      lyricsText = this.normalizeSectionLabels(lyricsText);
      return { lyrics: lyricsText, chords: chordsText };
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
      const terms = query
        .split(/\s+/)
        .filter(Boolean)
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (!terms.length) return text;
      const regex = new RegExp(`(${terms.join('|')})`, 'ig');
      return text.replace(regex, match => `<strong>${match}</strong>`);
    },

    renderSongs(searchQuery = "") {
      this.songList.innerHTML = '';

      let filtered = this.songs;
      if (searchQuery && searchQuery.trim()) {
        const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        filtered = this.songs.filter(song => {
          const title = song.title.toLowerCase();
          const tags = (song.tags || []).map(t => t.toLowerCase());
          const key = song.key?.toLowerCase() || '';
          return terms.every(term =>
            title.includes(term) ||
            tags.some(tag => tag.includes(term)) ||
            key.includes(term)
          );
        });
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
        if (song.key) metadata.push(escapeHtml(song.key));
        if (song.tempo && song.tempo !== 120) metadata.push(`${song.tempo} BPM`);
        if (song.timeSignature && song.timeSignature !== '4/4') metadata.push(escapeHtml(song.timeSignature));
        
        const lastEdited = this.formatTimeAgo(song.lastEditedAt);

        const safeTitleHtml = this.highlightMatch(escapeHtml(song.title), searchQuery);
        const safeTitleAttr = escapeHtml(song.title);
        item.innerHTML = `
          <div class="song-info">
            <span class="song-title">${safeTitleHtml}</span>
            ${metadata.length > 0 ? `<div class="song-metadata">${metadata.join(' • ')}</div>` : ''}
            <div class="song-details">
              <span class="song-tags"></span>
              <span class="song-edited">Last edited: ${lastEdited}</span>
            </div>
          </div>
          <div class="song-actions">
            <button class="song-copy-btn icon-btn" title="Quick Copy" aria-label="Quick copy ${safeTitleAttr}" data-song-id="${song.id}">
              <i class="fas fa-copy"></i>
            </button>
            <a class="song-edit-btn icon-btn edit-song-btn" href="editor/editor.html?songId=${song.id}" title="Edit" aria-label="Edit ${safeTitleAttr}">
              <i class="fas fa-pen"></i>
            </a>
            <button class="song-delete-btn icon-btn delete-song-btn" title="Delete" aria-label="Delete ${safeTitleAttr}" data-song-id="${song.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;

        // Safely render tags
        const tagsContainer = item.querySelector('.song-tags');
        if (tagsContainer && song.tags?.length > 0) {
          const frag = document.createDocumentFragment();
          song.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'song-tag';
            span.innerHTML = this.highlightMatch(escapeHtml(tag), searchQuery);
            frag.appendChild(span);
            const comma = document.createTextNode(', ');
            frag.appendChild(comma);
          });
          if (frag.lastChild) frag.removeChild(frag.lastChild);
          tagsContainer.appendChild(frag);
        }

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
            ClipboardManager.showToast('Song deleted', 'info');
          }
        });

        // Explicitly handle edit link navigation to avoid any
        // interference from other click handlers or mobile quirks
        const editLink = item.querySelector('.song-edit-btn');
        if (editLink) {
          editLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            try { sessionStorage.setItem('lastSongId', String(song.id)); } catch {}
            window.location.href = `editor/editor.html?songId=${song.id}`;
          });
        }

        item.querySelectorAll('.song-tag').forEach(tagEl => {
          tagEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const tag = tagEl.textContent;
            const input = document.getElementById('song-search-input');
            if (input) input.value = tag;
            this.renderSongs(tag);
          });
        });

        item.addEventListener('click', (e) => {
          if (!e.target.closest('.song-actions')) {
            try { sessionStorage.setItem('lastSongId', String(song.id)); } catch {}
            window.location.href = `editor/editor.html?songId=${song.id}`;
          }
      });

      this.songList.appendChild(item);
    }
  },

    initDragSort() {
      if (!this.songList || typeof Sortable === 'undefined') return;
      Sortable.create(this.songList, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'drag-ghost',
        onEnd: () => {
          const order = Array.from(this.songList.children).map(child => child.dataset.id);
          const map = new Map(this.songs.map(s => [s.id, s]));
          this.songs = order.map(id => map.get(id)).filter(Boolean);
          this.saveSongs();
        }
      });
    },

    async quickCopySong(song) {
      const title = String(song.title || 'Untitled').trim();
      const stripDuplicateTitle = (t, text) => {
        const ttl = String(t || '').trim().replace(/\s+/g, ' ');
        const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
        let i = 0;
        while (i < lines.length && lines[i].trim() === '') i++;
        if (i < lines.length) {
          const first = lines[i].trim().replace(/\s+/g, ' ');
          if (first.toLowerCase() === ttl.toLowerCase()) {
            lines.splice(i, 1);
            if (i < lines.length && lines[i].trim() === '') lines.splice(i, 1);
          }
        }
        return lines.join('\n');
      };

      const normalizedLyrics = String(song.lyrics || '').replace(/\r\n?/g, '\n');
      let body = stripDuplicateTitle(title, normalizedLyrics);
      if (song.chords && String(song.chords).trim()) {
        const chords = String(song.chords || '').replace(/\r\n?/g, '\n');
        body = ClipboardManager.formatLyricsWithChords(body, chords);
      }
      const textToCopy = `${title}\n\n${body}`;
      await ClipboardManager.copyToClipboard(textToCopy);
    },

    renderToolbar() {
      const toolbar = document.getElementById('tab-toolbar');
      toolbar.innerHTML = `
        <div class="search-with-voice">
          <input type="text" id="song-search-input" class="search-input" placeholder="Search by title, tag, or key...">
          <button id="voice-search-btn" class="btn icon-btn" title="Voice Search" aria-label="Voice search"><i class="fas fa-microphone"></i></button>
        </div>
        <div class="toolbar-buttons-group">
          <select id="song-sort-select" class="sort-select">
            <option value="titleAsc">Title A–Z</option>
            <option value="titleDesc">Title Z–A</option>
            <option value="recent">Recently Edited</option>
          </select>
          <button id="add-song-btn" class="btn icon-btn" title="Add Song"><i class="fas fa-plus"></i></button>
          <button id="export-library-btn" class="btn icon-btn" title="Export Library"><i class="fas fa-download"></i></button>
          <button id="normalize-library-btn" class="btn icon-btn" title="Normalize Library"><i class="fas fa-broom"></i></button>
          <button id="import-clipboard-btn" class="btn icon-btn" title="Paste Song"><i class="fas fa-paste"></i></button>
          <button id="delete-all-songs-btn" class="btn icon-btn danger" title="Delete All Songs"><i class="fas fa-trash"></i></button>
          <label for="song-upload-input" class="btn icon-btn" title="Upload Files"><i class="fas fa-upload"></i></label>
        </div>
        <input type="file" id="song-upload-input" multiple accept=".txt,.docx,.json" class="hidden-file">
      `;

      document.getElementById('song-sort-select').value = this.sortOrder;
      document.getElementById('song-sort-select')?.addEventListener('change', (e) => {
        this.sortOrder = e.target.value;
        localStorage.setItem('songSortOrder', this.sortOrder);
        const query = document.getElementById('song-search-input')?.value || '';
        this.renderSongs(query);
        const labels = { titleAsc: 'Title A–Z', titleDesc: 'Title Z–A', recent: 'Recently Edited' };
        ClipboardManager.showToast(`Sort: ${labels[this.sortOrder] || this.sortOrder}`, 'info');
      });

      document.getElementById('add-song-btn')?.addEventListener('click', () => this.createNewSong());
      document.getElementById('export-library-btn')?.addEventListener('click', () => this.openExportModal?.());
      document.getElementById('normalize-library-btn')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.classList.add('loading');
        try { await Promise.resolve(this.normalizeLibrary()); }
        finally { btn.classList.remove('loading'); }
      });
      document.getElementById('import-clipboard-btn')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.classList.add('loading');
        try {
          const text = await navigator.clipboard.readText();
          if (text.trim()) {
            const title = prompt("Title for pasted song?", "New Song");
            if (title) {
              const { lyrics, chords } = splitLyricsAndChordsFromText(text);
              const newSong = this.createSong(title, lyrics, chords);
              this.songs.push(newSong);
              this.saveSongs();
              this.renderSongs();
              ClipboardManager.showToast('Song pasted from clipboard', 'success');
            }
          } else {
            ClipboardManager.showToast('Clipboard is empty', 'info');
          }
        } catch (err) {
          console.error('Clipboard read failed', err);
          ClipboardManager.showToast('Clipboard not accessible', 'error');
        } finally {
          btn.classList.remove('loading');
        }
      });
      document.getElementById('delete-all-songs-btn')?.addEventListener('click', () => this.confirmDeleteAll());
      document.getElementById('song-search-input')?.addEventListener('input', (e) => {
        const query = e.target.value;
        this.renderSongs(query);
      });

      // Voice search setup
      const voiceBtn = document.getElementById('voice-search-btn');
      const inputEl = document.getElementById('song-search-input');
      voiceBtn?.addEventListener('click', () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { ClipboardManager.showToast('Voice input not supported on this browser', 'error'); return; }
        try {
          const rec = new SR();
          rec.lang = (navigator.language || 'en-US');
          rec.interimResults = true;
          rec.continuous = false;
          voiceBtn.classList.add('mic-listening');
          ClipboardManager.showToast('Listening… Speak your search', 'info', 1500);
          let finalText = inputEl?.value || '';
          rec.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const tr = event.results[i][0].transcript;
              if (event.results[i].isFinal) { finalText = (finalText ? finalText + ' ' : '') + tr; }
              else { interim += tr; }
            }
            if (inputEl) {
              inputEl.value = (finalText + ' ' + interim).trim();
              this.renderSongs(inputEl.value);
            }
          };
          rec.onerror = (e) => { ClipboardManager.showToast(`Voice error: ${e.error || e.message}`, 'error'); };
          rec.onend = () => { voiceBtn.classList.remove('mic-listening'); };
          rec.start();
        } catch (err) {
          voiceBtn.classList.remove('mic-listening');
          ClipboardManager.showToast('Could not start voice input', 'error');
        }
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

        const processFile = (file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
              let content = e.target.result;

              if (file.name.endsWith('.docx')) {
                try {
                  const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
                  content = result.value;
                } catch (err) {
                  console.error('Error processing DOCX:', err);
                  return resolve(null);
                }
              }

              // Extract title from filename (without extension)
              const title = this.normalizeTitle(file.name);
              const parsed = splitLyricsAndChordsFromText(String(content || '').trim());

              if (title && (parsed.lyrics?.trim()?.length || parsed.chords?.trim()?.length)) {
                resolve(this.createSong(title, parsed.lyrics, parsed.chords));
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

        // Show loading indicator on the upload button label + global busy
        const uploadLabel = document.querySelector('label[for="song-upload-input"]');
        uploadLabel?.classList.add('loading');
        ClipboardManager.showToast(`Processing ${files.length} file(s)...`, 'info');
        showGlobalBusy('Importing files…');

        const songs = await Promise.all(files.map(processFile));
        const validSongs = songs.filter(Boolean);
        this.songs.push(...validSongs);
        const importCount = validSongs.length;

        this.saveSongs();
        this.renderSongs();
        ClipboardManager.showToast(`Imported ${importCount} song(s)`, 'success');
        e.target.value = ""; // Clear input
        uploadLabel?.classList.remove('loading');
        hideGlobalBusy();
      });
    },

    createNewSong() {
      const newSong = this.createSong('New Song', '');
      this.songs.push(newSong);
      this.saveSongs();
      // Redirect to editor for the new song
      try { sessionStorage.setItem('lastSongId', String(newSong.id)); } catch {}
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

    // Export library as plain text (.txt): Title, blank line, lyrics (with [Section] labels).
    // Optionally include chords above lyrics lines. Removes duplicate title if it appears
    // as the first non-empty line of the lyrics.
    async exportLibraryTxt(includeChords = false) {
      try {
        const parts = [];
        const sep = '--------------------';
        const stripDuplicateTitle = (title, text) => {
          const t = String(title || '').trim().replace(/\s+/g, ' ');
          const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
          let i = 0;
          while (i < lines.length && lines[i].trim() === '') i++;
          if (i < lines.length) {
            const first = lines[i].trim().replace(/\s+/g, ' ');
            if (first.toLowerCase() === t.toLowerCase()) {
              lines.splice(i, 1);
              // If next line is blank, collapse single leading blank
              if (i < lines.length && lines[i].trim() === '') lines.splice(i, 1);
            }
          }
          return lines.join('\n');
        };
        for (const song of this.songs) {
          const title = String(song.title || 'Untitled').trim();
          const normalizedLyrics = this.normalizeSectionLabels(String(song.lyrics || ''))
            .replace(/\r\n?/g, '\n');
          let body = stripDuplicateTitle(title, normalizedLyrics);
          if (includeChords && song.chords && String(song.chords).trim()) {
            const chords = String(song.chords || '').replace(/\r\n?/g, '\n');
            // Merge chords with the lyrics AFTER stripping duplicate title
            body = ClipboardManager.formatLyricsWithChords(body, chords);
          }
          parts.push(title);
          parts.push(''); // blank line between title and body
          if (body) parts.push(body);
          parts.push(sep);
          parts.push(''); // extra blank line between songs
        }
        // Join with newlines; keep a trailing newline for readability
        let content = parts.join('\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `lyricsmith-library-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        ClipboardManager.showToast(`Exported ${this.songs.length} songs to TXT`, 'success');
      } catch (err) {
        console.error('TXT export failed:', err);
        ClipboardManager.showToast('TXT export failed', 'error');
      }
    },

    async importLibrary(file) {
      try {
        showGlobalBusy('Importing library…');
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
          song.id = Date.now().toString() + Math.random().toString(36).slice(2, 11);
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
      } finally {
        hideGlobalBusy();
      }
    },

    normalizeLibrary() {
      try {
        let idFixes = 0;
        let normalized = 0;
        // Ensure unique IDs
        const beforeIds = new Set(this.songs.map(s => String(s.id || '')));
        if (this.ensureUniqueIds()) {
          const afterIds = new Set(this.songs.map(s => String(s.id)));
          idFixes = Math.max(0, beforeIds.size - afterIds.size);
        }

        // Normalize song fields using migrateSongFormat
        this.songs = this.songs.map((song) => {
          const migrated = this.migrateSongFormat(song);
          // Keep original timestamps if present
          migrated.createdAt = song.createdAt || migrated.createdAt;
          migrated.lastEditedAt = song.lastEditedAt || migrated.lastEditedAt;
          if (JSON.stringify(song) != JSON.stringify(migrated)) normalized++;
          return migrated;
        });

        this.saveSongs();
        const msg = `Library normalized${idFixes ? `, fixed IDs: ${idFixes}` : ''}${normalized ? `, updated: ${normalized}` : ''}`;
        ClipboardManager.showToast(msg, 'success');
        const query = document.getElementById('song-search-input')?.value || '';
        this.renderSongs(query);
      } catch (e) {
        console.error('Normalize failed', e);
        ClipboardManager.showToast('Normalize failed', 'error');
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
          this.openExportModal?.();
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
    ,

    setupExportModal() {
      const overlay = document.getElementById('export-modal-overlay');
      if (!overlay) return;
      // Close with top-right X
      overlay.querySelector('.modal-close-x')?.addEventListener('click', () => { overlay.hidden = true; });
      const formatRadios = Array.from(document.querySelectorAll('input[name="export-format"]'));
      const jsonOptions = document.getElementById('json-options');
      const txtOptions = document.getElementById('txt-options');
      const cancelBtn = document.getElementById('export-cancel-btn');
      const confirmBtn = document.getElementById('export-confirm-btn');

      const updateOptions = () => {
        const fmt = (formatRadios.find(r => r.checked)?.value) || 'json';
        if (fmt === 'txt') {
          if (jsonOptions) jsonOptions.style.display = 'none';
          if (txtOptions) txtOptions.style.display = '';
        } else {
          if (jsonOptions) jsonOptions.style.display = '';
          if (txtOptions) txtOptions.style.display = 'none';
        }
      };

      formatRadios.forEach(r => r.addEventListener('change', updateOptions));
      cancelBtn?.addEventListener('click', () => { overlay.hidden = true; });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.hidden = true; });

      confirmBtn?.addEventListener('click', async () => {
        confirmBtn.classList.add('loading');
        try {
          const fmt = (formatRadios.find(r => r.checked)?.value) || 'json';
          if (fmt === 'txt') {
            const includeChords = !!document.getElementById('export-include-chords')?.checked;
            await this.exportLibraryTxt(includeChords);
          } else {
            const includeMetadata = !!document.getElementById('export-include-metadata')?.checked;
            await this.exportLibrary(includeMetadata);
          }
          overlay.hidden = true;
        } finally {
          confirmBtn.classList.remove('loading');
        }
      });

      this.openExportModal = () => {
        try {
          const jsonRadio = document.querySelector('input[name="export-format"][value="json"]');
          if (jsonRadio) jsonRadio.checked = true;
          const incMeta = document.getElementById('export-include-metadata');
          if (incMeta) incMeta.checked = true;
          const incChords = document.getElementById('export-include-chords');
          if (incChords) incChords.checked = false;
          updateOptions();
        } catch {}
        overlay.hidden = false;
      };
    }
  };

  app.init();
  attachHookMillButton();
  window.app = app;

  // Extend app with Hook Mill sync routine
  app.syncHookMill = async function(starredOnly = true) {
    try {
      ClipboardManager.showToast(starredOnly ? 'Syncing starred Hook Mill items…' : 'Syncing Hook Mill items…', 'info');
      showGlobalBusy('Syncing Hook Mill…');
      const items = await getHookMillItems();
      if (!items.length) {
        ClipboardManager.showToast('No Hook Mill items found', 'info');
        return;
      }

      const filtered = starredOnly ? items.filter(x => x && x.starred) : items;
      if (!filtered.length) {
        ClipboardManager.showToast(starredOnly ? 'No starred Hook Mill items' : 'No Hook Mill items', 'info');
        return;
      }

      // Build a quick index of existing hm hashes in notes for dedupe
      const existingHashes = new Set();
      try {
        for (const s of this.songs) {
          const note = (s.notes || '').toString();
          const m = note.match(/hm_hash:([a-f0-9]{32,64})/i);
          if (m) existingHashes.add(m[1].toLowerCase());
        }
      } catch {}

      let imported = 0;
      let skipped = 0;
      for (const it of filtered) {
        const output = (it && it.output) ? String(it.output) : '';
        if (!output.trim()) { skipped++; continue; }
        const hash = (it.hash || '').toString().toLowerCase();
        if (hash && existingHashes.has(hash)) { skipped++; continue; }

        // Title = first non-empty line, trimmed
        const firstLine = output.split(/\r?\n/).find(l => l.trim()) || 'Hook';
        const title = firstLine.slice(0, 120);

        const newSong = this.createSong(title, output, '');
        // Tag and note metadata
        const tags = new Set([...(newSong.tags || []), 'hook-mill']);
        if (Array.isArray(it.tags)) it.tags.forEach(t => t && tags.add(String(t)));
        newSong.tags = Array.from(tags);
        const created = it.createdAt ? new Date(it.createdAt).toISOString() : new Date().toISOString();
        const metaBits = [
          `Imported from Hook Mill on ${new Date().toLocaleString()}`,
          it.model ? `model: ${it.model}` : '',
          it.preset ? `preset: ${it.preset}` : '',
          it.lens ? `lens: ${it.lens}` : '',
          hash ? `hm_hash:${hash}` : ''
        ].filter(Boolean);
        newSong.notes = metaBits.join(' \n ');
        newSong.createdAt = created;
        newSong.lastEditedAt = new Date().toISOString();

        this.songs.push(newSong);
        if (hash) existingHashes.add(hash);
        imported++;
      }

      if (imported > 0) {
        this.saveSongs();
        const query = document.getElementById('song-search-input')?.value || '';
        this.renderSongs(query);
      }

      const msg = `Hook Mill sync: imported ${imported}${skipped ? `, skipped ${skipped}` : ''}`;
      ClipboardManager.showToast(msg, imported ? 'success' : 'info');
    } catch (err) {
      console.error('Hook Mill sync failed', err);
      ClipboardManager.showToast('Hook Mill sync failed', 'error');
    } finally {
      hideGlobalBusy();
    }
  };
});
