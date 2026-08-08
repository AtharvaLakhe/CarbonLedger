// MOCK: no BEE/CCTS API exists publicly — every facility, sensor and order below is
// synthetic but modelled on real CCTS obligated-entity sectors and intensity targets.

export interface Sensor {
  id: string
  label: string
  unit: string
  value: number
  base: number
  vol: number
  kind: 'stack' | 'fuel' | 'power' | 'flow'
}

export interface Facility {
  id: string
  name: string
  operator: string
  sector: string
  state: string
  lat: number // 0-100 normalised onto the schematic map
  lng: number
  targetIntensity: number // tCO2e / t product — CCTS notified target
  actualIntensity: number
  output: number // t product this compliance year
  cap: number // tCO2e allowance
  emitted: number
  credits: number // CCCs held
  sensors: Sensor[]
  series: number[]
  lastReport: string
}

const s = (id: string, label: string, unit: string, base: number, vol: number, kind: Sensor['kind']): Sensor =>
  ({ id, label, unit, value: base, base, vol, kind })

export const FACILITIES: Facility[] = [
  {
    id: 'F-IN-KA-0117', name: 'Vijayanagar Works', operator: 'Bharat Steel Ltd', sector: 'Iron & Steel',
    state: 'Karnataka', lat: 68, lng: 38, targetIntensity: 2.24, actualIntensity: 2.41,
    output: 8_420_000, cap: 18_860_800, emitted: 20_292_200, credits: 0,
    sensors: [
      s('CEMS-01', 'Blast furnace stack CO2', '%vol', 22.4, 0.9, 'stack'),
      s('CEMS-02', 'Sinter plant stack CO2', '%vol', 15.1, 0.7, 'stack'),
      s('FUEL-01', 'Coking coal feed', 't/h', 412, 14, 'fuel'),
      s('PWR-01', 'Grid import', 'MW', 386, 11, 'power'),
    ],
    series: [], lastReport: 'Q1 FY26 · verified',
  },
  {
    id: 'F-IN-GJ-0244', name: 'Jamnagar Refinery Cluster', operator: 'Saurashtra Petrochem', sector: 'Petroleum Refinery',
    state: 'Gujarat', lat: 42, lng: 20, targetIntensity: 0.91, actualIntensity: 0.84,
    output: 33_100_000, cap: 30_121_000, emitted: 27_804_000, credits: 1_240,
    sensors: [
      s('CEMS-11', 'CDU heater stack CO2', '%vol', 11.8, 0.5, 'stack'),
      s('FLR-01', 'Flare gas flow', 'km3/h', 4.2, 0.35, 'flow'),
      s('FUEL-11', 'Refinery fuel gas', 't/h', 188, 7, 'fuel'),
      s('PWR-11', 'Captive cogen', 'MW', 640, 18, 'power'),
    ],
    series: [], lastReport: 'Q1 FY26 · verified',
  },
  {
    id: 'F-IN-MP-0392', name: 'Satna Cement Line-3', operator: 'Vindhya Cement', sector: 'Cement',
    state: 'Madhya Pradesh', lat: 42, lng: 44, targetIntensity: 0.58, actualIntensity: 0.61,
    output: 6_900_000, cap: 4_002_000, emitted: 4_209_000, credits: 0,
    sensors: [
      s('CEMS-21', 'Kiln preheater CO2', '%vol', 27.6, 1.1, 'stack'),
      s('FUEL-21', 'Pet-coke feed', 't/h', 96, 4, 'fuel'),
      s('FLOW-21', 'Clinker throughput', 't/h', 780, 22, 'flow'),
      s('PWR-21', 'Mill drive load', 'MW', 44, 2.2, 'power'),
    ],
    series: [], lastReport: 'Q1 FY26 · pending',
  },
  {
    id: 'F-IN-OD-0508', name: 'Angul Aluminium Smelter', operator: 'Kalinga Metals', sector: 'Aluminium',
    state: 'Odisha', lat: 52, lng: 58, targetIntensity: 14.8, actualIntensity: 13.9,
    output: 1_120_000, cap: 16_576_000, emitted: 15_568_000, credits: 3_410,
    sensors: [
      s('CEMS-31', 'Pot-line anode CO2', '%vol', 8.4, 0.4, 'stack'),
      s('PWR-31', 'Pot-line DC load', 'MW', 1_240, 26, 'power'),
      s('FUEL-31', 'Anode bake fuel', 't/h', 31, 1.4, 'fuel'),
      s('FLOW-31', 'Alumina feed', 't/h', 260, 9, 'flow'),
    ],
    series: [], lastReport: 'Q1 FY26 · verified',
  },
  {
    id: 'F-IN-UP-0631', name: 'Dadri Fertiliser Complex', operator: 'Ganga Agrichem', sector: 'Fertiliser',
    state: 'Uttar Pradesh', lat: 30, lng: 40, targetIntensity: 1.62, actualIntensity: 1.71,
    output: 2_400_000, cap: 3_888_000, emitted: 4_104_000, credits: 0,
    sensors: [
      s('CEMS-41', 'Reformer stack CO2', '%vol', 18.9, 0.8, 'stack'),
      s('FUEL-41', 'Natural gas feed', 'km3/h', 92, 3.5, 'fuel'),
      s('FLOW-41', 'Ammonia output', 't/h', 118, 4, 'flow'),
      s('PWR-41', 'Compressor load', 'MW', 78, 3, 'power'),
    ],
    series: [], lastReport: 'Q4 FY25 · verified',
  },
  {
    id: 'F-IN-TN-0774', name: 'Tuticorin Chlor-Alkali', operator: 'Coromandel Chemicals', sector: 'Chlor-Alkali',
    state: 'Tamil Nadu', lat: 84, lng: 42, targetIntensity: 0.44, actualIntensity: 0.39,
    output: 1_850_000, cap: 814_000, emitted: 721_500, credits: 890,
    sensors: [
      s('PWR-51', 'Membrane cell load', 'MW', 212, 6, 'power'),
      s('CEMS-51', 'Boiler stack CO2', '%vol', 9.2, 0.5, 'stack'),
      s('FLOW-51', 'Brine circulation', 'm3/h', 1_480, 40, 'flow'),
      s('FUEL-51', 'Boiler fuel oil', 't/h', 12.4, 0.6, 'fuel'),
    ],
    series: [], lastReport: 'Q1 FY26 · verified',
  },
  {
    id: 'F-IN-CT-0819', name: 'Korba Thermal Station', operator: 'Mahanadi Power', sector: 'Thermal Power',
    state: 'Chhattisgarh', lat: 46, lng: 52, targetIntensity: 0.82, actualIntensity: 0.88,
    output: 21_400_000, cap: 17_548_000, emitted: 18_832_000, credits: 0,
    sensors: [
      s('CEMS-61', 'Unit-4 stack CO2', '%vol', 13.6, 0.6, 'stack'),
      s('FUEL-61', 'Pulverised coal', 't/h', 1_180, 32, 'fuel'),
      s('PWR-61', 'Gross generation', 'MW', 2_100, 48, 'power'),
      s('FLOW-61', 'Flue gas flow', 'km3/h', 8.9, 0.4, 'flow'),
    ],
    series: [], lastReport: 'Q1 FY26 · pending',
  },
  {
    id: 'F-IN-JH-0902', name: 'Jamshedpur Pulp & Paper', operator: 'Subarnarekha Paper', sector: 'Pulp & Paper',
    state: 'Jharkhand', lat: 44, lng: 60, targetIntensity: 1.06, actualIntensity: 0.97,
    output: 940_000, cap: 996_400, emitted: 911_800, credits: 520,
    sensors: [
      s('CEMS-71', 'Recovery boiler CO2', '%vol', 12.1, 0.5, 'stack'),
      s('FUEL-71', 'Black liquor solids', 't/h', 64, 2.4, 'fuel'),
      s('PWR-71', 'Cogen export', 'MW', 38, 1.6, 'power'),
      s('FLOW-71', 'Pulp line flow', 't/h', 108, 3.6, 'flow'),
    ],
    series: [], lastReport: 'Q1 FY26 · verified',
  },
]

export interface Order {
  id: string
  side: 'bid' | 'ask'
  price: number
  qty: number
  org: string
  ts: number
}

export const ORG_NAMES = [
  'Bharat Steel Ltd', 'Saurashtra Petrochem', 'Vindhya Cement', 'Kalinga Metals',
  'Ganga Agrichem', 'Coromandel Chemicals', 'Mahanadi Power', 'Subarnarekha Paper',
  'Deccan Renewables', 'Aravalli Offsets', 'Nilgiri Green Desk', 'Konkan Carbon Desk',
]

export const VERIFIERS = [
  { id: 'ACV-011', name: 'Bharat Assessment Services', scope: 'Iron & Steel · Cement', accred: 'BEE/ACV/2026/011' },
  { id: 'ACV-027', name: 'Meridian Carbon Assurance', scope: 'Refinery · Petrochem', accred: 'BEE/ACV/2026/027' },
  { id: 'ACV-044', name: 'Southern Verification Bureau', scope: 'Power · Aluminium', accred: 'BEE/ACV/2026/044' },
]

export const SECTOR_COLOR: Record<string, string> = {
  'Iron & Steel': '#ff7a45',
  'Petroleum Refinery': '#5aa2ff',
  'Cement': '#ffc24b',
  'Aluminium': '#a78bfa',
  'Fertiliser': '#2fe0a4',
  'Chlor-Alkali': '#4dd0e1',
  'Thermal Power': '#ff4d5e',
  'Pulp & Paper': '#94a3b8',
}

export const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })

export const compact = (n: number) => {
  if (Math.abs(n) >= 1e7) return (n / 1e7).toFixed(2) + ' Cr'
  if (Math.abs(n) >= 1e5) return (n / 1e5).toFixed(2) + ' L'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return n.toFixed(0)
}
