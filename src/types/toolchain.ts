export interface ToolchainStatus {
  installed: boolean;
  tools: {
    avrGcc: boolean;
    avrObjcopy: boolean;
    avrdude: boolean;
  };
  versions: {
    avrGcc?: string;
    avrObjcopy?: string;
    avrdude?: string;
  };
  errors: string[];
}

export interface InstallCommands {
  platform: "linux" | "macos" | "windows";
  commands: string[];
  description: string;
  instructions: string[];
}

export interface InstallProgress {
  step: string;
  output: string;
  error?: string;
}

export interface InstallResult {
  success: boolean;
  error?: string;
}

