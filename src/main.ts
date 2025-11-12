import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import started from 'electron-squirrel-startup';
import type { ProjectTreeNode } from './types/project';
import {
  getProjectState,
  saveProjectState,
  getLastProjectPath,
  saveLastProjectPath,
  getOpenProjects,
  addOpenProject,
  removeOpenProject,
  type ProjectState,
} from './utils/configStorage';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let currentProjectPath: string | null = null;
let mainWindow: BrowserWindow | null = null;
// Map для хранения открытых проектов: путь -> данные проекта
type OpenProjectData = {
  path: string;
  name: string;
  tree: Extract<ProjectTreeNode, { type: 'directory' }>;
};
const openProjects = new Map<string, OpenProjectData>();

// Функция для построения дерева проекта
async function buildProjectTree(dirPath: string, basePath: string = dirPath): Promise<ProjectTreeNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: ProjectTreeNode[] = [];

  for (const entry of entries) {
    // Пропускаем скрытые файлы и node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);

    if (entry.isDirectory()) {
      const children = await buildProjectTree(fullPath, basePath);
      nodes.push({
        id: relativePath,
        name: entry.name,
        path: fullPath,
        type: 'directory',
        children,
      });
    } else {
      nodes.push({
        id: relativePath,
        name: entry.name,
        path: fullPath,
        type: 'file',
      });
    }
  }

  return nodes.sort((a, b) => {
    // Сначала папки, потом файлы
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

// Функция для регистрации всех IPC обработчиков
const registerIpcHandlers = () => {
  console.log('Регистрируем IPC обработчики...');
  
  // Удаляем старые обработчики, если они есть (для hot reload)
  const handlers = [
    'select-project-folder',
    'create-file',
    'create-folder',
    'read-file',
    'get-project-tree',
    'get-project-state',
    'save-project-state',
    'get-last-project-path',
    'load-last-project',
    'get-open-projects',
    'switch-project',
    'close-project',
    'load-open-projects',
  ];
  
  handlers.forEach(handler => {
    try {
      ipcMain.removeHandler(handler);
    } catch (e) {
      // Игнорируем ошибки, если обработчика нет
    }
  });

  // Регистрируем все обработчики
  ipcMain.handle('select-project-folder', async () => {
  try {
    console.log('Показываем диалог выбора папки...');
    console.log('mainWindow:', mainWindow ? 'существует' : 'не существует');
    
    if (!mainWindow) {
      // Получаем активное окно, если mainWindow еще не создан
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        mainWindow = windows[0];
        console.log('Используем существующее окно');
      }
    }
    
    const result = await dialog.showOpenDialog(mainWindow || undefined, {
      properties: ['openDirectory'],
      title: 'Выберите папку проекта',
    });

    console.log('Результат диалога:', JSON.stringify(result));

    if (result.canceled || result.filePaths.length === 0) {
      console.log('Диалог отменен или файлы не выбраны');
      return null;
    }

    const projectPath = result.filePaths[0];
    console.log('Выбранный путь проекта:', projectPath);
    
    // Проверяем, не открыт ли уже этот проект
    if (openProjects.has(projectPath)) {
      // Проект уже открыт, просто делаем его текущим
      currentProjectPath = projectPath;
      await saveLastProjectPath(projectPath);
      const existingProject = openProjects.get(projectPath);
      if (!existingProject) {
        throw new Error('Проект не найден в списке открытых');
      }
      return existingProject;
    }
    
    // Открываем новый проект
    currentProjectPath = projectPath;
    await saveLastProjectPath(projectPath);
    await addOpenProject(projectPath);
    
    const projectName = path.basename(projectPath);
    console.log('Строим дерево проекта...');
    const children = await buildProjectTree(projectPath, projectPath);
    console.log('Дерево проекта построено, элементов:', children.length);

    const projectData: OpenProjectData = {
      path: projectPath,
      name: projectName,
      tree: {
        id: '.',
        name: projectName,
        path: projectPath,
        type: 'directory' as const,
        children,
      },
    };
    
    // Сохраняем проект в Map
    openProjects.set(projectPath, projectData);
    
    return projectData;
  } catch (error) {
    console.error('Ошибка в select-project-folder:', error);
    throw error;
  }
});

ipcMain.handle('create-file', async (_event, parentPath: string, projectPath?: string) => {
  const targetProjectPath = projectPath || currentProjectPath;
  if (!targetProjectPath) {
    throw new Error('Проект не открыт');
  }

  // Определяем родительскую папку
  let targetDir = targetProjectPath;
  if (parentPath) {
    try {
      const stats = await fs.stat(parentPath);
      targetDir = stats.isDirectory() ? parentPath : path.dirname(parentPath);
    } catch {
      // Если путь не существует, пытаемся определить родительскую директорию
      if (existsSync(parentPath)) {
        try {
          const stats = await fs.stat(parentPath);
          targetDir = stats.isDirectory() ? parentPath : path.dirname(parentPath);
        } catch {
          targetDir = path.dirname(parentPath);
        }
      } else {
        targetDir = path.dirname(parentPath);
      }
    }
  }

  const result = await dialog.showSaveDialog({
    defaultPath: targetDir,
    buttonLabel: 'Создать файл',
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  const filePath = result.filePath;
  
  // Проверяем, что файл находится в пределах проекта
  if (!filePath.startsWith(targetProjectPath)) {
    throw new Error('Файл должен находиться в пределах проекта');
  }

  // Создаем файл, если его нет
  if (!existsSync(filePath)) {
    // Создаем родительские директории, если их нет
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(filePath, '', 'utf-8');
  }

  // Обновляем дерево проекта
  const children = await buildProjectTree(targetProjectPath, targetProjectPath);
  const projectData: OpenProjectData = {
    path: targetProjectPath,
    name: path.basename(targetProjectPath),
    tree: {
      id: '.',
      name: path.basename(targetProjectPath),
      path: targetProjectPath,
      type: 'directory' as const,
      children,
    },
  };
  
  // Обновляем проект в Map
  openProjects.set(targetProjectPath, projectData);
  
  return projectData;
});

ipcMain.handle('create-folder', async (_event, parentPath: string, projectPath?: string) => {
  const targetProjectPath = projectPath || currentProjectPath;
  if (!targetProjectPath) {
    throw new Error('Проект не открыт');
  }

  // Определяем родительскую папку
  let targetDir = targetProjectPath;
  if (parentPath) {
    try {
      const stats = await fs.stat(parentPath);
      targetDir = stats.isDirectory() ? parentPath : path.dirname(parentPath);
    } catch {
      // Если путь не существует, пытаемся определить родительскую директорию
      if (existsSync(parentPath)) {
        try {
          const stats = await fs.stat(parentPath);
          targetDir = stats.isDirectory() ? parentPath : path.dirname(parentPath);
        } catch {
          targetDir = path.dirname(parentPath);
        }
      } else {
        targetDir = path.dirname(parentPath);
      }
    }
  }

  // Используем showSaveDialog для ввода имени папки
  const result = await dialog.showSaveDialog({
    defaultPath: path.join(targetDir, 'Новая папка'),
    buttonLabel: 'Создать папку',
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  const folderPath = result.filePath;
  
  // Проверяем, что папка находится в пределах проекта
  if (!folderPath.startsWith(targetProjectPath)) {
    throw new Error('Папка должна находиться в пределах проекта');
  }

  // Создаем папку, если ее нет
  if (!existsSync(folderPath)) {
    await fs.mkdir(folderPath, { recursive: true });
  }

  // Обновляем дерево проекта
  const children = await buildProjectTree(targetProjectPath, targetProjectPath);
  const projectData: OpenProjectData = {
    path: targetProjectPath,
    name: path.basename(targetProjectPath),
    tree: {
      id: '.',
      name: path.basename(targetProjectPath),
      path: targetProjectPath,
      type: 'directory' as const,
      children,
    },
  };
  
  // Обновляем проект в Map
  openProjects.set(targetProjectPath, projectData);
  
  return projectData;
});

ipcMain.handle('read-file', async (_event, filePath: string) => {
  // Проверяем, что файл принадлежит одному из открытых проектов
  let projectPath: string | null = null;
  for (const [path] of openProjects) {
    if (filePath.startsWith(path)) {
      projectPath = path;
      break;
    }
  }
  
  if (!projectPath) {
    throw new Error('Файл не принадлежит открытому проекту');
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const name = path.basename(filePath);
  
  // Определяем язык по расширению
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.jsx': 'javascript',
    '.json': 'json',
    '.html': 'html',
    '.css': 'css',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.md': 'markdown',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
  };

  const language = languageMap[ext] || 'plaintext';

  return {
    id: filePath,
    name,
    path: filePath,
    language,
    content,
  };
});

ipcMain.handle('get-project-tree', async (_event, projectPath?: string) => {
  try {
    const targetProjectPath = projectPath || currentProjectPath;
    console.log('get-project-tree вызван, projectPath:', targetProjectPath);
    if (!targetProjectPath) {
      console.log('Проект не открыт, возвращаем null');
      return null;
    }

    // Проверяем, есть ли проект в Map
    const existingProject = openProjects.get(targetProjectPath);
    if (existingProject) {
      return existingProject;
    }

    // Если проекта нет в Map, загружаем его
    const children = await buildProjectTree(targetProjectPath, targetProjectPath);
    console.log('Дерево проекта построено, элементов:', children.length);
    const projectData: OpenProjectData = {
      path: targetProjectPath,
      name: path.basename(targetProjectPath),
      tree: {
        id: '.',
        name: path.basename(targetProjectPath),
        path: targetProjectPath,
        type: 'directory' as const,
        children,
      },
    };
    
    openProjects.set(targetProjectPath, projectData);
    return projectData;
  } catch (error) {
    console.error('Ошибка в get-project-tree:', error);
    throw error;
  }
});

// IPC обработчики для работы с конфигурацией
ipcMain.handle('get-project-state', async (_event, projectPath: string) => {
  try {
    return await getProjectState(projectPath);
  } catch (error) {
    console.error('Ошибка получения состояния проекта:', error);
    return null;
  }
});

ipcMain.handle('save-project-state', async (_event, projectPath: string, state: Partial<ProjectState>) => {
  try {
    await saveProjectState(projectPath, state);
  } catch (error) {
    console.error('Ошибка сохранения состояния проекта:', error);
    throw error;
  }
});

ipcMain.handle('get-last-project-path', async () => {
  try {
    return await getLastProjectPath();
  } catch (error) {
    console.error('Ошибка получения последнего пути проекта:', error);
    return null;
  }
});

ipcMain.handle('load-last-project', async () => {
  try {
    const lastProjectPath = await getLastProjectPath();
    if (!lastProjectPath || !existsSync(lastProjectPath)) {
      return null;
    }

    currentProjectPath = lastProjectPath;
    await addOpenProject(lastProjectPath);
    
    // Проверяем, есть ли проект в Map
    const existingProject = openProjects.get(lastProjectPath);
    if (existingProject) {
      return existingProject;
    }
    
    const children = await buildProjectTree(lastProjectPath, lastProjectPath);
    const projectData: OpenProjectData = {
      path: lastProjectPath,
      name: path.basename(lastProjectPath),
      tree: {
        id: '.',
        name: path.basename(lastProjectPath),
        path: lastProjectPath,
        type: 'directory' as const,
        children,
      },
    };
    
    openProjects.set(lastProjectPath, projectData);
    return projectData;
  } catch (error) {
    console.error('Ошибка загрузки последнего проекта:', error);
    return null;
  }
});

// Получение списка открытых проектов
ipcMain.handle('get-open-projects', async () => {
  try {
    const projects = Array.from(openProjects.values());
    return projects.map(p => ({ path: p.path, name: p.name }));
  } catch (error) {
    console.error('Ошибка получения списка открытых проектов:', error);
    return [];
  }
});

// Переключение на другой проект
ipcMain.handle('switch-project', async (_event, projectPath: string) => {
  try {
    if (!openProjects.has(projectPath)) {
      throw new Error('Проект не открыт');
    }
    
    currentProjectPath = projectPath;
    await saveLastProjectPath(projectPath);
    const project = openProjects.get(projectPath);
    if (!project) {
      throw new Error('Проект не найден в списке открытых');
    }
    return project;
  } catch (error) {
    console.error('Ошибка переключения проекта:', error);
    throw error;
  }
});

// Закрытие проекта
ipcMain.handle('close-project', async (_event, projectPath: string) => {
  try {
    if (!openProjects.has(projectPath)) {
      return;
    }
    
    openProjects.delete(projectPath);
    await removeOpenProject(projectPath);
    
    // Если закрыли текущий проект, переключаемся на другой
    if (currentProjectPath === projectPath) {
      const remainingProjects = Array.from(openProjects.keys());
      if (remainingProjects.length > 0) {
        currentProjectPath = remainingProjects[0];
        await saveLastProjectPath(currentProjectPath);
      } else {
        currentProjectPath = null;
        await saveLastProjectPath(null);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Ошибка закрытия проекта:', error);
    throw error;
  }
});

// Загрузка всех открытых проектов при старте
ipcMain.handle('load-open-projects', async () => {
  try {
    const openProjectsPaths = await getOpenProjects();
    const loadedProjects = [];
    
    for (const projectPath of openProjectsPaths) {
      if (existsSync(projectPath)) {
        const children = await buildProjectTree(projectPath, projectPath);
        const projectData: OpenProjectData = {
          path: projectPath,
          name: path.basename(projectPath),
          tree: {
            id: '.',
            name: path.basename(projectPath),
            path: projectPath,
            type: 'directory' as const,
            children,
          },
        };
        
        openProjects.set(projectPath, projectData);
        loadedProjects.push(projectData);
      } else {
        // Удаляем несуществующий проект из списка
        await removeOpenProject(projectPath);
      }
    }
    
    // Устанавливаем последний проект как текущий
    const lastProjectPath = await getLastProjectPath();
    if (lastProjectPath && openProjects.has(lastProjectPath)) {
      currentProjectPath = lastProjectPath;
    } else if (loadedProjects.length > 0) {
      currentProjectPath = loadedProjects[0].path;
      await saveLastProjectPath(currentProjectPath);
    }
    
    return loadedProjects;
  } catch (error) {
    console.error('Ошибка загрузки открытых проектов:', error);
    return [];
  }
});

  console.log('IPC обработчики зарегистрированы');
  console.log('Зарегистрированные обработчики:', [
    'select-project-folder',
    'create-file',
    'create-folder',
    'read-file',
    'get-project-tree',
    'get-project-state',
    'save-project-state',
    'get-last-project-path',
    'load-last-project',
    'get-open-projects',
    'switch-project',
    'close-project',
    'load-open-projects',
  ].join(', '));
};

// Регистрируем обработчики сразу при загрузке модуля
registerIpcHandlers();

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  console.log('Electron готов, создаем окно...');
  // Перерегистрируем обработчики на случай hot reload
  registerIpcHandlers();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
