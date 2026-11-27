// Tool 14: PDF to Grayscale / Black & White (Ink & Size Optimization)
window.GrayscaleTool = {
  pdfBytes: null,
  fileName: '',
  pdfJsDoc: null,
  pageCount: 0,

  init: () => {
    const fileInput = document.getElementById('grayscale-file-input');
    const dropzone = document.getElementById('grayscale-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          GrayscaleTool.loadFile(e.target.files[0]);
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
          GrayscaleTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    const modeSelect = document.getElementById('grayscale-mode-select');
    if (modeSelect) modeSelect.addEventListener('change', GrayscaleTool.renderLivePreview);
  },

  loadFile: async (file) => {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      PrivaUtils.showToast('Please select a valid PDF file.', 'error');
      return;
    }

    GrayscaleTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    const dropzone = document.getElementById('grayscale-dropzone');
    const workspace = document.getElementById('grayscale-workspace');
    dropzone.classList.add('hidden');
    workspace.classList.remove('hidden');

    PrivaUtils.showProgress('Loading PDF for Grayscale Conversion', 25, 'Initializing PDF.js engine...');

    try {
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      GrayscaleTool.pdfBytes = buffer;

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      GrayscaleTool.pdfJsDoc = await loadingTask.promise;
      GrayscaleTool.pageCount = GrayscaleTool.pdfJsDoc.numPages;

      document.getElementById('grayscale-meta').textContent = `${GrayscaleTool.pageCount} pages • ${file.name} (${PrivaUtils.formatBytes(file.size)})`;

      await GrayscaleTool.renderLivePreview();
      PrivaUtils.hideProgress();
      PrivaUtils.showToast(`Loaded ${GrayscaleTool.pageCount} pages. Ready to convert to Black & White!`, 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Could not load PDF: ' + e.message, 'error');
      workspace.classList.add('hidden');
      dropzone.classList.remove('hidden');
    }
  },

  renderLivePreview: async () => {
    if (!GrayscaleTool.pdfJsDoc) return;
    try {
      const page = await GrayscaleTool.pdfJsDoc.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });

      const canvas = document.getElementById('grayscale-preview-canvas');
      if (!canvas) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Apply selected grayscale conversion mode
      const mode = document.getElementById('grayscale-mode-select')?.value || 'clean';
      GrayscaleTool.applyGrayscaleFilterToCanvas(canvas, mode);
    } catch (e) {
      console.warn('Preview render error:', e);
    }
  },

  applyGrayscaleFilterToCanvas: (canvas, mode) => {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    const len = d.length;

    for (let i = 0; i < len; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];

      // Standard perceptual luminance formula
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;

      if (mode === 'contrast') {
        // High contrast document mode (pure dark text & clean paper white)
        if (gray > 185) gray = 255;
        else if (gray < 75) gray = 0;
        else gray = (gray - 75) * (255 / 110);
      } else if (mode === 'light') {
        // Draft / ink-saving light grayscale
        gray = Math.min(255, gray * 1.15 + 20);
      }

      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
    }

    ctx.putImageData(imgData, 0, 0);
  },

  convertPdf: async () => {
    if (!GrayscaleTool.pdfJsDoc) return;

    const btn = document.getElementById('grayscale-export-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Converting to Grayscale...';
    btn.disabled = true;

    const mode = document.getElementById('grayscale-mode-select')?.value || 'clean';
    const dpi = parseFloat(document.getElementById('grayscale-dpi-select')?.value) || 1.6;

    PrivaUtils.showProgress('Converting to Grayscale', 10, 'Processing document pages in browser...');

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument } = PDFLib;
      const newDoc = await PDFDocument.create();

      const total = GrayscaleTool.pageCount;
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      for (let i = 1; i <= total; i++) {
        PrivaUtils.updateProgress(
          10 + (i / total) * 75,
          `Converting page ${i} of ${total} to black & white (${mode})...`
        );

        const page = await GrayscaleTool.pdfJsDoc.getPage(i);
        const viewport = page.getViewport({ scale: dpi });

        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;

        await page.render({ canvasContext: tempCtx, viewport }).promise;
        GrayscaleTool.applyGrayscaleFilterToCanvas(tempCanvas, mode);

        const jpgDataUrl = tempCanvas.toDataURL('image/jpeg', 0.85);
        const embeddedImg = await newDoc.embedJpg(jpgDataUrl);

        const origViewport = page.getViewport({ scale: 1.0 });
        const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height
        });
      }

      PrivaUtils.updateProgress(90, 'Compressing and serializing black & white PDF...');
      const grayBytes = await newDoc.save({ useObjectStreams: true });

      PrivaUtils.downloadBlob(grayBytes, `${GrayscaleTool.fileName}_grayscale.pdf`);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`Converted all ${total} pages to Grayscale! Ready for ink-friendly printing.`, 'success');
    } catch (e) {
      console.error('Grayscale error:', e);
      PrivaUtils.showToast('Conversion failed: ' + e.message, 'error');
    } finally {
      PrivaUtils.hideProgress();
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  }
};
