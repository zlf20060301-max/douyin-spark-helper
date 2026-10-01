(() => {
  const items = document.querySelectorAll('[data-e2e="conversation-item"]');
  if (items.length === 0) return { ready: false, why: 'no-item', count: 0 };
  let blank = 0;
  items.forEach(el => {
    const t = el.querySelector('.conversationConversationItemtitle');
    if (!t || !t.textContent.trim()) blank++;
  });
  if (blank > 0) return { ready: false, why: 'title-blank', blank: blank, count: items.length };
  const box = document.querySelector('.conversationConversationListwrapper');
  if (!box || box.clientHeight <= 0) return { ready: false, why: 'no-container', count: items.length };
  return { ready: true, count: items.length };
})()
