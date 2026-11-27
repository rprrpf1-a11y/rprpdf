// Tool 16: 100% Client-Side Batch Image Compressor (JPEG, PNG, WebP)
window.ImageCompressTool = {
  items: [], // Array of { id, file, originalSize, compressedBlob, compressedSize, dataUrl, compressedDataUrl, width, height, percentSaved }

  init: () => {
    const fileInput = document.getElementById('imgcompress-file-input');
    const dropzone = document.getElementById('imgcompress-dropzone');
    const addMoreInput = document.getElementById('imgcompress-add-more-input');
    const qualitySlider = document.getElementById('imgcompress-quality-slider');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          ImageCompressTool.addFiles(Array.from(e.target.files));
        }
      });
    }

    if (addMoreInput) {
      addMoreInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          ImageCompressTool.addFiles(Array.from(e.target.files));
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
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          ImageCompressTool.addFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    if (qualitySlider) {
      qualitySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        const label = document.getElementById('imgcompress-quality-val');
        if (label) label.textContent = `${val}%`;
      });
    }
  },

  addFiles: async (newFiles) => {
    const imageFiles = newFiles.filter(f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(f.name));
    if (imageFiles.length === 0) {
      PrivaUtils.showToast('Please select valid image files (JPG, PNG, WebP).', 'error');
      return;
    }

    const dropzone = document.getElementById('imgcompress-dropzone');
    const workspace = document.getElementById('imgcompress-workspace');
    dropzone.classList.add('hidden');
    workspace.classList.remove('hidden');

    PrivaUtils.showProgress('Reading Images', 20, 'Loading image buffers into browser memory...');

    for (let i = 0; i < imageFiles.length; i++) {
      const f = imageFiles[i];
      const dataUrl = await PrivaUtils.readFileAsDataURL(f);

      const dimensions = await ImageCompressTool.getImageDimensions(dataUrl);

      ImageCompressTool.items.push({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        file: f,
        name: f.name,
        originalSize: f.size,
        dataUrl: dataUrl,
        width: dimensions.width,
        height: dimensions.height,
        compressedBlob: null,
        compressedSize: null,
        compressedDataUrl: null,
        percentSaved: null
      });

      PrivaUtils.updateProgress(20 + ((i + 1) / imageFiles.length) * 50, `Loaded ${i + 1} of ${imageFiles.length} images...`);
    }

    PrivaUtils.hideProgress();
    ImageCompressTool.renderList();
    // Automatically trigger compression on initial load
    await ImageCompressTool.compressAll();
  },

  getImageDimensions: (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 800, height: 600 });
      img.src = src;
    });
  },

  renderList: () => {
    const list = document.getElementById('imgcompress-list');
    const countBadge = document.getElementById('imgcompress-count-badge');
    if (!list) return;

    if (countBadge) countBadge.textContent = `${ImageCompressTool.items.length} Images`;

    if (ImageCompressTool.items.length === 0) {
      document.getElementById('imgcompress-workspace').classList.add('hidden');
      document.getElementById('imgcompress-dropzone').classList.remove('hidden');
      return;
    }

    list.innerHTML = '';

    ImageCompressTool.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:border-slate-300';

      const hasCompressed = item.compressedSize !== null;
      const isSmaller = hasCompressed && item.compressedSize < item.originalSize;
      const diffBytes = hasCompressed ? Math.abs(item.originalSize - item.compressedSize) : 0;
      const pct = hasCompressed ? Math.round((diffBytes / item.originalSize) * 100) : 0;

      row.innerHTML = `
        <div class="flex items-center space-x-3.5 w-full sm:w-auto truncate">
          <div class="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
            <img src="${item.compressedDataUrl || item.dataUrl}" class="w-full h-full object-cover" />
          </div>
          <div class="truncate">
            <h4 class="text-xs font-bold text-slate-800 truncate max-w-xs">${item.name}</h4>
            <p class="text-[11px] text-slate-400 mt-0.5">${item.width} × ${item.height} px</p>
            <div class="flex items-center space-x-2 mt-1">
              <span class="text-[11px] text-slate-500 line-through">${PrivaUtils.formatBytes(item.originalSize)}</span>
              ${hasCompressed ? `
                <i class="fa-solid fa-arrow-right text-[10px] text-slate-400"></i>
                <span class="text-xs font-bold ${isSmaller ? 'text-emerald-600' : 'text-slate-700'}">${PrivaUtils.formatBytes(item.compressedSize)}</span>
                ${isSmaller ? `<span class="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">-${pct}%</span>` : ''}
              ` : '<span class="text-[10px] text-slate-400">Ready to compress</span>'}
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
          ${hasCompressed ? `
            <button type="button" onclick="ImageCompressTool.downloadItem('${item.id}')" 
              class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center">
              <i class="fa-solid fa-download mr-1.5"></i> Download
            </button>
          ` : ''}
          <button type="button" onclick="ImageCompressTool.removeItem('${item.id}')" 
            title="Remove Image" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 flex items-center justify-center text-xs transition-colors">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;

      list.appendChild(row);
    });

    // Update global savings stat
    ImageCompressTool.updateSavingsSummary();
  },

  updateSavingsSummary: () => {
    let origTotal = 0;
    let compTotal = 0;
    let anyCompressed = false;

    ImageCompressTool.items.forEach(item => {
      origTotal += item.originalSize;
      if (item.compressedSize !== null) {
        compTotal += item.compressedSize;
        anyCompressed = true;
      } else {
        compTotal += item.originalSize;
      }
    });

    const summaryEl = document.getElementById('imgcompress-summary-text');
    if (!summaryEl) return;

    if (!anyCompressed || origTotal === 0) {
      summaryEl.textContent = 'Adjust quality and click "Compress Images"';
      return;
    }

    const savedBytes = Math.max(0, origTotal - compTotal);
    const savedPct = Math.round((savedBytes / origTotal) * 100);

    summaryEl.innerHTML = `
      Original: <strong>${PrivaUtils.formatBytes(origTotal)}</strong> ➔ 
      Compressed: <strong class="text-emerald-700">${PrivaUtils.formatBytes(compTotal)}</strong> 
      <span class="inline-flex items-center ml-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Saved ${savedPct}% (${PrivaUtils.formatBytes(savedBytes)})</span>
    `;
  },

  removeItem: (id) => {
    ImageCompressTool.items = ImageCompressTool.items.filter(i => i.id !== id);
    ImageCompressTool.renderList();
    PrivaUtils.showToast('Image removed.', 'info');
  },

  clearAll: () => {
    ImageCompressTool.items = [];
    ImageCompressTool.renderList();
  },

  compressAll: async () => {
    if (ImageCompressTool.items.length === 0) return;

    const quality = (parseInt(document.getElementById('imgcompress-quality-slider')?.value, 10) || 75) / 100;
    const maxDim = parseInt(document.getElementById('imgcompress-resize-select')?.value, 10) || 0;
    const format = document.getElementById('imgcompress-format-select')?.value || 'auto';

    const btn = document.getElementById('imgcompress-action-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Compressing on Device...';
    btn.disabled = true;

    PrivaUtils.showProgress('Compressing Images in Browser', 10, 'Processing raster channels on CPU...');

    const total = ImageCompressTool.items.length;

    try {
      for (let i = 0; i < total; i++) {
        const item = ImageCompressTool.items[i];
        PrivaUtils.updateProgress(10 + ((i + 1) / total) * 80, `Compressing image ${i + 1} of ${total}: ${item.name}...`);

        const result = await ImageCompressTool.compressSingleImage(item.dataUrl, item.file.type, quality, maxDim, format);
        item.compressedBlob = result.blob;
        item.compressedSize = result.blob.size;
        item.compressedDataUrl = result.dataUrl;
        item.width = result.width;
        item.height = result.height;
      }

      PrivaUtils.hideProgress();
      ImageCompressTool.renderList();
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`Compressed ${total} images successfully!`, 'success');
    } catch (e) {
      console.error('Compression error:', e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Compression failed: ' + e.message, 'error');
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  },

  compressSingleImage: (dataUrl, originalMime, quality, maxDim, formatChoice) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;

        // Apply dimension resizing if specified
        if (maxDim > 0 && (w > maxDim || h > maxDim)) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // Determine output MIME type
        let outMime = originalMime || 'image/jpeg';
        if (formatChoice === 'webp') outMime = 'image/webp';
        else if (formatChoice === 'jpeg') outMime = 'image/jpeg';
        else if (formatChoice === 'png') outMime = 'image/png';
        else if (outMime === 'image/png' && quality < 0.9) {
          // If user set quality slider lower for a PNG, convert to JPEG or WebP to actually compress
          outMime = 'image/webp';
        }

        // Fill white background for JPEGs to avoid black transparent pixels
        if (outMime === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }

        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas export failed'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              blob: blob,
              dataUrl: reader.result,
              width: w,
              height: h
            });
          };
          reader.readAsDataURL(blob);
        }, outMime, quality);
      };
      img.onerror = () => reject(new Error('Image failed to load on canvas'));
      img.src = dataUrl;
    });
  },

  downloadItem: (id) => {
    const item = ImageCompressTool.items.find(i => i.id === id);
    if (!item || !item.compressedBlob) return;

    const ext = item.compressedBlob.type === 'image/webp' ? 'webp' : (item.compressedBlob.type === 'image/png' ? 'png' : 'jpg');
    const baseName = item.name.replace(/\.[^/.]+$/, '');
    PrivaUtils.downloadBlob(item.compressedBlob, `${baseName}_compressed.${ext}`, item.compressedBlob.type);
  },

  downloadAllZip: async () => {
    const compressedItems = ImageCompressTool.items.filter(i => i.compressedBlob);
    if (compressedItems.length === 0) {
      PrivaUtils.showToast('No compressed images to download.', 'error');
      return;
    }

    if (compressedItems.length === 1) {
      ImageCompressTool.downloadItem(compressedItems[0].id);
      return;
    }

    const btn = document.getElementById('imgcompress-zip-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Zipping Images...';
    btn.disabled = true;

    PrivaUtils.showProgress('Creating ZIP Archive', 30, 'Compressing images into single ZIP archive...');

    try {
      const zip = new JSZip();

      for (let i = 0; i < compressedItems.length; i++) {
        const item = compressedItems[i];
        const ext = item.compressedBlob.type === 'image/webp' ? 'webp' : (item.compressedBlob.type === 'image/png' ? 'png' : 'jpg');
        const baseName = item.name.replace(/\.[^/.]+$/, '');
        zip.file(`${baseName}_compressed.${ext}`, item.compressedBlob);
      }

      PrivaUtils.updateProgress(85, 'Finalizing ZIP stream...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      PrivaUtils.downloadBlob(zipBlob, 'compressed_images.zip', 'application/zip');
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`Downloaded all ${compressedItems.length} compressed images as ZIP!`, 'success');
    } catch (e) {
      console.error('ZIP error:', e);
      PrivaUtils.showToast('Failed to create ZIP: ' + e.message, 'error');
    } finally {
      PrivaUtils.hideProgress();
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  }
};
