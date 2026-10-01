(top) => {
  const el = document.querySelector('.conversationConversationListwrapper');
  if (!el) return false;
  el.scrollTo({ top: top, behavior: 'instant' });
  return true;
}
