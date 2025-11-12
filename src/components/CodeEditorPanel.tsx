import { useState, SyntheticEvent, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, Tabs, Tab, IconButton, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MonacoEditor from '@monaco-editor/react';
import CloseIcon from '@mui/icons-material/Close';
import type { EditorFile } from '@src/types/editor';

interface CodeEditorPanelProps {
  onFileOpenRequest?: (handler: (filePath: string) => Promise<void>) => void;
  currentProjectPath?: string | null;
  onActiveFileChange?: (filePath: string | null) => void;
}

const CodeEditorPanel = ({ onFileOpenRequest, currentProjectPath, onActiveFileChange }: CodeEditorPanelProps) => {
  const theme = useTheme();
  const editorTheme = theme.palette.mode === 'dark' ? 'vs-dark' : 'vs';
  const [files, setFiles] = useState<EditorFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const openFileHandlerRef = useRef<((filePath: string) => Promise<void>) | null>(null);

  // Загрузка сохраненных файлов при монтировании или изменении проекта
  useEffect(() => {
    const loadSavedFiles = async () => {
      if (!currentProjectPath) {
        // Очищаем файлы, если проект не открыт
        setFiles([]);
        setActiveFileId('');
        return;
      }

      try {
        const savedState = await window.electronAPI.getProjectState(currentProjectPath);
        if (savedState && savedState.openedFiles.length > 0) {
          // Загружаем файлы по путям
          const loadedFiles = await Promise.all(
            savedState.openedFiles.map(async (savedFile) => {
              try {
                const fileData = await window.electronAPI.readFile(savedFile.path);
                return {
                  id: fileData.id,
                  name: fileData.name,
                  path: fileData.path,
                  language: fileData.language,
                  content: fileData.content,
                };
              } catch (error) {
                console.error(`Ошибка загрузки файла ${savedFile.path}:`, error);
                return null;
              }
            })
          );

          const validFiles = loadedFiles.filter((f): f is EditorFile & { path: string } => f !== null && f.path !== undefined);
          if (validFiles.length > 0) {
            setFiles(validFiles);
            // Устанавливаем активный файл, если он существует
            const activeFile = validFiles.find((f) => f.id === savedState.activeFileId);
            const newActiveFileId = activeFile?.id || validFiles[0].id;
            setActiveFileId(newActiveFileId);
            const newActiveFile = validFiles.find((f) => f.id === newActiveFileId);
            if (onActiveFileChange && newActiveFile) {
              onActiveFileChange(newActiveFile.path);
            }
          } else {
            setFiles([]);
            setActiveFileId('');
            if (onActiveFileChange) {
              onActiveFileChange(null);
            }
          }
        } else {
          // Если сохраненных файлов нет, очищаем
          setFiles([]);
          setActiveFileId('');
          if (onActiveFileChange) {
            onActiveFileChange(null);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки сохраненных файлов:', error);
        setFiles([]);
        setActiveFileId('');
        if (onActiveFileChange) {
          onActiveFileChange(null);
        }
      }
    };

    loadSavedFiles();
  }, [currentProjectPath, onActiveFileChange]);

  // Сохранение открытых файлов при изменении
  useEffect(() => {
    const saveFiles = async () => {
      if (!currentProjectPath) {
        return;
      }

      try {
        const filesToSave = files
          .filter((f): f is EditorFile & { path: string } => f.path !== undefined)
          .map((f) => ({ id: f.id, path: f.path }));

        await window.electronAPI.saveProjectState(currentProjectPath, {
          openedFiles: filesToSave,
          activeFileId: activeFileId || null,
        });
      } catch (error) {
        console.error('Ошибка сохранения открытых файлов:', error);
      }
    };

    saveFiles();
  }, [files, activeFileId, currentProjectPath]);

  // Обработчик открытия файла из ProjectTree
  const handleOpenFile = useCallback(async (filePath: string) => {
    // Проверяем, не открыт ли уже этот файл
    setFiles((prevFiles) => {
      const existingFile = prevFiles.find((f) => f.path === filePath);
      if (existingFile) {
        setActiveFileId(existingFile.id);
        return prevFiles;
      }
      return prevFiles;
    });

    try {
      const fileData = await window.electronAPI.readFile(filePath);
      const newFile: EditorFile = {
        id: fileData.id,
        name: fileData.name,
        path: fileData.path,
        language: fileData.language,
        content: fileData.content,
      };
      setFiles((prevFiles) => {
        // Проверяем еще раз на случай параллельных запросов
        const existingFile = prevFiles.find((f) => f.path === filePath);
        if (existingFile) {
          setActiveFileId(existingFile.id);
          return prevFiles;
        }
        return [...prevFiles, newFile];
      });
      setActiveFileId(newFile.id);
      if (onActiveFileChange) {
        onActiveFileChange(newFile.path);
      }
    } catch (error) {
      console.error('Ошибка открытия файла:', error);
    }
  }, [onActiveFileChange]);

  // Сохраняем ссылку на обработчик для передачи в родительский компонент
  useEffect(() => {
    openFileHandlerRef.current = handleOpenFile;
    if (onFileOpenRequest) {
      onFileOpenRequest(handleOpenFile);
    }
  }, [handleOpenFile, onFileOpenRequest]);

  const handleTabChange = (_event: SyntheticEvent, newValue: string) => {
    setActiveFileId(newValue);
    const file = files.find(f => f.id === newValue);
    if (onActiveFileChange) {
      onActiveFileChange(file?.path || null);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === activeFileId ? { ...file, content: value ?? '' } : file
      )
    );
  };

  const handleCloseTab = (event: React.MouseEvent, fileId: string) => {
    event.stopPropagation();
    if (files.length === 1) {
      // Не закрываем последний файл
      return;
    }
    const newFiles = files.filter((f) => f.id !== fileId);
    setFiles(newFiles);
    if (activeFileId === fileId) {
      setActiveFileId(newFiles.length > 0 ? newFiles[0].id : '');
    }
  };

  const activeFile = files.find((file) => file.id === activeFileId);

  return (
    <Card
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        boxShadow: 'none',
        border: 'none',
        backgroundColor: theme.palette.background.paper,
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <Tabs
        value={activeFileId}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {files.map((file) => (
          <Tab
            key={file.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ textTransform: 'none' }}>{file.name}</span>
                {files.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={(e) => handleCloseTab(e, file.id)}
                    sx={{ p: 0, minWidth: 'auto' , }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            }
            value={file.id}
          />
        ))}
      </Tabs>
      <CardContent sx={{ flex: 1, p: 1 }}>
        {activeFile && (
          <MonacoEditor
            language={activeFile.language}
            theme={editorTheme}
            height="100%"
            value={activeFile.content}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              automaticLayout: true,
              fontSize: 14,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default CodeEditorPanel;

