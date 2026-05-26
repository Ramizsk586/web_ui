// 118 Elements of the Periodic Table
export interface PeriodicElement {
  number: number;
  symbol: string;
  name: string;
  weight: number;
  period: number;
  group: number; // 1 to 18 (0 for Lanthanides/Actinides)
  category: 'alkali' | 'alkaline-earth' | 'transition-metal' | 'post-transition' | 'metalloid' | 'reactive-nonmetal' | 'noble-gas' | 'halogen' | 'lanthanide' | 'actinide';
  color: string;
  state: 'gas' | 'liquid' | 'solid' | 'synthetic';
}

export const PERIODIC_TABLE: PeriodicElement[] = [
  // Period 1
  { number: 1, symbol: 'H', name: 'Hydrogen', weight: 1.008, period: 1, group: 1, category: 'reactive-nonmetal', color: '#0ea5e9', state: 'gas' },
  { number: 2, symbol: 'He', name: 'Helium', weight: 4.0026, period: 1, group: 18, category: 'noble-gas', color: '#a855f7', state: 'gas' },
  // Period 2
  { number: 3, symbol: 'Li', name: 'Lithium', weight: 6.94, period: 2, group: 1, category: 'alkali', color: '#f43f5e', state: 'solid' },
  { number: 4, symbol: 'Be', name: 'Beryllium', weight: 9.0122, period: 2, group: 2, category: 'alkaline-earth', color: '#f97316', state: 'solid' },
  { number: 5, symbol: 'B', name: 'Boron', weight: 10.81, period: 2, group: 13, category: 'metalloid', color: '#eab308', state: 'solid' },
  { number: 6, symbol: 'C', name: 'Carbon', weight: 12.011, period: 2, group: 14, category: 'reactive-nonmetal', color: '#a1a1aa', state: 'solid' },
  { number: 7, symbol: 'N', name: 'Nitrogen', weight: 14.007, period: 2, group: 15, category: 'reactive-nonmetal', color: '#6366f1', state: 'gas' },
  { number: 8, symbol: 'O', name: 'Oxygen', weight: 15.999, period: 2, group: 16, category: 'reactive-nonmetal', color: '#ef4444', state: 'gas' },
  { number: 9, symbol: 'F', name: 'Fluorine', weight: 18.998, period: 2, group: 17, category: 'halogen', color: '#10b981', state: 'gas' },
  { number: 10, symbol: 'Ne', name: 'Neon', weight: 20.180, period: 2, group: 18, category: 'noble-gas', color: '#a855f7', state: 'gas' },
  // Period 3
  { number: 11, symbol: 'Na', name: 'Sodium', weight: 22.990, period: 3, group: 1, category: 'alkali', color: '#f43f5e', state: 'solid' },
  { number: 12, symbol: 'Mg', name: 'Magnesium', weight: 24.305, period: 3, group: 2, category: 'alkaline-earth', color: '#f97316', state: 'solid' },
  { number: 13, symbol: 'Al', name: 'Aluminium', weight: 26.982, period: 3, group: 13, category: 'post-transition', color: '#84cc16', state: 'solid' },
  { number: 14, symbol: 'Si', name: 'Silicon', weight: 28.085, period: 3, group: 14, category: 'metalloid', color: '#eab308', state: 'solid' },
  { number: 15, symbol: 'P', name: 'Phosphorus', weight: 30.974, period: 3, group: 15, category: 'reactive-nonmetal', color: '#0ea5e9', state: 'solid' },
  { number: 16, symbol: 'S', name: 'Sulfur', weight: 32.06, period: 3, group: 16, category: 'reactive-nonmetal', color: '#0ea5e9', state: 'solid' },
  { number: 17, symbol: 'Cl', name: 'Chlorine', weight: 35.45, period: 3, group: 17, category: 'halogen', color: '#10b981', state: 'gas' },
  { number: 18, symbol: 'Ar', name: 'Argon', weight: 39.948, period: 3, group: 18, category: 'noble-gas', color: '#a855f7', state: 'gas' },
  // Period 4
  { number: 19, symbol: 'K', name: 'Potassium', weight: 39.098, period: 4, group: 1, category: 'alkali', color: '#f43f5e', state: 'solid' },
  { number: 20, symbol: 'Ca', name: 'Calcium', weight: 40.078, period: 4, group: 2, category: 'alkaline-earth', color: '#f97316', state: 'solid' },
  { number: 21, symbol: 'Sc', name: 'Scandium', weight: 44.956, period: 4, group: 3, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 22, symbol: 'Ti', name: 'Titanium', weight: 47.867, period: 4, group: 4, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 23, symbol: 'V', name: 'Vanadium', weight: 50.942, period: 4, group: 5, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 24, symbol: 'Cr', name: 'Chromium', weight: 51.996, period: 4, group: 6, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 25, symbol: 'Mn', name: 'Manganese', weight: 54.938, period: 4, group: 7, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 26, symbol: 'Fe', name: 'Iron', weight: 55.845, period: 4, group: 8, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 27, symbol: 'Co', name: 'Cobalt', weight: 58.933, period: 4, group: 9, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 28, symbol: 'Ni', name: 'Nickel', weight: 58.693, period: 4, group: 10, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 29, symbol: 'Cu', name: 'Copper', weight: 63.546, period: 4, group: 11, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 30, symbol: 'Zn', name: 'Zinc', weight: 65.38, period: 4, group: 12, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 31, symbol: 'Ga', name: 'Gallium', weight: 69.723, period: 4, group: 13, category: 'post-transition', color: '#84cc16', state: 'solid' },
  { number: 32, symbol: 'Ge', name: 'Germanium', weight: 72.630, period: 4, group: 14, category: 'metalloid', color: '#eab308', state: 'solid' },
  { number: 33, symbol: 'As', name: 'Arsenic', weight: 74.922, period: 4, group: 15, category: 'metalloid', color: '#eab308', state: 'solid' },
  { number: 34, symbol: 'Se', name: 'Selenium', weight: 78.971, period: 4, group: 16, category: 'reactive-nonmetal', color: '#0ea5e9', state: 'solid' },
  { number: 35, symbol: 'Br', name: 'Bromine', weight: 79.904, period: 4, group: 17, category: 'halogen', color: '#10b981', state: 'liquid' },
  { number: 36, symbol: 'Kr', name: 'Krypton', weight: 83.798, period: 4, group: 18, category: 'noble-gas', color: '#a855f7', state: 'gas' },
  // Period 5
  { number: 37, symbol: 'Rb', name: 'Rubidium', weight: 85.468, period: 5, group: 1, category: 'alkali', color: '#f43f5e', state: 'solid' },
  { number: 38, symbol: 'Sr', name: 'Strontium', weight: 87.62, period: 5, group: 2, category: 'alkaline-earth', color: '#f97316', state: 'solid' },
  { number: 39, symbol: 'Y', name: 'Yttrium', weight: 88.906, period: 5, group: 3, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 40, symbol: 'Zr', name: 'Zirconium', weight: 91.224, period: 5, group: 4, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 41, symbol: 'Nb', name: 'Niobium', weight: 92.906, period: 5, group: 5, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 42, symbol: 'Mo', name: 'Molybdenum', weight: 95.95, period: 5, group: 6, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 43, symbol: 'Tc', name: 'Technetium', weight: 98, period: 5, group: 7, category: 'transition-metal', color: '#06b6d4', state: 'synthetic' },
  { number: 44, symbol: 'Ru', name: 'Ruthenium', weight: 101.07, period: 5, group: 8, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 45, symbol: 'Rh', name: 'Rhodium', weight: 102.91, period: 5, group: 9, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 46, symbol: 'Pd', name: 'Palladium', weight: 106.42, period: 5, group: 10, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 47, symbol: 'Ag', name: 'Silver', weight: 107.87, period: 5, group: 11, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 48, symbol: 'Cd', name: 'Cadmium', weight: 112.41, period: 5, group: 12, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 49, symbol: 'In', name: 'Indium', weight: 114.82, period: 5, group: 13, category: 'post-transition', color: '#84cc16', state: 'solid' },
  { number: 50, symbol: 'Sn', name: 'Tin', weight: 118.71, period: 5, group: 14, category: 'post-transition', color: '#84cc16', state: 'solid' },
  { number: 51, symbol: 'Sb', name: 'Antimony', weight: 121.76, period: 5, group: 15, category: 'metalloid', color: '#eab308', state: 'solid' },
  { number: 52, symbol: 'Te', name: 'Tellurium', weight: 127.60, period: 5, group: 16, category: 'metalloid', color: '#eab308', state: 'solid' },
  { number: 53, symbol: 'I', name: 'Iodine', weight: 126.90, period: 5, group: 17, category: 'halogen', color: '#10b981', state: 'solid' },
  { number: 54, symbol: 'Xe', name: 'Xenon', weight: 131.29, period: 5, group: 18, category: 'noble-gas', color: '#a855f7', state: 'gas' },
  // Period 6 (excluding Lanthanides)
  { number: 55, symbol: 'Cs', name: 'Caesium', weight: 132.91, period: 6, group: 1, category: 'alkali', color: '#f43f5e', state: 'liquid' },
  { number: 56, symbol: 'Ba', name: 'Barium', weight: 137.33, period: 6, group: 2, category: 'alkaline-earth', color: '#f97316', state: 'solid' },
  // Lanthanides Group 3
  { number: 57, symbol: 'La', name: 'Lanthanum', weight: 138.91, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 58, symbol: 'Ce', name: 'Cerium', weight: 140.12, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 59, symbol: 'Pr', name: 'Praseodymium', weight: 140.91, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 60, symbol: 'Nd', name: 'Neodymium', weight: 144.24, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 61, symbol: 'Pm', name: 'Promethium', weight: 145, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'synthetic' },
  { number: 62, symbol: 'Sm', name: 'Samarium', weight: 150.36, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 63, symbol: 'Eu', name: 'Europium', weight: 151.96, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 64, symbol: 'Gd', name: 'Gadolinium', weight: 157.25, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 65, symbol: 'Tb', name: 'Terbium', weight: 158.93, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 66, symbol: 'Dy', name: 'Dysprosium', weight: 162.50, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 67, symbol: 'Ho', name: 'Holmium', weight: 164.93, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 68, symbol: 'Er', name: 'Erbium', weight: 167.26, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 69, symbol: 'Tm', name: 'Thulium', weight: 168.93, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 70, symbol: 'Yb', name: 'Ytterbium', weight: 173.05, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  { number: 71, symbol: 'Lu', name: 'Lutetium', weight: 174.97, period: 6, group: 0, category: 'lanthanide', color: '#ec4899', state: 'solid' },
  // Rest Period 6
  { number: 72, symbol: 'Hf', name: 'Hafnium', weight: 178.49, period: 6, group: 4, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 73, symbol: 'Ta', name: 'Tantalum', weight: 180.95, period: 6, group: 5, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 74, symbol: 'W', name: 'Tungsten', weight: 183.84, period: 6, group: 6, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 75, symbol: 'Re', name: 'Rhenium', weight: 186.21, period: 6, group: 7, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 76, symbol: 'Os', name: 'Osmium', weight: 190.23, period: 6, group: 8, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 77, symbol: 'Ir', name: 'Iridium', weight: 192.22, period: 6, group: 9, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 78, symbol: 'Pt', name: 'Platinum', weight: 195.08, period: 6, group: 10, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 79, symbol: 'Au', name: 'Gold', weight: 196.97, period: 6, group: 11, category: 'transition-metal', color: '#06b6d4', state: 'solid' },
  { number: 80, symbol: 'Hg', name: 'Mercury', weight: 200.59, period: 6, group: 12, category: 'post-transition', color: '#84cc16', state: 'liquid' },
  { number: 81, symbol: 'Tl', name: 'Thallium', weight: 204.38, period: 6, group: 13, category: 'post-transition', color: '#84cc16', state: 'solid' },
  { number: 82, symbol: 'Pb', name: 'Lead', weight: 207.2, period: 6, group: 14, category: 'post-transition', color: '#84cc16', state: 'solid' },
  { number: 83, symbol: 'Bi', name: 'Bismuth', weight: 208.98, period: 6, group: 15, category: 'post-transition', color: '#84cc16', state: 'solid' },
  { number: 84, symbol: 'Po', name: 'Polonium', weight: 209, period: 6, group: 16, category: 'metalloid', color: '#eab308', state: 'solid' },
  { number: 85, symbol: 'At', name: 'Astatine', weight: 210, period: 6, group: 17, category: 'halogen', color: '#10b981', state: 'solid' },
  { number: 86, symbol: 'Rn', name: 'Radon', weight: 222, period: 6, group: 18, category: 'noble-gas', color: '#a855f7', state: 'gas' },
  // Period 7 (including Actinides)
  { number: 87, symbol: 'Fr', name: 'Francium', weight: 223, period: 7, group: 1, category: 'alkali', color: '#f43f5e', state: 'solid' },
  { number: 88, symbol: 'Ra', name: 'Radium', weight: 226, period: 7, group: 2, category: 'alkaline-earth', color: '#f97316', state: 'solid' },
  // Actinides Group 3
  { number: 89, symbol: 'Ac', name: 'Actinium', weight: 227, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'solid' },
  { number: 90, symbol: 'Th', name: 'Thorium', weight: 232.04, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'solid' },
  { number: 91, symbol: 'Pa', name: 'Protactinium', weight: 231.04, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'solid' },
  { number: 92, symbol: 'U', name: 'Uranium', weight: 238.03, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'solid' },
  { number: 93, symbol: 'Np', name: 'Neptunium', weight: 237, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'synthetic' },
  { number: 94, symbol: 'Pu', name: 'Plutonium', weight: 244, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'synthetic' },
  { number: 95, symbol: 'Am', name: 'Americium', weight: 243, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'synthetic' },
  { number: 96, symbol: 'Cm', name: 'Curium', weight: 247, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'synthetic' },
  { number: 97, symbol: 'Bk', name: 'Berkelium', weight: 247, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'synthetic' },
  { number: 98, symbol: 'Cf', name: 'Californium', weight: 251, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'synthetic' },
  { number: 99, symbol: 'Es', name: 'Einsteinium', weight: 252, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'synthetic' },
  { number: 100, symbol: 'Fm', name: 'Fermium', weight: 257, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'synthetic' },
  { number: 101, symbol: 'Md', name: 'Mendelevium', weight: 258, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'synthetic' },
  { number: 102, symbol: 'No', name: 'Nobelium', weight: 259, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'synthetic' },
  { number: 103, symbol: 'Lr', name: 'Lawrencium', weight: 262, period: 7, group: 0, category: 'actinide', color: '#fb7185', state: 'synthetic' },
  // Rest Period 7
  { number: 104, symbol: 'Rf', name: 'Rutherfordium', weight: 267, period: 7, group: 4, category: 'transition-metal', color: '#06b6d4', state: 'synthetic' },
  { number: 105, symbol: 'Db', name: 'Dubnium', weight: 268, period: 7, group: 5, category: 'transition-metal', color: '#06b6d4', state: 'synthetic' },
  { number: 106, symbol: 'Sg', name: 'Seaborgium', weight: 271, period: 7, group: 6, category: 'transition-metal', color: '#06b6d4', state: 'synthetic' },
  { number: 107, symbol: 'Bh', name: 'Bohrium', weight: 270, period: 7, group: 7, category: 'transition-metal', color: '#06b6d4', state: 'synthetic' },
  { number: 108, symbol: 'Hs', name: 'Hassium', weight: 277, period: 7, group: 8, category: 'transition-metal', color: '#06b6d4', state: 'synthetic' },
  { number: 109, symbol: 'Mt', name: 'Meitnerium', weight: 278, period: 7, group: 9, category: 'transition-metal', color: '#06b6d4', state: 'synthetic' },
  { number: 110, symbol: 'Ds', name: 'Darmstadtium', weight: 281, period: 7, group: 10, category: 'transition-metal', color: '#06b6d4', state: 'synthetic' },
  { number: 111, symbol: 'Rg', name: 'Roentgenium', weight: 282, period: 7, group: 11, category: 'transition-metal', color: '#06b6d4', state: 'synthetic' },
  { number: 112, symbol: 'Cn', name: 'Copernicium', weight: 285, period: 7, group: 12, category: 'post-transition', color: '#84cc16', state: 'synthetic' },
  { number: 113, symbol: 'Nh', name: 'Nihonium', weight: 286, period: 7, group: 13, category: 'post-transition', color: '#84cc16', state: 'synthetic' },
  { number: 114, symbol: 'Fl', name: 'Flerovium', weight: 289, period: 7, group: 14, category: 'post-transition', color: '#84cc16', state: 'synthetic' },
  { number: 115, symbol: 'Mc', name: 'Moscovium', weight: 290, period: 7, group: 15, category: 'post-transition', color: '#84cc16', state: 'synthetic' },
  { number: 116, symbol: 'Lv', name: 'Livermorium', weight: 293, period: 7, group: 16, category: 'post-transition', color: '#84cc16', state: 'synthetic' },
  { number: 117, symbol: 'Ts', name: 'Tennessine', weight: 294, period: 7, group: 17, category: 'halogen', color: '#10b981', state: 'synthetic' },
  { number: 118, symbol: 'Og', name: 'Oganesson', weight: 294, period: 7, group: 18, category: 'noble-gas', color: '#a855f7', state: 'synthetic' }
];

export const CATEGORIES_LABELS: Record<string, string> = {
  'alkali': 'Alkali Metals',
  'alkaline-earth': 'Alkaline Earths',
  'transition-metal': 'Transition Metals',
  'post-transition': 'Post-Transition',
  'metalloid': 'Metalloids',
  'reactive-nonmetal': 'Reactive Nonmetals',
  'halogen': 'Halogens',
  'noble-gas': 'Noble Gases',
  'lanthanide': 'Lanthanides',
  'actinide': 'Actinides'
};
