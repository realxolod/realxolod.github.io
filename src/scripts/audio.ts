// Shared AudioContext, tactile micro-clicks, and pocket-radio static nodes.
let ctx: AudioContext | null = null;
const STORAGE_KEY = 'sound';

let shStaticSource: AudioBufferSourceNode | null = null;
let shStaticFilter: BiquadFilterNode | null = null;
let shStaticGain: GainNode | null = null;
let shStaticLevel = 0;

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
  osc.frequency.exponentialRampToValueAtTime(freq * 0.65, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

// Ultra-quiet 12ms tactile click for filter, language, and mode switches
export function playUiClick(freq = 1650) {
  if (!isSoundOn()) return;
  try {
    getCtx()
      .resume()
      .then(() => blip(freq, 0.012, 0.03));
  } catch {
    // Ignore if Web Audio is blocked
  }
}

// 0.8s filtered white-noise pocket radio static burst for Silent Hill transition.
export function playRadioStaticBurst(durationSec = 0.8) {
  if (!isSoundOn()) return;
  try {
    const audioCtx = getCtx();
    audioCtx.resume().then(() => {
      const sampleRate = audioCtx.sampleRate;
      const frameCount = Math.floor(sampleRate * durationSec);
      const buffer = audioCtx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < frameCount; i++) {
        const sec = i / sampleRate;
        const flutter = 0.55 + 0.45 * Math.sin(sec * 110) * Math.cos(sec * 37);
        const crackle =
          Math.random() < 0.04 ? (Math.random() * 2 - 1) * 1.8 : (Math.random() * 2 - 1) * 0.65;
        data[i] = crackle * flutter;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      const bandpass = audioCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1750, audioCtx.currentTime);
      bandpass.Q.setValueAtTime(2.1, audioCtx.currentTime);

      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.14);
      gain.gain.setValueAtTime(0.06, now + durationSec * 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);

      source.connect(bandpass).connect(gain).connect(audioCtx.destination);
      source.start(now);
      source.stop(now + durationSec + 0.02);
    });
  } catch {
    // Ignore if Web Audio is blocked
  }
}

// Short TV static burst for Persona 4 Midnight Channel transition.
export function playTvStaticBurst(durationSec = 0.35) {
  if (!isSoundOn()) return;
  try {
    const audioCtx = getCtx();
    audioCtx.resume().then(() => {
      const sampleRate = audioCtx.sampleRate;
      const frameCount = Math.floor(sampleRate * durationSec);
      const buffer = audioCtx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < frameCount; i++) {
        data[i] = (Math.random() * 2 - 1) * (0.7 + 0.3 * Math.sin(i * 0.08));
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      const bandpass = audioCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(2400, audioCtx.currentTime);
      bandpass.Q.setValueAtTime(1.2, audioCtx.currentTime);

      const gain = audioCtx.createGain();
      const now = audioCtx.currentTime;
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);

      source.connect(bandpass).connect(gain).connect(audioCtx.destination);
      source.start(now);
      source.stop(now + durationSec + 0.02);
    });
  } catch {
    // Ignore if Web Audio is blocked
  }
}

export function stopOtherworldStatic() {
  if (shStaticSource) {
    try {
      shStaticSource.stop();
      shStaticSource.disconnect();
    } catch {
      // already stopped
    }
    shStaticSource = null;
  }
  if (shStaticFilter) {
    try {
      shStaticFilter.disconnect();
    } catch {
      // ignore
    }
    shStaticFilter = null;
  }
  if (shStaticGain) {
    try {
      shStaticGain.disconnect();
    } catch {
      // ignore
    }
    shStaticGain = null;
  }
}

export function setOtherworldStaticLevel(level: number) {
  shStaticLevel = Math.max(0, Math.min(1, level));
  if (!isSoundOn()) {
    if (shStaticGain && ctx) {
      shStaticGain.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    }
    return;
  }
  if (shStaticGain && ctx) {
    shStaticGain.gain.setTargetAtTime(shStaticLevel * 0.045, ctx.currentTime, 0.05);
  }
}

export function startOtherworldStatic(initialLevel = 1) {
  stopOtherworldStatic();
  shStaticLevel = Math.max(0, Math.min(1, initialLevel));
  if (!isSoundOn()) return;
  try {
    const audioCtx = getCtx();
    audioCtx.resume().then(() => {
      if (!isSoundOn()) return;
      const sampleRate = audioCtx.sampleRate;
      const frameCount = sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        data[i] =
          Math.random() < 0.03 ? (Math.random() * 2 - 1) * 1.4 : (Math.random() * 2 - 1) * 0.4;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, audioCtx.currentTime);
      filter.Q.setValueAtTime(2.6, audioCtx.currentTime);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(shStaticLevel * 0.045, audioCtx.currentTime);

      source.connect(filter).connect(gain).connect(audioCtx.destination);
      source.start();

      shStaticSource = source;
      shStaticFilter = filter;
      shStaticGain = gain;
    });
  } catch {
    // Ignore if Web Audio is blocked
  }
}

export function initClickSounds() {
  window.addEventListener(
    'pointerdown',
    () => {
      getCtx().resume();
    },
    { once: true }
  );

  document.querySelectorAll<HTMLElement>('[data-click]').forEach((el) => {
    el.addEventListener('pointerenter', () => blip(2400, 0.012, 0.01));
    el.addEventListener('pointerdown', () => playUiClick(1550));
  });

  const toggle = document.getElementById('sound-toggle');
  if (!toggle) return;

  const render = () => {
    const on = isSoundOn();
    toggle.textContent = on ? 'sound: on' : 'sound: off';
    toggle.setAttribute('aria-pressed', String(on));
  };

  toggle.addEventListener('click', () => {
    const nextOn = !isSoundOn();
    localStorage.setItem(STORAGE_KEY, nextOn ? 'on' : 'off');
    render();

    if (!nextOn) {
      stopOtherworldStatic();
      if (ctx && ctx.state === 'running') {
        ctx.suspend().catch(() => {});
      }
    } else {
      getCtx()
        .resume()
        .then(() => {
          playUiClick(1800);
          if (document.documentElement.classList.contains('otherworld-mode')) {
            startOtherworldStatic(shStaticLevel);
          }
        })
        .catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('sound-change', { detail: { enabled: nextOn } }));
  });

  render();
}
