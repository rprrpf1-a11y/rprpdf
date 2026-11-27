// On-Device AI Document Assistant — Built-in Web AI (Gemini Nano) + Offline NLP Extractive Summarizer
window.AiHelperTool = {
  hasWebAi: false,

  init: async () => {
    const fileInput = document.getElementById('ai-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          AiHelperTool.loadPdfFile(e.target.files[0]);
        }
      });
    }

    // Feature-detect native Chrome/Edge On-Device Web AI (LanguageModel / Summarizer APIs)
    const badge = document.getElementById('ai-engine-badge');
    try {
      const lm = window.LanguageModel || window.ai?.languageModel;
      if (lm) {
        const avail = typeof lm.availability === 'function'
          ? await lm.availability()
          : (await lm.capabilities?.())?.available;
        if (avail === 'available' || avail === 'readily') {
          AiHelperTool.hasWebAi = true;
        }
      }
    } catch (e) { /* Fall back gracefully to local extractive NLP */ }

    if (badge) {
      badge.innerHTML = AiHelperTool.hasWebAi
        ? '<i class="fa-solid fa-microchip mr-1.5"></i> On-Device Web AI (Gemini Nano Ready)'
        : '<i class="fa-solid fa-bolt mr-1.5"></i> Offline NLP Engine (Instant & Private)';
    }
  },

  loadSampleText: () => {
    const sample = `RprPDF Privacy Architecture Report 2026\n\nUnlike conventional cloud PDF editors that upload confidential tax filings, bank statements, and legal NDAs to external storage buckets, RprPDF executes all document transformations strictly inside the local browser sandbox using WebAssembly.\n\nIn our Q4 2026 security audit, zero bytes of document payload exited the client device across all 34 integrated tools. Client-side execution reduces latency by 82% on large 50MB documents while eliminating server hosting risk.\n\nAction Items & Recommendations:\n1. Adopt zero-upload in-browser workflows for enterprise HR and legal contracts.\n2. Verify digital signatures and redact sensitive ID numbers before archiving.\n3. Schedule quarterly PDF archival encryption using AES-256-GCM hardware keys by December 15, 2026.`;

    const area = document.getElementById('ai-source-input');
    if (area) {
      area.value = sample;
      AiHelperTool.analyze();
      PrivaUtils.showToast('Sample document loaded and analyzed locally!', 'info');
    }
  },

  loadPdfFile: async (file) => {
    if (!file) return;
    if (file.type === 'text/plain' || /\.(txt|md)$/i.test(file.name)) {
      const text = await file.text();
      const area = document.getElementById('ai-source-input');
      if (area) area.value = text;
      AiHelperTool.analyze();
      return;
    }

    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return PrivaUtils.showToast('Drop a PDF, TXT, or Markdown file to summarize.', 'error');
    }

    try {
      PrivaUtils.showProgress('Reading Document Locally', 25, 'Extracting text layers...');
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      PrivaUtils.initPdfJs();
      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      let fullText = '';

      for (let i = 1; i <= Math.min(pdfDoc.numPages, 25); i++) {
        PrivaUtils.updateProgress(Math.round(25 + (i / pdfDoc.numPages) * 70), `Reading page ${i}...`);
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(it => it.str).join(' ') + '\n\n';
      }

      const area = document.getElementById('ai-source-input');
      if (area) area.value = fullText.trim();
      PrivaUtils.hideProgress();
      AiHelperTool.analyze();
    } catch (err) {
      console.error(err);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Failed to read PDF: ' + err.message, 'error');
    }
  },

  analyze: async () => {
    const raw = (document.getElementById('ai-source-input')?.value || '').trim();
    if (!raw) {
      PrivaUtils.showToast('Paste text or load a PDF document first.', 'error');
      return;
    }

    const bulletCount = parseInt(document.getElementById('ai-bullet-count')?.value || '5', 10);
    const words = raw.split(/\s+/).filter(Boolean);
    const sentences = raw
      .replace(/\n+/g, '. ')
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 25);

    // Build stopword-filtered frequency table for deterministic TF scoring
    const stop = new Set(['about', 'above', 'after', 'again', 'against', 'all', 'also', 'and', 'any', 'are', 'because', 'been', 'before', 'being', 'between', 'both', 'but', 'can', 'could', 'did', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'here', 'how', 'into', 'its', 'more', 'most', 'not', 'now', 'only', 'other', 'our', 'out', 'over', 'own', 'same', 'should', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'under', 'until', 'very', 'was', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'why', 'will', 'with', 'would', 'your']);

    const freq = {};
    words.forEach(w => {
      const clean = w.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]/g, '');
      if (clean.length > 3 && !stop.has(clean)) {
        freq[clean] = (freq[clean] || 0) + 1;
      }
    });

    const topKeywords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(e => e[0]);

    // Score sentences by keyword density + position boost (intro/action bias)
    const scored = sentences.map((s, idx) => {
      const tokens = s.toLowerCase().split(/\W+/);
      let score = 0;
      tokens.forEach(t => { if (freq[t]) score += freq[t]; });
      score = score / Math.max(4, Math.sqrt(tokens.length));
      if (idx === 0) score *= 1.25;
      if (/\b(must|should|recommend|total|percent|%|\$|\d{4})\b/i.test(s)) score *= 1.15;
      return { s, idx, score };
    });

    const selected = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, bulletCount)
      .sort((a, b) => a.idx - b.idx)
      .map(item => item.s);

    // Optional native on-device Web AI enhancement if browser supports Gemini Nano
    let webAiSummary = '';
    if (AiHelperTool.hasWebAi) {
      try {
        const lm = window.LanguageModel || window.ai?.languageModel;
        const session = await lm.create();
        webAiSummary = await session.prompt(
          `Summarize the following document in ${bulletCount} concise bullet points:\n\n${raw.slice(0, 8000)}`
        );
        session.destroy?.();
      } catch (e) {
        webAiSummary = '';
      }
    }

    // Extract metrics / dates / entities
    const metrics = Array.from(new Set(raw.match(/(\$[\d,.]+|₹[\d,.]+|\d+(?:\.\d+)?%|\b\d{4}\b)/g) || [])).slice(0, 10);
    const readMin = Math.max(1, Math.ceil(words.length / 210));

    // Render insights
    const statsEl = document.getElementById('ai-stats-bar');
    if (statsEl) {
      statsEl.innerHTML = `
        <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">${words.length.toLocaleString()} words</span>
        <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">${sentences.length} sentences</span>
        <span class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold">~${readMin} min read</span>
      `;
    }

    const keywordsEl = document.getElementById('ai-keywords-list');
    if (keywordsEl) {
      keywordsEl.innerHTML = topKeywords.map(k =>
        `<span class="px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold">#${k}</span>`
      ).join('') || '<span class="text-xs text-slate-400">No dominant keywords detected</span>';
    }

    const metricsEl = document.getElementById('ai-metrics-list');
    if (metricsEl) {
      metricsEl.innerHTML = metrics.map(m =>
        `<span class="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold">${m}</span>`
      ).join('') || '<span class="text-xs text-slate-400">No figures/dates extracted</span>';
    }

    const summaryEl = document.getElementById('ai-summary-output');
    if (summaryEl) {
      if (webAiSummary.trim()) {
        summaryEl.value = webAiSummary.trim();
      } else {
        summaryEl.value = selected.length > 0
          ? selected.map(s => `• ${s}`).join('\n\n')
          : raw.slice(0, 600);
      }
    }

    // Build structured clean AI Prompt Pack
    const promptEl = document.getElementById('ai-prompt-pack');
    if (promptEl) {
      promptEl.value = `Role: Act as an expert analyst.\nTask: Review the key facts below, highlight any risks or action items, and summarize next steps.\n\nKeywords: ${topKeywords.join(', ')}\nDocument Text:\n"""\n${raw.slice(0, 6000)}\n"""`;
    }
  },

  copySummary: () => {
    const val = document.getElementById('ai-summary-output')?.value || '';
    if (!val.trim()) return;
    navigator.clipboard.writeText(val);
    PrivaUtils.showToast('Summary copied to clipboard!', 'success');
  },

  copyPromptPack: () => {
    const val = document.getElementById('ai-prompt-pack')?.value || '';
    if (!val.trim()) return;
    navigator.clipboard.writeText(val);
    PrivaUtils.showToast('AI-ready structured prompt copied!', 'success');
  }
};
