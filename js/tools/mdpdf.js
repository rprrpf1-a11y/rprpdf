// Markdown, AI Reports & Resume to PDF Studio — Live Split Preview + Clean PDF Export
window.MdPdfTool = {
  theme: 'indigo',

  samples: {
    report: `# Q4 2026 Privacy Engineering Briefing\n\nPrepared locally in **RprPDF Markdown Studio**. All sensitive strategy content stays 100% inside your browser.\n\n## Executive Highlights\n- **Zero Cloud Risk**: Files execute strictly in WebAssembly memory.\n- **34 Integrated Tools**: Covering PDF security, AI OCR, invoicing, and developer tools.\n- **82% Faster Workflows**: Instant processing with zero server upload queues.\n\n## Rollout Milestones\n- Phase 1: In-place PDF editing & Hindi Devanagari support (Completed)\n- Phase 2: On-device Tesseract OCR & AES-256-GCM File Vault (Active)\n\n> Privacy is not an optional add-on; it is the baseline architecture for modern document tools.`,
    resume: `# Alex Rivera\nSenior Full-Stack & Privacy Engineer | San Francisco, CA | alex@example.com\n\n## Professional Summary\nSystems engineer with 7+ years building client-side WebAssembly engines, high-performance SaaS applications, and privacy-first developer platforms.\n\n## Core Technical Skills\n- **Languages**: TypeScript, JavaScript, Python, WebAssembly\n- **Document & AI**: PDF.js, PDF-Lib, Web Crypto API, Tesseract OCR\n- **Cloud & Edge**: Render Static Edge CDN, Service Workers, PWA\n\n## Experience\n### Principal UI Architect — Rpr Studio (2023 – Present)\n- Designed a 34-tool serverless utility platform serving fast client-side document processing.\n- Cut page load blocking time by over 60% using deferred asset pipelines.`
  },

  init: () => {
    const editor = document.getElementById('md-editor-input');
    if (editor) {
      editor.addEventListener('input', MdPdfTool.renderPreview);
      if (!editor.value.trim()) {
        editor.value = MdPdfTool.samples.report;
      }
      MdPdfTool.renderPreview();
    }
  },

  loadSample: (key) => {
    const editor = document.getElementById('md-editor-input');
    if (editor && MdPdfTool.samples[key]) {
      editor.value = MdPdfTool.samples[key];
      MdPdfTool.renderPreview();
      PrivaUtils.showToast('Markdown template loaded!', 'info');
    }
  },

  setTheme: (theme) => {
    MdPdfTool.theme = theme;
    MdPdfTool.renderPreview();
  },

  escapeHtml: (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),

  // Lightweight, XSS-safe Markdown to HTML renderer
  markdownToHtml: (md) => {
    const accent = MdPdfTool.theme === 'emerald' ? '#059669' : MdPdfTool.theme === 'slate' ? '#0f172a' : '#4f46e5';
    const lines = md.split('\n');
    const html = [];
    let inList = false;

    const inlineFormat = (txt) => MdPdfTool.escapeHtml(txt)
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[11px]">$1</code>');

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) { html.push('<ul class="list-disc pl-5 space-y-1 my-2 text-slate-700 text-xs sm:text-sm">'); inList = true; }
        html.push(`<li>${inlineFormat(line.slice(2))}</li>`);
        continue;
      } else if (inList) {
        html.push('</ul>');
        inList = false;
      }

      if (line.startsWith('# ')) {
        html.push(`<h1 class="text-2xl font-extrabold text-slate-900 pb-2 mb-3 border-b-2" style="border-color:${accent}">${inlineFormat(line.slice(2))}</h1>`);
      } else if (line.startsWith('## ')) {
        html.push(`<h2 class="text-base font-bold mt-4 mb-1.5" style="color:${accent}">${inlineFormat(line.slice(3))}</h2>`);
      } else if (line.startsWith('### ')) {
        html.push(`<h3 class="text-sm font-bold text-slate-800 mt-3 mb-1">${inlineFormat(line.slice(4))}</h3>`);
      } else if (line.startsWith('> ')) {
        html.push(`<blockquote class="border-l-4 pl-3 py-1 my-3 italic text-slate-600 bg-slate-50 rounded-r-lg text-xs sm:text-sm" style="border-color:${accent}">${inlineFormat(line.slice(2))}</blockquote>`);
      } else if (!line.trim()) {
        html.push('<div class="h-2"></div>');
      } else {
        html.push(`<p class="text-xs sm:text-sm text-slate-700 leading-relaxed my-1.5">${inlineFormat(line)}</p>`);
      }
    }
    if (inList) html.push('</ul>');
    return html.join('\n');
  },

  renderPreview: () => {
    const md = document.getElementById('md-editor-input')?.value || '';
    const preview = document.getElementById('md-live-preview');
    if (preview) preview.innerHTML = MdPdfTool.markdownToHtml(md);
  },

  downloadPdf: async () => {
    const md = document.getElementById('md-editor-input')?.value || '';
    if (!md.trim()) return PrivaUtils.showToast('Write some Markdown first.', 'error');

    try {
      PrivaUtils.showProgress('Building Styled PDF', 35, 'Initializing vector PDF writer...');
      if (!window.jspdf) {
        await PrivaUtils.loadScript('js/vendor/jspdf.umd.min.js').catch(() =>
          PrivaUtils.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        );
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const rgb = MdPdfTool.theme === 'emerald' ? [5, 150, 105] : MdPdfTool.theme === 'slate' ? [15, 23, 42] : [79, 70, 229];

      let y = 55;
      const maxW = 505;
      const checkPage = (needed = 22) => {
        if (y + needed > 790) {
          doc.addPage();
          y = 55;
        }
      };

      for (const rawLine of md.split('\n')) {
        const cleanInline = (s) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1');
        const line = rawLine.trimEnd();

        if (!line.trim()) { y += 8; continue; }

        if (line.startsWith('# ')) {
          checkPage(36);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(20);
          doc.setTextColor(15, 23, 42);
          const wrapped = doc.splitTextToSize(cleanInline(line.slice(2)), maxW);
          doc.text(wrapped, 45, y);
          y += wrapped.length * 24 + 4;
          doc.setDrawColor(...rgb);
          doc.setLineWidth(1.5);
          doc.line(45, y - 6, 550, y - 6);
          y += 10;
        } else if (line.startsWith('## ')) {
          checkPage(26);
          y += 6;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(...rgb);
          const wrapped = doc.splitTextToSize(cleanInline(line.slice(3)), maxW);
          doc.text(wrapped, 45, y);
          y += wrapped.length * 16 + 4;
        } else if (line.startsWith('### ')) {
          checkPage(22);
          y += 4;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(30, 41, 59);
          const wrapped = doc.splitTextToSize(cleanInline(line.slice(4)), maxW);
          doc.text(wrapped, 45, y);
          y += wrapped.length * 14 + 2;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10.5);
          doc.setTextColor(51, 65, 85);
          const wrapped = doc.splitTextToSize('•  ' + cleanInline(line.slice(2)), maxW - 14);
          checkPage(wrapped.length * 14 + 4);
          doc.text(wrapped, 58, y);
          y += wrapped.length * 14 + 3;
        } else if (line.startsWith('> ')) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10.5);
          doc.setTextColor(71, 85, 105);
          const wrapped = doc.splitTextToSize(cleanInline(line.slice(2)), maxW - 20);
          checkPage(wrapped.length * 14 + 10);
          doc.setDrawColor(...rgb);
          doc.setLineWidth(2);
          doc.line(50, y - 9, 50, y + (wrapped.length - 1) * 14 + 3);
          doc.text(wrapped, 62, y);
          y += wrapped.length * 14 + 8;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10.5);
          doc.setTextColor(51, 65, 85);
          const wrapped = doc.splitTextToSize(cleanInline(line), maxW);
          checkPage(wrapped.length * 14 + 4);
          doc.text(wrapped, 45, y);
          y += wrapped.length * 14 + 4;
        }
      }

      doc.save('rprpdf_markdown_document.pdf');
      PrivaUtils.hideProgress();
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Formatted Markdown PDF downloaded!', 'success');
    } catch (err) {
      console.error(err);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('PDF export error: ' + err.message, 'error');
    }
  },

  downloadHtml: () => {
    const body = document.getElementById('md-live-preview')?.innerHTML || '';
    const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>RprPDF Export</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:780px;margin:40px auto;padding:0 20px;line-height:1.6;color:#1e293b;}</style></head><body>${body}</body></html>`;
    PrivaUtils.downloadBlob(new Blob([htmlDoc], { type: 'text/html;charset=utf-8' }), 'document_export.html');
    PrivaUtils.showToast('Styled HTML document downloaded!', 'success');
  }
};
