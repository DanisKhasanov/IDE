import { safeInvoke } from "./utils";

export type BoardUiConfigResult = {
  config: any;
  source: "external";
  externalDir: string;
  externalPath: string;
};

export type BoardUiCatalogItem = {
  id: string;
  name: string;
  platform: string;
  defaultFcpu: number;
  fcpuOptions: number[];
  uiFileName: string;
  imageFileName: string;
};

export const configAPI = {
  getBoardUiConfig: async (boardName = "uno") => {
    return safeInvoke<BoardUiConfigResult>("board-ui-get-config", boardName);
  },
  getBoardUiExternalDir: async () => {
    return safeInvoke<string>("board-ui-get-external-dir");
  },
  listBoardUiConfigs: async () => {
    return safeInvoke<BoardUiCatalogItem[]>("board-ui-list-configs");
  },
};


