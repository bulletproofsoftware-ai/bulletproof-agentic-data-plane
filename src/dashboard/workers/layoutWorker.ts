// WebWorker for D3 force layout computation (REQ-037)
// Offloads expensive force simulation to avoid blocking the main thread

interface LayoutNode {
  id: string;
  label: string;
  tier: string;
  operation: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface LayoutEdge {
  source: string;
  target: string;
  transform?: string;
}

interface LayoutMessage {
  type: 'compute';
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

interface LayoutResult {
  type: 'result';
  positions: Array<{ id: string; x: number; y: number }>;
  computeTimeMs: number;
}

// Simple force-directed layout (no D3 dependency in worker for bundle size)
function computeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  width: number,
  height: number,
  iterations: number = 300
): Array<{ id: string; x: number; y: number }> {
  // Initialize positions randomly
  const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();
  for (const node of nodes) {
    positions.set(node.id, {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
    });
  }

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const nodeCount = nodes.length;

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const repulsionStrength = 500 * alpha;
    const attractionStrength = 0.01 * alpha;
    const centerStrength = 0.005 * alpha;

    // Repulsion between all pairs (Barnes-Hut would be better for large graphs)
    const nodeList = Array.from(positions.entries());
    for (let i = 0; i < nodeList.length; i++) {
      const [idA, posA] = nodeList[i];
      for (let j = i + 1; j < nodeList.length; j++) {
        const [idB, posB] = nodeList[j];
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsionStrength / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        posA.vx += fx;
        posA.vy += fy;
        posB.vx -= fx;
        posB.vy -= fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const posA = positions.get(edge.source);
      const posB = positions.get(edge.target);
      if (!posA || !posB) continue;
      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attractionStrength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      posA.vx += fx;
      posA.vy += fy;
      posB.vx -= fx;
      posB.vy -= fy;
    }

    // Center gravity
    for (const [, pos] of positions) {
      pos.vx += (centerX - pos.x) * centerStrength;
      pos.vy += (centerY - pos.y) * centerStrength;
    }

    // Apply velocities with damping
    const damping = 0.9;
    for (const [, pos] of positions) {
      pos.vx *= damping;
      pos.vy *= damping;
      pos.x += pos.vx;
      pos.y += pos.vy;
      // Bounds clamping
      pos.x = Math.max(50, Math.min(width - 50, pos.x));
      pos.y = Math.max(50, Math.min(height - 50, pos.y));
    }
  }

  return Array.from(positions.entries()).map(([id, pos]) => ({
    id,
    x: Math.round(pos.x),
    y: Math.round(pos.y),
  }));
}

// Worker message handler
self.onmessage = (event: MessageEvent<LayoutMessage>) => {
  const { nodes, edges, width, height } = event.data;
  const start = performance.now();
  const positions = computeLayout(nodes, edges, width, height);
  const computeTimeMs = Math.round(performance.now() - start);

  const result: LayoutResult = {
    type: 'result',
    positions,
    computeTimeMs,
  };

  self.postMessage(result);
};
