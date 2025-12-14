import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
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
    ],
    // Убеждаемся, что нативные модули пересобираются
    ignore: [
      /^\/node_modules\/node-pty\/build\/Release\/.*\.node$/,
    ],
  },
  hooks: {
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
    },
  },
  rebuildConfig: {
    // Пересобираем только необходимые нативные модули
    onlyModules: ['node-pty', 'serialport'],
    // Разрешаем пересборку для целевой платформы
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
