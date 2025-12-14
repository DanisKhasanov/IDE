import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import type { ProjectTreeNode } from "@/types/project";

interface TreeNodeProps {
  node: ProjectTreeNode;
  projectPath: string;
  level?: number;
  expandedFolders: Set<string>;
  activeFilePath?: string | null;
  onToggle: (nodeId: string, projectPath: string) => void;
  onFileClick: (filePath: string) => void;
  onContextMenu: (
    event: React.MouseEvent,
    nodePath: string,
    nodeType: "file" | "folder"
  ) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  projectPath,
  level = 0,
  expandedFolders,
  activeFilePath,
  onToggle,
  onFileClick,
  onContextMenu,
}) => {
  const isDirectory = node.type === "directory";
  const isExpanded = expandedFolders.has(node.id);
  const isActive = activeFilePath === node.path && !isDirectory;

  return (
    <Box key={node.id}>
      <ListItem
        disablePadding
        sx={{ pl: level * 2 }}
        onContextMenu={(e) =>
          onContextMenu(e, node.path, isDirectory ? "folder" : "file")
        }
      >
        <ListItemButton
          onClick={() => {
            if (isDirectory) {
              onToggle(node.id, projectPath);
            } else {
              onFileClick(node.path);
            }
          }}
          sx={{
            py: 0.25,
            backgroundColor: isActive ? "action.selected" : "transparent",
            "&:hover": {
              backgroundColor: isActive ? "action.selected" : "action.hover",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            {isDirectory ? (
              isExpanded ? (
                <FolderOpenIcon fontSize="small" />
              ) : (
                <FolderIcon fontSize="small" />
              )
            ) : (
              <InsertDriveFileIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={node.name}
            primaryTypographyProps={{
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "primary.main" : "inherit",
            }}
          />
        </ListItemButton>
      </ListItem>
      {isDirectory && isExpanded && node.children && (
        <List component="div" disablePadding>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              projectPath={projectPath}
              level={level + 1}
              expandedFolders={expandedFolders}
              activeFilePath={activeFilePath}
              onToggle={onToggle}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
            />
          ))}
        </List>
      )}
    </Box>
  );
};

