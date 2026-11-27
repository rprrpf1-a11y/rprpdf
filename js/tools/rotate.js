// Organize, Reorder & Rotate PDF Tool (Phase 2 Visual Page Organization)
window.RotateTool = {
  pdfBytes: null,
  pdfJsDoc: null,
  fileName: '',
  pages: [], // Array of { id, originalPageNumber, rotation, isDeleted }
  draggedIndex: null,

  init: () => {
    const fileInput = document.getElementById('rotate-file-input');
    const dropzone = document.getElementById('rotate-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          RotateTool.loadFile(e.target.files[0]);
        }
      });
    }

    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-blue-500', 'bg-blue-50/50');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-blue-500', 'bg-blue-50/50');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-blue-500', 'bg-blue-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          RotateTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }
  },

  loadFile: async (file) => {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      PrivaUtils.showToast('Please select a valid PDF file.', 'error');
      return;
    }

    RotateTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    const dropzone = document.getElementById('rotate-dropzone');
    const workspace = document.getElementById('rotate-workspace');
    dropzone.classList.add('hidden');
    workspace.classList.remove('hidden');

    PrivaUtils.showProgress('Loading PDF for Organization', 20, 'Reading file bytes...');

    try {
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      RotateTool.pdfBytes = buffer;

      PrivaUtils.updateProgress(50, 'Initializing PDF.js engine...');
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      RotateTool.pdfJsDoc = await loadingTask.promise;
      const count = RotateTool.pdfJsDoc.numPages;

      RotateTool.pages = [];
      for (let i = 0; i < count; i++) {
        RotateTool.pages.push({
          id: `page-${i + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          originalPageNumber: i + 1,
          rotation: 0,
          isDeleted: false
        });
      }

      document.getElementById('rotate-doc-meta').textContent = `${count} pages • ${file.name}`;
      PrivaUtils.updateProgress(80, 'Rendering visual page cards...');
      await RotateTool.renderThumbnails();
      PrivaUtils.hideProgress();

      PrivaUtils.showToast(`Loaded ${count} pages. Drag cards to reorder visually!`, 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Could not load PDF: ' + e.message, 'error');
      workspace.classList.add('hidden');
      dropzone.classList.remove('hidden');
    }
  },

  renderThumbnails: async () => {
    const grid = document.getElementById('rotate-grid');
    grid.innerHTML = '';

    const activePages = RotateTool.pages.filter(p => !p.isDeleted);

    activePages.forEach((p, index) => {
      const card = document.createElement('div');
      card.id = `rotate-card-${p.id}`;
      card.setAttribute('draggable', 'true');
      card.dataset.index = index;
      card.className = 'rotate-page-card bg-white rounded-2xl border-2 border-slate-200 p-3 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col items-center group cursor-grab active:cursor-grabbing relative select-none';

      card.innerHTML = `
        <!-- Drag Handle & Badges -->
        <div class="w-full flex items-center justify-between mb-2">
          <span class="drag-handle inline-flex items-center text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md cursor-grab">
            <i class="fa-solid fa-grip-vertical mr-1 text-slate-400"></i> #${index + 1}
          </span>
          <span class="text-[10px] text-slate-400 font-medium">(orig: p.${p.originalPageNumber})</span>
        </div>

        <!-- Canvas Thumbnail -->
        <div class="relative w-full aspect-[1/1.4] bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-slate-100">
          <canvas id="rotate-canvas-${p.id}" 
            class="transition-transform duration-300 max-h-full max-w-full object-contain pointer-events-none" 
            style="transform: rotate(${p.rotation}deg);"></canvas>
        </div>

        <!-- Action Controls -->
        <div class="w-full mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
          <!-- Move Left / Right -->
          <div class="flex items-center space-x-1">
            <button type="button" onclick="RotateTool.movePage(${index}, -1)" 
              ${index === 0 ? 'disabled' : ''}
              title="Move Earlier" 
              class="w-7 h-7 rounded-lg ${index === 0 ? 'opacity-30 cursor-not-allowed bg-slate-50 text-slate-300' : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600'} flex items-center justify-center text-xs transition-colors">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <button type="button" onclick="RotateTool.movePage(${index}, 1)" 
              ${index === activePages.length - 1 ? 'disabled' : ''}
              title="Move Later" 
              class="w-7 h-7 rounded-lg ${index === activePages.length - 1 ? 'opacity-30 cursor-not-allowed bg-slate-50 text-slate-300' : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600'} flex items-center justify-center text-xs transition-colors">
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>

          <!-- Rotation & Delete -->
          <div class="flex items-center space-x-1">
            <button type="button" onclick="RotateTool.rotatePage('${p.id}', 90)" 
              title="Rotate 90° CW" 
              class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center text-xs transition-colors">
              <i class="fa-solid fa-rotate-right"></i>
            </button>
            <button type="button" onclick="RotateTool.deletePage('${p.id}')" 
              title="Delete Page" 
              class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center justify-center text-xs transition-colors">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;

      // Drag & Drop event handlers for visual reordering
      card.addEventListener('dragstart', (e) => {
        // Prevent drag initiation if user clicked action buttons
        if (e.target.closest('button')) {
          e.preventDefault();
          return;
        }
        window.isInternalDragActive = true;
        RotateTool.draggedIndex = index;
        card.classList.add('opacity-40', 'border-blue-500');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/x-privapdf-internal', 'card');
        e.dataTransfer.setData('text/plain', String(index));
      });

      card.addEventListener('dragend', () => {
        window.isInternalDragActive = false;
        RotateTool.draggedIndex = null;
        card.classList.remove('opacity-40', 'border-blue-500');
        document.querySelectorAll('.rotate-page-card').forEach(c => {
          c.classList.remove('border-indigo-600', 'bg-indigo-50/30', 'scale-105');
        });
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (RotateTool.draggedIndex !== null && RotateTool.draggedIndex !== index) {
          card.classList.add('border-indigo-600', 'bg-indigo-50/30');
        }
      });

      card.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        card.classList.remove('border-indigo-600', 'bg-indigo-50/30');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.isInternalDragActive = false;
        card.classList.remove('border-indigo-600', 'bg-indigo-50/30');
        const fromIdx = RotateTool.draggedIndex;
        RotateTool.draggedIndex = null;
        if (fromIdx !== null && fromIdx !== index) {
          RotateTool.reorderPages(fromIdx, index);
        }
      });

      grid.appendChild(card);
    });

    // Render previews for all active cards
    for (const p of activePages) {
      RotateTool.renderPreview(p);
    }
  },

  renderPreview: async (pageObj) => {
    try {
      const canvas = document.getElementById(`rotate-canvas-${pageObj.id}`);
      if (!canvas) return;

      // Use cached thumbnail if already rendered to make reordering instant
      if (pageObj.cachedThumbnailUrl) {
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
        };
        img.src = pageObj.cachedThumbnailUrl;
        return;
      }

      const page = await RotateTool.pdfJsDoc.getPage(pageObj.originalPageNumber);
      const viewport = page.getViewport({ scale: 0.45 });
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      pageObj.cachedThumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      console.warn('Thumbnail render error:', e);
    }
  },

  reorderPages: (fromIndex, toIndex) => {
    const activePages = RotateTool.pages.filter(p => !p.isDeleted);
    const movedItem = activePages.splice(fromIndex, 1)[0];
    activePages.splice(toIndex, 0, movedItem);

    // Reconstruct pages preserving deleted flags
    const deletedPages = RotateTool.pages.filter(p => p.isDeleted);
    RotateTool.pages = [...activePages, ...deletedPages];

    RotateTool.renderThumbnails();
    PrivaUtils.showToast(`Moved Page to position #${toIndex + 1}`, 'info');
  },

  movePage: (index, delta) => {
    const target = index + delta;
    const activePages = RotateTool.pages.filter(p => !p.isDeleted);
    if (target < 0 || target >= activePages.length) return;
    RotateTool.reorderPages(index, target);
  },

  rotatePage: (id, degrees) => {
    const item = RotateTool.pages.find(p => p.id === id);
    if (!item) return;

    item.rotation = (item.rotation + degrees) % 360;
    if (item.rotation < 0) item.rotation += 360;

    const canvas = document.getElementById(`rotate-canvas-${id}`);
    if (canvas) {
      canvas.style.transform = `rotate(${item.rotation}deg)`;
    }
  },

  rotateAll: (degrees) => {
    RotateTool.pages.forEach(p => {
      if (!p.isDeleted) {
        p.rotation = (p.rotation + degrees) % 360;
        if (p.rotation < 0) p.rotation += 360;
        const canvas = document.getElementById(`rotate-canvas-${p.id}`);
        if (canvas) {
          canvas.style.transform = `rotate(${p.rotation}deg)`;
        }
      }
    });
    PrivaUtils.showToast(`Rotated all pages by ${degrees > 0 ? '+' : ''}${degrees}°`, 'info');
  },

  deletePage: (id) => {
    const item = RotateTool.pages.find(p => p.id === id);
    if (!item) return;

    item.isDeleted = true;
    RotateTool.renderThumbnails();

    const activeCount = RotateTool.pages.filter(p => !p.isDeleted).length;
    PrivaUtils.showToast(`Page deleted. (${activeCount} pages remain)`, 'info');
  },

  export: async () => {
    const activePages = RotateTool.pages.filter(p => !p.isDeleted);
    if (activePages.length === 0) {
      PrivaUtils.showToast('All pages have been deleted. Nothing to save.', 'error');
      return;
    }

    const btn = document.getElementById('rotate-export-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Compiling PDF in Browser...';
    btn.disabled = true;

    PrivaUtils.showProgress('Exporting Reordered PDF', 15, 'Loading original document structure...');

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument, degrees } = PDFLib;
      const srcDoc = await PDFDocument.load(RotateTool.pdfBytes, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      const total = activePages.length;
      for (let i = 0; i < total; i++) {
        const p = activePages[i];
        PrivaUtils.updateProgress(
          20 + (i / total) * 60,
          `Copying page ${i + 1} of ${total} (source: p.${p.originalPageNumber}, rot: ${p.rotation}°)...`
        );

        const [copiedPage] = await newDoc.copyPages(srcDoc, [p.originalPageNumber - 1]);
        const rotObj = copiedPage.getRotation();
        const currentRot = typeof rotObj === 'number' ? rotObj : (rotObj?.angle || 0);
        copiedPage.setRotation(degrees((currentRot + p.rotation) % 360));
        newDoc.addPage(copiedPage);
      }

      PrivaUtils.updateProgress(85, 'Compressing and serializing PDF streams...');
      const organizedBytes = await newDoc.save({ useObjectStreams: true });

      PrivaUtils.updateProgress(100, 'Download starting!');
      PrivaUtils.downloadBlob(organizedBytes, `${RotateTool.fileName}_organized.pdf`);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Reordered & organized PDF downloaded successfully!', 'success');
    } catch (e) {
      console.error('Rotate save error:', e);
      PrivaUtils.showToast('Error saving document: ' + e.message, 'error');
    } finally {
      PrivaUtils.hideProgress();
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
};
