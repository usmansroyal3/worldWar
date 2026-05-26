// Annual defense expenditure in millions USD (approximate SIPRI 2023-24 figures).
// Used to seed:
//   - starting treasury at game start: base + budget / 150
//   - daily passive income during the game: base + budget / 1500
// Countries omitted from this table fall back to the SMALL_DEFAULT below
// (covers the ~150 small / non-military states).

export const DEFENSE_BUDGETS: Record<string, number> = {
  // Top tier
  US: 916000, CN: 296000, RU: 109000, IN: 83600, SA: 75800,
  GB: 74900, UA: 64800, DE: 66800, FR: 56900, JP: 50200,
  KR: 47900, IT: 35500, AU: 32300, PL: 31600, IL: 27500,
  CA: 26900, BR: 22900, ES: 22800,
  // Upper middle
  DZ: 18300, TW: 19100, NL: 17000, TR: 15800, SG: 13400,
  ID: 11000, MX: 11800, IR: 10300, CO: 9800, BE: 7900,
  PK: 8500, NO: 8100, DK: 8100, SE: 8400, GR: 7600,
  FI: 7400, CH: 7100, VN: 6500, AE: 7500, EG: 5700,
  AR: 5800, RO: 8500, TH: 5800, CL: 5500, PH: 5500,
  QA: 4500, PT: 4500, KZ: 3700, AT: 3600, NG: 3300,
  IQ: 3000, OM: 5800, KW: 8200, CZ: 5400, HU: 3500,
  MY: 3500, BD: 4500, UY: 1100, ZA: 3300, MA: 5500,
  // Mid
  BG: 1300, BY: 800, LB: 2400, MM: 2200, NZ: 3300,
  RS: 1500, SK: 1900, SI: 750, EE: 950, LV: 880,
  LT: 1700, HR: 1300, CY: 470, JO: 2000, BH: 1500,
  AZ: 3100, AM: 800, GE: 540, AF: 200, IE: 1100,
  // Smaller but notable
  LU: 480, NP: 350, LK: 1400, CU: 580, VE: 1200,
  CD: 500, ET: 1100, KE: 1100, AO: 1700, ZW: 480,
  TZ: 530, GH: 300, UG: 1000, ZM: 540, SN: 400,
  TN: 1100, LY: 2500, SD: 1200, YE: 1500, SY: 1700,
  // Watcher / non-UN special cases
  PS: 0, VA: 0,
};

// Default budget (in millions USD/year) for countries not in the table.
// Small enough to be playable but tiny vs major powers.
const SMALL_DEFAULT = 80;

export function defenseBudget(countryCode: string | null | undefined): number {
  if (!countryCode) return SMALL_DEFAULT;
  return DEFENSE_BUDGETS[countryCode] ?? SMALL_DEFAULT;
}
