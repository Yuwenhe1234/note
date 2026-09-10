import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("./App", () => ({ default: () => <h1>网页版工作区</h1> }));
vi.mock("./L5-services/runtime-capabilities", () => ({ runtimeCapabilities: { staticWeb: true } }));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => ({ label: "main" }) }));
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("./L4-data/auth-repository", () => ({
  getSession,
  enterAccount: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("./L1-ui/features/desktop/desktop-widget-window", () => ({ WidgetWindowRoot: () => null }));

import { Root } from "./root";

it("opens the static web workspace without requesting a local session", () => {
  render(<Root />);
  expect(screen.getByRole("heading", { name: "网页版工作区" })).toBeInTheDocument();
  expect(getSession).not.toHaveBeenCalled();
});
