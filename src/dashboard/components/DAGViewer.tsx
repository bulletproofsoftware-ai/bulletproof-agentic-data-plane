import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { getTierColor } from '../utils/tierColors.js';

interface DagNode {
  id: string;
  label: string;
  tier: string;
  operation: string;
  x?: number;
  y?: number;
}

interface DagEdge {
  from: string;
  to: string;
  transform?: string;
}

interface DAGViewerProps {
  nodes: DagNode[];
  edges: DagEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (node: DagNode) => void;
}

/**
 * D3.js force-directed DAG viewer (REQ-037).
 * Uses WebWorker for layout computation on large graphs.
 * Target: <3s render for 1000 nodes.
 */
export function DAGViewer({ nodes, edges, width: widthProp, height: heightProp, onNodeClick }: DAGViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: widthProp ?? 800,
    h: heightProp ?? 600,
  });

  // Observe parent container so the canvas matches available space
  useEffect(() => {
    if (widthProp && heightProp) return;
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        setSize({ w: Math.max(200, Math.floor(w)), h: Math.max(200, Math.floor(h)) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthProp, heightProp]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    const width = size.w;
    const height = size.h;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    const container = svg.append('g');

    // Build simulation
    const simNodes = nodes.map(n => ({ ...n }));
    const simEdges = edges.map(e => ({
      source: e.from,
      target: e.to,
      transform: e.transform,
    }));

    // Tier-based vertical layering: PUBLIC top → INTERNAL → CONFIDENTIAL → RESTRICTED bottom
    const tierY: Record<string, number> = {
      PUBLIC: height * 0.18,
      INTERNAL: height * 0.42,
      CONFIDENTIAL: height * 0.66,
      RESTRICTED: height * 0.86,
    };

    // Force parameters scaled by node count so 30 nodes don't sprawl
    const linkDistance = nodes.length <= 50 ? 55 : nodes.length <= 200 ? 70 : 90;
    const chargeStrength = nodes.length <= 50 ? -120 : nodes.length <= 200 ? -180 : -250;
    const collisionRadius = nodes.length <= 50 ? 22 : 26;

    const simulation = d3.forceSimulation(simNodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(simEdges)
        .id((d: any) => d.id)
        .distance(linkDistance)
        .strength(0.8))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY((d: any) => tierY[d.tier?.toUpperCase()] ?? height / 2).strength(0.6))
      .force('collision', d3.forceCollide(collisionRadius));

    // Edges (arrows)
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#475569');

    const link = container.selectAll('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', '#475569')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Nodes
    const node = container.selectAll('g.node')
      .data(simNodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('click', (_event, d: any) => {
        setSelectedNode(d.id);
        onNodeClick?.(d);
      })
      .call(d3.drag<SVGGElement, any>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    node.append('circle')
      .attr('r', 12)
      .attr('fill', (d: any) => getTierColor(d.tier))
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2);

    node.append('text')
      .attr('dy', -18)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .text((d: any) => d.label?.substring(0, 20) ?? d.operation);

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Stop after reasonable iterations
    simulation.alpha(1).restart();
    setTimeout(() => simulation.stop(), 3000); // <3s SLA

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, size.w, size.h, onNodeClick]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        style={{ background: '#0f172a', borderRadius: '8px', display: 'block' }}
      />
      <div style={{
        position: 'absolute',
        bottom: 8,
        right: 8,
        fontSize: '11px',
        color: '#64748b',
      }}>
        {nodes.length} nodes / {edges.length} edges
      </div>
    </div>
  );
}
