// Live Voice Dictation & Speech-to-Text PDF Studio — Web Speech API + Audio Waveform Visualizer
window.VoiceNotesTool = {
  recognition: null,
  isListening: false,
  finalTranscript: '',
  audioCtx: null,
  analyser: null,
  mediaStream: null,
  animId: null,

  init: () => {
    const supportEl = document.getElementById('voice-support-status');
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (supportEl) {
      supportEl.innerHTML = SpeechRec
        ? '<i class="fa-solid fa-circle-check mr-1.5"></i> Live Browser Speech Engine Ready'
        : '<i class="fa-solid fa-keyboard mr-1.5"></i> Editor Ready (Live Mic Unsupported in This Browser)';
    }

    const area = document.getElementById('voice-transcript-area');
    if (area) {
      area.addEventListener('input', () => {
        VoiceNotesTool.finalTranscript = area.value;
        VoiceNotesTool.updateWordStats();
      });
    }
    VoiceNotesTool.drawIdleWaveform();
  },

  toggleRecording: async () => {
    if (VoiceNotesTool.isListening) {
      VoiceNotesTool.stop();
    } else {
      await VoiceNotesTool.start();
    }
  },

  start: async () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      return PrivaUtils.showToast('Speech Recognition API is unavailable in this browser; type directly in the editor.', 'info');
    }

    const lang = document.getElementById('voice-lang-select')?.value || 'en-IN';
    const rec = new SpeechRec();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    const area = document.getElementById('voice-transcript-area');
    VoiceNotesTool.finalTranscript = area?.value ? area.value.trimEnd() + ' ' : '';

    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          VoiceNotesTool.finalTranscript += piece + ' ';
        } else {
          interim += piece;
        }
      }
      if (area) area.value = (VoiceNotesTool.finalTranscript + interim).trimStart();
      VoiceNotesTool.updateWordStats();
    };

    rec.onerror = (e) => {
      if (e.error !== 'no-speech') {
        PrivaUtils.showToast('Microphone notice: ' + e.error, 'error');
        VoiceNotesTool.stop();
      }
    };

    rec.onend = () => {
      if (VoiceNotesTool.isListening) {
        try { rec.start(); } catch (e) { VoiceNotesTool.stop(); }
      }
    };

    try {
      rec.start();
      VoiceNotesTool.recognition = rec;
      VoiceNotesTool.isListening = true;
      VoiceNotesTool.updateRecUi(true);
      await VoiceNotesTool.startWaveform();
      PrivaUtils.showToast('Listening... speak clearly into your microphone.', 'success');
    } catch (err) {
      PrivaUtils.showToast('Could not start microphone: ' + err.message, 'error');
    }
  },

  stop: () => {
    VoiceNotesTool.isListening = false;
    if (VoiceNotesTool.recognition) {
      try { VoiceNotesTool.recognition.stop(); } catch (e) {}
      VoiceNotesTool.recognition = null;
    }
    if (VoiceNotesTool.animId) cancelAnimationFrame(VoiceNotesTool.animId);
    if (VoiceNotesTool.mediaStream) {
      VoiceNotesTool.mediaStream.getTracks().forEach(t => t.stop());
      VoiceNotesTool.mediaStream = null;
    }
    if (VoiceNotesTool.audioCtx) {
      VoiceNotesTool.audioCtx.close().catch(() => {});
      VoiceNotesTool.audioCtx = null;
    }
    VoiceNotesTool.updateRecUi(false);
    VoiceNotesTool.drawIdleWaveform();
  },

  updateRecUi: (recording) => {
    const btn = document.getElementById('voice-rec-btn');
    if (!btn) return;
    if (recording) {
      btn.className = 'px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/25 flex items-center animate-pulse';
      btn.innerHTML = '<i class="fa-solid fa-stop mr-2"></i> Stop Dictation';
    } else {
      btn.className = 'px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center';
      btn.innerHTML = '<i class="fa-solid fa-microphone mr-2"></i> Start Voice Dictation';
    }
  },

  startWaveform: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      VoiceNotesTool.mediaStream = stream;
      const AudioContextCls = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextCls();
      VoiceNotesTool.audioCtx = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      VoiceNotesTool.analyser = analyser;

      const canvas = document.getElementById('voice-wave-canvas');
      if (!canvas) return;
      const cctx = canvas.getContext('2d');
      const bufferLen = analyser.frequencyBinCount;
      const dataArr = new Uint8Array(bufferLen);

      const render = () => {
        if (!VoiceNotesTool.isListening) return;
        VoiceNotesTool.animId = requestAnimationFrame(render);
        analyser.getByteFrequencyData(dataArr);
        cctx.fillStyle = '#0f172a';
        cctx.fillRect(0, 0, canvas.width, canvas.height);

        const barW = (canvas.width / bufferLen) * 1.4;
        let x = 4;
        for (let i = 0; i < bufferLen; i++) {
          const barH = Math.max(4, (dataArr[i] / 255) * (canvas.height - 10));
          cctx.fillStyle = '#6366f1';
          cctx.fillRect(x, (canvas.height - barH) / 2, Math.max(3, barW - 3), barH);
          x += barW;
        }
      };
      render();
    } catch (e) { /* Skip visualizer cleanly if audio permission blocked */ }
  },

  drawIdleWaveform: () => {
    const canvas = document.getElementById('voice-wave-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  },

  insertSnippet: (text) => {
    const area = document.getElementById('voice-transcript-area');
    if (!area) return;
    area.value = (area.value + text);
    VoiceNotesTool.finalTranscript = area.value;
    VoiceNotesTool.updateWordStats();
  },

  updateWordStats: () => {
    const val = document.getElementById('voice-transcript-area')?.value || '';
    const words = val.trim() ? val.trim().split(/\s+/).length : 0;
    const el = document.getElementById('voice-word-count');
    if (el) el.textContent = `${words} words • ${val.length} chars`;
  },

  copyTranscript: () => {
    const val = document.getElementById('voice-transcript-area')?.value || '';
    if (!val.trim()) return;
    navigator.clipboard.writeText(val);
    PrivaUtils.showToast('Transcript copied!', 'success');
  },

  exportPdf: async () => {
    const val = document.getElementById('voice-transcript-area')?.value || '';
    if (!val.trim()) return PrivaUtils.showToast('Transcript is empty.', 'error');
    try {
      if (!window.jspdf) {
        await PrivaUtils.loadScript('js/vendor/jspdf.umd.min.js').catch(() =>
          PrivaUtils.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        );
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Voice Transcript Notes', 45, 55);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const wrapped = doc.splitTextToSize(val, 505);
      doc.text(wrapped, 45, 85);
      doc.save('voice_notes.pdf');
      PrivaUtils.triggerConfetti();
      PrivaUtils.showToast('Voice Notes exported as PDF!', 'success');
    } catch (err) {
      PrivaUtils.showToast('Export failed: ' + err.message, 'error');
    }
  }
};
