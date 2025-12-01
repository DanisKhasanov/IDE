import React from "react";
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

const CPU_FREQUENCIES = [
  { value: "8000000L", label: "8 MHz" },
  { value: "16000000L", label: "16 MHz" },
  { value: "20000000L", label: "20 MHz" },
];

interface BoardSelectionPanelProps {
  selectedBoard: string;
  boardConfigs: Record<
    string,
    { name: string; mcu: string; config: BoardConfig }
  >;
  currentBoardConfig: BoardConfig | null;
  projectName: string;
  parentPath: string;
  selectedFrequency: string;
  onBoardChange: (boardId: string) => void;
  onProjectNameChange: (name: string) => void;
  onParentPathChange: (path: string) => void;
  onFrequencyChange: (frequency: string) => void;
  onSelectFolder: () => void;
}

export const BoardSelectionPanel: React.FC<BoardSelectionPanelProps> = ({
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
  return (
    <Box
      sx={{
        width: "20%",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        borderRight: 1,
        borderColor: "divider",
        pr: 2,
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
        Выбор платы
      </Typography>
      <FormControl fullWidth>
        <InputLabel id="board-select-label">Плата</InputLabel>
        <Select
          labelId="board-select-label"
          value={selectedBoard}
          label="Плата"
          onChange={(e) => onBoardChange(e.target.value)}
        >
          {Object.entries(boardConfigs).map(([id, board]) => (
            <MenuItem key={id} value={id}>
              {board.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ mt: "auto", pt: 2 }}>
        <TextField
          label="Название проекта"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Введите название проекта"
        />
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
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
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="frequency-select-label">Частота CPU</InputLabel>
          <Select
            labelId="frequency-select-label"
            value={selectedFrequency}
            label="Частота CPU"
            onChange={(e) => onFrequencyChange(e.target.value)}
          >
            {CPU_FREQUENCIES.map((freq) => (
              <MenuItem key={freq.value} value={freq.value}>
                {freq.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};
