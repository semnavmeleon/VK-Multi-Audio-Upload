// Runs at document_start to patch fetch/XHR before VK scripts fire
(function () {
  if (window.__vkMultiUploadInjected) return;
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('injected.js');
  (document.documentElement || document.head).appendChild(s);
})();
