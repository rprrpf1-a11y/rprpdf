// JSON, Base64, Hash & JWT Dev Studio — 100% Client-Side Privacy-Safe
window.DevFormatTool = {
  activeTab: 'json',

  init: () => {
    const b64Plain = document.getElementById('dev-b64-plain');
    const b64Encoded = document.getElementById('dev-b64-encoded');
    const b64FileInput = document.getElementById('dev-b64-file');
    const jwtInput = document.getElementById('dev-jwt-input');
    const urlInput = document.getElementById('dev-url-input');
    const hashInput = document.getElementById('dev-hash-input');

    if (b64Plain) b64Plain.addEventListener('input', DevFormatTool.encodeBase64);
    if (b64Encoded) b64Encoded.addEventListener('input', DevFormatTool.decodeBase64);
    if (jwtInput) jwtInput.addEventListener('input', DevFormatTool.decodeJwt);
    if (urlInput) urlInput.addEventListener('input', () => DevFormatTool.runUrlAction('auto'));
    if (hashInput) hashInput.addEventListener('input', DevFormatTool.computeHashes);

    if (b64FileInput) {
      b64FileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const out = document.getElementById('dev-b64-encoded');
          if (out) out.value = ev.target.result;
          PrivaUtils.showToast(`Encoded ${file.name} (${PrivaUtils.formatBytes(file.size)}) to Base64 Data URI!`, 'success');
        };
        reader.readAsDataURL(file);
      });
    }
  },

  switchTab: (tab) => {
    DevFormatTool.activeTab = tab;
    ['json', 'base64', 'jwt', 'hash'].forEach(t => {
      const btn = document.getElementById(`dev-tab-${t}`);
      const panel = document.getElementById(`dev-panel-${t}`);
      const active = t === tab;
      if (btn) {
        btn.className = active
          ? 'px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white transition-all'
          : 'px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all';
      }
      if (panel) panel.classList.toggle('hidden', !active);
    });
  },

  loadSampleJson: () => {
    const sample = {
      app: 'RprPDF',
      version: '2.0.0',
      privacy: { cloudUploads: false, clientSide: true, wasm: ['pdf-lib', 'pdf.js'] },
      toolsCount: 28,
      popular: ['Unlock PDF', 'Invoice PDF', 'PDF to Text', 'Password Generator']
    };
    const input = document.getElementById('dev-json-input');
    if (input) {
      input.value = JSON.stringify(sample);
      DevFormatTool.formatJson(2);
    }
  },

  formatJson: (spaces) => {
    const input = document.getElementById('dev-json-input');
    const status = document.getElementById('dev-json-status');
    const stats = document.getElementById('dev-json-stats');
    if (!input || !status) return;

    const raw = input.value.trim();
    if (!raw) {
      status.className = 'text-xs font-semibold text-slate-400';
      status.textContent = 'Paste JSON above to validate or format';
      if (stats) stats.textContent = '';
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      input.value = spaces === 0 ? JSON.stringify(parsed) : JSON.stringify(parsed, null, spaces);
      status.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
      status.innerHTML = '<i class="fa-solid fa-circle-check mr-1.5"></i>Valid JSON';
      if (stats) {
        const keyCount = DevFormatTool.countJsonKeys(parsed);
        stats.textContent = `${keyCount} keys • ${PrivaUtils.formatBytes(new Blob([input.value]).size)}`;
      }
    } catch (err) {
      status.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800';
      status.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1.5"></i>Invalid: ${err.message}`;
      if (stats) stats.textContent = '';
    }
  },

  sortJsonKeys: () => {
    const input = document.getElementById('dev-json-input');
    if (!input || !input.value.trim()) return;
    try {
      const sortObj = (val) => {
        if (Array.isArray(val)) return val.map(sortObj);
        if (val && typeof val === 'object') {
          return Object.keys(val).sort().reduce((acc, k) => {
            acc[k] = sortObj(val[k]);
            return acc;
          }, {});
        }
        return val;
      };
      const parsed = JSON.parse(input.value);
      input.value = JSON.stringify(sortObj(parsed), null, 2);
      DevFormatTool.formatJson(2);
      PrivaUtils.showToast('JSON keys sorted A–Z!', 'success');
    } catch (err) {
      DevFormatTool.formatJson(2);
    }
  },

  countJsonKeys: (val) => {
    if (!val || typeof val !== 'object') return 0;
    if (Array.isArray(val)) return val.reduce((acc, v) => acc + DevFormatTool.countJsonKeys(v), 0);
    return Object.keys(val).reduce((acc, k) => acc + 1 + DevFormatTool.countJsonKeys(val[k]), 0);
  },

  copyJson: () => {
    const val = document.getElementById('dev-json-input')?.value || '';
    if (!val.trim()) return;
    navigator.clipboard.writeText(val);
    PrivaUtils.showToast('JSON copied to clipboard!', 'success');
  },

  downloadJson: () => {
    const val = document.getElementById('dev-json-input')?.value || '';
    if (!val.trim()) return;
    PrivaUtils.downloadBlob(new Blob([val], { type: 'application/json' }), 'formatted.json');
  },

  encodeBase64: () => {
    const plain = document.getElementById('dev-b64-plain')?.value || '';
    const out = document.getElementById('dev-b64-encoded');
    if (!out) return;
    try {
      const bytes = new TextEncoder().encode(plain);
      let bin = '';
      bytes.forEach(b => { bin += String.fromCharCode(b); });
      out.value = btoa(bin);
    } catch (e) {
      out.value = 'Encoding error: ' + e.message;
    }
  },

  decodeBase64: () => {
    const encoded = (document.getElementById('dev-b64-encoded')?.value || '').trim();
    const out = document.getElementById('dev-b64-plain');
    if (!out) return;
    if (!encoded) {
      out.value = '';
      return;
    }
    try {
      const clean = encoded.replace(/^data:[^;]+;base64,/, '');
      const bin = atob(clean);
      const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      out.value = new TextDecoder().decode(bytes);
    } catch (e) {
      out.value = '[Invalid Base64 string]';
    }
  },

  decodeJwt: () => {
    const token = (document.getElementById('dev-jwt-input')?.value || '').trim();
    const headEl = document.getElementById('dev-jwt-header');
    const payEl = document.getElementById('dev-jwt-payload');
    const badgeEl = document.getElementById('dev-jwt-badge');
    if (!headEl || !payEl || !badgeEl) return;

    if (!token) {
      headEl.textContent = '{}';
      payEl.textContent = '{}';
      badgeEl.className = 'hidden';
      return;
    }

    const parts = token.split('.');
    if (parts.length < 2) {
      badgeEl.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700';
      badgeEl.textContent = 'Invalid JWT structure (need 3 dot-separated parts)';
      return;
    }

    const b64UrlDecode = (str) => {
      const pad = str.replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(pad);
      const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    };

    try {
      const header = b64UrlDecode(parts[0]);
      const payload = b64UrlDecode(parts[1]);
      headEl.textContent = JSON.stringify(header, null, 2);
      payEl.textContent = JSON.stringify(payload, null, 2);

      if (payload.exp) {
        const expMs = payload.exp * 1000;
        const expired = Date.now() > expMs;
        const dateStr = new Date(expMs).toLocaleString();
        badgeEl.className = `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${expired ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`;
        badgeEl.textContent = expired ? `Expired (${dateStr})` : `Active until ${dateStr}`;
      } else {
        badgeEl.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800';
        badgeEl.textContent = 'Decoded Client-Side (No Expiry Claim)';
      }
    } catch (e) {
      badgeEl.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700';
      badgeEl.textContent = 'Could not decode JWT: ' + e.message;
    }
  },

  runUrlAction: (mode) => {
    const inp = document.getElementById('dev-url-input')?.value || '';
    const out = document.getElementById('dev-url-output');
    if (!out) return;

    if (mode === 'encode' || mode === 'auto') {
      out.value = encodeURIComponent(inp);
    } else if (mode === 'decode') {
      try { out.value = decodeURIComponent(inp); } catch (e) { out.value = '[Malformed URI component]'; }
    } else if (mode === 'slug') {
      out.value = inp.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    }
  },

  computeHashes: async () => {
    const text = document.getElementById('dev-hash-input')?.value || '';
    const algos = ['SHA-256', 'SHA-1', 'SHA-512'];
    if (!text) {
      algos.forEach(a => {
        const el = document.getElementById(`dev-hash-${a.toLowerCase()}`);
        if (el) el.value = '';
      });
      return;
    }
    const data = new TextEncoder().encode(text);
    for (const algo of algos) {
      const digest = await crypto.subtle.digest(algo, data);
      const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
      const el = document.getElementById(`dev-hash-${algo.toLowerCase()}`);
      if (el) el.value = hex;
    }
  }
};
