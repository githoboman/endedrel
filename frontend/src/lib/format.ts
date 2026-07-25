/**
 * Format a cost value as "<n> USDC" regardless of what the backend sent.
 * The backend is inconsistent — some events send a number (0.003), others a
 * pre-formatted string ("0.003 USDC"). Strip any existing unit, then append
 * exactly one, so the UI never shows "0.003 USDC USDC".
 */
export function fmtCost(cost: number | string | null | undefined, unit = 'USDC'): string {
  if (cost === null || cost === undefined || cost === '') return `0 ${unit}`;
  const raw = String(cost).trim().replace(/\s*(usdc|stx|sbtc|sats|btc)\s*$/i, '').trim();
  const n = Number(raw);
  const shown = Number.isFinite(n) ? n : raw;
  return `${shown} ${unit}`;
}
