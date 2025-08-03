document.addEventListener('DOMContentLoaded', () => {
    // Clipboard Manager Class
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
            // Remove existing toasts
            document.querySelectorAll('.toast').forEach(toast => toast.remove());
            
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            // Trigger animation
            setTimeout(() => toast.classList.add('show'), 10);
            
            // Remove after 3 seconds
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

        static formatSongForExport(song, includeMetadata = true) {
            let output = '';
            
            if (includeMetadata) {
                output += `# ${song.title}\n\n`;
                if (song.key) output += `**Key:** ${song.key}\n`;
                if (song.tempo) output += `**Tempo:** ${song.tempo} BPM\n`;
                if (song.timeSignature) output += `**Time Signature:** ${song.timeSignature}\n`;
                if (song.tags && song.tags.length > 0) output += `**Tags:** ${song.tags.join(', ')}\n`;
                output += '\n---\n\n';
            }
            
            // Add lyrics with chords
            if (song.chords && song.chords.trim()) {
                output += this.formatLyricsWithChords(song.lyrics, song.chords);
            } else {
                output += song.lyrics;
            }
            
            if (song.notes && song.notes.trim()) {
                output += '\n\n---\n**Notes:**\n' + song.notes;
            }
            
            return output;
        }
    }

    const app = {
        // DOM Elements (keeping existing ones and adding new)
        editorMode: document.getElementById('editor-mode'),
        lyricsEditorContainer: document.getElementById('lyrics-editor-container'),
        lyricsDisplay: document.getElementById('lyrics-display'),
        syllableGutter: document.getElementById('syllable-gutter'),
        decreaseFontBtn: document.getElementById('decrease-font-btn'),
        increaseFontBtn: document.getElementById('increase-font-btn'),
        fontSizeDisplay: document.getElementById('font-size-display'),
        toggleThemeBtn: document.getElementById('theme-toggle-btn'),
        exitEditorBtn: document.getElementById('exit-editor-btn'),
        scrollToTopBtn: document.getElementById('scroll-to-top-btn'),
        toggleChordsBtn: document.getElementById('toggle-chords-btn'),
        toggleReadOnlyBtn: document.getElementById('toggle-read-only-btn'),
        copyLyricsBtn: document.getElementById('copy-lyrics-btn'),
        measureModeToggle: document.getElementById('measure-mode-toggle'),
        tempoInput: document.getElementById('tempo-input'),
        rhymeModeToggle: document.getElementById('rhyme-mode-toggle'),

        // State (keeping existing and adding new)
        songs: [],
        editorSongs: [],
        currentEditorSongIndex: -1,
        fontSize: 32,
        minFontSize: 12,
        maxFontSize: 72,
        fontSizeStep: 1,
        perSongFontSizes: JSON.parse(localStorage.getItem('perSongFontSizes') || '{}'),
        isReadOnly: false,
        isChordsVisible: true,
        isMeasureMode: false,
        isRhymeMode: false,
        currentSong: null,
        resizeObserver: null,
        copyDropdown: null,
        hasUnsavedChanges: false, // Track unsaved changes

        syllableCount(word) {
            word = word.toLowerCase();
            if (word.length <= 3) { return 1; }
            word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
            word = word.replace(/^y/, '');
            return word.match(/[aeiouy]{1,2}/g)?.length || 0;
        },

        init() {
            this.loadData();
            this.setupEventListeners();
            this.loadEditorState();
            this.createCopyDropdown();
            this.displayCurrentEditorSong();
            this.setupResizeObserver();
            this.isChordsVisible = window.CONFIG.chordsModeEnabled;
            this.updateChordsVisibility();
        },

        loadData() {
            this.songs = JSON.parse(localStorage.getItem('songs')) || [];
            const theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.dataset.theme = theme;
        },

        // Enhanced song creation with metadata
        createSong(title, lyrics = '', chords = '') {
            return {
                id: Date.now().toString(),
                title,
                lyrics,
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

        setupEventListeners() {
            // Existing event listeners
            this.decreaseFontBtn?.addEventListener('click', () => this.adjustFontSize(-this.fontSizeStep));
            this.increaseFontBtn?.addEventListener('click', () => this.adjustFontSize(this.fontSizeStep));
            this.toggleThemeBtn?.addEventListener('click', () => this.toggleTheme());
            this.exitEditorBtn?.addEventListener('click', () => this.exitEditorMode());
            this.lyricsDisplay?.addEventListener('input', () => this.handleLyricsInput());
            this.lyricsDisplay?.addEventListener('click', (e) => this.handleLyricsClick(e));
            this.lyricsDisplay?.addEventListener('keydown', (e) => this.handleLyricsKeydown(e));
            this.scrollToTopBtn?.addEventListener('click', () => this.scrollToTop());
            // Handle dropdown items
            document.getElementById('toggle-chords-btn')?.addEventListener('click', () => {
                this.toggleChords();
                document.querySelector('.editor-dropdown-menu').classList.remove('visible');
            });
            document.getElementById('toggle-read-only-btn')?.addEventListener('click', () => {
                this.toggleReadOnly();
                document.querySelector('.editor-dropdown-menu').classList.remove('visible');
            });
            document.getElementById('save-song-btn')?.addEventListener('click', () => {
                this.saveCurrentSong(true);
                document.querySelector('.editor-dropdown-menu').classList.remove('visible');
            });
            
            // Enhanced copy functionality
            this.copyLyricsBtn?.addEventListener('click', () => this.toggleCopyDropdown());
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (this.copyDropdown && !this.copyLyricsBtn.contains(e.target) && !this.copyDropdown.contains(e.target)) {
                    this.copyDropdown.classList.remove('visible');
                }
            });

            this.measureModeToggle?.addEventListener('change', (e) => {
                this.isMeasureMode = e.target.checked;
                this.renderLyrics();
            });

            this.tempoInput?.addEventListener('input', () => {
                this.updateSongMetadata();
                this.renderLyrics();
            });

            this.rhymeModeToggle?.addEventListener('change', (e) => {
                this.isRhymeMode = e.target.checked;
                this.renderLyrics();
            });

            // Add save shortcut (Ctrl+S or Cmd+S)
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    this.saveCurrentSong(true); // explicit save
                }
            });
        },

        createCopyDropdown() {
            if (this.copyLyricsBtn) {
                const dropdown = document.createElement('div');
                dropdown.className = 'copy-dropdown-menu';
                dropdown.innerHTML = `
                    <button class="copy-option" data-copy-type="raw">
                        <i class="fas fa-align-left"></i>
                        Raw Lyrics
                    </button>
                    <button class="copy-option" data-copy-type="chords">
                        <i class="fas fa-guitar"></i>
                        Lyrics + Chords
                    </button>
                    <button class="copy-option" data-copy-type="formatted">
                        <i class="fas fa-file-text"></i>
                        Full Song (Markdown)
                    </button>
                    <button class="copy-option" data-copy-type="metadata">
                        <i class="fas fa-info-circle"></i>
                        Metadata Only
                    </button>
                `;
                
                // Position dropdown relative to copy button
                dropdown.addEventListener('click', (e) => this.handleCopySelection(e));
                this.copyLyricsBtn.parentNode.appendChild(dropdown);
                this.copyDropdown = dropdown;
            }
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
                this.currentEditorSongIndex = 0;
            }
        },

        updateSongMetadata() {
            if (!this.currentSong) return;
            
            // Update tempo from the input
            const tempoValue = parseInt(this.tempoInput?.value) || 120;
            if (this.currentSong.tempo !== tempoValue) {
                this.currentSong.tempo = tempoValue;
                this.hasUnsavedChanges = true;
            }
        },

        saveCurrentSong(isExplicit = false) {
            if (!this.currentSong || (!window.CONFIG.autosaveEnabled && !isExplicit)) return;

            const lines = Array.from(this.lyricsDisplay.querySelectorAll('.lyrics-line'));
            const chordLines = Array.from(this.lyricsDisplay.querySelectorAll('.chord-line'));

            const lyrics = lines.map(line => line.textContent).join('\n');
            const chords = chordLines.map(line => line.textContent).join('\n');

            this.currentSong.lyrics = lyrics;
            this.currentSong.chords = chords;
            this.currentSong.lastEditedAt = new Date().toISOString();

            const songIndex = this.songs.findIndex(s => s.id === this.currentSong.id);
            if (songIndex !== -1) {
                this.songs[songIndex] = this.currentSong;
                localStorage.setItem('songs', JSON.stringify(this.songs));
                this.hasUnsavedChanges = false;
                
                if (isExplicit) {
                    ClipboardManager.showToast('Song saved!', 'success');
                }
            }
        },

        displayCurrentEditorSong() {
            if (this.currentEditorSongIndex === -1) return;
            this.currentSong = this.editorSongs[this.currentEditorSongIndex];
            
            // Ensure song has all metadata fields
            if (!this.currentSong.key) this.currentSong.key = '';
            if (!this.currentSong.tempo) this.currentSong.tempo = 120;
            if (!this.currentSong.timeSignature) this.currentSong.timeSignature = '4/4';
            if (!this.currentSong.notes) this.currentSong.notes = '';
            if (!this.currentSong.tags) this.currentSong.tags = [];
            if (!this.currentSong.createdAt) this.currentSong.createdAt = new Date().toISOString();
            if (!this.currentSong.lastEditedAt) this.currentSong.lastEditedAt = new Date().toISOString();

            this.fontSize = this.perSongFontSizes[this.currentSong.id] || 32;

            document.getElementById('song-title-card').textContent = this.currentSong.title;
            this.fontSizeDisplay.textContent = `${this.fontSize}px`;
            
            // Update tempo input
            if (this.tempoInput) {
                this.tempoInput.value = this.currentSong.tempo;
            }
            
            this.renderLyrics();
        },

        renderLyrics() {
            if (!this.currentSong) return;

            let lyrics = this.currentSong.lyrics || '';
            let chords = this.currentSong.chords || '';

            const lyricLines = lyrics.split('\n');
            const chordLines = chords.split('\n');

            this.lyricsDisplay.innerHTML = '';
            this.syllableGutter.innerHTML = '';

            const rhymeGroups = this.isRhymeMode ? this.findRhymes(lyricLines) : {};

            for (let i = 0; i < lyricLines.length; i++) {
                const lyricLine = lyricLines[i];
                const chordLine = chordLines[i] || '';

                if (this.isMeasureMode) {
                    const words = lyricLine.split(/\s+/).filter(w => w.length > 0);
                    let currentMeasure = '';
                    let currentSyllableCount = 0;
                    let tempo = parseInt(this.tempoInput?.value) || 120;
                    const beatsPerMeasure = 4;
                    const syllablesPerBeat = 2;
                    const maxSyllablesPerMeasure = beatsPerMeasure * syllablesPerBeat;

                    let measures = [];
                    for(let word of words) {
                        const wordSyllables = this.syllableCount(word);
                        if (currentSyllableCount + wordSyllables > maxSyllablesPerMeasure) {
                            measures.push(currentMeasure.trim());
                            currentMeasure = '';
                            currentSyllableCount = 0;
                        }
                        currentMeasure += word + ' ';
                        currentSyllableCount += wordSyllables;
                    }
                    if (currentMeasure) measures.push(currentMeasure.trim());

                    for (const measure of measures) {
                        const measureSyllables = measure.split(/\s+/).filter(w => w.length > 0).reduce((sum, word) => sum + this.syllableCount(word), 0);
                        this.addLyricLine(chordLine, measure, rhymeGroups[i], measureSyllables);
                    }
                } else {
                    const lineSyllables = lyricLine.split(/\s+/).filter(w => w.length > 0).reduce((sum, word) => sum + this.syllableCount(word), 0);
                    this.addLyricLine(chordLine, lyricLine, rhymeGroups[i], lineSyllables);
                }
            }
            this.lyricsDisplay.style.fontSize = `${this.fontSize}px`;
            this.updateReadOnlyState();
            this.updateChordsVisibility();
        },

        addLyricLine(chords, lyrics, rhymeClass, syllableCount) {
            const lineGroup = document.createElement('div');
            lineGroup.className = 'lyrics-line-group';

            const chordElement = document.createElement('div');
            chordElement.className = 'chord-line';
            chordElement.textContent = chords;
            chordElement.setAttribute('contenteditable', 'true');
            chordElement.addEventListener('input', () => {
                this.hasUnsavedChanges = true;
                this.saveCurrentSong();
            });
            lineGroup.appendChild(chordElement);

            const lyricElement = document.createElement('div');
            lyricElement.className = 'lyrics-line';
            lyricElement.textContent = lyrics;
            lyricElement.setAttribute('contenteditable', 'true');
            lyricElement.addEventListener('input', () => {
                this.hasUnsavedChanges = true;
                this.saveCurrentSong();
                this.updateSyllableCount();
                this.updateRhymes();
            });

            if (rhymeClass) {
                lyricElement.classList.add(rhymeClass);
            }
            lineGroup.appendChild(lyricElement);

            this.lyricsDisplay.appendChild(lineGroup);

            const gutterLine = document.createElement('div');
            gutterLine.textContent = syllableCount;
            this.syllableGutter.appendChild(gutterLine);
        },

        updateSyllableCount() {
            const lyricElements = this.lyricsDisplay.querySelectorAll('.lyrics-line');
            this.syllableGutter.innerHTML = '';
            lyricElements.forEach(line => {
                const text = line.textContent;
                const words = text.split(/\s+/).filter(w => w.length > 0);
                const count = words.reduce((sum, word) => sum + this.syllableCount(word), 0);
                const gutterLine = document.createElement('div');
                gutterLine.textContent = count;
                this.syllableGutter.appendChild(gutterLine);
            });
        },

        updateRhymes() {
            const lyricElements = this.lyricsDisplay.querySelectorAll('.lyrics-line');
            const lines = Array.from(lyricElements).map(el => el.textContent);
            const rhymeGroups = this.isRhymeMode ? this.findRhymes(lines) : {};
            lyricElements.forEach((el, i) => {
                el.className = 'lyrics-line';
                if (rhymeGroups[i]) {
                    el.classList.add(rhymeGroups[i]);
                }
            });
        },

        findRhymes(lines) {
            const rhymeWords = lines.map(line => {
                const words = line.trim().split(/\s+/);
                return words[words.length - 1] || '';
            });

            const rhymeGroups = {};
            let rhymeColorIndex = 0;
            const rhymeColors = {};

            const getRhymeKey = (word) => {
                const vowels = 'aeiou';
                let lastVowelIndex = -1;
                for (let i = word.length - 1; i >= 0; i--) {
                    if (vowels.includes(word[i])) {
                        lastVowelIndex = i;
                        break;
                    }
                }
                return lastVowelIndex !== -1 ? word.substring(lastVowelIndex) : word;
            };

            for (let i = 0; i < rhymeWords.length; i++) {
                const word = rhymeWords[i].toLowerCase().replace(/[^a-z]/g, '');
                if (word.length < 2) continue;

                const rhymeKey = getRhymeKey(word);
                if (rhymeKey.length < 2) continue;

                for (let j = i + 1; j < rhymeWords.length; j++) {
                    const nextWord = rhymeWords[j].toLowerCase().replace(/[^a-z]/g, '');
                    const nextRhymeKey = getRhymeKey(nextWord);

                    if (rhymeKey === nextRhymeKey) {
                        if (!rhymeColors[rhymeKey]) {
                            rhymeColorIndex++;
                            rhymeColors[rhymeKey] = `rhyme-match-${rhymeColorIndex}`;
                        }
                        rhymeGroups[i] = rhymeColors[rhymeKey];
                        rhymeGroups[j] = rhymeColors[rhymeKey];
                    }
                }
            }
            return rhymeGroups;
        },

        handleLyricsInput() {
            this.hasUnsavedChanges = true;
            this.saveCurrentSong();
            this.renderLyrics();
        },

        handleLyricsClick(e) {
            if (e.target.classList.contains('lyrics-line') || e.target.classList.contains('chord-line')) {
                // Keep the cursor where it is
            }
        },

        handleLyricsKeydown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.execCommand('insertHTML', false, '<div><br></div>');
                this.renderLyrics();
            }
        },

        adjustFontSize(step) {
            this.fontSize = Math.max(this.minFontSize, Math.min(this.maxFontSize, this.fontSize + step));
            this.perSongFontSizes[this.currentSong.id] = this.fontSize;
            localStorage.setItem('perSongFontSizes', JSON.stringify(this.perSongFontSizes));
            this.lyricsDisplay.style.fontSize = `${this.fontSize}px`;
            this.fontSizeDisplay.textContent = `${this.fontSize}px`;
        },

        navigateSong(direction) {
            this.saveCurrentSong();
            this.currentEditorSongIndex += direction;
            if (this.currentEditorSongIndex < 0) {
                this.currentEditorSongIndex = this.editorSongs.length - 1;
            } else if (this.currentEditorSongIndex >= this.editorSongs.length) {
                this.currentEditorSongIndex = 0;
            }
            this.displayCurrentEditorSong();
        },

        toggleTheme() {
            const currentTheme = document.documentElement.dataset.theme;
            const newTheme = currentTheme.includes('dark') ? 'light' : 'dark';
            document.documentElement.dataset.theme = newTheme;
            localStorage.setItem('theme', newTheme);
        },

        exitEditorMode() {
            if (this.hasUnsavedChanges) {
                if (confirm('You have unsaved changes. Are you sure you want to exit?')) {
                    this.saveCurrentSong(true);
                } else {
                    return;
                }
            }
            if (this.resizeObserver) this.resizeObserver.disconnect();
            window.location.href = '../index.html';
        },

        scrollToTop() {
            this.lyricsEditorContainer.scrollTo({ top: 0, behavior: 'smooth' });
        },

        toggleChords() {
            this.isChordsVisible = !this.isChordsVisible;
            this.updateChordsVisibility();
        },

        updateChordsVisibility() {
            const chordLines = this.lyricsDisplay.querySelectorAll('.chord-line');
            chordLines.forEach(line => {
                line.classList.toggle('hidden', !this.isChordsVisible);
            });
            const icon = this.toggleChordsBtn?.querySelector('i');
            if (icon) {
                if (this.isChordsVisible) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-guitar');
                } else {
                    icon.classList.remove('fa-guitar');
                    icon.classList.add('fa-eye-slash');
                }
            }
        },

        toggleReadOnly() {
            this.isReadOnly = !this.isReadOnly;
            this.updateReadOnlyState();
            const icon = this.toggleReadOnlyBtn?.querySelector('i');
            if (icon) {
                if (this.isReadOnly) {
                    icon.classList.remove('fa-lock-open');
                    icon.classList.add('fa-lock');
                } else {
                    icon.classList.remove('fa-lock');
                    icon.classList.add('fa-lock-open');
                }
            }
        },

        updateReadOnlyState() {
            const lines = this.lyricsDisplay.querySelectorAll('.lyrics-line-group > div');
            lines.forEach(line => {
                line.setAttribute('contenteditable', !this.isReadOnly);
            });
            this.lyricsEditorContainer?.classList.toggle('read-only', this.isReadOnly);
            this.lyricsDisplay?.setAttribute('contenteditable', !this.isReadOnly);
        },

        toggleCopyDropdown() {
            if (this.copyDropdown) {
                this.copyDropdown.classList.toggle('visible');
            }
        },

        async handleCopySelection(e) {
            if (!e.target.dataset.copyType) return;
            
            const copyType = e.target.dataset.copyType;
            let textToCopy = '';
            
            switch (copyType) {
                case 'raw':
                    textToCopy = this.currentSong.lyrics || '';
                    break;
                case 'chords':
                    textToCopy = ClipboardManager.formatLyricsWithChords(this.currentSong.lyrics, this.currentSong.chords);
                    break;
                case 'formatted':
                    textToCopy = ClipboardManager.formatSongForExport(this.currentSong, true);
                    break;
                case 'metadata':
                    textToCopy = `${this.currentSong.title}\nKey: ${this.currentSong.key || 'N/A'}\nTempo: ${this.currentSong.tempo} BPM\nTime: ${this.currentSong.timeSignature}\nTags: ${this.currentSong.tags?.join(', ') || 'None'}`;
                    break;
                default:
                    textToCopy = this.currentSong.lyrics || '';
            }
            
            await ClipboardManager.copyToClipboard(textToCopy);
            this.copyDropdown.classList.remove('visible');
        }
    };

    app.init();
});
