// Zero-Knowledge AES-256-GCM File Vault & SHA-256 Integrity Checker — Web Crypto Hardware Engine
window.VaultTool = {
  selectedFile: null,

  init: () => {
    const fileInput = document.getElementById('vault-file-input');
    const dropzone = document.getElementById('vault-dropzone');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files?.[0]) VaultTool.loadFile(e.target.files[0]);
      });
    }
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-emerald-500', 'bg-emerald-50/50');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-emerald-500', 'bg-emerald-50/50');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-emerald-500', 'bg-emerald-50/50');
        if (e.dataTransfer.files?.[0]) VaultTool.loadFile(e.dataTransfer.files[0]);
      });
    }
  },

  loadFile: async (file) => {
    if (!file) return;
    VaultTool.selectedFile = file;
    document.getElementById('vault-dropzone')?.classList.add('hidden');
    document.getElementById('vault-workspace')?.classList.remove('hidden');

    const isVault = file.name.toLowerCase().endsWith('.rprvault');
    const nameEl = document.getElementById('vault-file-name');
    const metaEl = document.getElementById('vault-file-meta');
    if (nameEl) nameEl.textContent = file.name;
    if (metaEl) {
      metaEl.textContent = `${PrivaUtils.formatBytes(file.size)} • ${isVault ? 'Encrypted .rprvault Container' : 'Standard File'}`;
    }

    // Compute local SHA-256 & SHA-512 fingerprint immediately
    try {
      const buf = await PrivaUtils.readFileAsArrayBuffer(file);
      const sha256 = await crypto.subtle.digest('SHA-256', buf);
      const hex256 = Array.from(new Uint8Array(sha256)).map(b => b.toString(16).padStart(2, '0')).join('');
      const shaEl = document.getElementById('vault-sha256-output');
      if (shaEl) shaEl.value = hex256;
    } catch (e) { /* skip hash on huge stream error */ }
  },

  deriveKey: async (password, salt) => {
    const enc = new TextEncoder();
    const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
      keyMat,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  encryptFile: async () => {
    const file = VaultTool.selectedFile;
    const pwd = document.getElementById('vault-password-input')?.value || '';
    if (!file) return PrivaUtils.showToast('Select a file first.', 'error');
    if (pwd.length < 4) return PrivaUtils.showToast('Enter a strong vault password (min 4 characters).', 'error');

    try {
      PrivaUtils.showProgress('Encrypting with AES-256-GCM', 40, 'Deriving 250k-round PBKDF2 key...');
      const plainBytes = await PrivaUtils.readFileAsArrayBuffer(file);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await VaultTool.deriveKey(pwd, salt);

      PrivaUtils.updateProgress(75, 'Sealing authenticated ciphertext...');
      const nameBytes = new TextEncoder().encode(file.name);
      const headerPlusData = new Uint8Array(2 + nameBytes.length + plainBytes.byteLength);
      new DataView(headerPlusData.buffer).setUint16(0, nameBytes.length, false);
      headerPlusData.set(nameBytes, 2);
      headerPlusData.set(new Uint8Array(plainBytes), 2 + nameBytes.length);

      const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, headerPlusData);

      // Binary container format: Magic "RPRV1" (5) + Salt (16) + IV (12) + Ciphertext
      const magic = new TextEncoder().encode('RPRV1');
      const out = new Uint8Array(5 + 16 + 12 + cipherBuf.byteLength);
      out.set(magic, 0);
      out.set(salt, 5);
      out.set(iv, 21);
      out.set(new Uint8Array(cipherBuf), 33);

      PrivaUtils.downloadBlob(new Blob([out], { type: 'application/octet-stream' }), `${file.name}.rprvault`);
      PrivaUtils.hideProgress();
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Encrypted (.rprvault) container downloaded!', 'success');
    } catch (err) {
      console.error(err);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Encryption error: ' + err.message, 'error');
    }
  },

  decryptFile: async () => {
    const file = VaultTool.selectedFile;
    const pwd = document.getElementById('vault-password-input')?.value || '';
    if (!file) return PrivaUtils.showToast('Select a .rprvault file first.', 'error');
    if (!pwd) return PrivaUtils.showToast('Enter the vault password to unlock.', 'error');

    try {
      PrivaUtils.showProgress('Decrypting AES-256-GCM Vault', 45, 'Verifying key & integrity tag...');
      const raw = new Uint8Array(await PrivaUtils.readFileAsArrayBuffer(file));
      const magic = new TextDecoder().decode(raw.slice(0, 5));
      if (magic !== 'RPRV1' || raw.length < 35) {
        throw new Error('Not a valid .rprvault encrypted file.');
      }

      const salt = raw.slice(5, 21);
      const iv = raw.slice(21, 33);
      const cipher = raw.slice(33);
      const key = await VaultTool.deriveKey(pwd, salt);

      const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
      const plainBytes = new Uint8Array(plainBuf);
      const nameLen = new DataView(plainBuf).getUint16(0, false);
      const origName = new TextDecoder().decode(plainBytes.slice(2, 2 + nameLen)) || 'decrypted_file';
      const origData = plainBytes.slice(2 + nameLen);

      PrivaUtils.downloadBlob(new Blob([origData]), origName);
      PrivaUtils.hideProgress();
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`Decrypted & restored "${origName}"!`, 'success');
    } catch (err) {
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Decryption failed: wrong password or corrupted file.', 'error');
    }
  },

  reset: () => {
    VaultTool.selectedFile = null;
    const fi = document.getElementById('vault-file-input');
    if (fi) fi.value = '';
    const pwd = document.getElementById('vault-password-input');
    if (pwd) pwd.value = '';
    document.getElementById('vault-workspace')?.classList.add('hidden');
    document.getElementById('vault-dropzone')?.classList.remove('hidden');
  }
};
