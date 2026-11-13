// Live clock & P4 HUD date/period for Ostrava (Europe/Prague timezone).
export function initClock() {
  const el = document.getElementById('clock');
  const p4DateEl = document.getElementById('p4-hud-date');
  const p4PeriodEl = document.getElementById('p4-hud-period');
  if (!el) return;

  const timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Prague',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const getPeriod = (hour: number): string => {
    if (hour >= 5 && hour < 12) return 'MORNING';
    if (hour >= 12 && hour < 17) return 'AFTERNOON';
    if (hour >= 17 && hour < 22) return 'EVENING';
    return 'MIDNIGHT';
  };

  const tick = () => {
    const now = new Date();
    const parts = timeFmt.formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const hourStr = get('hour');
    el.textContent = `${hourStr}:${get('minute')}:${get('second')} ${get('timeZoneName')}`;

    if (p4DateEl) {
      const dParts = dateFmt.formatToParts(now);
      const getD = (type: string) => dParts.find((p) => p.type === type)?.value ?? '';
      p4DateEl.textContent = `${getD('month')}/${getD('day')} ${getD('weekday').toUpperCase()}`;
    }

    if (p4PeriodEl) {
      const hr = Number(hourStr);
      p4PeriodEl.textContent = `${getPeriod(Number.isFinite(hr) ? hr : 0)} • FOGGY // TV`;
    }
  };

  tick();
  setInterval(tick, 1000);
}
