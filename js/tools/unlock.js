// Unlock PDF Tool — Remove Passwords & Restrictions 100% Client-Side
window.UnlockTool = {
  pdfBytes: null,
  fileName: '',
  numPages: 0,
  pdfDoc: null,
  dpiScale: 2.0,

  init: () => {
    const fileInput = document.getElementById('unlock-file-input');
    const dropzone = document.getElementById('unlock-dropzone');
    const pwdInput = document.getElementById('unlock-password-input');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          UnlockTool.loadFile(e.target.files[0]);
        }
      });
    }

    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-rose-500', 'bg-rose-50/50');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-rose-500', 'bg-rose-50/50');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-rose-500', 'bg-rose-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          UnlockTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (pwdInput) {
      pwdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          UnlockTool.submitPassword();
        }
      });
    }
  },

  loadFile: async (file) => {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      PrivaUtils.showToast('Please select a valid PDF file.', 'error');
      return;
    }

    UnlockTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    const dropzone = document.getElementById('unlock-dropzone');
    const workspace = document.getElementById('unlock-workspace');
    const pwdBox = document.getElementById('unlock-password-box');
    const readyBox = document.getElementById('unlock-ready-box');

    if (dropzone) dropzone.classList.add('hidden');
    if (workspace) workspace.classList.remove('hidden');
    if (pwdBox) pwdBox.classList.add('hidden');
    if (readyBox) readyBox.classList.add('hidden');

    PrivaUtils.showProgress('Inspecting PDF Encryption', 25, 'Analyzing security dictionary...');

    try {
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      UnlockTool.pdfBytes = new Uint8Array(buffer);

      const metaEl = document.getElementById('unlock-file-meta');
      if (metaEl) metaEl.textContent = `${file.name} (${PrivaUtils.formatBytes(file.size)})`;

      await UnlockTool.attemptOpen('');
    } catch (err) {
      console.error(err);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Failed to inspect PDF: ' + err.message, 'error');
      UnlockTool.reset();
    }
  },

  attemptOpen: async (password) => {
    const pwdBox = document.getElementById('unlock-password-box');
    const readyBox = document.getElementById('unlock-ready-box');
    const pwdErr = document.getElementById('unlock-password-error');
    const statusBadge = document.getElementById('unlock-status-badge');

    try {
      PrivaUtils.initPdfJs();
      const loadingTask = pdfjsLib.getDocument({
        data: UnlockTool.pdfBytes.slice(0),
        password: password || undefined
      });

      const pdfDoc = await loadingTask.promise;
      UnlockTool.pdfDoc = pdfDoc;
      UnlockTool.numPages = pdfDoc.numPages;

      if (pwdBox) pwdBox.classList.add('hidden');
      if (pwdErr) pwdErr.classList.add('hidden');
      if (readyBox) readyBox.classList.remove('hidden');

      const pageMetaEl = document.getElementById('unlock-pages-meta');
      if (pageMetaEl) pageMetaEl.textContent = `${UnlockTool.numPages} page${UnlockTool.numPages > 1 ? 's' : ''} ready to unlock cleanly`;

      if (statusBadge) {
        statusBadge.innerHTML = password
          ? '<i class="fa-solid fa-lock-open mr-1.5"></i> Password Accepted — Ready to Remove Lock'
          : '<i class="fa-solid fa-circle-check mr-1.5"></i> Owner Restrictions / Encryption Ready to Strip';
      }

      PrivaUtils.hideProgress();
      PrivaUtils.showToast('PDF decrypted in memory! Click Download Unlocked PDF.', 'success');
    } catch (err) {
      PrivaUtils.hideProgress();
      if (err && (err.name === 'PasswordException' || (err.message && err.message.toLowerCase().includes('password')))) {
        if (pwdBox) pwdBox.classList.remove('hidden');
        if (readyBox) readyBox.classList.add('hidden');
        if (pwdErr) {
          if (err.code === 2 || password) {
            pwdErr.textContent = 'Incorrect password. Please check caps lock and try again.';
            pwdErr.classList.remove('hidden');
          } else {
            pwdErr.classList.add('hidden');
          }
        }
        document.getElementById('unlock-password-input')?.focus();
      } else {
        PrivaUtils.showToast('Could not open PDF: ' + (err?.message || 'Unknown error'), 'error');
        UnlockTool.reset();
      }
    }
  },

  submitPassword: () => {
    const pwd = document.getElementById('unlock-password-input')?.value || '';
    if (!pwd) {
      PrivaUtils.showToast('Please enter the PDF open password.', 'error');
      return;
    }
    PrivaUtils.showProgress('Decrypting PDF', 45, 'Verifying password locally...');
    UnlockTool.attemptOpen(pwd);
  },

  setDpiScale: (scale) => {
    UnlockTool.dpiScale = scale;
    document.querySelectorAll('.unlock-dpi-btn').forEach(btn => {
      const isMatch = parseFloat(btn.getAttribute('data-scale')) === scale;
      btn.classList.toggle('ring-2', isMatch);
      btn.classList.toggle('ring-rose-500', isMatch);
      btn.classList.toggle('bg-rose-50', isMatch);
      btn.classList.toggle('text-rose-700', isMatch);
    });
  },

  unlockAndDownload: async () => {
    if (!UnlockTool.pdfDoc) {
      PrivaUtils.showToast('Please load and decrypt a PDF first.', 'error');
      return;
    }

    const btn = document.getElementById('unlock-download-btn');
    const origHtml = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Unlocking Pages...';
    }

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      if (!PDFLib) throw new Error('PDF engine could not be initialized.');

      const { PDFDocument } = PDFLib;
      const newPdf = await PDFDocument.create();
      const total = UnlockTool.numPages;

      PrivaUtils.showProgress('Removing PDF Password Lock', 10, `Processing page 1 of ${total}...`);

      for (let i = 1; i <= total; i++) {
        const pct = Math.round(10 + (i / total) * 80);
        PrivaUtils.updateProgress(pct, `Rebuilding unlocked page ${i} of ${total}...`);

        const page = await UnlockTool.pdfDoc.getPage(i);
        const origViewport = page.getViewport({ scale: 1.0 });
        const renderViewport = page.getViewport({ scale: UnlockTool.dpiScale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(renderViewport.width);
        canvas.height = Math.round(renderViewport.height);
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const jpgBytes = await fetch(imgDataUrl).then(r => r.arrayBuffer());
        const jpgImage = await newPdf.embedJpg(jpgBytes);

        const outPage = newPdf.addPage([origViewport.width, origViewport.height]);
        outPage.drawImage(jpgImage, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height
        });

        // Help GC release large page canvas immediately
        canvas.width = 0;
        canvas.height = 0;
      }

      PrivaUtils.updateProgress(95, 'Finalizing clean unlocked PDF...');
      const outBytes = await newPdf.save();

      PrivaUtils.downloadBlob(
        new Blob([outBytes], { type: 'application/pdf' }),
        `${UnlockTool.fileName}_unlocked.pdf`
      );
      PrivaUtils.hideProgress();
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Unlocked PDF downloaded with zero restrictions!', 'success');
    } catch (err) {
      console.error(err);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Unlock failed: ' + err.message, 'error');
    } finally {
      if (btn && origHtml) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  },

  reset: () => {
    UnlockTool.pdfBytes = null;
    UnlockTool.pdfDoc = null;
    UnlockTool.numPages = 0;
    const pwdInput = document.getElementById('unlock-password-input');
    if (pwdInput) pwdInput.value = '';
    const fileInput = document.getElementById('unlock-file-input');
    if (fileInput) fileInput.value = '';
    document.getElementById('unlock-workspace')?.classList.add('hidden');
    document.getElementById('unlock-dropzone')?.classList.remove('hidden');
  }
};
