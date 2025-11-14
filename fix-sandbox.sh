#!/bin/bash
# Скрипт для исправления прав доступа к chrome-sandbox в Electron на Linux

ELECTRON_SANDBOX_PATH="node_modules/electron/dist/chrome-sandbox"

if [ -f "$ELECTRON_SANDBOX_PATH" ]; then
    echo "Устанавливаем права на chrome-sandbox..."
    echo "Этот скрипт требует прав sudo для установки владельца файла как root"
    echo ""
    sudo chown root:root "$ELECTRON_SANDBOX_PATH"
    sudo chmod 4755 "$ELECTRON_SANDBOX_PATH"
    echo ""
    echo "Права установлены успешно!"
    echo "Теперь вы можете запустить приложение командой: npm start"
else
    echo "Файл chrome-sandbox не найден по пути: $ELECTRON_SANDBOX_PATH"
    echo "Попробуйте запустить 'npm ci' или 'npm install' сначала"
    exit 1
fi


