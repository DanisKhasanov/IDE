import { type OpenProjectData } from "@utils/project/ProjectUtils";

/**
 * Менеджер для управления открытыми проектами
 */
export class ProjectManager {
  private currentProjectPath: string | null = null;
  private openProjects = new Map<string, OpenProjectData>();

  /**
   * Получить текущий путь проекта
   */
  getCurrentProjectPath(): string | null {
    return this.currentProjectPath;
  }

  /**
   * Установить текущий путь проекта
   */
  setCurrentProjectPath(path: string | null): void {
    this.currentProjectPath = path;
  }

  /**
   * Получить проект по пути
   */
  getProject(projectPath: string): OpenProjectData | undefined {
    return this.openProjects.get(projectPath);
  }

  /**
   * Проверить, открыт ли проект
   */
  hasProject(projectPath: string): boolean {
    return this.openProjects.has(projectPath);
  }

  /**
   * Добавить проект
   */
  addProject(projectPath: string, projectData: OpenProjectData): void {
    this.openProjects.set(projectPath, projectData);
  }

  /**
   * Удалить проект
   */
  removeProject(projectPath: string): void {
    this.openProjects.delete(projectPath);
  }

  /**
   * Получить все открытые проекты
   */
  getAllProjects(): OpenProjectData[] {
    return Array.from(this.openProjects.values());
  }

  /**
   * Получить все пути открытых проектов
   */
  getAllProjectPaths(): string[] {
    return Array.from(this.openProjects.keys());
  }

  /**
   * Получить Map всех проектов (для внутреннего использования)
   */
  getProjectsMap(): Map<string, OpenProjectData> {
    return this.openProjects;
  }

  /**
   * Очистить все проекты
   */
  clear(): void {
    this.openProjects.clear();
    this.currentProjectPath = null;
  }
}

// Экспортируем singleton экземпляр
export const projectManager = new ProjectManager();

