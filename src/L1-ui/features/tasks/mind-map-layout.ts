import type { TaskMindMap } from "../../../L4-data/task-model";

/** Keep each branch in its root hemisphere: parent input and child output use opposite ends. */
export function layoutMindMap(map: TaskMindMap): TaskMindMap {
  if (!map.nodes.length) return map;
  const main = map.edges.filter((edge) => edge.kind !== "feedback");
  const incoming = new Set(main.map((edge) => edge.target));
  const root = map.nodes.find((node) => node.level === 0) || map.nodes.find((node) => !incoming.has(node.id)) || map.nodes[0];
  const children = new Map<string, string[]>();
  main.forEach((edge) => children.set(edge.source, [...new Set([...(children.get(edge.source) || []), edge.target])]));
  const first = children.get(root.id) || [];
  const split = Math.ceil(first.length / 2);
  const positions = new Map<string, { x: number; y: number }>([[root.id, { x: 0, y: 0 }]]);
  const visited = new Set([root.id]);
  for (const [group, direction] of [[first.slice(0, split), -1], [first.slice(split), 1]] as const) {
    let cursor = 0;
    const place = (id: string, depth: number): number => {
      if (visited.has(id)) return positions.get(id)?.x || 0;
      visited.add(id);
      const branch = (children.get(id) || []).filter((child) => !visited.has(child));
      const xs = branch.map((child) => place(child, depth + 1));
      const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : cursor++ * 200;
      positions.set(id, { x, y: direction * depth * 155 });
      return x;
    };
    group.forEach((id) => { place(id, 1); cursor += 0.3; });
    const ids = [...positions.keys()].filter((id) => id !== root.id && Math.sign(positions.get(id)!.y) === direction);
    const center = ids.length ? (Math.min(...ids.map((id) => positions.get(id)!.x)) + Math.max(...ids.map((id) => positions.get(id)!.x))) / 2 : 0;
    ids.forEach((id) => { positions.get(id)!.x -= center; });
  }
  return { ...map, nodes: map.nodes.map((node) => ({ ...node, ...(positions.get(node.id) || { x: node.x, y: node.y }) })) };
}

export function branchHandles(sourceY: number, targetY: number) {
  return targetY < sourceY
    ? { sourceHandle: "top-source", targetHandle: "bottom-target" }
    : { sourceHandle: "bottom-source", targetHandle: "top-target" };
}
