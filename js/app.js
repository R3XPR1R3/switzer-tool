/* ============================================================
   SWITZERTOOL — Industrial File Converter
   Browser-only. Zero libraries. WebAssembly pixel processing.
   ============================================================ */

(function () {
  'use strict';

  const state = {
    mode: 'image-format',
    files: [],
    wasmModule: null,
    wasmMemory: null,
    processing: false,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    header: $('#header'),
    pullTab: $('#pullTab'),
    navBtns: () => $$('.nav-btn'),
    settingsContent: $('#settingsContent'),
    dropZone: $('#dropZone'),
    fileInput: $('#fileInput'),
    conveyor: $('#conveyorBelt'),
    beltItems: $('#beltItems'),
    beltSegments: $('#beltSegments'),
    processor: $('#processingChamber'),
    gaugeNeedle: $('#gaugeNeedle'),
    statusDisplay: $('#chamberStatus'),
    exhaust: $('#steamVent'),
    outputFiles: $('#outputFiles'),
    outputSlot: $('#outputSlot'),
    convertBtn: $('#convertBtn'),
    previewPanel: $('#previewPanel'),
    previewContent: $('#previewContent'),
    previewCanvas: $('#previewCanvas'),
    terminalOutput: $('#terminalOutput'),
    termBtns: () => $$('.term-btn'),
  };

  // ============================================================
  // HEADER — Spring bounce animation (from DEV branch logic)
  // ============================================================
  const headerAnim = {
    interval: null,
    currentTop: -220,
    targetShown: 0,
    targetHidden: -220,
    bounceSteps: [15, -10, 6, -4, 3, -2, 1, 0],
    isShown: false,

    animateTo(target) {
      clearInterval(this.interval);
      let step = 0;
      this.interval = setInterval(() => {
        const jerk = this.bounceSteps[step] || 0;
        const diff = (target - this.currentTop) * 0.3 + jerk;
        this.currentTop += diff;
        dom.header.style.top = this.currentTop + 'px';

        if (Math.abs(target - this.currentTop) < 1 || step >= this.bounceSteps.length) {
          clearInterval(this.interval);
          this.currentTop = target;
          dom.header.style.top = target + 'px';
        }
        step++;
      }, 30);
    },

    show() {
      if (this.isShown) return;
      this.isShown = true;
      this.animateTo(this.targetShown);
    },

    hide() {
      if (!this.isShown) return;
      this.isShown = false;
      this.animateTo(this.targetHidden);
    },

    toggle() {
      this.isShown ? this.hide() : this.show();
    },
  };

  // ============================================================
  // TERMINAL — Typewriter effect
  // ============================================================
  const terminal = {
    abortController: null,
    speed: 15,

    texts: {
      about: `> SwitzerTool v1.0\n\nНастоящий швейцарский нож для файлов.\nВсё работает прямо в твоём браузере.\nНикакие файлы не покидают твой компьютер.\n\nWebAssembly для обработки пикселей.\nCanvas API для конвертации форматов.\nЧистый JavaScript для текстовых данных.\n\nСделано для работяг. Бесплатно. Навсегда.`,

      help: `> Доступные команды:\n\n/about    — О проекте\n/help     — Эта справка\n/wasm     — О WebAssembly модуле\n/security — Безопасность\n\n> Конвертер поддерживает:\n  ИЗОБРАЖЕНИЯ: PNG, JPEG, WebP, BMP\n  ФИЛЬТРЫ (WASM): Ч/Б, Сепия, Инверсия,\n    Яркость, Контраст\n  ТЕКСТ: CSV<>JSON, Markdown>HTML\n  КОДИРОВКА: Base64, URL, HEX`,

      wasm: `> WebAssembly Pixel Processor\n\nМодуль написан на WAT (WebAssembly Text)\nи скомпилирован в .wasm (871 байт).\n\nЭкспортируемые функции:\n  grayscale(len)          — Ч/Б фильтр\n  invert(len)             — Инверсия цветов\n  sepia(len)              — Сепия тон\n  brightness(len, offset) — Яркость\n  contrast(len, factor)   — Контраст\n\nДанные пикселей копируются в линейную\nпамять WASM, обрабатываются, и копируются\nобратно. Без промежуточных буферов.`,

      security: `> Безопасность\n\nФайлы НИКОГДА не покидают твой браузер.\nНет серверов. Нет загрузок. Нет трекинга.\nНет cookies. Нет аналитики.\n\nВесь код открыт и читаем.\nWASM модуль — 871 байт чистой логики.\n\nТвои файлы = твоё дело.`,

      why: `> Зачем?\n\nSwitzerTool создан для пользователей всех уровней.\nЭто не очередной конвертер, выкачивающий деньги.\n\nSWITZERTOOL — больше чем конвертер.\nОн объединяет утилиты и редакторы.\nНастоящий швейцарский нож для веб-пользователей.`,

      story: `> История\n\nИдея SwitzerTool родилась просто:\nсоздать инструмент, облегчающий жизнь\nи обычным, и продвинутым пользователям.\n\nВдохновлённые швейцарским ножом, мы решили\nобъединить множество утилит и редакторов\nна одной платформе.\n\nПосле месяцев разработки и тестов\nмы представляем SwitzerTool.`,

      funcs: `> Функции SwitzerTool\n\n1: Конвертация файлов (PNG, JPEG, WebP, BMP)\n2: WASM-фильтры (Ч/Б, Сепия, Инверсия)\n3: Текстовые конвертеры (CSV, JSON, Markdown)\n4: Кодировка (Base64, URL, HEX)\n5: ...и многое другое скоро!`,
    },

    async type(text) {
      if (this.abortController) this.abortController.abort();
      this.abortController = new AbortController();
      const signal = this.abortController.signal;

      dom.terminalOutput.innerHTML = '';
      let speed = this.speed;

      for (let i = 0; i < text.length; i++) {
        if (signal.aborted) return;
        const ch = text[i];
        const span = document.createElement('span');
        span.textContent = ch;
        dom.terminalOutput.appendChild(span);

        // Auto-scroll
        dom.terminalOutput.scrollTop = dom.terminalOutput.scrollHeight;

        if (ch === '\n') {
          await sleep(speed * 2);
        } else {
          await sleep(speed);
        }
      }

      // Add cursor
      const cursor = document.createElement('span');
      cursor.className = 'terminal-cursor';
      cursor.textContent = '_';
      dom.terminalOutput.appendChild(cursor);
    },
  };

  // ============================================================
  // WASM LOADER
  // ============================================================
  async function loadWasm() {
    try {
      const resp = await fetch('wasm/pixels.wasm');
      const bytes = await resp.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes);
      state.wasmModule = instance.exports;
      state.wasmMemory = instance.exports.memory;
      console.log('[WASM] Pixel processor loaded');
    } catch (e) {
      console.warn('[WASM] Failed to load:', e);
    }
  }

  // ============================================================
  // BELT SLATS
  // ============================================================
  function initBelt() {
    const segments = dom.beltSegments;
    for (let i = 0; i < 35; i++) {
      const slat = document.createElement('div');
      slat.className = 'belt-slat';
      segments.appendChild(slat);
    }
  }

  // ============================================================
  // MODE SWITCHING
  // ============================================================
  const modeSettings = {
    'image-format': {
      controls: `
        <div class="dial-item">
          <label class="dial-label">Исходный</label>
          <select class="mech-select" id="srcFormat">
            <option value="auto">Авто</option>
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
            <option value="image/bmp">BMP</option>
          </select>
        </div>
        <div class="dial-item" style="font-size:1.4rem;color:var(--green-neon);align-self:center;padding:0 6px">&#x2192;</div>
        <div class="dial-item">
          <label class="dial-label">Выход</label>
          <select class="mech-select" id="dstFormat">
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
            <option value="image/bmp">BMP</option>
          </select>
        </div>
        <div class="dial-item" id="qualityGroup">
          <label class="dial-label">Качество</label>
          <input type="range" class="mech-range" id="quality" min="10" max="100" value="90" step="5">
          <span class="range-value" id="qualityVal">90%</span>
        </div>`,
    },
    'image-filter': {
      controls: `
        <div class="dial-item">
          <label class="dial-label">Фильтр</label>
          <select class="mech-select" id="filterType">
            <option value="grayscale">Ч/Б (Grayscale)</option>
            <option value="sepia">Сепия</option>
            <option value="invert">Инверсия</option>
            <option value="brightness">Яркость</option>
            <option value="contrast">Контраст</option>
          </select>
        </div>
        <div class="dial-item" id="filterValueGroup" style="display:none">
          <label class="dial-label" id="filterValueLabel">Значение</label>
          <input type="range" class="mech-range" id="filterValue" min="0" max="255" value="160">
          <span class="range-value" id="filterValueDisplay">160</span>
        </div>
        <div class="dial-item">
          <label class="dial-label">Выход</label>
          <select class="mech-select" id="filterOutput">
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
          </select>
        </div>`,
    },
    'text': {
      controls: `
        <div class="dial-item">
          <label class="dial-label">Конвертация</label>
          <select class="mech-select" id="textConversion">
            <option value="csv-json">CSV &#x2192; JSON</option>
            <option value="json-csv">JSON &#x2192; CSV</option>
            <option value="md-html">Markdown &#x2192; HTML</option>
            <option value="html-md">HTML &#x2192; Text</option>
          </select>
        </div>`,
    },
    'encoding': {
      controls: `
        <div class="dial-item">
          <label class="dial-label">Операция</label>
          <select class="mech-select" id="encodingOp">
            <option value="base64-encode">Base64 encode</option>
            <option value="base64-decode">Base64 decode</option>
            <option value="url-encode">URL encode</option>
            <option value="url-decode">URL decode</option>
            <option value="hex-encode">HEX encode</option>
            <option value="hex-decode">HEX decode</option>
          </select>
        </div>`,
    },
  };

  function switchMode(mode) {
    state.mode = mode;
    state.files = [];
    clearOutput();
    clearQueue();

    dom.navBtns().forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    dom.settingsContent.innerHTML = modeSettings[mode].controls;
    dom.fileInput.accept = (mode === 'image-format' || mode === 'image-filter') ? 'image/*' : '';

    bindSettingsEvents();
    updateConvertButton();
  }

  function bindSettingsEvents() {
    const quality = $('#quality');
    if (quality) {
      quality.addEventListener('input', () => { $('#qualityVal').textContent = quality.value + '%'; });
    }
    const filterType = $('#filterType');
    if (filterType) {
      filterType.addEventListener('change', updateFilterControls);
      updateFilterControls();
    }
    const filterValue = $('#filterValue');
    if (filterValue) {
      filterValue.addEventListener('input', () => { $('#filterValueDisplay').textContent = filterValue.value; });
    }
  }

  function updateFilterControls() {
    const type = $('#filterType')?.value;
    const group = $('#filterValueGroup');
    const label = $('#filterValueLabel');
    if (!group) return;
    if (type === 'brightness' || type === 'contrast') {
      group.style.display = '';
      label.textContent = type === 'brightness' ? 'Яркость' : 'Контраст';
    } else {
      group.style.display = 'none';
    }
  }

  // ============================================================
  // FILE HANDLING
  // ============================================================
  function handleFiles(fileList) {
    for (const file of fileList) state.files.push(file);
    renderFileQueue();
    updateConvertButton();
  }

  function removeFile(index) {
    state.files.splice(index, 1);
    renderFileQueue();
    updateConvertButton();
  }

  function clearQueue() {
    dom.beltItems.innerHTML = '';
    const q = document.querySelector('.file-queue');
    if (q) q.remove();
  }

  function renderFileQueue() {
    clearQueue();
    if (state.files.length === 0) return;

    const queue = document.createElement('div');
    queue.className = 'file-queue';
    state.files.forEach((f, i) => {
      const el = document.createElement('div');
      el.className = 'queued-file';
      el.innerHTML = `
        <span class="file-name">${escapeHtml(f.name)}</span>
        <span class="file-size">${formatSize(f.size)}</span>
        <button class="remove-btn" data-index="${i}">\u2715</button>`;
      el.querySelector('.remove-btn').addEventListener('click', () => removeFile(i));
      queue.appendChild(el);
    });
    dom.dropZone.appendChild(queue);
    renderBeltItems();
  }

  function renderBeltItems() {
    dom.beltItems.innerHTML = '';
    state.files.forEach((f, i) => {
      const item = document.createElement('div');
      item.className = 'belt-item';
      item.textContent = f.name.split('.').pop().toUpperCase().slice(0, 4);
      item.style.left = (10 + i * 55) + 'px';
      dom.beltItems.appendChild(item);
    });
  }

  function clearOutput() {
    dom.outputFiles.innerHTML = '';
    dom.outputSlot.querySelector('p').textContent = 'ВЫХОД';
    dom.previewPanel.style.display = 'none';
  }

  // ============================================================
  // CONVERSION ENGINE
  // ============================================================
  async function startConversion() {
    if (state.processing || state.files.length === 0) return;
    state.processing = true;

    dom.conveyor.classList.add('running');
    dom.processor.classList.add('active');
    dom.statusDisplay.textContent = 'PROCESSING';
    dom.convertBtn.disabled = true;
    animateGauge(true);
    clearOutput();

    const results = [];

    for (let i = 0; i < state.files.length; i++) {
      dom.statusDisplay.textContent = (i + 1) + '/' + state.files.length;
      emitExhaust();

      const items = dom.beltItems.children;
      if (items[i]) {
        items[i].style.left = '50%';
        items[i].style.transform = 'translateX(-50%)';
      }

      await sleep(400);

      try {
        const result = await convertFile(state.files[i]);
        if (result) results.push(result);
      } catch (err) {
        console.error('Conversion error:', err);
        results.push({
          name: state.files[i].name + '.error.txt',
          blob: new Blob(['Error: ' + err.message], { type: 'text/plain' }),
          error: true,
        });
      }

      emitExhaust();
      await sleep(300);
    }

    dom.conveyor.classList.remove('running');
    dom.processor.classList.remove('active');
    dom.statusDisplay.textContent = 'DONE';
    animateGauge(false);
    showResults(results);
    state.processing = false;
    dom.convertBtn.disabled = false;
  }

  async function convertFile(file) {
    switch (state.mode) {
      case 'image-format': return convertImageFormat(file);
      case 'image-filter': return applyImageFilter(file);
      case 'text': return convertText(file);
      case 'encoding': return convertEncoding(file);
    }
  }

  async function convertImageFormat(file) {
    const dstFormat = $('#dstFormat').value;
    const quality = parseInt($('#quality').value) / 100;
    const img = await loadImage(file);
    const canvas = dom.previewCanvas;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, dstFormat, quality);
    const ext = mimeToExt(dstFormat);
    return { name: file.name.replace(/\.[^.]+$/, '') + '.' + ext, blob, type: dstFormat };
  }

  async function applyImageFilter(file) {
    if (!state.wasmModule) throw new Error('WASM module not loaded');
    const filterType = $('#filterType').value;
    const outputFormat = $('#filterOutput').value;
    const img = await loadImage(file);
    const canvas = dom.previewCanvas;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const byteLen = pixels.length;
    const mem = state.wasmMemory;
    const neededPages = Math.ceil(byteLen / 65536);
    const currentPages = mem.buffer.byteLength / 65536;
    if (neededPages > currentPages) mem.grow(neededPages - currentPages);
    new Uint8Array(mem.buffer).set(pixels, 0);
    const wasm = state.wasmModule;
    switch (filterType) {
      case 'grayscale': wasm.grayscale(byteLen); break;
      case 'invert': wasm.invert(byteLen); break;
      case 'sepia': wasm.sepia(byteLen); break;
      case 'brightness': wasm.brightness(byteLen, parseInt($('#filterValue').value)); break;
      case 'contrast': wasm.contrast(byteLen, parseInt($('#filterValue').value)); break;
    }
    imageData.data.set(new Uint8Array(mem.buffer, 0, byteLen));
    ctx.putImageData(imageData, 0, 0);
    showImagePreview(canvas);
    const blob = await canvasToBlob(canvas, outputFormat, 0.92);
    return { name: file.name.replace(/\.[^.]+$/, '') + '_' + filterType + '.' + mimeToExt(outputFormat), blob, type: outputFormat };
  }

  async function convertText(file) {
    const text = await readFileAsText(file);
    const convType = $('#textConversion').value;
    let result, ext, mime;
    switch (convType) {
      case 'csv-json': result = csvToJson(text); ext = 'json'; mime = 'application/json'; break;
      case 'json-csv': result = jsonToCsv(text); ext = 'csv'; mime = 'text/csv'; break;
      case 'md-html': result = markdownToHtml(text); ext = 'html'; mime = 'text/html'; break;
      case 'html-md': result = htmlToText(text); ext = 'txt'; mime = 'text/plain'; break;
    }
    showTextPreview(result);
    return { name: file.name.replace(/\.[^.]+$/, '') + '.' + ext, blob: new Blob([result], { type: mime }), type: mime };
  }

  async function convertEncoding(file) {
    const op = $('#encodingOp').value;
    let input, result, ext;
    if (op === 'base64-encode' || op === 'url-encode' || op === 'hex-encode') {
      const bytes = new Uint8Array(await readFileAsArrayBuffer(file));
      switch (op) {
        case 'base64-encode': result = uint8ToBase64(bytes); ext = 'b64.txt'; break;
        case 'url-encode': result = encodeURIComponent(new TextDecoder().decode(bytes)); ext = 'urlenc.txt'; break;
        case 'hex-encode': result = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '); ext = 'hex.txt'; break;
      }
    } else {
      input = await readFileAsText(file);
      switch (op) {
        case 'base64-decode': {
          const bin = atob(input.replace(/\s/g, ''));
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return { name: file.name.replace(/\.[^.]+$/, '') + '.decoded', blob: new Blob([bytes]), type: 'application/octet-stream' };
        }
        case 'url-decode': result = decodeURIComponent(input); ext = 'decoded.txt'; break;
        case 'hex-decode': {
          const h = input.replace(/[\s,]/g, '');
          const bytes = new Uint8Array(h.length / 2);
          for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(h.substr(i * 2, 2), 16);
          return { name: file.name.replace(/\.[^.]+$/, '') + '.decoded', blob: new Blob([bytes]), type: 'application/octet-stream' };
        }
      }
    }
    showTextPreview(result.slice(0, 2000) + (result.length > 2000 ? '\n...[truncated]' : ''));
    return { name: file.name.replace(/\.[^.]+$/, '') + '.' + ext, blob: new Blob([result], { type: 'text/plain' }), type: 'text/plain' };
  }

  // ============================================================
  // TEXT CONVERTERS
  // ============================================================
  function csvToJson(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length === 0) return '[]';
    const headers = parseCsvLine(lines[0]);
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCsvLine(lines[i]);
      const obj = {};
      headers.forEach((h, j) => { obj[h.trim()] = vals[j]?.trim() ?? ''; });
      data.push(obj);
    }
    return JSON.stringify(data, null, 2);
  }

  function parseCsvLine(line) {
    const result = []; let current = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) { if (ch === '"') { if (line[i+1] === '"') { current += '"'; i++; } else inQ = false; } else current += ch; }
      else { if (ch === '"') inQ = true; else if (ch === ',' || ch === ';') { result.push(current); current = ''; } else current += ch; }
    }
    result.push(current); return result;
  }

  function jsonToCsv(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (!Array.isArray(data) || data.length === 0) return '';
    const h = Object.keys(data[0]);
    const lines = [h.join(',')];
    for (const row of data) {
      lines.push(h.map(k => { const v = String(row[k] ?? ''); return (v.includes(',') || v.includes('"') || v.includes('\n')) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','));
    }
    return lines.join('\n');
  }

  function markdownToHtml(md) {
    let html = md
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>').replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>')
      .replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>').replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>').replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/^---+$/gm, '<hr>').replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>').replace(/<\/ul>\s*<ul>/g, '');
    return '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><title>Converted</title></head>\n<body><p>' + html + '</p></body></html>';
  }

  function htmlToText(html) { const t = document.createElement('div'); t.innerHTML = html; return t.textContent || ''; }

  // ============================================================
  // HELPERS
  // ============================================================
  function loadImage(file) { return new Promise((ok, fail) => { const i = new Image(); i.onload = () => { URL.revokeObjectURL(i.src); ok(i); }; i.onerror = () => fail(new Error('Image load failed')); i.src = URL.createObjectURL(file); }); }
  function canvasToBlob(c, t, q) { return new Promise(r => c.toBlob(b => r(b), t, q)); }
  function readFileAsText(f) { return new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => fail(new Error('Read error')); r.readAsText(f); }); }
  function readFileAsArrayBuffer(f) { return new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => fail(new Error('Read error')); r.readAsArrayBuffer(f); }); }
  function uint8ToBase64(b) { let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function mimeToExt(m) { return { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/bmp': 'bmp' }[m] || 'bin'; }
  function formatSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ============================================================
  // UI
  // ============================================================
  function updateConvertButton() { dom.convertBtn.disabled = state.files.length === 0; }

  function showResults(results) {
    dom.outputFiles.innerHTML = '';
    const valid = results.filter(r => r && r.blob);
    dom.outputSlot.querySelector('p').textContent = 'DONE: ' + valid.length + ' FILE(S)';
    for (const r of valid) {
      const url = URL.createObjectURL(r.blob);
      const el = document.createElement('a');
      el.className = 'output-file';
      el.href = url;
      el.download = r.name;
      el.innerHTML = '<span class="file-icon">' + r.name.split('.').pop().toUpperCase().slice(0, 3) + '</span><span>' + escapeHtml(r.name) + '</span><span style="color:var(--text-dim);font-size:0.5rem">' + formatSize(r.blob.size) + '</span>';
      dom.outputFiles.appendChild(el);
    }
  }

  function showImagePreview(canvas) {
    dom.previewPanel.style.display = '';
    dom.previewContent.innerHTML = '';
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.style.maxWidth = '100%';
    dom.previewContent.appendChild(img);
  }

  function showTextPreview(text) {
    dom.previewPanel.style.display = '';
    dom.previewContent.innerHTML = '';
    const pre = document.createElement('pre');
    pre.textContent = text;
    dom.previewContent.appendChild(pre);
  }

  function animateGauge(active) {
    if (active) {
      const iv = setInterval(() => { dom.gaugeNeedle.style.transform = 'translateX(-50%) rotate(' + (-45 + Math.random() * 120) + 'deg)'; }, 250);
      dom.gaugeNeedle._iv = iv;
    } else {
      clearInterval(dom.gaugeNeedle._iv);
      dom.gaugeNeedle.style.transform = 'translateX(-50%) rotate(-45deg)';
    }
  }

  function emitExhaust() {
    const v = dom.exhaust;
    for (let i = 0; i < 4; i++) {
      const p = document.createElement('div');
      p.className = 'steam-puff';
      p.style.left = Math.random() * 20 + 'px';
      p.style.animationDelay = i * 0.12 + 's';
      v.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    initBelt();
    loadWasm();

    // Header
    dom.header.addEventListener('mouseenter', () => headerAnim.show());
    dom.header.addEventListener('mouseleave', () => headerAnim.hide());
    dom.pullTab.addEventListener('click', () => headerAnim.toggle());

    // Nav buttons
    dom.navBtns().forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    switchMode('image-format');

    // Drop zone
    const dz = dom.dropZone;
    const fi = dom.fileInput;
    dz.addEventListener('click', e => { if (!e.target.closest('.remove-btn')) fi.click(); });
    fi.addEventListener('change', () => { if (fi.files.length) { handleFiles(fi.files); fi.value = ''; } });
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });

    // Convert
    dom.convertBtn.addEventListener('click', startConversion);

    // Terminal buttons
    dom.termBtns().forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        if (terminal.texts[cmd]) terminal.type(terminal.texts[cmd]);
      });
    });

    // Auto-type welcome
    terminal.type(terminal.texts.about);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
