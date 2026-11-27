// WhatsApp Direct Chat Link & QR Generator — 100% In-Browser Execution
window.WhatsAppTool = {
  qrInstance: null,

  init: () => {
    const phoneInput = document.getElementById('wa-phone-input');
    const msgInput = document.getElementById('wa-message-input');
    const codeSelect = document.getElementById('wa-country-code');

    if (phoneInput) phoneInput.addEventListener('input', WhatsAppTool.updateLink);
    if (msgInput) msgInput.addEventListener('input', WhatsAppTool.updateLink);
    if (codeSelect) codeSelect.addEventListener('change', WhatsAppTool.updateLink);
  },

  getCleanNumber: () => {
    const code = document.getElementById('wa-country-code')?.value || '91';
    let raw = document.getElementById('wa-phone-input')?.value || '';
    // Strip everything except digits
    raw = raw.replace(/\D/g, '');
    // If user already typed leading country code, avoid duplicating
    if (raw.startsWith(code) && raw.length > code.length + 6) {
      return raw;
    }
    return code + raw;
  },

  updateLink: () => {
    const fullNumber = WhatsAppTool.getCleanNumber();
    const message = document.getElementById('wa-message-input')?.value || '';
    const linkEl = document.getElementById('wa-generated-link');
    const openBtn = document.getElementById('wa-open-chat-btn');
    const bubbleEl = document.getElementById('wa-bubble-preview');

    if (!fullNumber || fullNumber.length < 7) {
      if (linkEl) linkEl.value = 'Please enter a valid phone number...';
      if (openBtn) openBtn.disabled = true;
      return;
    }

    let url = `https://wa.me/${fullNumber}`;
    if (message.trim()) {
      url += `?text=${encodeURIComponent(message.trim())}`;
    }

    if (linkEl) linkEl.value = url;
    if (openBtn) {
      openBtn.disabled = false;
      openBtn.href = url;
    }
    if (bubbleEl) {
      bubbleEl.textContent = message.trim() || 'Hello! (Empty message)';
    }

    // Generate WhatsApp QR Code
    const qrContainer = document.getElementById('wa-qr-container');
    if (qrContainer && window.QRCode) {
      qrContainer.innerHTML = '';
      WhatsAppTool.qrInstance = new QRCode(qrContainer, {
        text: url,
        width: 200,
        height: 200,
        colorDark: '#075e54', // Official WhatsApp deep teal/green
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  },

  setPresetMessage: (text) => {
    const msgInput = document.getElementById('wa-message-input');
    if (msgInput) {
      msgInput.value = text;
      WhatsAppTool.updateLink();
    }
  },

  copyLink: () => {
    const link = document.getElementById('wa-generated-link')?.value || '';
    if (link && !link.includes('Please enter')) {
      navigator.clipboard.writeText(link);
      PrivaUtils.showToast('WhatsApp link copied to clipboard!', 'success');
    } else {
      PrivaUtils.showToast('Enter a phone number first.', 'error');
    }
  },

  downloadQrCode: () => {
    const container = document.getElementById('wa-qr-container');
    const canvas = container?.querySelector('canvas');
    if (canvas) {
      PrivaUtils.downloadBlob(
        PrivaUtils.dataUrlToBlob(canvas.toDataURL('image/png')),
        'whatsapp_chat_qr.png'
      );
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('WhatsApp QR Code downloaded!', 'success');
    } else {
      PrivaUtils.showToast('Generate a link first to download QR code.', 'error');
    }
  }
};
