// PTIT Learning Color Palette
export const COLORS = {
  primary: '#1a73e8',
  primaryDark: '#1557b0',
  primaryLight: '#e8f0fe',
  secondary: '#34a853',
  accent: '#fbbc04',
  danger: '#ea4335',
  warning: '#f59e0b',

  background: '#f5f7fa',
  surface: '#ffffff',
  card: '#ffffff',

  text: '#1f2937',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  textWhite: '#ffffff',

  border: '#e5e7eb',
  divider: '#f3f4f6',

  success: '#10b981',
  info: '#3b82f6',
  error: '#ef4444',

  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const FONTS = {
  regular: { fontSize: 14, color: COLORS.text },
  medium: { fontSize: 16, fontWeight: '500', color: COLORS.text },
  bold: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  heading: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  small: { fontSize: 12, color: COLORS.textSecondary },
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};
