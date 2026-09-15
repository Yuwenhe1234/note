import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
afterEach(() => {
  cleanup();
  localStorage.clear();
});
