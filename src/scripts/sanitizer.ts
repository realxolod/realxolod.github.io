// Interactive turnstile log sanitizer widget.
import { playUiClick } from './audio';

interface LogRow {
  raw: string;
  clean: string;
  state: 'ok' | 'dropped' | 'merged';
}

const ROWS: LogRow[] = [
  { raw: '08:01  IN   [0x01]', clean: '08:01  IN   [OK]', state: 'ok' },
  { raw: '12:30  ERR_NULL', clean: '12:30  DROP (null)', state: 'dropped' },
  { raw: '13:15  IN   (dup)', clean: '13:15  SKIP (dup)', state: 'merged' },
  { raw: '17:45  OUT  [0x01]', clean: '17:45  OUT  [OK]', state: 'ok' },
];

export function initSanitizer() {
  const btn = document.getElementById('log-clean-btn');
  const secretBtn = document.getElementById('p4-secret-indicator');
  const opEl = document.getElementById('log-op');
  const resultEl = document.getElementById('log-result');
  const lineEls = Array.from(document.querySelectorAll<HTMLElement>('[data-log-line]'));

  if (!btn || !opEl || !resultEl || lineEls.length !== ROWS.length) return;

  let cleaned = false;
  let timers: number[] = [];

  const clearTimers = () => {
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
  };

  const renderRaw = () => {
    clearTimers();
    cleaned = false;
    opEl.textContent = 'raw.csv';
    resultEl.textContent = '2 anomalies';
    resultEl.className = 'whitespace-nowrap font-mono text-[9.5px] tracking-tight text-zinc-500';
    btn.textContent = 'clean()';

    lineEls.forEach((el, idx) => {
      el.textContent = ROWS[idx].raw;
      el.className =
        idx === 1
          ? 'truncate text-red-400/80 transition-colors duration-200'
          : idx === 2
            ? 'truncate text-amber-400/80 transition-colors duration-200'
            : 'truncate text-zinc-400 transition-colors duration-200';
    });
  };

  const runClean = () => {
    clearTimers();
    cleaned = true;
    opEl.textContent = 'sanitizing...';
    btn.textContent = 'reset()';

    lineEls.forEach((el, idx) => {
      const id = window.setTimeout(() => {
        const row = ROWS[idx];
        el.textContent = row.clean;
        if (row.state === 'ok') {
          el.className = 'truncate text-emerald-400 transition-colors duration-200';
        } else if (row.state === 'dropped') {
          el.className = 'truncate text-zinc-600 line-through transition-colors duration-200';
        } else {
          el.className = 'truncate text-zinc-500 transition-colors duration-200';
        }

        if (idx === lineEls.length - 1) {
          opEl.textContent = 'clean.csv';
          resultEl.textContent = 'Valid: 8h 44m [OK]';
          resultEl.className = 'whitespace-nowrap font-mono text-[9.5px] tracking-tight text-emerald-400';
        }
      }, idx * 85);
      timers.push(id);
    });
  };

  btn.addEventListener('click', () => {
    playUiClick(1850);
    if (cleaned) renderRaw();
    else runClean();
  });

  secretBtn?.addEventListener('click', () => {
    clearTimers();
    playUiClick(1600);

    if (document.documentElement.classList.contains('p4-mode')) {
      window.dispatchEvent(new CustomEvent('request-p4-mode'));
      return;
    }

    opEl.textContent = 'scan.log';
    resultEl.textContent = 'scanning...';
    resultEl.className = 'whitespace-nowrap font-mono text-[9.5px] tracking-tight text-yellow-300';

    const scanLines = [
      { text: '[OK] 08:02 -> VALID', cls: 'truncate text-emerald-400 transition-colors duration-200' },
      { text: '[OK] 08:05 -> VALID', cls: 'truncate text-emerald-400 transition-colors duration-200' },
      {
        text: '[ERR] 00:00 SHADOW_ANOMALY_DETECTED',
        cls: 'truncate text-amber-400 animate-pulse transition-colors duration-200',
      },
      { text: '> channel: 00:00 TV', cls: 'truncate text-yellow-300/80 transition-colors duration-200' },
    ];

    lineEls.forEach((el) => {
      el.textContent = '...';
      el.className = 'truncate text-zinc-600';
    });

    scanLines.forEach((item, idx) => {
      timers.push(
        window.setTimeout(() => {
          lineEls[idx].textContent = item.text;
          lineEls[idx].className = item.cls;
        }, idx * 160)
      );
    });

    timers.push(
      window.setTimeout(() => {
        resultEl.textContent = '1 anomaly';
        window.dispatchEvent(new CustomEvent('request-p4-mode'));
      }, 700)
    );
  });

  window.addEventListener('p4-mode', (event) => {
    const enabled = Boolean((event as CustomEvent<{ enabled: boolean }>).detail?.enabled);
    if (!enabled) renderRaw();
  });

  renderRaw();
}
