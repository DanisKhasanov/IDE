MCU = atmega328p
F_CPU = 16000000L
ARDUINO_VERSION = 10809

CC = avr-gcc
OBJCOPY = avr-objcopy
OBJDUMP = avr-objdump

CFLAGS = -g -Os -w -std=gnu11 -ffunction-sections -fdata-sections -MMD -MP -I$(CORE_DIR) -I$(VARIANT_DIR) -mmcu=$(MCU) -DF_CPU=$(F_CPU) -DARDUINO=$(ARDUINO_VERSION)
CXXFLAGS = -g -Os -w -std=gnu++11 -ffunction-sections -fdata-sections -fno-threadsafe-statics -MMD -MP -I$(CORE_DIR) -I$(VARIANT_DIR) -mmcu=$(MCU) -DF_CPU=$(F_CPU) -DARDUINO=$(ARDUINO_VERSION)
LDFLAGS = -Wl,--gc-sections

CORE_DIR = cores/arduino
VARIANT_DIR = variants/standard
BUILD_DIR = build

# Исходники ядра (включая main.cpp)
CORE_C = $(wildcard $(CORE_DIR)/*.c)
CORE_CPP = $(wildcard $(CORE_DIR)/*.cpp)

# Объектники ядра (с префиксом BUILD_DIR)
CORE_OBJ = $(CORE_C:$(CORE_DIR)/%.c=$(BUILD_DIR)/%.o) $(CORE_CPP:$(CORE_DIR)/%.cpp=$(BUILD_DIR)/%.o)

# Исходник приложения
APP_SRC = src/main.cpp
APP_OBJ = $(BUILD_DIR)/app_main.o  # ← изменено

TARGET = firmware

all: $(BUILD_DIR)/$(TARGET).hex
	@echo "CORE_OBJ = $(CORE_OBJ)"

# Компиляция приложения
$(APP_OBJ): $(APP_SRC)
	mkdir -p $(BUILD_DIR)
	$(CC) $(CXXFLAGS) -c $< -o $@

# Компиляция ядра
$(BUILD_DIR)/%.o: $(CORE_DIR)/%.c
	mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILD_DIR)/%.o: $(CORE_DIR)/%.cpp
	mkdir -p $(BUILD_DIR)
	$(CC) $(CXXFLAGS) -c $< -o $@

# Линковка
$(BUILD_DIR)/$(TARGET).elf: $(APP_OBJ) $(CORE_OBJ)
	$(CC) $(LDFLAGS) -mmcu=$(MCU) -o $@ $(APP_OBJ) $(CORE_OBJ) -lm

# Генерация hex
$(BUILD_DIR)/$(TARGET).hex: $(BUILD_DIR)/$(TARGET).elf
	$(OBJCOPY) -O ihex -R .eeprom $< $@

clean:
	rm -rf $(BUILD_DIR)

.PHONY: all clean