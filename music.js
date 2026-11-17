(function () {
  'use strict';
  if (document.getElementById('weddingMusic')) return;
  var audio = document.createElement('audio');
  audio.id = 'weddingMusic';
  var musicUrl = 'https://video.khunglongcon.com/the-gioi-cua-anh.mp3';
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0.6;
  audio.setAttribute('playsinline', '');
  audio.setAttribute('aria-hidden', 'true');

  var button = document.createElement('button');
  button.id = 'musicToggle';
  button.type = 'button';
  button.hidden = true;
  button.setAttribute('aria-controls', audio.id);
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', 'Bật nhạc nền');
  button.textContent = 'Bật nhạc';

  var style = document.createElement('style');
  style.textContent = '#musicToggle{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:calc(16px + env(safe-area-inset-bottom));z-index:45;min-height:44px;padding:10px 17px;border:1px solid var(--line,#c9d0d5);border-radius:999px;background:var(--bg,#f6f5f1);color:var(--red,#3e4448);font:600 12px/1.3 var(--serif,serif);box-shadow:0 3px 14px rgba(0,0,0,.08);cursor:pointer;touch-action:manipulation}#musicToggle[hidden]{display:none}#musicToggle:focus-visible{outline:2px solid currentColor;outline-offset:3px}';
  document.head.appendChild(style);
  document.body.appendChild(audio);
  document.body.appendChild(button);

  var userPaused = false, wanted = false, pending = null, resumeOnVisible = false;
  function render() {
    var playing = !audio.paused && !audio.error;
    button.textContent = playing ? 'Tắt nhạc' : audio.error ? 'Thử lại nhạc' : 'Bật nhạc';
    button.setAttribute('aria-label', playing ? 'Tắt nhạc nền' : 'Bật nhạc nền');
    button.setAttribute('aria-pressed', String(playing));
  }
  function play() {
    wanted = true;
    if (pending) return;
    if (!audio.getAttribute('src')) audio.src = musicUrl;
    if (audio.error) audio.load();
    var result;
    try { result = audio.play(); } catch (error) { render(); return; }
    if (result && typeof result.then === 'function') {
      pending = result;
      result.then(function () {
        pending = null;
        if (!wanted) audio.pause();
        render();
      }, function () { pending = null; render(); });
    } else render();
  }
  button.addEventListener('click', function () {
    if (wanted && (!audio.paused || pending)) {
      userPaused = true;
      wanted = false;
      resumeOnVisible = false;
      audio.pause();
      render();
    } else {
      userPaused = false;
      play();
    }
  });
  document.addEventListener('click', function (event) {
    if (button.contains(event.target) || /^#(quanly|admin)$/i.test(location.hash)) return;
    var intro = document.getElementById('intro');
    if (intro && !intro.classList.contains('done')) return;
    button.hidden = false;
    if (!userPaused && audio.paused) play();
  });
  ['playing', 'pause', 'error', 'emptied'].forEach(function (name) {
    audio.addEventListener(name, render);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      resumeOnVisible = wanted && !audio.paused;
      if (resumeOnVisible) audio.pause();
    } else if (resumeOnVisible && wanted && !userPaused) {
      resumeOnVisible = false;
      play();
    }
  });
  render();
})();
