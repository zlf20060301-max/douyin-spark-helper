(() => {
  const el = document.querySelector('.conversationConversationListwrapper');
  if (!el) return { found: false };
  return {
    found: true,
    scrollTop: Math.round(el.scrollTop),
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    atBottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 2,
    atTop: el.scrollTop <= 1,
    count: document.querySelectorAll('[data-e2e="conversation-item"]').length
  };
})()
