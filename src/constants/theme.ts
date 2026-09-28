export const colors = {
  background: '#F4F6F1',
  border: '#D7DFD3',
  borderSubtle: '#E6EAE0',
  danger: '#9E2A2A',
  dangerSoft: '#FBE3DF',
  info: '#235D73',
  infoSoft: '#E3F2F6',
  onPrimary: '#FFFFFF',
  primary: '#1F6B45',
  primaryMuted: '#2F7E55',
  primaryPressed: '#185438',
  primarySoft: '#E2EEE5',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF1EA',
  surfaceSunken: '#E9EEE4',
  text: '#16221A',
  textMuted: '#566355',
  textSubtle: '#7C8A7B',
  warning: '#8A5A11',
  warningSoft: '#FFF0D2',
} as const;

export const spacing = {
  '3xs': 2,
  '2xs': 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  eyebrow: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  display: {
    fontSize: 30,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 22,
  },
  meta: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  metaStrong: {
    fontSize: 13,
    fontWeight: '700' as const,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  button: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.1,
  },
} as const;
