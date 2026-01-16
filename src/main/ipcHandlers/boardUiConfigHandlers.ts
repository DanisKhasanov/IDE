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

type BoardUiCatalogItem = {
  id: string; // стабильный id (используется UI)
  name: string; // отображаемое имя
  defaultFcpu: number;
  fcpuOptions: number[];
  uiFileName: string; // имя json файла
  imageFileName: string; // имя картинки (может быть общим)
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

function slugifyId(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

- Положите сюда один или несколько файлов **\`*.json\`** с UI-конфигами плат
- Положите сюда изображения плат (**\`*.png\`**) — по умолчанию используется \`image.png\`

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

function getDevConfigDir(): string {
  return path.join(process.cwd(), "src", "config");
}

async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
    .map((e) => e.name);
}

function inferPlatform(json: any, uiFileName: string): string {
  // Определяем платформу только из MCU
  const mcu = String(json?.meta?.mcu || "").trim();
  const mcuLower = mcu.toLowerCase();
  
  // Если в MCU есть stm32, то платформа stm32
  if (mcuLower.includes("stm32")) return "stm32";
  
  // По умолчанию arduino (для AVR и других)
  return "arduino";
}

function resolveBoardId(json: any, uiFileName: string): string {
  const meta = json?.meta || {};
  const explicit =
    (typeof meta.boardId === "string" && meta.boardId.trim()) ? meta.boardId.trim() :
    (typeof meta.id === "string" && meta.id.trim()) ? meta.id.trim() :
    undefined;

  // Совместимость с текущим UI: Arduino Uno должен быть "uno"
  const boardName = String(meta.board || "");
  if (uiFileName === "atmega328.json") return "uno";
  if (boardName.toLowerCase() === "arduino uno") return "uno";

  if (explicit) return slugifyId(explicit);

  const base = path.basename(uiFileName, ".json");
  const fromName = slugifyId(boardName);
  return fromName || slugifyId(base) || "board";
}

function resolveImageFileName(json: any): string {
  const meta = json?.meta || {};
  const fromMeta =
    (typeof meta.imageFile === "string" && meta.imageFile.trim()) ? meta.imageFile.trim() :
    (typeof meta.image === "string" && meta.image.trim()) ? meta.image.trim() :
    "";
  return fromMeta || "image.png";
}

function resolveFcpuOptions(json: any): { defaultFcpu: number; fcpuOptions: number[] } {
  const meta = json?.meta || {};
  const def =
    typeof meta.defaultFcpu === "number"
      ? meta.defaultFcpu
      : typeof meta.defaultFcpu === "string"
        ? Number(meta.defaultFcpu)
        : 16000000;
  const optsRaw = Array.isArray(meta.fcpuOptions) ? meta.fcpuOptions : [def];
  const opts = optsRaw
    .map((v: any) => (typeof v === "number" ? v : Number(v)))
    .filter((v: number) => Number.isFinite(v));
  return { defaultFcpu: Number.isFinite(def) ? def : 16000000, fcpuOptions: opts.length ? opts : [16000000] };
}

async function buildCatalogFromDir(dir: string): Promise<BoardUiCatalogItem[]> {
  const files = await listJsonFiles(dir);
  const items: BoardUiCatalogItem[] = [];

  for (const uiFileName of files) {
    try {
      const jsonPath = path.join(dir, uiFileName);
      const json = await readJson(jsonPath);
      const id = resolveBoardId(json, uiFileName);
      const name = String(json?.meta?.board || id);
      const imageFileName = resolveImageFileName(json);
      const { defaultFcpu, fcpuOptions } = resolveFcpuOptions(json);
      items.push({ id, name, defaultFcpu, fcpuOptions, uiFileName, imageFileName });
    } catch (e) {
      // Пропускаем битые/невалидные json, чтобы UI не падал целиком
      console.warn(`Не удалось прочитать UI-конфиг платы: ${uiFileName}`, e);
    }
  }

  // Стабильная сортировка по имени
  return items.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
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

  ipcMain.handle("board-ui-list-configs", async (): Promise<BoardUiCatalogItem[]> => {
    // Dev: src/config, Prod: рядом с IDE.app папка CONFIG
    const dir = app.isPackaged ? getExternalBoardUiDir() : getDevConfigDir();
    // Для удобства в dev тоже создаём папку CONFIG и README с инструкцией для продакшена
    await ensureConfigDirAndReadme(getExternalBoardUiDir());
    if (!(await fileExists(dir))) return [];
    return buildCatalogFromDir(dir);
  });

  ipcMain.handle(
    "board-ui-get-config",
    async (_event, boardId: string = "uno"): Promise<BoardUiConfigResponse> => {
      const dir = app.isPackaged ? getExternalBoardUiDir() : getDevConfigDir();
      // Для удобства в dev тоже создаём папку CONFIG и README с инструкцией для продакшена
      await ensureConfigDirAndReadme(getExternalBoardUiDir());

      const catalog = (await fileExists(dir)) ? await buildCatalogFromDir(dir) : [];
      const normalizedId = slugifyId(boardId || "uno") || "uno";

      const selected =
        catalog.find((c) => c.id === normalizedId) ||
        (normalizedId === "uno" ? catalog.find((c) => c.id === "uno") : undefined) ||
        catalog[0];

      if (!selected) {
        throw new Error(`Не найдено ни одного UI-конфига платы в директории: ${dir}`);
      }

      const uiFileName = selected.uiFileName;
      const imageFileName = selected.imageFileName;

      // Dev: строго из src/config (json+png)
      if (!app.isPackaged) {
        const jsonPath = getDevBoardUiConfigPath(uiFileName);
        const imagePath = getDevBoardImagePath(imageFileName);
        if (!(await fileExists(jsonPath))) {
          throw new Error(`Не найден UI-конфиг платы (dev): ${jsonPath}`);
        }
        const config = await readJson(jsonPath);
        // В dev удобнее использовать путь, который отдаёт Vite:
        // src/config/<file> доступен как /src/config/<file>
        if (await fileExists(imagePath)) {
          config.image = `/src/config/${imageFileName}`;
        }
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


