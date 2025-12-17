import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, IconButton, Avatar, Menu, MenuItem, Divider
} from '@mui/material';
import {
    Logout, Dashboard as DashboardIcon, CheckCircle, Assignment, Menu as MenuIcon, People, BarChart
} from '@mui/icons-material';

const drawerWidth = 260;

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleClose();
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', label: 'Mis Imputaciones', icon: <DashboardIcon /> },
        { path: '/tasks', label: 'Gestión de Tareas', icon: <Assignment /> },
    ];

    if (user?.roles.includes('APPROVER')) {
        navItems.push({ path: '/approvals', label: 'Aprobaciones', icon: <CheckCircle /> });
        navItems.push({ path: '/statistics', label: 'Estadísticas', icon: <BarChart /> });
        navItems.push({ path: '/admin', label: 'Administración', icon: <Assignment /> });
    }

    const drawer = (
        <div>
            <Toolbar sx={{ flexDirection: 'column', justifyContent: 'center', py: 2 }}>
                <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '1rem' }}>
                    Imputaciones GD Analistas
                </Typography>
                <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary', mt: 0.5 }}>
                    Imputad malditos... v1.0
                </Typography>
            </Toolbar>
            <Divider />
            <List sx={{ px: 2, pt: 2 }}>
                {navItems.map((item) => (
                    <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => { navigate(item.path); setMobileOpen(false); }}
                            sx={{
                                borderRadius: 2,
                                '&.Mui-selected': {
                                    bgcolor: 'primary.light',
                                    color: 'primary.dark', // Text color needs to be darker? Or primary.contrastText if solid?
                                    // using default selection style usually works, but let's customize
                                    bgcolor: 'rgba(25, 118, 210, 0.08)',
                                    ':hover': { bgcolor: 'rgba(25, 118, 210, 0.12)' }
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: location.pathname === item.path ? 600 : 400 }} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </div>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: 1
                }}
            >
                <Toolbar variant="dense" sx={{ minHeight: '32px !important' }}>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>

                    <Box sx={{ flexGrow: 1 }} />

                    <Box sx={{ display: 'flex', items: 'center' }}>
                        <Typography variant="subtitle2" sx={{ mr: 2, display: { xs: 'none', md: 'block' }, lineHeight: '32px' }}>
                            {user?.name}
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={handleMenu}
                            color="inherit"
                            sx={{ p: 0.5 }}
                        >
                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                                {user?.name.charAt(0)}
                            </Avatar>
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorEl}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                        >
                            <MenuItem onClick={handleLogout}>
                                <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                                Cerrar Sesión
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #e0e0e0' },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{ flexGrow: 1, p: { xs: 1, md: 3 }, width: { sm: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh', bgcolor: 'background.default' }}
            >
                <Toolbar variant="dense" sx={{ minHeight: '32px !important' }} /> {/* Spacer for fixed AppBar */}
                {children}
            </Box>
        </Box>
    );
}
