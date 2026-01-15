import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { copyFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import { resolve } from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // Явно указываем, какие модули должны быть распакованы из asar
    // Нативные модули не могут работать изнутри asar архива
    // @ts-expect-error - asarUnpack поддерживается electron-packager, но не в типах Forge
    asarUnpack: [
      '**/node_modules/node-pty/**/*',
      'node_modules/node-pty/**/*',
      '**/node_modules/serialport/**/*',
      'node_modules/serialport/**/*',
      '**/node_modules/@serialport/bindings-cpp/**/*',
      'node_modules/@serialport/bindings-cpp/**/*',
    ],
    // Убеждаемся, что нативные модули пересобираются
    ignore: [
      /^\/node_modules\/node-pty\/build\/Release\/.*\.node$/,
    ],
  },
  hooks: {
    // Хук для пересборки нативных модулей после извлечения, но перед упаковкой
    packageAfterExtract: async (_forgeConfig, buildPath, _electronVersion, platform, arch) => {
      // Удаляем старые нативные модули, чтобы принудительно пересобрать их для целевой платформы
      const nodePtyPath = resolve(buildPath, 'node_modules/node-pty/build');
      const serialportPath = resolve(buildPath, 'node_modules/serialport/build');
      const bindingsCppPath = resolve(buildPath, 'node_modules/@serialport/bindings-cpp/build');
      
      if (existsSync(nodePtyPath)) {
        console.log(`Удаление старых нативных модулей node-pty...`);
        rmSync(nodePtyPath, { recursive: true, force: true });
      }
      if (existsSync(serialportPath)) {
        console.log(`Удаление старых нативных модулей serialport...`);
        rmSync(serialportPath, { recursive: true, force: true });
      }
      if (existsSync(bindingsCppPath)) {
        console.log(`Удаление старых нативных модулей @serialport/bindings-cpp...`);
        rmSync(bindingsCppPath, { recursive: true, force: true });
      }
      
      // Пересобираем нативные модули для целевой платформы
      // Electron Forge должен автоматически пересобрать модули, но удаление старых
      // гарантирует, что будут использованы модули для правильной платформы
      console.log(`Пересборка нативных модулей для ${platform}-${arch}...`);
    },
    // Хук для копирования конфигурационных файлов после сборки, но перед упаковкой
    packageAfterCopy: async (_forgeConfig, buildPath) => {
      // На этом этапе файлы уже собраны в buildPath
      // Копируем конфигурацию из out/main/config в .vite/build/config внутри buildPath
      const configSrc = resolve(process.cwd(), 'out/main/config');
      const configDest = resolve(buildPath, '.vite/build/config');
      
      if (existsSync(configSrc)) {
        // Создаем директорию назначения если её нет
        if (!existsSync(configDest)) {
          mkdirSync(configDest, { recursive: true });
        }
        
        // Копируем JSON файлы
        const boardsSrc = resolve(configSrc, 'boards');
        const boardsDest = resolve(configDest, 'boards');
        
        if (existsSync(boardsSrc)) {
          if (!existsSync(boardsDest)) {
            mkdirSync(boardsDest, { recursive: true });
          }
          
          const files = readdirSync(boardsSrc);
          files.forEach((file: string) => {
            if (file.endsWith('.json')) {
              copyFileSync(
                resolve(boardsSrc, file),
                resolve(boardsDest, file)
              );
            }
          });
        }
      }

      // Копируем UI-конфиги плат (используются в интерфейсе для пинов/периферии).
      // В dev они берутся из src/config/test/*.json, а в prod (packaged) будут доступны
      // как встроенный дефолт по пути .vite/build/config/board-ui/*.json
      const uiBoardsSrc = resolve(process.cwd(), 'src/config/test');
      const uiBoardsDest = resolve(configDest, 'board-ui');

      if (existsSync(uiBoardsSrc)) {
        if (!existsSync(uiBoardsDest)) {
          mkdirSync(uiBoardsDest, { recursive: true });
        }

        const uiFiles = readdirSync(uiBoardsSrc);
        uiFiles.forEach((file: string) => {
          if (file.endsWith('.json')) {
            copyFileSync(
              resolve(uiBoardsSrc, file),
              resolve(uiBoardsDest, file)
            );
          }
        });
      }
    },
  },
  rebuildConfig: {
    // Пересобираем только необходимые нативные модули
    // @serialport/bindings-cpp - это нативный модуль, который используется serialport
    onlyModules: ['node-pty', 'serialport', '@serialport/bindings-cpp'],
    // Разрешаем пересборку для целевой платформы
    // Это критично для кроссплатформенной сборки
    force: true,
  },
  makers: [
    // Windows makers (MakerSquirrel требует Windows, поэтому используем только ZIP для кроссплатформенной сборки)
    new MakerZIP({}, ['win32']),
    // macOS makers
    new MakerZIP({}, ['darwin']),
    // Linux makers
    new MakerDeb({}),
    // Временно отключаем RPM из-за проблем с правами доступа
    // new MakerRpm({}),
    new MakerZIP({}, ['linux']),
  ],
  plugins: [
    // Плагин для автоматической распаковки нативных модулей из asar архива
    // Должен быть ПЕРВЫМ, чтобы правильно обработать нативные модули перед сборкой
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      // Отключаем OnlyLoadAppFromAsar, чтобы разрешить загрузку модулей из asar.unpacked
      // Это необходимо для работы нативных модулей, таких как node-pty
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
