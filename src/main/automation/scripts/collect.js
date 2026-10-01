(() => {
  const ITEM = '[data-e2e="conversation-item"]';
  const NBSP = String.fromCharCode(160);
  const clean = (s) => s == null ? null : String(s).split(NBSP).join(' ').replace(/\s+/g, ' ').trim();
  const safe = (fn) => { try { return fn(); } catch (e) { return null; } };

  function convOf(el) {
    const keys = Object.keys(el).filter(k => k.indexOf('__reactProps$') === 0 || k.indexOf('__reactFiber$') === 0);
    for (const k of keys) {
      if (k.indexOf('__reactProps$') === 0) {
        const p = el[k];
        if (p && p.conversation && (p.conversation.id || p.conversation.conversationId)) return p.conversation;
        continue;
      }
      let f = el[k], d = 0;
      while (f && d++ < 30) {
        const p = f.memoizedProps;
        if (p && p.conversation && (p.conversation.id || p.conversation.conversationId)) return p.conversation;
        f = f.return;
      }
    }
    return null;
  }

  return [...document.querySelectorAll(ITEM)].map((el) => {
    const conv = convOf(el);
    const titleEl = el.querySelector('.conversationConversationItemtitle');
    const streakEl = el.querySelector('.commonStreaknormalText');
    const uidRaw = conv ? safe(() => conv.toParticipantUserId) : null;
    const pcRaw = conv ? safe(() => conv.participantCount) : null;
    return {
      convId: conv ? (conv.id || conv.conversationId || null) : null,
      uid: (uidRaw === null || uidRaw === undefined) ? null : String(uidRaw),
      secUid: conv ? safe(() => conv.toParticipantSecUserId) : null,
      participantCount: (pcRaw === null || pcRaw === undefined) ? null : Number(pcRaw),
      type: conv ? (conv.type === null || conv.type === undefined ? null : Number(conv.type)) : null,
      name: titleEl ? clean(titleEl.textContent) : null,
      streakText: streakEl ? clean(streakEl.textContent) : null,
      isCurrent: !!el.querySelector('.conversationConversationItemcurConversation')
    };
  }).filter(x => x.name);
})()
