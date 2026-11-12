// Smoothly tracks pointer position for the 600px radial spotlight.
export function initSpotlight() {
  const el = document.getElementById('spotlight');
  if (!el) return;

  let targetX = window.innerWidth * 0.5;
  let targetY = window.innerHeight * 0.25;
  let curX = targetX;
  let curY = targetY;
  let raf = 0;

  const update = () => {
    curX += (targetX - curX) * 0.08;
    curY += (targetY - curY) * 0.08;
    el.style.setProperty('--mx', `${curX.toFixed(1)}px`);
    el.style.setProperty('--my', `${curY.toFixed(1)}px`);

    if (Math.abs(targetX - curX) > 0.3 || Math.abs(targetY - curY) > 0.3) {
      raf = requestAnimationFrame(update);
    } else {
      raf = 0;
    }
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!raf) raf = requestAnimationFrame(update);
    },
    { passive: true }
  );
}
