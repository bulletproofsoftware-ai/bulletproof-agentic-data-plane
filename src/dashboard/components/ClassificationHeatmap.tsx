import React from 'react';
import { TIER_COLORS } from '../utils/tierColors.js';

interface ClassificationHeatmapProps {
  data: {
    pipeline_id: string;
    public: number;
    internal: number;
    confidential: number;
    restricted: number;
  }[];
}

export function ClassificationHeatmap({ data }: ClassificationHeatmapProps) {
  if (data.length === 0) {
    return (
      <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, fontSize: 12, color: '#64748b' }}>
        No classification data available
      </div>
    );
  }

  const tiers = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as const;

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#94a3b8' }}>
        Classification Distribution
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: '#64748b' }}>Pipeline</th>
              {tiers.map(t => (
                <th key={t} style={{ textAlign: 'center', padding: '4px 8px', color: TIER_COLORS[t] }}>
                  {t.substring(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const total = row.public + row.internal + row.confidential + row.restricted;
              return (
                <tr key={row.pipeline_id}>
                  <td style={{ padding: '4px 8px', color: '#e2e8f0' }}>
                    {row.pipeline_id.substring(0, 20)}
                  </td>
                  {[row.public, row.internal, row.confidential, row.restricted].map((count, i) => (
                    <td key={i} style={{
                      textAlign: 'center',
                      padding: '4px 8px',
                      backgroundColor: count > 0
                        ? `${TIER_COLORS[tiers[i]]}${Math.min(255, Math.round((count / Math.max(total, 1)) * 200) + 55).toString(16)}`
                        : 'transparent',
                      borderRadius: 2,
                    }}>
                      {count || '-'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
