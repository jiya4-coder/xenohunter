export interface SampleNotebook {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  chapter: string;
  description: string;
  thumbnailSvg: string;
  defaultData: any;
}

export const SAMPLE_NOTEBOOKS: SampleNotebook[] = [
  {
    id: 'science',
    title: 'Physics: Motion & Friction Copy',
    subject: 'Science (Physics)',
    classLevel: 'Class 9',
    chapter: 'Force, Pressure & Friction',
    description: 'Handwritten classwork copy with force equations, pressure formula (P = F/A), ball bearings drawing, and 3 practice problems.',
    thumbnailSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520" fill="%23fcfbfa"><rect width="100%" height="100%" fill="%23f7f5ef" /><line x1="60" y1="0" x2="60" y2="520" stroke="%23fca5a5" stroke-width="2" /><g stroke="%23cbd5e1" stroke-width="1">${Array.from({ length: 18 }).map((_, i) => `<line x1="0" y1="${50 + i * 25}" x2="400" y2="${50 + i * 25}" />`).join('')}</g><text x="75" y="42" font-family="cursive, serif" font-size="14" font-weight="bold" fill="%231e3a8a">Ch-8: Force &amp; Pressure (Classwork)</text><text x="75" y="72" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">1. Pressure (P) = Force / Area [SI unit: Pa]</text><text x="75" y="97" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">Q1: F = 150 N, A = 0.05 m². Find P.</text><text x="75" y="122" font-family="cursive, sans-serif" font-size="11" fill="%232563eb">   Ans: P = 150 / 0.05 = 3000 Pa (N/m²)</text><text x="75" y="147" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">2. Friction: Rolling &lt; Sliding &lt; Static</text><text x="75" y="172" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">Q2: Why use ball bearings in fans &amp; cycles?</text><text x="75" y="197" font-family="cursive, sans-serif" font-size="11" fill="%232563eb">   Ans: Converts sliding friction into rolling friction!</text><circle cx="280" cy="270" r="30" fill="none" stroke="%233b82f6" stroke-width="2" stroke-dasharray="4,4"/><circle cx="280" cy="270" r="12" fill="%2393c5fd"/><text x="250" y="320" font-family="sans-serif" font-size="10" fill="%23475569">[Ball Bearing Diagram]</text><text x="75" y="370" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">Q3: F1 = 20 N (East), F2 = 12 N (West).</text><text x="75" y="395" font-family="cursive, sans-serif" font-size="11" fill="%232563eb">   F_net = 20 - 12 = 8 N (East)</text></svg>`,
    defaultData: null,
  },
  {
    id: 'maths',
    title: 'Maths: Polynomials Copy',
    subject: 'Mathematics',
    classLevel: 'Class 9',
    chapter: 'Factorisation of Polynomials',
    description: 'Step-by-step middle term splitting for quadratic expressions and calculating zeroes.',
    thumbnailSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520" fill="%23fcfbfa"><rect width="100%" height="100%" fill="%23f7f5ef" /><line x1="60" y1="0" x2="60" y2="520" stroke="%23fca5a5" stroke-width="2" /><g stroke="%23cbd5e1" stroke-width="1">${Array.from({ length: 18 }).map((_, i) => `<line x1="0" y1="${50 + i * 25}" x2="400" y2="${50 + i * 25}" />`).join('')}</g><text x="75" y="42" font-family="cursive, serif" font-size="14" font-weight="bold" fill="%23047857">Maths Copy: Polynomial Factorisation</text><text x="75" y="72" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">Rule: ax² + bx + c =&gt; p × q = a·c, p + q = b</text><text x="75" y="97" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">Q1: Factorise x² + 7x + 12</text><text x="75" y="122" font-family="cursive, sans-serif" font-size="11" fill="%23059669">   = x² + 3x + 4x + 12 = (x+3)(x+4)</text><text x="75" y="147" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">Q2: Find zeroes of 2x² - 8x + 6 = 0</text><text x="75" y="172" font-family="cursive, sans-serif" font-size="11" fill="%23059669">   2(x-1)(x-3) = 0 =&gt; x = 1, x = 3</text><text x="75" y="220" font-family="cursive, sans-serif" font-size="11" fill="%23b45309">Note: Check zeroes with P(1) = 0 and P(3) = 0</text></svg>`,
    defaultData: null,
  },
  {
    id: 'biology',
    title: 'Biology: Cell Structure Copy',
    subject: 'Science (Biology)',
    classLevel: 'Class 9',
    chapter: 'The Fundamental Unit of Life',
    description: 'Cell organelles, differences between plant & animal cells, osmosis notes & 2 questions.',
    thumbnailSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520" fill="%23fcfbfa"><rect width="100%" height="100%" fill="%23f7f5ef" /><line x1="60" y1="0" x2="60" y2="520" stroke="%23fca5a5" stroke-width="2" /><g stroke="%23cbd5e1" stroke-width="1">${Array.from({ length: 18 }).map((_, i) => `<line x1="0" y1="${50 + i * 25}" x2="400" y2="${50 + i * 25}" />`).join('')}</g><text x="75" y="42" font-family="cursive, serif" font-size="14" font-weight="bold" fill="%237c3aed">Bio Notes: Cell Organelles &amp; Functions</text><text x="75" y="72" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">Mitochondria = Powerhouse of cell (ATP synthesis)</text><text x="75" y="97" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">Chloroplasts = Kitchen of plant cell (Photosynthesis)</text><text x="75" y="122" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">Q1: Why is plasma membrane selectively permeable?</text><text x="75" y="147" font-family="cursive, sans-serif" font-size="11" fill="%236d28d9">   Ans: Regulates entry &amp; exit of specific solutes.</text><text x="75" y="172" font-family="cursive, sans-serif" font-size="11" fill="%231e293b">Q2: What happens to an egg placed in pure water?</text><text x="75" y="197" font-family="cursive, sans-serif" font-size="11" fill="%236d28d9">   Ans: Swells due to endosmosis (hypotonic solution).</text></svg>`,
    defaultData: null,
  }
];
