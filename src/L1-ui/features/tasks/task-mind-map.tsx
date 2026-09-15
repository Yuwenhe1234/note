import { addEdge, Background, Controls, Handle, Position, ReactFlow, SelectionMode, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useRef, type MouseEvent } from "react";
import type { TaskMindMap } from "../../../L4-data/task-model";

const toNodes = (map: TaskMindMap): Node[] => map.nodes.map((node) => ({ id: node.id, position: { x: node.x, y: node.y }, data: { label: node.label }, type: "mindMapNode" }));
const toEdges = (map: TaskMindMap): Edge[] => map.edges.map((edge) => ({ ...edge, sourceHandle: edge.kind === "feedback" ? "right-feedback-source" : "bottom-source", targetHandle: edge.kind === "feedback" ? "left-feedback-target" : "top-target", data: { kind: edge.kind || "main" }, animated: false }));

function MindMapNode({ data }: { data: { label?: string; editing?: boolean; onRename?: (label: string) => void } }) {
  return <><Handle type="target" position={Position.Top} id="top-target" /><Handle type="source" position={Position.Bottom} id="bottom-source" /><Handle type="target" position={Position.Left} id="left-feedback-target" /><Handle type="source" position={Position.Right} id="right-feedback-source" />{data.editing ? <input className="mind-map-node-input" autoFocus defaultValue={data.label} onBlur={(event) => data.onRename?.(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /> : <span>{data.label}</span>}</>;
}

const nodeTypes = { mindMapNode: MindMapNode };

export function TaskMindMap({ value, onChange, className = "", onDoubleClick }: { value: TaskMindMap; onChange: (value: TaskMindMap) => void; className?: string; onDoubleClick?: () => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toNodes(value));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toEdges(value));
  const history = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const snapshot = () => { history.current = [...history.current.slice(-29), { nodes, edges }]; };
  const undo = () => { const previous = history.current.pop(); if (previous) { setNodes(previous.nodes); setEdges(previous.edges); } };
  useEffect(() => onChange({ nodes: nodes.map((node) => ({ id: node.id, label: String(node.data.label || "节点"), x: node.position.x, y: node.position.y })), edges: edges.map(({ id, source, target, data }) => ({ id, source, target, kind: data?.kind === "feedback" ? "feedback" : "main" })) }), [nodes, edges]);
  useEffect(() => { const listener = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !(event.target instanceof HTMLInputElement)) { event.preventDefault(); undo(); } }; window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener); });
  const connect = (connection: Connection) => { snapshot(); const kind = connection.sourceHandle === "right-feedback-source" ? "feedback" : "main"; setEdges((current) => addEdge({ ...connection, id: crypto.randomUUID(), data: { kind } }, current)); };
  const addNode = () => { snapshot(); setNodes((current) => [...current, { id: crypto.randomUUID(), position: { x: 120 + current.length * 28, y: 90 + current.length * 38 }, data: { label: "新知识点" }, type: "mindMapNode" }]); };
  const deleteSelected = () => { snapshot(); const selected = new Set(nodes.filter((node) => node.selected).map((node) => node.id)); setNodes((current) => current.filter((node) => !selected.has(node.id))); setEdges((current) => current.filter((edge) => !selected.has(edge.source) && !selected.has(edge.target))); };
  const handleNodeDoubleClick = (event: MouseEvent, node: Node) => { event.stopPropagation(); if (onDoubleClick) { onDoubleClick(); return; } const label = window.prompt("编辑知识点", String(node.data.label || "")); if (label?.trim()) setNodes((current) => current.map((item) => item.id === node.id ? { ...item, data: { ...item.data, label: label.trim() } } : item)); };
  const handleKeyDown = (event: React.KeyboardEvent) => { if (event.key === "Delete") deleteSelected(); };
  const handleNodes = (changes: Parameters<typeof onNodesChange>[0]) => { if (changes.some((change) => change.type === "remove" || change.type === "position")) snapshot(); onNodesChange(changes); };
  const handleEdges = (changes: Parameters<typeof onEdgesChange>[0]) => { if (changes.some((change) => change.type === "remove")) snapshot(); onEdgesChange(changes); };
  return <section className={`task-mind-map ${className}`} aria-label="思维导图" onDoubleClick={onDoubleClick}><div className="task-mind-map-toolbar"><h2>思维导图</h2><span><button onClick={addNode}>+ 节点</button><button onClick={deleteSelected}>删除选中</button></span></div><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={handleNodes} onEdgesChange={handleEdges} onConnect={connect} onNodeDoubleClick={handleNodeDoubleClick} onKeyDown={handleKeyDown} selectionOnDrag selectionMode={SelectionMode.Partial} panOnDrag={false} deleteKeyCode="Delete" minZoom={0.08} fitView fitViewOptions={{ padding: 0.18, maxZoom: 1 }} proOptions={{ hideAttribution: true }}><Background gap={18} size={1} /><Controls showInteractive={false} /></ReactFlow></section>;
}
