document.addEventListener('DOMContentLoaded', () => {
    const app = {
        // DOM Elements
        // DOM Elements - safely initialized
        editorMode: document.getElementById('editor-mode') || { innerHTML: '' },
        editorSongInfo: document.getElementById('editor-song-info') || { 
            innerHTML: '',
            querySelector: () => null,
            appendChild: () => null
        },
        lyricsEditorContainer: document.getElementById('lyrics-editor-container') || { 
            scrollTo: () => null 
        },
        lyricsDisplay: document.getElementById('lyrics-display') || { 
            innerHTML: '',
            style: {},
            querySelectorAll: () => [],
            addEventListener: () => null,
            setAttribute: () => null
        },
        syllableGutter: document.getElementById('syllable-gutter') || { 
            innerHTML: '' 
        },
        decreaseFontBtn: document.getElementById('decrease-font-btn'),
        increaseFontBtn: document.getElementById('increase-font-btn'),
        fontSizeDisplay: document.getElementById('font-size-display'),
        toggleThemeBtn: document.getElementById('theme-toggle-btn'),
        exitEditorBtn: document.getElementById('exit-editor-btn'),
        prevSongBtn: document.getElementById('prev-song-btn'),
        nextSongBtn: document.getElementById('next-song-btn'),
        scrollToTopBtn: document.getElementById('scroll-to-top-btn'),
        autoScrollBtn: document.getElementById('auto-scroll-btn'),
        // New UI Elements
        toggleChordsBtn: document.getElementById('toggle-chords-btn'),
        toggleReadOnlyBtn: document.getElementById('toggle-read-only-btn'),
        copyLyricsBtn: document.getElementById('copy-lyrics-btn'),
        copyDropdown: document.querySelector('.copy-dropdown-menu'),
        measureModeToggle: document.getElementById('measure-mode-toggle'),
        tempoInput: document.getElementById('tempo-input'),
        rhymeModeToggle: document.getElementById('rhyme-mode-toggle'),

        // State
        songs: [],
        editorSongs: [],
        currentEditorSongIndex: -1,
        fontSize: 32,
        editHistory: [],
        historyIndex: -1,
        savePending: false,
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

        // Syllable counting helper
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
            this.displayCurrentEditorSong();
            this.setupResizeObserver();
            // Initial state - safe fallback if config not loaded
            const config = window.CONFIG || {};
            this.isChordsVisible = config.chordsModeEnabled !== false; // Default true if undefined
            this.updateChordsVisibility();
        },

        loadData() {
            this.songs = JSON.parse(localStorage.getItem('songs')) || [];
            const theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.dataset.theme = theme;
        },

        setupEventListeners() {
            this.setupUndoRedoShortcuts();
            
            // Undo/redo/save buttons
            document.getElementById('undo-btn')?.addEventListener('click', () => this.undo());
            document.getElementById('redo-btn')?.addEventListener('click', () => this.redo());
            document.getElementById('save-song-btn')?.addEventListener('click', () => this.saveCurrentSong(true));
            
            this.decreaseFontBtn?.addEventListener('click', () => this.adjustFontSize(-this.fontSizeStep));
            this.increaseFontBtn?.addEventListener('click', () => this.adjustFontSize(this.fontSizeStep));
            this.toggleThemeBtn?.addEventListener('click', () => this.toggleTheme());
            this.exitEditorBtn?.addEventListener('click', () => this.exitEditorMode());
            this.prevSongBtn?.addEventListener('click', () => this.navigateSong(-1));
            this.nextSongBtn?.addEventListener('click', () => this.navigateSong(1));
            this.lyricsDisplay?.addEventListener('input', () => this.handleLyricsInput());
            this.lyricsDisplay?.addEventListener('click', (e) => this.handleLyricsClick(e));
            this.lyricsDisplay?.addEventListener('keydown', (e) => this.handleLyricsKeydown(e));
            this.scrollToTopBtn?.addEventListener('click', () => this.scrollToTop());
            this.autoScrollBtn?.addEventListener('click', () => this.toggleAutoScroll());
            this.toggleChordsBtn?.addEventListener('click', () => this.toggleChords());
            this.toggleReadOnlyBtn?.addEventListener('click', () => this.toggleReadOnly());
            this.copyLyricsBtn?.addEventListener('click', () => this.toggleCopyDropdown());
            this.copyDropdown?.addEventListener('click', (e) => this.handleCopySelection(e));
            document.addEventListener('click', (e) => {
                if (!this.copyLyricsBtn.contains(e.target) && !this.copyDropdown.contains(e.target)) {
                    this.copyDropdown.classList.remove('visible');
                }
            });
            // Measure/rhyme toggles now use buttons
            document.getElementById('measure-mode-btn')?.addEventListener('click', () => {
                this.isMeasureMode = !this.isMeasureMode;
                const btn = document.getElementById('measure-mode-btn');
                btn.classList.toggle('active', this.isMeasureMode);
                this.renderLyrics();
            });
            this.tempoInput?.addEventListener('input', () => {
                this.renderLyrics();
            });
            document.getElementById('rhyme-mode-btn')?.addEventListener('click', () => {
                this.isRhymeMode = !this.isRhymeMode;
                const btn = document.getElementById('rhyme-mode-btn');
                btn.classList.toggle('active', this.isRhymeMode);
                this.renderLyrics();
            });
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

        saveCurrentSong(manualSave = false) {
            if (!this.currentSong) return;

            // Save title if title editor exists
            const titleEditor = document.getElementById('song-title-edit');
            if (titleEditor) {
                this.currentSong.title = titleEditor.value;
            }

            // Save lyrics and chords
            const lines = Array.from(this.lyricsDisplay.querySelectorAll('.lyrics-line'));
            const chordLines = Array.from(this.lyricsDisplay.querySelectorAll('.chord-line'));

            const lyrics = lines.map(line => line.textContent).join('\n');
            const chords = chordLines.map(line => line.textContent).join('\n');

            // Only push to history if content changed
            if (this.currentSong.lyrics !== lyrics || this.currentSong.chords !== chords) {
                this.currentSong.lyrics = lyrics;
                this.currentSong.chords = chords;
                
                // Add to edit history
                if (this.historyIndex < this.editHistory.length - 1) {
                    this.editHistory = this.editHistory.slice(0, this.historyIndex + 1);
                }
                this.editHistory.push(JSON.parse(JSON.stringify(this.currentSong)));
                this.historyIndex++;
            }

            const songIndex = this.songs.findIndex(s => s.id === this.currentSong.id);
            if (songIndex !== -1) {
                this.songs[songIndex] = this.currentSong;
                localStorage.setItem('songs', JSON.stringify(this.songs));
                this.savePending = false;
                
                if (manualSave) {
                    // Show save confirmation
                    const saveBtn = document.getElementById('save-song-btn');
                    if (saveBtn) {
                        saveBtn.classList.add('saved');
                        setTimeout(() => saveBtn.classList.remove('saved'), 1000);
                    }
                }
            }
        },

        undo() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.applyHistoryState();
            }
        },

        redo() {
            if (this.historyIndex < this.editHistory.length - 1) {
                this.historyIndex++;
                this.applyHistoryState();
            }
        },

        applyHistoryState() {
            if (this.editHistory[this.historyIndex]) {
                this.currentSong = JSON.parse(JSON.stringify(this.editHistory[this.historyIndex]));
                this.renderLyrics();
            }
        },

        setupUndoRedoShortcuts() {
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'z') {
                        e.preventDefault();
                        this.undo();
                    } else if (e.key === 'y') {
                        e.preventDefault();
                        this.redo();
                    } else if (e.key === 's') {
                        e.preventDefault();
                        this.saveCurrentSong(true);
                    }
                }
            });
        },

        displayCurrentEditorSong() {
            if (this.currentEditorSongIndex === -1) return;
            this.currentSong = this.editorSongs[this.currentEditorSongIndex];
            this.fontSize = this.perSongFontSizes[this.currentSong.id] || 32;

            // Skip if editor UI elements aren't ready
            if (!this.editorSongInfo || !this.editorSongInfo.innerHTML) {
                console.warn('Editor elements not initialized - skipping render');
                return;
            }
            this.editorSongInfo.innerHTML = `
                <div class="title-editor">
                    <input type="text" id="song-title-edit" class="song-title-input" 
                           value="${this.currentSong.title}" 
                           placeholder="Song title">
                </div>
                <h2 id="song-title-card" class="song-title">${this.currentSong.title}</h2>
            `;
            
            // Set up title editor events
            document.getElementById('song-title-edit')?.addEventListener('input', (e) => {
                this.currentSong.title = e.target.value;
                document.getElementById('song-title-card').textContent = e.target.value;
                this.saveCurrentSong();
            });

            this.fontSizeDisplay.textContent = `${this.fontSize}px`;
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
                    let tempo = parseInt(this.tempoInput.value) || 120;
                    const beatsPerMeasure = 4; // Standard
                    const syllablesPerBeat = 2; // Approximation
                    const maxSyllablesPerMeasure = beatsPerMeasure * syllablesPerBeat;

                    let measures = [];
                    let measureCount = 0;
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
            chordElement.addEventListener('input', () => this.saveCurrentSong());
            lineGroup.appendChild(chordElement);

            const lyricElement = document.createElement('div');
            lyricElement.className = 'lyrics-line';
            lyricElement.textContent = lyrics;
            lyricElement.setAttribute('contenteditable', 'true');
            lyricElement.addEventListener('input', () => {
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

        // Simple rhyme matching algorithm
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
                if (rhymeKey.length < 2) continue; // Ignore very short rhymes

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
            this.saveCurrentSong();
            this.renderLyrics();
        },

        handleLyricsClick(e) {
            if (e.target.classList.contains('lyrics-line') || e.target.classList.contains('chord-line')) {
                // Keep the cursor where it is
            }
        },

        handleLyricsKeydown(e) {
            // Re-render on enter key to create new line groups
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
            if (this.resizeObserver) this.resizeObserver.disconnect();
            window.location.href = '../index.html';
        },

        scrollToTop() {
            this.lyricsEditorContainer.scrollTo({ top: 0, behavior: 'smooth' });
        },

        toggleAutoScroll() {
            // Placeholder for autoscroll functionality
            const icon = this.autoScrollBtn.querySelector('i');
            if (icon.classList.contains('fa-play')) {
                icon.classList.remove('fa-play');
                icon.classList.add('fa-pause');
                // Start auto-scroll
            } else {
                icon.classList.remove('fa-pause');
                icon.classList.add('fa-play');
                // Stop auto-scroll
            }
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
            const icon = this.toggleChordsBtn.querySelector('i');
            if (this.isChordsVisible) {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-guitar');
            } else {
                icon.classList.remove('fa-guitar');
                icon.classList.add('fa-eye-slash');
            }
        },

        toggleReadOnly() {
            this.isReadOnly = !this.isReadOnly;
            this.updateReadOnlyState();
            const icon = this.toggleReadOnlyBtn.querySelector('i');
            if (this.isReadOnly) {
                icon.classList.remove('fa-lock-open');
                icon.classList.add('fa-lock');
            } else {
                icon.classList.remove('fa-lock');
                icon.classList.add('fa-lock-open');
            }
        },

        updateReadOnlyState() {
            const lines = this.lyricsDisplay.querySelectorAll('.lyrics-line-group > div');
            lines.forEach(line => {
                line.setAttribute('contenteditable', !this.isReadOnly);
            });
            this.lyricsEditorContainer.classList.toggle('read-only', this.isReadOnly);
            this.lyricsDisplay.setAttribute('contenteditable', !this.isReadOnly);
        },

        toggleCopyDropdown() {
            this.copyDropdown.classList.toggle('visible');
        },

        async handleCopySelection(e) {
            const copyType = e.target.dataset.copyType;
            let textToCopy = '';
            if (copyType === 'raw') {
                textToCopy = this.currentSong.lyrics || '';
            } else if (copyType === 'chords') {
                const lyricLines = this.currentSong.lyrics.split('\n');
                const chordLines = this.currentSong.chords.split('\n');
                textToCopy = lyricLines.map((line, i) => {
                    const chord = chordLines[i] || '';
                    return chord.length > 0 ? `${chord}\n${line}` : line;
                }).join('\n');
            }
            try {
                await navigator.clipboard.writeText(textToCopy);
                alert('Copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy text: ', err);
                alert('Failed to copy to clipboard.');
            }
            this.copyDropdown.classList.remove('visible');
        }
    };
    app.init();
});
