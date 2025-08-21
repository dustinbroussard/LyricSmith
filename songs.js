// if songs.js is used via <script>, we can’t import ES modules directly without type="module".
// So: convert songs.js into a module and adjust script tags that consume it.

import { normalizeSectionLabels, cleanAIOutput, enforceAlternating, ClipboardManager } from './lib/utils.js';

export { normalizeSectionLabels, cleanAIOutput, enforceAlternating, ClipboardManager };

export const SCHEMA_VERSION = 1;

export const defaultSections = "[Intro]\n\n[Verse 1]\n\n[Pre-Chorus]\n\n[Chorus]\n\n[Verse 2]\n\n[Bridge]\n\n[Outro]";

export const createSong = (title, lyrics = '', chords = '') => ({
  _v: SCHEMA_VERSION,
  id: Date.now().toString(),
  title,
  lyrics: lyrics.trim() ? normalizeSectionLabels(cleanAIOutput(lyrics)) : defaultSections,
  chords: cleanAIOutput(chords),
  key: '',
  tempo: 120,
  timeSignature: '4/4',
  notes: '',
  createdAt: new Date().toISOString(),
  lastEditedAt: new Date().toISOString(),
  tags: []
});
