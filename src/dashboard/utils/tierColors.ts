// Tier color mapping per spec
export const TIER_COLORS: Record<string, string> = {
  PUBLIC: '#9CA3AF',      // Gray
  INTERNAL: '#3B82F6',    // Blue
  CONFIDENTIAL: '#F97316', // Orange
  RESTRICTED: '#EF4444',   // Red
};

export const TIER_LABELS: Record<string, string> = {
  PUBLIC: 'Public',
  INTERNAL: 'Internal',
  CONFIDENTIAL: 'Confidential',
  RESTRICTED: 'Restricted',
};

export function getTierColor(tier: string): string {
  return TIER_COLORS[tier?.toUpperCase()] ?? TIER_COLORS.PUBLIC;
}
