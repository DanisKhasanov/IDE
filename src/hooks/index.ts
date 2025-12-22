// Project hooks
export { useProjectTree, type OpenProject } from "./project/useProjectTree";
export { useProjectOperations } from "./project/useProjectOperations";
export { useExpandedFolders } from "./project/useExpandedFolders";
export { useProjectFiles } from "./project/useProjectFiles";
export { useProjectMenu } from "./project/useProjectMenu";
export { useNewProjectModal } from "./project/useNewProjectModal";
export { useFileHandler } from "./project/useFileHandler";
export { useProjectConfiguration, type ProjectConfiguration } from "./project/useProjectConfiguration";

// Editor hooks
export { useMonacoModel } from "./editor/useMonacoModel";
export { useGoToDefinition } from "./editor/useGoToDefinition";
export { useCompletionProvider } from "./editor/useCompletionProvider";

// UI hooks
export { useTheme } from "./ui/useTheme";
export { useContextMenu, type ContextMenuState } from "./ui/useContextMenu";

// Common hooks

// Terminal hooks
export { useTerminal } from "./terminal/useTerminal";
