/**
 * Central ONSTA Theme Registry.
 * To switch the entire portal to a new theme, add or edit a preset in THEMES
 * and change ACTIVE_THEME.
 */
export const ACTIVE_THEME = 'onstaPublic';

export const THEMES = {
  onstaPublic: {
    name: 'ONSTA Emerald & Gold (onsta.ai)',
    fonts: {
      display: '"Alata", sans-serif',
      body: '"Plus Jakarta Sans", "Alata", system-ui, -apple-system, sans-serif',
      googleFontsUrl:
        'https://fonts.googleapis.com/css2?family=Alata&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    },
    colors: {
      canvas: '#FFFFFF',
      surface: '#F7FAF8',
      surfaceMuted: '#EEF4F1',
      card: '#FFFFFF',
      border: '#E2EBE6',
      borderStrong: '#C8DAD1',
      borderSlate: '#DDE6E1',

      primary: '#053E2B',
      primaryHover: '#032B1E',
      primaryLight: '#0B5A3F',
      primarySoft: '#EAF4F0',
      primaryTint: '#D2E7DD',

      accent: '#C9A961',
      accentHover: '#B39249',
      accentSoft: '#FBF7EB',
      accentBorder: '#E8D5A3',
      accentText: '#8A6B22',

      ink: '#10211A',
      muted: '#5A6D65',
      subtle: '#8FA199',

      sidebarBg: '#042419',
      sidebarSurface: '#073324',
      sidebarHover: '#0A3E2C',
      sidebarActivePanel: '#062B1E',
      sidebarBorder: '#0D4632',
      sidebarControlBorder: '#165D44',
      sidebarText: '#C5DDD3',
      sidebarMuted: '#88B0A0',
      sidebarHeading: '#F3FAF6',
      sidebarKicker: '#C9A961',
      sidebarLogoutBg: '#083626',
      sidebarLogoutBorder: '#13543D',
      sidebarLogoutText: '#F5E8C7',
      sidebarLogoutIcon: '#C9A961',

      scrollbar: '#C4D6CD',
      scrollbarHover: '#8FAEA0',
      overlay: '#041C14',
    },
  },
  royalPlum: {
    name: 'Royal Plum Luxury',
    fonts: {
      display: '"Alata", sans-serif',
      body: '"Plus Jakarta Sans", "Alata", system-ui, -apple-system, sans-serif',
      googleFontsUrl:
        'https://fonts.googleapis.com/css2?family=Alata&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
    },
    colors: {
      canvas: '#F6F0FA',
      surface: '#F8FAFC',
      surfaceMuted: '#F1F5F9',
      card: '#FFFFFF',
      border: '#EAE0F2',
      borderStrong: '#DECBE9',
      borderSlate: '#E2E8F0',

      primary: '#6B3B66',
      primaryHover: '#552B51',
      primaryLight: '#824B7C',
      primarySoft: '#F0E6F6',
      primaryTint: '#E6D6F0',

      accent: '#D97706',
      accentHover: '#B45309',
      accentSoft: '#FFEDD5',
      accentBorder: '#FED7AA',
      accentText: '#9A3412',

      ink: '#1E1B2E',
      muted: '#64748B',
      subtle: '#94A3B8',

      sidebarBg: '#1A1320',
      sidebarSurface: '#241B2E',
      sidebarHover: '#2A1F35',
      sidebarActivePanel: '#261A2F',
      sidebarBorder: '#2E2238',
      sidebarControlBorder: '#3E2F4D',
      sidebarText: '#BDB1C9',
      sidebarMuted: '#9F8FB0',
      sidebarHeading: '#EFE8F6',
      sidebarKicker: '#C7B0D8',
      sidebarLogoutBg: '#2D1F34',
      sidebarLogoutBorder: '#422E4B',
      sidebarLogoutText: '#F4D9E6',
      sidebarLogoutIcon: '#E09CB8',

      scrollbar: '#D7C6E3',
      scrollbarHover: '#B99CCB',
      overlay: '#1A1320',
    },
  },
};

function hexToRgbTriplet(hex) {
  const clean = String(hex || '').replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return '0 0 0';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r} ${g} ${b}`;
}

function toKebabCase(str) {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function applyTheme(themeKey = ACTIVE_THEME) {
  const theme = THEMES[themeKey] || THEMES.royalPlum;
  if (typeof document === 'undefined') return theme;

  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, hex]) => {
    root.style.setProperty(`--onsta-${toKebabCase(key)}`, hexToRgbTriplet(hex));
  });

  if (theme.fonts?.display) {
    root.style.setProperty('--onsta-font-display', theme.fonts.display);
  }
  if (theme.fonts?.body) {
    root.style.setProperty('--onsta-font-body', theme.fonts.body);
  }

  if (theme.fonts?.googleFontsUrl) {
    const fontLink = document.getElementById('onsta-theme-fonts');
    if (fontLink && fontLink.getAttribute('href') !== theme.fonts.googleFontsUrl) {
      fontLink.setAttribute('href', theme.fonts.googleFontsUrl);
    }
  }

  root.dataset.theme = themeKey;
  return theme;
}
