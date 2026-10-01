(() => ({
  loginVisible: !!document.querySelector('[data-e2e="login-container"]'),
  qrcode: !!document.querySelector('#animate_qrcode_container'),
  avatarCard: !!document.querySelector('[data-e2e="user-avatar-card"]'),
  hasChatRoot: !!document.querySelector('[data-e2e="msg-input"]')
            || !!document.querySelector('.conversationConversationListwrapper'),
  itemCount: document.querySelectorAll('[data-e2e="conversation-item"]').length,
  nickname: (() => {
    const el = document.querySelector('[data-e2e="user-avatar-card"]');
    if (!el) return null;
    const t = el.getAttribute('title') || el.textContent || '';
    return t.trim() || null;
  })()
}))()
