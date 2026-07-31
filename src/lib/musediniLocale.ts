export type MusediniLocale = 'zh-Hant' | 'en' | 'ja' | 'ko' | 'zh-Hans';
export type MuseLocale = 'zh' | 'en' | 'ja' | 'ko' | 'zh-Hans';

const SHARED_COOKIE_NAME = 'musedini_locale';
const LEGACY_STORAGE_KEY = 'muse_locale';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const localeAliases: Record<string, MusediniLocale> = {
  'zh': 'zh-Hant',
  'zh-hant': 'zh-Hant',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'tc': 'zh-Hant',
  'tw': 'zh-Hant',
  'zh-hans': 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'sc': 'zh-Hans',
  'cn': 'zh-Hans',
  'en': 'en',
  'en-us': 'en',
  'en-gb': 'en',
  'ja': 'ja',
  'ja-jp': 'ja',
  'ko': 'ko',
  'ko-kr': 'ko',
};

export function normalizeMusediniLocale(value: string | null | undefined): MusediniLocale | null {
  if (!value) return null;
  return localeAliases[value.trim().toLowerCase()] ?? null;
}

export function toMuseLocale(locale: MusediniLocale): MuseLocale {
  if (locale === 'zh-Hant') return 'zh';
  return locale;
}

export function toMusediniLocale(locale: MuseLocale): MusediniLocale {
  return locale === 'zh' ? 'zh-Hant' : locale;
}

export function readSharedLocale(cookieValue = document.cookie): MusediniLocale | null {
  const rawValue = cookieValue
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SHARED_COOKIE_NAME}=`))
    ?.slice(SHARED_COOKIE_NAME.length + 1);

  if (!rawValue) return null;

  try {
    return normalizeMusediniLocale(decodeURIComponent(rawValue));
  } catch {
    return null;
  }
}

function writeSharedLocale(locale: MusediniLocale) {
  const attributes = [
    `${SHARED_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
  ];
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === 'musedini.com' || hostname.endsWith('.musedini.com')) {
    attributes.push('Domain=musedini.com');
  }
  if (window.location.protocol === 'https:') attributes.push('Secure');
  document.cookie = attributes.join('; ');
}

function browserLocale(): MusediniLocale {
  return normalizeMusediniLocale(window.navigator.language) ?? 'en';
}

export function readInitialMuseLocale(): MuseLocale {
  const params = new URLSearchParams(window.location.search);
  const queryLocale = normalizeMusediniLocale(params.get('lang') ?? params.get('locale'));
  if (queryLocale) return toMuseLocale(queryLocale);

  const cookieLocale = readSharedLocale();
  if (cookieLocale) return toMuseLocale(cookieLocale);

  const storedLocale = normalizeMusediniLocale(window.localStorage.getItem(LEGACY_STORAGE_KEY));
  if (storedLocale) return toMuseLocale(storedLocale);

  return toMuseLocale(browserLocale());
}

export function persistMuseLocale(locale: MuseLocale) {
  const canonicalLocale = toMusediniLocale(locale);
  window.localStorage.setItem(LEGACY_STORAGE_KEY, locale);
  writeSharedLocale(canonicalLocale);
  document.documentElement.lang = canonicalLocale;
}

export function subscribeToSharedMuseLocale(onLocale: (locale: MuseLocale) => void): () => void {
  const sync = () => {
    const sharedLocale = readSharedLocale();
    if (!sharedLocale) return;
    const nextLocale = toMuseLocale(sharedLocale);
    window.localStorage.setItem(LEGACY_STORAGE_KEY, nextLocale);
    document.documentElement.lang = sharedLocale;
    onLocale(nextLocale);
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') sync();
  };

  window.addEventListener('focus', sync);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    window.removeEventListener('focus', sync);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
