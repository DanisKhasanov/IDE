import { useState, useCallback } from "react";

export type ContextMenuState = {
  mouseX: number;
  mouseY: number;
  nodePath: string;
  nodeType: "file" | "folder";
} | null;

export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const handleContextMenu = useCallback(
    (
      event: React.MouseEvent,
      nodePath: string,
      nodeType: "file" | "folder"
    ) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu(
        contextMenu === null
          ? {
              mouseX: event.clientX + 2,
              mouseY: event.clientY - 6,
              nodePath,
              nodeType,
            }
          : null
      );
    },
    [contextMenu]
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  return {
    contextMenu,
    handleContextMenu,
    handleCloseContextMenu,
  };
};

