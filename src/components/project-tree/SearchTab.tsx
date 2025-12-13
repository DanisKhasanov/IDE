import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemButton,
  Divider,
  Chip,
  CircularProgress,
  Paper,
  IconButton,
  InputAdornment,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CodeIcon from "@mui/icons-material/Code";
import ClearIcon from "@mui/icons-material/Clear";
import { useProjectTree } from "@/hooks";
import type { ProjectTreeNode } from "@/types/project";

interface SearchResult {
  type: "project" | "file" | "content";
  projectPath: string;
  projectName: string;
  filePath?: string;
  fileName?: string;
  lineNumber?: number;
  lineContent?: string;
  matchIndex?: number;
  matchLength?: number;
}

interface SearchTabProps {
  onFileOpen?: (filePath: string) => void;
}

// Директории, которые нужно исключить из поиска
const EXCLUDED_DIRECTORIES = ["build", "cores", "variants"];

// Рекурсивно получаем все файлы из дерева проекта (исключая служебные директории)
const getAllFiles = (node: ProjectTreeNode): Array<{ path: string; name: string }> => {
  const files: Array<{ path: string; name: string }> = [];
  
  if (node.type === "file") {
    files.push({ path: node.path, name: node.name });
  } else if (node.type === "directory" && node.children) {
    // Пропускаем исключенные директории
    if (EXCLUDED_DIRECTORIES.includes(node.name.toLowerCase())) {
      return files;
    }
    
    for (const child of node.children) {
      files.push(...getAllFiles(child));
    }
  }
  
  return files;
};

// Debounce функция
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const SearchTab = ({ onFileOpen }: SearchTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { openProjects } = useProjectTree();

  // Функция поиска
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const searchResults: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      try {
        // Поиск по проектам
        for (const project of openProjects) {
          const projectName = project.name || project.path.split(/[/\\]/).pop() || "";
          if (projectName.toLowerCase().includes(lowerQuery)) {
            searchResults.push({
              type: "project",
              projectPath: project.path,
              projectName: projectName,
            });
          }

          // Получаем все файлы проекта
          if (project.tree.type === "directory") {
            const allFiles = getAllFiles(project.tree);

            // Поиск по именам файлов
            for (const file of allFiles) {
              if (file.name.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                  type: "file",
                  projectPath: project.path,
                  projectName: projectName,
                  filePath: file.path,
                  fileName: file.name,
                });
              }

              // Поиск по содержимому файлов
              try {
                const fileContent = await window.electronAPI.readFile(file.path);
                const lines = fileContent.content.split("\n");

                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  const lowerLine = line.toLowerCase();
                  const matchIndex = lowerLine.indexOf(lowerQuery);

                  if (matchIndex !== -1) {
                    searchResults.push({
                      type: "content",
                      projectPath: project.path,
                      projectName: projectName,
                      filePath: file.path,
                      fileName: file.name,
                      lineNumber: i + 1,
                      lineContent: line,
                      matchIndex: matchIndex,
                      matchLength: query.length,
                    });
                  }
                }
              } catch (error) {
                // Игнорируем ошибки чтения файлов (например, бинарные файлы)
                console.warn(`Не удалось прочитать файл ${file.path}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Ошибка при выполнении поиска:", error);
      } finally {
        setResults(searchResults);
        setIsSearching(false);
      }
    },
    [openProjects]
  );

  // Выполняем поиск при изменении запроса
  useEffect(() => {
    performSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, performSearch]);

  // Группируем результаты по проектам
  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchResult[]>();
    
    for (const result of results) {
      const key = result.projectPath;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      const groupResults = groups.get(key);
      if (groupResults) {
        groupResults.push(result);
      }
    }
    
    return groups;
  }, [results]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      if (result.filePath && onFileOpen) {
        onFileOpen(result.filePath);
      }
    },
    [onFileOpen]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // Подсветка совпадения в тексте
  const highlightMatch = (text: string, matchIndex: number, matchLength: number) => {
    const before = text.substring(0, matchIndex);
    const match = text.substring(matchIndex, matchIndex + matchLength);
    const after = text.substring(matchIndex + matchLength);

    return (
      <>
        {before}
        <Box component="span" sx={{ backgroundColor: "warning.light", fontWeight: "bold" }}>
          {match}
        </Box>
        {after}
      </>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        p: 2,
      }}
    >
      <TextField
        placeholder="Поиск"
        variant="outlined"
        size="small"
        fullWidth
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {isSearching ? (
                <CircularProgress size={20} />
              ) : searchQuery ? (
                <IconButton
                  edge="end"
                  size="small"
                  onClick={handleClearSearch}
                  sx={{ mr: -1 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null}
            </InputAdornment>
          ),
        }}
      />
      
      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
        }}
      >
        {searchQuery.trim() && results.length === 0 && !isSearching && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Ничего не найдено
            </Typography>
          </Box>
        )}

        {!searchQuery.trim() && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Введите запрос для поиска
            </Typography>
          </Box>
        )}

        {results.length > 0 && (
          <List sx={{ py: 0 }}>
            {Array.from(groupedResults.entries()).map(([projectPath, projectResults]) => (
              <Box key={projectPath}>
                <Paper
                  sx={{
                    p: 1,
                    mb: 1,
                    backgroundColor: "action.hover",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <FolderIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" fontWeight="bold">
                      {projectResults[0].projectName}
                    </Typography>
                    <Chip
                      label={projectResults.length}
                      size="small"
                      sx={{ height: 20, fontSize: "0.7rem" }}
                    />
                  </Box>
                </Paper>
                
                {projectResults.map((result, index) => (
                  <Box key={`${result.filePath || result.projectPath}-${index}`}>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => handleResultClick(result)}
                        disabled={!result.filePath}
                        sx={{ pl: 2, py: 0.5 }}
                      >
                        <Box sx={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
                          {result.type === "project" && (
                            <FolderIcon fontSize="small" sx={{ mr: 1, mt: 0.5 }} />
                          )}
                          {result.type === "file" && (
                            <InsertDriveFileIcon fontSize="small" sx={{ mr: 1, mt: 0.5 }} />
                          )}
                          {result.type === "content" && (
                            <CodeIcon fontSize="small" sx={{ mr: 1, mt: 0.5 }} />
                          )}
                          
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            {result.fileName && (
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: result.type === "file" ? 600 : 400,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {result.fileName}
                              </Typography>
                            )}
                            
                            {result.lineContent !== undefined && result.matchIndex !== undefined && (
                              <Box
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                  mt: 0.5,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {result.lineNumber && (
                                  <Chip
                                    label={result.lineNumber}
                                    size="small"
                                    sx={{
                                      height: 16,
                                      fontSize: "0.65rem",
                                      mr: 1,
                                      minWidth: 30,
                                    }}
                                  />
                                )}
                                {highlightMatch(
                                  result.lineContent,
                                  result.matchIndex,
                                  result.matchLength || searchQuery.length
                                )}
                              </Box>
                            )}
                            
                            {result.type === "file" && !result.lineContent && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: "block",
                                  mt: 0.25,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {result.filePath}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </ListItemButton>
                    </ListItem>
                    {index < projectResults.length - 1 && <Divider component="li" />}
                  </Box>
                ))}
              </Box>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default SearchTab;

