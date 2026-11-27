// Utility functions for RprPDF
// Zero-storage client-side processing, memory management, and dynamic script loader

window.PrivaUtils = {
  activeObjectUrls: new Set(),
  loadedScripts: new Set(),
  workerInstance: null,
  workerTaskId: 0,
  workerCallbacks: new Map(),

  // Safe resolver for PDF-Lib (guarantees window.PDFLib and window.PDFLIB are available)
  getPDFLib: async () => {
    if (window.PDFLib) {
      window.PDFLIB = window.PDFLib;
      return window.PDFLib;
    }
    if (window.PDFLIB) {
      window.PDFLib = window.PDFLIB;
      return window.PDFLIB;
    }

    // Try local vendor first
    try {
      await PrivaUtils.loadScript('js/vendor/pdf-lib.min.js');
      if (window.PDFLib) {
        window.PDFLIB = window.PDFLib;
        return window.PDFLib;
      }
    } catch (e) {
      console.warn('Local pdf-lib load failed, trying CDN fallback...', e);
    }

    // Fallback to CDN
    try {
      await PrivaUtils.loadScript('https://cdn.jsdelivr.net/npm/pdf-lib/dist/pdf-lib.min.js');
      if (window.PDFLib) {
        window.PDFLIB = window.PDFLib;
        return window.PDFLib;
      }
    } catch (e) {
      console.error('All pdf-lib sources failed to load:', e);
    }

    return window.PDFLib || window.PDFLIB || null;
  },

  // Resolve root-relative asset paths safely across nested SEO URLs (e.g. /unlock-pdf/) and file://
  resolveAssetUrl: (path) => {
    if (!path || /^(https?:|data:|blob:|\/)/.test(path)) return path;
    return window.location.protocol === 'file:' ? path : `/${path}`;
  },

  // Setup PDF.js worker (Local worker to prevent cross-origin errors)
  initPdfJs: () => {
    if (window.pdfjsLib) {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PrivaUtils.resolveAssetUrl('js/vendor/pdf.worker.min.js');
      } catch (e) {
        console.warn('PDF.js worker setup fallback:', e);
      }
    }
  },

  // Dynamic on-demand script loader (Code-splitting & keeping initial load under 1 second)
  loadScript: (url) => {
    const resolved = PrivaUtils.resolveAssetUrl(url);
    if (PrivaUtils.loadedScripts.has(resolved)) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = resolved;
      script.async = true;
      script.onload = () => {
        PrivaUtils.loadedScripts.add(resolved);
        resolve();
      };
      script.onerror = (err) => reject(new Error(`Failed to load dependency: ${resolved}`));
      document.head.appendChild(script);
    });
  },

  // Web Worker Management
  initWorker: () => {
    if (window.Worker && !PrivaUtils.workerInstance) {
      try {
        PrivaUtils.workerInstance = new Worker(PrivaUtils.resolveAssetUrl('js/pdf-worker.js'));
        PrivaUtils.workerInstance.onmessage = (e) => {
          const { id, status, result, error } = e.data;
          const callback = PrivaUtils.workerCallbacks.get(id);
          if (callback) {
            PrivaUtils.workerCallbacks.delete(id);
            if (status === 'SUCCESS') callback.resolve(result);
            else callback.reject(new Error(error));
          }
        };
      } catch (e) {
        console.warn('Web Worker initialization skipped (running on local file or restricted context). Falling back to main thread.', e);
      }
    }
  },

  runWorkerTask: (action, payload) => {
    PrivaUtils.initWorker();
    if (!PrivaUtils.workerInstance) {
      return Promise.resolve(null);
    }
    const id = ++PrivaUtils.workerTaskId;
    return new Promise((resolve, reject) => {
      PrivaUtils.workerCallbacks.set(id, { resolve, reject });
      PrivaUtils.workerInstance.postMessage({ action, id, payload });
    });
  },

  // Format bytes to human readable string
  formatBytes: (bytes, decimals = 1) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  },

  // Read file as ArrayBuffer
  readFileAsArrayBuffer: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  // Read file as Text
  readFileAsText: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  // Read file as Data URL
  readFileAsDataURL: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Memory-Safe Download: triggers download and immediately schedules revocation
  downloadBlob: (data, filename, type = 'application/pdf') => {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    PrivaUtils.activeObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      PrivaUtils.activeObjectUrls.delete(url);
    }, 250);
  },

  // Memory cleanup helper for clearing large ArrayBuffers
  cleanupBuffers: (...buffers) => {
    buffers.forEach(buf => {
      if (buf && buf.buffer) {
        // Clear references
        buf = null;
      }
    });
    // Revoke any pending object URLs
    PrivaUtils.activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
    PrivaUtils.activeObjectUrls.clear();
  },

  // Progressive Feedback: Modal Progress Bar
  showProgress: (title = 'Processing...', percent = 0, statusText = 'Working...') => {
    const modal = document.getElementById('progress-modal');
    const titleEl = document.getElementById('progress-modal-title');
    const barEl = document.getElementById('progress-modal-bar');
    const percentEl = document.getElementById('progress-modal-percent');
    const statusEl = document.getElementById('progress-modal-status');

    if (titleEl) titleEl.textContent = title;
    if (barEl) barEl.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
    if (statusEl) statusEl.textContent = statusText;

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  updateProgress: (percent, statusText) => {
    const barEl = document.getElementById('progress-modal-bar');
    const percentEl = document.getElementById('progress-modal-percent');
    const statusEl = document.getElementById('progress-modal-status');

    if (barEl) barEl.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
    if (statusText && statusEl) statusEl.textContent = statusText;
  },

  hideProgress: () => {
    const modal = document.getElementById('progress-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  // Trigger celebration confetti
  triggerConfetti: () => {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  },

  // Detect if a string contains characters outside 8-bit Latin-1 / WinAnsi (e.g. Devanagari, Indic, Asian, Cyrillic)
  isUnicodeText: (text) => {
    if (!text) return false;
    return /[^\u0000-\u00FF]/.test(text);
  },

  // Detect if text contains Devanagari characters (Hindi, Marathi, Sanskrit, Nepali: \u0900-\u097F)
  isDevanagari: (text) => {
    if (!text) return false;
    return /[\u0900-\u097F]/.test(text);
  },

  // High-DPI transparent canvas rendering with full native browser text shaping (HarfBuzz/DirectWrite/CoreText)
  // Perfectly renders Devanagari ligatures, matras, conjuncts & complex scripts with zero distortion
  renderTextToImage: (text, options = {}) => {
    const fontSize = options.fontSize || 16;
    const color = options.color || '#000000';
    const isBold = options.isBold || false;
    const fontFamily = options.fontFamily || "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', system-ui, sans-serif";
    const scale = options.scale || 3; // 3x supersampling for razor sharp vector-like output

    const offscreen = document.createElement('canvas');
    const ctx = offscreen.getContext('2d');

    const weight = isBold ? '700' : '400';
    const fontStr = `${weight} ${fontSize * scale}px ${fontFamily}`;
    ctx.font = fontStr;

    const metrics = ctx.measureText(text);
    const textWidth = Math.max(1, Math.ceil(metrics.width));
    const ascent = metrics.actualBoundingBoxAscent || (fontSize * scale * 0.85);
    const descent = metrics.actualBoundingBoxDescent || (fontSize * scale * 0.25);
    const textHeight = Math.max(1, Math.ceil(ascent + descent));
    const pad = Math.ceil(6 * scale);

    const canvasWidth = textWidth + pad * 2;
    const canvasHeight = textHeight + pad * 2;

    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;

    // Reset context state after resize
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.font = fontStr;
    ctx.fillStyle = color;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, pad, pad + ascent);

    return {
      dataUrl: offscreen.toDataURL('image/png'),
      width: canvasWidth / scale,
      height: canvasHeight / scale,
      padX: pad / scale,
      padY: pad / scale
    };
  },

  // Toast notification system
  showToast: (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const isError = type === 'error';
    const isSuccess = type === 'success';

    const bgClass = isError 
      ? 'bg-rose-600 text-white' 
      : isSuccess 
        ? 'bg-emerald-600 text-white' 
        : 'bg-slate-900 text-white';

    const icon = isError 
      ? '<i class="fa-solid fa-circle-exclamation mr-2"></i>' 
      : isSuccess 
        ? '<i class="fa-solid fa-circle-check mr-2"></i>' 
        : '<i class="fa-solid fa-circle-info mr-2"></i>';

    toast.className = `flex items-center px-4 py-3 rounded-xl shadow-xl text-sm font-medium transform transition-all duration-300 translate-y-3 opacity-0 ${bgClass}`;
    toast.innerHTML = `
      <div class="flex items-center">
        ${icon}
        <span>${message}</span>
      </div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }
};

// Expose RprUtils alias
window.RprUtils = window.PrivaUtils;

// Initialize PDF.js worker
window.addEventListener('DOMContentLoaded', () => {
  window.PrivaUtils.initPdfJs();
  window.PrivaUtils.initWorker();
});
