(() => {
  const ed = document.querySelector('[data-e2e="msg-input"] .public-DraftEditor-content')
          || document.querySelector('.DraftEditor-root [contenteditable="true"]')
          || document.querySelector('[contenteditable="true"]');
  if (!ed) return false;
  ed.focus();
  const sel = window.getSelection();
  const r = document.createRange();
  r.selectNodeContents(ed);
  sel.removeAllRanges();
  sel.addRange(r);
  document.execCommand('delete');
  return true;
})()
