// DevTools console greeting + unified state machine for normal / ok / sh / p4 modes.
import {
  playRadioStaticBurst,
  playTvStaticBurst,
  playUiClick,
  startOtherworldStatic,
  stopOtherworldStatic,
} from './audio';
import { getSavedLang, type Lang } from './i18n';

export type SiteMode = 'normal' | 'ok' | 'sh' | 'p4';

const P4_DIALOG_TEXT: Record<Lang, string> = {
  en: 'The fog is thickening over Nová radnice... Scanning attendance logs for hidden shadows.',
  cz: 'Nad Novou radnicí houstne mlha... Skenuji záznamy docházky a hledám skryté stíny.',
  ru: 'Над Новой ратушей сгущается туман... Сканирую логи турникетов в поисках скрытых теней.',
};

export function initEasterEggs() {
  console.log(
    "%c> aidar_s // built with Astro, zero-tracking, vanilla TS\n> hidden frequencies: type [ok], [sh], or [p4]",
    'color: #34d399; background: #0c0c0e; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; padding: 8px 12px; border: 1px solid #065f46; border-radius: 6px; line-height: 1.55;',
  );

  const root = document.documentElement;
  const okBanner = document.getElementById('ok-banner');
  const okExitBtn = document.getElementById('ok-exit-btn');
  const vinyl = document.getElementById('vinyl-disc');
  const crtOverlay = document.getElementById('crt-overlay');
  const crtBackdrop = document.getElementById('crt-backdrop');
  const crtGlitch = document.getElementById('crt-glitch');
  const crtBeam = document.getElementById('crt-beam');
  const crtTerminal = document.getElementById('crt-terminal');

  const shBanner = document.getElementById('sh-banner');
  const shExitBtn = document.getElementById('sh-exit-btn');
  const shFogOverlay = document.getElementById('sh-fog-overlay');
  const p4Banner = document.getElementById('p4-banner');
  const p4ExitBtn = document.getElementById('p4-exit-btn');
  const p4TvOverlay = document.getElementById('p4-tv-overlay');
  const p4Dialog = document.getElementById('p4-dialog');
  const p4DialogText = document.getElementById('p4-dialog-text');
  const pixelStage = document.getElementById('pixel-stage');

  let currentMode: SiteMode = 'normal';
  let isTransitioning = false;
  let timers: number[] = [];
  let p4DialogTimer: number | null = null;
  let p4TypeRafId: number | null = null;

  const hideP4Dialog = () => {
    if (p4DialogTimer !== null) {
      window.clearTimeout(p4DialogTimer);
      p4DialogTimer = null;
    }
    if (p4TypeRafId !== null) {
      cancelAnimationFrame(p4TypeRafId);
      p4TypeRafId = null;
    }
    if (p4Dialog) {
      p4Dialog.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
      p4Dialog.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
    }
  };

  const showP4Dialog = () => {
    if (!p4Dialog || !p4DialogText) return;
    hideP4Dialog();

    const message = P4_DIALOG_TEXT[getSavedLang()];
    p4DialogText.textContent = '';
    p4Dialog.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    p4Dialog.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');

    const start = performance.now();
    const duration = 1100;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      p4DialogText.textContent = message.slice(0, Math.floor(progress * message.length));
      if (progress < 1) {
        p4TypeRafId = requestAnimationFrame(step);
      } else {
        p4TypeRafId = null;
        p4DialogText.textContent = message;
      }
    };
    p4TypeRafId = requestAnimationFrame(step);

    p4DialogTimer = window.setTimeout(hideP4Dialog, 5000);
  };

  window.addEventListener('lang-change', (event) => {
    if (currentMode !== 'p4' || !p4Dialog || !p4DialogText) return;
    if (p4Dialog.classList.contains('opacity-0')) return;
    if (p4TypeRafId !== null) {
      cancelAnimationFrame(p4TypeRafId);
      p4TypeRafId = null;
    }
    const lang = (event as CustomEvent<Lang>).detail;
    if (lang in P4_DIALOG_TEXT) {
      p4DialogText.textContent = P4_DIALOG_TEXT[lang];
    }
  });

  p4Dialog?.addEventListener('click', hideP4Dialog);

  const clearTimers = () => {
    timers.forEach((id) => window.clearTimeout(id));
    timers = [];
  };

  const applyTheme = (mode: SiteMode) => {
    currentMode = mode;
    root.classList.toggle('ok-computer-mode', mode === 'ok');
    root.classList.toggle('otherworld-mode', mode === 'sh');
    root.classList.toggle('p4-mode', mode === 'p4');

    if (okBanner) okBanner.classList.toggle('hidden', mode !== 'ok');
    if (shBanner) shBanner.classList.toggle('hidden', mode !== 'sh');
    if (p4Banner) p4Banner.classList.toggle('hidden', mode !== 'p4');

    const freqButtons: Array<{ id: string; target: SiteMode; activeClass: string }> = [
      { id: 'freq-ok-btn', target: 'ok', activeClass: 'text-sky-400' },
      { id: 'freq-sh-btn', target: 'sh', activeClass: 'text-red-400' },
      { id: 'freq-p4-btn', target: 'p4', activeClass: 'text-yellow-300' },
    ];
    freqButtons.forEach(({ id, target, activeClass }) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const isActive = mode === target;
      btn.classList.remove('text-sky-400', 'text-red-400', 'text-yellow-300');
      if (isActive) {
        btn.classList.add(activeClass);
        btn.setAttribute('title', 'Click again or press ESC to exit');
      } else {
        btn.removeAttribute('title');
      }
    });

    if (mode !== 'sh') {
      stopOtherworldStatic();
    }
    if (mode === 'p4') {
      showP4Dialog();
    } else {
      hideP4Dialog();
    }

    window.dispatchEvent(new CustomEvent('ok-computer-mode', { detail: { enabled: mode === 'ok' } }));
    window.dispatchEvent(new CustomEvent('otherworld-mode', { detail: { enabled: mode === 'sh' } }));
    window.dispatchEvent(new CustomEvent('p4-mode', { detail: { enabled: mode === 'p4' } }));

    if (mode !== 'normal') {
      (
        window as Window & {
          umami?: { track: (eventName: string, data?: Record<string, string>) => void };
        }
      ).umami?.track('secret_mode_activated', { mode });
    }
  };

  const resetOverlays = () => {
    if (crtOverlay) crtOverlay.style.opacity = '0';
    if (crtBackdrop) crtBackdrop.style.opacity = '0';
    if (crtGlitch) crtGlitch.style.opacity = '0';
    if (crtBeam) crtBeam.style.opacity = '0';
    crtTerminal?.classList.add('hidden');
    if (shFogOverlay) shFogOverlay.style.opacity = '0';
    if (p4TvOverlay) p4TvOverlay.style.opacity = '0';
  };

  const transitionTo = (nextMode: SiteMode) => {
    if (isTransitioning) return;
    if (currentMode === nextMode) return;

    const prevMode = currentMode;
    clearTimers();
    playUiClick(1400);

    // Stop any existing Web Audio static bed immediately on leave
    if (prevMode === 'sh') {
      stopOtherworldStatic();
    }

    // Notify audio engine immediately on user gesture
    window.dispatchEvent(new CustomEvent('mode-audio', { detail: { mode: nextMode, prevMode } }));

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (nextMode === 'sh') {
      playRadioStaticBurst(0.8);
      const slider = document.getElementById('filter-intensity') as HTMLInputElement | null;
      const level = slider ? Number(slider.value) / 100 : 1;
      timers.push(window.setTimeout(() => startOtherworldStatic(level), 600));
    }

    if (reduced) {
      applyTheme(nextMode);
      return;
    }

    // Use CRT transition when entering or leaving OK Computer mode (unless entering SH)
    if (nextMode === 'ok' || (prevMode === 'ok' && nextMode === 'normal')) {
      if (!crtOverlay || !crtBackdrop || !crtGlitch || !crtBeam || !crtTerminal) {
        applyTheme(nextMode);
        return;
      }

      isTransitioning = true;
      resetOverlays();

      if (nextMode === 'ok') {
        crtOverlay.style.opacity = '1';
        crtBackdrop.style.transition = 'opacity 180ms ease-out';
        crtBackdrop.style.opacity = '1';

        crtBeam.style.transition = 'none';
        crtBeam.style.transform = 'scaleY(1)';
        crtBeam.style.opacity = '0.9';
        void crtBeam.offsetWidth;
        crtBeam.style.transition =
          'transform 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms ease-out';
        crtBeam.style.transform = 'scaleY(0.005)';
        crtBeam.style.opacity = '1';

        timers.push(
          window.setTimeout(() => {
            crtBeam.style.transition = 'opacity 120ms ease-out';
            crtBeam.style.opacity = '0.28';
            crtGlitch.style.transition = 'opacity 100ms ease-out';
            crtGlitch.style.opacity = '0.16';
            crtTerminal.classList.remove('hidden');
          }, 250),
          window.setTimeout(() => {
            applyTheme('ok');
            crtTerminal.classList.add('hidden');
            crtGlitch.style.opacity = '0';

            crtBeam.style.transition =
              'transform 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease-out';
            crtBeam.style.transform = 'scaleY(1)';
            crtBeam.style.opacity = '0';

            crtBackdrop.style.transition = 'opacity 250ms ease-out';
            crtBackdrop.style.opacity = '0';
          }, 550),
          window.setTimeout(() => {
            crtOverlay.style.opacity = '0';
            isTransitioning = false;
          }, 800)
        );
      } else {
        crtOverlay.style.opacity = '1';
        crtBackdrop.style.transition = 'opacity 160ms ease-out';
        crtBackdrop.style.opacity = '0.88';

        crtBeam.style.transition = 'none';
        crtBeam.style.transform = 'scaleY(1)';
        crtBeam.style.opacity = '0.45';
        void crtBeam.offsetWidth;
        crtBeam.style.transition = 'transform 180ms ease-in, opacity 180ms ease-out';
        crtBeam.style.transform = 'scaleY(0.005)';
        crtBeam.style.opacity = '0.85';

        timers.push(
          window.setTimeout(() => {
            applyTheme('normal');

            crtBeam.style.transition = 'transform 220ms ease-out, opacity 220ms ease-out';
            crtBeam.style.transform = 'scaleY(1)';
            crtBeam.style.opacity = '0';

            crtBackdrop.style.transition = 'opacity 220ms ease-out';
            crtBackdrop.style.opacity = '0';
          }, 180),
          window.setTimeout(() => {
            crtOverlay.style.opacity = '0';
            isTransitioning = false;
          }, 400)
        );
      }
      return;
    }

    // Persona 4 Midnight Channel yellow-black TV static flash (~700ms)
    if (nextMode === 'p4' || prevMode === 'p4') {
      playTvStaticBurst(0.35);
      if (!p4TvOverlay) {
        applyTheme(nextMode);
        return;
      }

      isTransitioning = true;
      resetOverlays();
      p4TvOverlay.style.transition = 'opacity 180ms ease-out';
      p4TvOverlay.style.opacity = '1';

      timers.push(
        window.setTimeout(() => {
          applyTheme(nextMode);
          p4TvOverlay.style.transition = 'opacity 480ms ease-out';
          p4TvOverlay.style.opacity = '0';
        }, 220),
        window.setTimeout(() => {
          isTransitioning = false;
        }, 700)
      );
      return;
    }

    // Fog transition for entering or leaving Silent Hill: Otherworld mode
    if (!shFogOverlay) {
      applyTheme(nextMode);
      return;
    }

    isTransitioning = true;
    resetOverlays();

    if (nextMode === 'sh') {
      shFogOverlay.style.transition = 'opacity 480ms ease-in-out';
      shFogOverlay.style.opacity = '1';

      timers.push(
        window.setTimeout(() => {
          applyTheme('sh');
          shFogOverlay.style.transition = 'opacity 520ms ease-out';
          shFogOverlay.style.opacity = '0';
        }, 480),
        window.setTimeout(() => {
          isTransitioning = false;
        }, 1000)
      );
    } else {
      shFogOverlay.style.transition = 'opacity 280ms ease-out';
      shFogOverlay.style.opacity = '0.9';

      timers.push(
        window.setTimeout(() => {
          applyTheme('normal');
          shFogOverlay.style.transition = 'opacity 320ms ease-out';
          shFogOverlay.style.opacity = '0';
        }, 280),
        window.setTimeout(() => {
          isTransitioning = false;
        }, 600)
      );
    }
  };

  const toggleMode = (target: 'ok' | 'sh' | 'p4') => {
    transitionTo(currentMode === target ? 'normal' : target);
  };

  // Triple-click vinyl -> ok
  let vinylClicks = 0;
  let vinylTimer: number | null = null;
  vinyl?.addEventListener('click', () => {
    vinylClicks += 1;
    if (vinylTimer !== null) window.clearTimeout(vinylTimer);
    if (vinylClicks >= 3) {
      vinylClicks = 0;
      toggleMode('ok');
      return;
    }
    vinylTimer = window.setTimeout(() => {
      vinylClicks = 0;
    }, 650);
  });

  // Triple-click pixel canvas -> sh
  let stageClicks = 0;
  let stageTimer: number | null = null;
  pixelStage?.addEventListener('click', () => {
    stageClicks += 1;
    if (stageTimer !== null) window.clearTimeout(stageTimer);
    if (stageClicks >= 3) {
      stageClicks = 0;
      toggleMode('sh');
      return;
    }
    stageTimer = window.setTimeout(() => {
      stageClicks = 0;
    }, 650);
  });

  // Keyboard sequences: "ok", "sh", "Escape"
  let lastKey = '';
  let lastKeyAt = 0;
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }

    if (event.key === 'Escape') {
      const drawer = document.getElementById('project-drawer');
      const drawerOpen = drawer && !drawer.classList.contains('translate-x-full');
      if (!drawerOpen && currentMode !== 'normal') {
        transitionTo('normal');
        return;
      }
    }

    const key = event.key.toLowerCase();
    const now = Date.now();
    if (key === 'k' && lastKey === 'o' && now - lastKeyAt < 1500) {
      lastKey = '';
      toggleMode('ok');
      return;
    }
    if (key === 'h' && lastKey === 's' && now - lastKeyAt < 1500) {
      lastKey = '';
      toggleMode('sh');
      return;
    }
    if (key === '4' && lastKey === 'p' && now - lastKeyAt < 1500) {
      lastKey = '';
      toggleMode('p4');
      return;
    }
    lastKey = key;
    lastKeyAt = now;
  });

  okExitBtn?.addEventListener('click', () => transitionTo('normal'));
  shExitBtn?.addEventListener('click', () => transitionTo('normal'));
  p4ExitBtn?.addEventListener('click', () => transitionTo('normal'));

  document.getElementById('freq-ok-btn')?.addEventListener('click', () => toggleMode('ok'));
  document.getElementById('freq-sh-btn')?.addEventListener('click', () => toggleMode('sh'));
  document.getElementById('freq-p4-btn')?.addEventListener('click', () => toggleMode('p4'));

  window.addEventListener('request-p4-mode', () => {
    toggleMode('p4');
  });
}
