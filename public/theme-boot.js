(function () {
  var stored = localStorage.getItem('tempo.theme');
  var mode = stored === 'dark' || stored === 'light' ? stored : 'system';
  var dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
