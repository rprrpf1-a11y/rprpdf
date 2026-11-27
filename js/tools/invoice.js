// Business Invoice & Receipt PDF Generator — 100% Client-Side Vector PDF Builder
window.InvoiceTool = {
  items: [
    { desc: 'UI/UX Design & Landing Page Development', qty: 1, rate: 450 },
    { desc: 'SEO & Performance Optimization Package', qty: 1, rate: 150 }
  ],
  logoDataUrl: null,
  accentHex: '#4f46e5',

  currencies: {
    INR: { symbol: '₹', pdfPrefix: 'Rs. ' },
    USD: { symbol: '$', pdfPrefix: '$' },
    EUR: { symbol: '€', pdfPrefix: 'EUR ' },
    GBP: { symbol: '£', pdfPrefix: 'GBP ' },
    AED: { symbol: 'AED ', pdfPrefix: 'AED ' }
  },

  init: () => {
    const today = new Date();
    const due = new Date(today.getTime() + 14 * 86400000);
    const dateEl = document.getElementById('inv-date');
    const dueEl = document.getElementById('inv-due-date');
    if (dateEl && !dateEl.value) dateEl.value = today.toISOString().split('T')[0];
    if (dueEl && !dueEl.value) dueEl.value = due.toISOString().split('T')[0];

    const logoInput = document.getElementById('inv-logo-input');
    if (logoInput) {
      logoInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          InvoiceTool.logoDataUrl = ev.target.result;
          InvoiceTool.updatePreview();
          PrivaUtils.showToast('Company logo added to invoice!', 'success');
        };
        reader.readAsDataURL(file);
      });
    }

    const form = document.getElementById('view-invoice');
    if (form) {
      form.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.type !== 'file') {
          el.addEventListener('input', InvoiceTool.updatePreview);
          el.addEventListener('change', InvoiceTool.updatePreview);
        }
      });
    }

    InvoiceTool.renderItemsEditor();
    InvoiceTool.updatePreview();
  },

  setThemeColor: (hex) => {
    InvoiceTool.accentHex = hex;
    document.querySelectorAll('.inv-color-btn').forEach(b => {
      const match = b.getAttribute('data-color') === hex;
      b.classList.toggle('ring-2', match);
      b.classList.toggle('ring-offset-2', match);
      b.classList.toggle('ring-slate-900', match);
    });
    InvoiceTool.updatePreview();
  },

  renderItemsEditor: () => {
    const container = document.getElementById('inv-items-editor');
    if (!container) return;

    container.innerHTML = InvoiceTool.items.map((item, idx) => `
      <div class="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200/80">
        <input type="text" value="${InvoiceTool.escapeHtml(item.desc)}" placeholder="Item description"
          oninput="InvoiceTool.updateItem(${idx}, 'desc', this.value)"
          class="col-span-6 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none">
        <input type="number" min="0" step="any" value="${item.qty}" placeholder="Qty"
          oninput="InvoiceTool.updateItem(${idx}, 'qty', this.value)"
          class="col-span-2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none">
        <input type="number" min="0" step="any" value="${item.rate}" placeholder="Rate"
          oninput="InvoiceTool.updateItem(${idx}, 'rate', this.value)"
          class="col-span-3 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right focus:ring-1 focus:ring-indigo-500 focus:outline-none">
        <button type="button" onclick="InvoiceTool.removeItem(${idx})" title="Remove line item"
          class="col-span-1 text-slate-400 hover:text-rose-600 text-xs flex justify-center">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `).join('');
  },

  addItem: () => {
    InvoiceTool.items.push({ desc: 'New Service / Product', qty: 1, rate: 100 });
    InvoiceTool.renderItemsEditor();
    InvoiceTool.updatePreview();
  },

  removeItem: (idx) => {
    if (InvoiceTool.items.length <= 1) {
      PrivaUtils.showToast('Invoice must have at least one line item.', 'info');
      return;
    }
    InvoiceTool.items.splice(idx, 1);
    InvoiceTool.renderItemsEditor();
    InvoiceTool.updatePreview();
  },

  updateItem: (idx, field, value) => {
    if (!InvoiceTool.items[idx]) return;
    if (field === 'desc') InvoiceTool.items[idx].desc = value;
    else InvoiceTool.items[idx][field] = parseFloat(value) || 0;
    InvoiceTool.updatePreview();
  },

  computeTotals: () => {
    const subtotal = InvoiceTool.items.reduce((sum, it) => sum + (it.qty * it.rate), 0);
    const taxRate = parseFloat(document.getElementById('inv-tax-rate')?.value) || 0;
    const discountRate = parseFloat(document.getElementById('inv-discount-rate')?.value) || 0;

    const discountAmt = subtotal * (discountRate / 100);
    const taxable = Math.max(0, subtotal - discountAmt);
    const taxAmt = taxable * (taxRate / 100);
    const total = taxable + taxAmt;

    return { subtotal, discountRate, discountAmt, taxRate, taxAmt, total };
  },

  escapeHtml: (str) => String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;'),

  updatePreview: () => {
    const curKey = document.getElementById('inv-currency')?.value || 'USD';
    const cur = InvoiceTool.currencies[curKey] || InvoiceTool.currencies.USD;
    const fmt = (n) => `${cur.symbol}${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const invNum = document.getElementById('inv-number')?.value || 'INV-2026-001';
    const invDate = document.getElementById('inv-date')?.value || '';
    const dueDate = document.getElementById('inv-due-date')?.value || '';
    const fromName = document.getElementById('inv-from-name')?.value || 'Your Studio / Company';
    const fromInfo = document.getElementById('inv-from-info')?.value || 'contact@company.com';
    const toName = document.getElementById('inv-to-name')?.value || 'Client Name';
    const toInfo = document.getElementById('inv-to-info')?.value || 'client@domain.com';
    const notes = document.getElementById('inv-notes')?.value || 'Thank you for your business!';

    const totals = InvoiceTool.computeTotals();
    const previewEl = document.getElementById('inv-live-preview');
    if (!previewEl) return;

    const rowsHtml = InvoiceTool.items.map(it => `
      <tr class="border-b border-slate-100">
        <td class="py-2 pr-2 text-slate-800 font-medium">${InvoiceTool.escapeHtml(it.desc) || '—'}</td>
        <td class="py-2 px-2 text-center text-slate-600">${it.qty}</td>
        <td class="py-2 px-2 text-right text-slate-600">${fmt(it.rate)}</td>
        <td class="py-2 pl-2 text-right font-semibold text-slate-900">${fmt(it.qty * it.rate)}</td>
      </tr>
    `).join('');

    previewEl.innerHTML = `
      <div class="border-t-4 pt-5" style="border-color:${InvoiceTool.accentHex}">
        <div class="flex justify-between items-start gap-4 mb-6">
          <div class="flex items-center space-x-3">
            ${InvoiceTool.logoDataUrl ? `<img src="${InvoiceTool.logoDataUrl}" class="h-12 w-auto object-contain rounded" alt="Logo">` : ''}
            <div>
              <h3 class="text-lg font-extrabold text-slate-900">${InvoiceTool.escapeHtml(fromName)}</h3>
              <p class="text-[11px] text-slate-500 whitespace-pre-line">${InvoiceTool.escapeHtml(fromInfo)}</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xl font-black tracking-tight uppercase" style="color:${InvoiceTool.accentHex}">INVOICE</span>
            <p class="text-xs font-bold text-slate-800 mt-0.5">#${InvoiceTool.escapeHtml(invNum)}</p>
            <p class="text-[10px] text-slate-500 mt-1">Date: ${InvoiceTool.escapeHtml(invDate)}</p>
            <p class="text-[10px] text-slate-500">Due: ${InvoiceTool.escapeHtml(dueDate)}</p>
          </div>
        </div>

        <div class="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Bill To</span>
          <p class="text-xs font-bold text-slate-900 mt-0.5">${InvoiceTool.escapeHtml(toName)}</p>
          <p class="text-[11px] text-slate-500 whitespace-pre-line">${InvoiceTool.escapeHtml(toInfo)}</p>
        </div>

        <table class="w-full text-[11px] mb-5">
          <thead>
            <tr class="text-left text-[10px] uppercase tracking-wider text-white" style="background:${InvoiceTool.accentHex}">
              <th class="py-2 px-2 rounded-l-lg">Description</th>
              <th class="py-2 px-2 text-center">Qty</th>
              <th class="py-2 px-2 text-right">Rate</th>
              <th class="py-2 px-2 text-right rounded-r-lg">Amount</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div class="flex justify-end mb-6">
          <div class="w-52 space-y-1 text-xs">
            <div class="flex justify-between text-slate-600"><span>Subtotal:</span><span>${fmt(totals.subtotal)}</span></div>
            ${totals.discountRate > 0 ? `<div class="flex justify-between text-emerald-600"><span>Discount (${totals.discountRate}%):</span><span>-${fmt(totals.discountAmt)}</span></div>` : ''}
            ${totals.taxRate > 0 ? `<div class="flex justify-between text-slate-600"><span>Tax / GST (${totals.taxRate}%):</span><span>+${fmt(totals.taxAmt)}</span></div>` : ''}
            <div class="flex justify-between font-extrabold text-sm pt-2 border-t border-slate-200 text-slate-900">
              <span>Total:</span><span style="color:${InvoiceTool.accentHex}">${fmt(totals.total)}</span>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 text-[10px] text-slate-500">
          <span class="font-bold text-slate-700 block mb-0.5">Notes & Payment Terms:</span>
          <p class="whitespace-pre-line">${InvoiceTool.escapeHtml(notes)}</p>
        </div>
      </div>
    `;
  },

  hexToRgbArray: (hex) => {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.substring(0, 2), 16) || 79,
      parseInt(clean.substring(2, 4), 16) || 70,
      parseInt(clean.substring(4, 6), 16) || 229
    ];
  },

  downloadPdf: async () => {
    const btn = document.getElementById('inv-download-btn');
    const origHtml = btn?.innerHTML;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Generating PDF...';
    }

    try {
      PrivaUtils.showProgress('Generating Vector Invoice PDF', 35, 'Loading PDF layout engine...');
      if (!window.jspdf) {
        await PrivaUtils.loadScript('js/vendor/jspdf.umd.min.js').catch(() =>
          PrivaUtils.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        );
      }
      if (!window.jspdf?.jsPDF?.API?.autoTable) {
        await PrivaUtils.loadScript('js/vendor/jspdf.plugin.autotable.min.js').catch(() =>
          PrivaUtils.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js')
        );
      }

      PrivaUtils.updateProgress(70, 'Drawing vector invoice...');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const rgbArr = InvoiceTool.hexToRgbArray(InvoiceTool.accentHex);

      const curKey = document.getElementById('inv-currency')?.value || 'USD';
      const cur = InvoiceTool.currencies[curKey] || InvoiceTool.currencies.USD;
      const fmtPdf = (n) => `${cur.pdfPrefix}${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const invNum = document.getElementById('inv-number')?.value || 'INV-2026-001';
      const invDate = document.getElementById('inv-date')?.value || '';
      const dueDate = document.getElementById('inv-due-date')?.value || '';
      const fromName = document.getElementById('inv-from-name')?.value || 'Your Company';
      const fromInfo = document.getElementById('inv-from-info')?.value || '';
      const toName = document.getElementById('inv-to-name')?.value || 'Client';
      const toInfo = document.getElementById('inv-to-info')?.value || '';
      const notes = document.getElementById('inv-notes')?.value || '';

      // Top accent strip
      doc.setFillColor(...rgbArr);
      doc.rect(0, 0, 595, 10, 'F');

      let headerX = 45;
      if (InvoiceTool.logoDataUrl) {
        try {
          doc.addImage(InvoiceTool.logoDataUrl, 45, 36, 46, 46);
          headerX = 104;
        } catch (e) { /* skip unsupported logo mime */ }
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(fromName, headerX, 55);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(doc.splitTextToSize(fromInfo, 230), headerX, 71);

      // Right Invoice Title Block
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(...rgbArr);
      doc.text('INVOICE', 550, 58, { align: 'right' });

      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`#${invNum}`, 550, 76, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Issue Date: ${invDate}`, 550, 92, { align: 'right' });
      doc.text(`Due Date: ${dueDate}`, 550, 106, { align: 'right' });

      // Bill To Card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(45, 130, 505, 72, 6, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('BILL TO', 60, 148);
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(toName, 60, 165);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(doc.splitTextToSize(toInfo, 460), 60, 180);

      // Line Items Table
      const tableBody = InvoiceTool.items.map(it => [
        it.desc || '-',
        String(it.qty),
        fmtPdf(it.rate),
        fmtPdf(it.qty * it.rate)
      ]);

      doc.autoTable({
        startY: 222,
        margin: { left: 45, right: 45 },
        head: [['Description', 'Qty', 'Rate', 'Amount']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: rgbArr, textColor: 255, fontSize: 9.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9.5, textColor: [30, 41, 59] },
        columnStyles: {
          1: { halign: 'center', cellWidth: 50 },
          2: { halign: 'right', cellWidth: 90 },
          3: { halign: 'right', cellWidth: 95, fontStyle: 'bold' }
        }
      });

      const totals = InvoiceTool.computeTotals();
      let finalY = (doc.lastAutoTable?.finalY || 320) + 25;

      const summaryX = 370;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('Subtotal:', summaryX, finalY);
      doc.text(fmtPdf(totals.subtotal), 550, finalY, { align: 'right' });

      if (totals.discountRate > 0) {
        finalY += 18;
        doc.setTextColor(5, 150, 105);
        doc.text(`Discount (${totals.discountRate}%):`, summaryX, finalY);
        doc.text(`-${fmtPdf(totals.discountAmt)}`, 550, finalY, { align: 'right' });
      }

      if (totals.taxRate > 0) {
        finalY += 18;
        doc.setTextColor(71, 85, 105);
        doc.text(`Tax / GST (${totals.taxRate}%):`, summaryX, finalY);
        doc.text(`+${fmtPdf(totals.taxAmt)}`, 550, finalY, { align: 'right' });
      }

      finalY += 14;
      doc.setDrawColor(226, 232, 240);
      doc.line(summaryX, finalY, 550, finalY);
      finalY += 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...rgbArr);
      doc.text('Total Due:', summaryX, finalY);
      doc.text(fmtPdf(totals.total), 550, finalY, { align: 'right' });

      if (notes.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text('Notes & Payment Terms:', 45, finalY + 45);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(doc.splitTextToSize(notes, 500), 45, finalY + 60);
      }

      doc.save(`${invNum.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
      PrivaUtils.hideProgress();
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Vector Invoice PDF downloaded!', 'success');
    } catch (err) {
      console.error(err);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Invoice PDF export error: ' + err.message, 'error');
    } finally {
      if (btn && origHtml) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  }
};
