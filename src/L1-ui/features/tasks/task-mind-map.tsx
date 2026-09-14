import { addEdge, Background, Controls, Handle, Position, ReactFlow, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, type MouseEvent } from "react";
import type { TaskMindMap } from "../../../L4-data/task-model";

const toNodes = (map: TaskMindMap): Node[] => map.nodes.map((node) => ({ id: node.id, position: { x: node.x, y: node.y }, data: { label: node.label }, type: "mindMapNode" }));
const toEdges = (map: TaskMindMap): Edge[] => map.edges.map((edge) => ({ ...edge, animated: false }));

function MindMapNode({ data }: { data: { label?: string; editing?: boolean; onRename?: (label: string) => void } }) {
  return <><Handle type="target" position={Position.Top} id="top-target" /><Handle type="source" position={Position.Top} id="top-source" /><Handle type="target" position={Position.Right} id="right-target" /><Handle type="source" position={Position.Right} id="right-source" /><Handle type="target" position={Position.Bottom} id="bottom-target" /><Handle type="source" position={Position.Bottom} id="bottom-source" /><Handle type="target" position={Position.Left} id="left-target" /><Handle type="source" position={Position.Left} id="left-source" />{data.editing ? <input className="mind-map-node-input" autoFocus defaultValue={data.label} onBlur={(event) => data.onRename?.(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /> : <span>{data.label}</span>}</>;
}

const nodeTypes = { mindMapNode: MindMapNode };

export function TaskMindMap({ value, onChange, className = "", onDoubleClick }: { value: TaskMindMap; onChange: (value: TaskMindMap) => void; className?: string; onDoubleClick?: () => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toNodes(value));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toEdges(value));
  useEffect(() => onChange({ nodes: nodes.map((node) => ({ id: node.id, label: String(node.data.label || "节点"), x: node.position.x, y: node.position.y })), edges: edges.map(({ id, source, target }) => ({ id, source, target })) }), [nodes, edges]);
  const connect = (connection: Connection) => setEdges((current) => addEdge({ ...connection, id: crypto.randomUUID() }, current));
  const addNode = () => setNodes((current) => [...current, { id: crypto.randomUUID(), position: { x: 120 + current.length * 28, y: 90 + current.length * 38 }, data: { label: "新知识点" }, type: "mindMapNode" }]);
  const deleteSelected = () => { const selected = new Set(nodes.filter((node) => node.selected).map((node) => node.id)); setNodes((current) => current.filter((node) => !selected.has(node.id))); setEdges((current) => current.filter((edge) => !selected.has(edge.source) && !selected.has(edge.target))); };
  const handleNodeDoubleClick = (event: MouseEvent, node: Node) => { event.stopPropagation(); if (onDoubleClick) { onDoubleClick(); return; } const label = window.prompt("编辑知识点", String(node.data.label || "")); if (label?.trim()) setNodes((current) => current.map((item) => item.id === node.id ? { ...item, data: { ...item.data, label: label.trim() } } : item)); };
  const handleKeyDown = (event: React.KeyboardEvent) => { if (event.key === "Delete") deleteSelected(); };
  return <section className={`task-mind-map ${className}`} aria-label="思维导图" onDoubleClick={onDoubleClick}><div className="task-mind-map-toolbar"><h2>思维导图</h2><span><button onClick={addNode}>+ 节点</button><button onClick={deleteSelected}>删除选中</button></span></div><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect} onNodeDoubleClick={handleNodeDoubleClick} onKeyDown={handleKeyDown} deleteKeyCode="Delete" proOptions={{ hideAttribution: true }} fitView><Background gap={18} size={1} /><Controls showInteractive={false} /></ReactFlow></section>;
}
