import { useState, useEffect, useCallback } from 'react';

interface DagNode {
  id: string;
  label: string;
  tier: string;
  operation: string;
  agent_id?: string;
  timestamp: string;
}

interface DagEdge {
  from: string;
  to: string;
  transform?: string;
}

interface DagData {
  nodes: DagNode[];
  edges: DagEdge[];
  totalNodes: number;
  totalEdges: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function useLineageData(pipelineId: string, token: string) {
  const [data, setData] = useState<DagData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDag = useCallback(async () => {
    if (!pipelineId || !token) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/lineage/dag/${encodeURIComponent(pipelineId)}?maxNodes=1000`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      setData({
        nodes: json.nodes ?? [],
        edges: json.edges ?? [],
        totalNodes: json.total_nodes ?? 0,
        totalEdges: json.total_edges ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lineage data');
    } finally {
      setLoading(false);
    }
  }, [pipelineId, token]);

  useEffect(() => {
    fetchDag();
  }, [fetchDag]);

  return { data, loading, error, refresh: fetchDag };
}
