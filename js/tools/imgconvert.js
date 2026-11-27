// Image Converter & Smart Resizer Studio — 100% Client-Side Batch Canvas Pipeline
window.ImgConvertTool = {
  files: [],
  convertedItems: [],
  aspectRatio: null,

  init: () => {
    const fileInput = document.getElementById('imgconv-file-input');
    const dropzone = document.getElementById('imgconv-dropzone');
    const wInput = document.getElementById('imgconv-width');
    const hInput = document.getElementById('imgconv-height');
    const lockCb = document.getElementById('imgconv-lock-ratio');
    const qualitySlider = document.getElementById('imgconv-quality');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          ImgConvertTool.addFiles(Array.from(e.target.files));
        }
      });
    }

    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-violet-500', 'bg-violet-50/50');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-violet-500', 'bg-violet-50/50');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-violet-500', 'bg-violet-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          ImgConvertTool.addFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    if (wInput) {
      wInput.addEventListener('input', () => {
        if (lockCb?.checked && ImgConvertTool.aspectRatio && wInput.value) {
          const newW = parseInt(wInput.value, 10);
          if (newW > 0 && hInput) {
            hInput.value = Math.round(newW / ImgConvertTool.aspectRatio);
          }
        }
      });
    }

    if (hInput) {
      hInput.addEventListener('input', () => {
        if (lockCb?.checked && ImgConvertTool.aspectRatio && hInput.value) {
          const newH = parseInt(hInput.value, 10);
          if (newH > 0 && wInput) {
            wInput.value = Math.round(newH * ImgConvertTool.aspectRatio);
          }
        }
      });
    }

    if (qualitySlider) {
      qualitySlider.addEventListener('input', () => {
        const valEl = document.getElementById('imgconv-quality-val');
        if (valEl) valEl.textContent = `${Math.round(parseFloat(qualitySlider.value) * 100)}%`;
      });
    }
  },

  addFiles: async (fileList) => {
    const valid = fileList.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|svg|bmp|gif)$/i.test(f.name));
    if (valid.length === 0) {
      PrivaUtils.showToast('Please select valid image files (PNG, JPG, WebP, SVG).', 'error');
      return;
    }

    for (const file of valid) {
      const dataUrl = await ImgConvertTool.readAsDataUrl(file);
      const dims = await ImgConvertTool.getImageDimensions(dataUrl);
      ImgConvertTool.files.push({
        file,
        name: file.name,
        origSize: file.size,
        dataUrl,
        width: dims.width,
        height: dims.height
      });

      if (!ImgConvertTool.aspectRatio && dims.width && dims.height) {
        ImgConvertTool.aspectRatio = dims.width / dims.height;
      }
    }

    document.getElementById('imgconv-dropzone')?.classList.add('hidden');
    document.getElementById('imgconv-workspace')?.classList.remove('hidden');

    ImgConvertTool.renderQueue();
    PrivaUtils.showToast(`Loaded ${valid.length} image(s) for conversion.`, 'success');
  },

  readAsDataUrl: (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  }),

  getImageDimensions: (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 512, height: img.naturalHeight || 512 });
    img.onerror = () => resolve({ width: 512, height: 512 });
    img.src = src;
  }),

  applyPreset: (w, h) => {
    const wEl = document.getElementById('imgconv-width');
    const hEl = document.getElementById('imgconv-height');
    const lockCb = document.getElementById('imgconv-lock-ratio');
    if (w === 0 && h === 0) {
      if (wEl) wEl.value = '';
      if (hEl) hEl.value = '';
      PrivaUtils.showToast('Using original image dimensions.', 'info');
      return;
    }
    if (lockCb) lockCb.checked = false;
    if (wEl) wEl.value = w;
    if (hEl) hEl.value = h;
    PrivaUtils.showToast(`Resize target set to ${w} × ${h} px.`, 'info');
  },

  renderQueue: () => {
    const list = document.getElementById('imgconv-list');
    if (!list) return;

    list.innerHTML = ImgConvertTool.files.map((item, idx) => {
      const converted = ImgConvertTool.convertedItems[idx];
      return `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <div class="flex items-center space-x-3 min-w-0">
            <img src="${item.dataUrl}" class="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white shrink-0" alt="Preview">
            <div class="min-w-0">
              <p class="text-xs font-bold text-slate-900 truncate">${item.name}</p>
              <p class="text-[11px] text-slate-500">
                ${item.width}×${item.height}px • ${PrivaUtils.formatBytes(item.origSize)}
                ${converted ? ` <span class="text-violet-600 font-bold">➔ ${converted.outWidth}×${converted.outHeight}px ${converted.ext.toUpperCase()} (${PrivaUtils.formatBytes(converted.blob.size)})</span>` : ''}
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-2 shrink-0">
            ${converted ? `
              <button type="button" onclick="ImgConvertTool.downloadSingle(${idx})"
                class="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-sm">
                <i class="fa-solid fa-download mr-1"></i> Save
              </button>` : ''}
            <button type="button" onclick="ImgConvertTool.removeItem(${idx})"
              class="p-1.5 text-slate-400 hover:text-rose-600 text-xs">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  removeItem: (idx) => {
    ImgConvertTool.files.splice(idx, 1);
    ImgConvertTool.convertedItems.splice(idx, 1);
    if (ImgConvertTool.files.length === 0) {
      ImgConvertTool.reset();
    } else {
      ImgConvertTool.renderQueue();
    }
  },

  convertAll: async () => {
    if (ImgConvertTool.files.length === 0) return;

    const formatMime = document.getElementById('imgconv-format')?.value || 'image/webp';
    const quality = parseFloat(document.getElementById('imgconv-quality')?.value || '0.9');
    const targetW = parseInt(document.getElementById('imgconv-width')?.value || '0', 10);
    const targetH = parseInt(document.getElementById('imgconv-height')?.value || '0', 10);
    const bgHex = document.getElementById('imgconv-bg-color')?.value || '#ffffff';

    const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
    const ext = extMap[formatMime] || 'png';

    PrivaUtils.showProgress('Converting Images in Browser', 15, 'Processing canvas batch...');
    ImgConvertTool.convertedItems = [];

    try {
      for (let i = 0; i < ImgConvertTool.files.length; i++) {
        const item = ImgConvertTool.files[i];
        PrivaUtils.updateProgress(Math.round(15 + ((i + 1) / ImgConvertTool.files.length) * 80), `Converting ${item.name}...`);

        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = item.dataUrl;
        });

        let outW = item.width;
        let outH = item.height;
        if (targetW > 0 && targetH > 0) {
          outW = targetW;
          outH = targetH;
        } else if (targetW > 0) {
          outW = targetW;
          outH = Math.round(item.height * (targetW / item.width));
        } else if (targetH > 0) {
          outH = targetH;
          outW = Math.round(item.width * (targetH / item.height));
        }

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (formatMime === 'image/jpeg') {
          ctx.fillStyle = bgHex;
          ctx.fillRect(0, 0, outW, outH);
        }

        ctx.drawImage(img, 0, 0, outW, outH);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, formatMime, quality));
        const base = item.name.replace(/\.[^/.]+$/, '');

        ImgConvertTool.convertedItems.push({
          blob,
          outName: `${base}.${ext}`,
          ext,
          outWidth: outW,
          outHeight: outH
        });
      }

      ImgConvertTool.renderQueue();
      document.getElementById('imgconv-zip-btn')?.classList.toggle('hidden', ImgConvertTool.convertedItems.length < 2);
      PrivaUtils.hideProgress();
      PrivaUtils.triggerConfetti();

      if (ImgConvertTool.convertedItems.length === 1) {
        ImgConvertTool.downloadSingle(0);
      } else {
        PrivaUtils.showToast(`Converted ${ImgConvertTool.convertedItems.length} images! Save individually or download ZIP.`, 'success');
      }
    } catch (err) {
      console.error(err);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Conversion error: ' + err.message, 'error');
    }
  },

  downloadSingle: (idx) => {
    const conv = ImgConvertTool.convertedItems[idx];
    if (!conv) return;
    PrivaUtils.downloadBlob(conv.blob, conv.outName);
  },

  downloadAllZip: async () => {
    if (ImgConvertTool.convertedItems.length === 0) return;
    const zip = new JSZip();
    ImgConvertTool.convertedItems.forEach(item => {
      zip.file(item.outName, item.blob);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    PrivaUtils.downloadBlob(content, 'rprpdf_converted_images.zip');
    PrivaUtils.showToast('All converted images downloaded as ZIP!', 'success');
  },

  reset: () => {
    ImgConvertTool.files = [];
    ImgConvertTool.convertedItems = [];
    ImgConvertTool.aspectRatio = null;
    const fileInput = document.getElementById('imgconv-file-input');
    if (fileInput) fileInput.value = '';
    document.getElementById('imgconv-zip-btn')?.classList.add('hidden');
    document.getElementById('imgconv-workspace')?.classList.add('hidden');
    document.getElementById('imgconv-dropzone')?.classList.remove('hidden');
  }
};
