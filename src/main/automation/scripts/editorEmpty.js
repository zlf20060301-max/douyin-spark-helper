(() => {
  const ed = document.querySelector('[data-e2e="msg-input"] [contenteditable="true"]')
          || document.querySelector('.messageEditorinputArea')
          || document.querySelector('[contenteditable="true"]');
  if (!ed) return null;
  // 该编辑器在空的时候仍会留一个零宽空格 U+200B，
  // 而 String.trim() 不把 U+200B 当空白（实测 trim 后长度仍为 1），
  // 所以必须显式剥离零宽字符，否则「输入框已清空」永远判不出来。
  const ZW = [0x200b, 0x200c, 0x200d, 0xfeff].map((c) => String.fromCharCode(c));
  let t = String(ed.textContent || '');
  for (const z of ZW) t = t.split(z).join('');
  return t.trim().length === 0;
})()
