import { ipcMain, app } from "electron";
import path from "path";
import { promises as fs } from "fs";

type BoardUiConfigResponse = {
  config: any;
  source: "external" | "bundled";
  externalDir: string;
  externalPath: string;
};

function getExternalBoardUiDir(): string {
  // Требование: в prod хотим папку рядом с .app, например:
  // <...>/IDE.app
  // <...>/CONFIG/atmega328.json
  //
  // Важно: поведение ЖЁСТКОЕ — читаем ТОЛЬКО оттуда, никаких фолбэков.
  if (!app.isPackaged) {
    return path.join(process.cwd(), "CONFIG");
  }

  // app.getPath("exe") на macOS: .../IDE.app/Contents/MacOS/IDE
  const exePath = app.getPath("exe");
  const appBundlePath = path.resolve(exePath, "..", "..", ".."); // -> IDE.app
  const appContainerDir = path.dirname(appBundlePath); // -> папка, где лежит IDE.app
  return path.join(appContainerDir, "CONFIG");
}

function mapBoardNameToUiFile(boardName: string): string {
  // Сейчас UI использует формат src/config/test/atmega328.json (Arduino Uno).
  // Расширять можно, добавив новые маппинги.
  const normalized = (boardName || "uno").toLowerCase();
  if (normalized === "uno" || normalized === "arduino uno") return "atmega328.json";
  return "atmega328.json";
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(p: string): Promise<any> {
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw);
}

function getBundledUiConfigPath(uiFileName: string): string {
  // В packaged сборке (и в процессе упаковки) мы копируем дефолтные UI-конфиги сюда:
  // <appPath>/.vite/build/config/board-ui/*.json
  // В dev эта папка может отсутствовать — тогда используем src/config/test/*.json
  if (app.isPackaged) {
    return path.join(app.getAppPath(), ".vite", "build", "config", "board-ui", uiFileName);
  }
  return path.join(process.cwd(), "src", "config", "test", uiFileName);
}

async function ensureExternalUiConfig(
  uiFileName: string
): Promise<{ externalDir: string; externalPath: string }> {
  const externalDir = getExternalBoardUiDir();
  const externalPath = path.join(externalDir, uiFileName);

  const bundledPath = getBundledUiConfigPath(uiFileName);

  // Жёсткое поведение: пытаемся создать папку CONFIG рядом с .app и положить туда файл.
  // Если прав нет или дефолтный файл не найден — это ошибка.
  await fs.mkdir(externalDir, { recursive: true });

  if (!(await fileExists(externalPath))) {
    if (!(await fileExists(bundledPath))) {
      throw new Error(
        `Не найден дефолтный UI-конфиг для копирования: ${bundledPath}`
      );
    }
    await fs.copyFile(bundledPath, externalPath);
  }

  return { externalDir, externalPath };
}

export function registerBoardUiConfigHandlers(): void {
  ipcMain.handle("board-ui-get-external-dir", async () => {
    return getExternalBoardUiDir();
  });

  ipcMain.handle(
    "board-ui-get-config",
    async (_event, boardName: string = "uno"): Promise<BoardUiConfigResponse> => {
      const uiFileName = mapBoardNameToUiFile(boardName);
      const { externalDir, externalPath } = await ensureExternalUiConfig(uiFileName);

      // В prod приоритет — внешний файл (чтобы пользователь мог менять),
      // но если он битый/не читается, откатываемся на встроенный.
      try {
        const config = await readJson(externalPath);
        return { config, source: "external", externalDir, externalPath };
      } catch (e) {
        const bundledPath = getBundledUiConfigPath(uiFileName);
        const config = await readJson(bundledPath);
        return { config, source: "bundled", externalDir, externalPath };
      }
    }
  );
}


