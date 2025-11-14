import { useEffect, useMemo, useState } from "react";
import { createTheme, Theme } from "@mui/material/styles";
import { readInitialMode, themeStorageKey } from "@utils/ReadInitialMode";

export const useTheme = () => {
  const [mode, setMode] = useState<"light" | "dark">(readInitialMode());

  const theme = useMemo<Theme>(
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

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  return {
    mode,
    theme,
    toggleMode,
  };
};



