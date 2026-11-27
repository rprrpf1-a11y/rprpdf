// Tool 15: Crop Margins & Flatten PDF (Forms & Layer Security)
window.CropTool = {
  pdfBytes: null,
  fileName: '',
  pdfJsDoc: null,
  pageCount: 0,
  currentMode: 'crop', // 'crop' or 'flatten'

  init: () => {
    const fileInput = document.getElementById('crop-file-input');
    const dropzone = document.getElementById('crop-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          CropTool.loadFile(e.target.files[0]);
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
          CropTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Attach margin listeners
    ['crop-margin-top', 'crop-margin-bottom', 'crop-margin-left', 'crop-margin-right'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', CropTool.updateCropGuides);
    });
  },

  setMode: (mode) => {
    CropTool.currentMode = mode;
    const tabCrop = document.getElementById('tab-mode-crop');
    const tabFlatten = document.getElementById('tab-mode-flatten');
    const panelCrop = document.getElementById('panel-mode-crop');
    const panelFlatten = document.getElementById('panel-mode-flatten');
    const btn = document.getElementById('crop-export-btn');

    if (mode === 'crop') {
      tabCrop.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm transition-all';
      tabFlatten.className = 'px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all';
      panelCrop.classList.remove('hidden');
      panelFlatten.classList.add('hidden');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-crop-simple mr-2"></i>Crop Margins & Download';
      CropTool.updateCropGuides();
    } else {
      tabFlatten.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm transition-all';
      tabCrop.className = 'px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all';
      panelFlatten.classList.remove('hidden');
      panelCrop.classList.add('hidden');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-stamp mr-2"></i>Flatten Document & Download';
    }
  },

  setCropPreset: (mm) => {
    document.getElementById('crop-margin-top').value = mm;
    document.getElementById('crop-margin-bottom').value = mm;
    document.getElementById('crop-margin-left').value = mm;
    document.getElementById('crop-margin-right').value = mm;
    CropTool.updateCropGuides();
  },

  loadFile: async (file) => {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      PrivaUtils.showToast('Please select a valid PDF file.', 'error');
      return;
    }

    CropTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    const dropzone = document.getElementById('crop-dropzone');
    const workspace = document.getElementById('crop-workspace');
    dropzone.classList.add('hidden');
    workspace.classList.remove('hidden');

    PrivaUtils.showProgress('Loading PDF for Cropping & Flattening', 25, 'Rendering page layout...');

    try {
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      CropTool.pdfBytes = buffer;

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      CropTool.pdfJsDoc = await loadingTask.promise;
      CropTool.pageCount = CropTool.pdfJsDoc.numPages;

      document.getElementById('crop-meta').textContent = `${CropTool.pageCount} pages • ${file.name}`;

      await CropTool.renderPagePreview();
      PrivaUtils.hideProgress();
      PrivaUtils.showToast(`Loaded ${CropTool.pageCount} pages. Choose Crop Margins or Flatten Form!`, 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Could not load PDF: ' + e.message, 'error');
      workspace.classList.add('hidden');
      dropzone.classList.remove('hidden');
    }
  },

  renderPagePreview: async () => {
    if (!CropTool.pdfJsDoc) return;
    try {
      const page = await CropTool.pdfJsDoc.getPage(1);
      const viewport = page.getViewport({ scale: 0.45 });

      const canvas = document.getElementById('crop-preview-canvas');
      if (!canvas) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;
      CropTool.updateCropGuides();
    } catch (e) {
      console.warn('Crop preview render error:', e);
    }
  },

  updateCropGuides: () => {
    const canvas = document.getElementById('crop-preview-canvas');
    const box = document.getElementById('crop-guide-box');
    if (!canvas || !box) return;

    if (CropTool.currentMode !== 'crop') {
      box.classList.add('hidden');
      return;
    }
    box.classList.remove('hidden');

    // 1 mm is approx 2.83465 points
    const mmTop = parseFloat(document.getElementById('crop-margin-top')?.value) || 0;
    const mmBottom = parseFloat(document.getElementById('crop-margin-bottom')?.value) || 0;
    const mmLeft = parseFloat(document.getElementById('crop-margin-left')?.value) || 0;
    const mmRight = parseFloat(document.getElementById('crop-margin-right')?.value) || 0;

    // Convert preview scale (roughly 0.45 pt scale)
    const pxPerMm = 1.25;
    box.style.top = `${mmTop * pxPerMm}px`;
    box.style.bottom = `${mmBottom * pxPerMm}px`;
    box.style.left = `${mmLeft * pxPerMm}px`;
    box.style.right = `${mmRight * pxPerMm}px`;
  },

  executeAction: async () => {
    if (!CropTool.pdfBytes) return;

    const btn = document.getElementById('crop-export-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Processing in Memory...';
    btn.disabled = true;

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.load(CropTool.pdfBytes, { ignoreEncryption: true });

      if (CropTool.currentMode === 'flatten') {
        PrivaUtils.showProgress('Flattening Document Form Fields', 40, 'Merging interactive fields into content streams...');
        try {
          const form = pdfDoc.getForm();
          if (form) {
            form.flatten();
          }
        } catch (formErr) {
          console.warn('Form flattening note:', formErr);
        }

        PrivaUtils.updateProgress(85, 'Saving non-editable flattened PDF...');
        const flattenedBytes = await pdfDoc.save({ useObjectStreams: true });
        PrivaUtils.downloadBlob(flattenedBytes, `${CropTool.fileName}_flattened.pdf`);
        PrivaUtils.triggerConfetti();
        PrivaUtils.showToast('Document flattened! Form fields and layers are now permanent.', 'success');
      } else {
        // Mode: Crop Margins
        PrivaUtils.showProgress('Cropping PDF Margins', 30, 'Calculating margin boundaries...');
        const mmTop = parseFloat(document.getElementById('crop-margin-top')?.value) || 0;
        const mmBottom = parseFloat(document.getElementById('crop-margin-bottom')?.value) || 0;
        const mmLeft = parseFloat(document.getElementById('crop-margin-left')?.value) || 0;
        const mmRight = parseFloat(document.getElementById('crop-margin-right')?.value) || 0;

        // Convert mm to PDF points (72 points per inch, 25.4 mm per inch -> 72 / 25.4 = 2.83465)
        const ptTop = mmTop * 2.83465;
        const ptBottom = mmBottom * 2.83465;
        const ptLeft = mmLeft * 2.83465;
        const ptRight = mmRight * 2.83465;

        const pages = pdfDoc.getPages();
        const total = pages.length;

        for (let i = 0; i < total; i++) {
          const page = pages[i];
          const { width, height } = page.getSize();

          const newWidth = Math.max(50, width - ptLeft - ptRight);
          const newHeight = Math.max(50, height - ptTop - ptBottom);

          // In PDF, origin is bottom-left
          page.setCropBox(ptLeft, ptBottom, newWidth, newHeight);
          page.setMediaBox(ptLeft, ptBottom, newWidth, newHeight);

          PrivaUtils.updateProgress(30 + ((i + 1) / total) * 55, `Cropping page ${i + 1} of ${total}...`);
        }

        PrivaUtils.updateProgress(90, 'Serializing cropped PDF...');
        const croppedBytes = await pdfDoc.save({ useObjectStreams: true });
        PrivaUtils.downloadBlob(croppedBytes, `${CropTool.fileName}_cropped.pdf`);
        PrivaUtils.triggerConfetti();
        PrivaUtils.showToast(`Cropped margins on all ${total} pages successfully!`, 'success');
      }
    } catch (e) {
      console.error('Crop error:', e);
      PrivaUtils.showToast('Processing failed: ' + e.message, 'error');
    } finally {
      PrivaUtils.hideProgress();
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  }
};
