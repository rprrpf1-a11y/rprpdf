// Watermark PDF Tool — In-Browser Client-Side Diagonal Watermarking
window.WatermarkTool = {
  pdfBytes: null,
  fileName: '',
  pageCount: 0,

  init: () => {
    const fileInput = document.getElementById('watermark-file-input');
    const dropzone = document.getElementById('watermark-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          WatermarkTool.loadFile(e.target.files[0]);
          fileInput.value = '';
        }
      });
    }

    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-rose-500', 'bg-rose-50/50');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-rose-500', 'bg-rose-50/50');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-rose-500', 'bg-rose-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          WatermarkTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Live preview update listeners
    const textInput = document.getElementById('watermark-text-input');
    const opacityInput = document.getElementById('watermark-opacity-input');
    const sizeInput = document.getElementById('watermark-size-input');

    if (textInput) textInput.addEventListener('input', WatermarkTool.updateLivePreview);
    if (opacityInput) {
      opacityInput.addEventListener('input', (e) => {
        const valEl = document.getElementById('watermark-opacity-val');
        if (valEl) valEl.textContent = `${Math.round(e.target.value * 100)}%`;
        WatermarkTool.updateLivePreview();
      });
    }
    if (sizeInput) sizeInput.addEventListener('input', WatermarkTool.updateLivePreview);
  },

  // Reset tool to select a different PDF
  reset: () => {
    WatermarkTool.pdfBytes = null;
    WatermarkTool.fileName = '';
    WatermarkTool.pageCount = 0;

    const dropzone = document.getElementById('watermark-dropzone');
    const workspace = document.getElementById('watermark-workspace');
    if (dropzone) dropzone.classList.remove('hidden');
    if (workspace) workspace.classList.add('hidden');
  },

  loadFile: async (file) => {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      PrivaUtils.showToast('Please select a valid PDF file.', 'error');
      return;
    }

    WatermarkTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    const dropzone = document.getElementById('watermark-dropzone');
    const workspace = document.getElementById('watermark-workspace');
    if (dropzone) dropzone.classList.add('hidden');
    if (workspace) workspace.classList.remove('hidden');

    PrivaUtils.showProgress('Loading PDF', 30, 'Reading document structure in memory...');

    try {
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      WatermarkTool.pdfBytes = buffer;

      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      WatermarkTool.pageCount = doc.getPageCount();

      const metaEl = document.getElementById('watermark-meta');
      if (metaEl) metaEl.textContent = `${WatermarkTool.pageCount} pages • ${file.name}`;
      
      WatermarkTool.updateLivePreview();
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('PDF loaded. Customize your watermark!', 'success');
    } catch (e) {
      console.error('Watermark load error:', e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Could not load PDF: ' + (e.message || 'Corrupt format'), 'error');
      if (workspace) workspace.classList.add('hidden');
      if (dropzone) dropzone.classList.remove('hidden');
    }
  },

  setPreset: (presetText) => {
    const input = document.getElementById('watermark-text-input');
    if (input) {
      input.value = presetText;
      const langSelect = document.getElementById('watermark-lang-select');
      if (PrivaUtils.isDevanagari(presetText) && langSelect) {
        langSelect.value = 'hindi';
      }
      WatermarkTool.updateLivePreview();
    }
  },

  updateFontLanguage: () => {
    WatermarkTool.updateLivePreview();
  },

  updateLivePreview: () => {
    const text = document.getElementById('watermark-text-input')?.value || 'CONFIDENTIAL';
    const opacity = document.getElementById('watermark-opacity-input')?.value || '0.3';
    const lang = document.getElementById('watermark-lang-select')?.value || 'auto';
    const previewEl = document.getElementById('watermark-preview-stamp');
    
    if (previewEl) {
      previewEl.textContent = text;
      previewEl.style.opacity = opacity;
      if (lang === 'hindi' || PrivaUtils.isDevanagari(text)) {
        previewEl.style.fontFamily = "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif";
        previewEl.style.letterSpacing = 'normal';
      } else {
        previewEl.style.fontFamily = "inherit";
        previewEl.style.letterSpacing = '0.05em';
      }
    }
  },

  applyWatermark: async () => {
    if (!WatermarkTool.pdfBytes) {
      PrivaUtils.showToast('Please load a PDF document first.', 'error');
      return;
    }

    const text = document.getElementById('watermark-text-input')?.value.trim() || 'CONFIDENTIAL';
    const opacity = parseFloat(document.getElementById('watermark-opacity-input')?.value) || 0.3;
    const fontSize = parseInt(document.getElementById('watermark-size-input')?.value, 10) || 50;
    const langChoice = document.getElementById('watermark-lang-select')?.value || 'auto';

    const btn = document.getElementById('watermark-export-btn');
    const originalText = btn ? btn.innerHTML : 'Apply Watermark & Download';
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Watermarking in browser...';
      btn.disabled = true;
    }

    PrivaUtils.showProgress('Applying Watermark', 25, 'Loading PDF document layers...');

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument, rgb, degrees } = PDFLib;
      const pdfDoc = await PDFDocument.load(WatermarkTool.pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;

      const isDevanagari = langChoice === 'hindi' || PrivaUtils.isDevanagari(text);
      const isUnicode = isDevanagari || (langChoice !== 'standard') || PrivaUtils.isUnicodeText(text);

      // Render high-DPI crisp watermark stamp with full text shaping support
      const fontStack = isDevanagari 
        ? "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif" 
        : "'Inter', -apple-system, system-ui, sans-serif";

      const imgInfo = PrivaUtils.renderTextToImage(text, {
        fontSize: fontSize,
        color: '#e11d48', // vibrant red / rose
        isBold: true,
        fontFamily: fontStack,
        scale: 3
      });

      const embeddedImg = await pdfDoc.embedPng(imgInfo.dataUrl);

      const rad = (45 * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        PrivaUtils.updateProgress(
          30 + (i / totalPages) * 55,
          `Watermarking page ${i + 1} of ${totalPages}...`
        );

        // Center of rotated rectangle of width w and height h
        const cx = (imgInfo.width * cos - imgInfo.height * sin) / 2;
        const cy = (imgInfo.width * sin + imgInfo.height * cos) / 2;

        page.drawImage(embeddedImg, {
          x: width / 2 - cx,
          y: height / 2 - cy,
          width: imgInfo.width,
          height: imgInfo.height,
          opacity: opacity,
          rotate: degrees(45)
        });
      }

      PrivaUtils.updateProgress(90, 'Saving watermarked document...');
      const watermarkedBytes = await pdfDoc.save({ useObjectStreams: true });

      PrivaUtils.downloadBlob(watermarkedBytes, `${WatermarkTool.fileName}_watermarked.pdf`);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`Watermark applied to all ${totalPages} pages!`, 'success');
    } catch (e) {
      console.error('Watermark error:', e);
      PrivaUtils.showToast('Failed to apply watermark: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      PrivaUtils.hideProgress();
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  }
};
