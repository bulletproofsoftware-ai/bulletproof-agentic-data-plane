import React, { useState, useEffect } from 'react';

interface TrendPoint {
  date: string;
  avgScore: number;
  minScore: number;
  maxScore: number;
}

interface QualityTrendPanelProps {
  datasetId: string;
  token: string;
  apiUrl?: string;
}

export function QualityTrendPanel({ datasetId, token, apiUrl = '' }: QualityTrendPanelProps) {
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [rolling7d, setRolling7d] = useState(0);
  const [rolling30d, setRolling30d] = useState(0);
  const [direction, setDirection] = useState('STABLE');

  useEffect(() => {
    if (!datasetId || !token) return;

    fetch(`${apiUrl}/api/v1/quality/datasets/${encodeURIComponent(datasetId)}/trend`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setTrend(data.trend ?? []);
        setRolling7d(data.rolling_7d_avg ?? 0);
        setRolling30d(data.rolling_30d_avg ?? 0);
        setDirection(data.trend_direction ?? 'STABLE');
      })
      .catch(() => {});
  }, [datasetId, token, apiUrl]);

  const maxScore = 1000;
  const chartWidth = 280;
  const chartHeight = 60;

  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#94a3b8' }}>
        Quality Trend — {datasetId}
      </div>

      {/* Sparkline */}
      <svg width={chartWidth} height={chartHeight} style={{ display: 'block' }}>
        {trend.length > 1 && (
          <polyline
            fill="none"
            stroke={direction === 'DECLINING' ? '#EF4444' : direction === 'IMPROVING' ? '#22C55E' : '#3B82F6'}
            strokeWidth={2}
            points={trend.map((p, i) => {
              const x = (i / (trend.length - 1)) * chartWidth;
              const y = chartHeight - (p.avgScore / maxScore) * chartHeight;
              return `${x},${y}`;
            }).join(' ')}
          />
        )}
        {/* 700 threshold line */}
        <line
          x1={0}
          y1={chartHeight - (700 / maxScore) * chartHeight}
          x2={chartWidth}
          y2={chartHeight - (700 / maxScore) * chartHeight}
          stroke="#EF4444"
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.5}
        />
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginTop: 4 }}>
        <span>7d avg: {Math.round(rolling7d)}</span>
        <span>30d avg: {Math.round(rolling30d)}</span>
        <span style={{
          color: direction === 'DECLINING' ? '#EF4444' :
                 direction === 'IMPROVING' ? '#22C55E' : '#94a3b8'
        }}>
          {direction === 'DECLINING' ? '\u2193' : direction === 'IMPROVING' ? '\u2191' : '\u2192'} {direction}
        </span>
      </div>
    </div>
  );
}
