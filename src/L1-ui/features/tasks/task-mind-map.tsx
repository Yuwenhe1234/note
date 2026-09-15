import { addEdge, Background, Controls, Handle, Position, ReactFlow, SelectionMode, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { TaskMindMap } from "../../../L4-data/task-model";
import { layoutMindMap } from "./mind-map-layout";

const toNodes = (map: TaskMindMap): Node[] => { const inbound = new Set(map.edges.filter((edge) => edge.kind !== "feedback").map((edge) => edge.target)); const levels = new Map<string, number>(); map.nodes.filter((node) => !inbound.has(node.id)).forEach((node) => levels.set(node.id, 0)); for (let pass = 0; pass < map.nodes.length; pass += 1) map.edges.filter((edge) => edge.kind !== "feedback").forEach((edge) => { const parent = levels.get(edge.source); if (parent !== undefined && (levels.get(edge.target) === undefined || levels.get(edge.target)! > parent + 1)) levels.set(edge.target, parent + 1); }); return map.nodes.map((node) => ({ id: node.id, position: { x: node.x, y: node.y }, data: { label: node.label, level: node.level ?? levels.get(node.id) ?? 2 }, type: "mindMapNode" })); };
const toEdges = (map: TaskMindMap): Edge[] => { const positions = new Map(map.nodes.map((node) => [node.id, node])); return map.edges.map((edge) => { const source = positions.get(edge.source); const target = positions.get(edge.target); const upward = source && target && target.y < source.y; return { ...edge, sourceHandle: edge.kind === "feedback" ? "right-feedback-source" : upward ? "top-source" : "bottom-source", targetHandle: edge.kind === "feedback" ? "left-feedback-target" : upward ? "bottom-target" : "top-target", data: { kind: edge.kind || "main" }, animated: false }; }); };

function MindMapNode({ data }: { data: { label?: string; level?: number; editing?: boolean; onRename?: (label: string) => void } }) {
  const level = data.level ?? 2;
  return <><Handle type="target" position={Position.Top} id="top-target" /><Handle type="source" position={Position.Top} id="top-source" /><Handle type="target" position={Position.Bottom} id="bottom-target" /><Handle type="source" position={Position.Bottom} id="bottom-source" /><Handle type="target" position={Position.Left} id="left-feedback-target" /><Handle type="source" position={Position.Right} id="right-feedback-source" /><div className={`mind-map-node-content level-${Math.min(level, 3)}`}>{data.editing ? <input className="mind-map-node-input nodrag nopan nowheel" autoFocus defaultValue={data.label} onBlur={(event) => data.onRename?.(event.currentTarget.value)} onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Enter") event.currentTarget.blur(); }} /> : <span>{data.label}</span>}</div></>;
}

const nodeTypes = { mindMapNode: MindMapNode };

export function TaskMindMap({ value, onChange, className = "", onDoubleClick }: { value: TaskMindMap; onChange: (value: TaskMindMap) => void; className?: string; onDoubleClick?: () => void }) {
  const editorRef = useRef<HTMLElement>(null);
  const initialMap = useRef(layoutMindMap(value));
  const [nodes, setNodes, onNodesChange] = useNodesState(toNodes(initialMap.current));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toEdges(initialMap.current));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const history = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const snapshot = () => { history.current = [...history.current.slice(-29), { nodes, edges }]; };
  const undo = () => { const previous = history.current.pop(); if (previous) { setNodes(previous.nodes); setEdges(previous.edges); } };
  useEffect(() => onChange({ nodes: nodes.map((node) => ({ id: node.id, label: String(node.data.label || "节点"), level: Number(node.data.level ?? 2), x: node.position.x, y: node.position.y })), edges: edges.map(({ id, source, target, data }) => ({ id, source, target, kind: data?.kind === "feedback" ? "feedback" : "main" })) }), [nodes, edges]);
  useEffect(() => { const listener = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !(event.target instanceof HTMLInputElement)) { event.preventDefault(); undo(); } }; window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener); });
  const connect = (connection: Connection) => { snapshot(); const kind = connection.sourceHandle === "right-feedback-source" ? "feedback" : "main"; setEdges((current) => addEdge({ ...connection, id: crypto.randomUUID(), data: { kind } }, current)); };
  const finishRename = (id: string, label: string) => { setNodes((current) => current.map((node) => node.id === id ? { ...node, data: { ...node.data, label: label.trim() || "新主题", editing: false } } : node)); editorRef.current?.focus(); };
  const addNode = (parentId?: string) => {
    const parent = nodes.find((node) => node.id === (parentId || selectedNodeId)) || nodes.find((node) => node.data.level === 0) || nodes[0];
    if (!parent) { const id = crypto.randomUUID(); setNodes([{ id, selected: true, position: { x: 0, y: 0 }, data: { label: "新主题", level: 0, editing: true, onRename: (label: string) => finishRename(id, label) }, type: "mindMapNode" }]); setSelectedNodeId(id); return; }
    snapshot();
    const incoming = edges.find((edge) => edge.target === parent.id && edge.data?.kind !== "feedback");
    const ancestor = incoming && nodes.find((node) => node.id === incoming.source);
    const siblings = edges.filter((edge) => edge.source === parent.id && edge.data?.kind !== "feedback").length;
    const direction = ancestor ? (parent.position.y < ancestor.position.y ? -1 : 1) : (siblings % 2 ? 1 : -1);
    const id = crypto.randomUUID();
    setNodes((current) => [...current.map((node) => ({ ...node, selected: false })), { id, selected: true, position: { x: parent.position.x + siblings * 260, y: parent.position.y + direction * 210 }, data: { label: "新主题", level: Number(parent.data.level || 0) + 1, editing: true, onRename: (label: string) => finishRename(id, label) }, type: "mindMapNode" }]);
    setEdges((current) => [...current, { id: crypto.randomUUID(), source: parent.id, target: id, sourceHandle: direction < 0 ? "top-source" : "bottom-source", targetHandle: direction < 0 ? "bottom-target" : "top-target", data: { kind: "main" } }]);
    setSelectedNodeId(id);
  };
  const deleteSelected = () => { snapshot(); const selected = new Set(nodes.filter((node) => node.selected).map((node) => node.id)); setNodes((current) => current.filter((node) => !selected.has(node.id))); setEdges((current) => current.filter((edge) => !selected.has(edge.source) && !selected.has(edge.target))); };
  const handleNodeDoubleClick = (event: MouseEvent, node: Node) => { event.stopPropagation(); if (onDoubleClick) { onDoubleClick(); return; } snapshot(); setNodes((current) => current.map((item) => item.id === node.id ? { ...item, data: { ...item.data, editing: true, onRename: (label: string) => finishRename(node.id, label) } } : item)); };
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === "Tab" && selectedNodeId) { event.preventDefault(); addNode(); }
    if (event.key === "Enter" && selectedNodeId) { const parent = edges.find((edge) => edge.target === selectedNodeId); if (parent) { event.preventDefault(); addNode(parent.source); } }
    if (event.key === "Delete") deleteSelected();
  };
  const handleNodes = (changes: Parameters<typeof onNodesChange>[0]) => { if (changes.some((change) => change.type === "remove" || change.type === "position")) snapshot(); onNodesChange(changes); };
  const handleEdges = (changes: Parameters<typeof onEdgesChange>[0]) => { if (changes.some((change) => change.type === "remove")) snapshot(); onEdgesChange(changes); };
  return <section className={`task-mind-map ${className}`} aria-label="思维导图" ref={editorRef} tabIndex={0} onKeyDown={handleKeyDown} onContextMenu={(event) => event.preventDefault()} onDoubleClick={onDoubleClick}><div className="task-mind-map-toolbar"><h2>思维导图</h2><span><button onClick={() => addNode()}>{nodes.length ? "+ 子节点" : "创建主题"}</button><button onClick={deleteSelected}>删除选中</button></span></div><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={handleNodes} onEdgesChange={handleEdges} onConnect={connect} onNodeClick={(event, node) => { setSelectedNodeId(node.id); if (!(event.target instanceof HTMLInputElement)) editorRef.current?.focus(); }} onNodeDoubleClick={handleNodeDoubleClick} onPaneContextMenu={(event) => event.preventDefault()} selectionOnDrag selectionMode={SelectionMode.Partial} panOnDrag={[1]} panActivationKeyCode="Space" deleteKeyCode="Delete" minZoom={0.08} fitView fitViewOptions={{ padding: 0.18, maxZoom: 1 }} proOptions={{ hideAttribution: true }}><Background gap={18} size={1} /><Controls showInteractive={false} /></ReactFlow>{!nodes.length && <div className="mind-map-empty">点击“创建主题”开始整理思维导图</div>}</section>;
}
