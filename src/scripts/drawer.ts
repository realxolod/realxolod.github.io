// Slide-over project drawer + global keyboard shortcuts (L = language, M = music, Esc = close).
interface ProjectPayload {
  slug: string;
  title: string;
  stack: string[];
  status?: string;
  description: string;
  detailLabel: string;
  detailLines: string[];
  github?: string;
}

export function initDrawerAndShortcuts() {
  const backdrop = document.getElementById('project-drawer-backdrop');
  const panel = document.getElementById('project-drawer');
  const closeBtn = document.getElementById('drawer-close');
  const titleEl = document.getElementById('drawer-title');
  const stackEl = document.getElementById('drawer-stack');
  const statusEl = document.getElementById('drawer-status');
  const descEl = document.getElementById('drawer-desc');
  const detailLabelEl = document.getElementById('drawer-detail-label');
  const detailLinesEl = document.getElementById('drawer-detail-lines');
  const githubEl = document.getElementById('drawer-github') as HTMLAnchorElement | null;
  const privateNoteEl = document.getElementById('drawer-private-note');

  const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-project-trigger]'));
  let lastTrigger: HTMLElement | null = null;

  const isOpen = () => Boolean(backdrop && !backdrop.classList.contains('pointer-events-none'));

  const closeDrawer = () => {
    if (!backdrop || !panel) return;
    backdrop.classList.add('pointer-events-none', 'opacity-0');
    backdrop.classList.remove('opacity-100');
    panel.classList.add('translate-x-full');
    panel.classList.remove('translate-x-0');
    backdrop.setAttribute('aria-hidden', 'true');
    lastTrigger?.focus();
    lastTrigger = null;
  };

  const openDrawer = (data: ProjectPayload, trigger: HTMLElement) => {
    if (
      !backdrop ||
      !panel ||
      !titleEl ||
      !stackEl ||
      !statusEl ||
      !descEl ||
      !detailLabelEl ||
      !detailLinesEl ||
      !githubEl
    ) {
      return;
    }

    lastTrigger = trigger;
    titleEl.textContent = data.title;
    stackEl.textContent = data.stack.join(' · ');

    // Use currently translated description from the DOM row if available
    const liveDesc = trigger.querySelector<HTMLElement>('[data-i18n^="proj."]');
    descEl.textContent = liveDesc?.textContent?.trim() || data.description;

    if (data.status) {
      statusEl.textContent = `[${data.status}]`;
      statusEl.classList.remove('hidden');
    } else {
      statusEl.classList.add('hidden');
    }

    detailLabelEl.textContent = data.detailLabel;
    detailLinesEl.innerHTML = '';
    data.detailLines.forEach((line) => {
      const code = document.createElement('div');
      code.className = 'whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-300';
      code.textContent = line;
      detailLinesEl.appendChild(code);
    });

    if (data.github) {
      githubEl.href = data.github;
      githubEl.classList.remove('hidden');
      privateNoteEl?.classList.add('hidden');
    } else {
      githubEl.classList.add('hidden');
      if (privateNoteEl) {
        privateNoteEl.textContent = data.status ?? 'Internal / Academic Case';
        privateNoteEl.classList.remove('hidden');
      }
    }

    backdrop.classList.remove('pointer-events-none', 'opacity-0');
    backdrop.classList.add('opacity-100');
    panel.classList.remove('translate-x-full');
    panel.classList.add('translate-x-0');
    backdrop.setAttribute('aria-hidden', 'false');
    closeBtn?.focus();
  };

  triggers.forEach((row) => {
    row.addEventListener('click', (e) => {
      // Allow direct click on the inline GitHub link without opening the drawer
      if ((e.target as HTMLElement).closest('a')) return;
      const raw = row.dataset.project;
      if (!raw) return;
      try {
        const data = JSON.parse(raw) as ProjectPayload;
        openDrawer(data, row);
      } catch {
        // ignore malformed payload
      }
    });

    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if ((e.target as HTMLElement).closest('a')) return;
        e.preventDefault();
        row.click();
      }
    });
  });

  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) closeDrawer();
  });

  // Global keyboard shortcuts: Esc (close drawer), L (cycle language), M (play/pause radio)
  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }

    if (e.key === 'Escape' && isOpen()) {
      closeDrawer();
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key.toLowerCase();
    if (key === 'l') {
      const langBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-lang]'));
      const activeIdx = langBtns.findIndex((b) => b.getAttribute('aria-pressed') === 'true');
      const nextBtn = langBtns[(activeIdx + 1) % langBtns.length];
      nextBtn?.click();
    } else if (key === 'm') {
      document.getElementById('play-btn')?.click();
    }
  });
}
