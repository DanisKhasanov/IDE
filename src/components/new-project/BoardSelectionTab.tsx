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
  boardCatalog: Array<{
    id: string;
    name: string;
    defaultFcpu: number;
    fcpuOptions: number[];
  }>;
  boardConfigs: Record<
    string,
    { name: string; fcpuOptions?: string[]; defaultFcpu: string; config: BoardConfig }
  >;
  currentBoardConfig: BoardConfig | undefined;
  projectName: string;
  parentPath: string;
  selectedFrequency: string;
  onBoardChange: (boardId: string | null) => void | Promise<void>;
  onProjectNameChange: (name: string) => void;
  onParentPathChange: (path: string) => void;
  onFrequencyChange: (frequency: string) => void;
  onSelectFolder: () => void;
}

// Форматирование частоты для отображения
const formatFrequency = (freq: string): string => {
  const num = parseInt(freq, 10);
  if (num >= 1000000) {
    return `${num / 1000000} МГц`;
  } else if (num >= 1000) {
    return `${num / 1000} кГц`;
  }
  return freq;
};

export const BoardSelectionTab = ({
  selectedBoard,
  boardCatalog,
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
}: BoardSelectionTabProps) => {
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
          {boardCatalog.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth disabled={!selectedBoard}>
        <InputLabel id="frequency-select-label">Частота CPU</InputLabel>
        <Select
          labelId="frequency-select-label"
          value={selectedFrequency}
          label="Частота CPU"
          onChange={(e) => onFrequencyChange(e.target.value)}
        >
          {selectedBoard &&
            (
              boardCatalog.find((b) => b.id === selectedBoard)?.fcpuOptions || []
            ).map((freq) => (
              <MenuItem key={String(freq)} value={String(freq)}>
                {formatFrequency(String(freq))} Hz
              </MenuItem>
            ))}
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

