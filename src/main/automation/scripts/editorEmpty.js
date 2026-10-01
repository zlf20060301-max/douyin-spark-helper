(() => {
  const ed = document.querySelector('[data-e2e="msg-input"] .public-DraftEditor-content')
          || document.querySelector('.DraftEditor-root [contenteditable="true"]')
          || document.querySelector('.messageMsgInput [contenteditable="true"]')
          || document.querySelector('[contenteditable="true"]');
  if (!ed) return null;
  return (ed.textContent || '').trim().length === 0;
})()
