import { ipcMain, app } from "electron";
import path from "path";
import { promises as fs, realpathSync } from "fs";
import { pathToFileURL } from "url";

type BoardUiConfigResponse = {
  config: any;
  source: "external";
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

  // macOS: app.getPath("exe") -> .../IDE.app/Contents/MacOS/IDE
  // Linux/Windows: app.getPath("exe") -> путь до исполняемого файла (часто рядом с ним хотим CONFIG)
  // AppImage: удобно держать CONFIG рядом с файлом AppImage (путь доступен в APPIMAGE)
  const appImagePath = process.env.APPIMAGE;
  if (appImagePath) {
    return path.join(path.dirname(appImagePath), "CONFIG");
  }

  const exePath = app.getPath("exe");
  if (process.platform === "darwin") {
    const appBundlePath = path.resolve(exePath, "..", "..", ".."); // -> IDE.app
    const appContainerDir = path.dirname(appBundlePath); // -> папка, где лежит IDE.app
    return path.join(appContainerDir, "CONFIG");
  }

  // На Linux/Windows не делаем подъём на 3 уровня — это ломает путь и часто приводит к /CONFIG.
  // realpathSync помогает, если exe — это симлинк (часто бывает в .deb пакетах).
  const resolvedExe = realpathSync(exePath);
  return path.join(path.dirname(resolvedExe), "CONFIG");
}

function mapBoardNameToUiFile(boardName: string): string {
  // Сейчас UI использует формат src/config/atmega328.json (Arduino Uno).
  // Расширять можно, добавив новые маппинги.
  const normalized = (boardName || "uno").toLowerCase();
  if (normalized === "uno" || normalized === "arduino uno") return "atmega328.json";
  return "atmega328.json";
}

function mapBoardNameToImageFile(boardName: string): string {
  const normalized = (boardName || "uno").toLowerCase();
  if (normalized === "uno" || normalized === "arduino uno") return "image.png";
  return "image.png";
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

async function ensureConfigDirAndReadme(configDir: string): Promise<void> {
  await fs.mkdir(configDir, { recursive: true });

  const readmePath = path.join(configDir, "README.md");
  if (await fileExists(readmePath)) return;

  const content = `# CONFIG

Эта папка используется приложением для загрузки конфигурации платы.

## Что нужно сделать

- Положите сюда файл **atmega328.json**
- Положите сюда файл **image.png**

Итоговый путь должен быть таким (пример):

- \`CONFIG/atmega328.json\`
- \`CONFIG/image.png\`
`;

  await fs.writeFile(readmePath, content, "utf-8");
}

function getDevBoardUiConfigPath(uiFileName: string): string {
  // Dev режим: берём JSON и фото строго из src/config
  return path.join(process.cwd(), "src", "config", uiFileName);
}

function getDevBoardImagePath(imageFileName: string): string {
  // Dev режим: берём JSON и фото строго из src/config
  return path.join(process.cwd(), "src", "config", imageFileName);
}

async function getProdExternalPaths(
  uiFileName: string,
  imageFileName: string
): Promise<{ externalDir: string; externalPath: string; imagePath: string; imageUrl: string }> {
  const externalDir = getExternalBoardUiDir(); // -> <рядом с IDE.app>/CONFIG
  const externalPath = path.join(externalDir, uiFileName);
  const imagePath = path.join(externalDir, imageFileName);

  // Жёсткое поведение: НИЧЕГО не создаём и не копируем.
  // Пользователь обязан сам положить файлы в CONFIG.
  await ensureConfigDirAndReadme(externalDir);

  const missing: string[] = [];
  if (!(await fileExists(externalPath))) missing.push(externalPath);
  if (!(await fileExists(imagePath))) missing.push(imagePath);
  if (missing.length) {
    throw new Error(
      `Отсутствуют обязательные файлы для платы (prod). Создайте папку CONFIG рядом с IDE.app и положите туда atmega328.json и image.png.\n` +
        missing.map((p) => `- ${p}`).join("\n")
    );
  }

  return { externalDir, externalPath, imagePath, imageUrl: pathToFileURL(imagePath).toString() };
}

export function registerBoardUiConfigHandlers(): void {
  ipcMain.handle("board-ui-get-external-dir", async () => {
    return getExternalBoardUiDir();
  });

  ipcMain.handle(
    "board-ui-get-config",
    async (_event, boardName: string = "uno"): Promise<BoardUiConfigResponse> => {
      const uiFileName = mapBoardNameToUiFile(boardName);
      const imageFileName = mapBoardNameToImageFile(boardName);

      // Dev: строго из src/config (json+png)
      if (!app.isPackaged) {
        const jsonPath = getDevBoardUiConfigPath(uiFileName);
        const imagePath = getDevBoardImagePath(imageFileName);
    // Для удобства в dev тоже создаём папку CONFIG и README с инструкцией для продакшена
    await ensureConfigDirAndReadme(getExternalBoardUiDir());
        if (!(await fileExists(jsonPath))) {
          throw new Error(`Не найден UI-конфиг платы (dev): ${jsonPath}`);
        }
        if (!(await fileExists(imagePath))) {
          throw new Error(`Не найдено изображение платы (dev): ${imagePath}`);
        }
        const config = await readJson(jsonPath);
        // В dev удобнее использовать путь, который отдаёт Vite:
        // src/config/image.png доступен как /src/config/image.png
        config.image = `/src/config/${imageFileName}`;
        return { config, source: "external", externalDir: path.dirname(jsonPath), externalPath: jsonPath };
      }

      // Prod: строго из <рядом с IDE.app>/CONFIG (json+png), без копирования
      const { externalDir, externalPath, imageUrl } = await getProdExternalPaths(
        uiFileName,
        imageFileName
      );
      const config = await readJson(externalPath);
      config.image = imageUrl; // file://.../CONFIG/image.png
      return { config, source: "external", externalDir, externalPath };
    }
  );
}


