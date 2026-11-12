// Live clock for Ostrava (Europe/Prague timezone).
export function initClock() {
  const el = document.getElementById('clock');
  if (!el) return;

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });

  const tick = () => {
    const parts = fmt.formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    el.textContent = `${get('hour')}:${get('minute')}:${get('second')} ${get('timeZoneName')}`;
  };

  tick();
  setInterval(tick, 1000);
}
