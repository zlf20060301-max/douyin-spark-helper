(() => {
  const el = document.querySelector('.conversationConversationItemcurConversation');
  if (!el) return null;
  const NBSP = String.fromCharCode(160);
  const t = el.querySelector('.conversationConversationItemtitle');
  const title = t ? String(t.textContent).split(NBSP).join(' ').replace(/\s+/g, ' ').trim() : null;
  const streakEl = el.querySelector('.commonStreaknormalText');
  const streakText = streakEl ? String(streakEl.textContent).split(NBSP).join(' ').replace(/\s+/g, ' ').trim() : null;
  return { title: title, streakText: streakText, hasEditor: !!document.querySelector('[data-e2e="msg-input"] [contenteditable="true"], .DraftEditor-root [contenteditable="true"]') };
})()
