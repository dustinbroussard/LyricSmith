// lib/utils.js
export function cleanAIOutput(text='') {
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
}

export function normalizeSectionLabels(text='') {
  const sectionKeywords = [
    'intro','verse','prechorus','chorus','bridge','outro',
    'hook','refrain','coda','solo','interlude','ending','breakdown','tag'
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
}

export function enforceAlternating(lines=[]) {
  const chords = [], lyrics = [];
  for (let i=0;i<lines.length;i++){
    if (i%2===0) chords.push(lines[i]||''); else lyrics.push(lines[i]||'');
  }
  return { chords, lyrics };
}

export class ClipboardManager {
  static async copyToClipboard(text, showToast = true) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position='fixed'; ta.style.left='-999999px'; ta.style.top='-999999px';
        document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); ta.remove();
      }
      if (showToast) this.showToast('Copied to clipboard!', 'success');
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      if (showToast) this.showToast('Failed to copy to clipboard', 'error');
      return false;
    }
  }
  static showToast(message, type='info') {
    let container = document.querySelector('.toast-container');
    if (!container) { container = document.createElement('div'); container.className='toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div'); toast.className=`toast toast-${type}`; toast.textContent=message; container.appendChild(toast);
    setTimeout(()=>toast.classList.add('show'),10);
    setTimeout(()=>{ toast.classList.remove('show'); setTimeout(()=>toast.remove(),300); }, 3000);
  }
  static formatLyricsWithChords(lyrics, chords) {
    const lyricLines = (lyrics||'').split('\n');
    const chordLines = (chords||'').split('\n');
    return lyricLines.map((lyricLine,i)=>{
      const chordLine = chordLines[i]||'';
      return chordLine.trim()? `${chordLine}\n${lyricLine}` : lyricLine;
    }).join('\n');
  }
  static formatSongForExport(song, includeMetadata=true) {
    let out = '';
    if (includeMetadata) {
      out += `# ${song.title}\n\n`;
      if (song.key) out += `**Key:** ${song.key}\n`;
      if (song.tempo) out += `**Tempo:** ${song.tempo} BPM\n`;
      if (song.timeSignature) out += `**Time Signature:** ${song.timeSignature}\n`;
      if (song.tags?.length) out += `**Tags:** ${song.tags.join(', ')}\n`;
      out += '\n---\n\n';
    }
    out += song.chords?.trim() ? this.formatLyricsWithChords(song.lyrics, song.chords) : (song.lyrics||'');
    if (song.notes?.trim()) out += '\n\n---\n**Notes:**\n' + song.notes;
    return out;
  }
}
