/**
 * colors.ts — MacroFactor Dark Theme Design Tokens
 * ─────────────────────────────────────────────────────────────────────────────
 * Matches exact hex codes from the reference specification.
 */

export const colors = {
  // Surfaces
  appDark: '#121213',       // Screen background (pure OLED dark)
  cardBg: '#1c1c1e',        // Elevated card background
  cardHeader: '#242426',    // Card headers & toggle pills background
  dimBlock: '#282a2d',      // Inactive day block in habit heatmaps
  borderSubtle: '#2a2b2e',  // Subtle borders

  // Accents & Macro Coding
  accentBlue: '#4b88eb',    // Calories consumed arc & food logging heatmap
  accentOrange: '#de7237',  // Protein macro bar & badges
  accentYellow: '#e5ad35',  // Fat macro bar & badges
  accentGreen: '#3eb474',   // Carbs macro bar & weigh-in heatmap
  accentPurple: '#9c27b0',  // Sleep & recovery badge

  // Typography
  textPrimary: '#ffffff',   // Primary text / metric figures
  textSecondary: '#808288', // Subtitles, unit labels, inactive tabs
  subtleGray: '#808288',    // Subtle gray accents / inactive indicators
  textMuted: '#5a5c62',     // Minor footers / placeholders
  textDark: '#000000',      // Active pill label & floating plus button icon

  // State
  cardPressed: '#262629',
};
