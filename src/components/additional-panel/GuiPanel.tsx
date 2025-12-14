import React, { useState } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from '@mui/icons-material/Tune';
import { GuiSettingsDialog } from "./GuiSettingsDialog";

interface GuiPanelProps {
  onClose?: () => void;
}

export const GuiPanel: React.FC<GuiPanelProps> = ({ onClose }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {onClose && (
        <Box
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 1,
            display: "flex",
            gap: 0.5,
          }}
        >
          <IconButton
            size="small"
            onClick={() => setSettingsOpen(true)}
            sx={{
              opacity: 0.6,
              "&:hover": {
                opacity: 1,
                backgroundColor: "action.hover",
              },
            }}
            title="Настройки GUI"
          >
            <TuneIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              opacity: 0.6,
              "&:hover": {
                opacity: 1,
                backgroundColor: "error.main",
                color: "error.contrastText",
              },
            }}
            title="Скрыть панель GUI"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          GUI
        </Typography>
      </Box>
      <GuiSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={() => {
          // Здесь будет логика сохранения настроек
        }}
      />
    </Box>
  );
};

