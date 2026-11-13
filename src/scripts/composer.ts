// Client-side Signal Composer: zero API, zero backend, strict OPSEC.
import { decodeEmail, decodeTelegramUrl } from './contacts';
import { getSavedLang, type Lang } from './i18n';

type PresetKey = 'internship' | 'project' | 'easter';

interface LocalizedPreset {
  label: string;
  subject: string;
  body: string;
}

interface ComposerLocale {
  placeholder: string;
  copyText: string;
  copiedText: string;
  defaultSubject: string;
  presets: Record<PresetKey, LocalizedPreset>;
}

const LOCALES: Record<Lang, ComposerLocale> = {
  en: {
    placeholder: 'Pick a preset or type your message...',
    copyText: 'copy text',
    copiedText: 'copied ✓',
    defaultSubject: 'Portfolio Signal',
    presets: {
      internship: {
        label: '[Internship / Role]',
        subject: 'Internship / Role Inquiry',
        body: 'Hi Aidar,\n\nSaw your portfolio and wanted to reach out regarding an internship / junior role in ',
      },
      project: {
        label: '[Project / Tech]',
        subject: 'Project / Tech Collaboration',
        body: 'Hi Aidar,\n\nChecked out your Python / C work and wanted to chat about ',
      },
      easter: {
        label: '[Easter egg]',
        subject: 'Found the hidden mode',
        body: 'Hi Aidar,\n\nFound the hidden mode on your site, ',
      },
    },
  },
  cz: {
    placeholder: 'Vyberte šablonu nebo napište zprávu...',
    copyText: 'kopírovat',
    copiedText: 'zkopírováno ✓',
    defaultSubject: 'Zpráva z portfolia',
    presets: {
      internship: {
        label: '[Stáž / Pozice]',
        subject: 'Nabídka stáže / juniorní pozice',
        body: 'Ahoj Aidare,\n\nviděl jsem tvé portfolio a chtěl bych se ozvat ohledně stáže / juniorní pozice v oblasti ',
      },
      project: {
        label: '[Projekt / Tech]',
        subject: 'Spolupráce na projektu / Tech',
        body: 'Ahoj Aidare,\n\nprohlédl jsem si tvé projekty v Pythonu / C a chtěl bych probrat ',
      },
      easter: {
        label: '[Našel jsem Easter Egg]',
        subject: 'Našel jsem skrytý Easter Egg',
        body: 'Ahoj Aidare,\n\nprávě jsem naladil skrytou frekvenci na tvém webu — skvělý detail s ',
      },
    },
  },
  ru: {
    placeholder: 'Выберите шаблон или напишите сообщение...',
    copyText: 'копировать',
    copiedText: 'скопировано ✓',
    defaultSubject: 'Сообщение с портфолио',
    presets: {
      internship: {
        label: '[Стажировка / Вакансия]',
        subject: 'Стажировка / Junior-позиция',
        body: 'Привет, Айдар!\n\nПосмотрел твоё портфолио и хотел бы обсудить стажировку / junior-позицию в направлении ',
      },
      project: {
        label: '[Проект / Код]',
        subject: 'Обсуждение проекта / Tech',
        body: 'Привет, Айдар!\n\nПосмотрел твои проекты на Python / C и хотел бы пообщаться насчёт ',
      },
      easter: {
        label: '[Нашёл пасхалку]',
        subject: 'Нашёл скрытую пасхалку',
        body: 'Привет, Айдар!\n\nТолько что настроился на скрытую частоту на твоём сайте — отличная отсылка к ',
      },
    },
  },
};

export function initComposer() {
  const input = document.getElementById('composer-input') as HTMLTextAreaElement | null;
  const presetBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-composer-preset]'));
  const tgBtn = document.getElementById('composer-tg-btn');
  const mailBtn = document.getElementById('composer-mail-btn');
  const copyBtn = document.getElementById('composer-copy-btn');

  if (!input || !tgBtn || !mailBtn || !copyBtn) return;

  let currentLang: Lang = getSavedLang();
  let activePreset: PresetKey | null = null;
  let lastAppliedBody = '';
  let isCopied = false;
  let typeRafId: number | null = null;

  const stopTypewriter = () => {
    if (typeRafId !== null) {
      cancelAnimationFrame(typeRafId);
      typeRafId = null;
    }
    input.classList.remove('is-typing');
  };

  const runTypewriter = (text: string) => {
    stopTypewriter();
    const duration = 340;
    const start = performance.now();
    input.classList.add('is-typing');
    input.value = '';
    input.focus();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const count = Math.floor(progress * text.length);
      input.value = text.slice(0, count);
      input.setSelectionRange(count, count);

      if (progress < 1) {
        typeRafId = requestAnimationFrame(step);
      } else {
        typeRafId = null;
        input.value = text;
        input.setSelectionRange(text.length, text.length);
        input.classList.remove('is-typing');
      }
    };

    typeRafId = requestAnimationFrame(step);
  };

  const updateButtonStyles = () => {
    presetBtns.forEach((btn) => {
      const isSelected = btn.dataset.composerPreset === activePreset;
      btn.setAttribute('aria-pressed', String(isSelected));
      btn.classList.toggle('border-zinc-500', isSelected);
      btn.classList.toggle('bg-white/[0.08]', isSelected);
      btn.classList.toggle('text-zinc-100', isSelected);
      btn.classList.toggle('border-white/[0.08]', !isSelected);
      btn.classList.toggle('bg-white/[0.02]', !isSelected);
      btn.classList.toggle('text-zinc-400', !isSelected);
    });
  };

  const applyLocale = (lang: Lang) => {
    currentLang = lang;
    const locale = LOCALES[lang];

    input.placeholder = locale.placeholder;
    if (!isCopied) {
      copyBtn.textContent = locale.copyText;
    }

    presetBtns.forEach((btn) => {
      const key = btn.dataset.composerPreset as PresetKey | undefined;
      if (key && locale.presets[key]) {
        btn.textContent = locale.presets[key].label;
      }
    });

    if (activePreset && (input.value === lastAppliedBody || typeRafId !== null)) {
      stopTypewriter();
      const nextBody = locale.presets[activePreset].body;
      input.value = nextBody;
      lastAppliedBody = nextBody;
    }
  };

  const selectPreset = (key: PresetKey) => {
    const preset = LOCALES[currentLang].presets[key];
    if (!preset) return;

    activePreset = key;
    lastAppliedBody = preset.body;
    updateButtonStyles();
    runTypewriter(preset.body);
  };

  input.addEventListener('input', () => {
    stopTypewriter();
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.composerPreset as PresetKey | undefined;
      if (key) selectPreset(key);
    });
  });

  tgBtn.addEventListener('click', () => {
    const text = input.value.trim();
    const baseUrl = decodeTelegramUrl();
    const url = text ? `${baseUrl}?text=${encodeURIComponent(text)}` : baseUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  mailBtn.addEventListener('click', () => {
    const address = decodeEmail();
    const text = input.value.trim();
    const locale = LOCALES[currentLang];
    const subject = activePreset ? locale.presets[activePreset].subject : locale.defaultSubject;
    const params = new URLSearchParams();
    params.set('subject', subject);
    if (text) params.set('body', text);
    window.location.href = `mailto:${address}?${params.toString().replace(/\+/g, '%20')}`;
  });

  let copyTimer: number | undefined;
  copyBtn.addEventListener('click', async () => {
    const text = input.value;
    if (!text.trim()) {
      input.focus();
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      input.select();
      document.execCommand('copy');
    }

    isCopied = true;
    copyBtn.textContent = LOCALES[currentLang].copiedText;
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      isCopied = false;
      copyBtn.textContent = LOCALES[currentLang].copyText;
    }, 2000);
  });

  window.addEventListener('lang-change', (e) => {
    const lang = (e as CustomEvent<Lang>).detail;
    if (lang === 'en' || lang === 'cz' || lang === 'ru') {
      applyLocale(lang);
    }
  });

  applyLocale(currentLang);
}
