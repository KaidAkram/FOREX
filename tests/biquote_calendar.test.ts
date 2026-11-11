import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAJOR_COUNTRY_CODES,
  filterUpcomingEvents,
  formatCalendarStat,
  formatRelativeCountdown,
  getActualVsForecastTone,
  mergeAndSortCalendarEvents,
  normalizeCountryCode,
  parseCountryCodesParam,
  parseImportanceLevelsParam,
  sanitizeSourceUrl,
  type BiquoteCalendarEvent,
} from '../fx-macro-bias/frontend/src/lib/biquoteCalendar.ts';

test('default major calendar countries cover all 11 requested markets including SE and NO', () => {
  assert.deepEqual(DEFAULT_MAJOR_COUNTRY_CODES, [
    'US', 'EU', 'GB', 'JP', 'CA', 'AU', 'CH', 'NZ', 'SE', 'NO', 'CN',
  ]);
  assert.equal(normalizeCountryCode('SWEDEN'), 'SE');
  assert.equal(normalizeCountryCode('NORWAY'), 'NO');
  assert.equal(normalizeCountryCode('UK'), 'GB');
  assert.deepEqual(
    parseCountryCodesParam('US,EU,GB,JP,CA,AU,CH,NZ,SWEDEN,NORWAY,CN'),
    ['US', 'EU', 'GB', 'JP', 'CA', 'AU', 'CH', 'NZ', 'SE', 'NO', 'CN']
  );
  assert.deepEqual(parseCountryCodesParam('ALL'), []);
  assert.deepEqual(parseCountryCodesParam(null, true), DEFAULT_MAJOR_COUNTRY_CODES);
});

test('importance parser handles single, comma-separated, and all levels cleanly', () => {
  assert.deepEqual(parseImportanceLevelsParam(null), ['high', 'medium', 'low']);
  assert.deepEqual(parseImportanceLevelsParam('high'), ['high']);
  assert.deepEqual(parseImportanceLevelsParam('medium,high,invalid'), ['high', 'medium']);
  assert.deepEqual(parseImportanceLevelsParam('low'), ['low']);
});

test('mergeAndSortCalendarEvents deduplicates, restricts countries, and sorts chronologically', () => {
  const high: BiquoteCalendarEvent[] = [
    {
      id: 'e2',
      time: '2026-11-12T07:00:00Z',
      countryCode: 'GB',
      currency: 'GBP',
      name: 'GDP m/m',
      importance: 'high',
      actual: null,
      forecast: 0.2,
      previous: 0.1,
    },
    {
      id: 'e4',
      time: '2026-11-12T13:30:00Z',
      countryCode: 'BR',
      currency: 'BRL',
      name: 'Non-Major Event',
      importance: 'high',
      actual: null,
      forecast: null,
      previous: null,
    },
  ];
  const medium: BiquoteCalendarEvent[] = [
    {
      id: 'e1',
      time: '2026-11-11T21:45:00Z',
      countryCode: 'NZ',
      currency: 'NZD',
      name: 'Card Retail Sales m/m',
      importance: 'medium',
      actual: null,
      forecast: 0.4,
      previous: -0.1,
    },
    // Duplicate id e2 should be kept once
    high[0],
  ];

  const merged = mergeAndSortCalendarEvents([high, medium], DEFAULT_MAJOR_COUNTRY_CODES);
  assert.deepEqual(merged.map((e) => e.id), ['e1', 'e2']);
});

test('filterUpcomingEvents keeps only events at or after now sorted soonest-first', () => {
  const nowMs = Date.parse('2026-11-11T14:00:00Z');
  const events: BiquoteCalendarEvent[] = [
    {
      id: 'past',
      time: '2026-11-11T13:30:00Z',
      countryCode: 'US',
      currency: 'USD',
      name: 'Past Release',
      importance: 'high',
      actual: 0.4,
      forecast: 0.5,
      previous: 0.6,
    },
    {
      id: 'later',
      time: '2026-11-12T07:00:00Z',
      countryCode: 'GB',
      currency: 'GBP',
      name: 'UK GDP',
      importance: 'high',
      actual: null,
      forecast: 0.2,
      previous: 0.1,
    },
    {
      id: 'soonest',
      time: '2026-11-11T14:25:00Z',
      countryCode: 'CA',
      currency: 'CAD',
      name: 'BoC Speech',
      importance: 'medium',
      actual: null,
      forecast: null,
      previous: null,
    },
  ];

  const upcoming = filterUpcomingEvents(events, nowMs, 5);
  assert.deepEqual(upcoming.map((e) => e.id), ['soonest', 'later']);
  assert.deepEqual(formatRelativeCountdown('2026-11-11T14:25:00Z', nowMs, 'fr'), {
    label: 'Dans 25 min',
    isImminent: true,
  });
});

test('stat formatting, beat/miss tones, and source URL sanitization behave cleanly', () => {
  assert.equal(formatCalendarStat(0.4, 'percent', 'none', 1), '0.4%');
  assert.equal(formatCalendarStat(5.941, 'usd', 'billions', 3), '$5.941B');
  assert.equal(formatCalendarStat(null, 'percent', 'none', 1), '—');
  assert.equal(getActualVsForecastTone(0.5, 0.4), 'beat');
  assert.equal(getActualVsForecastTone(0.3, 0.4), 'miss');
  assert.equal(getActualVsForecastTone(null, 0.4), 'none');
  assert.equal(sanitizeSourceUrl('https://www.bls.gov'), 'https://www.bls.gov/');
  assert.equal(sanitizeSourceUrl('javascript:alert(1)'), null);
});

