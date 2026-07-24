import React from 'react';
import { getTierColor, TIER_LABELS } from '../utils/tierColors.js';

interface TierBadgeProps {
  tier: string;
  size?: 'sm' | 'md';
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const color = getTierColor(tier);
  const label = TIER_LABELS[tier?.toUpperCase()] ?? tier;
  const fontSize = size === 'sm' ? '10px' : '12px';
  const padding = size === 'sm' ? '2px 6px' : '3px 8px';

  return (
    <span style={{
      display: 'inline-block',
      backgroundColor: color,
      color: '#fff',
      borderRadius: '4px',
      fontSize,
      fontWeight: 600,
      padding,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {label}
    </span>
  );
}
