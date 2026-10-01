((name) => {
  const NBSP = String.fromCharCode(160);
  const norm = (s) => (s == null ? '' : String(s)).split(NBSP).join(' ').replace(/\s+/g, ' ').trim();
  const items = [...document.querySelectorAll('[data-e2e="conversation-item"]')];
  for (const el of items) {
    const t = el.querySelector('.conversationConversationItemtitle');
    if (!t) continue;
    if (norm(t.textContent) === norm(name)) {
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
  }
  return null;
})
