// AI OCR Scanner — Extract Searchable Text from Scanned PDFs & Images via WebAssembly Tesseract.js
window.OcrTool = {
  sourceImages: [], // Array of { name, dataUrl, width, height }
  isProcessing: false,

  init: () => {
    const fileInput = document.getElementById('ocr-file-input');
    const dropzone = document.getElementById('ocr-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          OcrTool.loadFile(e.target.files[0]);
        }
      });
    }

    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-indigo-500', 'bg-indigo-50/50');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          OcrTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }
  },

  loadSampleReceipt: () => {
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('RPR DIGITAL LABS — SCANNED RECEIPT', 42, 68);

    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Invoice No: INV-2026-8841     Date: 27 Nov 2026', 42, 122);
    ctx.fillText('Customer: Future Tech Enterprises Ltd.', 42, 160);
    ctx.fillText('1. On-Device AI Document License ........ $199.00', 42, 220);
    ctx.fillText('2. Privacy Compliance Audit ............... $120.00', 42, 260);

    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('TOTAL PAID: $319.00 (100% Verified)', 42, 336);

    OcrTool.sourceImages = [{
      name: 'sample_scanned_receipt.png',
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height
    }];

    OcrTool.showWorkspace('sample_scanned_receipt.png • 1 Scanned Image');
    PrivaUtils.showToast('Sample scanned receipt loaded! Click "Run AI OCR Scan".', 'info');
  },

  loadFile: async (file) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    const isPdf = file.type.includes('pdf') || lower.endsWith('.pdf');
    const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(lower);

    if (!isPdf && !isImg) {
      PrivaUtils.showToast('Please select a PDF or Image file (PNG, JPG, WebP).', 'error');
      return;
    }

    OcrTool.sourceImages = [];

    if (isImg) {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      OcrTool.sourceImages.push({ name: file.name, dataUrl });
      OcrTool.showWorkspace(`${file.name} (${PrivaUtils.formatBytes(file.size)})`);
      return;
    }

    // Rasterize scanned PDF pages to high-DPI PNG canvases using PDF.js
    try {
      PrivaUtils.showProgress('Preparing Scanned PDF for OCR', 15, 'Rendering pages...');
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      PrivaUtils.initPdfJs();
      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const limit = Math.min(pdfDoc.numPages, 15); // Keep memory responsive

      for (let i = 1; i <= limit; i++) {
        PrivaUtils.updateProgress(Math.round(15 + (i / limit) * 75), `Rasterizing page ${i} of ${limit}...`);
        const page = await pdfDoc.getPage(i);
        const vp = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        OcrTool.sourceImages.push({
          name: `${file.name} (Page ${i})`,
          dataUrl: canvas.toDataURL('image/png')
        });
        canvas.width = 0;
        canvas.height = 0;
      }

      PrivaUtils.hideProgress();
      const note = pdfDoc.numPages > 15 ? ` (First 15 of ${pdfDoc.numPages} pages loaded)` : '';
      OcrTool.showWorkspace(`${file.name} • ${limit} page(s)${note}`);
    } catch (err) {
      console.error(err);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Could not read PDF: ' + err.message, 'error');
    }
  },

  showWorkspace: (metaText) => {
    document.getElementById('ocr-dropzone')?.classList.add('hidden');
    document.getElementById('ocr-workspace')?.classList.remove('hidden');
    const metaEl = document.getElementById('ocr-file-meta');
    if (metaEl) metaEl.textContent = metaText;

    const previewImg = document.getElementById('ocr-preview-img');
    if (previewImg && OcrTool.sourceImages[0]) {
      previewImg.src = OcrTool.sourceImages[0].dataUrl;
    }
    const outputEl = document.getElementById('ocr-output-text');
    if (outputEl) outputEl.value = '';
    const confEl = document.getElementById('ocr-confidence-badge');
    if (confEl) confEl.classList.add('hidden');
  },

  runOcr: async () => {
    if (OcrTool.sourceImages.length === 0 || OcrTool.isProcessing) return;

    const lang = document.getElementById('ocr-lang-select')?.value || 'eng';
    const btn = document.getElementById('ocr-run-btn');
    const origHtml = btn?.innerHTML;
    OcrTool.isProcessing = true;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Running AI OCR...';
    }

    try {
      PrivaUtils.showProgress('Loading On-Device OCR Engine', 15, 'Initializing Tesseract WebAssembly...');
      if (!window.Tesseract) {
        await PrivaUtils.loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
      }
      if (!window.Tesseract) throw new Error('Tesseract OCR failed to initialize.');

      PrivaUtils.updateProgress(30, `Loading "${lang}" language model locally...`);
      const worker = await Tesseract.createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            PrivaUtils.updateProgress(Math.round(35 + m.progress * 55), `Scanning text (${Math.round(m.progress * 100)}%)...`);
          }
        }
      });

      const chunks = [];
      let totalConf = 0;

      for (let i = 0; i < OcrTool.sourceImages.length; i++) {
        const item = OcrTool.sourceImages[i];
        PrivaUtils.updateProgress(Math.round(35 + (i / OcrTool.sourceImages.length) * 55), `Reading ${item.name}...`);
        const { data } = await worker.recognize(item.dataUrl);
        totalConf += data.confidence || 0;
        const header = OcrTool.sourceImages.length > 1 ? `=== Page ${i + 1} ===\n` : '';
        chunks.push(header + (data.text || '').trim());
      }

      await worker.terminate();

      const combined = chunks.join('\n\n');
      const avgConf = Math.round(totalConf / OcrTool.sourceImages.length);
      const outputEl = document.getElementById('ocr-output-text');
      if (outputEl) outputEl.value = combined;

      const confEl = document.getElementById('ocr-confidence-badge');
      if (confEl) {
        confEl.textContent = `AI Confidence: ${avgConf}%`;
        confEl.classList.remove('hidden');
      }

      PrivaUtils.hideProgress();
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`OCR completed (${avgConf}% confidence)!`, 'success');
    } catch (err) {
      console.error(err);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('OCR Error: ' + err.message, 'error');
    } finally {
      OcrTool.isProcessing = false;
      if (btn && origHtml) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  },

  copyText: () => {
    const val = document.getElementById('ocr-output-text')?.value || '';
    if (!val.trim()) return PrivaUtils.showToast('Run OCR first to copy text.', 'error');
    navigator.clipboard.writeText(val);
    PrivaUtils.showToast('OCR text copied to clipboard!', 'success');
  },

  downloadTxt: () => {
    const val = document.getElementById('ocr-output-text')?.value || '';
    if (!val.trim()) return PrivaUtils.showToast('Run OCR first to download.', 'error');
    PrivaUtils.downloadBlob(new Blob([val], { type: 'text/plain;charset=utf-8' }), 'ocr_extracted_text.txt');
  },

  reset: () => {
    OcrTool.sourceImages = [];
    const fi = document.getElementById('ocr-file-input');
    if (fi) fi.value = '';
    document.getElementById('ocr-workspace')?.classList.add('hidden');
    document.getElementById('ocr-dropzone')?.classList.remove('hidden');
  }
};
