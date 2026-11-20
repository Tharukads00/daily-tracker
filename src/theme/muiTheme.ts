import { createTheme } from '@mui/material/styles';

export const M3_TOKENS = {
  light: {
    canvas: '#F6F8FC',
    surface: '#FFFFFF',
    surfaceLow: '#F0F4FA',
    surfaceHigh: '#E7EDF6',
    primary: '#00639B',
    primaryHover: '#004E7C',
    primaryContainer: '#CEE5FF',
    onPrimaryContainer: '#001D32',
    secondaryContainer: '#D8E3F2',
    onSecondaryContainer: '#111D2B',
    success: '#0E7A56',
    successContainer: '#D3F4E5',
    warning: '#A15C00',
    warningContainer: '#FFE6C4',
    error: '#BA1A1A',
    errorContainer: '#FFDAD6',
    outline: '#DDE3EE',
    textPrimary: '#191C20',
    textSecondary: '#515864',
  },
  dark: {
    canvas: '#111318',
    surface: '#1A1D24',
    surfaceLow: '#1E222B',
    surfaceHigh: '#272C37',
    primary: '#8ACEFF',
    primaryHover: '#A8DCFF',
    primaryContainer: '#004B73',
    onPrimaryContainer: '#CEE5FF',
    secondaryContainer: '#364152',
    onSecondaryContainer: '#D8E3F2',
    success: '#6DDBAC',
    successContainer: '#0A3B2B',
    warning: '#FFB951',
    warningContainer: '#472B00',
    error: '#FFB4AB',
    errorContainer: '#5C1414',
    outline: '#2B313E',
    textPrimary: '#E3E5EC',
    textSecondary: '#9EA6B6',
  },
};

export function buildDaymarkMuiTheme(isDark: boolean) {
  const t = isDark ? M3_TOKENS.dark : M3_TOKENS.light;

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: t.primary,
        contrastText: isDark ? '#003352' : '#FFFFFF',
      },
      secondary: {
        main: isDark ? '#B7C8DC' : '#4E6075',
      },
      success: {
        main: t.success,
      },
      warning: {
        main: t.warning,
      },
      error: {
        main: t.error,
      },
      background: {
        default: t.canvas,
        paper: t.surface,
      },
      text: {
        primary: t.textPrimary,
        secondary: t.textSecondary,
      },
      divider: t.outline,
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      h1: {
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        fontWeight: 700,
        letterSpacing: '-0.015em',
      },
      h3: {
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        fontWeight: 600,
      },
      h6: {
        fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        fontWeight: 700,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.005em',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.canvas,
            color: t.textPrimary,
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 22,
            border: `1px solid ${t.outline}`,
            backgroundColor: t.surface,
            transition: 'border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 999,
            minHeight: 44,
            paddingLeft: 18,
            paddingRight: 18,
            whiteSpace: 'nowrap',
          },
          sizeSmall: {
            minHeight: 36,
            paddingLeft: 14,
            paddingRight: 14,
          },
          sizeLarge: {
            minHeight: 48,
            paddingLeft: 22,
            paddingRight: 22,
          },
          outlined: {
            borderColor: t.outline,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            minWidth: 40,
            minHeight: 40,
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: isDark
              ? '0 8px 24px rgba(0, 0, 0, 0.48)'
              : '0 6px 20px rgba(0, 99, 155, 0.25)',
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: t.surfaceLow,
            padding: 4,
            borderRadius: 999,
            border: `1px solid ${t.outline}`,
            gap: 4,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            border: 'none !important',
            borderRadius: '999px !important',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            minHeight: 36,
            padding: '6px 14px',
            color: t.textSecondary,
            '&.Mui-selected': {
              backgroundColor: t.primaryContainer,
              color: t.onPrimaryContainer,
              '&:hover': {
                backgroundColor: t.primaryContainer,
              },
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundColor: isDark ? '#151820' : '#F9FBFE',
            '& fieldset': {
              borderColor: t.outline,
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            backgroundColor: t.surfaceHigh,
          },
          bar: {
            borderRadius: 999,
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            height: 6,
            padding: '12px 0',
          },
          thumb: {
            width: 20,
            height: 20,
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
          },
          rail: {
            opacity: 1,
            backgroundColor: t.surfaceHigh,
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 50,
            height: 30,
            padding: 0,
            '& .MuiSwitch-switchBase': {
              padding: 3,
              '&.Mui-checked': {
                transform: 'translateX(20px)',
                color: isDark ? '#003352' : '#FFFFFF',
                '& + .MuiSwitch-track': {
                  opacity: 1,
                  backgroundColor: t.primary,
                },
              },
            },
            '& .MuiSwitch-thumb': {
              width: 24,
              height: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            },
            '& .MuiSwitch-track': {
              borderRadius: 999,
              opacity: 1,
              backgroundColor: t.surfaceHigh,
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: t.surface,
            backgroundImage: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 28,
            border: `1px solid ${t.outline}`,
            backgroundColor: t.surface,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
    },
  });
}
