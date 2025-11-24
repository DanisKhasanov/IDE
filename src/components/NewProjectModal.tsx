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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FolderIcon from "@mui/icons-material/Folder";

// Моковые данные для плат
interface Pin {
  number: number;
  name: string;
  type: "digital" | "analog" | "power" | "ground";
  functions?: string[];
}

interface Board {
  id: string;
  name: string;
  mcu: string;
  fCpu: string;
  variant: string;
  pins: Pin[];
}

const MOCK_BOARDS: Board[] = [
  {
    id: "uno",
    name: "Arduino Uno",
    mcu: "atmega328p",
    fCpu: "16000000L",
    variant: "standard",
    pins: [
      { number: 0, name: "D0/RX", type: "digital", functions: ["UART"] },
      { number: 1, name: "D1/TX", type: "digital", functions: ["UART"] },
      { number: 2, name: "D2", type: "digital", functions: ["INT0"] },
      { number: 3, name: "D3/PWM", type: "digital", functions: ["PWM", "INT1"] },
      { number: 4, name: "D4", type: "digital" },
      { number: 5, name: "D5/PWM", type: "digital", functions: ["PWM"] },
      { number: 6, name: "D6/PWM", type: "digital", functions: ["PWM"] },
      { number: 7, name: "D7", type: "digital" },
      { number: 8, name: "D8", type: "digital" },
      { number: 9, name: "D9/PWM", type: "digital", functions: ["PWM"] },
      { number: 10, name: "D10/PWM/SS", type: "digital", functions: ["PWM", "SPI"] },
      { number: 11, name: "D11/PWM/MOSI", type: "digital", functions: ["PWM", "SPI"] },
      { number: 12, name: "D12/MISO", type: "digital", functions: ["SPI"] },
      { number: 13, name: "D13/SCK/LED", type: "digital", functions: ["SPI"] },
      { number: 14, name: "A0", type: "analog" },
      { number: 15, name: "A1", type: "analog" },
      { number: 16, name: "A2", type: "analog" },
      { number: 17, name: "A3", type: "analog" },
      { number: 18, name: "A4/SDA", type: "analog", functions: ["I2C"] },
      { number: 19, name: "A5/SCL", type: "analog", functions: ["I2C"] },
      { number: 20, name: "VIN", type: "power" },
      { number: 21, name: "GND", type: "ground" },
      { number: 22, name: "5V", type: "power" },
      { number: 23, name: "3.3V", type: "power" },
      { number: 24, name: "AREF", type: "analog" },
    ],
  },
  {
    id: "nano",
    name: "Arduino Nano",
    mcu: "atmega328p",
    fCpu: "16000000L",
    variant: "standard",
    pins: [
      { number: 0, name: "D0/RX", type: "digital", functions: ["UART"] },
      { number: 1, name: "D1/TX", type: "digital", functions: ["UART"] },
      { number: 2, name: "D2", type: "digital", functions: ["INT0"] },
      { number: 3, name: "D3/PWM", type: "digital", functions: ["PWM", "INT1"] },
      { number: 4, name: "D4", type: "digital" },
      { number: 5, name: "D5/PWM", type: "digital", functions: ["PWM"] },
      { number: 6, name: "D6/PWM", type: "digital", functions: ["PWM"] },
      { number: 7, name: "D7", type: "digital" },
      { number: 8, name: "D8", type: "digital" },
      { number: 9, name: "D9/PWM", type: "digital", functions: ["PWM"] },
      { number: 10, name: "D10/PWM/SS", type: "digital", functions: ["PWM", "SPI"] },
      { number: 11, name: "D11/PWM/MOSI", type: "digital", functions: ["PWM", "SPI"] },
      { number: 12, name: "D12/MISO", type: "digital", functions: ["SPI"] },
      { number: 13, name: "D13/SCK/LED", type: "digital", functions: ["SPI"] },
      { number: 14, name: "A0", type: "analog" },
      { number: 15, name: "A1", type: "analog" },
      { number: 16, name: "A2", type: "analog" },
      { number: 17, name: "A3", type: "analog" },
      { number: 18, name: "A4/SDA", type: "analog", functions: ["I2C"] },
      { number: 19, name: "A5/SCL", type: "analog", functions: ["I2C"] },
      { number: 20, name: "VIN", type: "power" },
      { number: 21, name: "GND", type: "ground" },
      { number: 22, name: "5V", type: "power" },
      { number: 23, name: "3.3V", type: "power" },
      { number: 24, name: "AREF", type: "analog" },
    ],
  },
  {
    id: "mega",
    name: "Arduino Mega 2560",
    mcu: "atmega2560",
    fCpu: "16000000L",
    variant: "mega",
    pins: [
      { number: 0, name: "D0/RX", type: "digital", functions: ["UART"] },
      { number: 1, name: "D1/TX", type: "digital", functions: ["UART"] },
      { number: 2, name: "D2", type: "digital", functions: ["INT0"] },
      { number: 3, name: "D3/PWM", type: "digital", functions: ["PWM", "INT1"] },
      { number: 4, name: "D4", type: "digital" },
      { number: 5, name: "D5/PWM", type: "digital", functions: ["PWM"] },
      { number: 6, name: "D6/PWM", type: "digital", functions: ["PWM"] },
      { number: 7, name: "D7", type: "digital" },
      { number: 8, name: "D8", type: "digital" },
      { number: 9, name: "D9/PWM", type: "digital", functions: ["PWM"] },
      { number: 10, name: "D10/PWM/SS", type: "digital", functions: ["PWM", "SPI"] },
      { number: 11, name: "D11/PWM/MOSI", type: "digital", functions: ["PWM", "SPI"] },
      { number: 12, name: "D12/MISO", type: "digital", functions: ["SPI"] },
      { number: 13, name: "D13/SCK/LED", type: "digital", functions: ["SPI"] },
      { number: 14, name: "A0", type: "analog" },
      { number: 15, name: "A1", type: "analog" },
      { number: 16, name: "A2", type: "analog" },
      { number: 17, name: "A3", type: "analog" },
      { number: 18, name: "A4/SDA", type: "analog", functions: ["I2C"] },
      { number: 19, name: "A5/SCL", type: "analog", functions: ["I2C"] },
      { number: 20, name: "VIN", type: "power" },
      { number: 21, name: "GND", type: "ground" },
      { number: 22, name: "5V", type: "power" },
      { number: 23, name: "3.3V", type: "power" },
      { number: 24, name: "AREF", type: "analog" },
    ],
  },
];

const CPU_FREQUENCIES = [
  { value: "8000000L", label: "8 MHz" },
  { value: "16000000L", label: "16 MHz" },
  { value: "20000000L", label: "20 MHz" },
];

const VARIANTS = [
  { value: "standard", label: "Standard" },
  { value: "mega", label: "Mega" },
  { value: "leonardo", label: "Leonardo" },
];

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
  const [parentPath, setParentPath] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string>("uno");
  const [selectedFrequency, setSelectedFrequency] = useState<string>("16000000L");
  const [selectedVariant, setSelectedVariant] = useState<string>("standard");

  const handleSelectFolder = async () => {
    try {
      if (!window.electronAPI || !window.electronAPI.selectParentFolder) {
        console.error("selectParentFolder не доступен");
        return;
      }
      // Выбираем родительскую папку, где будет создан проект (без открытия как проекта)
      const result = await window.electronAPI.selectParentFolder();
      if (result) {
        // Используем путь выбранной папки как родительскую папку
        setParentPath(result.path);
      }
    } catch (error) {
      console.error("Ошибка выбора папки:", error);
    }
  };

  const handleCreate = async () => {
    if (!parentPath || !projectName || !projectName.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      if (!window.electronAPI || !window.electronAPI.createNewProject) {
        console.error("createNewProject не доступен");
        return;
      }
      
      // Создаем новый проект (папку с названием проекта)
      const project = await window.electronAPI.createNewProject(parentPath, projectName.trim());
      if (project) {
        // Отправляем событие обновления списка проектов
        window.dispatchEvent(new CustomEvent("project-list-changed"));
        // Передаем путь созданного проекта
        onProjectCreate(project.path);
        handleClose();
      }
    } catch (error) {
      console.error("Ошибка создания проекта:", error);
      alert(error instanceof Error ? error.message : "Ошибка создания проекта");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setProjectName("");
    setParentPath("");
    setIsCreating(false);
    setSelectedBoard("uno");
    setSelectedFrequency("16000000L");
    setSelectedVariant("standard");
    onClose();
  };

  const currentBoard = MOCK_BOARDS.find((b) => b.id === selectedBoard) || MOCK_BOARDS[0];

  // Компонент для визуализации корпуса с пинами
  const PinVisualization: React.FC<{ pins: Pin[] }> = ({ pins }) => {
    const getPinColor = (type: string) => {
      switch (type) {
        case "digital":
          return "#2196F3";
        case "analog":
          return "#4CAF50";
        case "power":
          return "#F44336";
        case "ground":
          return "#424242";
        default:
          return "#9E9E9E";
      }
    };

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          height: "100%",
          overflow: "auto",
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
          Распиновка
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 1,
          }}
        >
          {pins.map((pin) => (
            <Paper
              key={pin.number}
              elevation={1}
              sx={{
                p: 1,
                backgroundColor: getPinColor(pin.type),
                color: "white",
                textAlign: "center",
                fontSize: "0.75rem",
                cursor: "pointer",
                "&:hover": {
                  opacity: 0.8,
                  transform: "scale(1.05)",
                },
                transition: "all 0.2s",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                {pin.name}
              </Typography>
              {pin.functions && pin.functions.length > 0 && (
                <Typography variant="caption" sx={{ display: "block", fontSize: "0.65rem", opacity: 0.9 }}>
                  {pin.functions.join(", ")}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          width: "90%",
          maxWidth: "1400px",
          height: "85%",
          maxHeight: "800px",
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
      <DialogContent dividers sx={{ p: 2, height: "calc(100% - 120px)", overflow: "hidden" }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            height: "100%",
          }}
        >
          {/* Левая панель - Выбор платы */}
          <Box
            sx={{
              width: "25%",
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
                onChange={(e) => setSelectedBoard(e.target.value)}
              >
                {MOCK_BOARDS.map((board) => (
                  <MenuItem key={board.id} value={board.id}>
                    {board.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Информация о плате:
              </Typography>
              <Typography variant="caption" display="block">
                MCU: {currentBoard.mcu}
              </Typography>
              <Typography variant="caption" display="block">
                Вариант: {currentBoard.variant}
              </Typography>
              <Typography variant="caption" display="block">
                Пинов: {currentBoard.pins.length}
              </Typography>
            </Box>
            <Box sx={{ mt: "auto", pt: 2 }}>
              <TextField
                label="Название проекта"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Введите название проекта"
              />
              <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                <TextField
                  label="Родительская папка"
                  value={parentPath}
                  onChange={(e) => setParentPath(e.target.value)}
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
                  onClick={handleSelectFolder}
                  fullWidth
                  size="small"
                >
                  Выбрать папку
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Центральная панель - Настройки */}
          <Box
            sx={{
              width: "35%",
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
              Настройки проекта
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="frequency-select-label">Частота CPU</InputLabel>
              <Select
                labelId="frequency-select-label"
                value={selectedFrequency}
                label="Частота CPU"
                onChange={(e) => setSelectedFrequency(e.target.value)}
              >
                {CPU_FREQUENCIES.map((freq) => (
                  <MenuItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="variant-select-label">Вариант</InputLabel>
              <Select
                labelId="variant-select-label"
                value={selectedVariant}
                label="Вариант"
                onChange={(e) => setSelectedVariant(e.target.value)}
              >
                {VARIANTS.map((variant) => (
                  <MenuItem key={variant.value} value={variant.value}>
                    {variant.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="mcu-select-label">Микроконтроллер</InputLabel>
              <Select
                labelId="mcu-select-label"
                value={currentBoard.mcu}
                label="Микроконтроллер"
                disabled
              >
                <MenuItem value={currentBoard.mcu}>{currentBoard.mcu.toUpperCase()}</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ mt: "auto" }}>
              <Typography variant="body2" color="text.secondary">
                Выберите параметры для вашего проекта Arduino. Эти настройки будут использованы при компиляции.
              </Typography>
            </Box>
          </Box>

          {/* Правая панель - Визуализация корпуса */}
          <Box
            sx={{
              width: "40%",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <PinVisualization pins={currentBoard.pins} />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isCreating}>
          Отмена
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!parentPath || !projectName || !projectName.trim() || isCreating}
        >
          {isCreating ? "Создание..." : "Создать проект"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProjectModal;

