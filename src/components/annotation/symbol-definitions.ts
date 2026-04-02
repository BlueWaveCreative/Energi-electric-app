export interface ElectricalSymbol {
  name: string
  label: string
  category: string
  svgPath: string
  width: number
  height: number
  defaultColor: string
}

export interface SymbolCategory {
  name: string
  label: string
}

export const SYMBOL_CATEGORIES: SymbolCategory[] = [
  { name: 'Outlets', label: 'Outlets' },
  { name: 'Switches', label: 'Switches' },
  { name: 'Panels', label: 'Panels' },
  { name: 'Boxes', label: 'Boxes' },
  { name: 'Lighting', label: 'Lighting' },
  { name: 'Wiring', label: 'Wiring' },
]

export const SYMBOLS: ElectricalSymbol[] = [
  // Outlets
  {
    name: 'standard-outlet',
    label: 'Standard Outlet',
    category: 'Outlets',
    svgPath: 'M 20 0 A 20 20 0 1 0 20 40 A 20 20 0 1 0 20 0 M 12 16 L 12 24 M 28 16 L 28 24',
    width: 40,
    height: 40,
    defaultColor: '#000000',
  },
  {
    name: 'gfci-outlet',
    label: 'GFCI Outlet',
    category: 'Outlets',
    svgPath: 'M 20 0 A 20 20 0 1 0 20 40 A 20 20 0 1 0 20 0 M 12 16 L 12 24 M 28 16 L 28 24 M 8 32 L 32 32',
    width: 40,
    height: 40,
    defaultColor: '#000000',
  },
  {
    name: '220v-outlet',
    label: '220V Outlet',
    category: 'Outlets',
    svgPath: 'M 20 0 A 20 20 0 1 0 20 40 A 20 20 0 1 0 20 0 M 12 14 L 12 22 M 28 14 L 28 22 M 20 24 L 20 32',
    width: 40,
    height: 40,
    defaultColor: '#cc0000',
  },
  // Switches
  {
    name: 'single-pole-switch',
    label: 'Single Pole',
    category: 'Switches',
    svgPath: 'M 0 20 L 30 20 M 30 20 L 15 5 M 30 16 L 30 24',
    width: 35,
    height: 25,
    defaultColor: '#000000',
  },
  {
    name: '3-way-switch',
    label: '3-Way',
    category: 'Switches',
    svgPath: 'M 0 20 L 30 20 M 30 20 L 15 5 M 30 16 L 30 24 M 26 16 L 26 24',
    width: 35,
    height: 25,
    defaultColor: '#000000',
  },
  {
    name: 'dimmer-switch',
    label: 'Dimmer',
    category: 'Switches',
    svgPath: 'M 0 20 L 30 20 M 30 20 L 15 5 M 25 10 L 35 10',
    width: 40,
    height: 25,
    defaultColor: '#000000',
  },
  // Panels
  {
    name: 'main-panel',
    label: 'Main Panel',
    category: 'Panels',
    svgPath: 'M 0 0 L 40 0 L 40 50 L 0 50 Z M 0 10 L 40 10 M 10 10 L 10 50 M 30 10 L 30 50 M 10 20 L 30 20 M 10 30 L 30 30 M 10 40 L 30 40',
    width: 40,
    height: 50,
    defaultColor: '#000000',
  },
  {
    name: 'sub-panel',
    label: 'Sub-Panel',
    category: 'Panels',
    svgPath: 'M 0 0 L 30 0 L 30 40 L 0 40 Z M 0 8 L 30 8 M 8 8 L 8 40 M 22 8 L 22 40 M 8 18 L 22 18 M 8 28 L 22 28',
    width: 30,
    height: 40,
    defaultColor: '#000000',
  },
  // Boxes
  {
    name: 'junction-box',
    label: 'Junction Box',
    category: 'Boxes',
    svgPath: 'M 5 0 L 35 0 L 40 5 L 40 35 L 35 40 L 5 40 L 0 35 L 0 5 Z M 10 10 L 30 30 M 30 10 L 10 30',
    width: 40,
    height: 40,
    defaultColor: '#000000',
  },
  // Lighting
  {
    name: 'recessed-light',
    label: 'Recessed',
    category: 'Lighting',
    svgPath: 'M 20 0 A 20 20 0 1 0 20 40 A 20 20 0 1 0 20 0 M 8 8 L 32 32 M 32 8 L 8 32',
    width: 40,
    height: 40,
    defaultColor: '#000000',
  },
  {
    name: 'surface-light',
    label: 'Surface Mount',
    category: 'Lighting',
    svgPath: 'M 20 0 A 20 20 0 1 0 20 40 A 20 20 0 1 0 20 0 M 10 20 L 30 20 M 20 10 L 20 30',
    width: 40,
    height: 40,
    defaultColor: '#000000',
  },
  {
    name: 'fluorescent-light',
    label: 'Fluorescent',
    category: 'Lighting',
    svgPath: 'M 0 5 L 60 5 L 60 25 L 0 25 Z M 10 5 L 10 25 M 50 5 L 50 25',
    width: 60,
    height: 30,
    defaultColor: '#000000',
  },
  // Wiring
  {
    name: 'wire-run',
    label: 'Wire Run',
    category: 'Wiring',
    svgPath: 'M 0 10 L 60 10',
    width: 60,
    height: 20,
    defaultColor: '#000000',
  },
]

export function getSymbolByName(name: string): ElectricalSymbol | undefined {
  return SYMBOLS.find((s) => s.name === name)
}

export function getSymbolsByCategory(category: string): ElectricalSymbol[] {
  return SYMBOLS.filter((s) => s.category === category)
}

// Color presets for wire/circuit coding
export const WIRE_COLORS = [
  { name: 'Black (120V)', color: '#000000' },
  { name: 'Red (220V)', color: '#cc0000' },
  { name: 'Blue (Low Voltage)', color: '#0066cc' },
  { name: 'Green (Ground)', color: '#009933' },
  { name: 'Orange (Signal)', color: '#ff6600' },
  { name: 'White (Neutral)', color: '#999999' },
]
