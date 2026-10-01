(() => {
  const items = document.querySelectorAll('[data-e2e="msg-item-content"]');
  const last = items[items.length - 1];
  return {
    count: items.length,
    lastFromMe: last ? !!last.closest('.MessageBoxContentisFromMe') : null,
    lastText: last ? last.textContent.trim().slice(0, 80) : null
  };
})()
