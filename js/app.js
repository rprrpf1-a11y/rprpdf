// Main App Controller, Universal Drop Zone, and MIME-Aware Router
window.PrivaApp = {
  currentView: 'home',
  pendingDroppedFile: null,
  pendingAllFiles: null,

  // SEO Metadata per Tool (Dynamic Titles, Descriptions & Rich Search Snippets)
  toolMetadata: {
    'home': {
      title: 'RprPDF — 100% Private Client-Side PDF Tools',
      description: 'Merge, split, compress, sign, and edit PDFs directly inside your browser. 100% private. Files never leave your device.',
      hash: ''
    },
    'merge': {
      title: 'Merge PDF Online Free — 100% Private | RprPDF',
      description: 'Combine multiple PDF files into one single document securely in your browser. Fast, free, and 100% private with no server uploads.',
      hash: 'merge'
    },
    'split': {
      title: 'Split PDF Online Free — Visual Page Extractor | RprPDF',
      description: 'Visually select, preview, and extract pages or page ranges from your PDF into a new document. 100% private in-browser tool.',
      hash: 'split'
    },
    'edit': {
      title: 'Edit PDF Online Free — Add Hindi & English Text, Signatures | RprPDF',
      description: 'Free client-side PDF editor. Add Devanagari Hindi and English text, images, annotations, and shapes directly in your browser.',
      hash: 'edit'
    },
    'rotate': {
      title: 'Organize & Rearrange PDF Pages Online Free | RprPDF',
      description: 'Drag and drop to rearrange, rotate, duplicate, or delete PDF pages visually in your browser with zero cloud uploads.',
      hash: 'rotate'
    },
    'compress': {
      title: 'Compress PDF Online Free — Reduce PDF File Size | RprPDF',
      description: 'Reduce PDF file size up to 90% without quality degradation. Fast, safe client-side PDF compressor.',
      hash: 'compress'
    },
    'docx': {
      title: 'Word to PDF Converter Online Free (DOCX to PDF) | RprPDF',
      description: 'Convert Microsoft Word (.docx, .doc) documents into standard PDFs locally on your device with high formatting fidelity.',
      hash: 'docx'
    },
    'excel': {
      title: 'Excel to PDF Converter Online Free (XLSX, CSV to PDF) | RprPDF',
      description: 'Convert Excel spreadsheets (.xlsx, .xls) and CSV tables into clean PDFs directly in your browser without server uploads.',
      hash: 'excel'
    },
    'sign': {
      title: 'Sign PDF Online Free — Draw, Type & Add Digital Signatures | RprPDF',
      description: 'Sign PDF contracts, agreements, and forms securely with drawn, typed, or uploaded signature stamps.',
      hash: 'sign'
    },
    'watermark': {
      title: 'Watermark PDF Online Free — Text & Hindi Watermarks | RprPDF',
      description: 'Add customizable text watermarks, confidential stamps, and Hindi presets (गोपनीय, अति गोपनीय) across all PDF pages.',
      hash: 'watermark'
    },
    'convert': {
      title: 'Convert PDF to JPG/PNG & Images to PDF Online Free | RprPDF',
      description: 'Convert PDF pages to high-resolution JPG/PNG images or bundle photos into a single PDF document in your browser.',
      hash: 'convert'
    },
    'protect': {
      title: 'Protect PDF Online Free — Password Encryption | RprPDF',
      description: 'Secure sensitive PDF documents with standard password encryption. 100% private, files never leave your computer.',
      hash: 'protect'
    },
    'numbering': {
      title: 'Add Page Numbers to PDF Online Free (English & Hindi) | RprPDF',
      description: 'Add custom headers, footers, and page numbers (1, 2, 3 or १, २, ३) with flexible alignment to your PDF files.',
      hash: 'numbering'
    },
    'grayscale': {
      title: 'PDF to Grayscale / Black & White Online Free | RprPDF',
      description: 'Convert color PDFs to clean grayscale or black and white for laser printing and photocopying ink savings.',
      hash: 'grayscale'
    },
    'crop': {
      title: 'Crop & Flatten PDF Online Free — Trim Margins & Lock Forms | RprPDF',
      description: 'Trim unwanted white margins and flatten PDF forms, annotations, and text into read-only pages.',
      hash: 'crop'
    },
    'imgcompress': {
      title: 'Image Compressor Online Free — Batch Compress JPG, PNG, WebP | RprPDF',
      description: 'Batch compress photos and images by up to 90% without quality loss. Download individual files or as ZIP.',
      hash: 'imgcompress'
    },
    'qrcode': {
      title: 'QR Code Generator & Scanner Online Free — 100% Private | RprPDF',
      description: 'Create custom colored QR codes for Websites, WiFi, Text, and vCards. Scan & decode QR images or use camera offline in browser.',
      hash: 'qrcode'
    },
    'exif': {
      title: 'EXIF Metadata Remover & Viewer Online Free | RprPDF',
      description: 'Inspect hidden camera settings, device serials, and GPS map locations inside photos. Permanently wipe all tracking metadata.',
      hash: 'exif'
    },
    'favicon': {
      title: 'Favicon & App Icon Generator Online Free | RprPDF',
      description: 'Convert any image or logo into all standard favicon sizes (16px, 32px, 180px, 512px) and download a complete ZIP package.',
      hash: 'favicon'
    },
    'textdiff': {
      title: 'Text Diff Checker & Case Converter Online Free | RprPDF',
      description: 'Compare two texts side-by-side with color-coded additions and deletions. Includes case converter, regex find & replace, and line sorter.',
      hash: 'textdiff'
    },
    'whatsapp': {
      title: 'WhatsApp Direct Chat Link & QR Generator Online Free | RprPDF',
      description: 'Create 1-click click-to-chat WhatsApp direct links (wa.me) and branded QR codes with pre-filled messages without saving numbers.',
      hash: 'whatsapp'
    },
    'wadp': {
      title: 'WhatsApp DP Downloader Online Free — View & Download Profile Pictures HD | RprPDF',
      description: 'View and download public WhatsApp profile pictures (DP) in full HD resolution without saving contact numbers. Add trending story rings and verified badges.',
      hash: 'wadp',
      slug: 'whatsapp-dp-downloader'
    },
    'unlock': {
      title: 'Unlock PDF Online Free — Remove PDF Password & Restrictions | RprPDF',
      description: 'Remove open passwords, copy locks, and print restrictions from PDF files 100% locally in your browser without uploading sensitive files.',
      hash: 'unlock',
      slug: 'unlock-pdf'
    },
    'pdf2text': {
      title: 'PDF to Word & Text Extractor Online Free (.DOC, .TXT, .MD) | RprPDF',
      description: 'Extract clean formatted text from PDFs locally and export to Word (.doc), Markdown (.md), or plain text (.txt) with instant word counts.',
      hash: 'pdf2text',
      slug: 'pdf-to-text'
    },
    'invoice': {
      title: 'Free Invoice PDF Generator — Create Business Invoices & Receipts | RprPDF',
      description: 'Design modern PDF invoices with company logo, automatic tax/GST, discounts, multiple currencies, and live preview 100% in your browser.',
      hash: 'invoice',
      slug: 'invoice-generator'
    },
    'imgconvert': {
      title: 'Image Converter & Resizer Studio — PNG, JPG, WebP Batch Tool | RprPDF',
      description: 'Batch convert between PNG, JPG, and WebP, resize images to custom pixels or social media presets, and download everything as ZIP offline.',
      hash: 'imgconvert',
      slug: 'image-converter'
    },
    'passgen': {
      title: 'Strong Password & Passphrase Generator + Strength Checker | RprPDF',
      description: 'Generate cryptographically secure random passwords, memorable passphrases, and PINs using Web Crypto API. Check password crack time offline.',
      hash: 'passgen',
      slug: 'password-generator'
    },
    'devformat': {
      title: 'JSON Formatter, Base64 Encoder, Hash & JWT Inspector Online Free | RprPDF',
      description: 'Format and validate JSON, encode/decode Base64 text & files, inspect JWT token expiration, and compute SHA-256 hashes privately in your browser.',
      hash: 'devformat',
      slug: 'json-formatter'
    },
    'ocr': {
      title: 'AI OCR Scanner — Scanned PDF & Image to Text (Hindi & English) | RprPDF',
      description: 'Extract searchable text from scanned PDFs, receipts, and screenshots using on-device WebAssembly Tesseract OCR with English and Hindi support.',
      hash: 'ocr',
      slug: 'ai-ocr'
    },
    'aihelper': {
      title: 'On-Device AI Document Summarizer & Analyzer | RprPDF',
      description: 'Summarize confidential PDFs and articles locally using built-in Web AI or offline NLP keyword scoring. Extract dates, key figures, and AI prompts privately.',
      hash: 'aihelper',
      slug: 'ai-document-assistant'
    },
    'mdpdf': {
      title: 'AI Markdown & Resume to PDF Studio Online Free | RprPDF',
      description: 'Convert Markdown reports, AI chat responses, and modern resumes into styled multi-page PDF documents and clean HTML locally.',
      hash: 'mdpdf',
      slug: 'markdown-to-pdf'
    },
    'palette': {
      title: 'Brand Color Extractor, Contrast Checker & Gradient Studio | RprPDF',
      description: 'Extract dominant HEX color palettes from any logo or photo, test WCAG AA/AAA accessibility contrast, and download 1080p gradient wallpapers.',
      hash: 'palette',
      slug: 'color-palette-studio'
    },
    'voicenotes': {
      title: 'Live Voice Dictation & Speech-to-Text PDF Notes (Hindi & English) | RprPDF',
      description: 'Dictate notes hands-free with a live audio waveform visualizer in Hindi and English, and export transcripts directly as PDF or text.',
      hash: 'voicenotes',
      slug: 'voice-to-text'
    },
    'vault': {
      title: 'Zero-Knowledge AES-256-GCM File Locker & SHA-256 Verifier | RprPDF',
      description: 'Encrypt and decrypt any file with military-grade PBKDF2 + AES-256-GCM Web Crypto inside your browser, plus verify SHA-256 file integrity.',
      hash: 'vault',
      slug: 'file-encryptor'
    }
  },

  // Tool Hash Aliases for flexible deep linking
  toolAliases: {
    'ai-ocr': 'ocr',
    'ocr-scanner': 'ocr',
    'scanned-pdf-to-text': 'ocr',
    'ai-document-assistant': 'aihelper',
    'ai-summarizer': 'aihelper',
    'pdf-summarizer': 'aihelper',
    'markdown-to-pdf': 'mdpdf',
    'md-to-pdf': 'mdpdf',
    'resume-builder': 'mdpdf',
    'color-palette-studio': 'palette',
    'color-extractor': 'palette',
    'contrast-checker': 'palette',
    'voice-to-text': 'voicenotes',
    'speech-to-text': 'voicenotes',
    'dictation': 'voicenotes',
    'file-encryptor': 'vault',
    'aes-encrypt': 'vault',
    'file-locker': 'vault',
    'unlock-pdf': 'unlock',
    'remove-password': 'unlock',
    'decrypt-pdf': 'unlock',
    'pdf-to-text': 'pdf2text',
    'pdf-to-word': 'pdf2text',
    'extract-text': 'pdf2text',
    'invoice-generator': 'invoice',
    'invoice-maker': 'invoice',
    'receipt-generator': 'invoice',
    'image-converter': 'imgconvert',
    'image-resizer': 'imgconvert',
    'png-to-jpg': 'imgconvert',
    'webp-converter': 'imgconvert',
    'password-generator': 'passgen',
    'passphrase-generator': 'passgen',
    'password-checker': 'passgen',
    'json-formatter': 'devformat',
    'base64': 'devformat',
    'jwt-decoder': 'devformat',
    'hash-generator': 'devformat',
    'whatsapp-dp': 'wadp',
    'whatsapp-dp-downloader': 'wadp',
    'dp-downloader': 'wadp',
    'wa-dp': 'wadp',
    'profile-pic': 'wadp',
    'profile-picture': 'wadp',
    'whatsapp-direct-chat': 'whatsapp',
    'qr-code-generator': 'qrcode',
    'compress-pdf': 'compress',
    'merge-pdf': 'merge',
    'edit-pdf': 'edit',
    'image-compressor': 'imgcompress',
    'sign-pdf': 'sign',
    'split-pdf': 'split',
    'word-to-pdf': 'docx',
    'excel-to-pdf': 'excel',
    'pdf-to-images': 'convert',
    'images-to-pdf': 'convert',
    'exif-metadata-remover': 'exif',
    'text-diff-checker': 'textdiff',
    'favicon-generator': 'favicon',
    'protect-pdf': 'protect',
    'watermark-pdf': 'watermark',
    'organize-pdf': 'rotate',
    'page-numbers': 'numbering',
    'crop-pdf': 'crop',
    'pdf-to-grayscale': 'grayscale',
    'organize': 'rotate',
    'word-to-pdf': 'docx',
    'word': 'docx',
    'excel-to-pdf': 'excel',
    'spreadsheet': 'excel',
    'pdf-to-images': 'convert',
    'pdf-to-img': 'convert',
    'images-to-pdf': 'convert',
    'img-to-pdf': 'convert',
    'image-compressor': 'imgcompress',
    'image-compress': 'imgcompress',
    'imagecompress': 'imgcompress',
    'page-numbers': 'numbering',
    'headers-footers': 'numbering',
    'flatten': 'crop',
    'qr': 'qrcode',
    'qr-code': 'qrcode',
    'qr-generator': 'qrcode',
    'qr-scanner': 'qrcode',
    'metadata': 'exif',
    'exif-stripper': 'exif',
    'metadata-remover': 'exif',
    'icon-generator': 'favicon',
    'favicons': 'favicon',
    'app-icons': 'favicon',
    'diff': 'textdiff',
    'text-diff': 'textdiff',
    'compare-text': 'textdiff',
    'case-converter': 'textdiff',
    'wa': 'whatsapp',
    'wa-link': 'whatsapp',
    'whatsapp-link': 'whatsapp'
  },

  init: () => {
    PrivaApp.initGlobalDragAndDrop();
    PrivaApp.initSearch();

    // Initialize all tool modules
    if (window.SplitTool) window.SplitTool.init();
    if (window.MergeTool) window.MergeTool.init();
    if (window.SignTool) window.SignTool.init();
    if (window.CompressTool) window.CompressTool.init();
    if (window.RotateTool) window.RotateTool.init();
    if (window.WatermarkTool) window.WatermarkTool.init();
    if (window.ConvertTool) window.ConvertTool.init();
    if (window.EditTool) window.EditTool.init();
    if (window.OfficeTool) window.OfficeTool.init();
    if (window.ProtectTool) window.ProtectTool.init();
    if (window.NumberingTool) window.NumberingTool.init();
    if (window.GrayscaleTool) window.GrayscaleTool.init();
    if (window.CropTool) window.CropTool.init();
    if (window.ImageCompressTool) window.ImageCompressTool.init();
    if (window.QRCodeTool) window.QRCodeTool.init();
    if (window.ExifTool) window.ExifTool.init();
    if (window.FaviconTool) window.FaviconTool.init();
    if (window.TextDiffTool) window.TextDiffTool.init();
    if (window.WhatsAppTool) window.WhatsAppTool.init();
    if (window.WhatsAppDpTool) window.WhatsAppDpTool.init();
    if (window.UnlockTool) window.UnlockTool.init();
    if (window.Pdf2TextTool) window.Pdf2TextTool.init();
    if (window.InvoiceTool) window.InvoiceTool.init();
    if (window.ImgConvertTool) window.ImgConvertTool.init();
    if (window.PassGenTool) window.PassGenTool.init();
    if (window.DevFormatTool) window.DevFormatTool.init();
    if (window.OcrTool) window.OcrTool.init();
    if (window.AiHelperTool) window.AiHelperTool.init();
    if (window.MdPdfTool) window.MdPdfTool.init();
    if (window.PaletteTool) window.PaletteTool.init();
    if (window.VoiceNotesTool) window.VoiceNotesTool.init();
    if (window.VaultTool) window.VaultTool.init();

    // Setup deep-linking and browser navigation (Back / Forward)
    window.addEventListener('hashchange', () => {
      PrivaApp.handleHashRoute();
    });

    // Initial route based on URL hash
    PrivaApp.handleHashRoute();
  },

  // Universal Drop Zone: Drop ANY file anywhere on the browser window
  initGlobalDragAndDrop: () => {
    const overlay = document.getElementById('global-drop-overlay');
    let dragCounter = 0;

    // Helper: Determine if the drag event is actually an external OS file drag,
    // and NOT an internal HTML drag (such as reordering page cards in Organize Pages)
    const isExternalFileDrag = (e) => {
      if (window.isInternalDragActive) return false;
      if (!e || !e.dataTransfer) return false;
      const types = e.dataTransfer.types;
      if (!types || types.length === 0) return false;
      const list = Array.from(types);
      return list.includes('Files') && !list.includes('application/x-privapdf-internal');
    };

    if (overlay) {
      overlay.addEventListener('click', () => {
        dragCounter = 0;
        overlay.classList.remove('active');
      });
    }

    window.addEventListener('dragenter', (e) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1 && overlay) {
        overlay.classList.add('active');
      }
    });

    window.addEventListener('dragleave', (e) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0 && overlay) {
        dragCounter = 0;
        overlay.classList.remove('active');
      }
    });

    window.addEventListener('dragover', (e) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
    });

    window.addEventListener('dragend', () => {
      window.isInternalDragActive = false;
      dragCounter = 0;
      if (overlay) overlay.classList.remove('active');
    });

    window.addEventListener('drop', (e) => {
      if (!isExternalFileDrag(e)) {
        dragCounter = 0;
        if (overlay) overlay.classList.remove('active');
        return;
      }
      e.preventDefault();
      dragCounter = 0;
      if (overlay) overlay.classList.remove('active');

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      const firstFile = files[0];
      const nameLower = firstFile.name.toLowerCase();
      const mime = firstFile.type.toLowerCase();

      // If user is currently inside a specific tool, forward file directly to that tool
      if (PrivaApp.currentView !== 'home') {
        PrivaApp.forwardFileToCurrentTool(files);
        return;
      }

      // Universal Drop Zone Auto-Routing based on MIME type & extension:
      // 1. Word / Docs -> Automatically route to Word to PDF
      if (nameLower.endsWith('.docx') || nameLower.endsWith('.doc') || nameLower.endsWith('.txt') || nameLower.endsWith('.md') || mime.includes('wordprocessing') || mime.includes('text/plain')) {
        PrivaApp.navigateTo('docx');
        setTimeout(() => {
          if (window.OfficeTool) window.OfficeTool.loadWordFile(firstFile);
        }, 150);
        return;
      }

      // 2. Excel / Spreadsheets / CSV -> Automatically route to Excel to PDF
      if (nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls') || nameLower.endsWith('.csv') || mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
        PrivaApp.navigateTo('excel');
        setTimeout(() => {
          if (window.OfficeTool) window.OfficeTool.loadExcelFile(firstFile);
        }, 150);
        return;
      }

      // 3. Images (JPG, PNG, WEBP) -> Automatically route to Images to PDF
      if (mime.startsWith('image/') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.png') || nameLower.endsWith('.webp')) {
        PrivaApp.navigateTo('convert');
        const tabBtn = document.getElementById('tab-img2pdf-btn');
        if (tabBtn) tabBtn.click();
        setTimeout(() => {
          if (window.ConvertTool) window.ConvertTool.addImages(Array.from(files));
        }, 150);
        return;
      }

      // 4. PDF File -> Open the Quick Action Selector modal for user's desired action
      if (nameLower.endsWith('.pdf') || mime.includes('pdf')) {
        PrivaApp.handleDroppedFileOnHome(firstFile, files);
        return;
      }

      // Fallback
      PrivaApp.handleDroppedFileOnHome(firstFile, files);
    });
  },

  handleDroppedFileOnHome: (file, allFiles) => {
    PrivaApp.pendingDroppedFile = file;
    PrivaApp.pendingAllFiles = allFiles;

    const modal = document.getElementById('quick-action-modal');
    const fileNameEl = document.getElementById('quick-action-filename');
    const fileMetaEl = document.getElementById('quick-action-meta');

    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileMetaEl) fileMetaEl.textContent = `${PrivaUtils.formatBytes(file.size)} • ${file.type || 'Document'}`;

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeQuickActionModal: () => {
    const modal = document.getElementById('quick-action-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    PrivaApp.pendingDroppedFile = null;
    PrivaApp.pendingAllFiles = null;
  },

  chooseQuickAction: (toolId) => {
    const file = PrivaApp.pendingDroppedFile;
    const allFiles = PrivaApp.pendingAllFiles;
    PrivaApp.closeQuickActionModal();

    PrivaApp.navigateTo(toolId);

    // Forward file to chosen tool
    setTimeout(() => {
      if (!file) return;

      if (toolId === 'split' && window.SplitTool) {
        window.SplitTool.loadFile(file);
      } else if (toolId === 'merge' && window.MergeTool) {
        window.MergeTool.addFiles(Array.from(allFiles || [file]));
      } else if (toolId === 'edit' && window.EditTool) {
        window.EditTool.loadFile(file);
      } else if (toolId === 'sign' && window.SignTool) {
        window.SignTool.loadFile(file);
      } else if (toolId === 'compress' && window.CompressTool) {
        window.CompressTool.loadFile(file);
      } else if (toolId === 'rotate' && window.RotateTool) {
        window.RotateTool.loadFile(file);
      } else if (toolId === 'watermark' && window.WatermarkTool) {
        window.WatermarkTool.loadFile(file);
      } else if (toolId === 'docx' && window.OfficeTool) {
        window.OfficeTool.loadWordFile(file);
      } else if (toolId === 'excel' && window.OfficeTool) {
        window.OfficeTool.loadExcelFile(file);
      } else if (toolId === 'convert' && window.ConvertTool) {
        if (file.type === 'application/pdf') {
          window.ConvertTool.loadPdfForImages(file);
        } else {
          window.ConvertTool.addImages(Array.from(allFiles || [file]));
        }
      } else if (toolId === 'protect' && window.ProtectTool) {
        window.ProtectTool.loadFile(file);
      } else if (toolId === 'numbering' && window.NumberingTool) {
        window.NumberingTool.loadFile(file);
      } else if (toolId === 'grayscale' && window.GrayscaleTool) {
        window.GrayscaleTool.loadFile(file);
      } else if (toolId === 'crop' && window.CropTool) {
        window.CropTool.loadFile(file);
      } else if (toolId === 'imgcompress' && window.ImageCompressTool) {
        window.ImageCompressTool.addFiles(Array.from(allFiles || [file]));
      } else if (toolId === 'unlock' && window.UnlockTool) {
        window.UnlockTool.loadFile(file);
      } else if (toolId === 'pdf2text' && window.Pdf2TextTool) {
        window.Pdf2TextTool.loadFile(file);
      } else if (toolId === 'imgconvert' && window.ImgConvertTool) {
        window.ImgConvertTool.addFiles(Array.from(allFiles || [file]));
      } else if (toolId === 'ocr' && window.OcrTool) {
        window.OcrTool.loadFile(file);
      } else if (toolId === 'aihelper' && window.AiHelperTool) {
        window.AiHelperTool.loadPdfFile(file);
      } else if (toolId === 'vault' && window.VaultTool) {
        window.VaultTool.loadFile(file);
      }
    }, 150);
  },

  forwardFileToCurrentTool: (files) => {
    const firstFile = files[0];
    if (PrivaApp.currentView === 'split' && window.SplitTool) {
      window.SplitTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'merge' && window.MergeTool) {
      window.MergeTool.addFiles(Array.from(files));
    } else if (PrivaApp.currentView === 'edit' && window.EditTool) {
      window.EditTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'sign' && window.SignTool) {
      window.SignTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'compress' && window.CompressTool) {
      window.CompressTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'rotate' && window.RotateTool) {
      window.RotateTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'watermark' && window.WatermarkTool) {
      window.WatermarkTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'docx' && window.OfficeTool) {
      window.OfficeTool.loadWordFile(firstFile);
    } else if (PrivaApp.currentView === 'excel' && window.OfficeTool) {
      window.OfficeTool.loadExcelFile(firstFile);
    } else if (PrivaApp.currentView === 'protect' && window.ProtectTool) {
      window.ProtectTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'numbering' && window.NumberingTool) {
      window.NumberingTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'grayscale' && window.GrayscaleTool) {
      window.GrayscaleTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'crop' && window.CropTool) {
      window.CropTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'imgcompress' && window.ImageCompressTool) {
      window.ImageCompressTool.addFiles(Array.from(files));
    } else if (PrivaApp.currentView === 'qrcode' && window.QRCodeTool) {
      window.QRCodeTool.scanImageFile(firstFile);
    } else if (PrivaApp.currentView === 'exif' && window.ExifTool) {
      window.ExifTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'favicon' && window.FaviconTool) {
      window.FaviconTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'wadp' && window.WhatsAppDpTool) {
      window.WhatsAppDpTool.loadImageFile(firstFile);
    } else if (PrivaApp.currentView === 'unlock' && window.UnlockTool) {
      window.UnlockTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'pdf2text' && window.Pdf2TextTool) {
      window.Pdf2TextTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'imgconvert' && window.ImgConvertTool) {
      window.ImgConvertTool.addFiles(Array.from(files));
    } else if (PrivaApp.currentView === 'ocr' && window.OcrTool) {
      window.OcrTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'aihelper' && window.AiHelperTool) {
      window.AiHelperTool.loadPdfFile(firstFile);
    } else if (PrivaApp.currentView === 'palette' && window.PaletteTool) {
      window.PaletteTool.extractFromImage(firstFile);
    } else if (PrivaApp.currentView === 'vault' && window.VaultTool) {
      window.VaultTool.loadFile(firstFile);
    } else if (PrivaApp.currentView === 'convert' && window.ConvertTool) {
      if (firstFile.type === 'application/pdf') {
        window.ConvertTool.loadPdfForImages(firstFile);
      } else {
        window.ConvertTool.addImages(Array.from(files));
      }
    }
  },

  // Update Dynamic SEO Meta Tags per View / Tool
  updateMetadata: (viewId) => {
    const meta = PrivaApp.toolMetadata[viewId] || PrivaApp.toolMetadata['home'];
    const origin = (window.location.origin && window.location.origin !== 'null')
      ? window.location.origin
      : 'https://rprpdf.onrender.com';
    const canonicalHref = (viewId === 'home')
      ? `${origin}/`
      : (meta.slug ? `${origin}/${meta.slug}/` : `${origin}/#${meta.hash || viewId}`);

    // Update document title
    document.title = meta.title;

    // Update Meta Description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', meta.description);

    // Update OpenGraph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', meta.description);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalHref);

    // Update Twitter Cards
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', meta.title);

    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', meta.description);

    // Update Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalHref);
  },

  // View Navigation with Dynamic Meta Tags & Deep Link Sync
  navigateTo: (rawViewId, updateHash = true) => {
    // Resolve alias if passed
    const viewId = PrivaApp.toolAliases[rawViewId] || rawViewId || 'home';

    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.add('hidden');
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
      targetView.classList.remove('hidden');
      PrivaApp.currentView = viewId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const homeView = document.getElementById('view-home');
      if (homeView) homeView.classList.remove('hidden');
      PrivaApp.currentView = 'home';
    }

    // Dynamically update document title, description & OpenGraph tags
    PrivaApp.updateMetadata(PrivaApp.currentView);

    // Sync URL Hash without triggering redundant hashchange loops
    if (updateHash) {
      if (PrivaApp.currentView === 'home' && window.location.pathname !== '/' && !window.location.pathname.endsWith('index.html')) {
        window.location.href = '/';
        return;
      }
      const targetHash = (PrivaApp.currentView === 'home') ? '' : `#${rawViewId || PrivaApp.currentView}`;
      if (window.location.hash !== targetHash) {
        if (targetHash === '') {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        } else {
          history.pushState(null, '', targetHash);
        }
      }
    }

    // Toggle Back button in navbar
    const backBtn = document.getElementById('nav-back-btn');
    if (backBtn) {
      if (PrivaApp.currentView === 'home') {
        backBtn.classList.add('hidden');
      } else {
        backBtn.classList.remove('hidden');
      }
    }
  },

  // Handle URL hash on initial load or popstate/hashchange
  handleHashRoute: () => {
    const pathSlug = window.location.pathname.replace(/^\/|\/$/g, '').trim().toLowerCase();
    const rawHash = window.location.hash.replace(/^#/, '').trim().toLowerCase();
    const targetRoute = rawHash || pathSlug;

    if (!targetRoute || targetRoute === 'home' || targetRoute === 'index.html' || targetRoute === 'faq-section') {
      if (rawHash !== 'faq-section' && !pathSlug) {
        PrivaApp.navigateTo('home', false);
      }
      return;
    }

    // Handle tool tabs if applicable (e.g. #convert tabs)
    if (targetRoute === 'pdf-to-images' || targetRoute === 'pdf-to-img') {
      PrivaApp.navigateTo('convert', false);
      window.ConvertTool?.showPdfToImages();
      return;
    }
    if (targetRoute === 'images-to-pdf' || targetRoute === 'img-to-pdf') {
      PrivaApp.navigateTo('convert', false);
      window.ConvertTool?.showImagesToPdf();
      return;
    }

    PrivaApp.navigateTo(targetRoute, false);
  },

  // Interactive FAQ Accordion Toggle
  toggleFaq: (index) => {
    const accordion = document.getElementById('faq-accordion');
    if (!accordion) return;
    const items = accordion.querySelectorAll('.faq-item');
    items.forEach((item, idx) => {
      const content = item.querySelector('.faq-content');
      const icon = item.querySelector('.faq-icon');
      if (idx === index) {
        const isHidden = content.classList.contains('hidden');
        if (isHidden) {
          content.classList.remove('hidden');
          icon?.classList.add('rotate-180');
          item.classList.add('border-indigo-400', 'ring-1', 'ring-indigo-100');
        } else {
          content.classList.add('hidden');
          icon?.classList.remove('rotate-180');
          item.classList.remove('border-indigo-400', 'ring-1', 'ring-indigo-100');
        }
      } else {
        content.classList.add('hidden');
        icon?.classList.remove('rotate-180');
        item.classList.remove('border-indigo-400', 'ring-1', 'ring-indigo-100');
      }
    });
  },

  // Search Tool Grid with "/" Shortcut & Clear Button
  initSearch: () => {
    const searchInput = document.getElementById('tool-search-input');
    const clearBtn = document.getElementById('tool-search-clear');
    if (!searchInput) return;

    const runFilter = (rawVal) => {
      const query = rawVal.toLowerCase().trim();
      if (clearBtn) clearBtn.classList.toggle('hidden', query.length === 0);

      const cards = document.querySelectorAll('.tool-grid-item');
      let visibleCount = 0;

      cards.forEach(card => {
        const title = card.getAttribute('data-tool-title')?.toLowerCase() || '';
        const desc = card.getAttribute('data-tool-desc')?.toLowerCase() || '';
        const tags = card.getAttribute('data-tool-tags')?.toLowerCase() || '';

        const match = title.includes(query) || desc.includes(query) || tags.includes(query);
        if (match) {
          card.classList.remove('hidden');
          visibleCount++;
        } else {
          card.classList.add('hidden');
        }
      });

      const noResults = document.getElementById('no-search-results');
      if (noResults) {
        noResults.classList.toggle('hidden', visibleCount > 0);
      }
    };

    searchInput.addEventListener('input', (e) => runFilter(e.target.value));

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        runFilter('');
        searchInput.focus();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && PrivaApp.currentView === 'home') {
        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          searchInput.focus();
        }
      }
    });
  },

  filterCategory: (cat) => {
    // Update active pill styling (mobile pills + desktop top header pills)
    const pills = document.querySelectorAll('.cat-pill');
    pills.forEach(p => {
      const isMatch = p.getAttribute('data-cat') === cat;
      p.classList.toggle('bg-slate-900', isMatch);
      p.classList.toggle('text-white', isMatch);
      p.classList.toggle('bg-white', !isMatch);
      p.classList.toggle('text-slate-700', !isMatch);
    });

    const navPills = document.querySelectorAll('.nav-cat-pill');
    navPills.forEach(p => {
      const isMatch = p.getAttribute('data-cat') === cat;
      p.classList.toggle('bg-white', isMatch);
      p.classList.toggle('text-slate-900', isMatch);
      p.classList.toggle('shadow-sm', isMatch);
    });

    const cards = document.querySelectorAll('.tool-grid-item');
    let visibleCount = 0;
    cards.forEach(card => {
      const categories = (card.getAttribute('data-tool-category') || '').split(' ');
      const match = cat === 'all' || categories.includes(cat);
      if (match) {
        card.classList.remove('hidden');
        visibleCount++;
      } else {
        card.classList.add('hidden');
      }
    });

    const noResults = document.getElementById('no-search-results');
    if (noResults) {
      noResults.classList.toggle('hidden', visibleCount > 0);
    }
  },

  // Privacy Info Modal
  openPrivacyModal: () => {
    const modal = document.getElementById('privacy-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closePrivacyModal: () => {
    const modal = document.getElementById('privacy-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  // Launch mail client without exposing developer address in HTML/DOM
  contactDeveloper: () => {
    const addr = atob('cnBycnBmMUBnbWFpbC5jb20=');
    const subject = encodeURIComponent('RprPDF Support & Inquiry');
    const a = document.createElement('a');
    a.href = `mailto:${addr}?subject=${subject}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

// Expose RprApp alias
window.RprApp = window.PrivaApp;

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.PrivaApp.init();
});
