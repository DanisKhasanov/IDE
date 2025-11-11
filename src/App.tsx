import { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Box,
  CssBaseline,
  IconButton,
  ThemeProvider,
  Toolbar,
  Typography,
} from "@mui/material";
import { createTheme, styled } from "@mui/material/styles";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import CodeEditorPanel from "@src/components/CodeEditorPanel";
import InfoPanel from "@src/components/InfoPanel";
import ProjectTree from "@src/components/ProjectTree";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { readInitialMode, themeStorageKey } from "./utils/readInitialMode";

const HandleGrip = styled("span")(({ theme }) => ({
  width: 2,
  height: "40%",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.divider,
}));



const App = () => {
  const [mode, setMode] = useState<"light" | "dark">(readInitialMode());
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode]
  );


  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage?.setItem(themeStorageKey, mode);
      } catch {
        return;
      }
    }
  }, [mode]);

  const handleToggleMode = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        display="flex"
        flexDirection="column"
        height="100vh"
        bgcolor={theme.palette.background.default}
      >
        <AppBar position="static" >
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              IDE Prototype
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleToggleMode}
              aria-label={mode === "light" ? "Включить тёмную тему" : "Включить светлую тему"}
            >
              {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          display="flex"
          flexGrow={1}
          overflow="hidden"
          bgcolor={theme.palette.background.paper}
        >
          <PanelGroup
            direction="horizontal"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
            }}
          >
            <Panel
              defaultSize={14}
              minSize={15}
              maxSize={40}

            >
              <Box display="flex" height="100%">
                <ProjectTree />
              </Box>
            </Panel>

            <PanelResizeHandle>
              <HandleGrip />
            </PanelResizeHandle>

            <Panel defaultSize={52} minSize={35}>
              <Box display="flex" height="100%">
                <CodeEditorPanel />
              </Box>
            </Panel>

            <PanelResizeHandle>
              <HandleGrip />
            </PanelResizeHandle>
            <Panel defaultSize={24} minSize={15} maxSize={45}>
              <Box display="flex" height="100%">
                <InfoPanel />
              </Box>
            </Panel>
          </PanelGroup>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
