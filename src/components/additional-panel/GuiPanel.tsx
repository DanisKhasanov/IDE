import React from "react";
import { Box, Typography } from "@mui/material";

export const GuiPanel: React.FC = () => {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
        GUI
      </Typography>
    </Box>
  );
};

