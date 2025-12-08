#!/bin/bash

# Скрипт для очистки кешей и временных данных IDE
# Удаляет все кеши, оставляя только важные файлы конфигурации

set -e

IDE_CONFIG_DIR="$HOME/.config/IDE"

# Проверяем существование директории
if [ ! -d "$IDE_CONFIG_DIR" ]; then
    echo "Директория $IDE_CONFIG_DIR не найдена"
    exit 1
fi

echo "Очистка кешей IDE..."
echo "Директория: $IDE_CONFIG_DIR"
echo ""

# Список файлов и папок для удаления
ITEMS_TO_REMOVE=(
    "Cache"
    "Code Cache"
    "GPUCache"
    "DawnGraphiteCache"
    "DawnWebGPUCache"
    "Cookies"
    "Cookies-journal"
    "Local Storage"
    "Session Storage"
    "DIPS"
    "DIPS-wal"
    "SharedStorage"
    "SharedStorage-wal"
    "Network Persistent State"
    "TransportSecurity"
    "Trust Tokens"
    "Trust Tokens-journal"
    "Crashpad"
    "Dictionaries"
    "blob_storage"
    "Shared Dictionary"
    "logs"
)

# Удаляем каждый элемент
REMOVED_COUNT=0
for item in "${ITEMS_TO_REMOVE[@]}"; do
    item_path="$IDE_CONFIG_DIR/$item"
    if [ -e "$item_path" ]; then
        rm -rf "$item_path"
        echo "✓ Удалено: $item"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
    fi
done

echo ""
echo "Очистка завершена. Удалено элементов: $REMOVED_COUNT"
echo ""
echo "Оставшиеся файлы:"
ls -lh "$IDE_CONFIG_DIR" | grep -v "^total" | grep -v "^d.*\.$" | grep -v "^d.*\.\.$" || echo "Директория пуста"

