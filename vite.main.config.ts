import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Плагин для копирования JSON конфигурационных файлов
const copyConfigFiles = () => {
  return {
    name: 'copy-config-files',
    writeBundle() {
      const configSrc = resolve(__dirname, 'src/config');
      const configDest = resolve(__dirname, 'out/main/config');
      
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
          
          const fs = require('fs');
          const files = fs.readdirSync(boardsSrc);
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
  };
};

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@src': resolve(__dirname, 'src'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@components': resolve(__dirname, 'src/components'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@main': resolve(__dirname, 'src/main'),
      '@config': resolve(__dirname, 'src/config'),
      '@assets': resolve(__dirname, 'src/assets'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  build: {
    rollupOptions: {
      external: [
        // Нативные модули должны быть внешними зависимостями
        'node-pty',
        // Другие нативные модули Electron
        'electron',
        'electron-squirrel-startup',
      ],
    },
  },
  plugins: [copyConfigFiles()],
});
