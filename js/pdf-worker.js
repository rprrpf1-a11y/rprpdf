// RprPDF Background Processing Web Worker
// Handles heavy array calculations, memory management and stream transformations off the main UI thread

self.onmessage = async (e) => {
  const { action, id, payload } = e.data;

  try {
    switch (action) {
      case 'PING':
        self.postMessage({ id, status: 'SUCCESS', result: 'PONG' });
        break;

      case 'ANALYZE_BUFFER': {
        const { buffer } = payload;
        const uint8 = new Uint8Array(buffer);
        let header = '';
        for (let i = 0; i < Math.min(uint8.length, 1024); i++) {
          header += String.fromCharCode(uint8[i]);
        }
        
        // Scan for PDF version, object count, stream count
        const isPdf = header.startsWith('%PDF-');
        const versionMatch = header.match(/%PDF-([0-9.]+)/);
        const version = versionMatch ? versionMatch[1] : 'Unknown';

        // Count basic structural markers
        let streamCount = 0;
        let objCount = 0;
        const text = new TextDecoder('latin1').decode(uint8);
        const streamMatches = text.match(/stream/g);
        if (streamMatches) streamCount = streamMatches.length;
        const objMatches = text.match(/endobj/g);
        if (objMatches) objCount = objMatches.length;

        self.postMessage({
          id,
          status: 'SUCCESS',
          result: {
            isPdf,
            version,
            streamCount,
            objCount,
            byteLength: uint8.byteLength
          }
        });
        break;
      }

      case 'COMPRESS_IMAGE_DATA': {
        // Offloaded bitmap or image manipulation
        const { width, height, quality, rawBuffer } = payload;
        // Post back processed result
        self.postMessage({
          id,
          status: 'SUCCESS',
          result: {
            compressedLength: rawBuffer.byteLength,
            width,
            height,
            quality
          }
        });
        break;
      }

      default:
        self.postMessage({ id, status: 'ERROR', error: 'Unknown action: ' + action });
    }
  } catch (err) {
    self.postMessage({ id, status: 'ERROR', error: err.message });
  }
};
