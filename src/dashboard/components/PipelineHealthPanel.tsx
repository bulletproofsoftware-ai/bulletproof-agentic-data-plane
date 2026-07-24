import React, { useState, useEffect } from 'react';

interface PipelineHealthPanelProps {
  pipelineId: string;
  token: string;
  apiUrl?: string;
}

const STATUS_COLORS: Record<string, string> = {
  HEALTHY: '#22C55E',
  DEGRADED: '#F97316',
  UNHEALTHY: '#EF4444',
};

export function PipelineHealthPanel({ pipelineId, token, apiUrl = '' }: PipelineHealthPanelProps) {
  const [health, setHealth] = useState<{
    status: string;
    anomalies: Array<{ anomaly_type: string; severity: string; detected_at: string }>;
  } | null>(null);

  useEffect(() => {
    if (!pipelineId || !token) return;

    fetch(`${apiUrl}/api/v1/pipelines/${encodeURIComponent(pipelineId)}/health`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setHealth(data))
      .catch(() => {});
  }, [pipelineId, token, apiUrl]);

  if (!health) {
    return <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, fontSize: 12, color: '#64748b' }}>Loading...</div>;
  }

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Pipeline Health</span>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: STATUS_COLORS[health.status] ?? '#94a3b8',
          textTransform: 'uppercase',
        }}>
          {health.status}
        </span>
      </div>

      {health.anomalies.length === 0 ? (
        <div style={{ fontSize: 11, color: '#64748b' }}>No anomalies in last 24h</div>
      ) : (
        <div style={{ maxHeight: 120, overflowY: 'auto' }}>
          {health.anomalies.map((a, i) => (
            <div key={i} style={{
              fontSize: 11,
              padding: '4px 0',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span style={{ color: a.severity === 'CRITICAL' ? '#EF4444' : '#F97316' }}>
                {a.anomaly_type}
              </span>
              <span style={{ color: '#64748b' }}>
                {new Date(a.detected_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
