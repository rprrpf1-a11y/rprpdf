// Convert Tool (Images to PDF & PDF to Images) — 100% In-Browser Execution
window.ConvertTool = {
  // Images to PDF state
  imagesList: [], // Array of { file, dataUrl, name, size }

  // PDF to Images state
  pdfToImgBytes: null,
  pdfToImgDoc: null,
  pdfToImgName: '',

  init: () => {
    // Images to PDF init
    const imgInput = document.getElementById('img2pdf-file-input');
    const imgDropzone = document.getElementById('img2pdf-dropzone');
    if (imgInput) {
      imgInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          ConvertTool.addImages(Array.from(e.target.files));
          imgInput.value = '';
        }
      });
    }
    if (imgDropzone) {
      imgDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imgDropzone.classList.add('border-violet-500', 'bg-violet-50/50');
      });
      imgDropzone.addEventListener('dragleave', () => {
        imgDropzone.classList.remove('border-violet-500', 'bg-violet-50/50');
      });
      imgDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        imgDropzone.classList.remove('border-violet-500', 'bg-violet-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          ConvertTool.addImages(Array.from(e.dataTransfer.files));
        }
      });
    }

    // PDF to Images init
    const pdfInput = document.getElementById('pdf2img-file-input');
    const pdfDropzone = document.getElementById('pdf2img-dropzone');
    if (pdfInput) {
      pdfInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          ConvertTool.loadPdfForImages(e.target.files[0]);
          pdfInput.value = '';
        }
      });
    }
    if (pdfDropzone) {
      pdfDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        pdfDropzone.classList.add('border-teal-500', 'bg-teal-50/50');
      });
      pdfDropzone.addEventListener('dragleave', () => {
        pdfDropzone.classList.remove('border-teal-500', 'bg-teal-50/50');
      });
      pdfDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfDropzone.classList.remove('border-teal-500', 'bg-teal-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          ConvertTool.loadPdfForImages(e.dataTransfer.files[0]);
        }
      });
    }
  },

  // Switch to Images to PDF Tab
  showImagesToPdf: () => {
    const secImg2Pdf = document.getElementById('sec-img2pdf');
    const secPdf2Img = document.getElementById('sec-pdf2img');
    const tabImg = document.getElementById('tab-img2pdf-btn');
    const tabPdf = document.getElementById('tab-pdf2img-btn');

    if (secImg2Pdf) secImg2Pdf.classList.remove('hidden');
    if (secPdf2Img) secPdf2Img.classList.add('hidden');
    if (tabImg) tabImg.className = 'pb-3 px-4 font-bold text-sm text-violet-600 border-b-2 border-violet-600';
    if (tabPdf) tabPdf.className = 'pb-3 px-4 font-semibold text-sm text-slate-400 hover:text-slate-600';
  },

  // Switch to PDF to Images Tab
  showPdfToImages: () => {
    const secImg2Pdf = document.getElementById('sec-img2pdf');
    const secPdf2Img = document.getElementById('sec-pdf2img');
    const tabImg = document.getElementById('tab-img2pdf-btn');
    const tabPdf = document.getElementById('tab-pdf2img-btn');

    if (secPdf2Img) secPdf2Img.classList.remove('hidden');
    if (secImg2Pdf) secImg2Pdf.classList.add('hidden');
    if (tabPdf) tabPdf.className = 'pb-3 px-4 font-bold text-sm text-teal-600 border-b-2 border-teal-600';
    if (tabImg) tabImg.className = 'pb-3 px-4 font-semibold text-sm text-slate-400 hover:text-slate-600';
  },

  // IMAGES TO PDF METHODS
  addImages: async (files) => {
    const isImageFile = (f) => (f.type && f.type.startsWith('image/')) || 
      /\.(jpe?g|png|webp|gif|bmp|svg|jfif|ico)$/i.test(f.name);

    const validImages = files.filter(isImageFile);
    if (validImages.length === 0) {
      PrivaUtils.showToast('Please select valid image files (JPG, PNG, WebP).', 'error');
      return;
    }

    ConvertTool.showImagesToPdf();
    PrivaUtils.showProgress('Reading Images', 30, `Loading ${validImages.length} images...`);

    try {
      for (const f of validImages) {
        const dataUrl = await PrivaUtils.readFileAsDataURL(f);
        ConvertTool.imagesList.push({
          file: f,
          dataUrl: dataUrl,
          name: f.name,
          size: f.size
        });
      }
      ConvertTool.renderImagesGrid();
      PrivaUtils.hideProgress();
      PrivaUtils.showToast(`Added ${validImages.length} image(s). Ready to convert!`, 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Error loading images: ' + e.message, 'error');
    }
  },

  renderImagesGrid: () => {
    const grid = document.getElementById('img2pdf-grid');
    const workspace = document.getElementById('img2pdf-workspace');
    const dropzone = document.getElementById('img2pdf-dropzone');

    if (!grid || !workspace || !dropzone) return;

    if (ConvertTool.imagesList.length === 0) {
      workspace.classList.add('hidden');
      dropzone.classList.remove('hidden');
      return;
    }

    dropzone.classList.add('hidden');
    workspace.classList.remove('hidden');
    grid.innerHTML = '';

    ConvertTool.imagesList.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'relative bg-white rounded-xl border border-slate-200 p-2 shadow-sm group hover:border-violet-300 transition-all';
      card.innerHTML = `
        <div class="w-full aspect-square bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
          <img src="${item.dataUrl}" class="w-full h-full object-cover" />
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span class="truncate max-w-[100px] font-medium text-slate-700" title="${item.name}">${item.name}</span>
          <button type="button" onclick="ConvertTool.removeImage(${index})" class="text-rose-500 hover:text-rose-700 p-1" title="Remove image">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  },

  removeImage: (index) => {
    ConvertTool.imagesList.splice(index, 1);
    ConvertTool.renderImagesGrid();
  },

  clearAllImages: () => {
    ConvertTool.imagesList = [];
    ConvertTool.renderImagesGrid();
  },

  convertImagesToPdf: async () => {
    if (ConvertTool.imagesList.length === 0) {
      PrivaUtils.showToast('Please add at least one image to convert.', 'error');
      return;
    }

    const btn = document.getElementById('img2pdf-convert-btn');
    const originalText = btn ? btn.innerHTML : 'Convert to PDF Document';
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Generating PDF in Browser...';
      btn.disabled = true;
    }

    PrivaUtils.showProgress('Creating PDF', 20, 'Initializing PDF document in memory...');

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.create();
      const total = ConvertTool.imagesList.length;

      for (let idx = 0; idx < total; idx++) {
        const item = ConvertTool.imagesList[idx];
        PrivaUtils.updateProgress(
          20 + ((idx + 1) / total) * 65,
          `Converting image ${idx + 1} of ${total}: ${item.name}...`
        );

        // Safely decode any image format (JPG, PNG, WebP, GIF, BMP, SVG) via HTML Image & Canvas
        const img = new Image();
        img.src = item.dataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error(`Failed to decode image: ${item.name}`));
        });

        const naturalWidth = img.naturalWidth || img.width || 800;
        const naturalHeight = img.naturalHeight || img.height || 600;

        const canvas = document.createElement('canvas');
        canvas.width = naturalWidth;
        canvas.height = naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Extract clean PNG data url to guarantee 100% PDF-Lib compatibility
        const pngDataUrl = canvas.toDataURL('image/png');
        const embeddedImg = await doc.embedPng(pngDataUrl);

        // Add page matching the image dimensions
        const page = doc.addPage([embeddedImg.width, embeddedImg.height]);
        page.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: embeddedImg.width,
          height: embeddedImg.height
        });
      }

      PrivaUtils.updateProgress(90, 'Saving final PDF document...');
      const pdfBytes = await doc.save({ useObjectStreams: true });

      PrivaUtils.downloadBlob(pdfBytes, 'converted_images.pdf');
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`Converted ${total} image(s) into PDF successfully!`, 'success');
    } catch (e) {
      console.error('Images to PDF conversion error:', e);
      PrivaUtils.showToast('Failed to convert images: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      PrivaUtils.hideProgress();
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  },

  // PDF TO IMAGES METHODS
  loadPdfForImages: async (file) => {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      PrivaUtils.showToast('Please select a valid PDF file.', 'error');
      return;
    }

    ConvertTool.showPdfToImages();
    ConvertTool.pdfToImgName = file.name.replace(/\.[^/.]+$/, '');
    const dropzone = document.getElementById('pdf2img-dropzone');
    const workspace = document.getElementById('pdf2img-workspace');
    if (dropzone) dropzone.classList.add('hidden');
    if (workspace) workspace.classList.remove('hidden');

    PrivaUtils.showProgress('Loading PDF', 30, 'Reading PDF pages in memory...');

    try {
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      ConvertTool.pdfToImgBytes = buffer;

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      ConvertTool.pdfToImgDoc = await loadingTask.promise;
      const count = ConvertTool.pdfToImgDoc.numPages;

      const metaEl = document.getElementById('pdf2img-meta');
      if (metaEl) metaEl.textContent = `${count} pages found • Ready to extract as PNG images`;
      
      PrivaUtils.hideProgress();
      PrivaUtils.showToast(`PDF loaded. Ready to extract all ${count} pages!`, 'info');
    } catch (e) {
      console.error('PDF to images load error:', e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Failed to read PDF: ' + (e.message || 'Corrupt format'), 'error');
      if (workspace) workspace.classList.add('hidden');
      if (dropzone) dropzone.classList.remove('hidden');
    }
  },

  resetPdfToImages: () => {
    ConvertTool.pdfToImgBytes = null;
    ConvertTool.pdfToImgDoc = null;
    ConvertTool.pdfToImgName = '';

    const dropzone = document.getElementById('pdf2img-dropzone');
    const workspace = document.getElementById('pdf2img-workspace');
    if (dropzone) dropzone.classList.remove('hidden');
    if (workspace) workspace.classList.add('hidden');
  },

  convertPdfToImages: async () => {
    if (!ConvertTool.pdfToImgDoc) {
      PrivaUtils.showToast('Please load a PDF document first.', 'error');
      return;
    }

    const count = ConvertTool.pdfToImgDoc.numPages;
    const btn = document.getElementById('pdf2img-convert-btn');
    const originalText = btn ? btn.innerHTML : 'Extract & Download ZIP';
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>Rendering ${count} pages...`;
      btn.disabled = true;
    }

    PrivaUtils.showProgress('Extracting Images', 20, `Rendering page 1 of ${count}...`);

    try {
      const zip = new JSZip();

      for (let i = 1; i <= count; i++) {
        PrivaUtils.updateProgress(
          20 + (i / count) * 65,
          `Rendering high-res page ${i} of ${count}...`
        );

        const page = await ConvertTool.pdfToImgDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // 2x high resolution
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];

        const padIndex = String(i).padStart(String(count).length, '0');
        zip.file(`${ConvertTool.pdfToImgName}_page_${padIndex}.png`, base64Data, { base64: true });
      }

      PrivaUtils.updateProgress(90, 'Packaging ZIP archive...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      PrivaUtils.downloadBlob(zipBlob, `${ConvertTool.pdfToImgName}_images.zip`);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`Extracted ${count} pages to ZIP!`, 'success');
    } catch (e) {
      console.error('PDF to images conversion error:', e);
      PrivaUtils.showToast('Failed to extract images: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      PrivaUtils.hideProgress();
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  }
};
