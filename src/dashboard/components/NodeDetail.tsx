import React from 'react';
import { TierBadge } from './TierBadge.js';

interface NodeDetailProps {
  node: {
    id: string;
    label: string;
    tier: string;
    operation: string;
    agent_id?: string;
    timestamp?: string;
  } | null;
  onClose: () => void;
}

export function NodeDetail({ node, onClose }: NodeDetailProps) {
  if (!node) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 8,
      right: 8,
      width: 320,
      background: '#1e293b',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{node.label}</h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#94a3b8',
          cursor: 'pointer', fontSize: '16px',
        }}>x</button>
      </div>
      <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
        <div><strong>ID:</strong> <code style={{ color: '#94a3b8' }}>{node.id.substring(0, 8)}...</code></div>
        <div><strong>Operation:</strong> {node.operation}</div>
        <div><strong>Tier:</strong> <TierBadge tier={node.tier} size="sm" /></div>
        {node.agent_id && <div><strong>Agent:</strong> {node.agent_id}</div>}
        {node.timestamp && <div><strong>Timestamp:</strong> {new Date(node.timestamp).toLocaleString()}</div>}
      </div>
    </div>
  );
}
