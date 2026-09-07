import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompanionWindow } from "./companion-window";

describe("CompanionWindow", () => {
  it("explains scope without offering unfinished uploads", () => {
    render(<CompanionWindow />);
    expect(screen.getByRole("heading", { name: "AI 陪伴" })).toBeInTheDocument();
    expect(screen.getByText(/照片与声音素材默认保存在本机/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /上传/ })).not.toBeInTheDocument();
  });
});
