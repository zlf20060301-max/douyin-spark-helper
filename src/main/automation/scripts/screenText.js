(() => {
  const t = document.body ? (document.body.innerText || '') : '';
  return t.slice(0, 30000);
})()
