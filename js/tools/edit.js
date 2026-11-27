// PDF Editor — In-Browser Text, Existing Text Editing, Whiteout, Devanagari (Hindi), Images, Shapes & Freehand Pen
window.EditTool = {
  pdfBytes: null,
  pdfJsDoc: null,
  fileName: '',
  numPages: 0,
  currentPage: 1,
  renderScale: 1.25,
  currentViewport: null,
  currentRenderTask: null,
  
  // Page annotations: { [pageNum]: Array<AnnotationItem> }
  // Items:
  // - text (new text overlay)
  // - replace-text (existing text modified in place, with whiteout backing)
  // - image (inserted photo/stamp)
  // - shape (highlight or whiteout/redact)
  annotations: {},
  
  // Extracted raw text items per page: { [pageNum]: Array<{ str, transform, width, height, ... }> }
  pageTextItems: {},

  // Freehand drawings per page: { [pageNum]: DataURL }
  drawings: {},
  isDrawing: false,
  drawColor: '#dc2626',
  drawSize: 4,

  activeItem: null,
  selectedTool: 'edit-text', // 'edit-text' | 'whiteout' | 'text' | 'image' | 'rect' | 'draw'

  init: () => {
    const fileInput = document.getElementById('edit-file-input');
    const dropzone = document.getElementById('edit-dropzone');
    const imageUploadInput = document.getElementById('edit-image-upload-input');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          EditTool.loadFile(e.target.files[0]);
          fileInput.value = '';
        }
      });
    }

    if (imageUploadInput) {
      imageUploadInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          EditTool.handleImageUpload(e.target.files[0]);
          imageUploadInput.value = '';
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
          EditTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Initialize Draw Settings listeners
    const colorPicker = document.getElementById('edit-draw-color');
    const sizePicker = document.getElementById('edit-draw-size');
    if (colorPicker) {
      colorPicker.addEventListener('input', (e) => {
        EditTool.drawColor = e.target.value;
      });
    }
    if (sizePicker) {
      sizePicker.addEventListener('change', (e) => {
        EditTool.drawSize = parseInt(e.target.value, 10);
      });
    }

    // Freehand drawing mouse/touch handlers
    EditTool.initDrawCanvasHandlers();
  },

  // Reset editor and show dropzone again
  reset: () => {
    if (EditTool.currentRenderTask) {
      try { EditTool.currentRenderTask.cancel(); } catch (e) {}
      EditTool.currentRenderTask = null;
    }
    EditTool.pdfBytes = null;
    EditTool.pdfJsDoc = null;
    EditTool.fileName = '';
    EditTool.numPages = 0;
    EditTool.currentPage = 1;
    EditTool.annotations = {};
    EditTool.pageTextItems = {};
    EditTool.drawings = {};

    const dropzone = document.getElementById('edit-dropzone');
    const workspace = document.getElementById('edit-workspace');
    if (dropzone) dropzone.classList.remove('hidden');
    if (workspace) workspace.classList.add('hidden');
  },

  loadFile: async (file) => {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      PrivaUtils.showToast('Please select a valid PDF file.', 'error');
      return;
    }

    EditTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    EditTool.annotations = {};
    EditTool.pageTextItems = {};
    EditTool.drawings = {};
    EditTool.currentPage = 1;

    const dropzone = document.getElementById('edit-dropzone');
    const workspace = document.getElementById('edit-workspace');
    if (dropzone) dropzone.classList.add('hidden');
    if (workspace) workspace.classList.remove('hidden');

    PrivaUtils.showProgress('Loading PDF Editor', 25, 'Parsing document structure & text layers...');

    try {
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      EditTool.pdfBytes = buffer;

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      EditTool.pdfJsDoc = await loadingTask.promise;
      EditTool.numPages = EditTool.pdfJsDoc.numPages;

      const docNameEl = document.getElementById('edit-doc-name');
      if (docNameEl) docNameEl.textContent = file.name;

      const docMetaEl = document.getElementById('edit-doc-meta');
      if (docMetaEl) docMetaEl.textContent = `${EditTool.numPages} pages • ${PrivaUtils.formatBytes(file.size)}`;

      PrivaUtils.updateProgress(75, 'Extracting text and rendering workspace...');
      await EditTool.renderPage(1);

      PrivaUtils.hideProgress();
      EditTool.setTool('edit-text');
      PrivaUtils.showToast('Editor ready! Click any text in the PDF to edit or replace it.', 'success');
    } catch (e) {
      console.error('PDF load error in EditTool:', e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Failed to load PDF: ' + (e.message || 'Corrupt format'), 'error');
      if (workspace) workspace.classList.add('hidden');
      if (dropzone) dropzone.classList.remove('hidden');
    }
  },

  renderPage: async (pageNum) => {
    if (!EditTool.pdfJsDoc || pageNum < 1 || pageNum > EditTool.numPages) return;
    EditTool.currentPage = pageNum;

    // Save active drawing of previous page before switching
    EditTool.saveCurrentDrawing();

    // Update pagination controls
    const indicator = document.getElementById('edit-page-indicator');
    if (indicator) indicator.textContent = `Page ${pageNum} of ${EditTool.numPages}`;
    const prevBtn = document.getElementById('edit-prev-btn');
    if (prevBtn) prevBtn.disabled = (pageNum <= 1);
    const nextBtn = document.getElementById('edit-next-btn');
    if (nextBtn) nextBtn.disabled = (pageNum >= EditTool.numPages);

    const canvas = document.getElementById('edit-pdf-canvas');
    const drawCanvas = document.getElementById('edit-draw-canvas');
    const textLayer = document.getElementById('edit-text-layer');
    const overlay = document.getElementById('edit-overlay-layer');
    if (!canvas || !overlay) return;

    if (EditTool.currentRenderTask) {
      try { EditTool.currentRenderTask.cancel(); } catch (err) {}
      EditTool.currentRenderTask = null;
    }

    try {
      const page = await EditTool.pdfJsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: EditTool.renderScale });
      EditTool.currentViewport = viewport;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (drawCanvas) {
        drawCanvas.width = viewport.width;
        drawCanvas.height = viewport.height;
      }

      if (textLayer) {
        textLayer.style.width = `${viewport.width}px`;
        textLayer.style.height = `${viewport.height}px`;
      }

      overlay.style.width = `${viewport.width}px`;
      overlay.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d');
      const renderTask = page.render({ canvasContext: ctx, viewport });
      EditTool.currentRenderTask = renderTask;
      await renderTask.promise;
      EditTool.currentRenderTask = null;

      // Extract existing page text for in-place text editing
      const textContent = await page.getTextContent();
      EditTool.pageTextItems[pageNum] = textContent.items;
      EditTool.renderInteractiveTextLayer(textContent, viewport);

      // Restore drawing for this page if exists
      EditTool.restoreCurrentDrawing();

      // Render overlay annotations (edited text, new text, images, shapes)
      EditTool.renderOverlayElements();
    } catch (e) {
      if (e && e.name === 'RenderingCancelledException') return;
      console.error('Error rendering page in editor:', e);
    }
  },

  prevPage: () => {
    if (EditTool.currentPage > 1) {
      EditTool.renderPage(EditTool.currentPage - 1);
    }
  },

  nextPage: () => {
    if (EditTool.currentPage < EditTool.numPages) {
      EditTool.renderPage(EditTool.currentPage + 1);
    }
  },

  setTool: (tool) => {
    EditTool.selectedTool = tool;
    
    // Update toolbar active buttons
    document.querySelectorAll('.edit-tool-btn').forEach(btn => {
      const isMatch = btn.dataset.tool === tool;
      btn.classList.toggle('bg-blue-600', isMatch && tool === 'edit-text');
      btn.classList.toggle('bg-indigo-600', isMatch && tool !== 'edit-text');
      btn.classList.toggle('text-white', isMatch);
      btn.classList.toggle('bg-slate-100', !isMatch);
      btn.classList.toggle('text-slate-700', !isMatch);
    });

    const drawBar = document.getElementById('edit-draw-bar');
    const drawCanvas = document.getElementById('edit-draw-canvas');
    const textLayer = document.getElementById('edit-text-layer');
    const modeBanner = document.getElementById('edit-mode-banner-text');

    if (drawBar) drawBar.classList.toggle('hidden', tool !== 'draw');
    if (drawCanvas) drawCanvas.classList.toggle('active', tool === 'draw');

    // Update text layer interactivity
    if (textLayer) {
      const isTextInteract = (tool === 'edit-text' || tool === 'whiteout');
      textLayer.classList.toggle('active', isTextInteract);
      
      const spans = textLayer.querySelectorAll('.edit-text-span');
      spans.forEach(s => {
        s.classList.toggle('mode-edit', tool === 'edit-text');
        s.classList.toggle('mode-whiteout', tool === 'whiteout');
        if (tool === 'edit-text') {
          s.title = 'Click to edit or replace this text';
        } else if (tool === 'whiteout') {
          s.title = 'Click to erase / whiteout this text';
        } else {
          s.title = '';
        }
      });
    }

    // Update banner instructions
    if (modeBanner) {
      if (tool === 'edit-text') {
        modeBanner.innerHTML = '<strong>Edit Existing Text Mode:</strong> Click directly on ANY word or line on the document to edit, replace, or delete it!';
      } else if (tool === 'whiteout') {
        modeBanner.innerHTML = '<strong>Whiteout / Erase Mode:</strong> Click on any text, watermark, or element to instantly erase it with clean whiteout.';
      } else if (tool === 'draw') {
        modeBanner.innerHTML = '<strong>Freehand Pen Mode:</strong> Click and drag on the page to draw, annotate, underline, or hand-sign.';
      } else if (tool === 'text') {
        modeBanner.innerHTML = '<strong>Add Text Mode:</strong> A new draggable text box is placed on the page.';
      } else if (tool === 'rect') {
        modeBanner.innerHTML = '<strong>Highlight Mode:</strong> A movable highlight box has been added.';
      } else if (tool === 'image') {
        modeBanner.innerHTML = '<strong>Image Mode:</strong> Choose an image file to insert onto the page.';
      }
    }

    // Trigger tool actions
    if (tool === 'image') {
      const imgInput = document.getElementById('edit-image-upload-input');
      if (imgInput) imgInput.click();
    } else if (tool === 'text') {
      EditTool.addTextOverlay('Double-click to edit text', 100, 100, 'sans');
      EditTool.setTool('edit-text');
    } else if (tool === 'rect') {
      EditTool.addShapeOverlay('highlight', 100, 150);
      EditTool.setTool('edit-text');
    } else if (tool === 'whiteout') {
      PrivaUtils.showToast('Click any text to erase, or drag to whiteout an area.', 'info');
    }
  },

  // 1. INTERACTIVE EXISTING TEXT LAYER
  renderInteractiveTextLayer: (textContent, viewport) => {
    const textLayer = document.getElementById('edit-text-layer');
    if (!textLayer || !textContent || !textContent.items) return;
    textLayer.innerHTML = '';

    const items = textContent.items;
    items.forEach((item, idx) => {
      if (!item.str || !item.str.trim()) return;

      // Convert coordinates from PDF point space to Canvas pixels
      const [vx, vy] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      const fontSize = Math.hypot(item.transform[0], item.transform[1]) * EditTool.renderScale;
      const width = item.width * EditTool.renderScale;
      const height = Math.max(fontSize * 1.25, 16);
      const left = vx;
      const top = vy - (fontSize * 0.95);

      const span = document.createElement('div');
      span.className = `edit-text-span ${EditTool.selectedTool === 'edit-text' ? 'mode-edit' : (EditTool.selectedTool === 'whiteout' ? 'mode-whiteout' : '')}`;
      span.style.left = `${left}px`;
      span.style.top = `${top}px`;
      span.style.width = `${Math.max(width, 16)}px`;
      span.style.height = `${height}px`;
      span.style.fontSize = `${fontSize}px`;
      
      span.dataset.str = item.str;
      span.dataset.fontSize = fontSize;
      span.dataset.left = left;
      span.dataset.top = top;
      span.dataset.width = width;
      span.dataset.height = height;
      span.dataset.idx = idx;

      span.addEventListener('click', (e) => {
        e.stopPropagation();
        if (EditTool.selectedTool === 'whiteout') {
          EditTool.eraseTextSpan(span);
        } else {
          EditTool.startInlineTextEdit(span);
        }
      });

      textLayer.appendChild(span);
    });
  },

  // START IN-PLACE EDITING OF EXISTING TEXT
  startInlineTextEdit: (span) => {
    const origText = span.dataset.str;
    const fontSize = parseFloat(span.dataset.fontSize) || 16;
    const left = parseFloat(span.dataset.left) || 50;
    const top = parseFloat(span.dataset.top) || 50;
    const width = parseFloat(span.dataset.width) || 120;
    const height = parseFloat(span.dataset.height) || 24;

    const pageNum = EditTool.currentPage;
    if (!EditTool.annotations[pageNum]) EditTool.annotations[pageNum] = [];

    const isHindi = PrivaUtils.isDevanagari(origText);
    const fontFamily = isHindi 
      ? "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif" 
      : "Inter, -apple-system, sans-serif";

    // Create a replace-text annotation that completely covers the original raster text with a clean whiteout
    const editItem = {
      id: `edit-text-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'replace-text',
      origText: origText,
      text: origText,
      x: Math.round(left),
      y: Math.round(top),
      width: Math.round(Math.max(width + 10, 80)),
      height: Math.round(Math.max(height + 4, 26)),
      fontSize: Math.round(fontSize),
      fontType: isHindi ? 'hindi' : 'sans',
      fontFamily: fontFamily,
      color: '#0f172a',
      isBold: false,
      bgWhiteout: true
    };

    EditTool.annotations[pageNum].push(editItem);
    EditTool.renderOverlayElements();

    // Auto-focus and select the newly added editable input
    setTimeout(() => {
      const inputEl = document.querySelector(`#anno-${editItem.id} input`);
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 50);

    PrivaUtils.showToast('Text selected! Type your changes. The original text is replaced in-place.', 'success');
  },

  // WHITEOUT / ERASE TEXT SPAN
  eraseTextSpan: (span) => {
    const left = parseFloat(span.dataset.left) || 50;
    const top = parseFloat(span.dataset.top) || 50;
    const width = parseFloat(span.dataset.width) || 80;
    const height = parseFloat(span.dataset.height) || 20;

    const pageNum = EditTool.currentPage;
    if (!EditTool.annotations[pageNum]) EditTool.annotations[pageNum] = [];

    const whiteoutItem = {
      id: `whiteout-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'shape',
      shapeType: 'whiteout',
      x: Math.round(left - 2),
      y: Math.round(top - 2),
      width: Math.round(width + 6),
      height: Math.round(height + 4),
      fillColor: '#ffffff',
      opacity: 1.0,
      borderColor: '#e2e8f0'
    };

    EditTool.annotations[pageNum].push(whiteoutItem);
    EditTool.renderOverlayElements();
    PrivaUtils.showToast('Text erased with whiteout patch!', 'success');
  },

  // 2. FIND & REPLACE ACROSS DOCUMENT
  toggleFindReplace: () => {
    const bar = document.getElementById('edit-find-replace-bar');
    if (!bar) return;
    const isHidden = bar.classList.contains('hidden');
    bar.classList.toggle('hidden');
    if (isHidden) {
      const input = document.getElementById('edit-find-input');
      if (input) input.focus();
    }
  },

  replaceOnCurrentPage: () => {
    const findStr = document.getElementById('edit-find-input')?.value || '';
    const replaceStr = document.getElementById('edit-replace-input')?.value || '';
    const matchCase = document.getElementById('edit-match-case')?.checked;

    if (!findStr) {
      PrivaUtils.showToast('Please enter text to find.', 'error');
      return;
    }

    const pageNum = EditTool.currentPage;
    const items = EditTool.pageTextItems[pageNum] || [];
    const viewport = EditTool.currentViewport;
    if (!viewport) return;

    let count = 0;
    if (!EditTool.annotations[pageNum]) EditTool.annotations[pageNum] = [];

    items.forEach(item => {
      if (!item.str) return;
      const haystack = matchCase ? item.str : item.str.toLowerCase();
      const needle = matchCase ? findStr : findStr.toLowerCase();

      if (haystack.includes(needle)) {
        const [vx, vy] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        const fontSize = Math.hypot(item.transform[0], item.transform[1]) * EditTool.renderScale;
        const width = item.width * EditTool.renderScale;
        const height = Math.max(fontSize * 1.25, 18);
        const left = vx;
        const top = vy - (fontSize * 0.95);

        const newText = matchCase 
          ? item.str.replaceAll(findStr, replaceStr)
          : item.str.replace(new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replaceStr);

        EditTool.annotations[pageNum].push({
          id: `find-replace-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: 'replace-text',
          origText: item.str,
          text: newText,
          x: Math.round(left),
          y: Math.round(top),
          width: Math.round(Math.max(width + 12, 60)),
          height: Math.round(height + 4),
          fontSize: Math.round(fontSize),
          fontType: PrivaUtils.isDevanagari(newText) ? 'hindi' : 'sans',
          fontFamily: PrivaUtils.isDevanagari(newText) ? "'Noto Sans Devanagari', sans-serif" : "Inter, sans-serif",
          color: '#0f172a',
          isBold: false,
          bgWhiteout: true
        });
        count++;
      }
    });

    EditTool.renderOverlayElements();
    if (count > 0) {
      PrivaUtils.showToast(`Replaced ${count} occurrence(s) on Page ${pageNum}!`, 'success');
    } else {
      PrivaUtils.showToast(`Text "${findStr}" not found on Page ${pageNum}.`, 'info');
    }
  },

  replaceAllPages: async () => {
    const findStr = document.getElementById('edit-find-input')?.value || '';
    const replaceStr = document.getElementById('edit-replace-input')?.value || '';
    const matchCase = document.getElementById('edit-match-case')?.checked;

    if (!findStr) {
      PrivaUtils.showToast('Please enter text to find.', 'error');
      return;
    }

    PrivaUtils.showProgress('Finding & Replacing', 10, 'Scanning all pages...');
    let totalCount = 0;

    try {
      for (let p = 1; p <= EditTool.numPages; p++) {
        const page = await EditTool.pdfJsDoc.getPage(p);
        const viewport = page.getViewport({ scale: EditTool.renderScale });
        const textContent = await page.getTextContent();
        
        if (!EditTool.annotations[p]) EditTool.annotations[p] = [];

        textContent.items.forEach(item => {
          if (!item.str) return;
          const haystack = matchCase ? item.str : item.str.toLowerCase();
          const needle = matchCase ? findStr : findStr.toLowerCase();

          if (haystack.includes(needle)) {
            const [vx, vy] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
            const fontSize = Math.hypot(item.transform[0], item.transform[1]) * EditTool.renderScale;
            const width = item.width * EditTool.renderScale;
            const height = Math.max(fontSize * 1.25, 18);
            const left = vx;
            const top = vy - (fontSize * 0.95);

            const newText = matchCase 
              ? item.str.replaceAll(findStr, replaceStr)
              : item.str.replace(new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replaceStr);

            EditTool.annotations[p].push({
              id: `find-replace-${p}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              type: 'replace-text',
              origText: item.str,
              text: newText,
              x: Math.round(left),
              y: Math.round(top),
              width: Math.round(Math.max(width + 12, 60)),
              height: Math.round(height + 4),
              fontSize: Math.round(fontSize),
              fontType: PrivaUtils.isDevanagari(newText) ? 'hindi' : 'sans',
              fontFamily: PrivaUtils.isDevanagari(newText) ? "'Noto Sans Devanagari', sans-serif" : "Inter, sans-serif",
              color: '#0f172a',
              isBold: false,
              bgWhiteout: true
            });
            totalCount++;
          }
        });
      }

      EditTool.renderOverlayElements();
      PrivaUtils.hideProgress();
      PrivaUtils.showToast(`Find & Replace complete! Replaced ${totalCount} occurrence(s) across ${EditTool.numPages} pages.`, 'success');
    } catch (err) {
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Find & Replace failed: ' + err.message, 'error');
    }
  },

  // 3. FREEHAND DRAWING CANVAS
  initDrawCanvasHandlers: () => {
    const drawCanvas = document.getElementById('edit-draw-canvas');
    if (!drawCanvas) return;

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const startDraw = (x, y) => {
      if (EditTool.selectedTool !== 'draw') return;
      isDrawing = true;
      lastX = x;
      lastY = y;
    };

    const drawMove = (x, y) => {
      if (!isDrawing || EditTool.selectedTool !== 'draw') return;
      const ctx = drawCanvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = EditTool.drawColor;
      ctx.lineWidth = EditTool.drawSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      lastX = x;
      lastY = y;
    };

    const stopDraw = () => {
      if (isDrawing) {
        isDrawing = false;
        EditTool.saveCurrentDrawing();
      }
    };

    drawCanvas.addEventListener('mousedown', (e) => {
      const rect = drawCanvas.getBoundingClientRect();
      startDraw(e.clientX - rect.left, e.clientY - rect.top);
    });

    drawCanvas.addEventListener('mousemove', (e) => {
      const rect = drawCanvas.getBoundingClientRect();
      drawMove(e.clientX - rect.left, e.clientY - rect.top);
    });

    drawCanvas.addEventListener('mouseup', stopDraw);
    drawCanvas.addEventListener('mouseleave', stopDraw);

    // Touch
    drawCanvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        const rect = drawCanvas.getBoundingClientRect();
        startDraw(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
      }
    }, { passive: true });

    drawCanvas.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        const rect = drawCanvas.getBoundingClientRect();
        drawMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
      }
    }, { passive: true });

    drawCanvas.addEventListener('touchend', stopDraw);
  },

  saveCurrentDrawing: () => {
    const drawCanvas = document.getElementById('edit-draw-canvas');
    if (!drawCanvas) return;
    EditTool.drawings[EditTool.currentPage] = drawCanvas.toDataURL('image/png');
  },

  restoreCurrentDrawing: () => {
    const drawCanvas = document.getElementById('edit-draw-canvas');
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    const saved = EditTool.drawings[EditTool.currentPage];
    if (saved) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = saved;
    }
  },

  clearDrawing: () => {
    const drawCanvas = document.getElementById('edit-draw-canvas');
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    delete EditTool.drawings[EditTool.currentPage];
    PrivaUtils.showToast('Drawing cleared for current page.', 'info');
  },

  // 4. ADD HINDI (DEVANAGARI) TEXT
  addHindiText: () => {
    EditTool.addTextOverlay('यहाँ अपना टेक्स्ट लिखें', 100, 100, 'hindi');
    EditTool.setTool('edit-text');
  },

  // ADD NEW TEXT OVERLAY
  addTextOverlay: (initialText = 'Sample Text', x = 80, y = 80, fontType = 'sans') => {
    const pageNum = EditTool.currentPage;
    if (!EditTool.annotations[pageNum]) EditTool.annotations[pageNum] = [];

    const isHindi = fontType === 'hindi' || PrivaUtils.isDevanagari(initialText);
    const fontFamily = isHindi 
      ? "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif" 
      : "Inter, -apple-system, sans-serif";

    const item = {
      id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'text',
      text: initialText,
      x: x,
      y: y,
      width: isHindi ? 260 : 220,
      height: 44,
      fontSize: 16,
      fontType: isHindi ? 'hindi' : 'sans',
      fontFamily: fontFamily,
      color: '#1e293b',
      isBold: false
    };

    EditTool.annotations[pageNum].push(item);
    EditTool.renderOverlayElements();
    PrivaUtils.showToast(isHindi ? 'हिन्दी टेक्स्ट बॉक्स जोड़ा गया। ड्रैग करके रखें।' : 'Text box added. Drag to reposition.', 'info');
  },

  // ADD IMAGE OVERLAY
  handleImageUpload: async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      PrivaUtils.showToast('Please select a valid image (PNG/JPG).', 'error');
      return;
    }

    try {
      const dataUrl = await PrivaUtils.readFileAsDataURL(file);
      const pageNum = EditTool.currentPage;
      if (!EditTool.annotations[pageNum]) EditTool.annotations[pageNum] = [];

      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => { img.onload = resolve; });

      let width = 160;
      let height = (img.height / img.width) * width;
      if (height > 200) {
        height = 200;
        width = (img.width / img.height) * height;
      }

      const item = {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'image',
        dataUrl: dataUrl,
        fileType: file.type.includes('png') ? 'png' : 'jpg',
        x: 100,
        y: 100,
        width: Math.round(width),
        height: Math.round(height)
      };

      EditTool.annotations[pageNum].push(item);
      EditTool.renderOverlayElements();
      PrivaUtils.showToast('Image inserted! Drag to move or resize.', 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.showToast('Failed to insert image: ' + e.message, 'error');
    }
  },

  // ADD SHAPE / HIGHLIGHT / WHITEOUT
  addShapeOverlay: (shapeType = 'highlight', x = 80, y = 140) => {
    const pageNum = EditTool.currentPage;
    if (!EditTool.annotations[pageNum]) EditTool.annotations[pageNum] = [];

    const isWhiteout = shapeType === 'whiteout';
    const item = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'shape',
      shapeType: shapeType, // 'highlight' or 'whiteout'
      x: x,
      y: y,
      width: isWhiteout ? 140 : 180,
      height: 36,
      fillColor: isWhiteout ? '#ffffff' : '#fde047',
      opacity: isWhiteout ? 1.0 : 0.45,
      borderColor: isWhiteout ? '#cbd5e1' : '#eab308'
    };

    EditTool.annotations[pageNum].push(item);
    EditTool.renderOverlayElements();
    PrivaUtils.showToast(isWhiteout ? 'Whiteout box added. Position over unwanted text.' : 'Highlight box added.', 'info');
  },

  // 5. RENDER ALL OVERLAY ELEMENTS ON PAGE
  renderOverlayElements: () => {
    const overlay = document.getElementById('edit-overlay-layer');
    if (!overlay) return;
    overlay.innerHTML = '';

    const pageNum = EditTool.currentPage;
    const items = EditTool.annotations[pageNum] || [];

    items.forEach(item => {
      const el = document.createElement('div');
      el.id = `anno-${item.id}`;
      el.className = 'absolute cursor-move border-2 border-transparent hover:border-indigo-500 rounded select-none group transition-shadow';
      el.style.left = `${item.x}px`;
      el.style.top = `${item.y}px`;
      el.style.width = `${item.width}px`;
      el.style.height = `${item.height}px`;

      // REPLACED EXISTING TEXT (with solid whiteout background to cover original text)
      if (item.type === 'replace-text') {
        el.innerHTML = `
          <div class="relative w-full h-full p-1 bg-white rounded shadow-sm border border-blue-400">
            <input type="text" value="${item.text.replace(/"/g, '&quot;')}" 
              class="w-full h-full bg-transparent border-none outline-none font-medium px-1 cursor-text" 
              style="font-size: ${item.fontSize}px; color: ${item.color}; font-family: ${item.fontFamily}; font-weight: ${item.isBold ? 'bold' : 'normal'};"
              oninput="EditTool.updateTextContent('${item.id}', this.value)">
            <!-- Controls Floating Tooltip -->
            <div class="absolute -top-9 left-0 hidden group-hover:flex items-center space-x-1 bg-white border border-slate-200 shadow-xl rounded-lg p-1 z-50">
              <span class="text-[9px] font-bold text-blue-600 px-1 uppercase">Edited</span>
              <input type="color" value="${item.color}" onchange="EditTool.updateTextColor('${item.id}', this.value)" class="w-5 h-5 rounded cursor-pointer border-0 p-0" title="Text Color">
              <select onchange="EditTool.updateTextFontSize('${item.id}', this.value)" title="Font Size" class="text-[10px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5">
                <option value="10" ${item.fontSize <= 10 ? 'selected' : ''}>10pt</option>
                <option value="12" ${item.fontSize === 12 ? 'selected' : ''}>12pt</option>
                <option value="14" ${item.fontSize === 14 ? 'selected' : ''}>14pt</option>
                <option value="16" ${item.fontSize === 16 ? 'selected' : ''}>16pt</option>
                <option value="20" ${item.fontSize === 20 ? 'selected' : ''}>20pt</option>
                <option value="24" ${item.fontSize === 24 ? 'selected' : ''}>24pt</option>
                <option value="32" ${item.fontSize >= 32 ? 'selected' : ''}>32pt</option>
              </select>
              <button onclick="EditTool.toggleBold('${item.id}')" title="Bold" class="px-1.5 py-0.5 text-[10px] font-bold ${item.isBold ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 hover:bg-slate-200'} rounded">B</button>
              <button onclick="EditTool.deleteItem('${item.id}')" title="Delete / Erase" class="px-1.5 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50 rounded">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <div class="resize-handle se absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full cursor-se-resize border-2 border-white"></div>
          </div>
        `;
      } else if (item.type === 'text') {
        el.innerHTML = `
          <div class="relative w-full h-full p-1 bg-white/85 hover:bg-white rounded border border-dashed border-indigo-300 shadow-sm">
            <input type="text" value="${item.text.replace(/"/g, '&quot;')}" 
              class="w-full h-full bg-transparent border-none outline-none font-medium px-1 cursor-text" 
              style="font-size: ${item.fontSize}px; color: ${item.color}; font-family: ${item.fontFamily}; font-weight: ${item.isBold ? 'bold' : 'normal'};"
              oninput="EditTool.updateTextContent('${item.id}', this.value)">
            <!-- Text Controls Header -->
            <div class="absolute -top-9 left-0 hidden group-hover:flex items-center space-x-1 bg-white border border-slate-200 shadow-lg rounded-lg p-1 z-50">
              <input type="color" value="${item.color}" onchange="EditTool.updateTextColor('${item.id}', this.value)" class="w-5 h-5 rounded cursor-pointer border-0 p-0" title="Text Color">
              <select onchange="EditTool.updateTextFont('${item.id}', this.value)" title="Language & Font Script" class="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-medium">
                <option value="sans" ${item.fontType === 'sans' ? 'selected' : ''}>Sans (EN)</option>
                <option value="hindi" ${item.fontType === 'hindi' ? 'selected' : ''}>🇮🇳 हिन्दी (Hindi)</option>
                <option value="serif" ${item.fontType === 'serif' ? 'selected' : ''}>Serif</option>
                <option value="mono" ${item.fontType === 'mono' ? 'selected' : ''}>Mono</option>
              </select>
              <select onchange="EditTool.updateTextFontSize('${item.id}', this.value)" title="Font Size" class="text-[10px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5">
                <option value="12" ${item.fontSize === 12 ? 'selected' : ''}>12pt</option>
                <option value="14" ${item.fontSize === 14 ? 'selected' : ''}>14pt</option>
                <option value="16" ${item.fontSize === 16 ? 'selected' : ''}>16pt</option>
                <option value="20" ${item.fontSize === 20 ? 'selected' : ''}>20pt</option>
                <option value="24" ${item.fontSize === 24 ? 'selected' : ''}>24pt</option>
                <option value="32" ${item.fontSize === 32 ? 'selected' : ''}>32pt</option>
              </select>
              <button onclick="EditTool.toggleBold('${item.id}')" title="Bold" class="px-1.5 py-0.5 text-[10px] font-bold ${item.isBold ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 hover:bg-slate-200'} rounded">B</button>
              <button onclick="EditTool.deleteItem('${item.id}')" title="Delete" class="px-1.5 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50 rounded">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <div class="resize-handle se absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-indigo-600 rounded-full cursor-se-resize border-2 border-white"></div>
          </div>
        `;
      } else if (item.type === 'image') {
        el.innerHTML = `
          <div class="relative w-full h-full border-2 border-dashed border-indigo-400 rounded overflow-hidden shadow-sm">
            <img src="${item.dataUrl}" class="w-full h-full object-contain pointer-events-none" />
            <div class="resize-handle se absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-indigo-600 rounded-full cursor-se-resize border-2 border-white"></div>
            <button onclick="EditTool.deleteItem('${item.id}')" class="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] shadow">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        `;
      } else if (item.type === 'shape') {
        const isWhiteout = item.shapeType === 'whiteout';
        el.innerHTML = `
          <div class="relative w-full h-full rounded border-2 shadow-sm" 
            style="background-color: ${item.fillColor}; opacity: ${item.opacity}; border-color: ${item.borderColor};">
            ${isWhiteout ? '<span class="text-[9px] font-bold text-slate-400 px-1 select-none">Whiteout</span>' : ''}
            <div class="resize-handle se absolute -bottom-1 -right-1 w-3.5 h-3.5 ${isWhiteout ? 'bg-slate-600' : 'bg-amber-500'} rounded-full cursor-se-resize border-2 border-white"></div>
            <button onclick="EditTool.deleteItem('${item.id}')" class="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        `;
      }

      // Attach mouse and touch handlers for moving and resizing
      EditTool.attachDragHandlers(el, item);
      overlay.appendChild(el);
    });
  },

  attachDragHandlers: (el, item) => {
    let startX = 0;
    let startY = 0;
    let origX = item.x;
    let origY = item.y;
    let origW = item.width;
    let origH = item.height;
    let resizing = false;

    const onStart = (clientX, clientY, target) => {
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'BUTTON' || target.closest('button')) {
        return false;
      }

      resizing = target.classList.contains('resize-handle');
      startX = clientX;
      startY = clientY;
      origX = item.x;
      origY = item.y;
      origW = item.width;
      origH = item.height;
      return true;
    };

    const onMove = (clientX, clientY) => {
      const dx = clientX - startX;
      const dy = clientY - startY;

      if (resizing) {
        item.width = Math.max(30, origW + dx);
        item.height = Math.max(16, origH + dy);
        el.style.width = `${item.width}px`;
        el.style.height = `${item.height}px`;
      } else {
        item.x = Math.max(0, origX + dx);
        item.y = Math.max(0, origY + dy);
        el.style.left = `${item.x}px`;
        el.style.top = `${item.y}px`;
      }
    };

    const onMouseDown = (e) => {
      if (!onStart(e.clientX, e.clientY, e.target)) return;
      e.preventDefault();

      const onMouseMove = (e) => onMove(e.clientX, e.clientY);
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      if (!onStart(touch.clientX, touch.clientY, e.target)) return;

      const onTouchMove = (e) => {
        if (!e.touches || e.touches.length === 0) return;
        const t = e.touches[0];
        onMove(t.clientX, t.clientY);
      };

      const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
      };

      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
  },

  updateTextContent: (id, val) => {
    const item = (EditTool.annotations[EditTool.currentPage] || []).find(i => i.id === id);
    if (item) {
      item.text = val;
      if (PrivaUtils.isDevanagari(val) && item.fontType !== 'hindi') {
        item.fontType = 'hindi';
        item.fontFamily = "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif";
        const inputEl = document.querySelector(`#anno-${id} input`);
        if (inputEl) inputEl.style.fontFamily = item.fontFamily;
      }
    }
  },

  updateTextFont: (id, fontType) => {
    const item = (EditTool.annotations[EditTool.currentPage] || []).find(i => i.id === id);
    if (item) {
      item.fontType = fontType;
      if (fontType === 'hindi') {
        item.fontFamily = "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif";
      } else if (fontType === 'serif') {
        item.fontFamily = "Georgia, 'Times New Roman', serif";
      } else if (fontType === 'mono') {
        item.fontFamily = "Consolas, 'Courier New', monospace";
      } else {
        item.fontFamily = "Inter, -apple-system, sans-serif";
      }
      EditTool.renderOverlayElements();
    }
  },

  updateTextColor: (id, color) => {
    const item = (EditTool.annotations[EditTool.currentPage] || []).find(i => i.id === id);
    if (item) {
      item.color = color;
      EditTool.renderOverlayElements();
    }
  },

  updateTextFontSize: (id, size) => {
    const item = (EditTool.annotations[EditTool.currentPage] || []).find(i => i.id === id);
    if (item) {
      item.fontSize = parseInt(size, 10);
      EditTool.renderOverlayElements();
    }
  },

  toggleBold: (id) => {
    const item = (EditTool.annotations[EditTool.currentPage] || []).find(i => i.id === id);
    if (item) {
      item.isBold = !item.isBold;
      EditTool.renderOverlayElements();
    }
  },

  deleteItem: (id) => {
    const pageNum = EditTool.currentPage;
    if (EditTool.annotations[pageNum]) {
      EditTool.annotations[pageNum] = EditTool.annotations[pageNum].filter(i => i.id !== id);
      EditTool.renderOverlayElements();
      PrivaUtils.showToast('Item removed.', 'info');
    }
  },

  // 6. EXPORT FINAL EDITED PDF WITH IN-PLACE REPLACEMENTS & DRAWINGS
  exportPdf: async () => {
    if (!EditTool.pdfBytes) {
      PrivaUtils.showToast('No PDF loaded to export.', 'error');
      return;
    }

    EditTool.saveCurrentDrawing();

    const btn = document.getElementById('edit-export-btn');
    const originalText = btn ? btn.innerHTML : 'Save & Download';
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Embedding Layers in Browser...';
      btn.disabled = true;
    }

    PrivaUtils.showProgress('Compiling Edited PDF', 20, 'Loading document layers in memory...');

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument, rgb, StandardFonts } = PDFLib;
      const pdfDoc = await PDFDocument.load(EditTool.pdfBytes, { ignoreEncryption: true });

      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pages = pdfDoc.getPages();
      const totalPages = pages.length;

      for (let pIdx = 0; pIdx < totalPages; pIdx++) {
        const pageNum = pIdx + 1;
        const page = pages[pIdx];
        const { width: pdfWidth, height: pdfHeight } = page.getSize();
        const items = EditTool.annotations[pageNum] || [];
        const drawDataUrl = EditTool.drawings[pageNum];

        if (items.length === 0 && !drawDataUrl) continue;

        PrivaUtils.updateProgress(
          25 + (pIdx / totalPages) * 60,
          `Baking edits and whiteout onto page ${pageNum} of ${totalPages}...`
        );

        const canvas = document.getElementById('edit-pdf-canvas');
        const domWidth = canvas ? canvas.width : pdfWidth;
        const domHeight = canvas ? canvas.height : pdfHeight;
        const scaleX = pdfWidth / domWidth;
        const scaleY = pdfHeight / domHeight;

        for (const item of items) {
          const itemPdfX = item.x * scaleX;
          const itemPdfWidth = item.width * scaleX;
          const itemPdfHeight = item.height * scaleY;
          const itemPdfY = pdfHeight - ((item.y + item.height) * scaleY);

          // IN-PLACE REPLACEMENT OF EXISTING TEXT
          if (item.type === 'replace-text') {
            // Step 1: Draw clean solid whiteout over the old text location to erase original text
            page.drawRectangle({
              x: Math.max(0, itemPdfX - 1),
              y: Math.max(0, itemPdfY - 2),
              width: itemPdfWidth + 2,
              height: itemPdfHeight + 4,
              color: rgb(1, 1, 1), // 100% whiteout
              opacity: 1.0
            });

            // Step 2: Render new replaced text if not empty
            if (item.text && item.text.trim()) {
              const hex = item.color || '#0f172a';
              const r = parseInt(hex.slice(1, 3), 16) / 255;
              const g = parseInt(hex.slice(3, 5), 16) / 255;
              const b = parseInt(hex.slice(5, 7), 16) / 255;
              const pdfFontSize = (item.fontSize || 14) * scaleY;

              const isDevanagari = item.fontType === 'hindi' || PrivaUtils.isDevanagari(item.text);
              const isUnicode = isDevanagari || PrivaUtils.isUnicodeText(item.text);

              if (isUnicode) {
                const fontStack = isDevanagari 
                  ? "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif" 
                  : (item.fontFamily || "'Inter', sans-serif");

                const imgInfo = PrivaUtils.renderTextToImage(item.text, {
                  fontSize: pdfFontSize,
                  color: hex,
                  isBold: item.isBold,
                  fontFamily: fontStack,
                  scale: 3
                });

                const embeddedImg = await pdfDoc.embedPng(imgInfo.dataUrl);
                page.drawImage(embeddedImg, {
                  x: itemPdfX - imgInfo.padX,
                  y: itemPdfY + itemPdfHeight - imgInfo.height + (imgInfo.padY / 2),
                  width: imgInfo.width,
                  height: imgInfo.height
                });
              } else {
                page.drawText(item.text, {
                  x: itemPdfX + 1,
                  y: itemPdfY + 3,
                  size: pdfFontSize,
                  font: item.isBold ? helveticaBold : helvetica,
                  color: rgb(r, g, b)
                });
              }
            }
          } else if (item.type === 'text') {
            const hex = item.color || '#000000';
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            const pdfFontSize = (item.fontSize || 14) * scaleY;

            const isDevanagari = item.fontType === 'hindi' || PrivaUtils.isDevanagari(item.text) || 
                                (item.fontFamily && item.fontFamily.includes('Devanagari'));
            const isUnicode = isDevanagari || PrivaUtils.isUnicodeText(item.text);

            if (isUnicode) {
              const fontStack = isDevanagari 
                ? "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif" 
                : (item.fontFamily || "'Inter', sans-serif");

              const imgInfo = PrivaUtils.renderTextToImage(item.text, {
                fontSize: pdfFontSize,
                color: hex,
                isBold: item.isBold,
                fontFamily: fontStack,
                scale: 3
              });

              const embeddedImg = await pdfDoc.embedPng(imgInfo.dataUrl);
              page.drawImage(embeddedImg, {
                x: itemPdfX - imgInfo.padX,
                y: itemPdfY + itemPdfHeight - imgInfo.height + (imgInfo.padY / 2),
                width: imgInfo.width,
                height: imgInfo.height
              });
            } else {
              page.drawText(item.text, {
                x: itemPdfX,
                y: itemPdfY + 4,
                size: pdfFontSize,
                font: item.isBold ? helveticaBold : helvetica,
                color: rgb(r, g, b)
              });
            }
          } else if (item.type === 'image') {
            let embeddedImg;
            if (item.fileType === 'png') {
              embeddedImg = await pdfDoc.embedPng(item.dataUrl);
            } else {
              embeddedImg = await pdfDoc.embedJpg(item.dataUrl);
            }

            page.drawImage(embeddedImg, {
              x: itemPdfX,
              y: itemPdfY,
              width: itemPdfWidth,
              height: itemPdfHeight
            });
          } else if (item.type === 'shape') {
            if (item.shapeType === 'highlight') {
              page.drawRectangle({
                x: itemPdfX,
                y: itemPdfY,
                width: itemPdfWidth,
                height: itemPdfHeight,
                color: rgb(0.99, 0.88, 0.28),
                opacity: 0.4
              });
            } else {
              // Whiteout / Erase block
              page.drawRectangle({
                x: itemPdfX,
                y: itemPdfY,
                width: itemPdfWidth,
                height: itemPdfHeight,
                color: rgb(1, 1, 1),
                opacity: 1.0
              });
            }
          }
        }

        // Embed freehand drawing if drawn on this page
        if (drawDataUrl) {
          try {
            const drawImg = await pdfDoc.embedPng(drawDataUrl);
            page.drawImage(drawImg, {
              x: 0,
              y: 0,
              width: pdfWidth,
              height: pdfHeight
            });
          } catch (drawErr) {
            console.warn('Could not embed drawing for page', pageNum, drawErr);
          }
        }
      }

      PrivaUtils.updateProgress(90, 'Generating final downloadable PDF...');
      const editedBytes = await pdfDoc.save({ useObjectStreams: true });

      PrivaUtils.downloadBlob(editedBytes, `${EditTool.fileName}_edited.pdf`);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Edited PDF generated and downloaded successfully!', 'success');
    } catch (e) {
      console.error('Edit export error:', e);
      PrivaUtils.showToast('Export failed: ' + e.message, 'error');
    } finally {
      PrivaUtils.hideProgress();
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  }
};
