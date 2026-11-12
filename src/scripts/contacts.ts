// Obfuscated contact handlers: decoded only on explicit user interaction.
const KEY = 42;

// XOR-encoded char codes so no plain-text email or handle exists in HTML or bundle strings.
const EMAIL_CODES = [
  75, 67, 78, 75, 88, 72, 79, 65, 4, 89, 75, 76, 75, 88, 69, 92, 106, 77, 71, 75, 67, 70, 4, 73, 69, 71,
];
const TG_CODES = [
  66, 94, 94, 90, 89, 16, 5, 5, 94, 4, 71, 79,
];

function decode(codes: number[]): string {
  return String.fromCharCode(...codes.map((c) => c ^ KEY));
}

export function initContacts() {
  const tgLink = document.getElementById('tg-link') as HTMLAnchorElement | null;
  const copyEmailBtn = document.getElementById('copy-email-btn');
  const toast = document.getElementById('copy-toast');

  if (tgLink) {
    tgLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(decode(TG_CODES), '_blank', 'noopener,noreferrer');
    });
  }

  if (copyEmailBtn && toast) {
    let hideTimer: number | undefined;

    copyEmailBtn.addEventListener('click', async () => {
      const address = decode(EMAIL_CODES);
      try {
        await navigator.clipboard.writeText(address);
      } catch {
        // Fallback for restricted clipboard contexts
        const tmp = document.createElement('textarea');
        tmp.value = address;
        tmp.setAttribute('readonly', '');
        tmp.style.position = 'fixed';
        tmp.style.opacity = '0';
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }

      toast.classList.remove('opacity-0', 'translate-y-1', 'pointer-events-none');
      toast.classList.add('opacity-100', 'translate-y-0');

      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-1', 'pointer-events-none');
        toast.classList.remove('opacity-100', 'translate-y-0');
      }, 2000);
    });
  }
}
