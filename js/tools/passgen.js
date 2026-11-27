// Strong Password, Passphrase & Security Analyzer — Web Crypto API (crypto.getRandomValues)
window.PassGenTool = {
  mode: 'password', // 'password' | 'passphrase' | 'pin'

  wordList: [
    'amber', 'anchor', 'apple', 'arctic', 'arrow', 'atlas', 'aurora', 'badge', 'bamboo', 'beacon',
    'breeze', 'bridge', 'bronze', 'canyon', 'canvas', 'carbon', 'castle', 'cedar', 'chrono', 'cipher',
    'citadel', 'clover', 'cobalt', 'comet', 'compass', 'coral', 'cosmos', 'crystal', 'cypress', 'dawn',
    'delta', 'desert', 'diamond', 'dolphin', 'dragon', 'echo', 'emerald', 'ember', 'enigma', 'falcon',
    'feather', 'fjord', 'flame', 'forest', 'fortress', 'fossil', 'galaxy', 'garden', 'garnet', 'glacier',
    'granite', 'harbor', 'harvest', 'haven', 'horizon', 'hunter', 'indigo', 'island', 'ivory', 'jade',
    'jaguar', 'jasper', 'journey', 'juniper', 'karma', 'kestrel', 'kingdom', 'lagoon', 'lantern', 'laser',
    'laurel', 'legacy', 'legend', 'liberty', 'lotus', 'lunar', 'magnet', 'maple', 'marble', 'meadow',
    'meteor', 'mirage', 'monarch', 'monsoon', 'mosaic', 'mountain', 'nebula', 'nectar', 'nimbus', 'nomad',
    'nova', 'oasis', 'obsidian', 'ocean', 'omega', 'onyx', 'opal', 'oracle', 'orbit', 'orchid',
    'osprey', 'oxygen', 'panther', 'paradox', 'pebble', 'pegasus', 'phoenix', 'pioneer', 'pixel', 'planet',
    'prism', 'pulse', 'python', 'quantum', 'quartz', 'quiver', 'radiant', 'raptor', 'raven', 'redwood',
    'relic', 'rhythm', 'ripple', 'river', 'rocket', 'ruby', 'saffron', 'sapphire', 'saturn', 'scarlet',
    'shadow', 'shield', 'sierra', 'signal', 'silver', 'solar', 'solstice', 'sonic', 'spark', 'spectrum',
    'sphinx', 'spiral', 'spruce', 'starlight', 'storm', 'summit', 'sunrise', 'thunder', 'tiger', 'timber',
    'titan', 'topaz', 'torrent', 'trident', 'tundra', 'turtle', 'umbra', 'unicorn', 'valley', 'vanguard',
    'vector', 'velvet', 'vertex', 'vibrant', 'viking', 'violet', 'vista', 'vortex', 'voyage', 'willow',
    'winter', 'wizard', 'zenith', 'zephyr', 'zodiac'
  ],

  init: () => {
    const lenSlider = document.getElementById('pass-length-slider');
    const wordsSlider = document.getElementById('pass-words-slider');
    const pinSlider = document.getElementById('pass-pin-slider');
    const outputEl = document.getElementById('pass-main-output');

    if (lenSlider) {
      lenSlider.addEventListener('input', () => {
        document.getElementById('pass-length-val').textContent = lenSlider.value;
        PassGenTool.generate();
      });
    }
    if (wordsSlider) {
      wordsSlider.addEventListener('input', () => {
        document.getElementById('pass-words-val').textContent = `${wordsSlider.value} words`;
        PassGenTool.generate();
      });
    }
    if (pinSlider) {
      pinSlider.addEventListener('input', () => {
        document.getElementById('pass-pin-val').textContent = `${pinSlider.value} digits`;
        PassGenTool.generate();
      });
    }

    document.querySelectorAll('.pass-opt-trigger').forEach(el => {
      el.addEventListener('change', PassGenTool.generate);
    });

    if (outputEl) {
      outputEl.addEventListener('input', () => {
        PassGenTool.analyzeStrength(outputEl.value);
      });
    }

    PassGenTool.generate();
  },

  setMode: (mode) => {
    PassGenTool.mode = mode;
    ['password', 'passphrase', 'pin'].forEach(m => {
      const btn = document.getElementById(`pass-tab-${m}`);
      const panel = document.getElementById(`pass-panel-${m}`);
      const active = m === mode;
      if (btn) {
        btn.classList.toggle('bg-indigo-600', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('text-slate-600', !active);
      }
      if (panel) panel.classList.toggle('hidden', !active);
    });
    PassGenTool.generate();
  },

  secureRandomInt: (max) => {
    if (max <= 0) return 0;
    const array = new Uint32Array(1);
    const limit = Math.floor(0xffffffff / max) * max;
    let rand;
    do {
      window.crypto.getRandomValues(array);
      rand = array[0];
    } while (rand >= limit);
    return rand % max;
  },

  generateOne: () => {
    if (PassGenTool.mode === 'passphrase') {
      const count = parseInt(document.getElementById('pass-words-slider')?.value || '4', 10);
      const sep = document.getElementById('pass-separator')?.value ?? '-';
      const cap = document.getElementById('pass-capitalize')?.checked ?? true;
      const addNum = document.getElementById('pass-add-num')?.checked ?? true;

      const words = [];
      for (let i = 0; i < count; i++) {
        let w = PassGenTool.wordList[PassGenTool.secureRandomInt(PassGenTool.wordList.length)];
        if (cap) w = w.charAt(0).toUpperCase() + w.slice(1);
        words.push(w);
      }
      if (addNum) {
        const idx = PassGenTool.secureRandomInt(words.length);
        words[idx] += String(PassGenTool.secureRandomInt(90) + 10);
      }
      return words.join(sep);
    }

    if (PassGenTool.mode === 'pin') {
      const len = parseInt(document.getElementById('pass-pin-slider')?.value || '6', 10);
      let pin = '';
      for (let i = 0; i < len; i++) {
        pin += String(PassGenTool.secureRandomInt(10));
      }
      return pin;
    }

    // Random strong password mode
    const len = parseInt(document.getElementById('pass-length-slider')?.value || '16', 10);
    const useUpper = document.getElementById('pass-opt-upper')?.checked ?? true;
    const useLower = document.getElementById('pass-opt-lower')?.checked ?? true;
    const useNums = document.getElementById('pass-opt-nums')?.checked ?? true;
    const useSyms = document.getElementById('pass-opt-syms')?.checked ?? true;
    const noAmbig = document.getElementById('pass-opt-noambig')?.checked ?? false;

    const clean = (s) => noAmbig ? s.replace(/[0O1lI]/g, '') : s;
    const pools = [];
    if (useUpper) pools.push(clean('ABCDEFGHIJKLMNOPQRSTUVWXYZ'));
    if (useLower) pools.push(clean('abcdefghijklmnopqrstuvwxyz'));
    if (useNums) pools.push(clean('0123456789'));
    if (useSyms) pools.push('!@#$%^&*()-_=+[]{}?');

    if (pools.length === 0) pools.push('abcdefghijklmnopqrstuvwxyz');

    const fullPool = pools.join('');
    const chars = [];
    // Guarantee at least 1 char from each selected pool
    for (const p of pools) {
      if (chars.length < len) {
        chars.push(p[PassGenTool.secureRandomInt(p.length)]);
      }
    }
    while (chars.length < len) {
      chars.push(fullPool[PassGenTool.secureRandomInt(fullPool.length)]);
    }
    // Fisher-Yates secure shuffle
    for (let i = chars.length - 1; i > 0; i--) {
      const j = PassGenTool.secureRandomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  },

  generate: () => {
    const pwd = PassGenTool.generateOne();
    const out = document.getElementById('pass-main-output');
    if (out) out.value = pwd;
    PassGenTool.analyzeStrength(pwd);
    PassGenTool.generateBatch();
  },

  generateBatch: () => {
    const listEl = document.getElementById('pass-batch-list');
    if (!listEl) return;

    const batch = Array.from({ length: 5 }, () => PassGenTool.generateOne());
    listEl.innerHTML = batch.map(p => `
      <div class="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/80 font-mono text-xs text-slate-800">
        <span class="truncate select-all">${p.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>
        <button type="button" onclick="navigator.clipboard.writeText(${JSON.stringify(p)}); PrivaUtils.showToast('Password copied!', 'success');"
          class="text-indigo-600 hover:text-indigo-800 font-sans font-semibold text-[11px] shrink-0 px-2 py-1 rounded bg-white border border-slate-200">
          <i class="fa-regular fa-copy mr-1"></i>Copy
        </button>
      </div>
    `).join('');
  },

  analyzeStrength: (pwd) => {
    const bar = document.getElementById('pass-entropy-bar');
    const label = document.getElementById('pass-entropy-label');
    const crackEl = document.getElementById('pass-crack-time');
    if (!bar || !label || !crackEl) return;

    if (!pwd) {
      bar.style.width = '0%';
      label.textContent = '0 bits';
      crackEl.textContent = 'Crack time: Instant';
      return;
    }

    let pool = 0;
    if (/[a-z]/.test(pwd)) pool += 26;
    if (/[A-Z]/.test(pwd)) pool += 26;
    if (/[0-9]/.test(pwd)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(pwd)) pool += 32;

    const entropy = Math.round(pwd.length * Math.log2(Math.max(pool, 10)));
    const pct = Math.min(100, Math.round((entropy / 110) * 100));

    bar.style.width = `${pct}%`;
    bar.className = 'h-full rounded-full transition-all duration-300 ' + (
      entropy < 40 ? 'bg-rose-500' :
      entropy < 65 ? 'bg-amber-500' :
      entropy < 90 ? 'bg-emerald-500' : 'bg-indigo-600'
    );

    const tier = entropy < 40 ? 'Weak' : entropy < 65 ? 'Moderate' : entropy < 90 ? 'Strong' : 'Unbreakable';
    label.textContent = `${tier} (${entropy} bits)`;

    // Offline GPU crack speed estimate: 10^10 guesses/sec
    const seconds = Math.pow(2, entropy) / 1e10;
    let timeText = 'Instant';
    if (seconds >= 3.15e10) timeText = 'Centuries+';
    else if (seconds >= 3.15e7) timeText = `${Math.round(seconds / 3.15e7).toLocaleString()} years`;
    else if (seconds >= 86400) timeText = `${Math.round(seconds / 86400)} days`;
    else if (seconds >= 3600) timeText = `${Math.round(seconds / 3600)} hours`;
    else if (seconds >= 1) timeText = `${Math.round(seconds)} seconds`;

    crackEl.textContent = `Est. crack time: ${timeText}`;
  },

  copyMain: () => {
    const val = document.getElementById('pass-main-output')?.value || '';
    if (!val) return;
    navigator.clipboard.writeText(val);
    PrivaUtils.showToast('Copied securely to clipboard!', 'success');
  }
};
