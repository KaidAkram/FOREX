export type LiveSnapshot = {
  version: string; published_at: string;
  data: Record<string, Record<string, Record<string, number>>>;
  cells: Record<string, Record<string, Record<string, {value: number; status: string; source: string}>>>;
  differentials: Record<string, Record<string, Record<string, {base_value: number|null; quote_value: number|null; difference: number|null; rating: number|null; is_complete: boolean}>>>;
  equity: Record<string, Record<string, any>>;
  scores: Record<string, Record<string, {score: number|null; is_complete: boolean; n_complete: number}>>;
  freshness: Record<string, any>;
};
let current: LiveSnapshot | null = null;
export function getLiveSnapshot() { return current; }
export function setLiveSnapshot(value: LiveSnapshot) {
  if (!value?.version || !value.data || !value.cells || !value.differentials || !value.scores || !value.equity) throw new Error('Invalid live snapshot');
  current = value;
}
