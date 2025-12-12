/**
 * Извлекает порт из имени пина (например, "PB0" -> "PB")
 */
export function getPortFromPin(pin: string): string {
  return pin.substring(0, 2);
}

/**
 * Извлекает бит из имени пина (например, "PB0" -> 0)
 */
export function getBitFromPin(pin: string): number {
  return parseInt(pin.substring(2), 10);
}

