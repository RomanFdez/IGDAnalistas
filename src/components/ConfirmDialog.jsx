import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogContentText,
    DialogActions, Button
} from '@mui/material';

export default function ConfirmDialog({ open, title, content, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar", isAlert = false }) {
    if (!open) return null;

    return (
        <Dialog
            open={open}
            onClose={isAlert ? onConfirm : onCancel}
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
        >
            <DialogTitle id="confirm-dialog-title">
                {title || (isAlert ? 'Aviso' : '¿Estás seguro?')}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="confirm-dialog-description">
                    {content}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                {!isAlert && (
                    <Button onClick={onCancel} color="inherit">
                        {cancelText}
                    </Button>
                )}
                <Button onClick={onConfirm} variant="contained" color={isAlert ? "primary" : "error"} autoFocus>
                    {isAlert ? "Entendido" : confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
