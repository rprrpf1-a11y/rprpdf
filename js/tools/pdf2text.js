// PDF to Word / Text / Markdown Extractor — 100% Client-Side
window.Pdf2TextTool = {
  pdfDoc: null,
  fileName: '',
  numPages: 0,
  pagesText: [],

  init: () => {
    const fileInput = document.getElementById('pdf2text-file-input');
    const dropzone = document.getElementById('pdf2text-dropzone');
    const includeHeaders = document.getElementById('pdf2text-include-headers');
    const outputArea = document.getElementById('pdf2text-output');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          Pdf2TextTool.loadFile(e.target.files[0]);
        }
      });
    }

    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-sky-500', 'bg-sky-50/50');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-sky-500', 'bg-sky-50/50');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-sky-500', 'bg-sky-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          Pdf2TextTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (includeHeaders) {
      includeHeaders.addEventListener('change', Pdf2TextTool.renderCombinedText);
    }
    if (outputArea) {
      outputArea.addEventListener('input', Pdf2TextTool.updateStats);
    }
  },

  loadFile: async (file) => {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      PrivaUtils.showToast('Please upload a valid PDF file.', 'error');
      return;
    }

    Pdf2TextTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    document.getElementById('pdf2text-dropzone')?.classList.add('hidden');
    document.getElementById('pdf2text-workspace')?.classList.remove('hidden');

    PrivaUtils.showProgress('Extracting Text From PDF', 15, 'Initializing PDF.js text layer...');

    try {
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      PrivaUtils.initPdfJs();

      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      Pdf2TextTool.pdfDoc = pdfDoc;
      Pdf2TextTool.numPages = pdfDoc.numPages;
      Pdf2TextTool.pagesText = [];

      const metaEl = document.getElementById('pdf2text-meta');
      if (metaEl) metaEl.textContent = `${file.name} • ${pdfDoc.numPages} page${pdfDoc.numPages > 1 ? 's' : ''} • ${PrivaUtils.formatBytes(file.size)}`;

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const pct = Math.round(15 + (i / pdfDoc.numPages) * 80);
        PrivaUtils.updateProgress(pct, `Reading page ${i} of ${pdfDoc.numPages}...`);

        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const reconstructed = Pdf2TextTool.reconstructLines(content.items);
        Pdf2TextTool.pagesText.push({ pageNum: i, text: reconstructed });
      }

      Pdf2TextTool.renderCombinedText();
      PrivaUtils.hideProgress();
      PrivaUtils.showToast(`Extracted text from ${pdfDoc.numPages} page(s)!`, 'success');
    } catch (err) {
      console.error(err);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Text extraction failed: ' + err.message, 'error');
      Pdf2TextTool.reset();
    }
  },

  // Group PDF.js text spans by vertical Y baseline to preserve natural line breaks and columns
  reconstructLines: (items) => {
    if (!items || items.length === 0) return '';

    const lines = [];
    let currentLine = [];
    let lastY = null;

    for (const item of items) {
      if (!item.str) continue;
      const y = item.transform ? item.transform[5] : 0;
      const h = item.height || 10;

      if (lastY !== null && Math.abs(y - lastY) > Math.max(4, h * 0.55)) {
        const lineStr = currentLine.map(t => t.str).join(' ').replace(/\s+/g, ' ').trim();
        if (lineStr) lines.push(lineStr);
        // Add extra spacing on larger vertical paragraph gaps
        if (Math.abs(y - lastY) > Math.max(16, h * 1.8)) {
          lines.push('');
        }
        currentLine = [];
      }

      currentLine.push(item);
      lastY = y;
    }

    if (currentLine.length > 0) {
      const lineStr = currentLine.map(t => t.str).join(' ').replace(/\s+/g, ' ').trim();
      if (lineStr) lines.push(lineStr);
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  },

  renderCombinedText: () => {
    const includeHeaders = document.getElementById('pdf2text-include-headers')?.checked ?? true;
    const outputArea = document.getElementById('pdf2text-output');
    if (!outputArea) return;

    const combined = Pdf2TextTool.pagesText.map(p => {
      const body = p.text || '[No selectable text found on this page — may be scanned image]';
      return includeHeaders ? `=== Page ${p.pageNum} ===\n${body}` : body;
    }).join('\n\n');

    outputArea.value = combined;
    Pdf2TextTool.updateStats();
  },

  updateStats: () => {
    const text = document.getElementById('pdf2text-output')?.value || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text ? text.split('\n').length : 0;
    const readMin = Math.max(1, Math.ceil(words / 200));

    const statsEl = document.getElementById('pdf2text-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span class="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold">${words.toLocaleString()} words</span>
        <span class="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold">${chars.toLocaleString()} chars</span>
        <span class="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold">${lines.toLocaleString()} lines</span>
        <span class="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg font-semibold">~${readMin} min read</span>
      `;
    }
  },

  copyText: () => {
    const text = document.getElementById('pdf2text-output')?.value || '';
    if (!text.trim()) {
      PrivaUtils.showToast('No text to copy.', 'error');
      return;
    }
    navigator.clipboard.writeText(text);
    PrivaUtils.showToast('Extracted text copied to clipboard!', 'success');
  },

  downloadAs: (format) => {
    const text = document.getElementById('pdf2text-output')?.value || '';
    if (!text.trim()) {
      PrivaUtils.showToast('No text available to export.', 'error');
      return;
    }

    const baseName = Pdf2TextTool.fileName || 'extracted_document';

    if (format === 'txt') {
      PrivaUtils.downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${baseName}.txt`);
      PrivaUtils.showToast('Downloaded as Plain Text (.txt)!', 'success');
    } else if (format === 'md') {
      const mdContent = Pdf2TextTool.pagesText.map(p => `## Page ${p.pageNum}\n\n${p.text}\n`).join('\n---\n\n');
      PrivaUtils.downloadBlob(new Blob([mdContent], { type: 'text/markdown;charset=utf-8' }), `${baseName}.md`);
      PrivaUtils.showToast('Downloaded as Markdown (.md)!', 'success');
    } else if (format === 'doc') {
      // UTF-8 BOM Word-compatible HTML wrapper (opens cleanly in MS Word & Google Docs including Hindi/Devanagari)
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .split('\n')
        .map(line => {
          if (line.startsWith('=== Page ') && line.endsWith('===')) {
            return `<h3 style="color:#4f46e5;margin-top:18px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">${line.replace(/=/g, '').trim()}</h3>`;
          }
          return line.trim() ? `<p style="margin:6px 0;line-height:1.6;">${line}</p>` : '<br/>';
        })
        .join('\n');

      const docHtml = `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${baseName}</title></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1e293b;">${escaped}</body></html>`;

      PrivaUtils.downloadBlob(new Blob([docHtml], { type: 'application/msword;charset=utf-8' }), `${baseName}.doc`);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Downloaded Word-compatible (.doc) file!', 'success');
    }
  },

  reset: () => {
    Pdf2TextTool.pdfDoc = null;
    Pdf2TextTool.pagesText = [];
    const area = document.getElementById('pdf2text-output');
    if (area) area.value = '';
    const fileInput = document.getElementById('pdf2text-file-input');
    if (fileInput) fileInput.value = '';
    document.getElementById('pdf2text-workspace')?.classList.add('hidden');
    document.getElementById('pdf2text-dropzone')?.classList.remove('hidden');
  }
};
