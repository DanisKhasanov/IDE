import React from "react";
import { Menu, MenuItem } from "@mui/material";
import type { ContextMenuState } from "@/hooks/useContextMenu";

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  onClose: () => void;
  onCreateFile: (nodePath: string) => void;
  onCreateFolder: (nodePath: string) => void;
  onDeleteFile: (nodePath: string) => void;
  onDeleteFolder: (nodePath: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  onClose,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
}) => {
  const handleCreateFile = () => {
    if (contextMenu) {
      onCreateFile(contextMenu.nodePath);
    }
    onClose();
  };

  const handleCreateFolder = () => {
    if (contextMenu) {
      onCreateFolder(contextMenu.nodePath);
    }
    onClose();
  };

  const handleDeleteFile = () => {
    if (contextMenu) {
      onDeleteFile(contextMenu.nodePath);
    }
    onClose();
  };

  const handleDeleteFolder = () => {
    if (contextMenu) {
      onDeleteFolder(contextMenu.nodePath);
    }
    onClose();
  };

  return (
    <Menu
      open={contextMenu !== null}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        contextMenu !== null
          ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
          : undefined
      }
    >
      <MenuItem onClick={handleCreateFile}>Создать файл</MenuItem>
      <MenuItem onClick={handleCreateFolder}>Создать папку</MenuItem>
      {contextMenu?.nodeType === "file" && (
        <MenuItem onClick={handleDeleteFile}>Удалить файл</MenuItem>
      )}
      {contextMenu?.nodeType === "folder" && (
        <MenuItem onClick={handleDeleteFolder}>Удалить папку</MenuItem>
      )}
    </Menu>
  );
};

