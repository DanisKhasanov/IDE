import React from "react";
import { Box, Typography, Button } from "@mui/material";

interface EmptyStateProps {
  onNewProjectClick: () => void;
  onSelectProjectClick: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onNewProjectClick,
  onSelectProjectClick,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 2,
        p: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary" align="center">
        Папка еще не открыта
      </Typography>
      <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
        <Button
          variant="contained"
          size="large"
          onClick={onNewProjectClick}
          sx={{
            textTransform: "none",
          }}
        >
          Новый проект
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={onSelectProjectClick}
          sx={{
            textTransform: "none",
          }}
        >
          Открыть папку
        </Button>
      </Box>
    </Box>
  );
};

