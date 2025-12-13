import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface GuiPanelProps {
  onClose?: () => void;
}

export const GuiPanel: React.FC<GuiPanelProps> = ({ onClose }) => {
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
          }}
        >
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
    </Box>
  );
};

