// Runs in page context — intercepts XHR and handles file injection from content script
(function () {
  if (window.__vkMultiUploadInjected) return;
  window.__vkMultiUploadInjected = true;

  // ── XHR interceptor: notify content script when upload finishes ──────────────
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._vkUrl = url;
    this._vkMethod = method;
    return origOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this._vkUrl && this._vkUrl.includes('pu.vk.com')) {
      const xhr = this;
      this.addEventListener('load', function () {
        window.postMessage(
          { type: 'VK_UPLOAD_DONE', response: xhr.responseText },
          '*'
        );
      });
      this.addEventListener('error', function () {
        window.postMessage({ type: 'VK_UPLOAD_DONE', error: true }, '*');
      });
    }
    return origSend.call(this, body);
  };

  // ── File injection: receive ArrayBuffer from content script ──────────────────
  // Content script can't create File/DataTransfer that React accepts (isolated world).
  // We do it here in the page context where React's synthetic events work correctly.
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'VK_INJECT_FILE') return;

    const { name, mimeType, buffer } = e.data;
    const file = new File([buffer], name, { type: mimeType || 'audio/mpeg' });

    // Retry loop: dialog may still be animating when message arrives
    let tries = 0;
    function tryInject() {
      const input = document.querySelector('input[type="file"]');
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        window.postMessage({ type: 'VK_FILE_INJECTED', ok: true }, '*');
      } else if (tries++ < 20) {
        setTimeout(tryInject, 200);
      } else {
        window.postMessage({ type: 'VK_FILE_INJECTED', ok: false, error: 'input not found' }, '*');
      }
    }
    tryInject();
  });
})();
