import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2', // Google Blue
        },
        background: {
            default: '#f4f6f8',
            paper: '#ffffff',
        },
        // Custom pastel colors
        taskTypes: {
            TRABAJADO: '#e8f5e9', // Green 50
            JIRA: '#c8e6c9',      // Green 100
            YA_IMPUTADO: '#e3f2fd', // Blue 50
            PRE_IMPUTADO: '#bbdefb', // Blue 100
            SIN_PROYECTO: '#f5f5f5', // Grey 100
            PENDIENTE: '#fce4ec',    // Pink 50
            REGULARIZADO: '#ffe0b2', // Orange 100
            RECUPERADO: '#e1bee7',   // Purple 100
            VACACIONES: '#fafafa',   // Grey 50
            ENFERMEDAD: '#eeeeee',   // Grey 200
            FESTIVO: '#e0e0e0',      // Grey 300
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h5: {
            fontWeight: 600,
        },
        h4: {
            fontWeight: 600,
        }
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                },
                elevation1: {
                    boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.05), 0px 4px 5px 0px rgba(0,0,0,0.01), 0px 1px 10px 0px rgba(0,0,0,0.02)',
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                variant: 'outlined',
                size: 'small',
            }
        }
    },
});

export default theme;
