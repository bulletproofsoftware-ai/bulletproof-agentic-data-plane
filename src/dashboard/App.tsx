import React, { useState, useCallback, useEffect } from 'react';
import { DAGViewer } from './components/DAGViewer.js';
import { NodeDetail } from './components/NodeDetail.js';
import { QualityTrendPanel } from './components/QualityTrendPanel.js';
import { PipelineHealthPanel } from './components/PipelineHealthPanel.js';
import { ClassificationHeatmap } from './components/ClassificationHeatmap.js';
import { SearchBar } from './components/SearchBar.js';
import { useLineageData } from './hooks/useLineageData.js';

// Empty base = same-origin requests routed through nginx /api proxy → data-plane-api:8099
const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ?? '';

/**
 * Main dashboard application (REQ-037).
 * Interactive DAG with quality trends, pipeline health, and classification heatmap.
 */
const TOKEN_STORAGE_KEY = 'agentic-data-plane.jwt';

// Local-dev only: a build-time-baked token bypasses the login screen.
// Empty in production. Compiled into the bundle by Vite when VITE_DEFAULT_TOKEN is set.
const DEFAULT_TOKEN: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEFAULT_TOKEN) ?? '';

export function App() {
  const [pipelineId, setPipelineId] = useState('default');
  const [token, setTokenState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) return stored;
      if (DEFAULT_TOKEN) {
        localStorage.setItem(TOKEN_STORAGE_KEY, DEFAULT_TOKEN);
        return DEFAULT_TOKEN;
      }
      return '';
    } catch {
      return DEFAULT_TOKEN;
    }
  });
  const setToken = useCallback((value: string) => {
    setTokenState(value);
    try {
      if (value) localStorage.setItem(TOKEN_STORAGE_KEY, value);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, []);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data, loading, error, refresh } = useLineageData(pipelineId, token);

  useEffect(() => {
    if (data) setLastUpdated(new Date());
  }, [data]);

  const handleSearch = useCallback((query: string) => {
    setPipelineId(query);
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
  }, []);

  // If no token, show login
  if (!token) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 16,
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Agentic Data Plane</h1>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Enter JWT token to access the dashboard</p>
        <input
          type="text"
          placeholder="Bearer token..."
          onChange={e => setToken(e.target.value)}
          style={{
            width: 400,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 6,
            padding: '10px 14px',
            color: '#e2e8f0',
            fontSize: 14,
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 16, gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>Data Plane DAG Dashboard</h1>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>
            Last updated: {lastUpdated ? lastUpdated.toLocaleString() : '—'}
          </span>
        </div>
        <div style={{ width: 400 }}>
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, gap: 16, minHeight: 0 }}>
        {/* DAG Viewer */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(15,23,42,0.8)', zIndex: 10, borderRadius: 8,
            }}>
              Loading lineage data...
            </div>
          )}
          {error && (
            <div style={{
              background: '#1e293b', borderRadius: 8, padding: 24,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 8,
            }}>
              <span style={{ color: '#EF4444' }}>Error: {error}</span>
              <button onClick={refresh} style={{
                background: '#3B82F6', border: 'none', borderRadius: 6,
                padding: '6px 12px', color: '#fff', cursor: 'pointer',
              }}>
                Retry
              </button>
            </div>
          )}
          {data && !loading && (
            <>
              <DAGViewer
                nodes={data.nodes}
                edges={data.edges}
                onNodeClick={handleNodeClick}
              />
              <NodeDetail
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
              />
            </>
          )}
        </div>

        {/* Side panels */}
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <QualityTrendPanel
            datasetId={pipelineId}
            token={token}
            apiUrl={API_URL}
          />
          <PipelineHealthPanel
            pipelineId={pipelineId}
            token={token}
            apiUrl={API_URL}
          />
          <ClassificationHeatmap
            data={[]}
          />
        </div>
      </div>
    </div>
  );
}
