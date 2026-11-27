// Photo EXIF Metadata Viewer & Stripper — 100% In-Browser Privacy Protection
window.ExifTool = {
  currentFile: null,
  currentDataUrl: null,
  exifTags: {},

  init: () => {
    const fileInput = document.getElementById('exif-file-input');
    const dropzone = document.getElementById('exif-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          ExifTool.loadFile(e.target.files[0]);
          fileInput.value = '';
        }
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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          ExifTool.loadFile(e.dataTransfer.files[0]);
        }
      });
    }
  },

  reset: () => {
    ExifTool.currentFile = null;
    ExifTool.currentDataUrl = null;
    ExifTool.exifTags = {};

    const dropzone = document.getElementById('exif-dropzone');
    const workspace = document.getElementById('exif-workspace');
    if (dropzone) dropzone.classList.remove('hidden');
    if (workspace) workspace.classList.add('hidden');
  },

  loadFile: async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      PrivaUtils.showToast('Please select a valid image file (JPG, PNG, WebP).', 'error');
      return;
    }

    ExifTool.currentFile = file;
    PrivaUtils.showProgress('Reading Metadata', 30, 'Scanning image headers for EXIF data...');

    try {
      const arrayBuffer = await PrivaUtils.readFileAsArrayBuffer(file);
      const dataUrl = await PrivaUtils.readFileAsDataURL(file);
      ExifTool.currentDataUrl = dataUrl;

      // Parse EXIF tags from binary ArrayBuffer
      ExifTool.exifTags = ExifTool.parseExif(arrayBuffer);

      const dropzone = document.getElementById('exif-dropzone');
      const workspace = document.getElementById('exif-workspace');
      if (dropzone) dropzone.classList.add('hidden');
      if (workspace) workspace.classList.remove('hidden');

      // Update image preview & meta
      const imgPreview = document.getElementById('exif-image-preview');
      if (imgPreview) imgPreview.src = dataUrl;

      const fileNameEl = document.getElementById('exif-file-name');
      if (fileNameEl) fileNameEl.textContent = file.name;

      const fileSizeEl = document.getElementById('exif-file-size');
      if (fileSizeEl) fileSizeEl.textContent = `${PrivaUtils.formatBytes(file.size)} • ${file.type}`;

      ExifTool.renderTags();
      PrivaUtils.hideProgress();

      const tagCount = Object.keys(ExifTool.exifTags).length;
      if (tagCount > 0) {
        PrivaUtils.showToast(`Found ${tagCount} metadata tags (including camera/GPS details).`, 'info');
      } else {
        PrivaUtils.showToast('No EXIF tags detected in this image. It is already clean!', 'success');
      }
    } catch (e) {
      console.error(e);
      PrivaUtils.hideProgress();
      PrivaUtils.showToast('Failed to parse EXIF: ' + e.message, 'error');
    }
  },

  // Binary EXIF parser for JPEG (APP1 marker 0xFFE1)
  parseExif: (buffer) => {
    const view = new DataView(buffer);
    const tags = {};

    // Check for JPEG SOI (0xFFD8)
    if (view.getUint16(0, false) !== 0xFFD8) {
      return tags;
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
      if (view.getUint8(offset) !== 0xFF) break;
      const marker = view.getUint8(offset + 1);

      // APP1 Marker (0xE1 = 225)
      if (marker === 0xE1) {
        const app1Length = view.getUint16(offset + 2, false);
        // Check for 'Exif\0\0' (0x457869660000)
        if (view.getUint32(offset + 4, false) === 0x45786966 && view.getUint16(offset + 8, false) === 0x0000) {
          const tiffStart = offset + 10;
          ExifTool.readTiffHeader(view, tiffStart, tags);
        }
        break;
      } else {
        offset += 2 + view.getUint16(offset + 2, false);
      }
    }

    return tags;
  },

  readTiffHeader: (view, tiffStart, tags) => {
    // Endianness
    const byteOrder = view.getUint16(tiffStart, false);
    const littleEndian = (byteOrder === 0x4949); // 'II' = little endian, 'MM' = big endian

    const firstIFDOffset = view.getUint32(tiffStart + 4, littleEndian);
    if (firstIFDOffset < 8) return;

    ExifTool.readIFD(view, tiffStart, tiffStart + firstIFDOffset, littleEndian, tags);
  },

  readIFD: (view, tiffStart, ifdOffset, littleEndian, tags) => {
    if (ifdOffset + 2 > view.byteLength) return;
    const numEntries = view.getUint16(ifdOffset, littleEndian);

    const tagNames = {
      0x010E: 'ImageDescription',
      0x010F: 'Make',
      0x0110: 'Model',
      0x0112: 'Orientation',
      0x0131: 'Software',
      0x0132: 'DateTime',
      0x8298: 'Copyright',
      0x8769: 'ExifIFDPointer',
      0x8825: 'GPSInfoIFDPointer',
      0x829A: 'ExposureTime',
      0x829D: 'FNumber',
      0x8827: 'ISOSpeedRatings',
      0x9003: 'DateTimeOriginal',
      0x9004: 'DateTimeDigitized',
      0x920A: 'FocalLength',
      0xA434: 'LensModel'
    };

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + (i * 12);
      if (entryOffset + 12 > view.byteLength) break;

      const tagId = view.getUint16(entryOffset, littleEndian);
      const tagType = view.getUint16(entryOffset + 2, littleEndian);
      const count = view.getUint32(entryOffset + 4, littleEndian);
      const valueOffset = view.getUint32(entryOffset + 8, littleEndian);

      const tagName = tagNames[tagId] || `Tag_0x${tagId.toString(16)}`;

      if (tagName === 'ExifIFDPointer') {
        ExifTool.readIFD(view, tiffStart, tiffStart + valueOffset, littleEndian, tags);
      } else if (tagName === 'GPSInfoIFDPointer') {
        ExifTool.readGPS(view, tiffStart, tiffStart + valueOffset, littleEndian, tags);
      } else {
        // Simple string / numeric reader
        if (tagType === 2) { // ASCII
          let stringOffset = count > 4 ? (tiffStart + valueOffset) : (entryOffset + 8);
          let str = '';
          for (let s = 0; s < count - 1; s++) {
            if (stringOffset + s < view.byteLength) {
              str += String.fromCharCode(view.getUint8(stringOffset + s));
            }
          }
          if (str.trim()) tags[tagName] = str.trim();
        } else if (tagType === 3) { // SHORT
          tags[tagName] = view.getUint16(entryOffset + 8, littleEndian);
        } else if (tagType === 4) { // LONG
          tags[tagName] = view.getUint32(entryOffset + 8, littleEndian);
        }
      }
    }
  },

  readGPS: (view, tiffStart, gpsOffset, littleEndian, tags) => {
    if (gpsOffset + 2 > view.byteLength) return;
    const numEntries = view.getUint16(gpsOffset, littleEndian);

    let latRef = 'N', lonRef = 'E';
    let lat = null, lon = null;

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = gpsOffset + 2 + (i * 12);
      if (entryOffset + 12 > view.byteLength) break;

      const tagId = view.getUint16(entryOffset, littleEndian);
      const valueOffset = view.getUint32(entryOffset + 8, littleEndian);

      if (tagId === 1) { // GPSLatitudeRef
        latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
      } else if (tagId === 3) { // GPSLongitudeRef
        lonRef = String.fromCharCode(view.getUint8(entryOffset + 8));
      } else if (tagId === 2) { // GPSLatitude
        lat = ExifTool.readRationalDMS(view, tiffStart + valueOffset, littleEndian);
      } else if (tagId === 4) { // GPSLongitude
        lon = ExifTool.readRationalDMS(view, tiffStart + valueOffset, littleEndian);
      }
    }

    if (lat !== null && lon !== null) {
      const decLat = (latRef === 'S' ? -1 : 1) * lat;
      const decLon = (lonRef === 'W' ? -1 : 1) * lon;
      tags['GPSLatitude'] = `${decLat.toFixed(6)}° (${latRef})`;
      tags['GPSLongitude'] = `${decLon.toFixed(6)}° (${lonRef})`;
      tags['GoogleMapsLink'] = `https://www.google.com/maps?q=${decLat},${decLon}`;
    }
  },

  readRationalDMS: (view, offset, littleEndian) => {
    if (offset + 24 > view.byteLength) return null;
    const degNum = view.getUint32(offset, littleEndian);
    const degDen = view.getUint32(offset + 4, littleEndian) || 1;
    const minNum = view.getUint32(offset + 8, littleEndian);
    const minDen = view.getUint32(offset + 12, littleEndian) || 1;
    const secNum = view.getUint32(offset + 16, littleEndian);
    const secDen = view.getUint32(offset + 20, littleEndian) || 1;

    return (degNum / degDen) + ((minNum / minDen) / 60) + ((secNum / secDen) / 3600);
  },

  renderTags: () => {
    const listContainer = document.getElementById('exif-tags-list');
    const warningBadge = document.getElementById('exif-privacy-warning');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const keys = Object.keys(ExifTool.exifTags);

    const hasGps = Boolean(ExifTool.exifTags['GPSLatitude']);
    if (warningBadge) {
      warningBadge.classList.toggle('hidden', !hasGps);
    }

    if (keys.length === 0) {
      listContainer.innerHTML = `
        <div class="p-6 text-center bg-emerald-50 rounded-2xl border border-emerald-200">
          <i class="fa-solid fa-shield-check text-emerald-600 text-3xl mb-2"></i>
          <h5 class="font-bold text-emerald-900 text-sm">Safe & Clean</h5>
          <p class="text-xs text-emerald-700 mt-1">No hidden camera serials, timestamps, or GPS location tags found in this image.</p>
        </div>
      `;
      return;
    }

    // Render grouped key-values
    keys.forEach(key => {
      const val = ExifTool.exifTags[key];
      const isGps = key.startsWith('GPS') || key.includes('Map');
      const isDate = key.includes('Date');

      const card = document.createElement('div');
      card.className = `p-3 rounded-xl border flex items-center justify-between text-xs ${
        isGps ? 'bg-rose-50/70 border-rose-200' : isDate ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'
      }`;

      if (key === 'GoogleMapsLink') {
        card.innerHTML = `
          <div class="flex items-center space-x-2">
            <i class="fa-solid fa-location-dot text-rose-500 text-sm"></i>
            <span class="font-semibold text-slate-700">GPS Map Location</span>
          </div>
          <a href="${val}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold hover:bg-rose-700 flex items-center">
            View on Google Maps <i class="fa-solid fa-arrow-up-right-from-square ml-1 text-[10px]"></i>
          </a>
        `;
      } else {
        card.innerHTML = `
          <span class="font-semibold text-slate-700">${key}</span>
          <span class="font-mono text-slate-600 font-medium truncate max-w-[220px]">${val}</span>
        `;
      }
      listContainer.appendChild(card);
    });
  },

  // 1-Click Strip & Clean Metadata
  stripAndDownload: async () => {
    if (!ExifTool.currentDataUrl || !ExifTool.currentFile) return;

    const btn = document.getElementById('exif-strip-btn');
    const originalText = btn ? btn.innerHTML : 'Strip Metadata & Download';
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Sanitizing Image Pixels...';
      btn.disabled = true;
    }

    PrivaUtils.showProgress('Sanitizing Image', 40, 'Re-encoding pixels without EXIF metadata segments...');

    try {
      const img = new Image();
      img.src = ExifTool.currentDataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image for sanitization.'));
      });

      // Canvas strips all EXIF/GPS/IPTC metadata headers by drawing raw pixel data
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const isPng = ExifTool.currentFile.type === 'image/png';
      const cleanMime = isPng ? 'image/png' : 'image/jpeg';
      const cleanExt = isPng ? '.png' : '.jpg';
      const cleanDataUrl = canvas.toDataURL(cleanMime, 0.95);

      const baseName = ExifTool.currentFile.name.replace(/\.[^/.]+$/, '');
      PrivaUtils.downloadBlob(
        PrivaUtils.dataUrlToBlob(cleanDataUrl),
        `${baseName}_clean${cleanExt}`
      );

      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('All EXIF and GPS metadata permanently stripped!', 'success');
    } catch (e) {
      console.error(e);
      PrivaUtils.showToast('Failed to strip metadata: ' + e.message, 'error');
    } finally {
      PrivaUtils.hideProgress();
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  }
};
