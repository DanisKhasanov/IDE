import React from "react";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { OpenProject } from "@/hooks/useProjectTree";

interface ProjectHeaderProps {
  project: OpenProject;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: (projectPath: string) => void;
  onSwitch: (projectPath: string) => void;
  onClose: (projectPath: string, event: React.MouseEvent) => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  isActive,
  isExpanded,
  onToggle,
  onSwitch,
  onClose,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    // Если клик на кнопку закрытия, не обрабатываем
    if (
      (e.target as HTMLElement).closest('button[title="Закрыть проект"]')
    ) {
      return;
    }
    // При клике на всю кнопку сворачиваем/разворачиваем проект
    onToggle(project.path);
    // Если проект был свернут, также переключаемся на него
    if (!isExpanded) {
      onSwitch(project.path);
    }
  };

  return (
    <ListItem
      disablePadding
      sx={{
        backgroundColor: isActive ? "action.selected" : "transparent",
        "&:hover": {
          backgroundColor: isActive ? "action.selected" : "action.hover",
        },
        borderLeft: isActive ? 2 : 0,
        borderColor: "primary.main",
      }}
    >
      <ListItemButton
        onClick={handleClick}
        sx={{
          py: 0.25,
          px: 1,
          minHeight: 24,
        }}
      >
        <ListItemIcon sx={{ minWidth: 24 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            {isExpanded ? (
              <FolderOpenIcon fontSize="small" />
            ) : (
              <FolderIcon fontSize="small" />
            )}
            {isExpanded ? (
              <ExpandMoreIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </Box>
        </ListItemIcon>
        <ListItemText
          primary={project.name}
          primaryTypographyProps={{
            fontSize: "0.75rem",
            fontWeight: isActive ? 600 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        />
        <IconButton
          size="small"
          onClick={(e) => onClose(project.path, e)}
          sx={{
            ml: 0.5,
            p: 0.25,
            opacity: 0.6,
            "&:hover": {
              opacity: 1,
              backgroundColor: "error.main",
              color: "error.contrastText",
            },
          }}
          title="Закрыть проект"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </ListItemButton>
    </ListItem>
  );
};

