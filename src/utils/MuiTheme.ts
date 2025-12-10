import { ThemeOptions } from '@mui/material/styles';

/**
 * Кастомные стили для MUI темы
 * Определяет цвета, типографику, компоненты и другие настройки темы
 */
export const getMuiThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => {
  const isDark = mode === 'dark';

  return {
    palette: {
      mode,
      primary: {
        main: isDark ? '#64b5f6' : '#546e7a',
        light: isDark ? '#90caf9' : '#78909c',
        dark: isDark ? '#1976d2' : '#37474f',
        contrastText: isDark ? '#000' : '#fff',
      },
      secondary: {
        main: isDark ? '#ba68c8' : '#7b1fa2',
        light: isDark ? '#ce93d8' : '#9c27b0',
        dark: isDark ? '#8e24aa' : '#6a1b9a',
        contrastText: isDark ? '#000' : '#fff',
      },
      error: {
        main: isDark ? '#f44336' : '#d32f2f',
        light: isDark ? '#e57373' : '#ef5350',
        dark: isDark ? '#d32f2f' : '#c62828',
        contrastText: '#fff',
      },
      warning: {
        main: isDark ? '#ffa726' : '#ed6c02',
        light: isDark ? '#ffb74d' : '#ff9800',
        dark: isDark ? '#f57c00' : '#e65100',
        contrastText: isDark ? '#000' : '#fff',
      },
      info: {
        main: isDark ? '#29b6f6' : '#0288d1',
        light: isDark ? '#4fc3f7' : '#03a9f4',
        dark: isDark ? '#0288d1' : '#01579b',
        contrastText: isDark ? '#000' : '#fff',
      },
      success: {
        main: isDark ? '#66bb6a' : '#2e7d32',
        light: isDark ? '#81c784' : '#4caf50',
        dark: isDark ? '#388e3c' : '#1b5e20',
        contrastText: '#fff',
      },
      background: {
        default: isDark ? '#121212' : '#a0a0a0',
        paper: isDark ? '#1e1e1e' : '#f2f2f2',
      },
      text: {
        primary: isDark ? '#ffffff' : '#212121',
        secondary: isDark ? '#b0b0b0' : '#757575',
        disabled: isDark ? '#666666' : '#bdbdbd',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      action: {
        active: isDark ? '#ffffff' : '#212121',
        hover: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        selected: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
        disabled: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
        disabledBackground: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      h1: {
        fontSize: '2.125rem',
        fontWeight: 500,
        lineHeight: 1.2,
        letterSpacing: '-0.01562em',
      },
      h2: {
        fontSize: '1.75rem',
        fontWeight: 500,
        lineHeight: 1.3,
        letterSpacing: '-0.00833em',
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 500,
        lineHeight: 1.4,
        letterSpacing: '0em',
      },
      h4: {
        fontSize: '1.3125rem',
        fontWeight: 500,
        lineHeight: 1.4,
        letterSpacing: '0.00735em',
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: '0em',
      },
      h6: {
        fontSize: '0.9375rem',
        fontWeight: 500,
        lineHeight: 1.6,
        letterSpacing: '0.0075em',
      },
      body1: {
        fontSize: '0.9375rem',
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '0.00938em',
      },
      body2: {
        fontSize: '0.8125rem',
        fontWeight: 400,
        lineHeight: 1.43,
        letterSpacing: '0.01071em',
      },
      button: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.75,
        letterSpacing: '0.02857em',
        textTransform: 'none',
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.66,
        letterSpacing: '0.03333em',
      },
      overline: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 2.66,
        letterSpacing: '0.08333em',
        textTransform: 'uppercase',
      },
    },
 
    spacing: 8,
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: isDark
              ? 'rgba(255, 255, 255, 0.2) transparent'
              : 'rgba(0, 0, 0, 0.2) transparent',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
              '&:hover': {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.3)'
                  : 'rgba(0, 0, 0, 0.3)',
              },
            },
            '&::-webkit-scrollbar-corner': {
              backgroundColor: 'transparent',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: isDark
              ? '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)'
              : '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
            textTransform: 'none',
            fontWeight: 500,
          },
          contained: {
            boxShadow: isDark
              ? '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)'
              : '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
            '&:hover': {
              boxShadow: isDark
                ? '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)'
                : '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: isDark
              ? '0px 2px 8px rgba(0,0,0,0.3)'
              : '0px 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            padding: 8,
            '&:hover': {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.04)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            minHeight: 48,
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 56,
            '@media (min-width: 600px)': {
              minHeight: 64,
            },
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            fontSize: '0.8125rem',
            fontWeight: 400,
            lineHeight: 1.43,
          },
          secondary: {
            fontSize: '0.75rem',
            fontWeight: 400,
            lineHeight: 1.43,
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            wordBreak: 'break-word',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            fontSize: '0.8125rem',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            padding: '6px 16px',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            boxShadow: isDark
              ? '0px 8px 32px rgba(0,0,0,0.4), 0px 4px 16px rgba(0,0,0,0.3)'
              : '0px 8px 32px rgba(0,0,0,0.15), 0px 4px 16px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            background: isDark
              ? 'linear-gradient(135deg, rgba(100, 181, 246, 0.15) 0%, rgba(186, 104, 200, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(84, 110, 122, 0.12) 0%, rgba(123, 31, 162, 0.08) 100%)',
            borderBottom: isDark
              ? '1px solid rgba(100, 181, 246, 0.2)'
              : '1px solid rgba(84, 110, 122, 0.15)',
            padding: '16px 24px',
            fontWeight: 600,
            fontSize: '1.0625rem',
            color: isDark ? '#e3f2fd' : '#37474f',
            '& .MuiTypography-root': {
              fontWeight: 600,
              fontSize: '1.0625rem',
            },
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '15px',
            fontSize: '0.9375rem',
            '& .MuiTypography-root': {
              fontSize: '0.8125rem', // Уменьшаем базовый размер текста в диалогах
            },
            '& .MuiTypography-subtitle1': {
              fontSize: '0.875rem', // Уменьшаем subtitle1
            },
            '& .MuiTypography-body1': {
              fontSize: '0.8125rem', // Уменьшаем body1
            },
            '& .MuiTypography-body2': {
              fontSize: '0.75rem', // Уменьшаем body2
            },
            '& .MuiTypography-caption': {
              fontSize: '0.6875rem', // Уменьшаем caption
            },
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '16px 24px',
            borderTop: isDark
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(0, 0, 0, 0.08)',
            background: isDark
              ? 'rgba(0, 0, 0, 0.2)'
              : 'rgba(0, 0, 0, 0.02)',
          },
        },
      },
    },
  };
};

