import { addEdge, Background, Controls, ReactFlow, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect } from "react";
import type { TaskMindMap } from "../../../L4-data/task-model";

const toNodes = (map: TaskMindMap): Node[] => map.nodes.map((node) => ({ id: node.id, position: { x: node.x, y: node.y }, data: { label: node.label }, type: "default" }));
const toEdges = (map: TaskMindMap): Edge[] => map.edges.map((edge) => ({ ...edge, animated: false }));

export function TaskMindMap({ value, onChange }: { value: TaskMindMap; onChange: (value: TaskMindMap) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toNodes(value));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toEdges(value));
  useEffect(() => onChange({ nodes: nodes.map((node) => ({ id: node.id, label: String(node.data.label || "节点"), x: node.position.x, y: node.position.y })), edges: edges.map(({ id, source, target }) => ({ id, source, target })) }), [nodes, edges]);
  const connect = (connection: Connection) => setEdges((current) => addEdge({ ...connection, id: crypto.randomUUID() }, current));
  const addNode = () => setNodes((current) => [...current, { id: crypto.randomUUID(), position: { x: 120 + current.length * 28, y: 90 + current.length * 38 }, data: { label: "新知识点" } }]);
  const deleteSelected = () => { const selected = new Set(nodes.filter((node) => node.selected).map((node) => node.id)); setNodes((current) => current.filter((node) => !selected.has(node.id))); setEdges((current) => current.filter((edge) => !selected.has(edge.source) && !selected.has(edge.target))); };
  const rename = (_: unknown, node: Node) => { const label = window.prompt("编辑知识点", String(node.data.label || "")); if (label?.trim()) setNodes((current) => current.map((item) => item.id === node.id ? { ...item, data: { ...item.data, label: label.trim() } } : item)); };
  return <section className="task-mind-map" aria-label="思维导图"><div className="task-mind-map-toolbar"><strong>思维导图</strong><span><button onClick={addNode}>+ 节点</button><button onClick={deleteSelected}>删除选中</button></span></div><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect} onNodeDoubleClick={rename} fitView><Background gap={18} size={1} /><Controls showInteractive={false} /></ReactFlow></section>;
}
