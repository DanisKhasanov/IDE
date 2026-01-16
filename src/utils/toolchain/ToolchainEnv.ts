import path from "node:path";

/**
 * Возвращает env для вызовов AVR toolchain так, чтобы на macOS (особенно при запуске из Finder)
 * были доступны типичные пути Homebrew.
 *
 * Важно: это НЕ замена пользовательской настройки окружения, а безопасный "подстраховочный"
 * prepend распространённых директорий.
 */
export function getToolchainEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };

  const delimiter = path.delimiter; // ":" на macOS/Linux, ";" на Windows
  const currentPath = env.PATH ?? "";
  const pathParts = currentPath
    .split(delimiter)
    .map((p) => p.trim())
    .filter(Boolean);

  // На macOS GUI-приложения часто стартуют с урезанным PATH (/usr/bin:/bin:...),
  // из-за чего Homebrew (обычно /opt/homebrew/bin или /usr/local/bin) не виден.
  const candidates: string[] =
    process.platform === "darwin"
      ? ["/opt/homebrew/bin", "/usr/local/bin"]
      : [];

  const prepend: string[] = [];
  for (const candidate of candidates) {
    if (!pathParts.includes(candidate)) {
      prepend.push(candidate);
    }
  }

  env.PATH = [...prepend, ...pathParts].join(delimiter);
  return env;
}



