// Pixel filter toy — JS port of the grayscale / box blur filters from the C raster project.
import { playUiClick, setOtherworldStaticLevel } from './audio';

const W = 70;
const H = 35;
const HORIZON = 21;

const SH_W = 160;
const SH_H = 110;
const OUT_W = 280;
const OUT_H = 140;

function upscaleUniform(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const scaledW = Math.round((srcW * dstH) / srcH);
  const xOffset = Math.floor((dstW - scaledW) / 2);

  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(srcH - 1, Math.floor((y * srcH) / dstH));
    for (let x = 0; x < dstW; x++) {
      const sx =
        xOffset <= 0
          ? Math.min(srcW - 1, Math.floor((x * srcW) / dstW))
          : Math.max(0, Math.min(srcW - 1, Math.floor(((x - xOffset) * srcH) / dstH)));
      const si = (sy * srcW + sx) * 4;
      const di = (y * dstW + x) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = 255;
    }
  }
  return dst;
}

function upscaleScene(src: Uint8ClampedArray): Uint8ClampedArray {
  return upscaleUniform(src, SH_W, SH_H, OUT_W, OUT_H);
}

function setOutPx(buf: Uint8ClampedArray, x: number, y: number, r: number, g: number, b: number, a = 1) {
  if (x < 0 || x >= OUT_W || y < 0 || y >= OUT_H || a <= 0) return;
  const i = (y * OUT_W + x) * 4;
  if (a >= 1) {
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
  } else {
    buf[i] = Math.round(buf[i] + (r - buf[i]) * a);
    buf[i + 1] = Math.round(buf[i + 1] + (g - buf[i + 1]) * a);
    buf[i + 2] = Math.round(buf[i + 2] + (b - buf[i + 2]) * a);
  }
}

function enhanceKarolina280(buf: Uint8ClampedArray, tick: number, crtLevel: number) {
  // Moving pixel tram with cyan/amber headlights across full 280px plaza
  const tramX = Math.floor((tick * 1.4) % (OUT_W + 48)) - 36;
  for (let dx = 0; dx < 28; dx++) {
    const tx = tramX + dx;
    setOutPx(buf, tx, 95, 18, 28, 44, 0.9);
    setOutPx(buf, tx, 96, 30, 48, 72, 0.9);
    setOutPx(buf, tx, 97, 15, 23, 42, 0.95);
    if (dx % 4 === 1 && dx < 25) {
      setOutPx(buf, tx, 96, 56, 189, 248, 0.85);
    }
  }
  setOutPx(buf, tramX + 28, 96, 250, 204, 21, 0.95);
  setOutPx(buf, tramX + 29, 96, 254, 240, 138, 0.65);

  // Subtle top-right cyan telemetry bars
  const pulse = 0.45 + 0.35 * Math.sin(tick * 0.12) * crtLevel;
  for (let row = 0; row < 4; row++) {
    const len = 10 + ((tick + row * 7) % 14);
    for (let dx = 0; dx < len; dx++) {
      setOutPx(buf, OUT_W - 8 - dx, 7 + row * 3, 56, 189, 248, pulse);
    }
  }
}

function enhancePoruba280(buf: Uint8ClampedArray, tick: number, fogLevel: number) {
  // Full-width crisp 1px drifting ash across 280x140
  const count = Math.round(28 + fogLevel * 24);
  for (let p = 0; p < count; p++) {
    const speed = 0.28 + (p % 5) * 0.08;
    const py = Math.floor((tick * speed + p * 19) % OUT_H);
    const sway = Math.round(Math.sin(tick * 0.05 + p) * 3);
    const px = ((p * 37 + sway) % OUT_W + OUT_W) % OUT_W;
    setOutPx(buf, px, py, 228, 228, 231, 0.35 + (p % 3) * 0.15);
  }
}

function enhanceRadnice280(buf: Uint8ClampedArray, tick: number, tvLevel: number) {
  // Scrolling yellow/green log-scanner lines on the right side of the 280x140 frame
  const scrollOffset = Math.floor(tick * 0.25);
  for (let row = 0; row < 8; row++) {
    const y = 14 + ((row * 5 + scrollOffset) % 42);
    const isErr = (row + Math.floor(tick / 35)) % 5 === 0;
    const len = 14 + ((row * 9) % 24);
    for (let dx = 0; dx < len; dx++) {
      if (isErr) setOutPx(buf, 228 + dx, y, 250, 204, 21, 0.65 * tvLevel + 0.2);
      else setOutPx(buf, 228 + dx, y, 74, 222, 128, 0.38);
    }
  }
}

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
  const dx = x - 44;
  const dy = y - 15;
  if (dx * dx + dy * dy < 36 && !(y > 14 && y % 2 === 0)) c = [255, 206, 120];

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
  if (Math.abs(x - 44) < 6 - depth * 0.35 && (x + y) % 3 === 0) c = [236, 170, 104];
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

// Precomputed static base layer of Forum Nová Karolina plaza at night (160x110)
let cachedKarolinaBase: Uint8ClampedArray | null = null;

const FORUM_GLYPHS: Record<string, string[]> = {
  F: ['1111', '1000', '1110', '1000', '1000'],
  O: ['0110', '1001', '1001', '1001', '0110'],
  R: ['1110', '1001', '1110', '1010', '1001'],
  U: ['1001', '1001', '1001', '1001', '0110'],
  M: ['10001', '11011', '10101', '10001', '10001'],
};

function buildKarolinaBase(): Uint8ClampedArray {
  if (cachedKarolinaBase) return cachedKarolinaBase;
  const data = new Uint8ClampedArray(SH_W * SH_H * 4);
  const PLAZA_Y = 74;

  const setPx = (x: number, y: number, c: RGB) => {
    if (x < 0 || x >= SH_W || y < 0 || y >= SH_H) return;
    const i = (y * SH_W + x) * 4;
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = 255;
  };

  // 1. Deep night sky (#060913) & subtle horizon glow
  for (let y = 0; y < PLAZA_Y; y++) {
    const t = y / PLAZA_Y;
    const c = mix([6, 9, 19], [14, 24, 42], t * t);
    for (let x = 0; x < SH_W; x++) {
      setPx(x, y, [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])]);
    }
  }

  // 2. Dark cobblestone plaza (y = 74..109) with diverging geometric lines
  for (let y = PLAZA_Y; y < SH_H; y++) {
    const py = (y - PLAZA_Y) / (SH_H - PLAZA_Y);
    for (let x = 0; x < SH_W; x++) {
      // Base dark granite cobblestone
      let c: RGB = mix([14, 20, 34], [9, 13, 22], py);
      // Subtle cobblestone micro-texture
      if ((x * 5 + y * 9) % 7 === 0) c = mix(c, [24, 34, 54], 0.35);

      // Diverging geometric paving lines from vanishing area (x~82, y~73)
      const dx = x - 82;
      const dy = y - 72;
      const slope = dx / Math.max(1, dy);
      const isLine =
        Math.abs(slope + 1.55) < 0.055 ||
        Math.abs(slope + 0.65) < 0.045 ||
        Math.abs(slope - 0.12) < 0.04 ||
        Math.abs(slope - 0.95) < 0.05 ||
        Math.abs(slope - 1.95) < 0.06 ||
        y === 82 ||
        y === 94;

      if (isLine) {
        c = mix(c, [56, 74, 102], 0.55);
      }

      // Warm plaza spill light near Forum entrance (x = 55..118, y = 74..83)
      if (y < 83 && x > 50 && x < 122) {
        const spill = (1 - (y - PLAZA_Y) / 9) * 0.22;
        c = mix(c, [251, 191, 36], Math.max(0, spill));
      }

      setPx(x, y, [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])]);
    }
  }

  // Right foreground stepped concrete planters
  for (let x = 112; x < SH_W; x++) {
    setPx(x, 84, [38, 48, 66]);
    setPx(x, 85, [20, 27, 40]);
    if (x > 118) {
      setPx(x, 88, [34, 44, 62]);
      setPx(x, 89, [16, 22, 34]);
    }
  }

  // 3. Secondary glass-and-concrete office block (left-center background, x = 23..51, y = 41..73)
  for (let y = 41; y < PLAZA_Y; y++) {
    for (let x = 23; x <= 51; x++) {
      const isGlass = x >= 27 && x <= 46 && y >= 43 && y <= 70;
      if (isGlass) {
        const mullion = (x - 27) % 4 === 0 || (y - 43) % 5 === 0;
        let col: RGB = mullion ? [30, 41, 59] : [15, 23, 42];
        const winSeed = (x * 13 + y * 7) % 19;
        if (!mullion && winSeed === 0) col = [56, 189, 248];
        if (!mullion && winSeed === 3) col = [30, 58, 95];
        setPx(x, y, col);
      } else {
        setPx(x, y, [71, 85, 105]);
      }
    }
  }

  // 4. Main Building: Forum Nová Karolina (x = 52..126, y = 34..73)
  // Upper stepped roof block (x = 68..112, y = 30..34)
  for (let y = 30; y < 35; y++) {
    for (let x = 68; x <= 112; x++) {
      setPx(x, y, y === 30 ? [148, 163, 184] : [100, 116, 139]);
    }
  }
  // Massive light-gray concrete front cube (x = 52..114, y = 34..61)
  for (let y = 34; y < 62; y++) {
    for (let x = 52; x <= 114; x++) {
      const panelEdge = (x - 52) % 9 === 0 || (y - 34) % 7 === 0;
      const baseGray = 142 + Math.round(((x - 52) / 62) * 24);
      const v = panelEdge ? baseGray - 14 : baseGray;
      setPx(x, y, [v - 4, v, v + 8]);
    }
  }
  // Receding right glass-and-concrete wing (x = 115..128, y = 35..73)
  for (let y = 35; y < PLAZA_Y; y++) {
    const rightTop = 35 + Math.floor((y > 35 ? 0 : 0) + (y < 42 ? 0 : 0));
    if (y < rightTop) continue;
    for (let x = 115; x <= 128; x++) {
      const mullion = (x - 115) % 3 === 0 || (y - 35) % 5 === 0;
      setPx(x, y, mullion ? [30, 41, 59] : [15, 23, 42]);
    }
  }
  // Glazed ground floor with warm shopfront glow (x = 52..114, y = 62..73)
  for (let y = 62; y < PLAZA_Y; y++) {
    for (let x = 52; x <= 114; x++) {
      const mullion = (x - 52) % 4 === 0 || y === 62 || y === 67;
      if (mullion) {
        setPx(x, y, [22, 30, 46]);
      } else {
        // Warm amber interior shopfront light
        const glow = y > 67 ? 0.85 : 0.55;
        let shopCol: RGB = mix([28, 36, 52], [245, 158, 11], glow);
        if ((x + y) % 5 === 0) shopCol = mix(shopCol, [253, 230, 138], 0.45);
        setPx(x, y, [Math.round(shopCol[0]), Math.round(shopCol[1]), Math.round(shopCol[2])]);
      }
    }
  }
  // Storefront sign accents
  for (let y = 65; y <= 69; y++) {
    for (let x = 55; x <= 60; x++) {
      setPx(x, y, [220, 38, 38]);
    }
    for (let x = 104; x <= 111; x++) {
      setPx(x, y, [185, 28, 28]);
    }
  }

  // 5. Left Glass Office Tower in strong perspective (x = 0..27, y = 0..80)
  for (let y = 0; y < 81; y++) {
    // Right edge tapers slightly inward as it goes down
    const maxRight = Math.round(28 - (y / 81) * 7);
    for (let x = 0; x <= maxRight; x++) {
      const isEdge = x === maxRight;
      const vGrid = (x + Math.floor(y * 0.12)) % 5 === 0;
      const hGrid = (y + Math.floor(x * 0.25)) % 8 === 0;
      if (isEdge || vGrid || hGrid) {
        // Subtle cyan neon reflection on glass tower edge
        setPx(x, y, isEdge ? [56, 189, 248] : [30, 41, 59]);
      } else {
        let col: RGB = [15, 23, 42];
        const winSeed = (x * 17 + y * 11) % 29;
        if (winSeed === 0) col = [56, 189, 248];
        else if (winSeed === 4) col = [245, 158, 11];
        else if (x > maxRight - 4) col = [22, 38, 64]; // FORUM cyan reflection
        setPx(x, y, col);
      }
    }
  }
  // Left ground-floor warm bank lobby + tiny red sign
  for (let y = 66; y < 80; y++) {
    for (let x = 0; x <= 19; x++) {
      if (x % 5 === 0) setPx(x, y, [30, 41, 59]);
      else setPx(x, y, y > 71 ? [120, 92, 48] : [20, 32, 52]);
    }
  }
  setPx(22, 61, [220, 38, 38]);
  setPx(23, 61, [220, 38, 38]);

  // 6. Right Glass Office Tower in strong perspective (x = 136..159, y = 0..84)
  for (let y = 0; y < 85; y++) {
    const minLeft = Math.round(135 + (y / 85) * 6);
    for (let x = minLeft; x < SH_W; x++) {
      const isEdge = x === minLeft;
      const vGrid = (x - Math.floor(y * 0.1)) % 5 === 0;
      const hGrid = (y + Math.floor((SH_W - x) * 0.22)) % 9 === 0;
      if (isEdge || vGrid || hGrid) {
        setPx(x, y, isEdge ? [56, 189, 248] : [30, 41, 59]);
      } else {
        let col: RGB = [15, 23, 42];
        const winSeed = (x * 19 + y * 13) % 31;
        if (winSeed === 0) col = [56, 189, 248];
        else if (winSeed === 7) col = [30, 58, 95];
        else if (x < minLeft + 4) col = [24, 42, 70]; // FORUM cyan reflection
        setPx(x, y, col);
      }
    }
  }
  // Small KB sign protruding from right tower (x = 133..139, y = 55..61)
  for (let y = 55; y <= 61; y++) {
    for (let x = 133; x <= 139; x++) {
      setPx(x, y, y === 57 ? [220, 38, 38] : [203, 213, 225]);
    }
  }

  // 7. Thin black lampposts on the plaza (x = 46, x = 102, x = 130)
  const drawPole = (px: number, topY: number, botY: number) => {
    for (let y = topY; y <= botY; y++) {
      setPx(px, y, [8, 11, 18]);
    }
    // Crossbar
    setPx(px - 1, topY + 1, [15, 23, 42]);
    setPx(px + 1, topY + 1, [15, 23, 42]);
  };
  drawPole(46, 61, 80);
  drawPole(102, 60, 84);
  drawPole(130, 58, 86);

  cachedKarolinaBase = data;
  return data;
}

// Live 160x110 frame generator for Forum Nová Karolina // Night 1997 (OK Computer mode)
function buildKarolinaFrame(tick: number, crtLevel = 1): Uint8ClampedArray {
  const out = buildKarolinaBase().slice();

  const blendPx = (x: number, y: number, c: RGB, alpha: number) => {
    if (x < 0 || x >= SH_W || y < 0 || y >= SH_H || alpha <= 0) return;
    const a = Math.min(1, alpha);
    const i = (y * SH_W + x) * 4;
    out[i] = Math.round(out[i] + (c[0] - out[i]) * a);
    out[i + 1] = Math.round(out[i + 1] + (c[1] - out[i + 1]) * a);
    out[i + 2] = Math.round(out[i + 2] + (c[2] - out[i + 2]) * a);
  };

  // Twinkling stars
  const stars = [
    { x: 38, y: 6, phase: 0.2 },
    { x: 54, y: 12, phase: 1.5 },
    { x: 73, y: 5, phase: 2.8 },
    { x: 96, y: 9, phase: 4.1 },
    { x: 118, y: 14, phase: 0.9 },
    { x: 127, y: 4, phase: 3.4 },
    { x: 44, y: 21, phase: 5.0 },
  ];
  for (const s of stars) {
    const twinkle = 0.45 + 0.55 * Math.sin(tick * 0.22 + s.phase);
    blendPx(s.x, s.y, [186, 230, 253], twinkle);
  }

  // Neon "FORUM" sign with slider-controlled glitch intensity + occasional ~9s single-frame glitch
  const periodicGlitch = tick > 0 && tick % 82 === 0;
  const glitchDip =
    periodicGlitch
      ? 0.58
      : crtLevel > 0.25 && (tick * 13) % 37 === 0
        ? 1 - 0.55 * crtLevel
        : 1.0;
  const glitchXOffset = periodicGlitch ? 1 : 0;
  const neonPulse = (0.88 + 0.12 * Math.sin(tick * 0.14)) * glitchDip;
  const logoX = 81 + glitchXOffset;
  const logoY = 39;
  // Geometric 4-square interlocking emblem
  const logoPattern = [
    '1110111',
    '1010101',
    '1111111',
    '0010100',
    '1111111',
    '1010101',
    '1110111',
  ];
  for (let ly = 0; ly < logoPattern.length; ly++) {
    for (let lx = 0; lx < logoPattern[ly].length; lx++) {
      if (logoPattern[ly][lx] === '1') {
        blendPx(logoX + lx, logoY + ly, [56, 189, 248], 0.92 * neonPulse);
      }
    }
  }

  // Crisp "FORUM" pixel letters next to logo (x = 90..112, y = 40..44)
  const word = 'FORUM';
  let cursorX = 90 + glitchXOffset;
  for (const ch of word) {
    const glyph = FORUM_GLYPHS[ch];
    if (!glyph) continue;
    const w = glyph[0].length;
    for (let gy = 0; gy < glyph.length; gy++) {
      for (let gx = 0; gx < w; gx++) {
        if (glyph[gy][gx] === '1') {
          const px = cursorX + gx;
          const py = 40 + gy;
          // Soft cold neon halo
          blendPx(px - 1, py, [56, 189, 248], 0.22 * neonPulse);
          blendPx(px + 1, py, [56, 189, 248], 0.22 * neonPulse);
          blendPx(px, py - 1, [56, 189, 248], 0.2 * neonPulse);
          blendPx(px, py + 1, [56, 189, 248], 0.2 * neonPulse);
          // Bright ice-cyan core
          blendPx(px, py, [186, 230, 253], 0.96 * neonPulse);
        }
      }
    }
    cursorX += w + 1;
  }

  // 3. Cold white-blue lamppost glows
  const lamps = [
    { x: 46, y: 61 },
    { x: 102, y: 60 },
    { x: 130, y: 58 },
  ];
  for (const lamp of lamps) {
    blendPx(lamp.x, lamp.y, [224, 242, 254], 1.0);
    blendPx(lamp.x - 1, lamp.y, [125, 211, 252], 0.75);
    blendPx(lamp.x + 1, lamp.y, [125, 211, 252], 0.75);
    blendPx(lamp.x, lamp.y - 1, [56, 189, 248], 0.45);
    blendPx(lamp.x, lamp.y + 1, [56, 189, 248], 0.45);
  }

  // 4. Tiny pixel silhouettes of sparse pedestrians on the plaza
  const p1x = Math.floor((34 + tick * 0.25) % 90) + 28;
  const p2x = 112 - Math.floor((tick * 0.18) % 55);
  const drawPerson = (px: number, py: number) => {
    blendPx(px, py - 3, [6, 9, 19], 0.95); // head
    blendPx(px, py - 2, [6, 9, 19], 0.95); // torso
    blendPx(px, py - 1, [6, 9, 19], 0.95); // legs
    blendPx(px + 1, py, [15, 23, 42], 0.55); // shadow
  };
  drawPerson(p1x, 82);
  drawPerson(p2x, 79);
  drawPerson(64, 77);

  // CRT scanline sheen controlled by slider
  const scanAlpha = 0.03 + crtLevel * 0.16;
  for (let y = 0; y < SH_H; y += 2) {
    for (let x = 0; x < SH_W; x++) {
      blendPx(x, y, [4, 7, 15], scanAlpha);
    }
  }

  return out;
}

// 5x7 pixel font for rooftop "VŠB-TUO" sign (with háček on Š)
const VSB_GLYPHS: Record<string, string[]> = {
  V: [
    '10001',
    '10001',
    '10001',
    '10001',
    '01010',
    '01010',
    '00100',
  ],
  S: [
    '01010', // háček row 1
    '00100', // háček row 2
    '00000',
    '01111',
    '10000',
    '01110',
    '00001',
    '10001',
    '01110',
  ],
  B: [
    '11110',
    '10001',
    '10001',
    '11110',
    '10001',
    '10001',
    '11110',
  ],
  '-': [
    '00000',
    '00000',
    '00000',
    '11111',
    '00000',
    '00000',
    '00000',
  ],
  T: [
    '11111',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
  ],
  U: [
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '01110',
  ],
  O: [
    '01110',
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '01110',
  ],
};

// Precomputed static base layer of VŠB-TUO Rectorate in Ostrava-Poruba (160x110)
let cachedPorubaBase: Uint8ClampedArray | null = null;

function getRoofY(x: number): number {
  // Perspective slope matching the photo: left x=12 at y=50 rising to right x=142 at y=18
  return Math.round(50 - ((x - 12) / 130) * 32);
}

function buildPorubaBase(): Uint8ClampedArray {
  if (cachedPorubaBase) return cachedPorubaBase;
  const data = new Uint8ClampedArray(SH_W * SH_H * 4);

  const setPx = (x: number, y: number, c: RGB) => {
    if (x < 0 || x >= SH_W || y < 0 || y >= SH_H) return;
    const i = (y * SH_W + x) * 4;
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = 255;
  };

  // 1. Heavy ashen-gray foggy sky (#18181B -> #27272A) & frosted campus lawn
  for (let y = 0; y < SH_H; y++) {
    for (let x = 0; x < SH_W; x++) {
      if (y < 85) {
        const t = y / 85;
        const dither = ((x + y) % 2 === 0 ? 1 : -1) * 1.2;
        const c = mix([24, 24, 27], [46, 48, 52], t * t);
        setPx(x, y, [
          Math.max(0, Math.min(255, Math.round(c[0] + dither))),
          Math.max(0, Math.min(255, Math.round(c[1] + dither))),
          Math.max(0, Math.min(255, Math.round(c[2] + dither))),
        ]);
      } else {
        // Frosted Poruba lawn in foreground (y = 85..109)
        const gy = (y - 85) / 25;
        let grass = mix([32, 37, 35], [17, 20, 20], gy);
        const hash = (x * 37 + y * 13 + (x ^ y) * 7) % 19;
        if (hash === 0 && y < 104) {
          grass = mix(grass, [90, 96, 98], 0.45); // frosty grass patch
        } else if (hash === 3) {
          grass = mix(grass, [14, 16, 16], 0.35);
        }
        setPx(x, y, [Math.round(grass[0]), Math.round(grass[1]), Math.round(grass[2])]);
      }
    }
  }

  // 2. Distant bare autumn trees on far left & right horizon
  for (let x = 0; x < SH_W; x++) {
    if (x < 18 || x > 144) {
      const treeTop = 64 + Math.round(4 * Math.sin(x * 0.7) + 2 * Math.cos(x * 1.9));
      for (let y = treeTop; y < 85; y++) {
        if ((x + y) % 2 === 0 || y > treeTop + 4) {
          setPx(x, y, [28, 30, 33]);
        }
      }
    }
  }

  // 3. VŠB-TUO Rectorate 9-story building in perspective (x = 12..149)
  // Right receding light-concrete side wall (x = 143..149)
  for (let x = 143; x <= 149; x++) {
    const sideTop = 18 + Math.round((x - 142) * 1.1);
    for (let y = sideTop; y <= 85; y++) {
      const isRecess = x === 146 || x === 147;
      setPx(x, y, isRecess ? [36, 40, 42] : [96, 100, 102]);
    }
  }

  // Main 9-story bog-teal facade (x = 12..142)
  for (let x = 12; x <= 142; x++) {
    const rY = getRoofY(x);
    const bY = 85;
    const height = bY - rY;
    const xRatio = (x - 12) / 130;

    // Top concrete roof trim & right vertical concrete edge
    setPx(x, rY, [118, 122, 124]);
    setPx(x, rY + 1, [88, 94, 96]);

    for (let y = rY + 2; y <= bY; y++) {
      if (x >= 141) {
        setPx(x, y, [112, 116, 118]);
        continue;
      }

      // 9 floors along the perspective height
      const relY = (y - (rY + 2)) / Math.max(1, height - 3);
      const floorFloat = relY * 9;
      const floorIdx = Math.floor(floorFloat);
      const inFloorY = floorFloat - floorIdx;

      // Vertical window bays (wider on the right due to perspective)
      const bayPeriod = x < 60 ? 3 : 4;
      const isMullion = (x - 13) % bayPeriod === 0;
      const isSpandrel = inFloorY < 0.34 || floorIdx >= 9;

      // Muted dark teal / bog-green facade panels
      const tealBase: RGB = mix([24, 58, 54], [36, 86, 78], xRatio * 0.85);

      if (isSpandrel || isMullion) {
        const shade = isMullion ? 0.88 : 1.0;
        setPx(x, y, [
          Math.round(tealBase[0] * shade),
          Math.round(tealBase[1] * shade),
          Math.round(tealBase[2] * shade),
        ]);
      } else {
        // Window pane: mostly dark slate with occasional pale blinds
        const winSeed = (Math.floor(x / bayPeriod) * 31 + floorIdx * 17) % 23;
        if (winSeed === 0 || winSeed === 5) {
          setPx(x, y, [62, 78, 82]); // pale closed blind
        } else if (winSeed === 2 || winSeed === 11) {
          setPx(x, y, [34, 48, 52]); // medium reflection
        } else {
          setPx(x, y, [18, 26, 30]); // dark window glass
        }
      }
    }
  }

  // 4. Protruding Main Entrance Canopy & Dark Winged Bas-Relief (x = 53..111, y = 69..85)
  // Dark right side of canopy (x = 104..111, y = 70..85)
  for (let y = 70; y <= 85; y++) {
    for (let x = 104; x <= 111; x++) {
      setPx(x, y, y < 79 ? [26, 42, 42] : [16, 22, 24]);
    }
  }
  // Recessed glass ground entrance under canopy (x = 54..103, y = 79..85)
  for (let y = 79; y <= 85; y++) {
    for (let x = 54; x <= 103; x++) {
      const isPillar = x === 55 || x === 66 || x === 78 || x === 91 || x === 102;
      setPx(x, y, isPillar ? [92, 96, 98] : [15, 19, 22]);
    }
  }
  // Low concrete wall on left of entrance (x = 12..53, y = 83..85)
  for (let y = 83; y <= 85; y++) {
    for (let x = 12; x <= 53; x++) {
      setPx(x, y, [78, 82, 84]);
    }
  }
  // Light concrete protruding fascia (x = 53..103, y = 69..78)
  for (let y = 69; y <= 78; y++) {
    for (let x = 53; x <= 103; x++) {
      const isSeam = (x - 53) % 8 === 0;
      const tone = x > 82 ? 128 : 112;
      const v = isSeam ? tone - 14 : tone;
      setPx(x, y, [v, v + 2, v + 4]);
    }
  }
  // Iconic dark brutalist winged bas-relief sculpture (x = 58..85, y = 70..84)
  for (let x = 58; x <= 85; x++) {
    const dist = Math.abs(x - 70);
    const topY = 71 + Math.floor(dist / 6);
    const botY = 77 - Math.floor(dist / 3.2);
    for (let y = topY; y <= botY; y++) {
      const isRib = x % 2 === 0;
      setPx(x, y, isRib ? [24, 22, 24] : [46, 42, 44]);
    }
  }
  // Central vertical relief column reaching down to entrance
  for (let y = 71; y <= 84; y++) {
    setPx(69, y, [18, 16, 18]);
    setPx(70, y, [32, 28, 30]);
    setPx(71, y, [18, 16, 18]);
  }

  // Pine silhouettes and bare branches
  const drawPine = (cx: number, topY: number, baseY: number, maxHalfW: number, col: RGB) => {
    for (let y = topY; y <= baseY; y++) {
      const p = (y - topY) / Math.max(1, baseY - topY);
      // Layered pine boughs
      const tier = ((y - topY) % 5) / 5;
      const hw = Math.round((p * maxHalfW) * (0.65 + 0.35 * tier));
      for (let x = cx - hw; x <= cx + hw; x++) {
        const edge = Math.abs(x - cx) >= hw - 1;
        if (!edge || (x + y) % 2 === 0) {
          setPx(x, y, col);
        }
      }
      // Trunk at bottom
      if (p > 0.78 && Math.abs(xClamp(cx) - cx) <= 1) {
        setPx(cx, y, [18, 16, 16]);
      }
    }
  };
  const xClamp = (x: number) => Math.max(0, Math.min(SH_W - 1, x));

  // Left pine cluster (x = 4..44)
  drawPine(7, 38, 85, 8, [14, 20, 19]);
  drawPine(21, 44, 84, 7, [18, 25, 23]);
  drawPine(36, 47, 84, 6, [16, 23, 22]);

  // Right tall conifer & bare branches + low sprawling foreground bush (x = 96..158)
  drawPine(124, 34, 86, 11, [16, 23, 21]);
  drawPine(137, 42, 87, 9, [20, 27, 24]);

  // Bare lacy branches on far right (x = 143..158, y = 26..85)
  for (let y = 28; y <= 85; y++) {
    for (let x = 144; x < SH_W; x++) {
      if ((x * 7 + y * 11) % 13 === 0 || (x - y) % 9 === 0) {
        setPx(x, y, [22, 24, 26]);
      }
    }
  }

  // Wide low sprawling juniper/pine bush in right foreground (x = 96..156, y = 73..93)
  for (let y = 73; y <= 93; y++) {
    for (let x = 96; x <= 156; x++) {
      const dx = (x - 128) / 30;
      const dy = (y - 84) / 10;
      const wave = 0.18 * Math.sin(x * 0.45) + 0.12 * Math.cos(y * 0.8);
      if (dx * dx + dy * dy + wave < 0.95) {
        const shade = (x + y * 3) % 5 === 0 ? [28, 36, 30] : [15, 20, 18];
        setPx(x, y, shade as RGB);
      }
    }
  }

  cachedPorubaBase = data;
  return data;
}

// Live 160x110 frame generator for VŠB-TUO in Silent Hill Otherworld fog
function buildPorubaFrame(tick: number, fogLevel = 1): Uint8ClampedArray {
  const out = buildPorubaBase().slice();

  const blendPx = (x: number, y: number, c: RGB, alpha: number) => {
    if (x < 0 || x >= SH_W || y < 0 || y >= SH_H || alpha <= 0) return;
    const a = Math.min(1, alpha);
    const i = (y * SH_W + x) * 4;
    out[i] = Math.round(out[i] + (c[0] - out[i]) * a);
    out[i + 1] = Math.round(out[i + 1] + (c[1] - out[i + 1]) * a);
    out[i + 2] = Math.round(out[i + 2] + (c[2] - out[i + 2]) * a);
  };

  // 1. Eerie flickering cold fluorescent lights in a few VŠB-TUO windows
  const litWindows = [
    { x: 62, y: 46, phase: 0.4 },
    { x: 86, y: 39, phase: 1.9 },
    { x: 106, y: 34, phase: 3.1 },
    { x: 118, y: 45, phase: 4.7 },
    { x: 50, y: 55, phase: 2.5 },
  ];
  for (const w of litWindows) {
    const flicker = Math.sin(tick * 0.25 + w.phase) + 0.4 * Math.cos(tick * 0.9 + w.phase * 2);
    if (flicker > -0.3) {
      const intensity = flicker > 0.6 ? 0.85 : 0.45;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          blendPx(w.x + dx, w.y + dy, [186, 214, 228], intensity);
        }
      }
    }
  }

  // 2. Rooftop "VŠB-TUO" sign in blood-red / rusty-amber (#DC2626) following the roofline
  const label = 'VSB-TUO';
  const startX = 76;
  const charSpacing = 7;

  // Fluorescent tube stutter effect
  const tubeRoll = Math.sin(tick * 0.31) * Math.cos(tick * 0.73);
  const globalSignBright = tubeRoll < -0.78 ? 0.35 : tubeRoll < -0.55 ? 0.68 : 1.0;

  for (let cIdx = 0; cIdx < label.length; cIdx++) {
    const ch = label[cIdx];
    const glyph = VSB_GLYPHS[ch];
    if (!glyph) continue;
    const cx = startX + cIdx * charSpacing;
    const baseRoofY = getRoofY(cx + 2);
    const topY = baseRoofY - glyph.length - 1;

    // Individual letter micro-flicker (e.g. 'Š' or 'U' faulty ballast)
    let charBright = globalSignBright;
    if (cIdx === 1 && (tick + 11) % 23 === 0) charBright *= 0.35;
    if (cIdx === 5 && (tick + 7) % 29 === 0) charBright *= 0.4;

    // Support struts on roof
    blendPx(cx + 1, baseRoofY - 1, [45, 45, 50], 0.8);
    blendPx(cx + 3, baseRoofY - 1, [45, 45, 50], 0.8);

    for (let gy = 0; gy < glyph.length; gy++) {
      const row = glyph[gy];
      for (let gx = 0; gx < row.length; gx++) {
        if (row[gx] === '1') {
          const px = cx + gx;
          const py = topY + gy + Math.round(((2 - gx) * 32) / 130);
          // Soft blood-red halo in the fog around each lit pixel
          blendPx(px - 1, py, [153, 27, 27], 0.28 * charBright);
          blendPx(px + 1, py, [153, 27, 27], 0.28 * charBright);
          blendPx(px, py - 1, [153, 27, 27], 0.25 * charBright);
          blendPx(px, py + 1, [153, 27, 27], 0.25 * charBright);
          // Core #DC2626 pixel with hot amber-red center
          const coreCol: RGB = charBright > 0.85 ? [228, 46, 42] : [185, 28, 28];
          blendPx(px, py, coreCol, 0.95 * charBright);
        }
      }
    }
  }

  // 3. Two independent drifting multi-layered fog banks in front of VŠB-TUO
  // Periodic dense wave that nearly obscures the building & sign, then parts
  const surge = 0.5 + 0.5 * Math.sin(tick * 0.08);
  const fogScale = 0.28 + fogLevel * 0.85;
  const shift1 = tick * 0.85;
  const shift2 = -tick * 1.35;

  for (let y = 6; y < SH_H; y++) {
    const vertBand = y > 20 && y < 92 ? 1.0 : 0.65;
    for (let x = 0; x < SH_W; x++) {
      const n1 =
        Math.sin((x + shift1) * 0.055 + y * 0.07) *
        Math.cos((x + shift1 * 0.6) * 0.032 - y * 0.05);
      const n2 =
        Math.sin((x - shift2) * 0.09 - y * 0.08 + 1.7) *
        Math.cos((x + shift2 * 0.4) * 0.06 + y * 0.09);

      const combined = (n1 * 0.58 + n2 * 0.42 + 1) * 0.5;
      const density =
        Math.max(0, combined - 0.22) * (0.42 + 0.48 * surge) * vertBand * fogScale;

      const bayer = ((x & 1) * 2 + (y & 1)) * 0.035;
      const alpha = Math.min(0.88, Math.max(0, density + bayer - 0.03));

      if (alpha > 0.04) {
        const fogCol: RGB = y < 55 ? [118, 122, 128] : [136, 140, 146];
        blendPx(x, y, fogCol, alpha);
      }
    }
  }

  // 4. Slowly falling & swaying gray ash particles
  for (let p = 0; p < 28; p++) {
    const speed = 0.35 + (p % 4) * 0.12;
    const py = Math.floor((tick * speed + p * 17) % SH_H);
    const sway = Math.round(Math.sin(tick * 0.12 + p * 2.1) * 2.5);
    const px = (p * 23 + sway + SH_W) % SH_W;
    const ashCol: RGB = p % 3 === 0 ? [184, 188, 194] : [132, 136, 142];
    blendPx(px, py, ashCol, 0.78);
  }

  return out;
}

function grayscale(src: Uint8ClampedArray, t: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    const luma = (77 * r + 150 * g + 29 * b) >> 8;
    out[i] = Math.round(r * (1 - t) + luma * t);
    out[i + 1] = Math.round(g * (1 - t) + luma * t);
    out[i + 2] = Math.round(b * (1 - t) + luma * t);
    out[i + 3] = 255;
  }
  return out;
}

function boxBlur(src: Uint8ClampedArray, r: number, width = W, height = H): Uint8ClampedArray {
  if (r < 1) return src.slice();
  const n = 2 * r + 1;
  const tmp = new Uint8ClampedArray(src.length);
  const out = new Uint8ClampedArray(src.length);
  const clamp = (v: number, max: number) => (v < 0 ? 0 : v > max ? max : v);

  // horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let R = 0, G = 0, B = 0;
      for (let k = -r; k <= r; k++) {
        const i = (y * width + clamp(x + k, width - 1)) * 4;
        R += src[i]; G += src[i + 1]; B += src[i + 2];
      }
      const o = (y * width + x) * 4;
      tmp[o] = R / n; tmp[o + 1] = G / n; tmp[o + 2] = B / n; tmp[o + 3] = 255;
    }
  }
  // vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let R = 0, G = 0, B = 0;
      for (let k = -r; k <= r; k++) {
        const i = (clamp(y + k, height - 1) * width + x) * 4;
        R += tmp[i]; G += tmp[i + 1]; B += tmp[i + 2];
      }
      const o = (y * width + x) * 4;
      out[o] = R / n; out[o + 1] = G / n; out[o + 2] = B / n; out[o + 3] = 255;
    }
  }
  return out;
}

function isOstravaNight(): boolean {
  try {
    const hr = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Prague',
        hour: '2-digit',
        hour12: false,
      }).format(new Date())
    );
    return hr >= 22 || hr < 5;
  } catch {
    return false;
  }
}

// Precomputed static silhouette mask + building colors of Nová radnice Ostrava (160x110)
let cachedRadniceBase: Uint8ClampedArray | null = null;

function buildRadniceBase(): Uint8ClampedArray {
  if (cachedRadniceBase) return cachedRadniceBase;
  // RGBA buffer where A=0 means sky/fog, A=255 means building
  const data = new Uint8ClampedArray(SH_W * SH_H * 4);

  const setPx = (x: number, y: number, c: RGB) => {
    if (x < 0 || x >= SH_W || y < 0 || y >= SH_H) return;
    const i = (y * SH_W + x) * 4;
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = 255;
  };

  const fillRect = (x0: number, y0: number, x1: number, y1: number, c: RGB) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        setPx(x, y, c);
      }
    }
  };

  // 1. Symmetrical left & right horizontal wings
  fillRect(10, 62, 55, 83, [34, 30, 24]);
  fillRect(105, 62, 150, 83, [34, 30, 24]);
  // Dark roof trim on wings
  fillRect(10, 59, 55, 61, [20, 18, 16]);
  fillRect(105, 59, 150, 61, [20, 18, 16]);

  // Wing window grids
  for (let wy = 65; wy <= 78; wy += 5) {
    for (let wx = 14; wx <= 51; wx += 5) {
      fillRect(wx, wy, wx + 2, wy + 2, [22, 20, 18]);
    }
    for (let wx = 109; wx <= 146; wx += 5) {
      fillRect(wx, wy, wx + 2, wy + 2, [22, 20, 18]);
    }
  }

  // 2. Central constructivist portico (x = 55..105, y = 49..83)
  fillRect(55, 49, 105, 83, [48, 43, 34]);
  fillRect(54, 48, 106, 49, [62, 55, 43]);

  // 4 rooftop statues on portico cornice
  for (const sx of [64, 73, 87, 96]) {
    fillRect(sx, 44, sx + 1, 47, [44, 68, 60]);
  }

  // 4 tall vertical portico windows
  for (const wx of [61, 70, 87, 96]) {
    fillRect(wx, 53, wx + 3, 66, [26, 28, 30]);
    fillRect(wx + 1, 54, wx + 2, 65, [72, 68, 52]);
  }

  // 4 arched ground-floor colonnade bays
  for (const ax of [60, 71, 84, 95]) {
    fillRect(ax, 72, ax + 5, 83, [14, 13, 12]);
    setPx(ax, 72, [48, 43, 34]);
    setPx(ax + 5, 72, [48, 43, 34]);
  }

  // 3. Tall slender verdigris clock tower (x = 73..87, y = 14..48)
  fillRect(74, 16, 86, 48, [38, 64, 57]);
  // Vertical glass/copper ribs
  fillRect(78, 24, 82, 47, [58, 92, 82]);
  fillRect(79, 25, 81, 47, [28, 46, 42]);

  // Overhanging observation gallery near top
  fillRect(71, 14, 89, 16, [28, 48, 43]);
  fillRect(72, 13, 88, 13, [48, 78, 69]);

  // Tiered copper cupola & metal spire
  fillRect(75, 10, 85, 12, [34, 58, 52]);
  fillRect(78, 7, 82, 9, [44, 72, 64]);
  fillRect(80, 3, 80, 6, [74, 108, 96]);

  cachedRadniceBase = data;
  return data;
}

// Live 160x110 frame generator for Nová radnice in Persona 4 Midnight Channel
function buildRadniceFrame(tick: number, tvLevel = 1): Uint8ClampedArray {
  const base = buildRadniceBase();
  const frame = new Uint8ClampedArray(SH_W * SH_H * 4);

  const setPx = (x: number, y: number, c: RGB) => {
    if (x < 0 || x >= SH_W || y < 0 || y >= SH_H) return;
    const i = (y * SH_W + x) * 4;
    frame[i] = c[0];
    frame[i + 1] = c[1];
    frame[i + 2] = c[2];
    frame[i + 3] = 255;
  };

  const blendPx = (x: number, y: number, c: RGB, alpha: number) => {
    if (x < 0 || x >= SH_W || y < 0 || y >= SH_H || alpha <= 0) return;
    const i = (y * SH_W + x) * 4;
    const a = Math.min(1, alpha);
    frame[i] = Math.round(frame[i] * (1 - a) + c[0] * a);
    frame[i + 1] = Math.round(frame[i + 1] * (1 - a) + c[1] * a);
    frame[i + 2] = Math.round(frame[i + 2] * (1 - a) + c[2] * a);
  };

  // 1. Layered mustard-yellow TV World fog (#422006 -> #854D0E)
  const fogShift = tick * 0.7;
  for (let y = 0; y < SH_H; y++) {
    const ty = y / SH_H;
    for (let x = 0; x < SH_W; x++) {
      const wave =
        0.5 +
        0.5 *
          Math.sin((x + fogShift) * 0.06 + y * 0.08) *
          Math.cos((x - fogShift * 0.5) * 0.04 - y * 0.05);
      const baseFog = mix([66, 32, 6], [133, 77, 14], Math.min(1, ty * 0.85 + wave * 0.35));
      setPx(x, y, [Math.round(baseFog[0]), Math.round(baseFog[1]), Math.round(baseFog[2])]);
    }
  }

  // 2. Composite Nová radnice constructivist silhouette over fog
  for (let i = 0; i < frame.length; i += 4) {
    if (base[i + 3] > 0) {
      frame[i] = base[i];
      frame[i + 1] = base[i + 1];
      frame[i + 2] = base[i + 2];
    }
  }

  // 3. Pulsing yellow clock face on the tower (x = 78..82, y = 18..22)
  const clockPulse = 0.72 + 0.28 * Math.sin(tick * 0.22);
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 2.2) {
        blendPx(80 + dx, 20 + dy, [254, 240, 138], 0.95 * clockPulse);
      } else if (d <= 3.6) {
        blendPx(80 + dx, 20 + dy, [250, 204, 21], 0.32 * clockPulse);
      }
    }
  }
  // Clock hands
  setPx(80, 19, [30, 24, 12]);
  setPx(80, 20, [30, 24, 12]);
  setPx(81, 20, [30, 24, 12]);

  // 4. Log Anomaly Scanner stream at bottom (y = 85..103)
  for (let y = 85; y <= 103; y++) {
    for (let x = 6; x <= 153; x++) {
      blendPx(x, y, [9, 9, 11], 0.82);
    }
  }
  const speed = 1 + tvLevel * 1.4;
  const step = Math.floor(tick * speed);
  const anomalyPhase = step % 24;
  const isAnomaly = anomalyPhase >= 14 && anomalyPhase < 20;
  const isFixed = anomalyPhase >= 20;

  for (let row = 0; row < 3; row++) {
    const ry = 88 + row * 5;
    const isTargetRow = row === 1 && (isAnomaly || isFixed);
    const barColor: RGB =
      isTargetRow && isAnomaly
        ? [239, 68, 68]
        : isTargetRow && isFixed
          ? [250, 204, 21]
          : [52, 211, 153];
    const barLen = ((step + row * 7) % 5) * 8 + 44;

    // Timestamp pixel block
    for (let x = 12; x <= 26; x += 2) {
      setPx(x, ry, [161, 161, 170]);
      setPx(x, ry + 1, [161, 161, 170]);
    }
    // Log payload bar
    for (let x = 32; x < 32 + barLen && x < 134; x++) {
      setPx(x, ry, barColor);
      setPx(x, ry + 1, barColor);
    }
    // Status tag [OK] / [ERR] / [FIX]
    for (let x = 138; x <= 146; x++) {
      setPx(x, ry, barColor);
      setPx(x, ry + 1, barColor);
    }

    // Red targeting reticle around SHADOW_ERR anomaly
    if (isTargetRow && isAnomaly) {
      const rx0 = 29;
      const rx1 = 149;
      for (let x = rx0; x <= rx0 + 4; x++) {
        setPx(x, ry - 2, [239, 68, 68]);
        setPx(x, ry + 3, [239, 68, 68]);
      }
      for (let x = rx1 - 4; x <= rx1; x++) {
        setPx(x, ry - 2, [239, 68, 68]);
        setPx(x, ry + 3, [239, 68, 68]);
      }
      for (let y = ry - 2; y <= ry + 3; y++) {
        setPx(rx0, y, [239, 68, 68]);
        setPx(rx1, y, [239, 68, 68]);
      }
    }
  }

  // 5. TV scanlines & static snow controlled by tvLevel slider
  if (tvLevel > 0.05) {
    for (let y = 4; y < SH_H - 4; y++) {
      if (y % 2 === 0) {
        for (let x = 4; x < SH_W - 4; x++) {
          blendPx(x, y, [9, 9, 11], 0.14 * tvLevel);
        }
      }
      if ((y + tick * 3) % 29 === 0) {
        for (let x = 4; x < SH_W - 4; x++) {
          if ((x * 13 + tick * 7) % 5 === 0) {
            blendPx(x, y, [254, 240, 138], 0.28 * tvLevel);
          }
        }
      }
    }
  }

  // 6. Signature Persona 4 diagonal yellow-black hazard border (4px)
  for (let y = 0; y < SH_H; y++) {
    for (let x = 0; x < SH_W; x++) {
      if (x < 4 || x >= SH_W - 4 || y < 4 || y >= SH_H - 4) {
        const stripe = ((x + y) >> 2) % 2 === 0;
        setPx(x, y, stripe ? [250, 204, 21] : [9, 9, 11]);
      }
    }
  }

  return frame;
}

export function initFilterToy() {
  const canvas = document.getElementById('filter-canvas') as HTMLCanvasElement | null;
  const ostravaCanvas = document.getElementById('ostrava-canvas') as HTMLCanvasElement | null;
  const porubaCanvas = document.getElementById('poruba-canvas') as HTMLCanvasElement | null;
  const radniceCanvas = document.getElementById('radnice-canvas') as HTMLCanvasElement | null;
  const slider = document.getElementById('filter-intensity') as HTMLInputElement | null;
  const opLabel = document.getElementById('filter-op');
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filter]'));
  if (!canvas || !ostravaCanvas || !porubaCanvas || !radniceCanvas || !slider || !opLabel) return;

  const c2d = canvas.getContext('2d');
  const ostrava2d = ostravaCanvas.getContext('2d');
  const poruba2d = porubaCanvas.getContext('2d');
  const radnice2d = radniceCanvas.getContext('2d');
  if (!c2d || !ostrava2d || !poruba2d || !radnice2d) return;

  const sunsetSource = buildSource();
  let mode: Mode = 'normal';
  let okMode = false;
  let shMode = false;
  let p4Mode = false;
  let tick = 0;
  let rafId: number | null = null;
  let lastFrameAt = 0;
  let stopFadeTimeout: number | null = null;

  const applyFilter = (
    src: Uint8ClampedArray,
    t: number,
    width = W,
    height = H
  ): Uint8ClampedArray => {
    if (mode === 'grayscale') return grayscale(src, t);
    if (mode === 'blur') {
      const r = Math.round(t * 3);
      return boxBlur(src, r, width, height);
    }
    return src;
  };

  const renderSunset = (nowMs = performance.now()) => {
    const t = Number(slider.value) / 100;
    const base = sunsetSource.slice();

    // Slow twinkling stars (3–4 stars oscillating opacity 0.3..1.0 over several seconds)
    const twinkleStars = [
      { x: 7, y: 2, speed: 0.0014, phase: 0.0 },
      { x: 16, y: 4, speed: 0.0011, phase: 1.7 },
      { x: 29, y: 1, speed: 0.0017, phase: 3.1 },
      { x: 41, y: 3, speed: 0.0012, phase: 4.5 },
    ];
    for (const s of twinkleStars) {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(nowMs * s.speed + s.phase));
      const idx = (s.y * W + s.x) * 4;
      base[idx] = Math.round(base[idx] * (1 - alpha) + 236 * alpha);
      base[idx + 1] = Math.round(base[idx + 1] * (1 - alpha) + 238 * alpha);
      base[idx + 2] = Math.round(base[idx + 2] * (1 - alpha) + 248 * alpha);
    }

    // Night shooting star every 20s between 22:00 and 05:00 Ostrava time
    if (isOstravaNight()) {
      const cycle = nowMs % 20000;
      if (cycle < 900) {
        const p = cycle / 900;
        const sx = Math.round(6 + p * 34);
        const sy = Math.round(1 + p * 7);
        const drawStar = (x: number, y: number, bright: number) => {
          if (x < 0 || x >= W || y < 0 || y >= H) return;
          const idx = (y * W + x) * 4;
          base[idx] = Math.round(240 * bright + base[idx] * (1 - bright));
          base[idx + 1] = Math.round(248 * bright + base[idx + 1] * (1 - bright));
          base[idx + 2] = Math.round(255 * bright + base[idx + 2] * (1 - bright));
        };
        drawStar(sx, sy, 0.95);
        drawStar(sx - 1, sy, 0.45);
      }
    }

    const upscaled = upscaleUniform(base, W, H, OUT_W, OUT_H);
    c2d.putImageData(new ImageData(applyFilter(upscaled, t, OUT_W, OUT_H), OUT_W, OUT_H), 0, 0);
  };

  const renderOstrava = () => {
    const t = Number(slider.value) / 100;
    if (okMode) {
      document.documentElement.style.setProperty('--crt-scan-opacity', (0.35 + t * 0.65).toFixed(2));
    }
    const raw = upscaleScene(buildKarolinaFrame(tick, t));
    enhanceKarolina280(raw, tick, t);
    ostrava2d.putImageData(new ImageData(applyFilter(raw, t, OUT_W, OUT_H), OUT_W, OUT_H), 0, 0);
  };

  const renderPoruba = () => {
    const t = Number(slider.value) / 100;
    if (shMode) {
      setOtherworldStaticLevel(t);
    }
    const raw = upscaleScene(buildPorubaFrame(tick, t));
    enhancePoruba280(raw, tick, t);
    poruba2d.putImageData(new ImageData(applyFilter(raw, t, OUT_W, OUT_H), OUT_W, OUT_H), 0, 0);
  };

  const renderRadnice = () => {
    const t = Number(slider.value) / 100;
    const raw = upscaleScene(buildRadniceFrame(tick, t));
    enhanceRadnice280(raw, tick, t);
    radnice2d.putImageData(new ImageData(applyFilter(raw, t, OUT_W, OUT_H), OUT_W, OUT_H), 0, 0);
  };

  const updateControls = () => {
    const t = Number(slider.value) / 100;
    if (mode === 'grayscale') {
      opLabel.textContent = `grayscale(${t.toFixed(1)})`;
    } else if (mode === 'blur') {
      const r = Math.round(t * 3);
      opLabel.textContent = `box_blur(r=${r})`;
    } else if (p4Mode) {
      opLabel.textContent = `midnight_tv(${Math.round(t * 100)}%)`;
    } else if (shMode) {
      opLabel.textContent = `poruba_fog(${Math.round(t * 100)}%)`;
    } else if (okMode) {
      opLabel.textContent = `karolina_97(${t.toFixed(1)})`;
    } else {
      opLabel.textContent = 'normal()';
    }

    slider.disabled = mode === 'normal' && !okMode && !shMode && !p4Mode;

    buttons.forEach((btn) => {
      const active = btn.dataset.filter === mode;
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('bg-zinc-100', active);
      btn.classList.toggle('text-zinc-900', active);
      btn.classList.toggle('text-zinc-400', !active);
      btn.classList.toggle('hover:text-zinc-100', !active);
    });
  };

  const renderAll = () => {
    renderSunset();
    if (okMode) renderOstrava();
    if (shMode) renderPoruba();
    if (p4Mode) renderRadnice();
    updateControls();
  };

  const stopAnimLoop = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const syncAnimLoop = () => {
    if (stopFadeTimeout !== null) {
      window.clearTimeout(stopFadeTimeout);
      stopFadeTimeout = null;
    }

    stopAnimLoop();
    if (okMode) renderOstrava();
    if (shMode) renderPoruba();
    if (p4Mode) renderRadnice();
    lastFrameAt = performance.now();

    const loop = (now: number) => {
      if (now - lastFrameAt >= 110) {
        lastFrameAt = now;
        tick += 1;
        if (okMode) renderOstrava();
        else if (shMode) renderPoruba();
        else if (p4Mode) renderRadnice();
        else renderSunset(now);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  };

  window.addEventListener('ok-computer-mode', (event: Event) => {
    const custom = event as CustomEvent<{ enabled: boolean }>;
    okMode = Boolean(custom.detail?.enabled);
    if (okMode) {
      shMode = false;
      p4Mode = false;
    }
    updateControls();
    syncAnimLoop();
  });

  window.addEventListener('otherworld-mode', (event: Event) => {
    const custom = event as CustomEvent<{ enabled: boolean }>;
    shMode = Boolean(custom.detail?.enabled);
    if (shMode) {
      okMode = false;
      p4Mode = false;
    }
    updateControls();
    syncAnimLoop();
  });

  window.addEventListener('p4-mode', (event: Event) => {
    const custom = event as CustomEvent<{ enabled: boolean }>;
    p4Mode = Boolean(custom.detail?.enabled);
    if (p4Mode) {
      okMode = false;
      shMode = false;
    }
    updateControls();
    syncAnimLoop();
  });

  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      mode = btn.dataset.filter as Mode;
      playUiClick(1780);
      renderAll();
    })
  );
  slider.addEventListener('input', renderAll);
  renderAll();
  syncAnimLoop();
}
