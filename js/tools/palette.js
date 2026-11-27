// Brand Color Palette Extractor, WCAG Contrast Checker & Mesh Gradient Studio
window.PaletteTool = {
  extractedColors: ['#4f46e5', '#059669', '#0ea5e9', '#f59e0b', '#0f172a'],

  init: () => {
    const fileInput = document.getElementById('palette-img-input');
    const c1 = document.getElementById('pal-grad-c1');
    const c2 = document.getElementById('pal-grad-c2');
    const angle = document.getElementById('pal-grad-angle');
    const fg = document.getElementById('pal-contrast-fg');
    const bg = document.getElementById('pal-contrast-bg');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files?.[0]) PaletteTool.extractFromImage(e.target.files[0]);
      });
    }

    [c1, c2, angle].forEach(el => {
      if (el) el.addEventListener('input', PaletteTool.updateGradient);
    });
    [fg, bg].forEach(el => {
      if (el) el.addEventListener('input', PaletteTool.updateContrast);
    });

    PaletteTool.renderSwatches();
    PaletteTool.updateGradient();
    PaletteTool.updateContrast();
  },

  extractFromImage: (file) => {
    if (!file || !file.type.startsWith('image/')) {
      return PrivaUtils.showToast('Please select a valid image or logo.', 'error');
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const preview = document.getElementById('palette-img-preview');
        if (preview) {
          preview.src = ev.target.result;
          preview.classList.remove('hidden');
        }

        // Quantize pixels cleanly on tiny offscreen canvas
        const canvas = document.createElement('canvas');
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        const buckets = {};
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue; // skip transparent
          const r = Math.round(data[i] / 24) * 24;
          const g = Math.round(data[i + 1] / 24) * 24;
          const b = Math.round(data[i + 2] / 24) * 24;
          const hex = '#' + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('');
          buckets[hex] = (buckets[hex] || 0) + 1;
        }

        const top = Object.entries(buckets)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(e => e[0]);

        if (top.length > 0) {
          PaletteTool.extractedColors = top;
          PaletteTool.renderSwatches();
          if (top[0]) document.getElementById('pal-grad-c1').value = top[0];
          if (top[1]) document.getElementById('pal-grad-c2').value = top[1];
          PaletteTool.updateGradient();
          PrivaUtils.showToast(`Extracted ${top.length} brand colors locally!`, 'success');
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  },

  randomizePalette: () => {
    const randHex = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    PaletteTool.extractedColors = Array.from({ length: 5 }, randHex);
    document.getElementById('pal-grad-c1').value = PaletteTool.extractedColors[0];
    document.getElementById('pal-grad-c2').value = PaletteTool.extractedColors[1];
    PaletteTool.renderSwatches();
    PaletteTool.updateGradient();
  },

  renderSwatches: () => {
    const grid = document.getElementById('pal-swatches-grid');
    if (!grid) return;
    grid.innerHTML = PaletteTool.extractedColors.map(hex => `
      <button type="button" onclick="navigator.clipboard.writeText('${hex}'); PrivaUtils.showToast('Copied ${hex}!', 'success');"
        class="group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all text-left">
        <div class="h-14 w-full" style="background:${hex}"></div>
        <div class="px-2.5 py-1.5 flex items-center justify-between text-[11px] font-mono font-bold text-slate-700">
          <span>${hex.toUpperCase()}</span>
          <i class="fa-regular fa-copy text-slate-400 group-hover:text-indigo-600"></i>
        </div>
      </button>
    `).join('');
  },

  updateGradient: () => {
    const c1 = document.getElementById('pal-grad-c1')?.value || '#4f46e5';
    const c2 = document.getElementById('pal-grad-c2')?.value || '#10b981';
    const angle = document.getElementById('pal-grad-angle')?.value || '135';
    const css = `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`;

    const box = document.getElementById('pal-grad-preview');
    const code = document.getElementById('pal-grad-css');
    const angVal = document.getElementById('pal-grad-angle-val');
    if (box) box.style.background = css;
    if (code) code.value = `background: ${css};`;
    if (angVal) angVal.textContent = `${angle}°`;
  },

  downloadWallpaperPng: () => {
    const c1 = document.getElementById('pal-grad-c1')?.value || '#4f46e5';
    const c2 = document.getElementById('pal-grad-c2')?.value || '#10b981';
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);
    canvas.toBlob(blob => {
      PrivaUtils.downloadBlob(blob, 'gradient_1080p_wallpaper.png');
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('1080p Gradient Wallpaper downloaded!', 'success');
    }, 'image/png');
  },

  luminance: (hex) => {
    const c = hex.replace('#', '');
    const rgb = [0, 2, 4].map(i => {
      let v = parseInt(c.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  },

  updateContrast: () => {
    const fg = document.getElementById('pal-contrast-fg')?.value || '#ffffff';
    const bg = document.getElementById('pal-contrast-bg')?.value || '#4f46e5';
    const l1 = PaletteTool.luminance(fg);
    const l2 = PaletteTool.luminance(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    const preview = document.getElementById('pal-contrast-sample');
    const ratioEl = document.getElementById('pal-contrast-ratio');
    const badgeEl = document.getElementById('pal-contrast-badge');

    if (preview) {
      preview.style.color = fg;
      preview.style.backgroundColor = bg;
    }
    if (ratioEl) ratioEl.textContent = `${ratio.toFixed(2)} : 1`;
    if (badgeEl) {
      if (ratio >= 7) {
        badgeEl.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
        badgeEl.textContent = 'WCAG AAA Pass';
      } else if (ratio >= 4.5) {
        badgeEl.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800';
        badgeEl.textContent = 'WCAG AA Pass';
      } else {
        badgeEl.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800';
        badgeEl.textContent = 'Low Contrast (Fail)';
      }
    }
  }
};
