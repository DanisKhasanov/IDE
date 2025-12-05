# IDE для Arduino проектов

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm start

# Сборка для текущей ОС
npm run make

# Только упаковка (без установщика)
npm run package
```

## Требования

- Node.js 16+ и npm
- Git

## Установка зависимостей

```bash
npm install
```

## Сборка проекта

### Общая информация

Проект использует Electron Forge для сборки. Доступны следующие команды:

- `npm start` - запуск приложения в режиме разработки
- `npm run package` - упаковка приложения без создания установщика (результат в папке `out/`)
- `npm run make` - создание установщиков для текущей операционной системы (результат в папке `out/make/`)

### Сборка для Windows

#### На Windows:

1. Установите зависимости:
```bash
npm install
```

2. Создайте установщик:
```bash
npm run make
```

Результат будет в `out/make/squirrel.windows/x64/` - будет создан установщик в формате Squirrel (`.exe` установщик и пакеты обновления).

3. Или создайте только упакованное приложение:
```bash
npm run package
```

Результат будет в `out/ide-win32-x64/` - папка с исполняемым файлом приложения.

#### Кроссплатформенная сборка для Windows (с Linux/macOS):

Для создания Windows-версии с других ОС используйте переменную окружения:

```bash
npm run package -- --platform=win32 --arch=x64
```

Для создания установщика потребуется дополнительная настройка или сборка на самой Windows.

### Сборка для Linux

#### На Linux:

1. Установите зависимости:
```bash
npm install
```

2. Создайте установщики:
```bash
npm run make
```

Результаты будут в:
- `out/make/deb/x64/` - пакет `.deb` для Debian/Ubuntu
- `out/make/rpm/x64/` - пакет `.rpm` для RHEL/Fedora/CentOS
- `out/make/zip/linux/x64/` - ZIP-архив с приложением

3. Или создайте только упакованное приложение:
```bash
npm run package
```

Результат будет в `out/ide-linux-x64/` - папка с исполняемым файлом приложения.

#### Дополнительные зависимости для Linux:

Для создания пакетов потребуются системные утилиты (обычно уже установлены):

**Для .deb пакетов (Debian/Ubuntu):**
- `dpkg` (для проверки)
- `fakeroot` (для создания пакетов)

Установка на Ubuntu/Debian:
```bash
sudo apt-get install fakeroot dpkg-dev
```

**Для .rpm пакетов (RHEL/Fedora/CentOS):**
- `rpmbuild` (для создания пакетов)

Установка на Fedora/RHEL/CentOS:
```bash
sudo dnf install rpm-build  # или yum install rpm-build для старых версий
```

#### Кроссплатформенная сборка для Linux (с Windows/macOS):

```bash
npm run package -- --platform=linux --arch=x64
```

### Сборка для macOS

#### На macOS:

1. Установите зависимости:
```bash
npm install
```

2. Создайте установщик:
```bash
npm run make
```

Результат будет в `out/make/zip/darwin/x64/` - ZIP-архив с приложением (`.app` bundle).

3. Или создайте только упакованное приложение:
```bash
npm run package
```

Результат будет в `out/ide-darwin-x64/` - папка с приложением (`.app` bundle).

#### Кроссплатформенная сборка для macOS (с Linux/Windows):

**Внимание:** Для создания macOS-версии обычно требуется macOS и Xcode Command Line Tools.

```bash
npm run package -- --platform=darwin --arch=x64
```

## Структура выходных файлов

После сборки файлы будут находиться в:

- `out/` - упакованные приложения (результат `npm run package`)
  - `out/ide-<platform>-<arch>/` - папка с приложением

- `out/make/` - установщики и дистрибутивы (результат `npm run make`)
  - `out/make/deb/x64/` - .deb пакеты (Linux, Debian/Ubuntu)
  - `out/make/rpm/x64/` - .rpm пакеты (Linux, RHEL/Fedora/CentOS)
  - `out/make/zip/` - ZIP архивы
  - `out/make/squirrel.windows/x64/` - установщики Windows

## Разработка

Для запуска в режиме разработки:

```bash
npm start
```

Это запустит приложение с hot-reload и инструментами разработчика.

## Линтинг

Для проверки кода:

```bash
npm run lint
```

## Запуск собранного приложения

### Linux

После сборки командой `npm run package -- --platform=linux --arch=x64`:

1. Перейдите в папку с приложением:
```bash
cd out/IDE-linux-x64
```

2. Сделайте файл исполняемым (если нужно):
```bash
chmod +x IDE
```

3. Исправьте права на chrome-sandbox (может потребоваться):
```bash
sudo chown root:root chrome-sandbox
sudo chmod 4755 chrome-sandbox
```

4. Запустите приложение:
```bash
./IDE
```

**Примечание:** Приложение автоматически отключает sandbox на Linux, поэтому права на chrome-sandbox не обязательны, но рекомендуется их установить для безопасности.

### Windows

После сборки командой `npm run package -- --platform=win32 --arch=x64`:

Запустите `IDE.exe` из папки `out/IDE-win32-x64/`.

### macOS

После сборки командой `npm run package -- --platform=darwin --arch=x64`:

Запустите `IDE.app` из папки `out/IDE-darwin-x64/`.

## Примечания

- При сборке на Linux может потребоваться запустить скрипт `fix-sandbox.sh` для исправления прав доступа к chrome-sandbox в процессе разработки:
  ```bash
  ./fix-sandbox.sh
  ```
- Для создания подписанных установщиков потребуется настройка сертификатов в `forge.config.ts`
- Для публикации в репозитории используйте `npm run publish` (требует дополнительной настройки)

