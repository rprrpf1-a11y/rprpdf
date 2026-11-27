// Phase 4: Office to PDF (Word .docx, Excel .xlsx, and Plain Text to PDF)
// 100% Serverless, in-browser document parsing and conversion

window.OfficeTool = {
  currentFileType: 'docx', // 'docx' | 'xlsx' | 'txt'
  currentFile: null,
  parsedData: null,

  init: () => {
    const docxInput = document.getElementById('docx-file-input');
    const docxDropzone = document.getElementById('docx-dropzone');
    const excelInput = document.getElementById('excel-file-input');
    const excelDropzone = document.getElementById('excel-dropzone');

    if (docxInput) {
      docxInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          OfficeTool.loadWordFile(e.target.files[0]);
        }
      });
    }

    if (docxDropzone) {
      docxDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        docxDropzone.classList.add('border-indigo-500', 'bg-indigo-50/50');
      });
      docxDropzone.addEventListener('dragleave', () => {
        docxDropzone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
      });
      docxDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        docxDropzone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          OfficeTool.loadWordFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (excelInput) {
      excelInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          OfficeTool.loadExcelFile(e.target.files[0]);
        }
      });
    }

    if (excelDropzone) {
      excelDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        excelDropzone.classList.add('border-emerald-500', 'bg-emerald-50/50');
      });
      excelDropzone.addEventListener('dragleave', () => {
        excelDropzone.classList.remove('border-emerald-500', 'bg-emerald-50/50');
      });
      excelDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        excelDropzone.classList.remove('border-emerald-500', 'bg-emerald-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          OfficeTool.loadExcelFile(e.dataTransfer.files[0]);
        }
      });
    }
  },

  // Ensure heavy dependencies are dynamically loaded only when needed
  ensureDependencies: async (type) => {
    PrivaUtils.showProgress('Loading Client-Side Converter Engine', 30, 'Initializing document modules...');

    // Load jsPDF core
    if (!window.jspdf) {
      await PrivaUtils.loadScript('js/vendor/jspdf.umd.min.js').catch(() => 
        PrivaUtils.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      );
    }

    if (type === 'docx') {
      if (!window.mammoth) {
        PrivaUtils.updateProgress(60, 'Loading Mammoth DOCX parser module...');
        await PrivaUtils.loadScript('js/vendor/mammoth.browser.min.js').catch(() =>
          PrivaUtils.loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js')
        );
      }
    } else if (type === 'xlsx') {
      if (!window.XLSX) {
        PrivaUtils.updateProgress(60, 'Loading SheetJS Excel engine...');
        await PrivaUtils.loadScript('js/vendor/xlsx.full.min.js').catch(() =>
          PrivaUtils.loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js')
        );
      }
      if (!window.jspdf || !window.jspdf.jsPDF.API.autoTable) {
        PrivaUtils.updateProgress(80, 'Loading AutoTable layout renderer...');
        await PrivaUtils.loadScript('js/vendor/jspdf.plugin.autotable.min.js').catch(() =>
          PrivaUtils.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js')
        );
      }
    }

    PrivaUtils.hideProgress();
  },

  // ================= WORD (.DOCX) TO PDF =================
  loadWordFile: async (file) => {
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.docx') && !nameLower.endsWith('.txt') && !nameLower.endsWith('.md')) {
      PrivaUtils.showToast('Please select a valid Word (.docx) or Text file.', 'error');
      return;
    }

    OfficeTool.currentFile = file;
    OfficeTool.currentFileType = nameLower.endsWith('.docx') ? 'docx' : 'txt';

    const dropzone = document.getElementById('docx-dropzone');
    const workspace = document.getElementById('docx-workspace');
    dropzone.classList.add('hidden');
    workspace.classList.remove('hidden');

    document.getElementById('docx-doc-name').textContent = file.name;
    document.getElementById('docx-doc-meta').textContent = `${PrivaUtils.formatBytes(file.size)} • In-Memory Processing`;

    try {
      await OfficeTool.ensureDependencies('docx');
      PrivaUtils.showProgress('Parsing Document', 50, 'Extracting document text & styling...');

      const previewContainer = document.getElementById('docx-preview-content');
      previewContainer.innerHTML = '';

      if (OfficeTool.currentFileType === 'docx') {
        const arrayBuffer = await PrivaUtils.readFileAsArrayBuffer(file);
        const result = await mammoth.convertToHtml({ arrayBuffer });
        OfficeTool.parsedData = {
          html: result.value,
          rawText: result.value.replace(/<[^>]+>/g, ' ')
        };
        previewContainer.innerHTML = `<div class="prose max-w-none text-slate-800">${result.value}</div>`;
      } else {
        const text = await PrivaUtils.readFileAsText(file);
        OfficeTool.parsedData = { html: '', rawText: text };
        previewContainer.innerHTML = `<pre class="whitespace-pre-wrap font-sans text-sm text-slate-800">${text}</pre>`;
      }

      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Word document parsed successfully. Ready to convert!', 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Failed to parse Word document: ' + e.message, 'error');
    }
  },

  convertWordToPdf: async () => {
    if (!OfficeTool.parsedData) return;

    const btn = document.getElementById('docx-convert-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Converting In Browser...';
    btn.disabled = true;

    PrivaUtils.showProgress('Generating PDF Document', 30, 'Formatting typography and margins...');

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        unit: 'pt',
        format: 'a4',
        orientation: 'portrait'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const maxLineWidth = pageWidth - (margin * 2);

      PrivaUtils.updateProgress(60, 'Paginating document text...');

      // Split text into lines
      const text = OfficeTool.parsedData.rawText;
      const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(33, 37, 41);

      let currentY = margin + 20;

      // Header title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(OfficeTool.currentFile.name.replace(/\.[^/.]+$/, ''), margin, currentY);
      currentY += 24;

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 20;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i].trim();
        const lines = doc.splitTextToSize(p, maxLineWidth);

        for (const line of lines) {
          if (currentY > pageHeight - margin - 30) {
            // Add page number footer before adding new page
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

            doc.addPage();
            currentY = margin + 20;
            doc.setFontSize(11);
            doc.setTextColor(33, 37, 41);
          }

          doc.text(line, margin, currentY);
          currentY += 16;
        }
        currentY += 8; // Paragraph spacing
      }

      // Final page footer
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

      PrivaUtils.updateProgress(90, 'Serializing PDF binary...');
      const pdfBlob = doc.output('blob');
      const outName = `${OfficeTool.currentFile.name.replace(/\.[^/.]+$/, '')}.pdf`;

      PrivaUtils.downloadBlob(pdfBlob, outName);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Converted PDF successfully generated and downloaded!', 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.showToast('Conversion failed: ' + e.message, 'error');
    } finally {
      PrivaUtils.hideProgress();
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  },

  // ================= EXCEL (.XLSX, .CSV) TO PDF =================
  loadExcelFile: async (file) => {
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.xlsx') && !nameLower.endsWith('.xls') && !nameLower.endsWith('.csv')) {
      PrivaUtils.showToast('Please select a valid Excel (.xlsx, .xls) or CSV file.', 'error');
      return;
    }

    OfficeTool.currentFile = file;
    OfficeTool.currentFileType = 'xlsx';

    const dropzone = document.getElementById('excel-dropzone');
    const workspace = document.getElementById('excel-workspace');
    dropzone.classList.add('hidden');
    workspace.classList.remove('hidden');

    document.getElementById('excel-doc-name').textContent = file.name;
    document.getElementById('excel-doc-meta').textContent = `${PrivaUtils.formatBytes(file.size)} • In-Browser Spreadsheet`;

    try {
      await OfficeTool.ensureDependencies('xlsx');
      PrivaUtils.showProgress('Parsing Spreadsheet', 40, 'Reading workbook sheets...');

      const arrayBuffer = await PrivaUtils.readFileAsArrayBuffer(file);
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Parse as 2D array of rows
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      OfficeTool.parsedData = {
        sheetName: firstSheetName,
        rows: jsonData
      };

      // Render table preview (first 10 rows)
      const previewTable = document.getElementById('excel-preview-table');
      previewTable.innerHTML = '';

      if (jsonData.length > 0) {
        const thead = document.createElement('thead');
        const headerRow = jsonData[0];
        thead.innerHTML = `<tr class="bg-slate-100 text-slate-700 text-xs font-bold">${headerRow.map(c => `<th class="p-2 border border-slate-200 text-left">${c || ''}</th>`).join('')}</tr>`;
        previewTable.appendChild(thead);

        const tbody = document.createElement('tbody');
        const previewRows = jsonData.slice(1, 15);
        tbody.innerHTML = previewRows.map(row => 
          `<tr class="border-b border-slate-100 text-xs text-slate-600 hover:bg-slate-50">${headerRow.map((_, idx) => `<td class="p-2 border border-slate-200">${row[idx] !== undefined ? row[idx] : ''}</td>`).join('')}</tr>`
        ).join('');
        previewTable.appendChild(tbody);
      }

      PrivaUtils.hideProgress();
      PrivaUtils.showToast(`Spreadsheet loaded (${jsonData.length} rows, sheet: "${firstSheetName}")!`, 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Failed to parse Excel file: ' + e.message, 'error');
    }
  },

  convertExcelToPdf: async () => {
    if (!OfficeTool.parsedData || !OfficeTool.parsedData.rows) return;

    const btn = document.getElementById('excel-convert-btn');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Generating Table PDF...';
    btn.disabled = true;

    PrivaUtils.showProgress('Generating Table PDF', 30, 'Formatting spreadsheet grids...');

    try {
      const { jsPDF } = window.jspdf;
      const rows = OfficeTool.parsedData.rows;
      if (rows.length === 0) throw new Error('No data found in worksheet');

      const headers = rows[0].map(h => String(h || ''));
      const body = rows.slice(1).map(r => headers.map((_, i) => String(r[i] !== undefined ? r[i] : '')));

      // Auto-choose landscape if more than 5 columns
      const isLandscape = headers.length > 5;
      const doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      PrivaUtils.updateProgress(60, 'Rendering paginated table structure...');

      // Render title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(OfficeTool.currentFile.name.replace(/\.[^/.]+$/, ''), 40, 35);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Sheet: ${OfficeTool.parsedData.sheetName} • Total Rows: ${body.length}`, 40, 50);

      // Render AutoTable
      doc.autoTable({
        startY: 65,
        head: [headers],
        body: body,
        theme: 'striped',
        styles: {
          fontSize: 8,
          cellPadding: 4,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { top: 65, right: 30, bottom: 40, left: 30 },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(150);
          const pageStr = `Page ${doc.internal.getNumberOfPages()}`;
          doc.text(pageStr, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });
        }
      });

      PrivaUtils.updateProgress(90, 'Serializing PDF...');
      const pdfBlob = doc.output('blob');
      const outName = `${OfficeTool.currentFile.name.replace(/\.[^/.]+$/, '')}.pdf`;

      PrivaUtils.downloadBlob(pdfBlob, outName);
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Spreadsheet PDF successfully generated and downloaded!', 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.showToast('Excel conversion failed: ' + e.message, 'error');
    } finally {
      PrivaUtils.hideProgress();
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  }
};
