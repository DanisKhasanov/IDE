import React, { useRef, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import type { BoardConfig } from "@/types/boardConfig";


interface BoardSelectionTabProps {
  selectedBoard: string | null;
  boardConfigs: Record<
    string,
    { name: string; frequency: string; config: BoardConfig }
  >;
  currentBoardConfig: BoardConfig | undefined;
  projectName: string;
  parentPath: string;
  selectedFrequency: string;
  onBoardChange: (boardId: string | null) => void;
  onProjectNameChange: (name: string) => void;
  onParentPathChange: (path: string) => void;
  onFrequencyChange: (frequency: string) => void;
  onSelectFolder: () => void;
}

export const BoardSelectionTab: React.FC<BoardSelectionTabProps> = ({
  selectedBoard,
  boardConfigs,
  currentBoardConfig,
  projectName,
  parentPath,
  selectedFrequency,
  onBoardChange,
  onProjectNameChange,
  onParentPathChange,
  onFrequencyChange,
  onSelectFolder,
}) => {
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const prevParentPathRef = useRef<string>(parentPath);

  useEffect(() => {
    // Устанавливаем фокус на поле названия проекта, если папка была выбрана
    if (parentPath && parentPath !== prevParentPathRef.current) {
      // Используем setTimeout для гарантии, что DOM обновился
      setTimeout(() => {
        projectNameInputRef.current?.focus();
      }, 100);
    }
    prevParentPathRef.current = parentPath;
  }, [parentPath]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        p: 2,
        overflow: "auto",
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
        Выбор платы
      </Typography>
      <FormControl fullWidth>
        <InputLabel id="board-select-label">Плата</InputLabel>
        <Select
          labelId="board-select-label"
          value={selectedBoard || ""}
          label="Плата"
          onChange={(e) => onBoardChange(e.target.value || null)}
        >
          <MenuItem value="">
            <em>Не выбрано</em>
          </MenuItem>
          {Object.entries(boardConfigs).map(([id, board]) => (
            <MenuItem key={id} value={id}>
              {board.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="frequency-select-label">Частота CPU</InputLabel>
        <Select
          labelId="frequency-select-label"
          value={selectedFrequency}
          label="Частота CPU"
          onChange={(e) => onFrequencyChange(e.target.value)}
        >
          {currentBoardConfig && (
            <MenuItem key={currentBoardConfig.frequency} value={currentBoardConfig.frequency}>
              {currentBoardConfig.frequency} Hz
            </MenuItem>
          )}
        </Select>
      </FormControl>

      <Box sx={{ mt: "auto", pt: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
        Расположение проекта
      </Typography>
        <TextField
          inputRef={projectNameInputRef}
          label="Название проекта"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Введите название проекта"
        />
          <TextField
            label="Родительская папка"
            value={parentPath}
            onChange={(e) => onParentPathChange(e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Выберите папку для создания проекта"
            InputProps={{
              readOnly: true,
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FolderIcon />}
            onClick={onSelectFolder}
            fullWidth
            size="small"
          >
            Выбрать папку
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

