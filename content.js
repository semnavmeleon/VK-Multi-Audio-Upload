(function () {
  'use strict';

  // ─── inject page-context XHR interceptor + file injector ────────────────────
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('injected.js');
  document.documentElement.prepend(s);
  s.onload = () => s.remove();

  // ─── icons ───────────────────────────────────────────────────────────────────
  const ICON_TRIGGER = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4v11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M8.5 7.5L12 4l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 17.5h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M7 21h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;

  const ICON_UPLOAD = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1v8M4.5 3.5L7 1l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M2 10.5v1.5a1 1 0 001 1h8a1 1 0 001-1v-1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;

  const ICON_CLOSE = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;

  const STATUS_ICON = {
    pending: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="#555" stroke-width="1.3"/>
      <rect x="5" y="4.5" width="1.4" height="5" rx="0.5" fill="#555"/>
      <rect x="7.6" y="4.5" width="1.4" height="5" rx="0.5" fill="#555"/>
    </svg>`,
    uploading: `<svg class="vmu-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="rgba(38,136,235,0.2)" stroke-width="1.5"/>
      <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="#2688eb" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
    done: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" fill="rgba(75,179,75,0.14)" stroke="#4bb34b" stroke-width="1.3"/>
      <path d="M4.5 7l2 2 3-3" stroke="#4bb34b" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" fill="rgba(230,70,70,0.12)" stroke="#e64646" stroke-width="1.3"/>
      <path d="M5 5l4 4M9 5l-4 4" stroke="#e64646" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`,
  };

  // ─── state ───────────────────────────────────────────────────────────────────
  let fileQueue = [];
  let isProcessing = false;
  let uploadDoneCallback = null;

  // messages from injected.js
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (e.data?.type === 'VK_UPLOAD_DONE' && uploadDoneCallback) {
      uploadDoneCallback(e.data);
      uploadDoneCallback = null;
    }
  });

  // ─── helpers ─────────────────────────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const isMP3 = (f) => f.type === 'audio/mpeg' || f.name.toLowerCase().endsWith('.mp3');
  const fmtSize = (b) => b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

  function getVkBtn() {
    return document.querySelector('[aria-label="Загрузить аудиозапись"]');
  }

  function waitForElement(sel, ms) {
    return new Promise(resolve => {
      const el = document.querySelector(sel);
      if (el) { resolve(el); return; }
      const obs = new MutationObserver(() => {
        const found = document.querySelector(sel);
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); resolve(null); }, ms);
    });
  }

  // ─── modal ───────────────────────────────────────────────────────────────────
  function openModal() {
    if (!document.getElementById('vmu-backdrop')) buildModal();
    document.getElementById('vmu-backdrop').style.display = 'flex';
    renderQueue();
  }

  function closeModal() {
    const el = document.getElementById('vmu-backdrop');
    if (el) el.style.display = 'none';
  }

  function buildModal() {
    const wrap = document.createElement('div');
    wrap.id = 'vmu-backdrop';
    wrap.innerHTML = `
      <div id="vmu-modal">
        <div id="vmu-header">
          <span id="vmu-title">Загрузить несколько треков</span>
          <button id="vmu-close">${ICON_CLOSE}</button>
        </div>

        <div id="vmu-dropzone">
          <div class="vmu-dz-label">Перетащите MP3 файлы сюда</div>
          <div class="vmu-dz-hint">не более 200 МБ каждый</div>
          <label class="vmu-pick-btn">
            ${ICON_UPLOAD}
            Выбрать файлы
            <input type="file" id="vmu-input" accept=".mp3,audio/mpeg" multiple>
          </label>
        </div>

        <div id="vmu-list"></div>

        <div id="vmu-footer">
          <span id="vmu-status">Перетащите файлы или нажмите «Выбрать»</span>
          <div id="vmu-footer-actions"></div>
          <button id="vmu-clear">Очистить</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.addEventListener('click', e => { if (e.target === wrap) closeModal(); });
    document.getElementById('vmu-close').addEventListener('click', closeModal);

    document.getElementById('vmu-clear').addEventListener('click', () => {
      fileQueue = fileQueue.filter(f => f.status === 'uploading' || f.status === 'pending');
      renderQueue();
    });

    document.getElementById('vmu-input').addEventListener('change', e => {
      addFiles([...e.target.files]);
      e.target.value = '';
    });

    const dz = document.getElementById('vmu-dropzone');
    const modal = document.getElementById('vmu-modal');

    let dragCounter = 0;
    modal.addEventListener('dragenter', e => { e.preventDefault(); dragCounter++; dz.classList.add('vmu-over'); });
    modal.addEventListener('dragleave', e => { e.preventDefault(); dragCounter--; if (dragCounter <= 0) { dragCounter = 0; dz.classList.remove('vmu-over'); } });
    modal.addEventListener('dragover',  e => e.preventDefault());
    modal.addEventListener('drop', e => {
      e.preventDefault();
      dragCounter = 0;
      dz.classList.remove('vmu-over');
      addFiles([...e.dataTransfer.files].filter(isMP3));
    });

    // accept on backdrop too so users can drop anywhere in the overlay
    wrap.addEventListener('dragover', e => e.preventDefault());
    wrap.addEventListener('drop', e => {
      e.preventDefault();
      dragCounter = 0;
      dz.classList.remove('vmu-over');
      addFiles([...e.dataTransfer.files].filter(isMP3));
    });

    document.getElementById('vmu-list').addEventListener('click', e => {
      const btn = e.target.closest('.vmu-retry-btn');
      if (btn) retryOne(parseInt(btn.dataset.idx, 10));
    });

    document.getElementById('vmu-footer').addEventListener('click', e => {
      if (e.target.closest('#vmu-copy-failed')) copyFailed();
      else if (e.target.closest('#vmu-retry-all')) retryAll();
    });
  }

  // ─── retry / copy helpers ─────────────────────────────────────────────────
  function retryOne(idx) {
    if (fileQueue[idx] && fileQueue[idx].status === 'error') {
      fileQueue[idx].status = 'pending';
      fileQueue[idx].errorMsg = null;
      renderQueue();
      if (!isProcessing) processQueue();
    }
  }

  function retryAll() {
    let any = false;
    fileQueue.forEach(item => {
      if (item.status === 'error') { item.status = 'pending'; item.errorMsg = null; any = true; }
    });
    if (any) { renderQueue(); if (!isProcessing) processQueue(); }
  }

  function copyFailed() {
    const names = fileQueue.filter(f => f.status === 'error').map(f => f.file.name);
    if (!names.length) return;
    navigator.clipboard.writeText(names.join('\n')).then(() => {
      const btn = document.getElementById('vmu-copy-failed');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✓ Скопировано';
        setTimeout(() => { if (btn.isConnected) btn.textContent = orig; }, 1500);
      }
    }).catch(() => {});
  }

  // ─── render ───────────────────────────────────────────────────────────────────
  function renderQueue() {
    const list = document.getElementById('vmu-list');
    if (!list) return;

    list.innerHTML = fileQueue.map((item, idx) => {
      const raw = item.file.name.replace(/\.mp3$/i, '');
      const name = raw.length > 48 ? raw.slice(0, 46) + '…' : raw;
      const errHtml = item.errorMsg
        ? `<span class="vmu-errmsg">${item.errorMsg}</span>`
        : '';
      const retryBtn = item.status === 'error'
        ? `<button class="vmu-retry-btn" data-idx="${idx}" title="Повторить">↺</button>`
        : '';
      return `<div class="vmu-item vmu-${item.status}">
        <span class="vmu-icon">${STATUS_ICON[item.status]}</span>
        <span class="vmu-info">
          <span class="vmu-name" title="${item.file.name}">${name}</span>${errHtml}
        </span>
        <span class="vmu-sz">${fmtSize(item.file.size)}</span>
        ${retryBtn}
      </div>`;
    }).join('');

    const counts = { pending: 0, uploading: 0, done: 0, error: 0 };
    fileQueue.forEach(f => counts[f.status]++);

    let txt = '';
    if (fileQueue.length === 0)          txt = 'Перетащите файлы или нажмите «Выбрать»';
    else if (counts.uploading)           txt = 'Загружается…';
    else if (counts.pending)             txt = `В очереди: ${counts.pending}`;
    else if (counts.error && counts.done) txt = `Загружено: ${counts.done}, ошибок: ${counts.error}`;
    else if (counts.done)                txt = `Все треки загружены: ${counts.done}`;
    else if (counts.error)               txt = `Ошибок: ${counts.error}`;

    const st = document.getElementById('vmu-status');
    if (st) st.textContent = txt;

    const allSettled = fileQueue.length > 0 && !fileQueue.some(f => f.status === 'pending' || f.status === 'uploading');
    const fa = document.getElementById('vmu-footer-actions');
    if (fa) {
      if (allSettled && counts.error > 0) {
        fa.innerHTML = `<button class="vmu-action-btn" id="vmu-copy-failed">📋 Скопировать</button><button class="vmu-action-btn" id="vmu-retry-all">↺ Повторить все</button>`;
      } else {
        fa.innerHTML = '';
      }
    }
  }

  // ─── queue ────────────────────────────────────────────────────────────────────
  function addFiles(files) {
    if (!files.length) return;
    files.forEach(f => fileQueue.push({ file: f, status: 'pending', errorMsg: null }));
    renderQueue();
    if (!isProcessing) processQueue();
  }

  function showCompletionGif() {
    const existing = document.getElementById('vmu-gif-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'vmu-gif-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;cursor:pointer;';

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('done.gif');
    img.style.cssText = 'max-width:80vw;max-height:80vh;border-radius:8px;pointer-events:none;';
    overlay.appendChild(img);
    document.body.appendChild(overlay);

    const dismiss = () => overlay.remove();
    overlay.addEventListener('click', dismiss);
    setTimeout(dismiss, 4000);
  }

  async function processQueue() {
    if (isProcessing) return;
    const next = fileQueue.find(f => f.status === 'pending');
    if (!next) {
      renderQueue();
      if (fileQueue.length > 0 && !fileQueue.some(f => f.status === 'uploading')) {
        showCompletionGif();
      }
      return;
    }

    isProcessing = true;
    next.status = 'uploading';
    renderQueue();

    try {
      await uploadOne(next.file);
      next.status = 'done';
    } catch (err) {
      next.status = 'error';
      next.errorMsg = err.message;
      console.warn('[VK Multi Upload]', err.message);
    }

    renderQueue();
    isProcessing = false;
    await sleep(1000);
    processQueue();
  }

  async function uploadOne(file) {
    const btn = getVkBtn();
    if (!btn) throw new Error('Кнопка загрузки не найдена');
    btn.click();

    const input = await waitForElement('input[type="file"][accept*="mp3"]', 4000);
    if (!input) throw new Error('Диалог ВК не открылся');

    // Small pause: let React fully finish rendering the dialog before injecting
    await sleep(300);

    // inject file via page context (injected.js) to avoid isolated-world DataTransfer issue
    const buffer = await file.arrayBuffer();
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout инжекта')), 5000);
      const handler = e => {
        if (e.source !== window || e.data?.type !== 'VK_FILE_INJECTED') return;
        window.removeEventListener('message', handler);
        clearTimeout(t);
        e.data.ok ? resolve() : reject(new Error(e.data.error));
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'VK_INJECT_FILE', name: file.name, mimeType: file.type || 'audio/mpeg', buffer }, '*', [buffer]);
    });

    // Close VK's native dialog — it served its purpose (giving us the upload URL).
    // Pressing Escape dismisses it without cancelling the in-flight XHR.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout загрузки (90s)')), 90_000);
      uploadDoneCallback = data => {
        clearTimeout(t);
        if (data.error) { reject(new Error('Ошибка сети')); return; }
        try {
          const r = JSON.parse(data.response);
          r.error_code ? reject(new Error(`VK ${r.error_code}: ${r.error_msg}`)) : resolve(r);
        } catch { resolve(); }
      };
    });

    await sleep(1500);
  }

  // ─── tooltip (body-level to escape VK's overflow:hidden containers) ──────────
  function ensureTooltip() {
    let tip = document.getElementById('vmu-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'vmu-tooltip';
      tip.textContent = 'Загрузить несколько треков';
      document.body.appendChild(tip);
    }
    return tip;
  }

  let tooltipTimer = null;

  function showTooltip(anchorEl) {
    const tip = ensureTooltip();
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      const r = anchorEl.getBoundingClientRect();
      tip.style.left = Math.round(r.left + r.width / 2 - tip.offsetWidth / 2) + 'px';
      tip.style.top  = Math.round(r.bottom + 14) + 'px';
      tip.classList.add('vmu-tooltip-visible');
      // Reposition after measuring (first paint may have 0 width)
      requestAnimationFrame(() => {
        tip.style.left = Math.round(r.left + r.width / 2 - tip.offsetWidth / 2) + 'px';
      });
    }, 300);
  }

  function hideTooltip() {
    clearTimeout(tooltipTimer);
    document.getElementById('vmu-tooltip')?.classList.remove('vmu-tooltip-visible');
  }

  // ─── trigger button ───────────────────────────────────────────────────────────
  function injectTrigger() {
    if (document.getElementById('vmu-trigger')) return;
    const vkBtn = getVkBtn();
    if (!vkBtn) return;

    const btn = document.createElement('button');
    btn.id = 'vmu-trigger';
    btn.innerHTML = ICON_TRIGGER;
    btn.addEventListener('click', e => { e.stopPropagation(); hideTooltip(); openModal(); });
    btn.addEventListener('mouseenter', () => showTooltip(btn));
    btn.addEventListener('mouseleave', hideTooltip);

    vkBtn.insertAdjacentElement('afterend', btn);
  }

  // ─── SPA watcher ─────────────────────────────────────────────────────────────
  let lastHref = location.href;
  new MutationObserver(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      document.getElementById('vmu-trigger')?.remove();
      closeModal();
    }
    injectTrigger();
  }).observe(document.body, { childList: true, subtree: true });

  injectTrigger();
  setTimeout(injectTrigger, 500);
  setTimeout(injectTrigger, 1500);
  setTimeout(injectTrigger, 3000);
})();
