import { describe, expect, it } from "vitest";
import { capabilitiesFor } from "./runtime-capabilities";

describe("runtime capabilities", () => {
  it("disables server and native actions for the static web build", () => {
    expect(capabilitiesFor({ staticWeb: true, tauri: false })).toEqual({
      staticWeb: true,
      localAuth: false,
      serverWorkspace: false,
      serverAi: false,
      automaticNews: false,
      desktopWidget: false,
    });
  });

  it("keeps current desktop development capabilities", () => {
    expect(capabilitiesFor({ staticWeb: false, tauri: true })).toEqual({
      staticWeb: false,
      localAuth: true,
      serverWorkspace: true,
      serverAi: true,
      automaticNews: true,
      desktopWidget: true,
    });
  });
});
