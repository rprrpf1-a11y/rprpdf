// Sign PDF Tool
window.SignTool = {
  pdfBytes: null,
  pdfJsDoc: null,
  fileName: '',
  currentPage: 1,
  totalPages: 1,
  pageViewport: null,
  currentSignatureDataUrl: null,

  // Signature placement state
  placedSignatures: [], // Array of { page, xPercent, yPercent, widthPercent, heightPercent, dataUrl }

  // Drawing canvas state
  drawCanvas: null,
  drawCtx: null,
  isDrawing: false,
  penColor: '#000000',
  penWidth: 2.5,

  init: () => {
    const fileInput = document.getElementById('sign-file-input');
    const dropzone = document.getElementById('sign-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          SignTool.loadFile(e.target.files[0]);
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
          SignTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    SignTool.initSignatureCanvas();
  },

  loadFile: async (file) => {
    if (!file || file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      PrivaUtils.showToast('Please upload a valid PDF file.', 'error');
      return;
    }

    SignTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    SignTool.placedSignatures = [];
    SignTool.currentPage = 1;

    const dropzone = document.getElementById('sign-dropzone');
    const workspace = document.getElementById('sign-workspace');
    dropzone.classList.add('hidden');
    workspace.classList.remove('hidden');

    try {
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      SignTool.pdfBytes = buffer;

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      SignTool.pdfJsDoc = await loadingTask.promise;
      SignTool.totalPages = SignTool.pdfJsDoc.numPages;

      document.getElementById('sign-page-info').textContent = `Page 1 of ${SignTool.totalPages}`;
      await SignTool.renderCurrentPage();

      PrivaUtils.showToast('PDF loaded. Create a signature and place it anywhere!', 'success');
    } catch (e) {
      console.error('Sign load error:', e);
      PrivaUtils.showToast('Could not read PDF.', 'error');
      workspace.classList.add('hidden');
      dropzone.classList.remove('hidden');
    }
  },

  renderCurrentPage: async () => {
    if (!SignTool.pdfJsDoc) return;

    const canvas = document.getElementById('sign-pdf-canvas');
    const container = document.getElementById('sign-canvas-wrapper');
    const page = await SignTool.pdfJsDoc.getPage(SignTool.currentPage);

    // Calculate nice view scale based on wrapper width
    const containerWidth = Math.min(container.parentElement.clientWidth - 48, 800);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = containerWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    SignTool.pageViewport = viewport;
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Re-render placed signature markers for current page
    SignTool.renderPlacedSignatures();
  },

  prevPage: async () => {
    if (SignTool.currentPage > 1) {
      SignTool.currentPage--;
      document.getElementById('sign-page-info').textContent = `Page ${SignTool.currentPage} of ${SignTool.totalPages}`;
      await SignTool.renderCurrentPage();
    }
  },

  nextPage: async () => {
    if (SignTool.currentPage < SignTool.totalPages) {
      SignTool.currentPage++;
      document.getElementById('sign-page-info').textContent = `Page ${SignTool.currentPage} of ${SignTool.totalPages}`;
      await SignTool.renderCurrentPage();
    }
  },

  // Drawing Canvas setup
  initSignatureCanvas: () => {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;

    SignTool.drawCanvas = canvas;
    SignTool.drawCtx = canvas.getContext('2d');

    // High-DPI canvas setup
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2 || 600;
    canvas.height = 280;
    SignTool.drawCtx.scale(2, 2);

    const getPos = (e) => {
      const b = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - b.left,
        y: clientY - b.top
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      SignTool.isDrawing = true;
      const pos = getPos(e);
      SignTool.drawCtx.beginPath();
      SignTool.drawCtx.moveTo(pos.x, pos.y);
      SignTool.drawCtx.strokeStyle = SignTool.penColor;
      SignTool.drawCtx.lineWidth = SignTool.penWidth;
      SignTool.drawCtx.lineCap = 'round';
      SignTool.drawCtx.lineJoin = 'round';
    };

    const draw = (e) => {
      if (!SignTool.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      SignTool.drawCtx.lineTo(pos.x, pos.y);
      SignTool.drawCtx.stroke();
    };

    const stopDraw = () => {
      SignTool.isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDraw);
  },

  clearSignaturePad: () => {
    if (!SignTool.drawCanvas) return;
    SignTool.drawCtx.clearRect(0, 0, SignTool.drawCanvas.width, SignTool.drawCanvas.height);
  },

  setPenColor: (color) => {
    SignTool.penColor = color;
    document.querySelectorAll('.pen-color-btn').forEach(btn => {
      btn.classList.toggle('ring-2', btn.dataset.color === color);
    });
  },

  openSignatureModal: () => {
    const modal = document.getElementById('signature-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    SignTool.clearSignaturePad();
  },

  closeSignatureModal: () => {
    const modal = document.getElementById('signature-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  saveDrawnSignature: () => {
    const canvas = SignTool.drawCanvas;
    // Check if empty
    const pixelBuffer = new Uint32Array(
      SignTool.drawCtx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    const hasDrawn = pixelBuffer.some(color => color !== 0);

    if (!hasDrawn) {
      PrivaUtils.showToast('Please draw your signature before saving.', 'error');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    SignTool.placeSignatureOnPage(dataUrl);
    SignTool.closeSignatureModal();
  },

  saveTypedSignature: () => {
    const input = document.getElementById('typed-sig-input');
    const text = input ? input.value.trim() : '';
    if (!text) {
      PrivaUtils.showToast('Please type your name.', 'error');
      return;
    }

    // Render handwriting text to offscreen canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 600;
    offCanvas.height = 180;
    const ctx = offCanvas.getContext('2d');
    ctx.font = '72px "Caveat", "Noto Sans Devanagari", "Mangal", "Nirmala UI", cursive, sans-serif';
    ctx.fillStyle = SignTool.penColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 300, 90);

    const dataUrl = offCanvas.toDataURL('image/png');
    SignTool.placeSignatureOnPage(dataUrl);
    SignTool.closeSignatureModal();
  },

  handleUploadSignature: (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        SignTool.placeSignatureOnPage(reader.result);
        SignTool.closeSignatureModal();
      };
      reader.readAsDataURL(file);
    }
  },

  placeSignatureOnPage: (dataUrl) => {
    const wrapper = document.getElementById('sign-canvas-wrapper');
    if (!wrapper) return;

    // Place at center by default
    const sigId = 'sig-' + Date.now();
    const defaultWidth = 160;
    const defaultHeight = 65;

    const sigObj = {
      id: sigId,
      page: SignTool.currentPage,
      left: 60,
      top: 60,
      width: defaultWidth,
      height: defaultHeight,
      dataUrl: dataUrl
    };

    SignTool.placedSignatures.push(sigObj);
    SignTool.createDraggableElement(sigObj);
    PrivaUtils.showToast('Signature placed! Drag or resize it into position.', 'success');
  },

  createDraggableElement: (sig) => {
    const wrapper = document.getElementById('sign-canvas-wrapper');
    const el = document.createElement('div');
    el.id = sig.id;
    el.className = 'signature-draggable group';
    el.style.left = `${sig.left}px`;
    el.style.top = `${sig.top}px`;
    el.style.width = `${sig.width}px`;
    el.style.height = `${sig.height}px`;

    el.innerHTML = `
      <img src="${sig.dataUrl}" class="w-full h-full object-contain pointer-events-none select-none" />
      <div class="resize-handle se" title="Drag to resize"></div>
      <div class="resize-handle del" title="Remove signature">
        <i class="fa-solid fa-xmark"></i>
      </div>
    `;

    // Make Draggable
    let isDragging = false;
    let isResizing = false;
    let startX, startY, origLeft, origTop, origWidth, origHeight;

    el.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('del') || e.target.closest('.del')) {
        el.remove();
        SignTool.placedSignatures = SignTool.placedSignatures.filter(s => s.id !== sig.id);
        return;
      }

      if (e.target.classList.contains('se')) {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        origWidth = el.offsetWidth;
        origHeight = el.offsetHeight;
        e.stopPropagation();
      } else {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        origLeft = el.offsetLeft;
        origTop = el.offsetTop;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newLeft = Math.max(0, Math.min(wrapper.clientWidth - el.offsetWidth, origLeft + dx));
        const newTop = Math.max(0, Math.min(wrapper.clientHeight - el.offsetHeight, origTop + dy));
        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;
        sig.left = newLeft;
        sig.top = newTop;
      } else if (isResizing) {
        const dx = e.clientX - startX;
        const newW = Math.max(60, origWidth + dx);
        const newH = newW * (origHeight / origWidth); // maintain aspect ratio
        el.style.width = `${newW}px`;
        el.style.height = `${newH}px`;
        sig.width = newW;
        sig.height = newH;
      }
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      isResizing = false;
    });

    wrapper.appendChild(el);
  },

  renderPlacedSignatures: () => {
    const wrapper = document.getElementById('sign-canvas-wrapper');
    // Remove existing signature elements in DOM
    wrapper.querySelectorAll('.signature-draggable').forEach(e => e.remove());

    // Only add signatures that belong to current page
    SignTool.placedSignatures
      .filter(s => s.page === SignTool.currentPage)
      .forEach(s => SignTool.createDraggableElement(s));
  },

  // Save signed PDF
  exportSignedPdf: async () => {
    if (SignTool.placedSignatures.length === 0) {
      PrivaUtils.showToast('Please add at least one signature to your document.', 'error');
      return;
    }

    const btn = document.getElementById('sign-download-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Embedding Signatures...';
    btn.disabled = true;

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.load(SignTool.pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      for (const sig of SignTool.placedSignatures) {
        const targetPage = pages[sig.page - 1];
        if (!targetPage) continue;

        const { width: pdfWidth, height: pdfHeight } = targetPage.getSize();
        const canvas = document.getElementById('sign-pdf-canvas');
        const viewWidth = canvas.width;
        const viewHeight = canvas.height;

        // Scaling factors from screen canvas to PDF coordinate points
        const scaleX = pdfWidth / viewWidth;
        const scaleY = pdfHeight / viewHeight;

        const pngImageBytes = await fetch(sig.dataUrl).then(res => res.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(pngImageBytes);

        const sigWidthInPdf = sig.width * scaleX;
        const sigHeightInPdf = sig.height * scaleY;
        const sigXInPdf = sig.left * scaleX;
        // In PDF coordinates (0,0) is bottom-left, while in web DOM it is top-left
        const sigYInPdf = pdfHeight - (sig.top * scaleY) - sigHeightInPdf;

        targetPage.drawImage(pngImage, {
          x: sigXInPdf,
          y: sigYInPdf,
          width: sigWidthInPdf,
          height: sigHeightInPdf,
        });
      }

      const signedBytes = await pdfDoc.save();
      PrivaUtils.downloadBlob(signedBytes, `${SignTool.fileName}_signed.pdf`);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Signed PDF exported successfully!', 'success');
    } catch (err) {
      console.error('Sign export error:', err);
      PrivaUtils.showToast('Failed to export signed PDF: ' + err.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
};
