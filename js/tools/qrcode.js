// QR Code Studio — In-Browser Generator & Real-Time Scanner (100% Client-Side)
window.QRCodeTool = {
  qrInstance: null,
  videoStream: null,
  animFrameId: null,

  init: () => {
    // Generate inputs
    const textInput = document.getElementById('qr-text-input');
    const fgColorInput = document.getElementById('qr-fg-color');
    const bgColorInput = document.getElementById('qr-bg-color');
    const sizeSelect = document.getElementById('qr-size-select');
    const ecSelect = document.getElementById('qr-ec-select');

    if (textInput) textInput.addEventListener('input', QRCodeTool.updateGenerator);
    if (fgColorInput) fgColorInput.addEventListener('input', QRCodeTool.updateGenerator);
    if (bgColorInput) bgColorInput.addEventListener('input', QRCodeTool.updateGenerator);
    if (sizeSelect) sizeSelect.addEventListener('change', QRCodeTool.updateGenerator);
    if (ecSelect) ecSelect.addEventListener('change', QRCodeTool.updateGenerator);

    // Scanner file input
    const scanFileInput = document.getElementById('qr-scan-file-input');
    const scanDropzone = document.getElementById('qr-scan-dropzone');

    if (scanFileInput) {
      scanFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          QRCodeTool.scanImageFile(e.target.files[0]);
          scanFileInput.value = '';
        }
      });
    }

    if (scanDropzone) {
      scanDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        scanDropzone.classList.add('border-indigo-500', 'bg-indigo-50/50');
      });
      scanDropzone.addEventListener('dragleave', () => {
        scanDropzone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
      });
      scanDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        scanDropzone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          QRCodeTool.scanImageFile(e.dataTransfer.files[0]);
        }
      });
    }
  },

  // Switch between Generator and Scanner tabs
  switchTab: (tab) => {
    const secGen = document.getElementById('qr-sec-generate');
    const secScan = document.getElementById('qr-sec-scan');
    const tabGen = document.getElementById('qr-tab-gen-btn');
    const tabScan = document.getElementById('qr-tab-scan-btn');

    if (tab === 'generate') {
      QRCodeTool.stopCamera();
      if (secGen) secGen.classList.remove('hidden');
      if (secScan) secScan.classList.add('hidden');
      if (tabGen) tabGen.className = 'pb-3 px-4 font-bold text-sm text-indigo-600 border-b-2 border-indigo-600';
      if (tabScan) tabScan.className = 'pb-3 px-4 font-semibold text-sm text-slate-400 hover:text-slate-600';
      QRCodeTool.updateGenerator();
    } else {
      if (secScan) secScan.classList.remove('hidden');
      if (secGen) secGen.classList.add('hidden');
      if (tabScan) tabScan.className = 'pb-3 px-4 font-bold text-sm text-indigo-600 border-b-2 border-indigo-600';
      if (tabGen) tabGen.className = 'pb-3 px-4 font-semibold text-sm text-slate-400 hover:text-slate-600';
    }
  },

  // Set generator content preset (URL, Text, WiFi, Contact)
  setPresetType: (type) => {
    document.querySelectorAll('.qr-preset-btn').forEach(btn => {
      const match = btn.dataset.type === type;
      btn.classList.toggle('bg-indigo-600', match);
      btn.classList.toggle('text-white', match);
      btn.classList.toggle('bg-slate-100', !match);
      btn.classList.toggle('text-slate-600', !match);
    });

    // Toggle specific input forms
    document.getElementById('qr-form-text')?.classList.toggle('hidden', type !== 'url' && type !== 'text');
    document.getElementById('qr-form-wifi')?.classList.toggle('hidden', type !== 'wifi');
    document.getElementById('qr-form-vcard')?.classList.toggle('hidden', type !== 'vcard');

    if (type === 'url') {
      document.getElementById('qr-text-label').textContent = 'Website URL';
      const input = document.getElementById('qr-text-input');
      if (input && !input.value.startsWith('http')) input.value = 'https://rprpdf.netlify.app';
    } else if (type === 'text') {
      document.getElementById('qr-text-label').textContent = 'Plain Text Message';
    }

    QRCodeTool.updateGenerator();
  },

  // Generate QR Code Content string
  getContentString: () => {
    const activeBtn = document.querySelector('.qr-preset-btn.bg-indigo-600');
    const type = activeBtn?.dataset.type || 'url';

    if (type === 'wifi') {
      const ssid = document.getElementById('qr-wifi-ssid')?.value.trim() || 'MyWiFi';
      const pass = document.getElementById('qr-wifi-pass')?.value || '';
      const enc = document.getElementById('qr-wifi-enc')?.value || 'WPA';
      const hidden = document.getElementById('qr-wifi-hidden')?.checked ? 'true' : 'false';
      return `WIFI:T:${enc};S:${ssid};P:${pass};H:${hidden};;`;
    }

    if (type === 'vcard') {
      const name = document.getElementById('qr-vcard-name')?.value.trim() || 'John Doe';
      const phone = document.getElementById('qr-vcard-phone')?.value.trim() || '';
      const email = document.getElementById('qr-vcard-email')?.value.trim() || '';
      const org = document.getElementById('qr-vcard-org')?.value.trim() || '';
      return `BEGIN:VCARD\nVERSION:3.0\nN:${name}\nFN:${name}\nORG:${org}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;
    }

    return document.getElementById('qr-text-input')?.value.trim() || 'https://rprpdf.netlify.app';
  },

  // Live Generator update
  updateGenerator: () => {
    const container = document.getElementById('qr-code-output');
    if (!container) return;

    const content = QRCodeTool.getContentString();
    const fg = document.getElementById('qr-fg-color')?.value || '#0f172a';
    const bg = document.getElementById('qr-bg-color')?.value || '#ffffff';
    const size = parseInt(document.getElementById('qr-size-select')?.value, 10) || 256;
    const ec = document.getElementById('qr-ec-select')?.value || 'H';

    container.innerHTML = '';

    if (!window.QRCode) {
      container.innerHTML = '<span class="text-xs text-rose-500">QR Library loading...</span>';
      return;
    }

    const ecLevel = {
      'L': QRCode.CorrectLevel.L,
      'M': QRCode.CorrectLevel.M,
      'Q': QRCode.CorrectLevel.Q,
      'H': QRCode.CorrectLevel.H
    }[ec] || QRCode.CorrectLevel.H;

    QRCodeTool.qrInstance = new QRCode(container, {
      text: content,
      width: size,
      height: size,
      colorDark: fg,
      colorLight: bg,
      correctLevel: ecLevel
    });

    const meta = document.getElementById('qr-meta-info');
    if (meta) meta.textContent = `${size}×${size} px • ${content.length} characters`;
  },

  // Download QR Code as PNG
  downloadPng: () => {
    const container = document.getElementById('qr-code-output');
    const canvas = container?.querySelector('canvas');
    const img = container?.querySelector('img');

    if (canvas) {
      PrivaUtils.downloadBlob(
        PrivaUtils.dataUrlToBlob(canvas.toDataURL('image/png')),
        'rprpdf_qrcode.png'
      );
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('QR Code downloaded as PNG!', 'success');
    } else if (img && img.src) {
      const a = document.createElement('a');
      a.href = img.src;
      a.download = 'rprpdf_qrcode.png';
      a.click();
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('QR Code downloaded as PNG!', 'success');
    } else {
      PrivaUtils.showToast('No QR code generated yet.', 'error');
    }
  },

  // Copy QR Image to Clipboard
  copyImageToClipboard: async () => {
    const container = document.getElementById('qr-code-output');
    const canvas = container?.querySelector('canvas');
    if (!canvas) {
      PrivaUtils.showToast('Cannot copy: canvas not ready.', 'error');
      return;
    }

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        PrivaUtils.showToast('QR Code copied to clipboard!', 'success');
      });
    } catch (err) {
      PrivaUtils.showToast('Clipboard copy failed: ' + err.message, 'error');
    }
  },

  // SCANNER METHODS
  scanImageFile: (file) => {
    if (!file || !file.type.startsWith('image/')) {
      PrivaUtils.showToast('Please select a valid image file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (window.jsQR) {
          const code = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'dontInvert'
          });
          if (code && code.data) {
            QRCodeTool.displayScanResult(code.data);
          } else {
            PrivaUtils.showToast('No QR code detected in this image. Try a clearer photo.', 'info');
          }
        } else {
          PrivaUtils.showToast('Scanner engine initializing. Please try again.', 'error');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  // Start live webcam QR scanner
  startCamera: async () => {
    const video = document.getElementById('qr-scanner-video');
    const btnStart = document.getElementById('qr-camera-start-btn');
    const btnStop = document.getElementById('qr-camera-stop-btn');
    const container = document.getElementById('qr-camera-container');

    try {
      QRCodeTool.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (video) {
        video.srcObject = QRCodeTool.videoStream;
        video.setAttribute('playsinline', true);
        video.play();
        if (container) container.classList.remove('hidden');
        if (btnStart) btnStart.classList.add('hidden');
        if (btnStop) btnStop.classList.remove('hidden');
        QRCodeTool.animFrameId = requestAnimationFrame(QRCodeTool.tickCamera);
        PrivaUtils.showToast('Camera scanner started. Point at a QR code!', 'info');
      }
    } catch (e) {
      console.error(e);
      PrivaUtils.showToast('Camera access denied or unavailable: ' + e.message, 'error');
    }
  },

  tickCamera: () => {
    const video = document.getElementById('qr-scanner-video');
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (window.jsQR) {
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          QRCodeTool.displayScanResult(code.data);
          QRCodeTool.stopCamera();
          PrivaUtils.triggerConfetti();
          return;
        }
      }
    }
    QRCodeTool.animFrameId = requestAnimationFrame(QRCodeTool.tickCamera);
  },

  stopCamera: () => {
    if (QRCodeTool.animFrameId) {
      cancelAnimationFrame(QRCodeTool.animFrameId);
      QRCodeTool.animFrameId = null;
    }
    if (QRCodeTool.videoStream) {
      QRCodeTool.videoStream.getTracks().forEach(t => t.stop());
      QRCodeTool.videoStream = null;
    }
    const container = document.getElementById('qr-camera-container');
    const btnStart = document.getElementById('qr-camera-start-btn');
    const btnStop = document.getElementById('qr-camera-stop-btn');
    if (container) container.classList.add('hidden');
    if (btnStart) btnStart.classList.remove('hidden');
    if (btnStop) btnStop.classList.add('hidden');
  },

  // Display detected scan result
  displayScanResult: (text) => {
    const resultBox = document.getElementById('qr-scan-result-box');
    const textEl = document.getElementById('qr-scanned-text');
    const linkBtn = document.getElementById('qr-open-link-btn');

    if (textEl) textEl.textContent = text;
    if (resultBox) resultBox.classList.remove('hidden');

    const isUrl = /^https?:\/\//i.test(text.trim());
    if (linkBtn) {
      if (isUrl) {
        linkBtn.href = text.trim();
        linkBtn.classList.remove('hidden');
      } else {
        linkBtn.classList.add('hidden');
      }
    }

    PrivaUtils.showToast('QR Code decoded successfully!', 'success');
  },

  copyScannedText: () => {
    const text = document.getElementById('qr-scanned-text')?.textContent || '';
    if (text) {
      navigator.clipboard.writeText(text);
      PrivaUtils.showToast('Decoded text copied to clipboard!', 'success');
    }
  }
};
