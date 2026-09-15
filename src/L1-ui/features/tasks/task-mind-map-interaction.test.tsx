import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskMindMap } from "./task-mind-map";

vi.mock("@xyflow/react", async () => {
  const React = await import("react");
  return {
    Position: { Top: "top", Bottom: "bottom", Left: "left", Right: "right" },
    SelectionMode: { Partial: "partial" },
    Handle: () => null, Background: () => null, Controls: () => null,
    useNodesState: (initial: unknown[]) => { const [nodes, setNodes] = React.useState(initial); return [nodes, setNodes, () => {}]; },
    useEdgesState: (initial: unknown[]) => { const [edges, setEdges] = React.useState(initial); return [edges, setEdges, () => {}]; },
    addEdge: (edge: unknown, edges: unknown[]) => [...edges, edge],
    ReactFlow: ({ nodes, nodeTypes, onNodeClick }: any) => <div>{nodes.map((node: any) => { const Component = nodeTypes.mindMapNode; return <div key={node.id} data-testid={node.id} onClick={(event) => onNodeClick(event, node)}><Component data={node.data} /></div>; })}</div>,
  };
});

describe("mind map child editing", () => {
  it("creates an editable root when the map is empty", () => {
    const onChange = vi.fn();
    render(<TaskMindMap value={{ nodes: [], edges: [] }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "创建主题" }));
    const editor = screen.getByRole("textbox");
    fireEvent.change(editor, { target: { value: "学习运放" } });
    fireEvent.blur(editor);
    const map = onChange.mock.calls.at(-1)![0];
    expect(map.nodes).toHaveLength(1);
    expect(map.nodes[0]).toMatchObject({ label: "学习运放", level: 0 });
  });

  it("adds a child to the clicked module and returns keyboard focus after editing", () => {
    const onChange = vi.fn();
    render(<TaskMindMap value={{ nodes: [{ id: "root", label: "主题", level: 0, x: 0, y: 0 }, { id: "module", label: "模块", level: 1, x: 0, y: -210 }], edges: [{ id: "e", source: "root", target: "module" }] }} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("module"));
    fireEvent.click(screen.getByRole("button", { name: "+ 子节点" }));
    const editor = screen.getByRole("textbox");
    fireEvent.change(editor, { target: { value: "新的知识点" } });
    fireEvent.keyDown(editor, { key: "Enter" });
    fireEvent.blur(editor);
    const region = screen.getByRole("region", { name: "思维导图" });
    expect(document.activeElement).toBe(region);
    const map = onChange.mock.calls.at(-1)![0];
    const child = map.nodes.find((node: any) => node.label === "新的知识点");
    expect(child.level).toBe(2);
    expect(child.y).toBeLessThan(map.nodes.find((node: any) => node.id === "module").y);
    expect(map.edges.find((edge: any) => edge.target === child.id).source).toBe("module");
    fireEvent.keyDown(region, { key: "Tab" });
    const nextMap = onChange.mock.calls.at(-1)![0];
    expect(nextMap.edges.at(-1).source).toBe(child.id);
  });
});
