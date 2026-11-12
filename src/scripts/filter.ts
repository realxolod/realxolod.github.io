// Pixel filter toy — JS port of the grayscale / box blur filters from the C raster project.
const W = 48;
const H = 30;
const HORIZON = 18;

type RGB = [number, number, number];
type Mode = 'normal' | 'grayscale' | 'blur';

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

// Procedural pixel-art: sunset over mountains with a lake reflection.
function sky(x: number, y: number): RGB {
  let c = mix([22, 20, 44], [242, 132, 84], Math.pow(y / HORIZON, 1.4));

  // stars
  if (y < 7 && (x * 7 + y * 13) % 29 === 0) c = [230, 230, 240];

  // sun with retro stripes
  const dx = x - 30;
  const dy = y - 13;
  if (dx * dx + dy * dy < 30 && !(y > 12 && y % 2 === 0)) c = [255, 206, 120];

  // far mountains
  const m1 = 11 + Math.round(2.5 * Math.sin(x * 0.3) + 1.5 * Math.sin(x * 0.11 + 1));
  if (y > m1) c = [74, 46, 72];

  // near mountains
  const m2 = 14 + Math.round(1.5 * Math.sin(x * 0.45 + 2) + Math.sin(x * 0.2));
  if (y > m2) c = [34, 26, 44];

  return c;
}

function pixel(x: number, y: number): RGB {
  if (y < HORIZON) return sky(x, y);
  // lake: darkened, blue-tinted mirror of the sky
  const ry = HORIZON - (y - HORIZON) - 1;
  let c = mix(sky(x, Math.max(0, ry)), [18, 24, 48], 0.45);
  const depth = y - HORIZON;
  if (Math.abs(x - 30) < 5 - depth * 0.35 && (x + y) % 3 === 0) c = [236, 170, 104];
  if ((x * 5 + y * 11) % 23 === 0) c = mix(c, [255, 255, 255], 0.15);
  return c;
}

function buildSource(): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = pixel(x, y);
      const i = (y * W + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

function grayscale(src: Uint8ClampedArray, t: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    // same integer luma as in C: (77*r + 150*g + 29*b) >> 8
    const luma = (77 * r + 150 * g + 29 * b) >> 8;
    out[i] = r + (luma - r) * t;
    out[i + 1] = g + (luma - g) * t;
    out[i + 2] = b + (luma - b) * t;
    out[i + 3] = 255;
  }
  return out;
}

function boxBlur(src: Uint8ClampedArray, r: number): Uint8ClampedArray {
  if (r < 1) return src.slice();
  const n = 2 * r + 1;
  const tmp = new Uint8ClampedArray(src.length);
  const out = new Uint8ClampedArray(src.length);
  const clamp = (v: number, max: number) => (v < 0 ? 0 : v > max ? max : v);

  // horizontal pass
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let R = 0, G = 0, B = 0;
      for (let k = -r; k <= r; k++) {
        const i = (y * W + clamp(x + k, W - 1)) * 4;
        R += src[i]; G += src[i + 1]; B += src[i + 2];
      }
      const o = (y * W + x) * 4;
      tmp[o] = R / n; tmp[o + 1] = G / n; tmp[o + 2] = B / n; tmp[o + 3] = 255;
    }
  }
  // vertical pass
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let R = 0, G = 0, B = 0;
      for (let k = -r; k <= r; k++) {
        const i = (clamp(y + k, H - 1) * W + x) * 4;
        R += tmp[i]; G += tmp[i + 1]; B += tmp[i + 2];
      }
      const o = (y * W + x) * 4;
      out[o] = R / n; out[o + 1] = G / n; out[o + 2] = B / n; out[o + 3] = 255;
    }
  }
  return out;
}

export function initFilterToy() {
  const canvas = document.getElementById('filter-canvas') as HTMLCanvasElement | null;
  const slider = document.getElementById('filter-intensity') as HTMLInputElement | null;
  const opLabel = document.getElementById('filter-op');
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filter]'));
  if (!canvas || !slider || !opLabel) return;

  const c2d = canvas.getContext('2d');
  if (!c2d) return;

  const source = buildSource();
  let mode: Mode = 'normal';

  const render = () => {
    const t = Number(slider.value) / 100;
    let out: Uint8ClampedArray;

    if (mode === 'grayscale') {
      out = grayscale(source, t);
      opLabel.textContent = `grayscale(${t.toFixed(2)})`;
    } else if (mode === 'blur') {
      const r = Math.round(t * 3);
      out = boxBlur(source, r);
      opLabel.textContent = `box_blur(r=${r})`;
    } else {
      out = source;
      opLabel.textContent = 'normal()';
    }

    c2d.putImageData(new ImageData(out, W, H), 0, 0);
    slider.disabled = mode === 'normal';

    buttons.forEach((btn) => {
      const active = btn.dataset.filter === mode;
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('bg-zinc-100', active);
      btn.classList.toggle('text-zinc-900', active);
      btn.classList.toggle('text-zinc-400', !active);
      btn.classList.toggle('hover:text-zinc-100', !active);
    });
  };

  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      mode = btn.dataset.filter as Mode;
      render();
    })
  );
  slider.addEventListener('input', render);
  render();
}
