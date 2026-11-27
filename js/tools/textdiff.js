// Text Diff Checker & Multi-Tool — 100% In-Browser Execution
window.TextDiffTool = {
  diffMode: 'split', // 'split' | 'unified'

  init: () => {
    const originalInput = document.getElementById('diff-original-text');
    const modifiedInput = document.getElementById('diff-modified-text');

    if (originalInput) originalInput.addEventListener('input', TextDiffTool.computeDiff);
    if (modifiedInput) modifiedInput.addEventListener('input', TextDiffTool.computeDiff);
  },

  setDiffMode: (mode) => {
    TextDiffTool.diffMode = mode;
    const btnSplit = document.getElementById('diff-mode-split');
    const btnUnified = document.getElementById('diff-mode-unified');

    if (btnSplit) btnSplit.classList.toggle('bg-indigo-600', mode === 'split');
    if (btnSplit) btnSplit.classList.toggle('text-white', mode === 'split');
    if (btnSplit) btnSplit.classList.toggle('bg-slate-100', mode !== 'split');
    if (btnSplit) btnSplit.classList.toggle('text-slate-600', mode !== 'split');

    if (btnUnified) btnUnified.classList.toggle('bg-indigo-600', mode === 'unified');
    if (btnUnified) btnUnified.classList.toggle('text-white', mode === 'unified');
    if (btnUnified) btnUnified.classList.toggle('bg-slate-100', mode !== 'unified');
    if (btnUnified) btnUnified.classList.toggle('text-slate-600', mode !== 'unified');

    TextDiffTool.computeDiff();
  },

  loadSample: () => {
    const original = `Contract Agreement Version 1.0\n1. The user agrees to privacy terms.\n2. Cloud uploads are prohibited.\n3. Processing occurs on remote server.\n4. Account registration is mandatory.\n5. Termination upon 30 days notice.`;
    const modified = `Contract Agreement Version 2.0\n1. The user agrees to privacy terms.\n2. Cloud uploads are strictly prohibited.\n3. Processing occurs 100% locally in browser.\n4. Zero account registration required.\n5. Termination upon immediate notice.`;

    const el1 = document.getElementById('diff-original-text');
    const el2 = document.getElementById('diff-modified-text');
    if (el1) el1.value = original;
    if (el2) el2.value = modified;

    TextDiffTool.computeDiff();
    PrivaUtils.showToast('Sample comparison text loaded!', 'info');
  },

  clearAll: () => {
    const el1 = document.getElementById('diff-original-text');
    const el2 = document.getElementById('diff-modified-text');
    if (el1) el1.value = '';
    if (el2) el2.value = '';
    TextDiffTool.computeDiff();
  },

  // LCS Line Diff Algorithm
  computeDiff: () => {
    const origText = document.getElementById('diff-original-text')?.value || '';
    const modText = document.getElementById('diff-modified-text')?.value || '';

    const origLines = origText.split('\n');
    const modLines = modText.split('\n');

    // Simple Myers / LCS line difference
    const diff = TextDiffTool.lcsDiff(origLines, modLines);

    // Update stats
    let additions = 0;
    let deletions = 0;
    diff.forEach(d => {
      if (d.type === 'add') additions++;
      if (d.type === 'del') deletions++;
    });

    const statsEl = document.getElementById('diff-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span class="text-emerald-600 font-bold">+${additions} added</span> • 
        <span class="text-rose-600 font-bold">-${deletions} removed</span> • 
        <span class="text-slate-500 font-medium">${origLines.length} vs ${modLines.length} lines</span>
      `;
    }

    TextDiffTool.renderDiffOutput(diff, origLines, modLines);
  },

  lcsDiff: (a, b) => {
    const N = a.length;
    const M = b.length;
    // DP Table for LCS
    const L = Array.from({ length: N + 1 }, () => new Int32Array(M + 1));

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < M; j++) {
        if (a[i] === b[j]) {
          L[i + 1][j + 1] = L[i][j] + 1;
        } else {
          L[i + 1][j + 1] = Math.max(L[i + 1][j], L[i][j + 1]);
        }
      }
    }

    // Backtrack to extract diff
    const result = [];
    let i = N, j = M;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        result.unshift({ type: 'same', val: a[i - 1], lineA: i, lineB: j });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || L[i][j - 1] >= L[i - 1][j])) {
        result.unshift({ type: 'add', val: b[j - 1], lineB: j });
        j--;
      } else if (i > 0 && (j === 0 || L[i][j - 1] < L[i - 1][j])) {
        result.unshift({ type: 'del', val: a[i - 1], lineA: i });
        i--;
      }
    }
    return result;
  },

  renderDiffOutput: (diff) => {
    const container = document.getElementById('diff-output-container');
    if (!container) return;

    if (diff.length === 0 || (diff.length === 1 && !diff[0].val)) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 text-xs">
          <i class="fa-solid fa-code-compare text-2xl mb-2 text-slate-300"></i>
          <p>Paste text in both boxes above to view side-by-side differences.</p>
        </div>
      `;
      return;
    }

    let html = '<div class="font-mono text-xs divide-y divide-slate-100 overflow-x-auto">';

    diff.forEach(item => {
      const escapeVal = item.val.replace(/</g, '&lt;').replace(/>/g, '&gt;') || '&nbsp;';
      if (item.type === 'add') {
        html += `
          <div class="flex items-start bg-emerald-50/80 text-emerald-950 px-3 py-1 hover:bg-emerald-100/80 transition-colors">
            <span class="w-12 text-right pr-3 select-none text-emerald-500 font-semibold">+${item.lineB || ''}</span>
            <span class="flex-1 whitespace-pre-wrap">${escapeVal}</span>
          </div>
        `;
      } else if (item.type === 'del') {
        html += `
          <div class="flex items-start bg-rose-50/80 text-rose-950 px-3 py-1 hover:bg-rose-100/80 transition-colors">
            <span class="w-12 text-right pr-3 select-none text-rose-500 font-semibold">-${item.lineA || ''}</span>
            <span class="flex-1 whitespace-pre-wrap">${escapeVal}</span>
          </div>
        `;
      } else {
        html += `
          <div class="flex items-start bg-white text-slate-700 px-3 py-1 hover:bg-slate-50 transition-colors">
            <span class="w-12 text-right pr-3 select-none text-slate-300">${item.lineA || ''}</span>
            <span class="flex-1 whitespace-pre-wrap">${escapeVal}</span>
          </div>
        `;
      }
    });

    html += '</div>';
    container.innerHTML = html;
  },

  // TEXT TOOLS & FORMATTERS
  applyTransform: (type) => {
    const targetInput = document.getElementById('diff-modified-text');
    if (!targetInput) return;
    let text = targetInput.value;

    if (type === 'uppercase') {
      text = text.toUpperCase();
    } else if (type === 'lowercase') {
      text = text.toLowerCase();
    } else if (type === 'titlecase') {
      text = text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    } else if (type === 'camelcase') {
      text = text.replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()).replace(/\s+/g, '');
    } else if (type === 'dedupe') {
      const lines = text.split('\n');
      text = Array.from(new Set(lines)).join('\n');
      PrivaUtils.showToast('Duplicate lines removed!', 'success');
    } else if (type === 'sort') {
      const lines = text.split('\n');
      text = lines.sort().join('\n');
      PrivaUtils.showToast('Lines sorted alphabetically (A-Z)!', 'success');
    } else if (type === 'clean-spaces') {
      text = text.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
      PrivaUtils.showToast('Empty lines and whitespace trimmed!', 'success');
    }

    targetInput.value = text;
    TextDiffTool.computeDiff();
  },

  // Find and Replace Tool
  findAndReplace: () => {
    const findStr = document.getElementById('diff-find-input')?.value || '';
    const replaceStr = document.getElementById('diff-replace-input')?.value || '';
    const isRegex = document.getElementById('diff-regex-toggle')?.checked;
    const targetInput = document.getElementById('diff-modified-text');

    if (!findStr || !targetInput) {
      PrivaUtils.showToast('Enter a search term to find and replace.', 'error');
      return;
    }

    try {
      let count = 0;
      if (isRegex) {
        const re = new RegExp(findStr, 'g');
        const match = targetInput.value.match(re);
        count = match ? match.length : 0;
        targetInput.value = targetInput.value.replace(re, replaceStr);
      } else {
        const parts = targetInput.value.split(findStr);
        count = parts.length - 1;
        targetInput.value = parts.join(replaceStr);
      }

      TextDiffTool.computeDiff();
      PrivaUtils.showToast(`Replaced ${count} occurrence(s)!`, 'success');
    } catch (e) {
      PrivaUtils.showToast('Invalid Regex search pattern: ' + e.message, 'error');
    }
  },

  copyModifiedText: () => {
    const text = document.getElementById('diff-modified-text')?.value || '';
    if (text) {
      navigator.clipboard.writeText(text);
      PrivaUtils.showToast('Modified text copied to clipboard!', 'success');
    }
  }
};
