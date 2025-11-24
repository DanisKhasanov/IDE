import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FolderIcon from "@mui/icons-material/Folder";

type NewProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onProjectCreate: (projectPath: string) => void;
};

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  open,
  onClose,
  onProjectCreate,
}) => {
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectFolder = async () => {
    try {
      if (!window.electronAPI || !window.electronAPI.selectProjectFolder) {
        console.error("selectProjectFolder не доступен");
        return;
      }
      const project = await window.electronAPI.selectProjectFolder();
      if (project) {
        setProjectPath(project.path);
        if (!projectName) {
          setProjectName(project.name);
        }
        // Проект уже открывается автоматически при выборе через selectProjectFolder
        // Отправляем событие обновления списка проектов
        window.dispatchEvent(new CustomEvent("project-list-changed"));
      }
    } catch (error) {
      console.error("Ошибка выбора папки:", error);
    }
  };

  const handleCreate = async () => {
    if (!projectPath) {
      return;
    }

    setIsCreating(true);
    try {
      // Проект уже открыт при выборе папки, просто передаем путь
      onProjectCreate(projectPath);
      handleClose();
    } catch (error) {
      console.error("Ошибка создания проекта:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setProjectName("");
    setProjectPath("");
    setIsCreating(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          width: "80%",
          maxWidth: "800px",
          height: "70%",
          maxHeight: "600px",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6">Новый проект</Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            pt: 2,
          }}
        >
          <TextField
            label="Название проекта"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            fullWidth
            variant="outlined"
            placeholder="Введите название проекта"
          />

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <TextField
              label="Путь к проекту"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="Выберите папку для проекта"
              InputProps={{
                readOnly: true,
              }}
            />
            <Button
              variant="outlined"
              startIcon={<FolderIcon />}
              onClick={handleSelectFolder}
              sx={{
                alignSelf: "flex-start",
              }}
            >
              Выбрать папку
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Выберите папку, в которой будет создан новый проект. Если папка не
            существует, она будет создана автоматически.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isCreating}>
          Отмена
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!projectPath || isCreating}
        >
          {isCreating ? "Создание..." : "Создать проект"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProjectModal;

