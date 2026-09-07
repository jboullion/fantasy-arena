import type { RunSummary } from '../../../packages/game-core/src/run';
export const archiveKey = 'fantasy-arena.run-reports.v1';
export type SavedReport = { key: string; savedAt: string; playerId: number; run: RunSummary };
export function readReports(): SavedReport[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(archiveKey) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(r => r && typeof r.key === 'string' && typeof r.savedAt === 'string' && typeof r.playerId === 'number' && r.run && typeof r.run.id === 'string' && Number.isFinite(r.run.roundsCompleted) && Array.isArray(r.run.players) && r.run.players.every((p: { stats?: { totalDamage?: number } }) => p.stats && Number.isFinite(p.stats.totalDamage))).slice(0, 20);
  } catch { return []; }
}
export function saveReport(run: RunSummary, playerId: number) {
  try {
    const key = `${run.id}:${playerId}`;
    const report: SavedReport = { key, savedAt: new Date().toISOString(), playerId, run };
    localStorage.setItem(archiveKey, JSON.stringify([report, ...readReports().filter(r => r.key !== key)].slice(0, 20)));
    return true;
  } catch { return false; }
}
export function exportReport(run: RunSummary) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `fantasy-arena-${run.id}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
