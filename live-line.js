(() => {
  const video = document.getElementById('live-line-video');
  const stage = document.getElementById('live-line-stage');
  if (!video || !stage) return;
  const start = document.getElementById('live-line-start');
  const stop = document.getElementById('live-line-stop');
  const mode = document.getElementById('live-line-mode');
  const mirror = document.getElementById('live-line-mirror');
  const guides = document.getElementById('live-line-guides');
  const status = document.getElementById('live-line-status');
  const feedback = document.getElementById('live-line-feedback');
  let stream = null;
  function stopCamera(message = 'Camera stopped. Your practice video was not recorded or uploaded.') {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    stage.classList.remove('is-active');
    start.disabled = false;
    stop.disabled = true;
    status.textContent = 'CAMERA OFF';
    status.classList.remove('is-live');
    feedback.textContent = message;
  }
  start.addEventListener('click', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      feedback.textContent = 'Live camera access is unavailable here. Open the app in a modern browser over HTTPS and try again.';
      return;
    }
    start.disabled = true;
    feedback.textContent = 'Waiting for camera permission…';
    try {
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
      video.srcObject = stream;
      await video.play();
      stage.classList.add('is-active');
      stop.disabled = false;
      status.textContent = 'LIVE GUIDE ON';
      status.classList.add('is-live');
      feedback.textContent = 'Live view is ready. Choose a guide mode and practise slowly within a comfortable range.';
    } catch (error) {
      stopCamera(error && error.name === 'NotAllowedError' ? 'Camera permission was not granted. You can allow it in your browser site settings.' : 'Could not start the camera. Check that it is available and try again.');
      start.disabled = false;
    }
  });
  stop.addEventListener('click', () => stopCamera());
  mode.addEventListener('change', () => {
    guides.className = 'live-line-guides guide-' + mode.value;
    feedback.textContent = 'Guide changed to ' + mode.options[mode.selectedIndex].text + '. Use it as a visual reference, not a measurement.';
  });
  mirror.addEventListener('click', () => {
    const on = mirror.getAttribute('aria-pressed') !== 'true';
    mirror.setAttribute('aria-pressed', String(on));
    mirror.textContent = 'Mirror: ' + (on ? 'on' : 'off');
    stage.classList.toggle('is-mirrored', on);
  });
  stage.classList.add('is-mirrored');
  window.addEventListener('pagehide', () => stopCamera('Camera stopped when you left this page.'));
})();