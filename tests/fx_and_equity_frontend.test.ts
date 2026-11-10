import test from 'node:test';
import assert from 'node:assert/strict';
import { fxRows, fxHistory, validateFxSnapshot } from '../fx-macro-bias/frontend/src/lib/fxReservesLive.ts';
import { equitySnapshotToPairMap, validateEquitySnapshot } from '../fx-macro-bias/frontend/src/lib/equityLive.ts';
import { getCombinedDifferentialData, getMacroMatrixData, PAIR_EQUITY_DATA } from '../fx-macro-bias/frontend/src/data/macroDataset.ts';

const countries = [
  { country: 'USA', base: 'us' },
  { country: 'Switzerland', base: 'ch' },
  { country: 'Canada', base: 'ca' },
  { country: 'United Kingdom', base: 'gb' },
  { country: 'Sweden', base: 'se' },
];

const fxSnapshot = {
  rows: [
    { country: 'United States', iso: 'USD', cells: { '2026-10': { value: 100, status: 'published' }, '2026-11': null } },
    { country: 'Switzerland', iso: 'CHF', cells: { '2026-10': { value: 200, status: 'revised' } } },
  ],
};

test('October FX publications survive old US/Swiss cutoffs and beat local assumptions', () => {
  const rows = fxRows(fxSnapshot, countries, 2026, { 'FX Reserves_USA_2026-10': '999' });
  assert.equal(rows[0].data[9].value, 100);
  assert.equal(rows[0].data[9].status, 'published');
  assert.equal(rows[1].data[9].value, 200);
  assert.equal(rows[1].data[9].status, 'published');
});

test('bundled FX Reserves matrix shows real live October 2026 publications without hardcoded cutoffs', () => {
  const rows = getMacroMatrixData('FX Reserves', 2026);
  const canada = rows.find((r) => r.country === 'Canada')!;
  const uk = rows.find((r) => r.country === 'United Kingdom')!;
  const sweden = rows.find((r) => r.country === 'Sweden')!;
  const ch = rows.find((r) => r.country === 'Switzerland')!;
  assert.equal(canada.data[9].status, 'published');
  assert.equal(uk.data[9].status, 'published');
  assert.equal(sweden.data[9].status, 'published');
  assert.equal(ch.data[8].status, 'published');
  assert.equal(ch.data[9].status, 'missing');
});

test('missing FX values stay missing; manual assumptions remain explicitly manual', () => {
  const rows = fxRows(fxSnapshot, countries, 2026, { 'FX Reserves_USA_2026-11': '123' });
  assert.equal(rows[0].data[10].status, 'manual');
  assert.equal(rows[0].data[10].value, '123');
  assert.equal(rows[1].data[10].value, null);
});

test('live FX history retains years needed by rolling calculation and rejects malformed snapshots', () => {
  const history = fxHistory(fxSnapshot, countries);
  assert.equal(history.USA['2026-10'], 100);
  assert.equal(history.Switzerland['2026-10'], 200);
  for (const bad of [null, {}, { rows: [] }, { rows: [{ country: 'USA' }] }]) {
    assert.throws(() => validateFxSnapshot(bad));
  }
});

test('FX differential uses live history and prevents fabricated differential when a country lacks deltas', () => {
  const base: Record<string, number> = {};
  const quote: Record<string, number> = {};
  for (let i = 0; i < 13; i++) {
    const d = new Date(Date.UTC(2025, 9 + i, 1));
    const m = d.toISOString().slice(0, 7);
    base[m] = 1000 + i * 30;
    quote[m] = 2000 + i * 10;
  }
  const ok = getCombinedDifferentialData('AUD/USD', 'FX Reserves', 2026, { Australia: base, USA: quote }).find(
    (row) => row.month === '2026-10'
  )!;
  assert.equal(ok.diffNum, 20);
  assert.equal(ok.isForecast, false);
  assert.equal(Boolean(ok.isMissing), false);

  const missing = getCombinedDifferentialData('AUD/USD', 'FX Reserves', 2026, { Australia: { '2026-10': 100 }, USA: {} }).find(
    (row) => row.month === '2026-10'
  )!;
  assert.equal(missing.isMissing, true);
  assert.equal(missing.diff, '—');
});

test('Equity uses synthetic-minus-index sign, covers all 28 canonical pairs, and never copies Dec or fakes 0% Neutral', () => {
  const canonical28 = [
    'EUR/USD', 'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/CAD', 'EUR/AUD', 'EUR/NZD',
    'GBP/USD', 'GBP/JPY', 'GBP/CHF', 'GBP/CAD', 'GBP/AUD', 'GBP/NZD',
    'USD/JPY', 'USD/CHF', 'USD/CAD', 'USD/AUD', 'USD/NZD',
    'CHF/JPY', 'CAD/JPY', 'AUD/JPY', 'NZD/JPY',
    'CAD/CHF', 'AUD/CHF', 'NZD/CHF', 'AUD/CAD', 'NZD/CAD', 'AUD/NZD',
  ];
  for (const sym of canonical28) {
    assert.ok(PAIR_EQUITY_DATA[sym]?.['2026-10'], `Missing 2026-10 Equity for ${sym}`);
    assert.ok(PAIR_EQUITY_DATA[sym]?.['2026-11'], `Missing 2026-11 Equity for ${sym}`);
    assert.equal(PAIR_EQUITY_DATA[sym]?.['2026-12'], undefined, `Unexpected copied 2026-12 Equity for ${sym}`);
    const pt = PAIR_EQUITY_DATA[sym]['2026-10'];
    assert.ok(Math.abs(pt.final_change - (pt.change_synth - pt.change_index)) < 1e-12);
  }
  const dec = getCombinedDifferentialData('USD/CAD', 'Equity', 2026).find((r) => r.month === '2026-12')!;
  assert.equal(dec.isMissing, true);
  assert.equal(dec.diff, '—');

  const eqMap = equitySnapshotToPairMap(
    validateEquitySnapshot({
      mode: 'pair',
      pair_rows: [
        {
          pair: 'EUR/USD',
          cells: { '2026-10': { change_index: -0.1, change_synth: -0.175, final_change: -0.075, rating: -7 } },
        },
      ],
    })
  );
  const liveOct = getCombinedDifferentialData('EUR/USD', 'Equity', 2026, undefined, eqMap).find(
    (r) => r.month === '2026-10'
  )!;
  assert.equal(liveOct.diffNum, -7.5);
  assert.equal(liveOct.rating, -7);
});
