import { isTauri } from "@tauri-apps/api/core";

export type RuntimeCapabilities = {
  staticWeb: boolean;
  localAuth: boolean;
  serverWorkspace: boolean;
  serverAi: boolean;
  automaticNews: boolean;
  desktopWidget: boolean;
};

export function capabilitiesFor(input: { staticWeb: boolean; tauri: boolean }): RuntimeCapabilities {
  if (input.staticWeb) {
    return {
      staticWeb: true,
      localAuth: false,
      serverWorkspace: false,
      serverAi: false,
      automaticNews: false,
      desktopWidget: false,
    };
  }
  return {
    staticWeb: false,
    localAuth: true,
    serverWorkspace: true,
    serverAi: true,
    automaticNews: true,
    desktopWidget: input.tauri,
  };
}

export const runtimeCapabilities = capabilitiesFor({
  staticWeb: import.meta.env.MODE === "github-pages",
  tauri: isTauri(),
});
