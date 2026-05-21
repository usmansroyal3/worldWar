// All 193 UN member states + Vatican City (VA) + Palestine (PS) = 195 entries.
// Fields:
//   code: ISO 3166-1 alpha-2 (uppercase)
//   name: common English name
//   pop: population in millions (rounded to 1 decimal) — used as "population points" for win condition
//   region: broad region tag for grouping
//   borders: ISO codes of land-neighbours (used to gate ground attacks)
//   blocs: geopolitical bloc tags used by relationship engine (see game/relationships.ts)
//   rivals: hard-rival ISO codes (auto-enemy unless overridden by alliances/diplomacy)
//   allies: hard-ally ISO codes (auto-friendly unless overridden)
//   center: [lat, lng] approximate centroid for missile/ship range
//
// Data is intentionally compact; expand individual records as the game grows.

export interface CountryDef {
  code: string;
  name: string;
  pop: number;
  region:
    | 'NorthAmerica'
    | 'LatinAmerica'
    | 'Europe'
    | 'EastEurope'
    | 'MENA'
    | 'SubSaharanAfrica'
    | 'CentralAsia'
    | 'SouthAsia'
    | 'EastAsia'
    | 'SoutheastAsia'
    | 'Oceania';
  borders: string[];
  blocs: string[];
  rivals: string[];
  allies: string[];
  center: [number, number];
  // Optional: scaled-down nuclear arsenal seeded from real-world counts.
  // Omitted entirely for non-nuclear states.
  nukes?: number;
}

// Real-world declared & widely-recognised nuclear states with arsenals scaled
// for game balance (real counts divided by ~250). Players who pick these
// countries start with this many warheads. Each warhead deals 2 000 capital
// damage and consumes one count.
const NUKES: Record<string, number> = {
  RU: 25, US: 25, CN: 15, FR: 12, GB: 10, IN: 8, PK: 8, IL: 5, KP: 3,
};
function n(c: string): number | undefined { return NUKES[c]; }

export const COUNTRIES: CountryDef[] = [
  // ============== North America ==============
  { code: 'US', name: 'United States', pop: 334.9, region: 'NorthAmerica', borders: ['CA', 'MX'], blocs: ['NATO', 'G7', 'FiveEyes', 'West'], rivals: ['RU', 'CN', 'IR', 'KP', 'VE', 'CU'], allies: ['GB', 'CA', 'AU', 'NZ', 'JP', 'KR', 'IL', 'DE', 'FR', 'IT', 'PL', 'PH'], center: [39.8, -98.6], nukes: n('US') },
  { code: 'CA', name: 'Canada', pop: 40.1, region: 'NorthAmerica', borders: ['US'], blocs: ['NATO', 'G7', 'FiveEyes', 'West'], rivals: ['RU', 'CN'], allies: ['US', 'GB', 'AU', 'NZ', 'FR'], center: [56.1, -106.3] },
  { code: 'MX', name: 'Mexico', pop: 128.5, region: 'LatinAmerica', borders: ['US', 'GT', 'BZ'], blocs: ['LATAM'], rivals: [], allies: ['US', 'CA'], center: [23.6, -102.6] },
  // ============== Central America & Caribbean ==============
  { code: 'GT', name: 'Guatemala', pop: 17.6, region: 'LatinAmerica', borders: ['MX', 'BZ', 'SV', 'HN'], blocs: ['LATAM'], rivals: [], allies: ['US'], center: [15.8, -90.2] },
  { code: 'BZ', name: 'Belize', pop: 0.4, region: 'LatinAmerica', borders: ['MX', 'GT'], blocs: ['LATAM', 'Commonwealth'], rivals: [], allies: ['GB'], center: [17.2, -88.5] },
  { code: 'SV', name: 'El Salvador', pop: 6.4, region: 'LatinAmerica', borders: ['GT', 'HN'], blocs: ['LATAM'], rivals: [], allies: ['US'], center: [13.8, -88.9] },
  { code: 'HN', name: 'Honduras', pop: 10.6, region: 'LatinAmerica', borders: ['GT', 'SV', 'NI'], blocs: ['LATAM'], rivals: [], allies: ['US'], center: [15.2, -86.2] },
  { code: 'NI', name: 'Nicaragua', pop: 7.0, region: 'LatinAmerica', borders: ['HN', 'CR'], blocs: ['LATAM'], rivals: ['US'], allies: ['RU', 'CU', 'VE'], center: [12.9, -85.2] },
  { code: 'CR', name: 'Costa Rica', pop: 5.2, region: 'LatinAmerica', borders: ['NI', 'PA'], blocs: ['LATAM'], rivals: [], allies: ['US'], center: [9.7, -84.0] },
  { code: 'PA', name: 'Panama', pop: 4.5, region: 'LatinAmerica', borders: ['CR', 'CO'], blocs: ['LATAM'], rivals: [], allies: ['US'], center: [8.5, -80.8] },
  { code: 'CU', name: 'Cuba', pop: 11.2, region: 'LatinAmerica', borders: [], blocs: ['LATAM'], rivals: ['US'], allies: ['RU', 'CN', 'VE', 'NI'], center: [21.5, -77.8] },
  { code: 'JM', name: 'Jamaica', pop: 2.8, region: 'LatinAmerica', borders: [], blocs: ['LATAM', 'Commonwealth'], rivals: [], allies: ['GB'], center: [18.1, -77.3] },
  { code: 'HT', name: 'Haiti', pop: 11.7, region: 'LatinAmerica', borders: ['DO'], blocs: ['LATAM'], rivals: [], allies: ['FR', 'US'], center: [18.9, -72.3] },
  { code: 'DO', name: 'Dominican Republic', pop: 11.2, region: 'LatinAmerica', borders: ['HT'], blocs: ['LATAM'], rivals: [], allies: ['US'], center: [18.7, -70.2] },
  { code: 'BS', name: 'Bahamas', pop: 0.4, region: 'LatinAmerica', borders: [], blocs: ['LATAM', 'Commonwealth'], rivals: [], allies: ['US', 'GB'], center: [25.0, -77.4] },
  { code: 'BB', name: 'Barbados', pop: 0.3, region: 'LatinAmerica', borders: [], blocs: ['LATAM', 'Commonwealth'], rivals: [], allies: ['GB'], center: [13.2, -59.5] },
  { code: 'TT', name: 'Trinidad and Tobago', pop: 1.4, region: 'LatinAmerica', borders: [], blocs: ['LATAM', 'Commonwealth'], rivals: [], allies: ['GB', 'US'], center: [10.7, -61.2] },
  { code: 'AG', name: 'Antigua and Barbuda', pop: 0.1, region: 'LatinAmerica', borders: [], blocs: ['LATAM', 'Commonwealth'], rivals: [], allies: ['GB'], center: [17.1, -61.8] },
  { code: 'DM', name: 'Dominica', pop: 0.07, region: 'LatinAmerica', borders: [], blocs: ['LATAM', 'Commonwealth'], rivals: [], allies: ['GB'], center: [15.4, -61.4] },
  { code: 'GD', name: 'Grenada', pop: 0.1, region: 'LatinAmerica', borders: [], blocs: ['LATAM', 'Commonwealth'], rivals: [], allies: ['GB'], center: [12.1, -61.7] },
  { code: 'KN', name: 'Saint Kitts and Nevis', pop: 0.05, region: 'LatinAmerica', borders: [], blocs: ['LATAM', 'Commonwealth'], rivals: [], allies: ['GB'], center: [17.3, -62.7] },
  { code: 'LC', name: 'Saint Lucia', pop: 0.18, region: 'LatinAmerica', borders: [], blocs: ['LATAM', 'Commonwealth'], rivals: [], allies: ['GB'], center: [13.9, -61.0] },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', pop: 0.1, region: 'LatinAmerica', borders: [], blocs: ['LATAM', 'Commonwealth'], rivals: [], allies: ['GB'], center: [13.2, -61.2] },
  // ============== South America ==============
  { code: 'CO', name: 'Colombia', pop: 52.1, region: 'LatinAmerica', borders: ['PA', 'VE', 'BR', 'PE', 'EC'], blocs: ['LATAM'], rivals: ['VE'], allies: ['US'], center: [4.6, -74.3] },
  { code: 'VE', name: 'Venezuela', pop: 28.8, region: 'LatinAmerica', borders: ['CO', 'BR', 'GY'], blocs: ['LATAM'], rivals: ['US', 'CO'], allies: ['RU', 'CN', 'CU', 'IR'], center: [6.4, -66.6] },
  { code: 'GY', name: 'Guyana', pop: 0.8, region: 'LatinAmerica', borders: ['VE', 'BR', 'SR'], blocs: ['LATAM', 'Commonwealth'], rivals: ['VE'], allies: ['GB', 'US'], center: [4.9, -58.9] },
  { code: 'SR', name: 'Suriname', pop: 0.6, region: 'LatinAmerica', borders: ['GY', 'BR'], blocs: ['LATAM'], rivals: [], allies: ['NL'], center: [3.9, -56.0] },
  { code: 'BR', name: 'Brazil', pop: 216.4, region: 'LatinAmerica', borders: ['VE', 'CO', 'PE', 'BO', 'PY', 'AR', 'UY', 'GY', 'SR'], blocs: ['BRICS', 'LATAM', 'G20'], rivals: [], allies: ['AR'], center: [-14.2, -51.9] },
  { code: 'EC', name: 'Ecuador', pop: 17.5, region: 'LatinAmerica', borders: ['CO', 'PE'], blocs: ['LATAM'], rivals: [], allies: ['US'], center: [-1.8, -78.2] },
  { code: 'PE', name: 'Peru', pop: 33.7, region: 'LatinAmerica', borders: ['EC', 'CO', 'BR', 'BO', 'CL'], blocs: ['LATAM'], rivals: ['CL'], allies: ['US'], center: [-9.2, -75.0] },
  { code: 'BO', name: 'Bolivia', pop: 12.4, region: 'LatinAmerica', borders: ['PE', 'BR', 'PY', 'AR', 'CL'], blocs: ['LATAM'], rivals: [], allies: ['VE'], center: [-16.3, -63.6] },
  { code: 'PY', name: 'Paraguay', pop: 6.9, region: 'LatinAmerica', borders: ['BO', 'BR', 'AR'], blocs: ['LATAM'], rivals: [], allies: ['BR'], center: [-23.4, -58.4] },
  { code: 'CL', name: 'Chile', pop: 19.6, region: 'LatinAmerica', borders: ['PE', 'BO', 'AR'], blocs: ['LATAM'], rivals: ['PE'], allies: ['US'], center: [-35.7, -71.5] },
  { code: 'AR', name: 'Argentina', pop: 46.2, region: 'LatinAmerica', borders: ['CL', 'BO', 'PY', 'BR', 'UY'], blocs: ['LATAM', 'G20'], rivals: ['GB'], allies: ['BR'], center: [-38.4, -63.6] },
  { code: 'UY', name: 'Uruguay', pop: 3.4, region: 'LatinAmerica', borders: ['BR', 'AR'], blocs: ['LATAM'], rivals: [], allies: ['BR', 'AR'], center: [-32.5, -55.8] },
  // ============== Europe (Western/EU & UK) ==============
  { code: 'GB', name: 'United Kingdom', pop: 67.7, region: 'Europe', borders: ['IE'], blocs: ['NATO', 'G7', 'FiveEyes', 'West', 'Commonwealth'], rivals: ['RU', 'CN', 'AR'], allies: ['US', 'CA', 'AU', 'NZ', 'FR', 'DE'], center: [54.7, -3.4], nukes: n('GB') },
  { code: 'IE', name: 'Ireland', pop: 5.1, region: 'Europe', borders: ['GB'], blocs: ['EU', 'West'], rivals: [], allies: ['GB', 'US'], center: [53.4, -8.2] },
  { code: 'FR', name: 'France', pop: 64.8, region: 'Europe', borders: ['BE', 'LU', 'DE', 'CH', 'IT', 'ES', 'AD', 'MC'], blocs: ['NATO', 'EU', 'G7', 'West'], rivals: ['RU'], allies: ['DE', 'GB', 'US', 'IT'], center: [46.2, 2.2], nukes: n('FR') },
  { code: 'DE', name: 'Germany', pop: 83.3, region: 'Europe', borders: ['DK', 'PL', 'CZ', 'AT', 'CH', 'FR', 'LU', 'BE', 'NL'], blocs: ['NATO', 'EU', 'G7', 'West'], rivals: ['RU'], allies: ['FR', 'US', 'GB'], center: [51.2, 10.5] },
  { code: 'ES', name: 'Spain', pop: 48.4, region: 'Europe', borders: ['PT', 'FR', 'AD'], blocs: ['NATO', 'EU', 'West'], rivals: [], allies: ['US', 'FR', 'DE'], center: [40.5, -3.7] },
  { code: 'PT', name: 'Portugal', pop: 10.4, region: 'Europe', borders: ['ES'], blocs: ['NATO', 'EU', 'West'], rivals: [], allies: ['ES', 'BR', 'GB'], center: [39.4, -8.2] },
  { code: 'IT', name: 'Italy', pop: 58.9, region: 'Europe', borders: ['FR', 'CH', 'AT', 'SI', 'VA', 'SM'], blocs: ['NATO', 'EU', 'G7', 'West'], rivals: [], allies: ['DE', 'FR', 'US'], center: [41.9, 12.6] },
  { code: 'NL', name: 'Netherlands', pop: 17.8, region: 'Europe', borders: ['DE', 'BE'], blocs: ['NATO', 'EU', 'West'], rivals: [], allies: ['DE', 'GB', 'US'], center: [52.1, 5.3] },
  { code: 'BE', name: 'Belgium', pop: 11.7, region: 'Europe', borders: ['FR', 'LU', 'DE', 'NL'], blocs: ['NATO', 'EU', 'West'], rivals: [], allies: ['DE', 'FR'], center: [50.5, 4.5] },
  { code: 'LU', name: 'Luxembourg', pop: 0.6, region: 'Europe', borders: ['BE', 'FR', 'DE'], blocs: ['NATO', 'EU', 'West'], rivals: [], allies: ['DE', 'FR', 'BE'], center: [49.8, 6.1] },
  { code: 'CH', name: 'Switzerland', pop: 8.8, region: 'Europe', borders: ['FR', 'IT', 'DE', 'AT', 'LI'], blocs: ['West'], rivals: [], allies: ['DE', 'IT', 'FR'], center: [46.8, 8.2] },
  { code: 'AT', name: 'Austria', pop: 9.1, region: 'Europe', borders: ['DE', 'CZ', 'SK', 'HU', 'SI', 'IT', 'CH', 'LI'], blocs: ['EU', 'West'], rivals: [], allies: ['DE'], center: [47.5, 14.6] },
  { code: 'LI', name: 'Liechtenstein', pop: 0.04, region: 'Europe', borders: ['CH', 'AT'], blocs: ['West'], rivals: [], allies: ['CH', 'AT'], center: [47.1, 9.6] },
  { code: 'MC', name: 'Monaco', pop: 0.04, region: 'Europe', borders: ['FR'], blocs: ['West'], rivals: [], allies: ['FR'], center: [43.7, 7.4] },
  { code: 'SM', name: 'San Marino', pop: 0.03, region: 'Europe', borders: ['IT'], blocs: ['West'], rivals: [], allies: ['IT'], center: [43.9, 12.5] },
  { code: 'AD', name: 'Andorra', pop: 0.08, region: 'Europe', borders: ['FR', 'ES'], blocs: ['West'], rivals: [], allies: ['FR', 'ES'], center: [42.5, 1.6] },
  { code: 'VA', name: 'Vatican City', pop: 0.001, region: 'Europe', borders: ['IT'], blocs: ['West'], rivals: [], allies: ['IT'], center: [41.9, 12.45] },
  { code: 'MT', name: 'Malta', pop: 0.5, region: 'Europe', borders: [], blocs: ['EU', 'West'], rivals: [], allies: ['IT', 'GB'], center: [35.9, 14.4] },
  // ============== Nordics ==============
  { code: 'DK', name: 'Denmark', pop: 5.9, region: 'Europe', borders: ['DE'], blocs: ['NATO', 'EU', 'West'], rivals: ['RU'], allies: ['US', 'DE', 'SE', 'NO'], center: [56.3, 9.5] },
  { code: 'IS', name: 'Iceland', pop: 0.4, region: 'Europe', borders: [], blocs: ['NATO', 'West'], rivals: [], allies: ['US', 'NO', 'DK'], center: [64.9, -19.0] },
  { code: 'NO', name: 'Norway', pop: 5.5, region: 'Europe', borders: ['SE', 'FI', 'RU'], blocs: ['NATO', 'West'], rivals: ['RU'], allies: ['SE', 'DK', 'US'], center: [60.5, 8.5] },
  { code: 'SE', name: 'Sweden', pop: 10.5, region: 'Europe', borders: ['NO', 'FI'], blocs: ['NATO', 'EU', 'West'], rivals: ['RU'], allies: ['NO', 'FI', 'US'], center: [60.1, 18.6] },
  { code: 'FI', name: 'Finland', pop: 5.5, region: 'Europe', borders: ['NO', 'SE', 'RU'], blocs: ['NATO', 'EU', 'West'], rivals: ['RU'], allies: ['SE', 'NO', 'US'], center: [61.9, 25.7] },
  // ============== Eastern Europe ==============
  { code: 'PL', name: 'Poland', pop: 38.0, region: 'EastEurope', borders: ['DE', 'CZ', 'SK', 'UA', 'BY', 'LT', 'RU'], blocs: ['NATO', 'EU', 'West'], rivals: ['RU', 'BY'], allies: ['US', 'UA', 'GB'], center: [51.9, 19.1] },
  { code: 'CZ', name: 'Czech Republic', pop: 10.5, region: 'EastEurope', borders: ['DE', 'PL', 'SK', 'AT'], blocs: ['NATO', 'EU', 'West'], rivals: ['RU'], allies: ['DE', 'SK', 'PL'], center: [49.8, 15.5] },
  { code: 'SK', name: 'Slovakia', pop: 5.4, region: 'EastEurope', borders: ['CZ', 'PL', 'UA', 'HU', 'AT'], blocs: ['NATO', 'EU', 'West'], rivals: [], allies: ['CZ', 'PL'], center: [48.7, 19.7] },
  { code: 'HU', name: 'Hungary', pop: 9.6, region: 'EastEurope', borders: ['SK', 'UA', 'RO', 'RS', 'HR', 'SI', 'AT'], blocs: ['NATO', 'EU', 'West'], rivals: [], allies: ['DE'], center: [47.2, 19.5] },
  { code: 'RO', name: 'Romania', pop: 19.0, region: 'EastEurope', borders: ['UA', 'MD', 'BG', 'RS', 'HU'], blocs: ['NATO', 'EU', 'West'], rivals: ['RU'], allies: ['US', 'MD'], center: [45.9, 24.97] },
  { code: 'BG', name: 'Bulgaria', pop: 6.7, region: 'EastEurope', borders: ['RO', 'RS', 'MK', 'GR', 'TR'], blocs: ['NATO', 'EU', 'West'], rivals: [], allies: ['US'], center: [42.7, 25.5] },
  { code: 'GR', name: 'Greece', pop: 10.4, region: 'Europe', borders: ['AL', 'MK', 'BG', 'TR'], blocs: ['NATO', 'EU', 'West'], rivals: ['TR'], allies: ['US', 'FR', 'CY'], center: [39.1, 21.8] },
  { code: 'CY', name: 'Cyprus', pop: 1.3, region: 'Europe', borders: [], blocs: ['EU', 'West'], rivals: ['TR'], allies: ['GR', 'GB'], center: [35.1, 33.4] },
  { code: 'EE', name: 'Estonia', pop: 1.3, region: 'EastEurope', borders: ['LV', 'RU'], blocs: ['NATO', 'EU', 'West'], rivals: ['RU'], allies: ['US', 'LV', 'LT'], center: [58.6, 25.0] },
  { code: 'LV', name: 'Latvia', pop: 1.9, region: 'EastEurope', borders: ['EE', 'LT', 'BY', 'RU'], blocs: ['NATO', 'EU', 'West'], rivals: ['RU'], allies: ['US', 'EE', 'LT'], center: [56.9, 24.6] },
  { code: 'LT', name: 'Lithuania', pop: 2.7, region: 'EastEurope', borders: ['LV', 'BY', 'PL', 'RU'], blocs: ['NATO', 'EU', 'West'], rivals: ['RU', 'BY'], allies: ['US', 'PL'], center: [55.2, 23.9] },
  { code: 'BY', name: 'Belarus', pop: 9.5, region: 'EastEurope', borders: ['LV', 'LT', 'PL', 'UA', 'RU'], blocs: ['CSTO'], rivals: ['UA', 'PL', 'LT'], allies: ['RU'], center: [53.7, 27.9] },
  { code: 'UA', name: 'Ukraine', pop: 36.7, region: 'EastEurope', borders: ['BY', 'RU', 'MD', 'RO', 'HU', 'SK', 'PL'], blocs: ['West'], rivals: ['RU', 'BY'], allies: ['US', 'GB', 'PL', 'DE'], center: [48.4, 31.2] },
  { code: 'MD', name: 'Moldova', pop: 2.5, region: 'EastEurope', borders: ['UA', 'RO'], blocs: ['West'], rivals: ['RU'], allies: ['RO', 'UA'], center: [47.4, 28.4] },
  { code: 'RU', name: 'Russia', pop: 144.4, region: 'EastEurope', borders: ['NO', 'FI', 'EE', 'LV', 'LT', 'PL', 'BY', 'UA', 'GE', 'AZ', 'KZ', 'CN', 'MN', 'KP'], blocs: ['BRICS', 'CSTO', 'SCO', 'G20'], rivals: ['US', 'UA', 'GB', 'PL', 'NATO'], allies: ['BY', 'CN', 'IR', 'SY', 'CU', 'VE', 'KZ'], center: [61.5, 105.3], nukes: n('RU') },
  { code: 'AL', name: 'Albania', pop: 2.8, region: 'EastEurope', borders: ['ME', 'MK', 'GR'], blocs: ['NATO', 'West'], rivals: ['RS'], allies: ['US', 'TR'], center: [41.2, 20.2] },
  { code: 'MK', name: 'North Macedonia', pop: 2.1, region: 'EastEurope', borders: ['RS', 'AL', 'GR', 'BG'], blocs: ['NATO', 'West'], rivals: [], allies: ['US'], center: [41.6, 21.7] },
  { code: 'RS', name: 'Serbia', pop: 6.7, region: 'EastEurope', borders: ['HU', 'RO', 'BG', 'MK', 'ME', 'BA', 'HR'], blocs: [], rivals: ['AL'], allies: ['RU', 'CN'], center: [44.0, 21.0] },
  { code: 'ME', name: 'Montenegro', pop: 0.6, region: 'EastEurope', borders: ['HR', 'BA', 'RS', 'AL'], blocs: ['NATO', 'West'], rivals: [], allies: ['US', 'IT'], center: [42.7, 19.4] },
  { code: 'BA', name: 'Bosnia and Herzegovina', pop: 3.2, region: 'EastEurope', borders: ['HR', 'RS', 'ME'], blocs: ['West'], rivals: [], allies: ['HR', 'TR'], center: [43.9, 17.7] },
  { code: 'HR', name: 'Croatia', pop: 3.9, region: 'EastEurope', borders: ['SI', 'HU', 'RS', 'BA', 'ME'], blocs: ['NATO', 'EU', 'West'], rivals: [], allies: ['DE', 'US'], center: [45.1, 15.2] },
  { code: 'SI', name: 'Slovenia', pop: 2.1, region: 'EastEurope', borders: ['IT', 'AT', 'HU', 'HR'], blocs: ['NATO', 'EU', 'West'], rivals: [], allies: ['DE', 'IT'], center: [46.2, 14.9] },
  // ============== Caucasus + MENA ==============
  { code: 'GE', name: 'Georgia', pop: 3.7, region: 'CentralAsia', borders: ['RU', 'AZ', 'AM', 'TR'], blocs: ['West'], rivals: ['RU'], allies: ['US', 'TR', 'UA'], center: [42.3, 43.4] },
  { code: 'AM', name: 'Armenia', pop: 2.8, region: 'CentralAsia', borders: ['GE', 'AZ', 'IR', 'TR'], blocs: ['CSTO'], rivals: ['AZ', 'TR'], allies: ['RU', 'IR', 'FR'], center: [40.1, 45.0] },
  { code: 'AZ', name: 'Azerbaijan', pop: 10.4, region: 'CentralAsia', borders: ['GE', 'AM', 'IR', 'RU'], blocs: ['SCO'], rivals: ['AM', 'IR'], allies: ['TR', 'PK', 'IL'], center: [40.1, 47.6] },
  { code: 'TR', name: 'Turkey', pop: 85.8, region: 'MENA', borders: ['GR', 'BG', 'GE', 'AM', 'AZ', 'IR', 'IQ', 'SY'], blocs: ['NATO', 'G20'], rivals: ['GR', 'CY', 'AM', 'SY'], allies: ['AZ', 'PK', 'QA', 'US'], center: [38.9, 35.2] },
  { code: 'SY', name: 'Syria', pop: 23.2, region: 'MENA', borders: ['TR', 'IQ', 'JO', 'IL', 'LB'], blocs: ['ArabLeague'], rivals: ['IL', 'TR', 'US'], allies: ['RU', 'IR'], center: [34.8, 38.9] },
  { code: 'LB', name: 'Lebanon', pop: 5.3, region: 'MENA', borders: ['SY', 'IL'], blocs: ['ArabLeague'], rivals: ['IL'], allies: ['IR', 'FR'], center: [33.8, 35.8] },
  { code: 'IL', name: 'Israel', pop: 9.7, region: 'MENA', borders: ['LB', 'SY', 'JO', 'EG', 'PS'], blocs: ['West'], rivals: ['IR', 'SY', 'LB', 'PS', 'YE'], allies: ['US', 'IN', 'DE', 'AZ'], center: [31.0, 34.9], nukes: n('IL') },
  { code: 'PS', name: 'Palestine', pop: 5.4, region: 'MENA', borders: ['IL', 'EG', 'JO'], blocs: ['ArabLeague'], rivals: ['IL'], allies: ['IR', 'TR', 'QA'], center: [31.95, 35.3] },
  { code: 'JO', name: 'Jordan', pop: 11.3, region: 'MENA', borders: ['SY', 'IQ', 'SA', 'IL', 'PS'], blocs: ['ArabLeague'], rivals: [], allies: ['US', 'SA', 'GB'], center: [30.6, 36.2] },
  { code: 'IQ', name: 'Iraq', pop: 45.5, region: 'MENA', borders: ['TR', 'IR', 'KW', 'SA', 'JO', 'SY'], blocs: ['ArabLeague'], rivals: [], allies: ['IR', 'US'], center: [33.2, 43.7] },
  { code: 'IR', name: 'Iran', pop: 89.2, region: 'MENA', borders: ['IQ', 'TR', 'AZ', 'AM', 'TM', 'AF', 'PK'], blocs: ['SCO'], rivals: ['US', 'IL', 'SA', 'AE'], allies: ['RU', 'CN', 'SY', 'VE'], center: [32.4, 53.7] },
  { code: 'SA', name: 'Saudi Arabia', pop: 36.9, region: 'MENA', borders: ['JO', 'IQ', 'KW', 'QA', 'AE', 'OM', 'YE'], blocs: ['ArabLeague', 'GCC', 'G20'], rivals: ['IR', 'YE'], allies: ['US', 'EG', 'AE', 'PK'], center: [23.9, 45.1] },
  { code: 'KW', name: 'Kuwait', pop: 4.3, region: 'MENA', borders: ['IQ', 'SA'], blocs: ['ArabLeague', 'GCC'], rivals: [], allies: ['US', 'SA'], center: [29.3, 47.5] },
  { code: 'BH', name: 'Bahrain', pop: 1.5, region: 'MENA', borders: [], blocs: ['ArabLeague', 'GCC'], rivals: ['IR'], allies: ['SA', 'US'], center: [26.1, 50.6] },
  { code: 'QA', name: 'Qatar', pop: 3.0, region: 'MENA', borders: ['SA'], blocs: ['ArabLeague', 'GCC'], rivals: [], allies: ['TR', 'US', 'IR'], center: [25.4, 51.2] },
  { code: 'AE', name: 'United Arab Emirates', pop: 10.0, region: 'MENA', borders: ['SA', 'OM'], blocs: ['ArabLeague', 'GCC'], rivals: ['IR'], allies: ['US', 'SA', 'IL'], center: [23.4, 53.8] },
  { code: 'OM', name: 'Oman', pop: 4.6, region: 'MENA', borders: ['SA', 'AE', 'YE'], blocs: ['ArabLeague', 'GCC'], rivals: [], allies: ['GB', 'US'], center: [21.5, 55.9] },
  { code: 'YE', name: 'Yemen', pop: 34.4, region: 'MENA', borders: ['SA', 'OM'], blocs: ['ArabLeague'], rivals: ['SA', 'AE'], allies: ['IR'], center: [15.5, 48.5] },
  { code: 'EG', name: 'Egypt', pop: 112.7, region: 'MENA', borders: ['LY', 'SD', 'IL', 'PS'], blocs: ['ArabLeague', 'BRICS'], rivals: [], allies: ['SA', 'US', 'AE'], center: [26.8, 30.8] },
  { code: 'LY', name: 'Libya', pop: 6.9, region: 'MENA', borders: ['EG', 'SD', 'TD', 'NE', 'DZ', 'TN'], blocs: ['ArabLeague'], rivals: [], allies: ['TR', 'RU'], center: [26.3, 17.2] },
  { code: 'TN', name: 'Tunisia', pop: 12.5, region: 'MENA', borders: ['DZ', 'LY'], blocs: ['ArabLeague'], rivals: [], allies: ['FR'], center: [33.9, 9.5] },
  { code: 'DZ', name: 'Algeria', pop: 45.6, region: 'MENA', borders: ['MA', 'EH', 'MR', 'ML', 'NE', 'LY', 'TN'], blocs: ['ArabLeague'], rivals: ['MA'], allies: ['RU'], center: [28.0, 1.7] },
  { code: 'MA', name: 'Morocco', pop: 37.1, region: 'MENA', borders: ['DZ', 'EH', 'ES'], blocs: ['ArabLeague'], rivals: ['DZ'], allies: ['US', 'FR', 'IL', 'SA'], center: [31.8, -7.1] },
  { code: 'SD', name: 'Sudan', pop: 48.1, region: 'SubSaharanAfrica', borders: ['EG', 'LY', 'TD', 'CF', 'SS', 'ET', 'ER'], blocs: ['ArabLeague'], rivals: [], allies: ['RU', 'EG'], center: [12.9, 30.2] },
  // ============== Sub-Saharan Africa ==============
  { code: 'SS', name: 'South Sudan', pop: 11.1, region: 'SubSaharanAfrica', borders: ['SD', 'ET', 'KE', 'UG', 'CD', 'CF'], blocs: ['AU'], rivals: ['SD'], allies: ['US'], center: [7.9, 29.7] },
  { code: 'ER', name: 'Eritrea', pop: 3.7, region: 'SubSaharanAfrica', borders: ['SD', 'ET', 'DJ'], blocs: ['AU'], rivals: ['ET'], allies: ['RU'], center: [15.2, 39.8] },
  { code: 'DJ', name: 'Djibouti', pop: 1.1, region: 'SubSaharanAfrica', borders: ['ER', 'ET', 'SO'], blocs: ['AU', 'ArabLeague'], rivals: [], allies: ['US', 'FR', 'CN'], center: [11.8, 42.6] },
  { code: 'ET', name: 'Ethiopia', pop: 126.5, region: 'SubSaharanAfrica', borders: ['ER', 'DJ', 'SO', 'KE', 'SS', 'SD'], blocs: ['AU', 'BRICS'], rivals: ['ER'], allies: ['CN', 'US'], center: [9.1, 40.5] },
  { code: 'SO', name: 'Somalia', pop: 17.6, region: 'SubSaharanAfrica', borders: ['DJ', 'ET', 'KE'], blocs: ['AU', 'ArabLeague'], rivals: [], allies: ['TR', 'US'], center: [5.2, 46.2] },
  { code: 'KE', name: 'Kenya', pop: 55.1, region: 'SubSaharanAfrica', borders: ['SS', 'ET', 'SO', 'TZ', 'UG'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: ['US', 'GB'], center: [-0.0, 37.9] },
  { code: 'UG', name: 'Uganda', pop: 48.6, region: 'SubSaharanAfrica', borders: ['SS', 'KE', 'TZ', 'RW', 'CD'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: ['US'], center: [1.4, 32.3] },
  { code: 'TZ', name: 'Tanzania', pop: 67.4, region: 'SubSaharanAfrica', borders: ['KE', 'UG', 'RW', 'BI', 'CD', 'ZM', 'MW', 'MZ'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: ['CN'], center: [-6.4, 34.9] },
  { code: 'RW', name: 'Rwanda', pop: 13.8, region: 'SubSaharanAfrica', borders: ['UG', 'TZ', 'BI', 'CD'], blocs: ['AU', 'Commonwealth'], rivals: ['CD'], allies: ['US'], center: [-1.9, 29.9] },
  { code: 'BI', name: 'Burundi', pop: 13.2, region: 'SubSaharanAfrica', borders: ['RW', 'TZ', 'CD'], blocs: ['AU'], rivals: [], allies: [], center: [-3.4, 29.9] },
  { code: 'CD', name: 'DR Congo', pop: 102.3, region: 'SubSaharanAfrica', borders: ['CF', 'SS', 'UG', 'RW', 'BI', 'TZ', 'ZM', 'AO', 'CG'], blocs: ['AU'], rivals: ['RW'], allies: ['CN', 'US'], center: [-4.0, 21.8] },
  { code: 'CG', name: 'Republic of the Congo', pop: 6.1, region: 'SubSaharanAfrica', borders: ['GA', 'CM', 'CF', 'CD', 'AO'], blocs: ['AU'], rivals: [], allies: ['FR'], center: [-0.2, 15.8] },
  { code: 'CF', name: 'Central African Republic', pop: 5.7, region: 'SubSaharanAfrica', borders: ['TD', 'SD', 'SS', 'CD', 'CG', 'CM'], blocs: ['AU'], rivals: [], allies: ['RU', 'FR'], center: [6.6, 20.9] },
  { code: 'CM', name: 'Cameroon', pop: 28.6, region: 'SubSaharanAfrica', borders: ['NG', 'TD', 'CF', 'CG', 'GA', 'GQ'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: ['FR'], center: [5.9, 11.5] },
  { code: 'GQ', name: 'Equatorial Guinea', pop: 1.7, region: 'SubSaharanAfrica', borders: ['CM', 'GA'], blocs: ['AU'], rivals: [], allies: [], center: [1.7, 10.3] },
  { code: 'GA', name: 'Gabon', pop: 2.4, region: 'SubSaharanAfrica', borders: ['CM', 'GQ', 'CG'], blocs: ['AU'], rivals: [], allies: ['FR'], center: [-0.8, 11.6] },
  { code: 'TD', name: 'Chad', pop: 18.3, region: 'SubSaharanAfrica', borders: ['LY', 'SD', 'CF', 'CM', 'NG', 'NE'], blocs: ['AU'], rivals: [], allies: ['FR'], center: [15.5, 18.7] },
  { code: 'NE', name: 'Niger', pop: 27.2, region: 'SubSaharanAfrica', borders: ['DZ', 'LY', 'TD', 'NG', 'BJ', 'BF', 'ML'], blocs: ['AU'], rivals: [], allies: ['RU'], center: [17.6, 8.1] },
  { code: 'NG', name: 'Nigeria', pop: 223.8, region: 'SubSaharanAfrica', borders: ['NE', 'TD', 'CM', 'BJ'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: ['US', 'GB'], center: [9.1, 8.7] },
  { code: 'BJ', name: 'Benin', pop: 13.7, region: 'SubSaharanAfrica', borders: ['NE', 'NG', 'TG', 'BF'], blocs: ['AU'], rivals: [], allies: ['FR'], center: [9.3, 2.3] },
  { code: 'TG', name: 'Togo', pop: 9.1, region: 'SubSaharanAfrica', borders: ['BJ', 'GH', 'BF'], blocs: ['AU'], rivals: [], allies: ['FR'], center: [8.6, 0.8] },
  { code: 'GH', name: 'Ghana', pop: 34.1, region: 'SubSaharanAfrica', borders: ['CI', 'BF', 'TG'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: ['US', 'GB'], center: [7.9, -1.0] },
  { code: 'CI', name: 'Ivory Coast', pop: 28.9, region: 'SubSaharanAfrica', borders: ['LR', 'GN', 'ML', 'BF', 'GH'], blocs: ['AU'], rivals: [], allies: ['FR'], center: [7.5, -5.5] },
  { code: 'LR', name: 'Liberia', pop: 5.4, region: 'SubSaharanAfrica', borders: ['SL', 'GN', 'CI'], blocs: ['AU'], rivals: [], allies: ['US'], center: [6.4, -9.4] },
  { code: 'SL', name: 'Sierra Leone', pop: 8.6, region: 'SubSaharanAfrica', borders: ['GN', 'LR'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: ['GB'], center: [8.5, -11.8] },
  { code: 'GN', name: 'Guinea', pop: 13.9, region: 'SubSaharanAfrica', borders: ['GW', 'SN', 'ML', 'CI', 'LR', 'SL'], blocs: ['AU'], rivals: [], allies: [], center: [9.9, -9.7] },
  { code: 'GW', name: 'Guinea-Bissau', pop: 2.1, region: 'SubSaharanAfrica', borders: ['SN', 'GN'], blocs: ['AU'], rivals: [], allies: [], center: [11.8, -15.2] },
  { code: 'SN', name: 'Senegal', pop: 17.8, region: 'SubSaharanAfrica', borders: ['MR', 'ML', 'GN', 'GW', 'GM'], blocs: ['AU'], rivals: [], allies: ['FR', 'US'], center: [14.5, -14.5] },
  { code: 'GM', name: 'Gambia', pop: 2.7, region: 'SubSaharanAfrica', borders: ['SN'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: [], center: [13.4, -15.4] },
  { code: 'ML', name: 'Mali', pop: 23.3, region: 'SubSaharanAfrica', borders: ['DZ', 'NE', 'BF', 'CI', 'GN', 'SN', 'MR'], blocs: ['AU'], rivals: [], allies: ['RU'], center: [17.6, -4.0] },
  { code: 'BF', name: 'Burkina Faso', pop: 23.3, region: 'SubSaharanAfrica', borders: ['ML', 'NE', 'BJ', 'TG', 'GH', 'CI'], blocs: ['AU'], rivals: [], allies: ['RU'], center: [12.2, -1.6] },
  { code: 'MR', name: 'Mauritania', pop: 4.9, region: 'SubSaharanAfrica', borders: ['EH', 'DZ', 'ML', 'SN'], blocs: ['AU', 'ArabLeague'], rivals: [], allies: ['FR'], center: [21.0, -10.9] },
  { code: 'CV', name: 'Cape Verde', pop: 0.6, region: 'SubSaharanAfrica', borders: [], blocs: ['AU'], rivals: [], allies: ['PT'], center: [16.5, -23.0] },
  { code: 'ST', name: 'Sao Tome and Principe', pop: 0.2, region: 'SubSaharanAfrica', borders: [], blocs: ['AU'], rivals: [], allies: ['PT'], center: [0.2, 6.6] },
  { code: 'AO', name: 'Angola', pop: 36.7, region: 'SubSaharanAfrica', borders: ['CD', 'CG', 'NA', 'ZM'], blocs: ['AU'], rivals: [], allies: ['BR', 'PT', 'CN'], center: [-11.2, 17.9] },
  { code: 'ZM', name: 'Zambia', pop: 20.6, region: 'SubSaharanAfrica', borders: ['CD', 'TZ', 'MW', 'MZ', 'ZW', 'BW', 'NA', 'AO'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: [], center: [-13.1, 27.8] },
  { code: 'MW', name: 'Malawi', pop: 20.9, region: 'SubSaharanAfrica', borders: ['TZ', 'MZ', 'ZM'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: [], center: [-13.3, 34.3] },
  { code: 'MZ', name: 'Mozambique', pop: 33.9, region: 'SubSaharanAfrica', borders: ['TZ', 'MW', 'ZM', 'ZW', 'ZA', 'SZ'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: ['PT'], center: [-18.7, 35.5] },
  { code: 'ZW', name: 'Zimbabwe', pop: 16.6, region: 'SubSaharanAfrica', borders: ['ZM', 'MZ', 'ZA', 'BW'], blocs: ['AU'], rivals: [], allies: ['CN'], center: [-19.0, 29.9] },
  { code: 'BW', name: 'Botswana', pop: 2.7, region: 'SubSaharanAfrica', borders: ['ZM', 'ZW', 'ZA', 'NA'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: [], center: [-22.3, 24.7] },
  { code: 'NA', name: 'Namibia', pop: 2.6, region: 'SubSaharanAfrica', borders: ['AO', 'ZM', 'BW', 'ZA'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: [], center: [-22.96, 18.5] },
  { code: 'ZA', name: 'South Africa', pop: 60.4, region: 'SubSaharanAfrica', borders: ['NA', 'BW', 'ZW', 'MZ', 'SZ', 'LS'], blocs: ['AU', 'BRICS', 'Commonwealth', 'G20'], rivals: [], allies: ['CN', 'IN', 'BR'], center: [-30.6, 22.9] },
  { code: 'SZ', name: 'Eswatini', pop: 1.2, region: 'SubSaharanAfrica', borders: ['ZA', 'MZ'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: [], center: [-26.5, 31.5] },
  { code: 'LS', name: 'Lesotho', pop: 2.3, region: 'SubSaharanAfrica', borders: ['ZA'], blocs: ['AU', 'Commonwealth'], rivals: [], allies: [], center: [-29.6, 28.2] },
  { code: 'MG', name: 'Madagascar', pop: 30.3, region: 'SubSaharanAfrica', borders: [], blocs: ['AU'], rivals: [], allies: ['FR'], center: [-18.8, 46.9] },
  { code: 'KM', name: 'Comoros', pop: 0.9, region: 'SubSaharanAfrica', borders: [], blocs: ['AU', 'ArabLeague'], rivals: [], allies: [], center: [-11.9, 43.9] },
  { code: 'MU', name: 'Mauritius', pop: 1.3, region: 'SubSaharanAfrica', borders: [], blocs: ['AU', 'Commonwealth'], rivals: [], allies: ['IN'], center: [-20.3, 57.6] },
  { code: 'SC', name: 'Seychelles', pop: 0.1, region: 'SubSaharanAfrica', borders: [], blocs: ['AU', 'Commonwealth'], rivals: [], allies: ['IN'], center: [-4.7, 55.5] },
  // ============== Central Asia ==============
  { code: 'KZ', name: 'Kazakhstan', pop: 19.6, region: 'CentralAsia', borders: ['RU', 'CN', 'KG', 'UZ', 'TM'], blocs: ['SCO', 'CSTO'], rivals: [], allies: ['RU', 'CN'], center: [48.0, 66.9] },
  { code: 'UZ', name: 'Uzbekistan', pop: 35.6, region: 'CentralAsia', borders: ['KZ', 'KG', 'TJ', 'AF', 'TM'], blocs: ['SCO'], rivals: [], allies: ['RU', 'CN'], center: [41.4, 64.6] },
  { code: 'TM', name: 'Turkmenistan', pop: 6.4, region: 'CentralAsia', borders: ['KZ', 'UZ', 'AF', 'IR'], blocs: [], rivals: [], allies: ['RU'], center: [38.97, 59.6] },
  { code: 'KG', name: 'Kyrgyzstan', pop: 6.7, region: 'CentralAsia', borders: ['KZ', 'CN', 'TJ', 'UZ'], blocs: ['SCO', 'CSTO'], rivals: ['TJ'], allies: ['RU'], center: [41.2, 74.8] },
  { code: 'TJ', name: 'Tajikistan', pop: 10.1, region: 'CentralAsia', borders: ['UZ', 'KG', 'CN', 'AF'], blocs: ['SCO', 'CSTO'], rivals: ['KG'], allies: ['RU'], center: [38.9, 71.3] },
  { code: 'AF', name: 'Afghanistan', pop: 42.2, region: 'CentralAsia', borders: ['IR', 'TM', 'UZ', 'TJ', 'CN', 'PK'], blocs: [], rivals: [], allies: ['PK'], center: [33.9, 67.7] },
  // ============== South Asia ==============
  { code: 'PK', name: 'Pakistan', pop: 240.5, region: 'SouthAsia', borders: ['AF', 'CN', 'IN', 'IR'], blocs: ['SCO'], rivals: ['IN', 'IL'], allies: ['CN', 'TR', 'SA', 'AZ'], center: [30.4, 69.3], nukes: n('PK') },
  { code: 'IN', name: 'India', pop: 1428.6, region: 'SouthAsia', borders: ['PK', 'CN', 'NP', 'BT', 'BD', 'MM'], blocs: ['BRICS', 'G20', 'Commonwealth'], rivals: ['PK', 'CN'], allies: ['RU', 'US', 'IL', 'FR', 'JP'], center: [20.6, 78.96], nukes: n('IN') },
  { code: 'BD', name: 'Bangladesh', pop: 172.9, region: 'SouthAsia', borders: ['IN', 'MM'], blocs: ['Commonwealth'], rivals: [], allies: ['IN', 'CN'], center: [23.7, 90.4] },
  { code: 'NP', name: 'Nepal', pop: 30.9, region: 'SouthAsia', borders: ['IN', 'CN'], blocs: [], rivals: [], allies: ['IN'], center: [28.4, 84.1] },
  { code: 'BT', name: 'Bhutan', pop: 0.8, region: 'SouthAsia', borders: ['IN', 'CN'], blocs: [], rivals: [], allies: ['IN'], center: [27.5, 90.4] },
  { code: 'LK', name: 'Sri Lanka', pop: 21.9, region: 'SouthAsia', borders: [], blocs: ['Commonwealth'], rivals: [], allies: ['IN', 'CN'], center: [7.9, 80.8] },
  { code: 'MV', name: 'Maldives', pop: 0.5, region: 'SouthAsia', borders: [], blocs: ['Commonwealth'], rivals: [], allies: ['IN'], center: [3.2, 73.2] },
  // ============== East Asia ==============
  { code: 'CN', name: 'China', pop: 1410.7, region: 'EastAsia', borders: ['RU', 'MN', 'KP', 'KZ', 'KG', 'TJ', 'AF', 'PK', 'IN', 'NP', 'BT', 'MM', 'LA', 'VN'], blocs: ['BRICS', 'SCO', 'G20'], rivals: ['US', 'IN', 'JP', 'TW', 'PH', 'VN'], allies: ['RU', 'KP', 'PK', 'IR'], center: [35.9, 104.2], nukes: n('CN') },
  { code: 'MN', name: 'Mongolia', pop: 3.4, region: 'EastAsia', borders: ['RU', 'CN'], blocs: [], rivals: [], allies: ['RU', 'CN'], center: [46.9, 103.8] },
  { code: 'KP', name: 'North Korea', pop: 26.2, region: 'EastAsia', borders: ['CN', 'RU', 'KR'], blocs: [], rivals: ['US', 'KR', 'JP'], allies: ['CN', 'RU'], center: [40.3, 127.5], nukes: n('KP') },
  { code: 'KR', name: 'South Korea', pop: 51.7, region: 'EastAsia', borders: ['KP'], blocs: ['G20', 'West'], rivals: ['KP', 'CN'], allies: ['US', 'JP'], center: [35.9, 127.8] },
  { code: 'JP', name: 'Japan', pop: 123.3, region: 'EastAsia', borders: [], blocs: ['G7', 'West', 'G20'], rivals: ['CN', 'KP', 'RU'], allies: ['US', 'KR', 'AU', 'IN', 'PH'], center: [36.2, 138.3] },
  // ============== Southeast Asia ==============
  { code: 'PH', name: 'Philippines', pop: 117.3, region: 'SoutheastAsia', borders: [], blocs: ['West'], rivals: ['CN'], allies: ['US', 'JP', 'AU'], center: [12.9, 121.8] },
  { code: 'VN', name: 'Vietnam', pop: 98.9, region: 'SoutheastAsia', borders: ['CN', 'LA', 'KH'], blocs: ['ASEAN'], rivals: ['CN'], allies: ['RU', 'US'], center: [14.1, 108.3] },
  { code: 'LA', name: 'Laos', pop: 7.6, region: 'SoutheastAsia', borders: ['CN', 'VN', 'KH', 'TH', 'MM'], blocs: ['ASEAN'], rivals: [], allies: ['CN', 'VN'], center: [19.9, 102.5] },
  { code: 'KH', name: 'Cambodia', pop: 16.9, region: 'SoutheastAsia', borders: ['VN', 'LA', 'TH'], blocs: ['ASEAN'], rivals: [], allies: ['CN'], center: [12.6, 104.9] },
  { code: 'TH', name: 'Thailand', pop: 71.7, region: 'SoutheastAsia', borders: ['MM', 'LA', 'KH', 'MY'], blocs: ['ASEAN'], rivals: [], allies: ['US', 'JP'], center: [15.9, 100.99] },
  { code: 'MM', name: 'Myanmar', pop: 54.6, region: 'SoutheastAsia', borders: ['IN', 'BD', 'CN', 'LA', 'TH'], blocs: ['ASEAN'], rivals: [], allies: ['CN', 'RU'], center: [21.9, 95.96] },
  { code: 'MY', name: 'Malaysia', pop: 34.3, region: 'SoutheastAsia', borders: ['TH', 'ID', 'BN'], blocs: ['ASEAN', 'Commonwealth'], rivals: [], allies: ['CN', 'US'], center: [4.2, 101.97] },
  { code: 'SG', name: 'Singapore', pop: 6.0, region: 'SoutheastAsia', borders: [], blocs: ['ASEAN', 'Commonwealth'], rivals: [], allies: ['US', 'CN', 'GB'], center: [1.4, 103.8] },
  { code: 'ID', name: 'Indonesia', pop: 277.5, region: 'SoutheastAsia', borders: ['MY', 'TL', 'PG'], blocs: ['ASEAN', 'G20'], rivals: [], allies: ['CN', 'US'], center: [-0.8, 113.9] },
  { code: 'BN', name: 'Brunei', pop: 0.5, region: 'SoutheastAsia', borders: ['MY'], blocs: ['ASEAN', 'Commonwealth'], rivals: [], allies: ['GB'], center: [4.5, 114.7] },
  { code: 'TL', name: 'Timor-Leste', pop: 1.4, region: 'SoutheastAsia', borders: ['ID'], blocs: [], rivals: [], allies: ['AU', 'PT'], center: [-8.9, 125.7] },
  // ============== Oceania ==============
  { code: 'AU', name: 'Australia', pop: 26.6, region: 'Oceania', borders: [], blocs: ['NATO', 'G20', 'FiveEyes', 'West', 'Commonwealth'], rivals: ['CN'], allies: ['US', 'GB', 'CA', 'NZ', 'JP', 'PH'], center: [-25.3, 133.8] },
  { code: 'NZ', name: 'New Zealand', pop: 5.2, region: 'Oceania', borders: [], blocs: ['FiveEyes', 'West', 'Commonwealth'], rivals: [], allies: ['US', 'AU', 'GB'], center: [-40.9, 174.9] },
  { code: 'PG', name: 'Papua New Guinea', pop: 10.3, region: 'Oceania', borders: ['ID'], blocs: ['Commonwealth'], rivals: [], allies: ['AU'], center: [-6.3, 143.96] },
  { code: 'FJ', name: 'Fiji', pop: 0.9, region: 'Oceania', borders: [], blocs: ['Commonwealth'], rivals: [], allies: ['AU', 'NZ'], center: [-17.7, 178.1] },
  { code: 'SB', name: 'Solomon Islands', pop: 0.7, region: 'Oceania', borders: [], blocs: ['Commonwealth'], rivals: [], allies: ['CN', 'AU'], center: [-9.6, 160.2] },
  { code: 'VU', name: 'Vanuatu', pop: 0.3, region: 'Oceania', borders: [], blocs: ['Commonwealth'], rivals: [], allies: [], center: [-15.4, 166.96] },
  { code: 'WS', name: 'Samoa', pop: 0.2, region: 'Oceania', borders: [], blocs: ['Commonwealth'], rivals: [], allies: ['NZ'], center: [-13.8, -172.1] },
  { code: 'TO', name: 'Tonga', pop: 0.1, region: 'Oceania', borders: [], blocs: ['Commonwealth'], rivals: [], allies: ['NZ', 'AU'], center: [-21.2, -175.2] },
  { code: 'KI', name: 'Kiribati', pop: 0.1, region: 'Oceania', borders: [], blocs: ['Commonwealth'], rivals: [], allies: ['AU', 'NZ'], center: [-3.4, -168.7] },
  { code: 'TV', name: 'Tuvalu', pop: 0.01, region: 'Oceania', borders: [], blocs: ['Commonwealth'], rivals: [], allies: [], center: [-7.1, 177.6] },
  { code: 'NR', name: 'Nauru', pop: 0.01, region: 'Oceania', borders: [], blocs: ['Commonwealth'], rivals: [], allies: ['AU'], center: [-0.5, 166.9] },
  { code: 'PW', name: 'Palau', pop: 0.02, region: 'Oceania', borders: [], blocs: [], rivals: [], allies: ['US'], center: [7.5, 134.6] },
  { code: 'FM', name: 'Micronesia', pop: 0.1, region: 'Oceania', borders: [], blocs: [], rivals: [], allies: ['US'], center: [7.4, 150.6] },
  { code: 'MH', name: 'Marshall Islands', pop: 0.04, region: 'Oceania', borders: [], blocs: [], rivals: [], allies: ['US'], center: [7.1, 171.2] },
  // ============== Western Sahara (UN observer; included for map gap; not playable count) ==============
  // Intentionally not included in playable set; Natural Earth includes it under code 'EH' but it is NOT a UN member state.
];

// ---- Sanity helpers ---------------------------------------------------------

export const COUNTRY_BY_CODE: Record<string, CountryDef> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c])
);

export function getCountry(code: string): CountryDef | undefined {
  return COUNTRY_BY_CODE[code];
}

// Sorted helpers for UI lists
export const COUNTRIES_BY_NAME = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
