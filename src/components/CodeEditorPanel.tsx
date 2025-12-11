import {
  useState,
  SyntheticEvent,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Card, CardContent, Tabs, Tab, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MonacoEditor, { type Monaco } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import CloseIcon from "@mui/icons-material/Close";
import { PanelGroup, Panel } from "react-resizable-panels";
import TerminalPanel from "@components/TerminalPanel";
import type { EditorFile } from "@/types/editor";
import type { CompilationProblem } from "@components/ProblemsTab";
import {
  useProjectFiles,
  useMonacoModel,
  useGoToDefinition,
  useCompletionProvider,
} from "@hooks/index";
import { useSnackbar } from "@/contexts/SnackbarContext";

interface CodeEditorPanelProps {
  onFileOpenRequest?: (handler: (filePath: string) => Promise<void>) => void;
  currentProjectPath?: string | null;
  onActiveFileChange?: (filePath: string | null) => void;
  isTerminalVisible?: boolean;
  onTerminalClose?: () => void;
  compilationProblems?: CompilationProblem[];
  terminalActiveTab?: "terminal" | "problems";
  onTerminalTabChange?: (tab: "terminal" | "problems") => void;
}

const CodeEditorPanel = ({
  onFileOpenRequest,
  currentProjectPath,
  onActiveFileChange,
  isTerminalVisible = false,
  onTerminalClose,
  compilationProblems = [],
  terminalActiveTab,
  onTerminalTabChange,
}: CodeEditorPanelProps) => {
  const theme = useTheme();
  const editorTheme = theme.palette.mode === "dark" ? "vs-dark" : "vs";
  const [files, setFiles] = useState<EditorFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>("");
  const { showSuccess } = useSnackbar();
  const [isEditorReady, setIsEditorReady] = useState<boolean>(false);
  
  // Храним оригинальное содержимое файлов для сравнения
  const originalContentsRef = useRef<Map<string, string>>(new Map());
  // Отслеживаем измененные файлы
  const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set());
  
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Ref для обработчика открытия файлов
  const openFileHandlerRef = useRef<
    ((filePath: string) => Promise<void>) | null
  >(null);

  // Используем хук для работы с файлами проекта
  const { getProjectFiles } = useProjectFiles(currentProjectPath, files);

  // Получение активного файла
  const activeFile = files.find((file) => file.id === activeFileId);

  // Используем хук для управления моделями Monaco
  useMonacoModel({
    editor: editorRef.current,
    monaco: monacoRef.current,
    activeFile,
    isEditorReady,
  });

  // Используем хук для логики перехода к определению
  useGoToDefinition({
    editor: editorRef.current,
    monaco: monacoRef.current,
    isEditorReady,
    getProjectFiles,
    onOpenFile: async (filePath: string) => {
      if (openFileHandlerRef.current) {
        await openFileHandlerRef.current(filePath);
      }
    },
  });

  // Используем хук для автодополнения
  useCompletionProvider({
    editor: editorRef.current,
    monaco: monacoRef.current,
    isEditorReady,
    getProjectFiles,
  });

  // Загрузка сохраненных файлов при монтировании или изменении проекта
  useEffect(() => {
    const loadSavedFiles = async () => {
      if (!currentProjectPath) {
        setFiles([]);
        setActiveFileId("");
        return;
      }

      try {
        const savedState =
          await window.electronAPI.getProjectState(currentProjectPath);
        if (savedState && savedState.openedFiles.length > 0) {
          const loadedFiles = await Promise.all(
            savedState.openedFiles.map(async (savedFile) => {
              try {
                const fileData = await window.electronAPI.readFile(
                  savedFile.path
                );
                return {
                  id: fileData.id,
                  name: fileData.name,
                  path: fileData.path,
                  language: fileData.language,
                  content: fileData.content,
                };
              } catch (error) {
                console.error(
                  `Ошибка загрузки файла ${savedFile.path}:`,
                  error
                );
                return null;
              }
            })
          );

          const validFiles = loadedFiles.filter(
            (f): f is EditorFile & { path: string } =>
              f !== null && f.path !== undefined
          );
          
          if (validFiles.length > 0) {
            setFiles(validFiles);
            // Сохраняем оригинальное содержимое файлов
            validFiles.forEach((file) => {
              originalContentsRef.current.set(file.id, file.content);
            });
            setModifiedFiles(new Set());
            
            const activeFile = validFiles.find(
              (f) => f.id === savedState.activeFileId
            );
            const newActiveFileId = activeFile?.id || validFiles[0].id;
            setActiveFileId(newActiveFileId);
            
            const newActiveFile = validFiles.find(
              (f) => f.id === newActiveFileId
            );
            if (onActiveFileChange && newActiveFile) {
              onActiveFileChange(newActiveFile.path);
            }
          } else {
            setFiles([]);
            setActiveFileId("");
            originalContentsRef.current.clear();
            setModifiedFiles(new Set());
            if (onActiveFileChange) {
              onActiveFileChange(null);
            }
          }
        } else {
          setFiles([]);
          setActiveFileId("");
          originalContentsRef.current.clear();
          setModifiedFiles(new Set());
          if (onActiveFileChange) {
            onActiveFileChange(null);
          }
        }
      } catch (error) {
        console.error("Ошибка загрузки сохраненных файлов:", error);
        setFiles([]);
        setActiveFileId("");
        originalContentsRef.current.clear();
        setModifiedFiles(new Set());
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
          .filter(
            (f): f is EditorFile & { path: string } => f.path !== undefined
          )
          .map((f) => ({ id: f.id, path: f.path }));

        await window.electronAPI.saveProjectState(currentProjectPath, {
          openedFiles: filesToSave,
          activeFileId: activeFileId || null,
        });
      } catch (error) {
        console.error("Ошибка сохранения открытых файлов:", error);
      }
    };

    saveFiles();
  }, [files, activeFileId, currentProjectPath]);

  // Обработчик открытия файла из ProjectTree
  const handleOpenFile = useCallback(
    async (filePath: string) => {
      // Проверяем, не открыт ли уже этот файл
      const existingFile = files.find((f) => f.path === filePath);
      if (existingFile) {
        setActiveFileId(existingFile.id);
        if (onActiveFileChange) {
          onActiveFileChange(existingFile.path || null);
        }
        return;
      }

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
            return prevFiles;
          }
          // Сохраняем оригинальное содержимое нового файла
          originalContentsRef.current.set(newFile.id, newFile.content);
          return [...prevFiles, newFile];
        });
        
        setActiveFileId(newFile.id);
        if (onActiveFileChange) {
          onActiveFileChange(newFile.path);
        }
      } catch (error) {
        console.error("Ошибка открытия файла:", error);
      }
    },
    [files, onActiveFileChange]
  );

  // Сохраняем ссылку на обработчик для передачи в родительский компонент
  useEffect(() => {
    openFileHandlerRef.current = handleOpenFile;
    if (onFileOpenRequest) {
      onFileOpenRequest(handleOpenFile);
    }
  }, [handleOpenFile, onFileOpenRequest]);

  // Обработчик изменения активной вкладки
  const handleTabChange = (_event: SyntheticEvent, newValue: string) => {
    setActiveFileId(newValue);
    const file = files.find((f) => f.id === newValue);
    if (onActiveFileChange) {
      onActiveFileChange(file?.path || null);
    }
  };

  // Обработчик изменения содержимого редактора
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const newContent = value ?? "";
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === activeFileId ? { ...file, content: newContent } : file
        )
      );

      // Проверяем, изменился ли файл относительно оригинала
      const originalContent =
        originalContentsRef.current.get(activeFileId) ?? "";
      const isModified = newContent !== originalContent;

      setModifiedFiles((prevModified) => {
        const newModified = new Set(prevModified);
        if (isModified) {
          newModified.add(activeFileId);
        } else {
          newModified.delete(activeFileId);
        }
        return newModified;
      });
    },
    [activeFileId]
  );

  // Обработка событий меню
  useEffect(() => {
    const handleMenuSaveFile = async () => {
      const activeFile = files.find((f) => f.id === activeFileId);
      if (!activeFile || !activeFile.path) {
        console.warn("Нет активного файла для сохранения");
        return;
      }
      try {
        await window.electronAPI.saveFile(activeFile.path, activeFile.content);
        console.log("Файл сохранен:", activeFile.path);
        // Обновляем оригинальное содержимое и убираем из списка измененных
        originalContentsRef.current.set(activeFileId, activeFile.content);
        setModifiedFiles((prevModified) => {
          const newModified = new Set(prevModified);
          newModified.delete(activeFileId);
          return newModified;
        });
        showSuccess("Файл сохранен");
      } catch (error) {
        console.error("Ошибка сохранения файла:", error);
      }
    };

    const handleMenuSaveFileAs = async () => {
      const activeFile = files.find((f) => f.id === activeFileId);
      if (!activeFile || !activeFile.path) {
        console.warn("Нет активного файла для сохранения");
        return;
      }
      try {
        const result = await window.electronAPI.saveFileAs(
          activeFile.path,
          activeFile.content
        );
        if (result && result.filePath) {
          // Обновляем путь файла и переоткрываем его
          const updatedFile = { ...activeFile, path: result.filePath };
          setFiles((prevFiles) =>
            prevFiles.map((file) =>
              file.id === activeFileId ? updatedFile : file
            )
          );
          // Обновляем оригинальное содержимое и убираем из списка измененных
          originalContentsRef.current.set(activeFileId, activeFile.content);
          setModifiedFiles((prevModified) => {
            const newModified = new Set(prevModified);
            newModified.delete(activeFileId);
            return newModified;
          });
          if (onActiveFileChange) {
            onActiveFileChange(result.filePath);
          }
          console.log("Файл сохранен как:", result.filePath);
          showSuccess("Файл сохранен");
        }
      } catch (error) {
        console.error("Ошибка сохранения файла как:", error);
      }
    };

    const unsubscribeSaveFile =
      window.electronAPI.onMenuSaveFile(handleMenuSaveFile);
    const unsubscribeSaveFileAs =
      window.electronAPI.onMenuSaveFileAs(handleMenuSaveFileAs);

    return () => {
      unsubscribeSaveFile();
      unsubscribeSaveFileAs();
    };
  }, [files, activeFileId, onActiveFileChange]);

  // Обработчик закрытия вкладки
  const handleCloseTab = (event: React.MouseEvent, fileId: string) => {
    event.stopPropagation();
    const newFiles = files.filter((f) => f.id !== fileId);
    setFiles(newFiles);
    // Удаляем оригинальное содержимое и из списка измененных
    originalContentsRef.current.delete(fileId);
    setModifiedFiles((prevModified) => {
      const newModified = new Set(prevModified);
      newModified.delete(fileId);
      return newModified;
    });
    if (activeFileId === fileId) {
      if (newFiles.length > 0) {
        setActiveFileId(newFiles[0].id);
        if (onActiveFileChange) {
          onActiveFileChange(newFiles[0].path || null);
        }
      } else {
        setActiveFileId("");
        if (onActiveFileChange) {
          onActiveFileChange(null);
        }
      }
    }
  };

  return (
    <Card
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        boxShadow: "none",
        border: "none",
        backgroundColor: theme.palette.background.paper,
        borderRight: 1,
        borderColor: "divider",
      }}
    >
      <Tabs
        value={activeFileId}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons={false}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        {files.map((file) => {
          const isModified = modifiedFiles.has(file.id);
          return (
            <Tab
              key={file.id}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span style={{ textTransform: "none" }}>{file.name}</span>
                  {isModified && (
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: theme.palette.text.secondary,
                        display: "inline-block",
                      }}
                    />
                  )}
                  <Box
                    component="span"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleCloseTab(e, file.id);
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </Box>
                </Box>
              }
              value={file.id}
            />
          );
        })}
      </Tabs>
      <PanelGroup direction="vertical">
        {/* Редактор кода */}
        <Panel defaultSize={isTerminalVisible ? 70 : 100} minSize={30}>
          <CardContent
            sx={{
              flex: 1,
              p: 1,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activeFile && (
              <MonacoEditor
                key={currentProjectPath || 'no-project'}
                language={activeFile.language}
                theme={editorTheme}
                height="100%"
                value={activeFile.content}
                onChange={handleEditorChange}
                onMount={(editor, monaco) => {
                  // Устанавливаем флаг готовности только после проверки DOM
                  const checkAndSetReady = () => {
                    try {
                      const container = editor.getContainerDomNode();
                      const layoutInfo = editor.getLayoutInfo();
                      
                      if (container && container.parentElement && layoutInfo) {
                        editorRef.current = editor;
                        monacoRef.current = monaco;
                        setIsEditorReady(true);
                      } else {
                        // Если DOM еще не готов, повторяем проверку
                        requestAnimationFrame(checkAndSetReady);
                      }
                    } catch (error) {
                      // Если произошла ошибка, повторяем проверку
                      requestAnimationFrame(checkAndSetReady);
                    }
                  };

                  // Начинаем проверку готовности
                  requestAnimationFrame(checkAndSetReady);

                  return () => {
                    setIsEditorReady(false);
                    editorRef.current = null;
                    monacoRef.current = null;
                  };
                }}
                beforeMount={() => {
                  setIsEditorReady(false);
                  editorRef.current = null;
                  monacoRef.current = null;
                }}
                options={{
                  minimap: { enabled: false },
                  automaticLayout: true,
                  fontSize: 14,
                  links: true,
                  hover: {
                    enabled: false,
                  },
                  parameterHints: {
                    enabled: false,
                  },
                  quickSuggestions: true,
                  suggestOnTriggerCharacters: true,
                  gotoLocation: {
                    multiple: "goto",
                    multipleDefinitions: "goto",
                    multipleReferences: "goto",
                    multipleImplementations: "goto",
                  },
                  wordBasedSuggestions: "matchingDocuments",
                  occurrencesHighlight: "multiFile",
                  selectionHighlight: true,
                }}
              />
            )}
          </CardContent>
        </Panel>

        {/* Терминал */}
        <TerminalPanel
          isVisible={isTerminalVisible}
          onClose={onTerminalClose}
          currentProjectPath={currentProjectPath}
          problems={compilationProblems}
          activeTab={terminalActiveTab}
          onTabChange={onTerminalTabChange}
        />
      </PanelGroup>
    </Card>
  );
};

export default CodeEditorPanel;
