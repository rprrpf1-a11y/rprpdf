// Visual Split PDF Tool powered by PDF.js and PDF-Lib
window.SplitTool = {
  currentPdfBytes: null,
  currentPdfDoc: null, // pdfjs document
  currentPdfLibDoc: null, // pdf-lib document
  fileName: '',
  pageCount: 0,
  selectedPages: new Set(), // 1-based page numbers
  pageThumbnails: [],

  init: () => {
    const fileInput = document.getElementById('split-file-input');
    const dropZone = document.getElementById('split-dropzone');
    const rangeInput = document.getElementById('split-range-input');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          SplitTool.loadFile(e.target.files[0]);
        }
      });
    }

    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-500', 'bg-indigo-50/50');
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          SplitTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (rangeInput) {
      rangeInput.addEventListener('input', (e) => {
        SplitTool.applyRangeInput(e.target.value);
      });
    }
  },

  loadFile: async (file) => {
    if (!file || file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      PrivaUtils.showToast('Please select a valid PDF file.', 'error');
      return;
    }

    SplitTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    SplitTool.selectedPages.clear();

    const loadingEl = document.getElementById('split-loading');
    const dropzoneEl = document.getElementById('split-dropzone');
    const workspaceEl = document.getElementById('split-workspace');

    dropzoneEl.classList.add('hidden');
    loadingEl.classList.remove('hidden');

    try {
      const arrayBuffer = await PrivaUtils.readFileAsArrayBuffer(file);
      SplitTool.currentPdfBytes = arrayBuffer;

      // Load with PDF.js for visual rendering
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
      SplitTool.currentPdfDoc = await loadingTask.promise;
      SplitTool.pageCount = SplitTool.currentPdfDoc.numPages;

      // Update UI Header
      document.getElementById('split-doc-name').textContent = file.name;
      document.getElementById('split-doc-meta').textContent = `${SplitTool.pageCount} pages • ${PrivaUtils.formatBytes(file.size)}`;

      // Render Visual Thumbnails
      await SplitTool.renderThumbnails();

      // Show workspace
      loadingEl.classList.add('hidden');
      workspaceEl.classList.remove('hidden');

      // Default: Select page 1
      SplitTool.togglePageSelection(1, true);

      PrivaUtils.showToast(`Loaded ${SplitTool.pageCount} pages ready for visual splitting!`, 'success');
    } catch (err) {
      console.error('Error loading PDF for split:', err);
      PrivaUtils.showToast('Failed to parse PDF document. It may be password-protected or corrupted.', 'error');
      loadingEl.classList.add('hidden');
      dropzoneEl.classList.remove('hidden');
    }
  },

  renderThumbnails: async () => {
    const grid = document.getElementById('split-thumbnail-grid');
    grid.innerHTML = '';
    SplitTool.pageThumbnails = [];

    for (let pageNum = 1; pageNum <= SplitTool.pageCount; pageNum++) {
      const card = document.createElement('div');
      card.className = 'thumbnail-card relative bg-white rounded-xl border-2 border-slate-200 p-3 flex flex-col items-center cursor-pointer transition-all hover:border-indigo-400 group shadow-sm';
      card.id = `page-card-${pageNum}`;

      card.innerHTML = `
        <div class="relative w-full aspect-[1/1.4] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-100">
          <canvas id="canvas-thumb-${pageNum}" class="page-thumbnail-canvas transition-transform duration-200 group-hover:scale-[1.02]"></canvas>
          <div id="loader-thumb-${pageNum}" class="absolute inset-0 skeleton-loading flex items-center justify-center">
            <span class="text-xs text-slate-400 font-medium">Page ${pageNum}</span>
          </div>
          <!-- Quick Preview Button -->
          <button type="button" onclick="event.stopPropagation(); SplitTool.previewPage(${pageNum})" 
            title="Preview Page"
            class="absolute top-2 left-2 bg-slate-900/75 hover:bg-slate-900 text-white rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-xs shadow-md backdrop-blur-sm">
            <i class="fa-solid fa-magnifying-glass-plus"></i>
          </button>
        </div>
        <div class="w-full mt-2.5 flex items-center justify-between px-1">
          <span class="text-xs font-semibold text-slate-700">Page ${pageNum}</span>
          <div class="check-circle w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] transition-colors">
            <i class="fa-solid fa-check opacity-0"></i>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        SplitTool.togglePageSelection(pageNum);
      });

      grid.appendChild(card);
    }

    // Render canvases sequentially so each thumbnail displays smoothly
    for (let pageNum = 1; pageNum <= SplitTool.pageCount; pageNum++) {
      await SplitTool.renderPageThumbnail(pageNum);
    }
  },

  renderPageThumbnail: async (pageNum) => {
    try {
      const page = await SplitTool.currentPdfDoc.getPage(pageNum);
      const canvas = document.getElementById(`canvas-thumb-${pageNum}`);
      const loader = document.getElementById(`loader-thumb-${pageNum}`);
      if (!canvas) return;

      const viewport = page.getViewport({ scale: 0.5 }); // thumbnail resolution
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      if (loader) loader.classList.add('hidden');
    } catch (e) {
      console.warn(`Failed to render thumbnail for page ${pageNum}:`, e);
    }
  },

  togglePageSelection: (pageNum, forceState = null) => {
    const card = document.getElementById(`page-card-${pageNum}`);
    if (!card) return;

    const checkIcon = card.querySelector('.fa-check');
    const isSelected = forceState !== null ? forceState : !SplitTool.selectedPages.has(pageNum);

    if (isSelected) {
      SplitTool.selectedPages.add(pageNum);
      card.classList.add('selected');
      if (checkIcon) checkIcon.classList.remove('opacity-0');
    } else {
      SplitTool.selectedPages.delete(pageNum);
      card.classList.remove('selected');
      if (checkIcon) checkIcon.classList.add('opacity-0');
    }

    SplitTool.updateSelectionStatus();
  },

  selectAll: () => {
    for (let i = 1; i <= SplitTool.pageCount; i++) {
      SplitTool.togglePageSelection(i, true);
    }
  },

  deselectAll: () => {
    for (let i = 1; i <= SplitTool.pageCount; i++) {
      SplitTool.togglePageSelection(i, false);
    }
  },

  selectOdd: () => {
    for (let i = 1; i <= SplitTool.pageCount; i++) {
      SplitTool.togglePageSelection(i, i % 2 !== 0);
    }
  },

  selectEven: () => {
    for (let i = 1; i <= SplitTool.pageCount; i++) {
      SplitTool.togglePageSelection(i, i % 2 === 0);
    }
  },

  applyRangeInput: (text) => {
    if (!text.trim()) return;
    const parts = text.split(',');
    const newSelected = new Set();

    parts.forEach(part => {
      part = part.trim();
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end));
          const max = Math.min(SplitTool.pageCount, Math.max(start, end));
          for (let p = min; p <= max; p++) {
            newSelected.add(p);
          }
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= SplitTool.pageCount) {
          newSelected.add(p);
        }
      }
    });

    for (let i = 1; i <= SplitTool.pageCount; i++) {
      SplitTool.togglePageSelection(i, newSelected.has(i));
    }
  },

  updateSelectionStatus: () => {
    const count = SplitTool.selectedPages.size;
    const countEl = document.getElementById('split-selected-count');
    const extractBtn = document.getElementById('split-extract-btn');

    if (countEl) {
      countEl.textContent = `${count} of ${SplitTool.pageCount} pages selected`;
    }

    if (extractBtn) {
      extractBtn.disabled = count === 0;
      if (count === 0) {
        extractBtn.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        extractBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  },

  previewPage: async (pageNum) => {
    const modal = document.getElementById('preview-modal');
    const canvas = document.getElementById('preview-modal-canvas');
    const title = document.getElementById('preview-modal-title');
    if (!modal || !canvas) return;

    title.textContent = `Page ${pageNum} Preview`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
      const page = await SplitTool.currentPdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (e) {
      console.error('Preview error:', e);
    }
  },

  closePreviewModal: () => {
    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  // Extract selected pages into a single PDF
  extractSelected: async () => {
    if (SplitTool.selectedPages.size === 0) {
      PrivaUtils.showToast('Please select at least one page to extract.', 'error');
      return;
    }

    const btn = document.getElementById('split-extract-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Processing...';
    btn.disabled = true;

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument } = PDFLib;
      const srcDoc = await PDFDocument.load(SplitTool.currentPdfBytes, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      // Sort selected pages in ascending order
      const sortedPages = Array.from(SplitTool.selectedPages).sort((a, b) => a - b);
      const pageIndices = sortedPages.map(p => p - 1); // 0-based indices

      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach(p => newDoc.addPage(p));

      const newPdfBytes = await newDoc.save();
      PrivaUtils.downloadBlob(newPdfBytes, `${SplitTool.fileName}_extracted.pdf`);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`Extracted ${sortedPages.length} pages successfully!`, 'success');
    } catch (e) {
      console.error('Error extracting pages:', e);
      PrivaUtils.showToast('Failed to extract pages: ' + e.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  // Split all pages into separate PDFs bundled into a ZIP file
  splitAllSeparate: async () => {
    if (SplitTool.pageCount === 0) return;

    const btn = document.getElementById('split-separate-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Bundling ZIP...';
    btn.disabled = true;

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument } = PDFLib;
      const srcDoc = await PDFDocument.load(SplitTool.currentPdfBytes, { ignoreEncryption: true });
      const zip = new JSZip();

      for (let i = 0; i < SplitTool.pageCount; i++) {
        const singleDoc = await PDFDocument.create();
        const [copiedPage] = await singleDoc.copyPages(srcDoc, [i]);
        singleDoc.addPage(copiedPage);
        const singleBytes = await singleDoc.save();
        
        const padIndex = String(i + 1).padStart(String(SplitTool.pageCount).length, '0');
        zip.file(`${SplitTool.fileName}_page_${padIndex}.pdf`, singleBytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      PrivaUtils.downloadBlob(zipBlob, `${SplitTool.fileName}_all_pages.zip`, 'application/zip');
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`Split all ${SplitTool.pageCount} pages into ZIP archive!`, 'success');
    } catch (e) {
      console.error('Error splitting all pages:', e);
      PrivaUtils.showToast('Failed to split pages: ' + e.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  reset: () => {
    SplitTool.currentPdfBytes = null;
    SplitTool.currentPdfDoc = null;
    SplitTool.selectedPages.clear();
    document.getElementById('split-workspace').classList.add('hidden');
    document.getElementById('split-dropzone').classList.remove('hidden');
    document.getElementById('split-thumbnail-grid').innerHTML = '';
    const fileInput = document.getElementById('split-file-input');
    if (fileInput) fileInput.value = '';
  }
};
