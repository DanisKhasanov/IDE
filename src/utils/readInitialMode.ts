export const themeStorageKey = "ide-theme-mode";

export const readInitialMode = (): "light" | "dark" => {
  if (typeof window !== "undefined") {
    try {
      const storedValue = window.localStorage?.getItem(themeStorageKey);
      if (storedValue === "light" || storedValue === "dark") {
        return storedValue;
      }
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
      if (prefersDark) {
        return "dark";
      }
      const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
      if (prefersLight) {
        return "light";
      }
    } catch {
      return "dark";
    }
  }
  return "dark";
};