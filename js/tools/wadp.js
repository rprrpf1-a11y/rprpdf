// WhatsApp DP (Profile Picture) Downloader & Frame Studio — 100% In-Browser Execution
window.WhatsAppDpTool = {
  currentImage: null,
  activeFrame: 'none',
  zoom: 1,
  rotation: 0,
  borderWidth: 12,
  showVerifiedBadge: false,

  init: () => {
    const fileInput = document.getElementById('wadp-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          WhatsAppDpTool.loadImageFile(e.target.files[0]);
        }
      });
    }

    const phoneInput = document.getElementById('wadp-phone-input');
    const countrySelect = document.getElementById('wadp-country-code');
    if (phoneInput) {
      phoneInput.addEventListener('input', WhatsAppDpTool.updateNumberPreview);
    }
    if (countrySelect) {
      countrySelect.addEventListener('change', WhatsAppDpTool.updateNumberPreview);
    }

    // Sliders
    const zoomSlider = document.getElementById('wadp-zoom-slider');
    const borderSlider = document.getElementById('wadp-border-slider');
    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => {
        WhatsAppDpTool.zoom = parseFloat(e.target.value);
        WhatsAppDpTool.renderCanvas();
      });
    }
    if (borderSlider) {
      borderSlider.addEventListener('input', (e) => {
        WhatsAppDpTool.borderWidth = parseInt(e.target.value, 10);
        WhatsAppDpTool.renderCanvas();
      });
    }

    // Initial render
    WhatsAppDpTool.updateNumberPreview();
    WhatsAppDpTool.loadSampleAvatar();
  },

  // 1. WhatsApp Profile Opener & Validator
  getCleanNumber: () => {
    const code = document.getElementById('wadp-country-code')?.value || '91';
    let phone = (document.getElementById('wadp-phone-input')?.value || '').trim();
    // Strip spaces, dashes, parentheses, plus
    phone = phone.replace(/[^0-9]/g, '');
    if (phone.startsWith(code) && phone.length > code.length + 6) {
      return phone;
    }
    return code + phone;
  },

  updateNumberPreview: () => {
    const code = document.getElementById('wadp-country-code')?.value || '91';
    const raw = (document.getElementById('wadp-phone-input')?.value || '').trim();
    const cleanNumber = WhatsAppDpTool.getCleanNumber();
    const previewEl = document.getElementById('wadp-number-preview');
    const linksContainer = document.getElementById('wadp-direct-links');

    if (!raw) {
      if (previewEl) previewEl.textContent = 'Enter a phone number above';
      if (linksContainer) linksContainer.classList.add('hidden');
      return;
    }

    if (previewEl) {
      previewEl.innerHTML = `<span class="text-emerald-600 font-bold">+${cleanNumber}</span> <span class="text-slate-400 font-normal">(E.164 International Format)</span>`;
    }
    if (linksContainer) {
      linksContainer.classList.remove('hidden');
    }
  },

  openProfileWhatsApp: () => {
    const cleanNumber = WhatsAppDpTool.getCleanNumber();
    const raw = (document.getElementById('wadp-phone-input')?.value || '').trim();
    if (!raw || cleanNumber.length < 8) {
      PrivaUtils.showToast('Please enter a valid phone number with country code.', 'error');
      return;
    }

    // Direct WhatsApp Click-to-Chat / Profile protocol
    const waUrl = `https://wa.me/${cleanNumber}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    PrivaUtils.showToast('Opening WhatsApp profile in new tab...', 'info');
  },

  openProfileWeb: () => {
    const cleanNumber = WhatsAppDpTool.getCleanNumber();
    const raw = (document.getElementById('wadp-phone-input')?.value || '').trim();
    if (!raw || cleanNumber.length < 8) {
      PrivaUtils.showToast('Please enter a valid phone number with country code.', 'error');
      return;
    }

    const webUrl = `https://web.whatsapp.com/send?phone=${cleanNumber}`;
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    PrivaUtils.showToast('Opening WhatsApp Web chat...', 'info');
  },

  copyProfileLink: () => {
    const cleanNumber = WhatsAppDpTool.getCleanNumber();
    const waUrl = `https://wa.me/${cleanNumber}`;
    navigator.clipboard.writeText(waUrl);
    PrivaUtils.showToast('WhatsApp direct profile link copied!', 'success');
  },

  // 2. DP Image & Frame Designer
  loadImageFile: (file) => {
    if (!file || !file.type.startsWith('image/')) {
      PrivaUtils.showToast('Please select a valid image file (JPG, PNG, WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        WhatsAppDpTool.currentImage = img;
        WhatsAppDpTool.zoom = 1;
        const zoomSlider = document.getElementById('wadp-zoom-slider');
        if (zoomSlider) zoomSlider.value = 1;
        WhatsAppDpTool.renderCanvas();
        PrivaUtils.showToast('DP Image loaded successfully!', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  loadSampleAvatar: () => {
    // Generate a clean placeholder avatar on canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 600;
    offCanvas.height = 600;
    const ctx = offCanvas.getContext('2d');

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, 600, 600);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(1, '#a855f7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 600);

    // Friendly avatar icon/silhouette
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(300, 230, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(300, 500, 180, Math.PI, 0, false);
    ctx.fill();

    const img = new Image();
    img.onload = () => {
      WhatsAppDpTool.currentImage = img;
      WhatsAppDpTool.renderCanvas();
    };
    img.src = offCanvas.toDataURL('image/png');
  },

  setFrame: (frameType) => {
    WhatsAppDpTool.activeFrame = frameType;
    document.querySelectorAll('.wadp-frame-btn').forEach(btn => {
      btn.classList.remove('ring-2', 'ring-emerald-500', 'border-emerald-500');
    });
    const targetBtn = document.getElementById(`wadp-frame-${frameType}`);
    if (targetBtn) {
      targetBtn.classList.add('ring-2', 'ring-emerald-500', 'border-emerald-500');
    }
    WhatsAppDpTool.renderCanvas();
  },

  toggleVerifiedBadge: () => {
    const chk = document.getElementById('wadp-badge-toggle');
    WhatsAppDpTool.showVerifiedBadge = chk ? chk.checked : false;
    WhatsAppDpTool.renderCanvas();
  },

  renderCanvas: () => {
    const canvas = document.getElementById('wadp-canvas');
    if (!canvas || !WhatsAppDpTool.currentImage) return;

    const size = 600;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 16;

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Fill neutral background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Draw user image scaled and centered
    const img = WhatsAppDpTool.currentImage;
    const minDim = Math.min(img.width, img.height);
    const drawW = (img.width / minDim) * size * WhatsAppDpTool.zoom;
    const drawH = (img.height / minDim) * size * WhatsAppDpTool.zoom;
    const drawX = centerX - drawW / 2;
    const drawY = centerY - drawH / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Draw frame/ring on top
    const bw = WhatsAppDpTool.borderWidth;
    if (WhatsAppDpTool.activeFrame !== 'none' && bw > 0) {
      ctx.save();
      ctx.lineWidth = bw;
      const frameRadius = radius - bw / 2;

      if (WhatsAppDpTool.activeFrame === 'wa-green') {
        ctx.strokeStyle = '#25D366';
      } else if (WhatsAppDpTool.activeFrame === 'insta') {
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, '#f09433');
        grad.addColorStop(0.3, '#e6683c');
        grad.addColorStop(0.6, '#dc2743');
        grad.addColorStop(0.8, '#cc2366');
        grad.addColorStop(1, '#bc1888');
        ctx.strokeStyle = grad;
      } else if (WhatsAppDpTool.activeFrame === 'neon') {
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, '#00F2FE');
        grad.addColorStop(1, '#4FACFE');
        ctx.strokeStyle = grad;
        ctx.shadowColor = '#00F2FE';
        ctx.shadowBlur = 15;
      } else if (WhatsAppDpTool.activeFrame === 'gold') {
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, '#BF953F');
        grad.addColorStop(0.25, '#FCF6BA');
        grad.addColorStop(0.5, '#B38728');
        grad.addColorStop(0.75, '#FBF5B7');
        grad.addColorStop(1, '#AA771C');
        ctx.strokeStyle = grad;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, frameRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw Verified Blue Badge if enabled
    if (WhatsAppDpTool.showVerifiedBadge) {
      ctx.save();
      const badgeX = centerX + radius * 0.65;
      const badgeY = centerY + radius * 0.65;
      const badgeR = 26;

      // Outer white rim
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeR + 3, 0, Math.PI * 2);
      ctx.fill();

      // Blue disc
      ctx.fillStyle = '#1DA1F2';
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
      ctx.fill();

      // Checkmark icon
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(badgeX - 10, badgeY);
      ctx.lineTo(badgeX - 3, badgeY + 7);
      ctx.lineTo(badgeX + 11, badgeY - 8);
      ctx.stroke();
      ctx.restore();
    }
  },

  downloadDp: (format = 'png', dimension = 1080) => {
    const sourceCanvas = document.getElementById('wadp-canvas');
    if (!sourceCanvas) return;

    // Render offscreen at requested high-res dimension
    const outCanvas = document.createElement('canvas');
    outCanvas.width = dimension;
    outCanvas.height = dimension;
    const ctx = outCanvas.getContext('2d');

    // Draw high quality scaled
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, dimension, dimension);

    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpg' ? 'jpg' : 'png';
    const dataUrl = outCanvas.toDataURL(mime, 0.95);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `whatsapp-dp-${dimension}x${dimension}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    PrivaUtils.showToast(`High-Res WhatsApp DP downloaded (${dimension}×${dimension} ${ext.toUpperCase()})!`, 'success');
  },

  copyDpToClipboard: async () => {
    const canvas = document.getElementById('wadp-canvas');
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        PrivaUtils.showToast('DP copied to clipboard!', 'success');
      } catch (err) {
        PrivaUtils.showToast('Could not copy image directly to clipboard.', 'error');
      }
    });
  }
};
