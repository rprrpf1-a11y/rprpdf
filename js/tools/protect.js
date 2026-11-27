// Tool 12: Protect PDF with Password Encryption (100% In-Browser & Zero-Storage)
window.ProtectTool = {
  pdfBytes: null,
  fileName: '',
  pageCount: 0,

  init: () => {
    const fileInput = document.getElementById('protect-file-input');
    const dropzone = document.getElementById('protect-dropzone');
    const pwdInput = document.getElementById('protect-password-input');
    const confirmInput = document.getElementById('protect-confirm-input');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          ProtectTool.loadFile(e.target.files[0]);
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
          ProtectTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (pwdInput) pwdInput.addEventListener('input', ProtectTool.checkPasswordStrength);
    if (confirmInput) confirmInput.addEventListener('input', ProtectTool.validateMatch);
  },

  loadFile: async (file) => {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      PrivaUtils.showToast('Please select a valid PDF file.', 'error');
      return;
    }

    ProtectTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    const dropzone = document.getElementById('protect-dropzone');
    const workspace = document.getElementById('protect-workspace');
    dropzone.classList.add('hidden');
    workspace.classList.remove('hidden');

    PrivaUtils.showProgress('Inspecting PDF Structure', 30, 'Reading file bytes...');

    try {
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      ProtectTool.pdfBytes = buffer;

      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      ProtectTool.pageCount = doc.getPageCount();

      document.getElementById('protect-meta').textContent = `${ProtectTool.pageCount} pages • ${file.name} (${PrivaUtils.formatBytes(file.size)})`;
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('PDF loaded. Enter a password to encrypt.', 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Could not load PDF: ' + e.message, 'error');
      workspace.classList.add('hidden');
      dropzone.classList.remove('hidden');
    }
  },

  togglePasswordVisibility: (inputId, iconId) => {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  },

  checkPasswordStrength: () => {
    const pwd = document.getElementById('protect-password-input')?.value || '';
    const bar = document.getElementById('pwd-strength-bar');
    const label = document.getElementById('pwd-strength-label');
    if (!bar || !label) return;

    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;

    if (pwd.length === 0) {
      bar.style.width = '0%';
      bar.className = 'h-1.5 rounded-full bg-slate-200 transition-all';
      label.textContent = '';
    } else if (score <= 1) {
      bar.style.width = '25%';
      bar.className = 'h-1.5 rounded-full bg-rose-500 transition-all';
      label.textContent = 'Weak';
      label.className = 'text-[10px] font-bold text-rose-500';
    } else if (score === 2) {
      bar.style.width = '50%';
      bar.className = 'h-1.5 rounded-full bg-amber-500 transition-all';
      label.textContent = 'Medium';
      label.className = 'text-[10px] font-bold text-amber-500';
    } else if (score === 3) {
      bar.style.width = '75%';
      bar.className = 'h-1.5 rounded-full bg-blue-500 transition-all';
      label.textContent = 'Strong';
      label.className = 'text-[10px] font-bold text-blue-500';
    } else {
      bar.style.width = '100%';
      bar.className = 'h-1.5 rounded-full bg-emerald-500 transition-all';
      label.textContent = 'Very Secure';
      label.className = 'text-[10px] font-bold text-emerald-500';
    }

    ProtectTool.validateMatch();
  },

  validateMatch: () => {
    const pwd = document.getElementById('protect-password-input')?.value || '';
    const confirm = document.getElementById('protect-confirm-input')?.value || '';
    const matchLabel = document.getElementById('pwd-match-label');
    if (!matchLabel) return;

    if (!confirm) {
      matchLabel.textContent = '';
    } else if (pwd === confirm) {
      matchLabel.textContent = '✓ Passwords match';
      matchLabel.className = 'text-[10px] font-bold text-emerald-600 mt-1 block';
    } else {
      matchLabel.textContent = '✕ Passwords do not match';
      matchLabel.className = 'text-[10px] font-bold text-rose-500 mt-1 block';
    }
  },

  encryptPdf: async () => {
    if (!ProtectTool.pdfBytes) {
      PrivaUtils.showToast('Please upload a PDF document first.', 'error');
      return;
    }

    const pwd = document.getElementById('protect-password-input')?.value || '';
    const confirm = document.getElementById('protect-confirm-input')?.value || '';

    if (!pwd) {
      PrivaUtils.showToast('Please enter a password.', 'error');
      return;
    }

    if (pwd.length < 3) {
      PrivaUtils.showToast('Password must be at least 3 characters.', 'error');
      return;
    }

    if (pwd !== confirm) {
      PrivaUtils.showToast('Password confirmation does not match.', 'error');
      return;
    }

    const btn = document.getElementById('protect-export-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Encrypting in Browser...';
    btn.disabled = true;

    PrivaUtils.showProgress('Encrypting PDF Document', 20, 'Initializing ISO Standard Security Handler...');

    try {
      if (!window.PDFEncrypt) {
        PrivaUtils.updateProgress(40, 'Loading cryptographic module...');
        await PrivaUtils.loadScript('js/vendor/pdf-encrypt.js');
      }

      PrivaUtils.updateProgress(70, 'Applying 128-bit RC4 encryption streams...');
      const encryptedBytes = await window.PDFEncrypt.encryptPDF(new Uint8Array(ProtectTool.pdfBytes), pwd);

      PrivaUtils.updateProgress(100, 'Protected PDF ready!');
      PrivaUtils.downloadBlob(encryptedBytes, `${ProtectTool.fileName}_protected.pdf`);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('PDF encrypted successfully! Password protection is active.', 'success');
    } catch (e) {
      console.error('Encryption error:', e);
      PrivaUtils.showToast('Encryption failed: ' + e.message, 'error');
    } finally {
      PrivaUtils.hideProgress();
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  }
};
