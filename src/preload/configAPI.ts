import { safeInvoke } from "./utils";

export type BoardUiConfigResult = {
  config: any;
  source: "external" | "bundled";
  externalDir: string;
  externalPath: string;
};

export const configAPI = {
  getBoardUiConfig: async (boardName = "uno") => {
    return safeInvoke<BoardUiConfigResult>("board-ui-get-config", boardName);
  },
  getBoardUiExternalDir: async () => {
    return safeInvoke<string>("board-ui-get-external-dir");
  },
};


