// Minimalist client-side i18n (EN / CZ / RU) with localStorage persistence.
export type Lang = 'en' | 'cz' | 'ru';

const STORAGE_KEY = 'lang';

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    status: 'Ostrava, CZ • Volný přístup na trh práce v ČR',
    greeting: "Hey, I'm Aidar S.",
    bio: 'I study Informatics in Economics at VŠB-TUO. I like turning messy data into clean Python pipelines, poking around with low-level C, and figuring out how business numbers actually work.',
    copyEmail: 'Copy Email',
    copied: 'Copied!',
    pixelFilter: 'Pixel filter',
    filterNormal: 'Normal',
    filterGrayscale: 'Grayscale',
    filterBlur: 'Box Blur',
    projects: 'Projects',
    statusInProgress: '[In progress]',
    'proj.attendance-analytics':
      'Cleaning messy turnstile logs, catching missing check-outs, and calculating hours.',
    'proj.raster-image-processor':
      'Manipulating uncompressed BMP/PPM images in memory with custom grayscale and box blur filters.',
    'proj.car-rental-db':
      '3NF relational database with automated invoicing queries and user forms.',
    'proj.corporate-financial-kpi':
      'Evaluating P&L, cash flow, liquidity (1.84x), and ROE/ROA metrics.',
    stackLabel: 'Stack:',
    languagesLabel: 'Languages:',
    langEn: 'English (C1)',
    langCz: 'Czech (B2/C1)',
    langNative: 'Russian & Kazakh (Native)',
  },
  cz: {
    status: 'Ostrava, CZ • Volný přístup na trh práce v ČR',
    greeting: 'Ahoj, jsem Aidar S.',
    bio: 'Studuji Informatiku v ekonomii na VŠB-TUO. Baví mě měnit chaotická data v čisté Python pipeline, vrtat se v nízkoúrovňovém C a chápat, jak doopravdy fungují firemní čísla.',
    copyEmail: 'Zkopírovat Email',
    copied: 'Zkopírováno!',
    pixelFilter: 'Pixelový filtr',
    filterNormal: 'Normální',
    filterGrayscale: 'Odstíny šedi',
    filterBlur: 'Box Blur',
    projects: 'Projekty',
    statusInProgress: '[Probíhá]',
    'proj.attendance-analytics':
      'Čištění surových logů z turniketů, detekce chybějících odchodů a výpočet odpracovaných hodin.',
    'proj.raster-image-processor':
      'Zpracování nekomprimovaných BMP/PPM obrázků v paměti pomocí vlastních filtrů grayscale a box blur.',
    'proj.car-rental-db':
      'Relační databáze ve 3NF s automatizovanými SQL dotazy pro fakturaci a uživatelskými formuláři.',
    'proj.corporate-financial-kpi':
      'Analýza výkazu zisku a ztráty, cash flow, likvidity (1.84x) a ukazatelů ROE/ROA.',
    stackLabel: 'Stack:',
    languagesLabel: 'Jazyky:',
    langEn: 'Angličtina (C1)',
    langCz: 'Čeština (B2/C1)',
    langNative: 'Ruština & Kazaština (Rodilý)',
  },
  ru: {
    status: 'Ostrava, CZ • Свободный доступ на рынок труда ЧР',
    greeting: 'Привет, я Aidar S.',
    bio: 'Учусь на направлении «Информатика в экономике» в VŠB-TUO. Люблю превращать грязные данные в чистые Python-пайплайны, ковыряться в низкоуровневом C и разбираться, как на самом деле устроены бизнес-метрики.',
    copyEmail: 'Скопировать Email',
    copied: 'Скопировано!',
    pixelFilter: 'Пиксель-фильтр',
    filterNormal: 'Обычный',
    filterGrayscale: 'Ч/Б',
    filterBlur: 'Box Blur',
    projects: 'Проекты',
    statusInProgress: '[В процессе]',
    'proj.attendance-analytics':
      'Очистка сырых логов турникетов, поиск пропущенных выходов и расчет отработанных часов.',
    'proj.raster-image-processor':
      'Обработка несжатых BMP/PPM изображений в памяти с собственными фильтрами grayscale и box blur.',
    'proj.car-rental-db':
      'Реляционная БД в 3NF с автоматическими SQL-запросами для выставления счетов и формами.',
    'proj.corporate-financial-kpi':
      'Аудит отчетов P&L и cash flow, оценка ликвидности (1.84x) и рентабельности ROE/ROA.',
    stackLabel: 'Стек:',
    languagesLabel: 'Языки:',
    langEn: 'Английский (C1)',
    langCz: 'Чешский (B2/C1)',
    langNative: 'Русский и казахский (Родной)',
  },
};

function getSavedLang(): Lang {
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

    nodes.forEach((el) => {
      const key = el.dataset.i18n;
      if (key && table[key]) {
        el.textContent = table[key];
      }
    });

    buttons.forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('text-zinc-100', active);
      btn.classList.toggle('text-zinc-500', !active);
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang as Lang;
      localStorage.setItem(STORAGE_KEY, lang);
      apply(lang);
    });
  });

  apply(getSavedLang());
}
