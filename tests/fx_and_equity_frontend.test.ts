import test from 'node:test';
import assert from 'node:assert/strict';
import { fxRows, fxHistory, validateFxSnapshot } from '../fx-macro-bias/frontend/src/lib/fxReservesLive.ts';
import { equitySnapshotToPairMap, validateEquitySnapshot } from '../fx-macro-bias/frontend/src/lib/equityLive.ts';
import {
  getCombinedDifferentialData,
  getCurrentLiveMonthKey,
  getDisplayMonthsForYear,
  getForwardMonths,
  getMacroMatrixData,
  PAIR_EQUITY_DATA,
  SYSTEM_CURRENT_MONTH,
  SYSTEM_CURRENT_YEAR,
} from '../fx-macro-bias/frontend/src/data/macroDataset.ts';

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

test('Note 3: active UTC month becomes LIVE and N+3 forward columns extend the active year matrix', () => {
  const expectedLive = `${SYSTEM_CURRENT_YEAR}-${String(SYSTEM_CURRENT_MONTH).padStart(2, '0')}`;
  assert.equal(getCurrentLiveMonthKey(), expectedLive);
  assert.equal(getCurrentLiveMonthKey(2026, 11), '2026-11');

  // Nov 2026 => next 3 months are Dec 2026, Jan 2027, Feb 2027
  assert.deepEqual(getForwardMonths(3, 2026, 11), ['2026-12', '2027-01', '2027-02']);
  // Year boundary Dec 2026 => Jan, Feb, Mar 2027
  assert.deepEqual(getForwardMonths(3, 2026, 12), ['2027-01', '2027-02', '2027-03']);

  const nov2026Months = getDisplayMonthsForYear(2026, 3, 2026, 11);
  assert.equal(nov2026Months.length, 14);
  assert.equal(nov2026Months[0], '2026-01');
  assert.equal(nov2026Months[10], '2026-11');
  assert.deepEqual(nov2026Months.slice(-3), ['2026-12', '2027-01', '2027-02']);

  // Historical year stays 12 months
  const hist2025 = getDisplayMonthsForYear(2025, 3, 2026, 11);
  assert.equal(hist2025.length, 12);
  assert.equal(hist2025[11], '2025-12');

  const activeMonths = getDisplayMonthsForYear(SYSTEM_CURRENT_YEAR);
  const matrixRows = getMacroMatrixData('GDP', SYSTEM_CURRENT_YEAR);
  assert.equal(matrixRows[0].data.length, activeMonths.length);

  const diffRows = getCombinedDifferentialData('EUR/USD', 'CPI', SYSTEM_CURRENT_YEAR);
  assert.equal(diffRows.length, activeMonths.length);
  assert.deepEqual(diffRows.slice(-3).map((r) => r.month), getForwardMonths(3));

  const fxExtended = fxRows(fxSnapshot, countries, 2026, { 'FX Reserves_USA_2027-01': '1234' }, nov2026Months);
  assert.equal(fxExtended[0].data.length, 14);
  assert.equal(fxExtended[0].data[12].value, '1234');
  assert.equal(fxExtended[0].data[12].status, 'manual');
  assert.equal(fxExtended[0].data[13].status, 'missing');
});
