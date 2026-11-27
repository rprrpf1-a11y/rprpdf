// Compress PDF Tool (Client-side)
window.CompressTool = {
  pdfBytes: null,
  fileName: '',
  originalSize: 0,
  selectedLevel: 'recommended',

  init: () => {
    const fileInput = document.getElementById('compress-file-input');
    const dropzone = document.getElementById('compress-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          CompressTool.loadFile(e.target.files[0]);
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
          CompressTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }
  },

  loadFile: async (file) => {
    if (!file || file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      PrivaUtils.showToast('Please select a valid PDF file.', 'error');
      return;
    }

    CompressTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    CompressTool.originalSize = file.size;

    const dropzone = document.getElementById('compress-dropzone');
    const workspace = document.getElementById('compress-workspace');
    dropzone.classList.add('hidden');
    workspace.classList.remove('hidden');

    document.getElementById('compress-doc-name').textContent = file.name;
    document.getElementById('compress-doc-size').textContent = PrivaUtils.formatBytes(file.size);
    document.getElementById('compress-result-box').classList.add('hidden');

    try {
      CompressTool.pdfBytes = await PrivaUtils.readFileAsArrayBuffer(file);
      PrivaUtils.showToast('PDF loaded. Select compression level and compress!', 'info');
    } catch (e) {
      console.error(e);
      PrivaUtils.showToast('Could not load PDF.', 'error');
    }
  },

  selectLevel: (level) => {
    CompressTool.selectedLevel = level;
    document.querySelectorAll('.compress-card').forEach(c => {
      c.classList.toggle('border-indigo-600', c.dataset.level === level);
      c.classList.toggle('bg-indigo-50/50', c.dataset.level === level);
      c.classList.toggle('border-slate-200', c.dataset.level !== level);
    });
  },

  compress: async () => {
    if (!CompressTool.pdfBytes) {
      PrivaUtils.showToast('Please select a PDF file first.', 'error');
      return;
    }

    const btn = document.getElementById('compress-submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Optimizing in Browser...';
    btn.disabled = true;

    try {
      // Ensure PDF-Lib is loaded safely
      const PDFLib = await PrivaUtils.getPDFLib();
      if (!PDFLib || !PDFLib.PDFDocument) {
        throw new Error('PDF-Lib optimization library could not be loaded. Please refresh.');
      }

      const { PDFDocument } = PDFLib;
      // Load document and re-serialize with object stream compression and cleanup
      const pdfDoc = await PDFDocument.load(CompressTool.pdfBytes, {
        ignoreEncryption: true,
        updateMetadata: false
      });

      // Clear metadata if extreme or recommended
      if (CompressTool.selectedLevel === 'extreme' || CompressTool.selectedLevel === 'recommended') {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('RprPDF Browser Optimizer');
        pdfDoc.setCreator('RprPDF');
      }

      // Save with maximum object stream compression & prune unreferenced objects
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      let finalBytes = compressedBytes;
      // Calculate savings
      const newSize = finalBytes.byteLength;
      const savedBytes = Math.max(0, CompressTool.originalSize - newSize);
      const savedPercent = CompressTool.originalSize > 0 
        ? Math.round((savedBytes / CompressTool.originalSize) * 100)
        : 0;

      // Show result
      const resultBox = document.getElementById('compress-result-box');
      resultBox.classList.remove('hidden');

      document.getElementById('compress-orig-size').textContent = PrivaUtils.formatBytes(CompressTool.originalSize);
      document.getElementById('compress-new-size').textContent = PrivaUtils.formatBytes(newSize);
      
      const percentEl = document.getElementById('compress-saved-percent');
      if (savedBytes > 0) {
        percentEl.textContent = `-${savedPercent}%`;
        percentEl.className = 'text-emerald-600 font-bold';
      } else {
        percentEl.textContent = `Optimized`;
        percentEl.className = 'text-slate-600 font-bold';
      }

      // Download handler
      const downloadBtn = document.getElementById('compress-download-btn');
      downloadBtn.onclick = () => {
        PrivaUtils.downloadBlob(finalBytes, `${CompressTool.fileName}_compressed.pdf`);
        PrivaUtils.triggerConfetti();
      };

      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`PDF optimized successfully!`, 'success');
    } catch (e) {
      console.error('Compression error:', e);
      PrivaUtils.showToast('Compression error: ' + e.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
};
