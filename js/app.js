/* ============================================================
   SWITZER TOOL — Industrial File Converter
   Browser-only. No server. No libraries. WebAssembly processing.
   ============================================================ */

(function () {
  'use strict';

  // ---- State ----
  const state = {
    mode: 'image-format',
    files: [],
    wasmModule: null,
    wasmMemory: null,
    processing: false,
  };

  // ---- DOM helpers ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    switches: () => $$('.mech-switch'),
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
    dustBg: $('#dustBg'),
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
      console.warn('[WASM] Failed to load, image filters will be unavailable:', e);
    }
  }

  // ============================================================
  // DUST PARTICLES (falling ash)
  // ============================================================
  function initDustParticles() {
    const container = dom.dustBg;
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('div');
      p.className = 'dust-particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (8 + Math.random() * 12) + 's';
      p.style.animationDelay = (Math.random() * 15) + 's';
      p.style.width = p.style.height = (1 + Math.random() * 3) + 'px';
      container.appendChild(p);
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
        <div class="dial-item" style="font-size:1.4rem;color:var(--text-dim);align-self:center;padding:0 4px">&#x2192;</div>
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
        </div>
      `,
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
        </div>
      `,
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
        </div>
      `,
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
        </div>
      `,
    },
  };

  function switchMode(mode) {
    state.mode = mode;
    state.files = [];
    clearOutput();
    clearQueue();

    dom.switches().forEach((s) => s.classList.toggle('active', s.dataset.mode === mode));

    dom.settingsContent.innerHTML = modeSettings[mode].controls;

    dom.fileInput.accept = (mode === 'image-format' || mode === 'image-filter') ? 'image/*' : '';

    bindSettingsEvents();
    updateConvertButton();
  }

  function bindSettingsEvents() {
    const quality = $('#quality');
    if (quality) {
      quality.addEventListener('input', () => {
        $('#qualityVal').textContent = quality.value + '%';
      });
    }

    const filterType = $('#filterType');
    if (filterType) {
      filterType.addEventListener('change', updateFilterControls);
      updateFilterControls();
    }

    const filterValue = $('#filterValue');
    if (filterValue) {
      filterValue.addEventListener('input', () => {
        $('#filterValueDisplay').textContent = filterValue.value;
      });
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
    for (const file of fileList) {
      state.files.push(file);
    }
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
    const queueEl = document.querySelector('.file-queue');
    if (queueEl) queueEl.remove();
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
        <button class="remove-btn" data-index="${i}">\u2715</button>
      `;
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
      item.style.left = `${10 + (i * 55)}px`;
      dom.beltItems.appendChild(item);
    });
  }

  function clearOutput() {
    dom.outputFiles.innerHTML = '';
    dom.outputSlot.querySelector('p').textContent = 'Готовые файлы';
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
    dom.statusDisplay.textContent = 'ОБРАБОТКА';
    dom.convertBtn.disabled = true;
    animateGauge(true);
    clearOutput();

    const results = [];

    for (let i = 0; i < state.files.length; i++) {
      dom.statusDisplay.textContent = `${i + 1}/${state.files.length}`;
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
          blob: new Blob([`Error: ${err.message}`], { type: 'text/plain' }),
          error: true,
        });
      }

      emitExhaust();
      await sleep(300);
    }

    dom.conveyor.classList.remove('running');
    dom.processor.classList.remove('active');
    dom.statusDisplay.textContent = 'ГОТОВО';
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

  // ---- Image format conversion (Canvas API) ----
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
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return { name: `${baseName}.${ext}`, blob, type: dstFormat };
  }

  // ---- Image filter (WASM) ----
  async function applyImageFilter(file) {
    if (!state.wasmModule) {
      throw new Error('WASM module not loaded');
    }

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

    // Grow WASM memory if needed
    const mem = state.wasmMemory;
    const neededPages = Math.ceil(byteLen / 65536);
    const currentPages = mem.buffer.byteLength / 65536;
    if (neededPages > currentPages) {
      mem.grow(neededPages - currentPages);
    }

    // Copy pixel data into WASM linear memory
    const wasmBuf = new Uint8Array(mem.buffer);
    wasmBuf.set(pixels, 0);

    // Run WASM filter
    const wasm = state.wasmModule;
    switch (filterType) {
      case 'grayscale': wasm.grayscale(byteLen); break;
      case 'invert': wasm.invert(byteLen); break;
      case 'sepia': wasm.sepia(byteLen); break;
      case 'brightness': wasm.brightness(byteLen, parseInt($('#filterValue').value)); break;
      case 'contrast': wasm.contrast(byteLen, parseInt($('#filterValue').value)); break;
    }

    // Read processed pixels back
    const processed = new Uint8Array(mem.buffer, 0, byteLen);
    imageData.data.set(processed);
    ctx.putImageData(imageData, 0, 0);

    showImagePreview(canvas);

    const blob = await canvasToBlob(canvas, outputFormat, 0.92);
    const ext = mimeToExt(outputFormat);
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return { name: `${baseName}_${filterType}.${ext}`, blob, type: outputFormat };
  }

  // ---- Text conversion ----
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

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return { name: `${baseName}.${ext}`, blob: new Blob([result], { type: mime }), type: mime };
  }

  // ---- Encoding conversion ----
  async function convertEncoding(file) {
    const op = $('#encodingOp').value;
    let input, result, ext;

    if (op === 'base64-encode' || op === 'url-encode' || op === 'hex-encode') {
      const arrayBuf = await readFileAsArrayBuffer(file);
      const bytes = new Uint8Array(arrayBuf);

      switch (op) {
        case 'base64-encode':
          result = uint8ToBase64(bytes);
          ext = 'b64.txt';
          break;
        case 'url-encode':
          input = new TextDecoder().decode(bytes);
          result = encodeURIComponent(input);
          ext = 'urlenc.txt';
          break;
        case 'hex-encode':
          result = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(' ');
          ext = 'hex.txt';
          break;
      }
    } else {
      input = await readFileAsText(file);
      switch (op) {
        case 'base64-decode': {
          const cleaned = input.replace(/\s/g, '');
          const binary = atob(cleaned);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const baseName = file.name.replace(/\.[^.]+$/, '').replace(/\.b64$/, '');
          return { name: `${baseName}.decoded`, blob: new Blob([bytes]), type: 'application/octet-stream' };
        }
        case 'url-decode':
          result = decodeURIComponent(input);
          ext = 'decoded.txt';
          break;
        case 'hex-decode': {
          const hexStr = input.replace(/[\s,]/g, '');
          const bytes = new Uint8Array(hexStr.length / 2);
          for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
          }
          const baseName = file.name.replace(/\.[^.]+$/, '').replace(/\.hex$/, '');
          return { name: `${baseName}.decoded`, blob: new Blob([bytes]), type: 'application/octet-stream' };
        }
      }
    }

    showTextPreview(result.slice(0, 2000) + (result.length > 2000 ? '\n...[truncated]' : ''));

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return { name: `${baseName}.${ext}`, blob: new Blob([result], { type: 'text/plain' }), type: 'text/plain' };
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
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = false; }
        } else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',' || ch === ';') { result.push(current); current = ''; }
        else { current += ch; }
      }
    }
    result.push(current);
    return result;
  }

  function jsonToCsv(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (!Array.isArray(data) || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const lines = [headers.join(',')];
    for (const row of data) {
      const vals = headers.map((h) => {
        const v = String(row[h] ?? '');
        return (v.includes(',') || v.includes('"') || v.includes('\n'))
          ? '"' + v.replace(/"/g, '""') + '"' : v;
      });
      lines.push(vals.join(','));
    }
    return lines.join('\n');
  }

  function markdownToHtml(md) {
    let html = md
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
      .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
      .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
      .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/^---+$/gm, '<hr>')
      .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    return `<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><title>Converted</title></head>\n<body><p>${html}</p></body></html>`;
  }

  function htmlToText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsArrayBuffer(file);
    });
  }

  function uint8ToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function mimeToExt(mime) {
    return { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/bmp': 'bmp' }[mime] || 'bin';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ============================================================
  // UI UPDATES
  // ============================================================
  function updateConvertButton() {
    dom.convertBtn.disabled = state.files.length === 0;
  }

  function showResults(results) {
    dom.outputFiles.innerHTML = '';
    const valid = results.filter((r) => r && r.blob);
    dom.outputSlot.querySelector('p').textContent = `ГОТОВО: ${valid.length} FILE(S)`;

    for (const r of valid) {
      const url = URL.createObjectURL(r.blob);
      const el = document.createElement('a');
      el.className = 'output-file' + (r.error ? ' error' : '');
      el.href = url;
      el.download = r.name;
      el.innerHTML = `
        <span class="file-icon">${r.name.split('.').pop().toUpperCase().slice(0, 3)}</span>
        <span>${escapeHtml(r.name)}</span>
        <span style="color:var(--text-dim);font-size:0.55rem">${formatSize(r.blob.size)}</span>
      `;
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

  // ============================================================
  // ANIMATIONS
  // ============================================================
  function animateGauge(active) {
    if (active) {
      const interval = setInterval(() => {
        const angle = -45 + Math.random() * 120;
        dom.gaugeNeedle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
      }, 250);
      dom.gaugeNeedle._interval = interval;
    } else {
      clearInterval(dom.gaugeNeedle._interval);
      dom.gaugeNeedle.style.transform = 'translateX(-50%) rotate(-45deg)';
    }
  }

  function emitExhaust() {
    const vent = dom.exhaust;
    for (let i = 0; i < 4; i++) {
      const puff = document.createElement('div');
      puff.className = 'steam-puff';
      puff.style.left = Math.random() * 20 + 'px';
      puff.style.animationDelay = (i * 0.12) + 's';
      vent.appendChild(puff);
      setTimeout(() => puff.remove(), 900);
    }
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    initDustParticles();
    initBelt();
    loadWasm();

    // Mode switches
    dom.switches().forEach((sw) => {
      sw.addEventListener('click', () => switchMode(sw.dataset.mode));
    });

    switchMode('image-format');

    // Drop zone
    const dz = dom.dropZone;
    const fi = dom.fileInput;

    dz.addEventListener('click', (e) => {
      if (e.target.closest('.remove-btn')) return;
      fi.click();
    });

    fi.addEventListener('change', () => {
      if (fi.files.length) { handleFiles(fi.files); fi.value = ''; }
    });

    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => { dz.classList.remove('drag-over'); });
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });

    // Convert
    dom.convertBtn.addEventListener('click', startConversion);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
