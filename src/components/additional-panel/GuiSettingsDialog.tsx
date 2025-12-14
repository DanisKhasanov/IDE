import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

interface GuiSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const GuiSettingsDialog: React.FC<GuiSettingsDialogProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const handleSave = () => {
    if (onSave) {
      onSave();
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          minWidth: 600,
          minHeight: 400,
        },
      }}
    >
      <DialogTitle>Настройки GUI</DialogTitle>
      <DialogContent>
        <Typography>Здесь будут настройки GUI</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Закрыть
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

