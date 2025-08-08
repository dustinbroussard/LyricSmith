document.addEventListener('DOMContentLoaded', () => {
    // Ensure touch devices trigger button actions
    document.addEventListener('touchstart', (e) => {
        const btn = e.target.closest('button');
        if (btn) {
            e.preventDefault();
            btn.click();
        }
    }, { passive: false });
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
        decreaseFontBtn: document.getElementById('decrease-font-btn'),
        increaseFontBtn: document.getElementById('increase-font-btn'),
        fontSizeDisplay: document.getElementById('font-size-display'),
        toggleThemeBtn: document.getElementById('theme-toggle-btn'),
        exitEditorBtn: document.getElementById('exit-editor-btn'),
        scrollToTopBtn: document.getElementById('scroll-to-top-btn'),
        toggleChordsBtn: document.getElementById('toggle-chords-btn'),
        toggleReadOnlyBtn: document.getElementById('toggle-read-only-btn'),
        editModeSelect: document.getElementById('edit-mode-select'),
        copyLyricsBtn: document.getElementById('copy-lyrics-btn'),
        undoBtn: document.getElementById('undo-btn'),
        redoBtn: document.getElementById('redo-btn'),
        editorMenuBtn: document.getElementById('editor-menu-btn'),
        editorDropdownMenu: document.querySelector('.editor-dropdown-menu'),
        editorDropdownCloseBtn: document.getElementById('editor-menu-close-btn'),
        aiContextMenu: document.getElementById('ai-context-menu'),
        aiToolsBtn: document.getElementById('ai-tools-btn'),
        aiToolsMenu: document.getElementById('ai-tools-menu'),
        aiToolsCloseBtn: document.getElementById('ai-tools-close-btn'),
        aiSettingsBtn: document.getElementById('ai-settings-btn'),
        aiSettingsPanel: document.getElementById('ai-settings-panel'),
        aiSettingsClose: document.getElementById('ai-settings-close'),
        apiKeyInput: document.getElementById('openrouter-api-key'),
        modelSearchInput: document.getElementById('model-search'),
        modelList: document.getElementById('model-list'),
        saveAISettingsBtn: document.getElementById('save-ai-settings'),
        measureModeToggle: document.getElementById('measure-mode-toggle'),
        rhymeModeToggle: document.getElementById('rhyme-mode-toggle'),

        // State (keeping existing and adding new)
        songs: [],
        editorSongs: [],
        currentEditorSongIndex: -1,
        fontSize: 16,
        minFontSize: 12,
        maxFontSize: 72,
        fontSizeStep: 1,
        perSongFontSizes: JSON.parse(localStorage.getItem('perSongFontSizes') || '{}'),
        isReadOnly: false,
        isChordsVisible: true,
        isMeasureMode: false,
        isRhymeMode: false,
        editMode: localStorage.getItem('editorMode') || 'both',
        currentSong: null,
        defaultSections: "[Intro]\n\n[Verse 1]\n\n[Pre-Chorus]\n\n[Chorus]\n\n[Verse 2]\n\n[Bridge]\n\n[Outro]",
        resizeObserver: null,
        copyDropdown: null,
        longPressTimer: null,
        hasUnsavedChanges: false, // Track unsaved changes
        availableModels: [],
        selectedModel: '',
        undoStack: [],
        redoStack: [],
        lastSnapshotTime: 0,

        syllableCount(word) {
            word = word.toLowerCase();
            if (word.length <= 3) { return 1; }
            word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
            word = word.replace(/^y/, '');
            return word.match(/[aeiouy]{1,2}/g)?.length || 0;
        },

        init() {
            this.loadData();
            this.loadAISettings();
            this.setupEventListeners();
            this.loadEditorState();
            if (this.editModeSelect) {
                this.editModeSelect.value = this.editMode;
            }
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

        trimExtraEmptyLines(text = '') {
            const lines = text.split('\n');
            const result = [];
            let prevEmpty = false;
            for (const line of lines) {
                const isEmpty = line.trim() === '';
                if (isEmpty && prevEmpty) continue;
                result.push(line);
                prevEmpty = isEmpty;
            }
            return result.join('\n');
        },

        trimDomEmptyLines() {
            const trimContainer = (container) => {
                let prevEmpty = false;
                Array.from(container.children).forEach(child => {
                    if (!child.classList.contains('lyrics-line-group')) return;
                    const lyric = child.querySelector('.lyric-text')?.textContent.trim() || '';
                    const chord = child.querySelector('.chord-line')?.textContent.trim() || '';
                    const isEmpty = lyric === '' && chord === '';
                    if (isEmpty && prevEmpty) {
                        child.remove();
                    } else {
                        prevEmpty = isEmpty;
                    }
                });
            };
            trimContainer(this.lyricsDisplay);
            this.lyricsDisplay.querySelectorAll('.section-content').forEach(sc => trimContainer(sc));
        },

        getSongState() {
            return {
                lyrics: this.currentSong?.lyrics || '',
                chords: this.currentSong?.chords || ''
            };
        },

        pushUndoState() {
            const now = Date.now();
            const state = this.getSongState();
            if (now - this.lastSnapshotTime < 1000) return;
            this.undoStack.push({ ...state });
            if (this.undoStack.length > 100) this.undoStack.shift();
            this.lastSnapshotTime = now;
            this.redoStack = [];
        },

        applySongState(state) {
            if (!this.currentSong) return;
            this.currentSong.lyrics = state.lyrics;
            this.currentSong.chords = state.chords;
            this.renderLyrics();
            this.saveCurrentSong();
        },

        undo() {
            if (this.undoStack.length === 0) return;
            const current = this.getSongState();
            this.redoStack.push(current);
            const prev = this.undoStack.pop();
            this.applySongState(prev);
        },

        redo() {
            if (this.redoStack.length === 0) return;
            const current = this.getSongState();
            this.undoStack.push(current);
            const next = this.redoStack.pop();
            this.applySongState(next);
        },

        setupEventListeners() {
            // Existing event listeners
            this.decreaseFontBtn?.addEventListener('click', () => this.adjustFontSize(-this.fontSizeStep));
            this.increaseFontBtn?.addEventListener('click', () => this.adjustFontSize(this.fontSizeStep));
            this.toggleThemeBtn?.addEventListener('click', () => this.toggleTheme());
            this.exitEditorBtn?.addEventListener('click', () => this.exitEditorMode());
            this.lyricsDisplay?.addEventListener('click', (e) => this.handleLyricsClick(e));
            this.lyricsDisplay?.addEventListener('keydown', (e) => this.handleLyricsKeydown(e));
            this.scrollToTopBtn?.addEventListener('click', () => this.scrollToTop());
            this.editorMenuBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.aiToolsMenu?.classList.remove('visible');
                this.copyDropdown?.classList.remove('visible');
                this.editorDropdownMenu?.classList.add('visible');
            });
            this.editorMenuBtn?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.aiToolsMenu?.classList.remove('visible');
                    this.copyDropdown?.classList.remove('visible');
                    this.editorDropdownMenu?.classList.add('visible');
                }
            });
            this.editorDropdownCloseBtn?.addEventListener('click', () => {
                this.editorDropdownMenu?.classList.remove('visible');
            });
            // Handle dropdown items
            document.getElementById('toggle-chords-btn')?.addEventListener('click', () => {
                this.toggleChords();
            });
            document.getElementById('toggle-read-only-btn')?.addEventListener('click', () => {
                this.toggleReadOnly();
            });
            this.editModeSelect?.addEventListener('change', (e) => {
                this.editMode = e.target.value;
                localStorage.setItem('editorMode', this.editMode);
                this.updateReadOnlyState();
            });
            document.getElementById('save-song-btn')?.addEventListener('click', () => {
                this.saveCurrentSong(true);
            });

            document.getElementById('ai-format-btn')?.addEventListener('click', () => {
                this.invokeAIFormat();
            });

            document.getElementById('regenre-btn')?.addEventListener('click', () => {
                const genre = prompt('Enter target genre (e.g., "Country", "Jazz", "Trap")');
                if (genre) {
                    this.invokeReGenre(genre);
                }
            });

            // Enhanced copy functionality
            this.copyLyricsBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editorDropdownMenu?.classList.remove('visible');
                this.aiToolsMenu?.classList.remove('visible');
                this.toggleCopyDropdown();
            });
            this.copyLyricsBtn?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.editorDropdownMenu?.classList.remove('visible');
                    this.aiToolsMenu?.classList.remove('visible');
                    this.toggleCopyDropdown();
                }
            });

            this.undoBtn?.addEventListener('click', () => {
                this.undo();
            });
            this.redoBtn?.addEventListener('click', () => {
                this.redo();
            });
            document.getElementById('export-single-song')?.addEventListener('click', () => {
                const content = ClipboardManager.formatSongForExport(this.currentSong, true);
                const blob = new Blob([content], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${this.currentSong.title.replace(/\s+/g, '_')}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
            // Close dropdowns when clicking outside
            document.addEventListener('click', (e) => {
                if (this.copyDropdown && !this.copyLyricsBtn.contains(e.target) && !this.copyDropdown.contains(e.target)) {
                    this.copyDropdown.classList.remove('visible');
                }
                if (this.editorDropdownMenu?.classList.contains('visible') &&
                    !this.editorMenuBtn.contains(e.target) &&
                    !this.editorDropdownMenu.contains(e.target)) {
                    this.editorDropdownMenu.classList.remove('visible');
                }
                if (this.aiToolsMenu?.classList.contains('visible') &&
                    !this.aiToolsBtn.contains(e.target) &&
                    !this.aiToolsMenu.contains(e.target)) {
                    this.aiToolsMenu.classList.remove('visible');
                }
            });
            window.addEventListener('resize', () => {
                if (this.copyDropdown?.classList.contains('visible')) {
                    this.positionCopyDropdown();
                }
            });

            this.measureModeToggle?.addEventListener('change', (e) => {
                this.isMeasureMode = e.target.checked;
                this.renderLyrics();
            });

            this.rhymeModeToggle?.addEventListener('change', (e) => {
                this.isRhymeMode = e.target.checked;
                this.renderLyrics();
            });

            // AI Tools dropdown
            this.aiToolsBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editorDropdownMenu?.classList.remove('visible');
                this.copyDropdown?.classList.remove('visible');
                this.aiToolsMenu?.classList.add('visible');
            });
            this.aiToolsBtn?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.editorDropdownMenu?.classList.remove('visible');
                    this.copyDropdown?.classList.remove('visible');
                    this.aiToolsMenu?.classList.add('visible');
                }
            });
            this.aiToolsCloseBtn?.addEventListener('click', () => {
                this.aiToolsMenu?.classList.remove('visible');
            });
            document.querySelectorAll('.ai-tools-menu .tool-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.callOpenRouter(btn.dataset.prompt);
                });
            });
            this.aiSettingsBtn?.addEventListener('click', () => {
                this.openAISettings();
            });
            this.aiSettingsClose?.addEventListener('click', () => {
                this.aiSettingsPanel.style.display = 'none';
            });
            this.saveAISettingsBtn?.addEventListener('click', () => this.saveAISettings());
            this.modelSearchInput?.addEventListener('input', () => this.renderModelList(this.modelSearchInput.value));
            // Long-press to show AI context menu
            this.lyricsDisplay?.addEventListener('touchstart', (e) => this.startLongPress(e));
            this.lyricsDisplay?.addEventListener('touchend', () => this.cancelLongPress());
            this.lyricsDisplay?.addEventListener('touchmove', () => this.cancelLongPress());
            this.lyricsDisplay?.addEventListener('mousedown', (e) => this.startLongPress(e));
            this.lyricsDisplay?.addEventListener('mouseup', () => this.cancelLongPress());
            document.querySelectorAll('#ai-context-menu button').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    const text = window.getSelection().toString();
                    this.handleAIAction(action, text);
                    this.aiContextMenu.style.display = 'none';
                });
            });

            // Metadata input listeners
            ['song-title-meta', 'song-key', 'song-tempo-meta', 'song-time-signature', 'song-tags', 'song-notes']
                .forEach(id => {
                    document.getElementById(id)?.addEventListener('input', () => this.updateSongMetadata());
                });

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    this.saveCurrentSong(true);
                }
                if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                    e.preventDefault();
                    this.undo();
                }
                if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                    e.preventDefault();
                    this.redo();
                }
                if (e.key === 'Escape') {
                    this.editorDropdownMenu?.classList.remove('visible');
                    this.aiToolsMenu?.classList.remove('visible');
                    this.copyDropdown?.classList.remove('visible');
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
                    <button class="copy-option" data-copy-type="download">
                        <i class="fas fa-file-download"></i>
                        Download as .txt
                    </button>
                `;
                
                dropdown.addEventListener('click', (e) => this.handleCopySelection(e));
                document.body.appendChild(dropdown);
                this.copyDropdown = dropdown;
                this.positionCopyDropdown();
            }
        },

        positionCopyDropdown() {
            if (this.copyDropdown && this.copyLyricsBtn) {
                const rect = this.copyLyricsBtn.getBoundingClientRect();
                this.copyDropdown.style.top = `${rect.bottom + 8}px`;
                this.copyDropdown.style.left = `${rect.left + rect.width / 2}px`;
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

        loadAISettings() {
            const key = localStorage.getItem('openrouterApiKey') || '';
            const model = localStorage.getItem('openrouterModel') || '';
            window.CONFIG = window.CONFIG || {};
            window.CONFIG.openrouterApiKey = key;
            window.CONFIG.defaultModel = model;
            this.selectedModel = model;
            if (this.apiKeyInput) this.apiKeyInput.value = key;
        },

        openAISettings() {
            if (this.aiSettingsPanel) {
                this.aiSettingsPanel.style.display = 'block';
                if (!this.availableModels.length) {
                    this.fetchModels();
                } else {
                    this.renderModelList(this.modelSearchInput?.value || '');
                }
            }
        },

        saveAISettings() {
            const key = this.apiKeyInput?.value.trim() || '';
            window.CONFIG.openrouterApiKey = key;
            window.CONFIG.defaultModel = this.selectedModel;
            localStorage.setItem('openrouterApiKey', key);
            localStorage.setItem('openrouterModel', this.selectedModel);
            this.aiSettingsPanel.style.display = 'none';
        },

        async fetchModels() {
            try {
                const res = await fetch('https://openrouter.ai/api/v1/models');
                const data = await res.json();
                this.availableModels = data.data || [];
                this.renderModelList(this.modelSearchInput?.value || '');
            } catch (err) {
                console.error('Failed to fetch models', err);
            }
        },

        renderModelList(filter = '') {
            if (!this.modelList) return;
            const term = filter.toLowerCase();
            this.modelList.innerHTML = '';
            this.availableModels
                .filter(m => m.id.toLowerCase().includes(term))
                .forEach(m => {
                    const item = document.createElement('div');
                    item.className = 'model-item' + (m.id === this.selectedModel ? ' selected' : '');
                    item.textContent = m.id;
                    item.addEventListener('click', () => {
                        this.selectedModel = m.id;
                        window.CONFIG.defaultModel = m.id;
                        localStorage.setItem('openrouterModel', m.id);
                        this.renderModelList(term);
                    });
                    this.modelList.appendChild(item);
                });
        },

        startLongPress() {
            this.longPressTimer = setTimeout(() => {
                this.handleTextSelection();
            }, 600);
        },

        cancelLongPress() {
            clearTimeout(this.longPressTimer);
        },

        handleTextSelection() {
            if (!this.aiContextMenu) return;
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const startEl = range.startContainer.parentElement;
                if (!startEl.closest('.lyrics-line')) {
                    this.aiContextMenu.style.display = 'none';
                    return;
                }
                const rect = range.getBoundingClientRect();
                const topOffset = window.innerWidth < 600 ? 40 : 8;
                let top = rect.bottom + window.scrollY + topOffset;
                let left = rect.left + window.scrollX;
                this.aiContextMenu.style.display = 'flex';
                const menuWidth = this.aiContextMenu.offsetWidth;
                const menuHeight = this.aiContextMenu.offsetHeight;
                if (left + menuWidth > window.scrollX + window.innerWidth) {
                    left = window.scrollX + window.innerWidth - menuWidth - 8;
                }
                if (left < window.scrollX + 8) {
                    left = window.scrollX + 8;
                }
                if (top + menuHeight > window.scrollY + window.innerHeight) {
                    top = rect.top + window.scrollY - menuHeight - topOffset;
                }
                if (top < window.scrollY + 8) {
                    top = window.scrollY + 8;
                }
                this.aiContextMenu.style.top = `${top}px`;
                this.aiContextMenu.style.left = `${left}px`;
            } else {
                this.aiContextMenu.style.display = 'none';
            }
        },

        handleAIAction(action, selectedText) {
            const prompts = {
                rhyme: `Find rhymes for: ${selectedText}`,
                reword: `Suggest alternative wording for: ${selectedText}`,
                rewrite: `Rewrite this line in a different tone: ${selectedText}`,
                continue: `Continue the lyrics after: ${selectedText}`
            };
            const prompt = prompts[action];
            if (!window.CONFIG.openrouterApiKey) {
                console.warn('OpenRouter API key not set');
                alert('Please set your OpenRouter API key in AI Settings.');
                return;
            }
            console.log(prompt);
            this.callOpenRouter(prompt);
        },

        async callOpenRouter(prompt) {
            try {
                const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${window.CONFIG.openrouterApiKey}`
                    },
                    body: JSON.stringify({
                        model: window.CONFIG.defaultModel || '',
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                const data = await res.json();
                console.log('OpenRouter response', data);
            } catch (err) {
                console.error('OpenRouter error', err);
            }
        },

        async invokeAIFormat() {
            if (!this.currentSong) return;
            try {
                const song = this.currentSong;
                const formatted = ClipboardManager.formatLyricsWithChords(song.lyrics || '', song.chords || '');
                const prompt = `Clean up the formatting for this song and return chords and lyrics on alternating lines.\nTitle: ${song.title}\nKey: ${song.key}\nTempo: ${song.tempo}\nTime Signature: ${song.timeSignature}\n\n${formatted}`;
                const response = await callOpenRouterAPI(prompt);
                if (response) {
                    const lines = response.trim().split(/\r?\n/);
                    const newLyrics = [];
                    const newChords = [];
                    for (let i = 0; i < lines.length; i += 2) {
                        newChords.push(lines[i] || '');
                        if (lines[i + 1] !== undefined) {
                            newLyrics.push(lines[i + 1]);
                        }
                    }
                    song.lyrics = newLyrics.join('\n');
                    song.chords = newChords.join('\n');
                    this.renderLyrics();
                    ClipboardManager.showToast('AI formatting applied!', 'success');
                }
            } catch (err) {
                console.error('AI format error', err);
            }
        },

        async invokeReGenre(newGenre) {
            if (!this.currentSong) return;
            try {
                const song = this.currentSong;
                const formatted = ClipboardManager.formatLyricsWithChords(song.lyrics || '', song.chords || '');
                const tags = song.tags?.length ? song.tags.join(', ') : '';
                const prompt = `Rewrite the following song in the ${newGenre} genre while preserving meaning and structure. Return chords and lyrics on alternating lines.\nTitle: ${song.title}\nKey: ${song.key}\nTempo: ${song.tempo}\nTags: ${tags}\n\n${formatted}`;
                const response = await callOpenRouterAPI(prompt);
                if (response) {
                    const lines = response.trim().split(/\r?\n/);
                    const newLyrics = [];
                    const newChords = [];
                    for (let i = 0; i < lines.length; i += 2) {
                        newChords.push(lines[i] || '');
                        if (lines[i + 1] !== undefined) {
                            newLyrics.push(lines[i + 1]);
                        }
                    }
                    song.lyrics = newLyrics.join('\n');
                    song.chords = newChords.join('\n');
                    this.renderLyrics();
                    ClipboardManager.showToast(`Re-genred as ${newGenre}`, 'success');
                }
            } catch (err) {
                console.error('Re-genre error', err);
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

            const titleEl = document.getElementById('song-title-meta');
            const keyEl = document.getElementById('song-key');
            const tempoEl = document.getElementById('song-tempo-meta');
            const tsEl = document.getElementById('song-time-signature');
            const tagsEl = document.getElementById('song-tags');
            const notesEl = document.getElementById('song-notes');

            const newTitle = titleEl?.value.trim() || '';
            if (this.currentSong.title !== newTitle) {
                this.currentSong.title = newTitle;
                document.getElementById('song-title-card').textContent = newTitle;
                this.hasUnsavedChanges = true;
            }

            const newKey = keyEl?.value || '';
            if (this.currentSong.key !== newKey) {
                this.currentSong.key = newKey;
                this.hasUnsavedChanges = true;
            }

            const tempoValue = parseInt(tempoEl?.value) || 120;
            if (this.currentSong.tempo !== tempoValue) {
                this.currentSong.tempo = tempoValue;
                this.hasUnsavedChanges = true;
            }

            const tsValue = tsEl?.value || '4/4';
            if (this.currentSong.timeSignature !== tsValue) {
                this.currentSong.timeSignature = tsValue;
                this.hasUnsavedChanges = true;
            }

            const notesValue = notesEl?.value || '';
            if (this.currentSong.notes !== notesValue) {
                this.currentSong.notes = notesValue;
                this.hasUnsavedChanges = true;
            }

            const tagsValue = tagsEl?.value.split(',').map(t => t.trim()).filter(t => t);
            if (JSON.stringify(this.currentSong.tags) !== JSON.stringify(tagsValue)) {
                this.currentSong.tags = tagsValue;
                this.hasUnsavedChanges = true;
            }
        },

        saveCurrentSong(isExplicit = false) {
            if (!this.currentSong || (!window.CONFIG.autosaveEnabled && !isExplicit)) return;

            const lyricNodes = Array.from(this.lyricsDisplay.querySelectorAll('.section-label, .lyric-text'));
            const lyricLines = [];
            const chordLines = [];
            lyricNodes.forEach(node => {
                if (node.classList.contains('section-label')) {
                    lyricLines.push(node.textContent);
                } else {
                    lyricLines.push(node.textContent);
                    const group = node.closest('.lyrics-line-group');
                    const chord = group?.querySelector('.chord-line')?.textContent || '';
                    chordLines.push(chord);
                }
            });

            const lyrics = this.trimExtraEmptyLines(lyricLines.join('\n'));
            const chords = this.trimExtraEmptyLines(chordLines.join('\n'));

            this.currentSong.lyrics = this.normalizeSectionLabels(lyrics);
            this.currentSong.chords = chords;
            this.currentSong.lastEditedAt = new Date().toISOString();
            document.getElementById('song-edited').textContent = new Date(this.currentSong.lastEditedAt).toLocaleString();

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

            this.fontSize = this.perSongFontSizes[this.currentSong.id] || 16;

            document.getElementById('song-title-card').textContent = this.currentSong.title;
            this.fontSizeDisplay.textContent = `${this.fontSize}px`;

            // Populate metadata panel
            document.getElementById('song-title-meta').value = this.currentSong.title || '';
            document.getElementById('song-key').value = this.currentSong.key || '';
            document.getElementById('song-tempo-meta').value = this.currentSong.tempo || 120;
            document.getElementById('song-time-signature').value = this.currentSong.timeSignature || '4/4';
            document.getElementById('song-tags').value = this.currentSong.tags.join(', ');
            document.getElementById('song-notes').value = this.currentSong.notes || '';
            document.getElementById('song-created').textContent = new Date(this.currentSong.createdAt).toLocaleString();
            document.getElementById('song-edited').textContent = new Date(this.currentSong.lastEditedAt).toLocaleString();

            this.currentSong.lyrics = this.normalizeSectionLabels(this.currentSong.lyrics || '');

            const linesNoTitle = this.currentSong.lyrics.split('\n');
            const normalizedTitle = (this.currentSong.title || '').trim().toLowerCase();
            if (linesNoTitle.length && linesNoTitle[0].trim().toLowerCase() === normalizedTitle) {
                linesNoTitle.shift();
                if (linesNoTitle[0]?.trim() === '') {
                    linesNoTitle.shift();
                }
                this.currentSong.lyrics = linesNoTitle.join('\n');
            }

            this.renderLyrics();

            // Initialize undo/redo stacks for this song
            this.undoStack = [this.getSongState()];
            this.redoStack = [];
            this.lastSnapshotTime = Date.now();
            this.saveCurrentSong(true);
        },

        renderLyrics() {
            if (!this.currentSong) return;
            const lyrics = this.trimExtraEmptyLines(this.currentSong.lyrics || '');
            const chords = this.trimExtraEmptyLines(this.currentSong.chords || '');

            this.currentSong.lyrics = lyrics;
            this.currentSong.chords = chords;

            let lyricLines = lyrics.split('\n');
            let chordLines = chords.split('\n');

            const normalizedTitle = (this.currentSong.title || '').trim().toLowerCase();
            if (lyricLines.length && lyricLines[0].trim().toLowerCase() === normalizedTitle) {
                lyricLines.shift();
                if (lyricLines[0]?.trim() === '') {
                    lyricLines.shift();
                }
                if (chordLines.length) {
                    chordLines.shift();
                }
            }

            this.lyricsDisplay.innerHTML = '';

            const rhymeGroups = this.isRhymeMode ? this.findRhymes(lyricLines) : {};

            let chordIndex = 0;
            let currentSectionContent = null;

            for (let i = 0; i < lyricLines.length; i++) {
                const lyricLine = lyricLines[i];

                if (/^\[.*\]$/.test(lyricLine.trim())) {
                    const section = document.createElement('div');
                    section.className = 'section';
                    const header = document.createElement('div');
                    header.className = 'lyrics-line section-label';
                    header.textContent = lyricLine.trim();
                    header.setAttribute('contenteditable', 'true');
                    header.addEventListener('click', () => section.classList.toggle('collapsed'));
                    section.appendChild(header);
                    const content = document.createElement('div');
                    content.className = 'section-content';
                    section.appendChild(content);
                    this.lyricsDisplay.appendChild(section);
                    currentSectionContent = content;
                    continue;
                }

                const chordLine = chordLines[chordIndex] || '';
                chordIndex++;
                const targetContainer = currentSectionContent || this.lyricsDisplay;

                if (this.isMeasureMode) {
                    const words = lyricLine.split(/\s+/).filter(w => w.length > 0);
                    let currentMeasure = '';
                    let currentSyllableCount = 0;
                    const beatsPerMeasure = 4;
                    const syllablesPerBeat = 2;
                    const maxSyllablesPerMeasure = beatsPerMeasure * syllablesPerBeat;
                    let measures = [];
                    for (let word of words) {
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
                        this.addLyricLine(chordLine, measure, rhymeGroups[i], measureSyllables, targetContainer);
                    }
                } else {
                    const lineSyllables = lyricLine.split(/\s+/).filter(w => w.length > 0).reduce((sum, word) => sum + this.syllableCount(word), 0);
                    this.addLyricLine(chordLine, lyricLine, rhymeGroups[i], lineSyllables, targetContainer);
                }
            }
            this.lyricsDisplay.style.fontSize = `${this.fontSize}px`;
            this.updateReadOnlyState();
            this.updateChordsVisibility();
            this.updateSyllableCount();
        },

        addLyricLine(chords, lyrics, rhymeClass, syllableCount, container = this.lyricsDisplay, insertBefore = null) {
            const lineGroup = document.createElement('div');
            lineGroup.className = 'lyrics-line-group';

            const chordElement = document.createElement('div');
            chordElement.className = 'chord-line';
            chordElement.textContent = chords;
            const editableChords = !this.isReadOnly && (this.editMode === 'chords' || this.editMode === 'both');
            chordElement.setAttribute('contenteditable', editableChords);
            chordElement.classList.toggle('editable', editableChords);
            chordElement.classList.toggle('non-editable', !editableChords);
            chordElement.addEventListener('input', () => {
                this.pushUndoState();
                this.handleLyricsInput();
            });
            lineGroup.appendChild(chordElement);

            const lyricElement = document.createElement('div');
            lyricElement.className = 'lyrics-line';

            const syllableSpan = document.createElement('span');
            syllableSpan.className = 'syllable-count';
            syllableSpan.textContent = syllableCount > 0 ? String(syllableCount).padStart(2, ' ') : '';
            lyricElement.appendChild(syllableSpan);

            const textSpan = document.createElement('span');
            textSpan.className = 'lyric-text';
            textSpan.textContent = lyrics;
            const editableLyrics = !this.isReadOnly && (this.editMode === 'lyrics' || this.editMode === 'both');
            textSpan.setAttribute('contenteditable', editableLyrics);
            textSpan.classList.toggle('editable', editableLyrics);
            textSpan.classList.toggle('non-editable', !editableLyrics);
            textSpan.addEventListener('input', () => {
                this.pushUndoState();
                this.handleLyricsInput();
                this.updateSyllableCount();
                this.updateRhymes();
            });
            lyricElement.appendChild(textSpan);

            if (rhymeClass) {
                lyricElement.classList.add(rhymeClass);
            }
            lineGroup.appendChild(lyricElement);

            if (insertBefore) {
                container.insertBefore(lineGroup, insertBefore);
            } else {
                container.appendChild(lineGroup);
            }

            return lineGroup;
        },

        updateSyllableCount() {
            const lines = this.lyricsDisplay.querySelectorAll('.lyrics-line');
            lines.forEach(line => {
                const textSpan = line.querySelector('.lyric-text');
                const countSpan = line.querySelector('.syllable-count');
                if (!textSpan || !countSpan) return;
                const text = textSpan.textContent;
                const words = text.split(/\s+/).filter(w => w.length > 0);
                const count = words.reduce((sum, word) => sum + this.syllableCount(word), 0);
                countSpan.textContent = count > 0 ? String(count).padStart(2, ' ') : '';
            });
        },

        updateRhymes() {
            const allLyricElements = Array.from(this.lyricsDisplay.querySelectorAll('.lyrics-line'));
            const lyricElements = allLyricElements.filter(el => !el.classList.contains('section-label'));
            const lines = lyricElements.map(el => el.querySelector('.lyric-text')?.textContent || '');
            const rhymeGroups = this.isRhymeMode ? this.findRhymes(lines) : {};
            let idx = 0;
            allLyricElements.forEach(el => {
                if (el.classList.contains('section-label')) {
                    el.className = 'lyrics-line section-label';
                } else {
                    el.className = 'lyrics-line';
                    if (rhymeGroups[idx]) {
                        el.classList.add(rhymeGroups[idx]);
                    }
                    idx++;
                }
            });
        },

        findRhymes(lines) {
            const rhymeWords = lines.map(line => {
                if (/^\[.*\]$/.test(line.trim())) return '';
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
            this.trimDomEmptyLines();
            this.saveCurrentSong();
        },

        handleLyricsClick(e) {
            if (e.target.classList.contains('lyrics-line') || e.target.classList.contains('chord-line')) {
                // Keep the cursor where it is
            }
        },

        handleLyricsKeydown(e) {
            if (e.key === 'Enter' && e.target.classList.contains('lyric-text')) {
                e.preventDefault();
                const currentGroup = e.target.closest('.lyrics-line-group');
                const newGroup = this.addLyricLine('', '', null, 0, this.lyricsDisplay, currentGroup?.nextSibling);
                const newText = newGroup.querySelector('.lyric-text');
                if (newText) newText.focus();
                this.handleLyricsInput();
                this.updateSyllableCount();
                this.updateRhymes();
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
            const mode = this.editMode;
            const isReadOnly = this.isReadOnly;
            this.lyricsDisplay.querySelectorAll('.lyric-text').forEach(line => {
                const editable = !isReadOnly && (mode === 'lyrics' || mode === 'both');
                line.setAttribute('contenteditable', editable);
                line.classList.toggle('editable', editable);
                line.classList.toggle('non-editable', !editable);
            });
            this.lyricsDisplay.querySelectorAll('.chord-line').forEach(line => {
                const editable = !isReadOnly && (mode === 'chords' || mode === 'both');
                line.setAttribute('contenteditable', editable);
                line.classList.toggle('editable', editable);
                line.classList.toggle('non-editable', !editable);
            });
            this.lyricsDisplay.querySelectorAll('.section-label').forEach(label => {
                const editable = !isReadOnly;
                label.setAttribute('contenteditable', editable);
                label.classList.toggle('editable', editable);
                label.classList.toggle('non-editable', !editable);
            });
            this.lyricsEditorContainer?.classList.toggle('read-only', isReadOnly);
        },

        toggleCopyDropdown() {
            if (this.copyDropdown) {
                if (!this.copyDropdown.classList.contains('visible')) {
                    this.positionCopyDropdown();
                }
                this.copyDropdown.classList.toggle('visible');
            }
        },

        async handleCopySelection(e) {
            if (!e.target.dataset.copyType) return;
            
            const copyType = e.target.dataset.copyType;
            let textToCopy = '';

            if (copyType === 'download') {
                const content = ClipboardManager.formatSongForExport(this.currentSong, true);
                const blob = new Blob([content], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${this.currentSong.title.replace(/\s+/g, '_')}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                this.copyDropdown.classList.remove('visible');
                return;
            }

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
    window.app = app;
});
