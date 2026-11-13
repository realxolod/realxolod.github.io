// Minimalist client-side i18n (EN / CZ / RU) with localStorage persistence.
import { playUiClick } from './audio';

export type Lang = 'en' | 'cz' | 'ru';

const STORAGE_KEY = 'lang';

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    status: 'Ostrava, CZ • Volný přístup na trh práce v ČR',
    greeting: "Hey, I'm Aidar S.",
    bio: 'Second-year Informatics in Economics student at VŠB-TUO. Mostly writing Python scripts to clean data, learning C, and working through corporate finance numbers.',
    currently: 'Currently: working on a Python project & trying to survive Year 2 of Informatics in Economics at VŠB',
    copyEmail: 'Copy Email',
    copied: 'Copied!',
    pixelFilter: 'Pixel filter',
    filterNormal: 'Normal',
    filterGrayscale: 'Grayscale',
    filterBlur: 'Box Blur',
    projects: 'Projects',
    viewGitHub: 'View on GitHub ↗',
    'proj.opsec-portfolio-canvas':
      'Custom 60 FPS canvas engine with privacy-first Umami analytics and strict CSP.',
    'proj.etl-data-cleaning-pipeline':
      'Deduplication, date normalization, and validation pipeline for raw attendance CSV logs (RAW CSV -> DEDUP & VALIDATION -> CLEAN KPI).',
    'proj.relational-db-financial-analysis':
      'Normalized 3NF relational schema design and corporate financial stability analysis (ROE, ROA, liquidity).',
    stackLabel: 'Stack:',
    nowLabel: 'Now:',
    now1: 'Year 2, Informatics in Economics at VŠB-TUO',
    now2: 'Ostrava, looking for a data or dev internship',
    now3: 'Python ETL scripts and C tools',
    languagesLabel: 'Languages:',
    langEn: 'English (C1)',
    langCz: 'Czech (B2/C1)',
    langNative: 'Russian & Kazakh (Native)',
  },
  cz: {
    status: 'Ostrava, CZ • Volný přístup na trh práce v ČR',
    greeting: 'Ahoj, jsem Aidar S.',
    bio: 'Student 2. ročníku Informatiky v ekonomii na VŠB-TUO. Většinou píšu skripty v Pythonu na čištění dat, učím se C a počítám firemní finance.',
    currently: 'Právě teď: pracuji na projektu v Pythonu a snažím se přežít druhý ročník Informatiky v ekonomii na VŠB',
    copyEmail: 'Zkopírovat Email',
    copied: 'Zkopírováno!',
    pixelFilter: 'Pixelový filtr',
    filterNormal: 'Normální',
    filterGrayscale: 'Odstíny šedi',
    filterBlur: 'Box Blur',
    projects: 'Projekty',
    viewGitHub: 'Otevřít na GitHubu ↗',
    'proj.opsec-portfolio-canvas':
      'Vlastní 60 FPS canvas engine s privacy-first analytikou Umami a přísnou CSP politikou.',
    'proj.etl-data-cleaning-pipeline':
      'Pipeline pro deduplikaci, normalizaci dat a validaci surových CSV logů docházky (RAW CSV -> DEDUP & VALIDATION -> CLEAN KPI).',
    'proj.relational-db-financial-analysis':
      'Návrh relační databáze ve 3NF a finanční analýza stability podniku (ROE, ROA, likvidita).',
    stackLabel: 'Stack:',
    nowLabel: 'Teď:',
    now1: '2. ročník, Informatika v ekonomii na VŠB-TUO',
    now2: 'Ostrava, hledám stáž v datech nebo vývoji',
    now3: 'Python ETL skripty a nástroje v C',
    languagesLabel: 'Jazyky:',
    langEn: 'Angličtina (C1)',
    langCz: 'Čeština (B2/C1)',
    langNative: 'Ruština & Kazaština (Rodilý)',
  },
  ru: {
    status: 'Ostrava, CZ • Свободный доступ на рынок труда ЧР',
    greeting: 'Привет, я Aidar S.',
    bio: 'Учусь на 2 курсе информатики в экономике в VŠB-TUO. В основном пишу скрипты на Python для разбора данных, разбираюсь с C и финансовой отчётностью.',
    currently: 'Сейчас: работаю над проектом на Python и стараюсь пережить второй курс информатики в экономике на VŠB',
    copyEmail: 'Скопировать Email',
    copied: 'Скопировано!',
    pixelFilter: 'Пиксель-фильтр',
    filterNormal: 'Обычный',
    filterGrayscale: 'Ч/Б',
    filterBlur: 'Box Blur',
    projects: 'Проекты',
    viewGitHub: 'Открыть на GitHub ↗',
    'proj.opsec-portfolio-canvas':
      'Кастомный 60 FPS движок на Canvas с privacy-first аналитикой Umami и строгой политикой CSP.',
    'proj.etl-data-cleaning-pipeline':
      'Пайплайн дедупликации, нормализации дат и валидации сырых CSV-логов учета времени (RAW CSV -> DEDUP & VALIDATION -> CLEAN KPI).',
    'proj.relational-db-financial-analysis':
      'Проектирование нормализованной схемы БД (3NF) и финансовый анализ устойчивости предприятия (ROE, ROA, ликвидность).',
    stackLabel: 'Стек:',
    nowLabel: 'Сейчас:',
    now1: '2 курс, Информатика в экономике (VŠB-TUO)',
    now2: 'Острава, ищу стажировку в данных или разработке',
    now3: 'Python ETL и утилиты на C',
    languagesLabel: 'Языки:',
    langEn: 'Английский (C1)',
    langCz: 'Чешский (B2/C1)',
    langNative: 'Русский и казахский (Родной)',
  },
};

export function getSavedLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'cz' || saved === 'ru') return saved;
  return 'en';
}

export function initI18n() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-lang]'));
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-i18n]'));

  const apply = (lang: Lang) => {
    const table = DICT[lang];
    document.documentElement.lang = lang === 'cz' ? 'cs' : lang;

    const isOtherworld = document.documentElement.classList.contains('otherworld-mode');
    const isOkComputer = document.documentElement.classList.contains('ok-computer-mode');
    const isP4 = document.documentElement.classList.contains('p4-mode');
    nodes.forEach((el) => {
      const key = el.dataset.i18n;
      if (key === 'status' && isP4) {
        el.textContent = 'Nová radnice, Ostrava • Midnight Channel';
      } else if (key === 'status' && isOtherworld) {
        el.textContent = 'Ostrava-Poruba, CZ • In my restless dreams...';
      } else if (key === 'status' && isOkComputer) {
        el.textContent = 'Nová Karolina, Ostrava • Fitter, happier...';
      } else if (key && table[key]) {
        el.textContent = table[key];
      }
    });

    buttons.forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('text-zinc-100', active);
      btn.classList.toggle('text-zinc-500', !active);
    });

    window.dispatchEvent(new CustomEvent('lang-change', { detail: lang }));
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang as Lang;
      localStorage.setItem(STORAGE_KEY, lang);
      playUiClick(1720);
      apply(lang);
    });
  });

  window.addEventListener('otherworld-mode', () => {
    apply(getSavedLang());
  });
  window.addEventListener('ok-computer-mode', () => {
    apply(getSavedLang());
  });
  window.addEventListener('p4-mode', () => {
    apply(getSavedLang());
  });

  apply(getSavedLang());
}
