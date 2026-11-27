// Tool 13: Add Page Numbers & Headers/Footers
window.NumberingTool = {
  pdfBytes: null,
  fileName: '',
  pageCount: 0,

  init: () => {
    const fileInput = document.getElementById('numbering-file-input');
    const dropzone = document.getElementById('numbering-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          NumberingTool.loadFile(e.target.files[0]);
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
          NumberingTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Attach preview update listeners
    ['numbering-format-select', 'numbering-pos-select', 'numbering-script-select', 'numbering-start-input'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', NumberingTool.updatePreview);
    });
  },

  loadFile: async (file) => {
    if (!file || (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf'))) {
      PrivaUtils.showToast('Please select a valid PDF file.', 'error');
      return;
    }

    NumberingTool.fileName = file.name.replace(/\.[^/.]+$/, '');
    const dropzone = document.getElementById('numbering-dropzone');
    const workspace = document.getElementById('numbering-workspace');
    dropzone.classList.add('hidden');
    workspace.classList.remove('hidden');

    try {
      const buffer = await PrivaUtils.readFileAsArrayBuffer(file);
      NumberingTool.pdfBytes = buffer;

      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument } = PDFLib;
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      NumberingTool.pageCount = doc.getPageCount();

      document.getElementById('numbering-meta').textContent = `${NumberingTool.pageCount} pages • ${file.name}`;
      NumberingTool.updatePreview();
      PrivaUtils.showToast(`Loaded PDF (${NumberingTool.pageCount} pages). Configure page numbering!`, 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.showToast('Could not load PDF: ' + e.message, 'error');
      workspace.classList.add('hidden');
      dropzone.classList.remove('hidden');
    }
  },

  toDevanagariNumerals: (num) => {
    const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return String(num).split('').map(d => devanagariDigits[parseInt(d, 10)] || d).join('');
  },

  formatPageText: (n, total, formatKey, scriptKey) => {
    const isHindi = scriptKey === 'hi';
    const nStr = isHindi ? NumberingTool.toDevanagariNumerals(n) : String(n);
    const totalStr = isHindi ? NumberingTool.toDevanagariNumerals(total) : String(total);

    if (formatKey === 'page_x_of_y') {
      return isHindi ? `पृष्ठ ${nStr} / ${totalStr}` : `Page ${nStr} of ${totalStr}`;
    } else if (formatKey === 'x_of_y') {
      return `${nStr} / ${totalStr}`;
    } else if (formatKey === 'page_x') {
      return isHindi ? `पृष्ठ ${nStr}` : `Page ${nStr}`;
    } else if (formatKey === 'dash_x_dash') {
      return `- ${nStr} -`;
    }
    return nStr; // 'just_x'
  },

  updatePreview: () => {
    const formatKey = document.getElementById('numbering-format-select')?.value || 'page_x_of_y';
    const posKey = document.getElementById('numbering-pos-select')?.value || 'bottom-center';
    const scriptKey = document.getElementById('numbering-script-select')?.value || 'en';
    const sampleText = NumberingTool.formatPageText(1, NumberingTool.pageCount || 10, formatKey, scriptKey);

    const stamp = document.getElementById('numbering-preview-stamp');
    if (!stamp) return;

    stamp.textContent = sampleText;
    if (scriptKey === 'hi') {
      stamp.style.fontFamily = "'Noto Sans Devanagari', 'Mangal', sans-serif";
    } else {
      stamp.style.fontFamily = "inherit";
    }

    // Update position classes
    stamp.className = 'absolute text-xs font-semibold text-slate-800 transition-all';
    if (posKey === 'bottom-center') {
      stamp.style.left = '50%'; stamp.style.transform = 'translateX(-50%)'; stamp.style.bottom = '12px'; stamp.style.top = ''; stamp.style.right = '';
    } else if (posKey === 'bottom-right') {
      stamp.style.right = '16px'; stamp.style.bottom = '12px'; stamp.style.left = ''; stamp.style.top = ''; stamp.style.transform = '';
    } else if (posKey === 'bottom-left') {
      stamp.style.left = '16px'; stamp.style.bottom = '12px'; stamp.style.right = ''; stamp.style.top = ''; stamp.style.transform = '';
    } else if (posKey === 'top-center') {
      stamp.style.left = '50%'; stamp.style.transform = 'translateX(-50%)'; stamp.style.top = '12px'; stamp.style.bottom = ''; stamp.style.right = '';
    } else if (posKey === 'top-right') {
      stamp.style.right = '16px'; stamp.style.top = '12px'; stamp.style.left = ''; stamp.style.bottom = ''; stamp.style.transform = '';
    } else if (posKey === 'top-left') {
      stamp.style.left = '16px'; stamp.style.top = '12px'; stamp.style.right = ''; stamp.style.bottom = ''; stamp.style.transform = '';
    }
  },

  applyNumbering: async () => {
    if (!NumberingTool.pdfBytes) return;

    const formatKey = document.getElementById('numbering-format-select')?.value || 'page_x_of_y';
    const posKey = document.getElementById('numbering-pos-select')?.value || 'bottom-center';
    const scriptKey = document.getElementById('numbering-script-select')?.value || 'en';
    const startFrom = parseInt(document.getElementById('numbering-start-input')?.value, 10) || 1;
    const skipCover = document.getElementById('numbering-skip-cover')?.checked || false;
    const fontSize = parseInt(document.getElementById('numbering-size-select')?.value, 10) || 10;

    const btn = document.getElementById('numbering-export-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Applying Page Numbers...';
    btn.disabled = true;

    PrivaUtils.showProgress('Numbering Document Pages', 20, 'Loading PDF pages...');

    try {
      const PDFLib = await PrivaUtils.getPDFLib();
      const { PDFDocument, rgb, StandardFonts } = PDFLib;
      const pdfDoc = await PDFDocument.load(NumberingTool.pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;

      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (let i = 0; i < totalPages; i++) {
        const pageIndex = i; // 0-based
        const pageNum = i + 1; // 1-based

        if (skipCover && pageNum === 1) continue;

        const displayedNum = (pageNum - (skipCover ? 1 : 0)) + (startFrom - 1);
        const displayedTotal = totalPages - (skipCover ? 1 : 0);

        const page = pages[pageIndex];
        const { width, height } = page.getSize();
        const textStr = NumberingTool.formatPageText(displayedNum, displayedTotal, formatKey, scriptKey);

        const isHindi = scriptKey === 'hi' || PrivaUtils.isDevanagari(textStr);

        // Position coordinates
        let x = 0;
        let y = 0;
        const marginH = 40;
        const marginV = 28;

        if (isHindi) {
          // Render Devanagari text via high-DPI canvas
          const imgInfo = PrivaUtils.renderTextToImage(textStr, {
            fontSize: fontSize,
            color: '#1e293b',
            fontFamily: "'Noto Sans Devanagari', 'Mangal', sans-serif",
            scale: 3
          });

          if (posKey.includes('center')) x = (width - imgInfo.width) / 2;
          else if (posKey.includes('right')) x = width - imgInfo.width - marginH;
          else x = marginH;

          if (posKey.includes('top')) y = height - marginV - imgInfo.height;
          else y = marginV;

          const embeddedImg = await pdfDoc.embedPng(imgInfo.dataUrl);
          page.drawImage(embeddedImg, {
            x: x,
            y: y,
            width: imgInfo.width,
            height: imgInfo.height
          });
        } else {
          // Standard vector font
          const textWidth = helveticaFont.widthOfTextAtSize(textStr, fontSize);

          if (posKey.includes('center')) x = (width - textWidth) / 2;
          else if (posKey.includes('right')) x = width - textWidth - marginH;
          else x = marginH;

          if (posKey.includes('top')) y = height - marginV;
          else y = marginV;

          page.drawText(textStr, {
            x: x,
            y: y,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.2, 0.25, 0.3)
          });
        }

        PrivaUtils.updateProgress(25 + ((i + 1) / totalPages) * 60, `Numbering page ${i + 1} of ${totalPages}...`);
      }

      PrivaUtils.updateProgress(90, 'Saving serialized PDF...');
      const numberedBytes = await pdfDoc.save({ useObjectStreams: true });

      PrivaUtils.downloadBlob(numberedBytes, `${NumberingTool.fileName}_numbered.pdf`);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast(`Page numbers applied across ${totalPages} pages!`, 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.showToast('Numbering failed: ' + e.message, 'error');
    } finally {
      PrivaUtils.hideProgress();
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  }
};
