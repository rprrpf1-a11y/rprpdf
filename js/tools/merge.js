// Merge PDF Tool
window.MergeTool = {
  files: [], // Array of { file, arrayBuffer, pageCount, name, size }

  init: () => {
    const fileInput = document.getElementById('merge-file-input');
    const dropzone = document.getElementById('merge-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files) {
          MergeTool.addFiles(Array.from(e.target.files));
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
        if (e.dataTransfer.files) {
          MergeTool.addFiles(Array.from(e.dataTransfer.files));
        }
      });
    }
  },

  addFiles: async (newFiles) => {
    const validPdfs = newFiles.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (validPdfs.length === 0) {
      PrivaUtils.showToast('Please select valid PDF files.', 'error');
      return;
    }

    for (const f of validPdfs) {
      try {
        const buffer = await PrivaUtils.readFileAsArrayBuffer(f);
        const PDFLib = await PrivaUtils.getPDFLib();
        const { PDFDocument } = PDFLib;
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pageCount = doc.getPageCount();

        MergeTool.files.push({
          file: f,
          arrayBuffer: buffer,
          pageCount: pageCount,
          name: f.name,
          size: f.size
        });
      } catch (err) {
        console.error('Error reading PDF for merge:', err);
        PrivaUtils.showToast(`Failed to parse "${f.name}". It might be corrupted or encrypted.`, 'error');
      }
    }

    MergeTool.renderList();
  },

  renderList: () => {
    const listEl = document.getElementById('merge-files-list');
    const emptyState = document.getElementById('merge-empty-state');
    const actionArea = document.getElementById('merge-actions');
    const countBadge = document.getElementById('merge-count-badge');

    if (!listEl) return;

    if (MergeTool.files.length === 0) {
      emptyState.classList.remove('hidden');
      actionArea.classList.add('hidden');
      listEl.innerHTML = '';
      return;
    }

    emptyState.classList.add('hidden');
    actionArea.classList.remove('hidden');
    countBadge.textContent = `${MergeTool.files.length} Files Selected`;

    listEl.innerHTML = '';
    MergeTool.files.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-sm';
      row.innerHTML = `
        <div class="flex items-center space-x-3 truncate">
          <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
            ${index + 1}
          </div>
          <div class="truncate">
            <h4 class="text-sm font-semibold text-slate-800 truncate">${item.name}</h4>
            <p class="text-xs text-slate-400">${item.pageCount} pages • ${PrivaUtils.formatBytes(item.size)}</p>
          </div>
        </div>
        <div class="flex items-center space-x-1.5 shrink-0">
          <button type="button" onclick="MergeTool.moveItem(${index}, -1)" ${index === 0 ? 'disabled' : ''} 
            class="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 rounded-md">
            <i class="fa-solid fa-arrow-up text-xs"></i>
          </button>
          <button type="button" onclick="MergeTool.moveItem(${index}, 1)" ${index === MergeTool.files.length - 1 ? 'disabled' : ''} 
            class="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 rounded-md">
            <i class="fa-solid fa-arrow-down text-xs"></i>
          </button>
          <button type="button" onclick="MergeTool.removeItem(${index})" 
            class="p-1.5 text-rose-400 hover:text-rose-600 rounded-md">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      `;
      listEl.appendChild(row);
    });
  },

  moveItem: (index, delta) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= MergeTool.files.length) return;
    const temp = MergeTool.files[index];
    MergeTool.files[index] = MergeTool.files[targetIndex];
    MergeTool.files[targetIndex] = temp;
    MergeTool.renderList();
  },

  removeItem: (index) => {
    MergeTool.files.splice(index, 1);
    MergeTool.renderList();
  },

  clearAll: () => {
    MergeTool.files = [];
    MergeTool.renderList();
  },

  merge: async () => {
    if (MergeTool.files.length < 2) {
      PrivaUtils.showToast('Please add at least 2 PDF files to merge.', 'error');
      return;
    }

    const btn = document.getElementById('merge-submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Merging in Browser...';
    btn.disabled = true;

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument } = PDFLib;
      const mergedPdf = await PDFDocument.create();

      for (const item of MergeTool.files) {
        const doc = await PDFDocument.load(item.arrayBuffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }

      const mergedBytes = await mergedPdf.save();
      PrivaUtils.downloadBlob(mergedBytes, 'merged_document.pdf');
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`Merged ${MergeTool.files.length} PDFs into a single file!`, 'success');
    } catch (e) {
      console.error('Error merging PDFs:', e);
      PrivaUtils.showToast('Merge failed: ' + e.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
};
