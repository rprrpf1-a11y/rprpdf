// Favicon & Multi-Size App Icon Generator — 100% In-Browser Execution
window.FaviconTool = {
  currentFile: null,
  sourceImg: null,
  generatedIcons: {}, // { size: Blob }

  init: () => {
    const fileInput = document.getElementById('favicon-file-input');
    const dropzone = document.getElementById('favicon-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          FaviconTool.loadFile(e.target.files[0]);
          fileInput.value = '';
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
          FaviconTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }
  },

  reset: () => {
    FaviconTool.currentFile = null;
    FaviconTool.sourceImg = null;
    FaviconTool.generatedIcons = {};

    const dropzone = document.getElementById('favicon-dropzone');
    const workspace = document.getElementById('favicon-workspace');
    if (dropzone) dropzone.classList.remove('hidden');
    if (workspace) workspace.classList.add('hidden');
  },

  loadFile: async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      PrivaUtils.showToast('Please select a square or high-res image (PNG, JPG, SVG).', 'error');
      return;
    }

    FaviconTool.currentFile = file;
    PrivaUtils.showProgress('Processing Logo', 30, 'Rendering icon scalers in browser...');

    try {
      const dataUrl = await PrivaUtils.readFileAsDataURL(file);
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image.'));
      });
      FaviconTool.sourceImg = img;

      const dropzone = document.getElementById('favicon-dropzone');
      const workspace = document.getElementById('favicon-workspace');
      if (dropzone) dropzone.classList.add('hidden');
      if (workspace) workspace.classList.remove('hidden');

      // Update previews
      const tabPreview = document.getElementById('favicon-tab-mock-img');
      const phonePreview = document.getElementById('favicon-phone-mock-img');
      if (tabPreview) tabPreview.src = dataUrl;
      if (phonePreview) phonePreview.src = dataUrl;

      // Render sizes preview
      await FaviconTool.renderAllSizes();
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Favicon package generated! Ready to download as ZIP.', 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Error generating favicons: ' + e.message, 'error');
    }
  },

  renderAllSizes: async () => {
    const img = FaviconTool.sourceImg;
    if (!img) return;

    const sizes = [
      { name: 'favicon-16x16.png', size: 16, label: 'Browser Tab (16×16)' },
      { name: 'favicon-32x32.png', size: 32, label: 'Standard Desktop (32×32)' },
      { name: 'favicon-48x48.png', size: 48, label: 'Windows / Toolbar (48×48)' },
      { name: 'apple-touch-icon.png', size: 180, label: 'Apple Touch (180×180)' },
      { name: 'android-chrome-192x192.png', size: 192, label: 'Android PWA (192×192)' },
      { name: 'android-chrome-512x512.png', size: 512, label: 'Splash Screen (512×512)' }
    ];

    const grid = document.getElementById('favicon-sizes-grid');
    if (grid) grid.innerHTML = '';

    FaviconTool.generatedIcons = {};

    for (const item of sizes) {
      const canvas = document.createElement('canvas');
      canvas.width = item.size;
      canvas.height = item.size;
      const ctx = canvas.getContext('2d');

      // Smooth bicubic resampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, item.size, item.size);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      FaviconTool.generatedIcons[item.name] = blob;

      if (grid) {
        const card = document.createElement('div');
        card.className = 'p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between';
        card.innerHTML = `
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center p-1 border border-slate-200/60">
              <img src="${canvas.toDataURL()}" class="max-w-full max-h-full object-contain" />
            </div>
            <div>
              <span class="font-bold text-slate-800 text-xs block">${item.name}</span>
              <span class="text-[10px] text-slate-400">${item.label}</span>
            </div>
          </div>
          <button type="button" onclick="FaviconTool.downloadSingle('${item.name}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">
            <i class="fa-solid fa-download"></i>
          </button>
        `;
        grid.appendChild(card);
      }
    }
  },

  downloadSingle: (filename) => {
    const blob = FaviconTool.generatedIcons[filename];
    if (blob) {
      PrivaUtils.downloadBlob(blob, filename);
      PrivaUtils.showToast(`Downloaded ${filename}`, 'success');
    }
  },

  // Package all icons + site.webmanifest + HTML into a ZIP archive
  downloadZipPackage: async () => {
    if (!window.JSZip || Object.keys(FaviconTool.generatedIcons).length === 0) {
      PrivaUtils.showToast('Please upload an icon image first.', 'error');
      return;
    }

    const btn = document.getElementById('favicon-zip-btn');
    const originalText = btn ? btn.innerHTML : 'Download Full Favicon Package (.ZIP)';
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Compiling ZIP Package...';
      btn.disabled = true;
    }

    try {
      const zip = new JSZip();

      // Add all PNG sizes
      for (const [name, blob] of Object.entries(FaviconTool.generatedIcons)) {
        zip.file(name, blob);
      }

      // Add site.webmanifest
      const manifest = {
        name: "My App",
        short_name: "App",
        icons: [
          { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
        ],
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone"
      };
      zip.file('site.webmanifest', JSON.stringify(manifest, null, 2));

      // Add Readme / HTML Code snippet
      const htmlSnippet = `<!-- Favicon HTML snippet (paste inside <head>) -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="manifest" href="/site.webmanifest">
`;
      zip.file('README-HTML-HEAD.html', htmlSnippet);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      PrivaUtils.downloadBlob(zipBlob, 'favicon_package.zip');
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Favicon ZIP package downloaded!', 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.showToast('ZIP compilation error: ' + e.message, 'error');
    } finally {
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  },

  copyHtmlSnippet: () => {
    const code = `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="manifest" href="/site.webmanifest">`;
    navigator.clipboard.writeText(code);
    PrivaUtils.showToast('HTML <head> tags copied to clipboard!', 'success');
  }
};
