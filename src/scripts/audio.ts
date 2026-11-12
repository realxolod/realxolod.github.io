// Shared AudioContext + optional micro-click sounds.
let ctx: AudioContext | null = null;
const STORAGE_KEY = 'sound';

export function getCtx(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

export function isSoundOn(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== 'off';
}

function blip(freq: number, dur: number, vol: number) {
  if (!isSoundOn() || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function initClickSounds() {
  // Browsers only allow audio after a user gesture: unlock on first pointerdown.
  window.addEventListener(
    'pointerdown',
    () => {
      getCtx().resume();
    },
    { once: true }
  );

  document.querySelectorAll<HTMLElement>('[data-click]').forEach((el) => {
    el.addEventListener('pointerenter', () => blip(2600, 0.025, 0.012));
    el.addEventListener('pointerdown', () => {
      getCtx().resume().then(() => blip(1500, 0.04, 0.035));
    });
  });

  const toggle = document.getElementById('sound-toggle');
  if (!toggle) return;
  const render = () => {
    const on = isSoundOn();
    toggle.textContent = on ? 'sound: on' : 'sound: off';
    toggle.setAttribute('aria-pressed', String(on));
  };
  toggle.addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, isSoundOn() ? 'off' : 'on');
    render();
  });
  render();
}
