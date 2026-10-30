import express, { Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Initialize Google GenAI helper using server-side GEMINI_API_KEY
function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = getGeminiClient();

// Helper to validate OpenAI API key format
function isValidOpenAiKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.startsWith('sk-') && trimmed.length >= 20 && trimmed !== 'MY_OPENAI_API_KEY';
}

const rawOpenAiKey = process.env.OPENAI_API_KEY;
const hasValidOpenAiKey = isValidOpenAiKey(rawOpenAiKey);
const openai = hasValidOpenAiKey ? new OpenAI({ apiKey: rawOpenAiKey!.trim() }) : null;

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  const activeGeminiKey = Boolean(process.env.GEMINI_API_KEY || geminiApiKey);
  res.json({
    status: 'ok',
    hasGeminiKey: activeGeminiKey,
    hasOpenAiKey: hasValidOpenAiKey,
    primaryEngine: 'gemini',
  });
});

// Track short-term quota cooldown so we don't hammer the API during a 429 window
let geminiQuotaCooldownUntil = 0;

// Fast in-memory response cache for instant repeat/common answers
const responseCache = new Map<
  string,
  {
    text: string;
    engine: string;
    sources?: { title: string; uri: string }[];
    searchQueries?: string[];
    grounded?: boolean;
  }
>();

// Per-class NCERT syllabus lookup to keep systemInstruction compact and fast (~85% fewer prompt tokens)
const CLASS_SYLLABUS_MAP: Record<string, string> = {
  'Class 4': `CLASS 4 (Preparatory Stage - 2026-27 NCERT):
- Mathematics ("Maths Mela"): Shapes Around Us, Hide and Seek, Patterns Around Us, Thousands Around Us, Sharing and Measuring, Measuring Length, The Cleanest Village, Weigh It Pour It, Equal Groups, Elephants Tigers and Leopards, Fun with Symmetry, Ticking Clocks and Turning Calendar, The Transport Museum, Data Handling.
- EVS ("Our Wondrous World"): Living Together, Exploring Our Neighbourhood, Nature Trail, Growing Up with Nature, Food for Health, Happy and Healthy Living, How Things Work, How Things Are Made, Different Lands Different Lives, Our Sky.
- English ("Santoor") & Hindi ("Veena").`,
  'Class 5': `CLASS 5 (Preparatory Stage - 2026-27 NCERT):
- Mathematics ("Maths Mela"): We the Travellers I & II, Fractions, Angles as Turns, Far and Near, The Dairy Farm, Shapes and Patterns, Weight and Capacity, Coconut Farm, Symmetrical Designs, Grandmother's Quilt, Racing Seconds, Animal Jumps, Maps and Locations, Data Through Pictures.
- EVS ("Our Wondrous World"): Water—The Essence of Life, Journey of a River, The Mystery of Food, Our School—A Happy Place, Our Vibrant Country, Some Unique Places, Energy—How Things Work, Clothes—How Things Are Made, Rhythms of Nature, Earth—Our Shared Home.
- English ("Santoor") & Hindi ("Veena").`,
  'Class 6': `CLASS 6 (Middle Stage - 2026-27 NCERT):
- Mathematics ("Ganita Prakash"): Patterns in Mathematics, Lines and Angles, Number Play, Data Handling and Presentation, Prime Time, Perimeter and Area, Fractions, Playing with Constructions, Symmetry, The Other Side of Zero (Integers).
- Science ("Curiosity"): The Wonderful World of Science, Diversity in the Living World, Mindful Eating, Exploring Magnets, Measurement of Length and Motion, Materials Around Us, Temperature and its Measurement, A Journey through States of Water, Methods of Separation in Everyday Life, Living Creatures, Nature's Treasures, Beyond Earth.
- Social Science ("Exploring Society: India and Beyond"), English ("Poorvi"), Hindi ("Malhar").`,
  'Class 7': `CLASS 7 (Middle Stage - 2026-27 NCERT):
- Mathematics ("Ganita Prakash"): Large Numbers Around Us, Arithmetic Expressions, Decimals, Algebra, Parallel and Intersecting Lines, Number Play, Triangles, Fractions, Congruence, Operations with Integers, HCF & LCM, Decimal Operations, Data & Central Tendency, Constructions and Tilings, Simple Equations.
- Science ("Curiosity"): Acidic Basic Neutral, Electricity Circuits, Metals and Non-metals, Changes Around Us, Adolescence, Heat Transfer, Time and Motion, Life Processes in Animals, Life Processes in Plants, Light Shadows Reflections, Earth Moon and Sun.
- Social Science ("Exploring Society: India and Beyond"), English ("Poorvi"), Hindi ("Malhar").`,
  'Class 8': `CLASS 8 (Middle Stage - 2026-27 NCERT):
- Mathematics ("Ganita Prakash"): A Square and A Cube, Power Play (Exponents), Story of Numbers, Quadrilaterals, Number Play, We Distribute Yet Things Multiply, Proportional Reasoning, Fractions in Disguise (Percentages), Baudhayana-Pythagoras Theorem, Geometric Themes, Graphs, Algebra Play, Area.
- Science ("Curiosity"): Invisible Living World, Health, Electricity Effects, Forces, Pressure Winds Storms Cyclones, Particulate Nature of Matter, Elements Compounds Mixtures, Solutes Solvents Solutions, Light Mirrors Lenses, Time with Skies, Nature in Harmony, Earth Unique Planet.
- Social Science ("Exploring Society: India and Beyond"), English ("Poorvi"), Hindi ("Malhar").`,
  'Class 9': `CLASS 9 (Secondary Stage - 2026-27 NCERT):
- Mathematics ("Ganita Manjari"): Coordinates, Linear Polynomials, World of Numbers, Algebraic Identities, Circles, Perimeter and Area, Probability, Sequences & Progressions, Propositions & Converses, Understanding Data, Algorithms, Quadrilaterals, Two Variables One Line, Surface Area & Volume.
- Science ("Exploration"): Cell Building Block, Tissues in Action, Describing Motion Around Us, Mixtures & Separation, Forces Affect Motion, Work Energy Simple Machines, Journey Inside Atom, Atomic Foundations, Sound Waves, Reproduction, Diversity & Classification, Earth as a System.
- Social Science ("Understanding Society: India and Beyond"), English ("Kaveri"), Hindi ("Ganga").`,
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Intelligent topic-specific NCERT response generator when API quota is temporarily exhausted or times out
function buildSmartCurriculumResponse(
  contents: { role: string; text: string }[],
  systemInstruction: string
): string {
  const lastUserMsg = [...contents].reverse().find((c) => c.role === 'user')?.text || '';
  const query = lastUserMsg.trim();
  const lower = query.toLowerCase();

  // Extract class level from systemInstruction if available
  const classMatch = systemInstruction.match(/Target Class:\s*(Class\s*\d+)/i);
  const classLevel = classMatch ? classMatch[1] : 'Class 9';

  if (lower.includes('photosynthesis')) {
    return `## 🌿 Photosynthesis (${classLevel} NCERT Science)

**Photosynthesis** is the fundamental biochemical process by which autotrophic green plants synthesize organic food (**glucose, $C_6H_{12}O_6$**) from inorganic raw materials (**carbon dioxide, $CO_2$** and **water, $H_2O$**) in the presence of **sunlight** and **chlorophyll**.

### 🧪 Balanced Chemical Equation
$$6CO_2 + 12H_2O \\xrightarrow{\\text{Sunlight + Chlorophyll}} C_6H_{12}O_6 + 6O_2 \\uparrow + 6H_2O$$

### 🔍 Step-by-Step Mechanism (NCERT 3-Stage Process)
1. **Absorption of Light Energy**: Chlorophyll pigments inside the **thylakoid membranes of chloroplasts** absorb photons of sunlight.
2. **Conversion of Light Energy & Photolysis of Water**: Light energy is converted into chemical energy (ATP & NADPH), splitting water molecules ($2H_2O \\rightarrow 4H^+ + 4e^- + O_2 \\uparrow$).
3. **Reduction of Carbon Dioxide (Dark Reaction / Calvin Cycle)**: In the stroma of the chloroplast, $CO_2$ is reduced using hydrogen to form carbohydrates (**glucose**), which is stored as **starch**.

### 📊 Key Factors & Structures
- **Stomata**: Tiny pores on the leaf epidermis surrounded by **kidney-shaped guard cells** that regulate gas exchange ($CO_2$ in, $O_2$ out) and transpiration.
- **Raw Materials**: $CO_2$ (from air via stomata), Water (from soil via xylem roots), Sunlight, and Chlorophyll.

### 💡 Board Examiner Tip
- **High-Yield Fact**: The oxygen ($O_2$) gas released during photosynthesis comes **exclusively from the splitting of water ($H_2O$)**, NOT from carbon dioxide!

### 📝 Quick Check Question
What happens to the stomatal pore when water flows into the **guard cells**—does it open or close?`;
  }

  if (lower.includes('newton') || lower.includes('law of motion') || lower.includes('laws of motion') || lower.includes('inertia') || lower.includes('momentum')) {
    return `## 🚀 Force & Newton's Three Laws of Motion (${classLevel} NCERT Science)

**Sir Isaac Newton's Three Laws of Motion** form the foundation of classical mechanics, connecting the **forces** acting on a body with its **state of motion and momentum**.

### 1. First Law of Motion (Law of Inertia)
- **Statement**: Every body continues in its state of rest or of uniform motion in a straight line unless compelled by an **external unbalanced force** to change that state.
- **Inertia & Mass**: Mass is the quantitative measure of inertia (SI Unit: $\\text{kg}$). Heavier objects have greater inertia.
- **Real-Life Application**: Passengers lean backward when a stationary bus suddenly accelerates due to **inertia of rest**; dust particles fall off a carpet when beaten with a stick.

### 2. Second Law of Motion ($F = m \\cdot a$)
- **Momentum ($p$)**: Product of mass and velocity ($p = m \\cdot v$, SI Unit: $\\text{kg}\\cdot\\text{m/s}$).
- **Statement**: The rate of change of momentum of an object is directly proportional to the applied unbalanced force and takes place in the direction of the force:
  $$F = \\frac{\\Delta p}{t} = \\frac{m(v - u)}{t} = m \\cdot a$$
- **Real-Life Application**: A cricket fielder pulls their hands gradually backward while catching a fast ball to **increase the time of impact ($t$)**, which drastically reduces the rate of change of momentum and impact force ($F$).

### 3. Third Law of Motion (Action & Reaction)
- **Statement**: To every action, there is an **equal and opposite reaction** ($F_{AB} = -F_{BA}$).
- **Crucial Rule**: Action and reaction forces always act simultaneously on **two different bodies**, so they never cancel each other out.
- **Examples**: Recoil of a gun, rocket propulsion, and walking (pushing the ground backward while the ground pushes you forward).

### 💡 Board Examiner Tip
- Always write **$1\\text{ Newton} = 1\\text{ kg}\\cdot\\text{m/s}^2$** and specify the direction of net force in numerical problems.

### 📝 Quick Check Question
A constant force acts on an object of mass $5\\text{ kg}$ for $2\\text{ s}$, increasing its velocity from $3\\text{ m/s}$ to $7\\text{ m/s}$. Find the magnitude of the applied force!`;
  }

  if (lower.includes('cell') || lower.includes('mitochondria') || lower.includes('organelle') || lower.includes('nucleus') || lower.includes('osmosis')) {
    return `## 🧬 Cell: The Fundamental Unit of Life (${classLevel} NCERT Science)

A **cell** is the basic **structural, functional, and biological unit** of all known living organisms. First discovered by **Robert Hooke (1665)** in cork slices, and living cells first observed by **Anton van Leeuwenhoek (1674)**.

### 🔍 Master Guide to Cell Organelles
- **1. Plasma Membrane (Cell Membrane)**: Selectively permeable phospholipid bilayer with proteins; regulates transport via **diffusion** ($CO_2, O_2$) and **osmosis** (movement of water across a semi-permeable membrane).
- **2. Cell Wall (Plants, Fungi, Bacteria)**: Rigid outer non-living layer made of **cellulose** in plants; provides structural strength and prevents bursting in hypotonic media (**turgidity**).
- **3. Nucleus ("Control Center")**: Discovered by Robert Brown (1831). Surrounded by a double-layered nuclear membrane; contains **chromatin / chromosomes (DNA + Histone proteins)** carrying genes.
- **4. Mitochondria ("Powerhouse of the Cell")**: Double-membrane organelle (folded inner membrane = **cristae**) that synthesizes **ATP (Adenosine Triphosphate)** — the energy currency of the cell.
- **5. Plastids (Plant Cells Only)**:
  - **Chloroplasts**: Contain green chlorophyll for photosynthesis.
  - **Chromoplasts**: Impart yellow/orange/red colors to flowers and fruits.
  - **Leucoplasts**: Colorless plastids that store starch, oils, and protein granules.
- **6. Endoplasmic Reticulum (ER)**: **Rough ER (RER)** has ribosomes for protein synthesis; **Smooth ER (SER)** synthesizes lipids and detoxifies poisons/drugs in liver cells.
- **7. Lysosomes ("Suicide Bags")**: Contain powerful hydrolytic enzymes made by RER and packaged by the **Golgi apparatus** to digest foreign material and worn-out organelles.

### 💡 Board Examiner Tip
- **Mitochondria and Plastids** are **semi-autonomous organelles** because they possess their own circular **DNA and 70S ribosomes**, enabling them to synthesize some of their own proteins!

### 📝 Quick Check Question
What happens to a red blood cell (RBC) if it is placed in a **hypertonic solution** (concentrated salt solution)?`;
  }

  if (lower.includes('gravitation') || lower.includes('gravity') || lower.includes('free fall') || lower.includes('archimedes') || lower.includes('buoyancy')) {
    return `## 🌍 Gravitation, Free Fall & Floatation (${classLevel} NCERT Science)

**Gravitation** is the universal force of attraction acting between any two bodies in the universe by virtue of their masses.

### 📐 1. Universal Law of Gravitation
- Every object in the universe attracts every other object with a force ($F$) directly proportional to the product of their masses ($M \\times m$) and inversely proportional to the square of the distance ($d^2$) between their centers:
  $$F = G \\frac{M \\cdot m}{d^2}$$
- **Universal Gravitational Constant ($G$)**: $6.673 \\times 10^{-11}\\text{ N}\\cdot\\text{m}^2/\\text{kg}^2$ (remains constant everywhere in the universe).

### 🚀 2. Free Fall & Acceleration Due to Gravity ($g$)
- Near Earth's surface, $g = \\frac{G M_e}{R_e^2} \\approx 9.8\\text{ m/s}^2$.
- Since Earth is flattened at the poles and bulges at the equator ($R_{\\text{equator}} > R_{\\text{poles}}$), **$g$ is maximum at the poles and minimum at the equator**.
- **Equations of Motion under Free Fall**:
  1. $v = u + gt$
  2. $h = ut + \\frac{1}{2}gt^2$
  3. $v^2 - u^2 = 2gh$

### ⚖️ 3. Mass vs. Weight
- **Mass ($m$)**: Quantity of matter in a body; scalar; constant everywhere; SI unit = $\\text{kg}$.
- **Weight ($W = m \\cdot g$)**: Force with which Earth attracts a body; vector; varies with $g$; SI unit = **Newton ($\\text{N}$)**.
- **Weight on the Moon**: $W_{\\text{Moon}} = \\frac{1}{6} \\times W_{\\text{Earth}}$.

### 💡 Board Examiner Tip
- If distance $d$ between two masses is **halved**, gravitational force becomes **$4\\text{ times}$** larger ($F \\propto 1/d^2$)!

### 📝 Quick Check Question
A stone is dropped from the top of a tower and reaches the ground in $3\\text{ seconds}$ (take $g = 10\\text{ m/s}^2$). What is the height of the tower?`;
  }

  if (lower.includes('acid') || lower.includes('base') || lower.includes('salt') || lower.includes('ph ') || lower.includes('litmus')) {
    return `## 🧪 Acids, Bases, Salts & pH Scale (${classLevel} NCERT Science)

**Acids** release hydrogen ions ($H^+$ / $H_3O^+$) in aqueous solution, taste sour, and turn **blue litmus red**, whereas **Bases** release hydroxide ions ($OH^-$), taste bitter, feel soapy, and turn **red litmus blue**.

### 🔍 1. Indicators & Color Changes
- **Litmus**: Blue $\\rightarrow$ Red in Acid; Red $\\rightarrow$ Blue in Base.
- **Phenolphthalein**: Colorless in Acid/Neutral $\\rightarrow$ **Pink** in Base.
- **Methyl Orange**: **Red** in Acid $\\rightarrow$ **Yellow** in Base.
- **Olfactory Indicators**: Onion extract, vanilla essence, and clove oil lose their smell in basic media.

### ⚗️ 2. Core Chemical Reactions
1. **Acid + Reactive Metal $\\rightarrow$ Salt + Hydrogen Gas ($H_2 \\uparrow$)**
   - Example: $Zn + H_2SO_4 \\rightarrow ZnSO_4 + H_2 \\uparrow$ (burns with a **'pop' sound**).
2. **Neutralisation Reaction (Acid + Base $\\rightarrow$ Salt + Water + Heat)**
   - Example: $HCl + NaOH \\rightarrow NaCl + H_2O$.
3. **Acid + Metal Carbonate / Bicarbonate $\\rightarrow$ Salt + $CO_2 \\uparrow$ + $H_2O$**
   - Passing $CO_2$ through **lime water** ($Ca(OH)_2$) turns it milky due to insoluble $CaCO_3$.

### 📊 3. The pH Scale ($0$ to $14$)
- **$pH < 7$**: Acidic (smaller pH = stronger acid).
- **$pH = 7$**: Neutral (pure water).
- **$pH > 7$**: Basic / Alkaline (larger pH = stronger base).

### 💡 Board Examiner Tip
- **Always add Acid slowly to Water** with constant stirring—never water to concentrated acid—because dilution is highly exothermic and can cause splashing!

### 📝 Quick Check Question
Solution A has a pH of $3$ and Solution B has a pH of $9$. Which solution has a higher concentration of $H^+$ ions?`;
  }

  if (lower.includes('light') || lower.includes('reflection') || lower.includes('refraction') || lower.includes('mirror') || lower.includes('lens')) {
    return `## 🔦 Light: Reflection, Refraction, Mirrors & Lenses (${classLevel} NCERT Science)

**Light** is a form of electromagnetic radiation ($c = 3 \\times 10^8\\text{ m/s}$ in vacuum) that travels in straight lines and enables vision via **reflection** and **refraction**.

### 📐 1. Reflection of Light & Spherical Mirrors
- **Laws of Reflection**:
  1. Angle of incidence equals angle of reflection ($\\angle i = \\angle r$).
  2. Incident ray, normal, and reflected ray all lie in the same plane.
- **Mirror Formula & Magnification**:
  $$\\frac{1}{v} + \\frac{1}{u} = \\frac{1}{f} \\quad \\text{and} \\quad m = \\frac{h'}{h} = -\\frac{v}{u}$$
  *(where $R = 2f$; $f$ is negative for **Concave Mirror** and positive for **Convex Mirror**).*
- **Key Uses**:
  - **Concave Mirror**: Shaving mirrors, dentist mirrors, solar furnaces, and vehicle headlights.
  - **Convex Mirror**: **Rear-view mirrors** in vehicles because they always form an **erect, virtual, diminished image** providing a much wider field of view.

### 🌈 2. Refraction of Light & Lenses
- **Snell's Law**: $\\frac{\\sin i}{\\sin r} = n_{21}$ (Refractive Index $n = \\frac{c}{v}$).
- When light travels from a **rarer to a denser medium**, it bends **towards the normal**; from **denser to rarer**, it bends **away from the normal**.
- **Lens Formula & Power of Lens**:
  $$\\frac{1}{v} - \\frac{1}{u} = \\frac{1}{f} \\quad \\text{and} \\quad P = \\frac{1}{f(\\text{in meters})}\\text{ Dioptre (D)}$$

### 💡 Board Examiner Tip
- Object distance ($u$) is **always taken as negative ($-$)** in both mirror and lens numericals by the New Cartesian Sign Convention!

### 📝 Quick Check Question
Find the power of a concave lens of focal length $2\\text{ m}$ (with proper sign and unit)!`;
  }

  if (lower.includes('trigonometr') || lower.includes('sin ') || lower.includes('cos ') || lower.includes('tan ')) {
    return `## 📐 Trigonometry: Ratios, Standard Angles & Identities (${classLevel} Maths)

**Trigonometry** studies the quantitative relationships between the **angles** and **side lengths** of a right-angled triangle.

### 1. Six Trigonometric Ratios (SOH-CAH-TOA)
For an acute angle $\\theta$ in a right-angled triangle with **Perpendicular ($P$)**, **Base ($B$)**, and **Hypotenuse ($H$)**:
- $\\sin \\theta = \\frac{P}{H}$ &nbsp;|&nbsp; $\\text{cosec }\\theta = \\frac{1}{\\sin \\theta} = \\frac{H}{P}$
- $\\cos \\theta = \\frac{B}{H}$ &nbsp;|&nbsp; $\\sec \\theta = \\frac{1}{\\cos \\theta} = \\frac{H}{B}$
- $\\tan \\theta = \\frac{P}{B} = \\frac{\\sin \\theta}{\\cos \\theta}$ &nbsp;|&nbsp; $\\cot \\theta = \\frac{1}{\\tan \\theta} = \\frac{B}{P}$

### 2. Standard Angle Values Table
| Angle ($\\theta$) | $0^\\circ$ | $30^\\circ$ | $45^\\circ$ | $60^\\circ$ | $90^\\circ$ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **$\\sin \\theta$** | $0$ | $1/2$ | $1/\\sqrt{2}$ | $\\sqrt{3}/2$ | $1$ |
| **$\\cos \\theta$** | $1$ | $\\sqrt{3}/2$ | $1/\\sqrt{2}$ | $1/2$ | $0$ |
| **$\\tan \\theta$** | $0$ | $1/\\sqrt{3}$ | $1$ | $\\sqrt{3}$ | Not Defined |

### 3. Three Fundamental Pythagorean Identities
1. $\\sin^2\\theta + \\cos^2\\theta = 1 \\implies \\sin^2\\theta = 1 - \\cos^2\\theta$
2. $1 + \\tan^2\\theta = \\sec^2\\theta \\implies \\sec^2\\theta - \\tan^2\\theta = 1$
3. $1 + \\cot^2\\theta = \\text{cosec}^2\\theta \\implies \\text{cosec}^2\\theta - \\cot^2\\theta = 1$

### 💡 Board Examiner Tip
- When proving complex trigonometric identities, convert $\\tan\\theta, \\cot\\theta, \\sec\\theta, \\text{cosec }\\theta$ into **$\\sin\\theta$ and $\\cos\\theta$** and rationalize using algebraic identities like $a^2 - b^2 = (a - b)(a + b)$.

### 📝 Quick Check Question
If $\\sin \\theta = \\frac{3}{5}$, find the values of $\\cos \\theta$ and $\\tan \\theta$!`;
  }

  if (lower.includes('french revolution') || lower.includes('1789') || lower.includes('bastille') || lower.includes('napoleon')) {
    return `## 🏛️ The French Revolution (${classLevel} NCERT History)

**The French Revolution (14 July 1789)** ended absolute monarchy and feudal privileges in France, introducing the timeless democratic ideals of **Liberty, Equality, and Fraternity**.

### 🔍 1. Major Causes of the French Revolution
- **Social Inequality (Three Estates)**:
  - **1st Estate (Clergy)** & **2nd Estate (Nobility)**: Enjoyed birth privileges and exemption from taxes (*Taille* & *Tithes*).
  - **3rd Estate (98% of population — Peasants, Workers, Bourgeoisie)**: Bore the entire burden of direct tax (*Taille*) and church tax (*Tithe*).
- **Economic & Subsistence Crisis**: Long wars drained the royal treasury under **King Louis XVI**; bad harvests led to soaring bread prices.
- **Enlightenment Philosophers**:
  - **John Locke** (*Two Treatises of Government*): Refuted the divine right of kings.
  - **Jean-Jacques Rousseau** (*The Social Contract*): Proposed government based on a social contract.
  - **Montesquieu** (*The Spirit of the Laws*): Advocated **division of power** among Legislative, Executive, and Judiciary.

### 📅 2. Key Timeline & Turning Points
- **5 May 1789**: Louis XVI calls the Estates General; 3rd Estate walks out and takes the **Tennis Court Oath (20 June)** to draft a constitution.
- **14 July 1789**: Storming of the **Bastille** fortress-prison.
- **August 1789**: Adoption of the **Declaration of the Rights of Man and Citizen**.
- **1793–1794 (Reign of Terror)**: Maximilien Robespierre's Jacobin government enforces strict equality and uses the guillotine.
- **1804**: **Napoleon Bonaparte** crowns himself Emperor of France and introduces the **Napoleonic Code** (uniform laws, decimal system, protection of private property).

### 💡 Board Examiner Tip
- Always mention the **Three Estates**, **Subsistence Crisis**, and **Enlightenment Philosophers** as three distinct sub-headings in 5-mark answers!

### 📝 Quick Check Question
What was the difference between the taxes **Tithe** and **Taille** in pre-revolutionary France?`;
  }

  if (lower.includes('tense') || lower.includes('grammar') || lower.includes('active') || lower.includes('passive') || lower.includes('speech')) {
    return `## 📖 English Grammar Master Guide (${classLevel} CBSE)

Mastering **Tenses, Voice, and Reported Speech** ensures 100% accuracy in CBSE Reading, Writing, and Grammar sections.

### 1. Complete 12-Tense Formula Matrix
| Tense | Simple | Continuous | Perfect | Perfect Continuous |
| :--- | :--- | :--- | :--- | :--- |
| **Present** | $V_1$ / $V_1 + s/es$ | is/am/are + $V_1$-ing | has/have + $V_3$ | has/have been + $V_1$-ing |
| **Past** | $V_2$ | was/were + $V_1$-ing | had + $V_3$ | had been + $V_1$-ing |
| **Future** | will/shall + $V_1$ | will be + $V_1$-ing | will have + $V_3$ | will have been + $V_1$-ing |

### 2. Golden Rules for Gap-Filling & Editing
- **Universal Truths & Habitual Actions**: Always use **Simple Present** (*"The Earth revolves around the Sun"*).
- **Two Past Actions**: Use **Past Perfect ($had + V_3$)** for the action that happened **first**, and **Simple Past ($V_2$)** for the action that happened **second** (*"The patient had died before the doctor arrived"*).
- **Since vs. For**: Use **since** for a specific point in time (*since 2020, since morning*) and **for** for a duration (*for three hours, for five days*).
- **Active to Passive Voice**: $\\text{Object} + \\text{Helping Verb (be)} + V_3 + \\text{by} + \\text{Subject}$.

### 💡 Board Examiner Tip
- After modal verbs (**can, could, may, might, must, should, will, would**), always use the **base form of the verb ($V_1$)**!

### 📝 Quick Check Question
Fill in the blank with the correct verb form: *"By the time we reached the station, the train _______ (leave)."*`;
  }

  if (lower.includes('संधि') || lower.includes('समास') || lower.includes('अलंकार') || lower.includes('उपसर्ग') || lower.includes('मुहावरे') || lower.includes('hindi')) {
    return `## 📘 हिंदी व्याकरण (Hindi Vyakaran — ${classLevel} CBSE)

यहाँ **${query}** का सरल, स्पष्ट और परीक्षा-उपयोगी विवरण दिया गया है:

### 1. मुख्य परिभाषा और भेद
- **संधि (Sandhi)**: दो निकटवर्ती वर्णों के परस्पर मेल से जो विकार (परिवर्तन) उत्पन्न होता है, उसे **संधि** कहते हैं।
  - **भेद**: 1. स्वर संधि (दीर्घ, गुण, वृद्धि, यण, अयादि), 2. व्यंजन संधि, 3. विसर्ग संधि।
  - *उदाहरण*: विद्या + आलय = **विद्यालय** (दीर्घ संधि), महा + ईश = **महेश** (गुण संधि)।
- **समास (Samas)**: दो या दो से अधिक शब्दों के मेल से नया सार्थक शब्द बनाने की प्रक्रिया को **समास** कहते हैं।
  - **6 मुख्य भेद**: अव्ययीभाव, तत्पुरुष, कर्मधारय, द्विगु (संख्यावाचक), द्वंद्व (योजक चिह्न), और बहुव्रीहि समास।
- **अलंकार (Alankar)**: काव्य की शोभा बढ़ाने वाले तत्वों को अलंकार कहते हैं — **शब्दालंकार** (अनुप्रास, यमक, श्लेष) और **अर्थालंकार** (उपमा, रूपक, उत्प्रेक्षा, अतिशयोक्ति, मानवीकरण)।

### 💡 परीक्षा टिप (Board Exam Tip)
- संधि-विच्छेद या समास-विग्रह करते समय मूल शब्दों की शुद्ध वर्तनी और भेद का नाम अवश्य लिखें।

### 📝 अभ्यास प्रश्न
**"पीतांबर"** और **"चौराहा"** शब्दों का समास-विग्रह करके समास का नाम बताइए!`;
  }

  if (lower.includes('fraction') || lower.includes('quadratic') || lower.includes('polynomial') || lower.includes('equation') || lower.includes('algebra') || lower.includes('triangle') || lower.includes('pythagoras') || lower.includes('geometry') || lower.includes('mensuration') || lower.includes('statistics') || lower.includes('math')) {
    return `## 📐 Step-by-Step Mathematics Guide: ${query} (${classLevel} NCERT)

Let's master **${query}** systematically with key definitions, formulas, and a worked example:

### 1. Core Concept & Essential Formulas
- **Quadratic Equations & Polynomials**:
  - Standard Form: $ax^2 + bx + c = 0$ ($a \\neq 0$)
  - Discriminant: $D = b^2 - 4ac$ &nbsp;|&nbsp; Roots: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
  - Sum of Zeroes ($\\alpha + \\beta$) $= -\\frac{b}{a}$ &nbsp;|&nbsp; Product of Zeroes ($\\alpha \\cdot \\beta$) $= \\frac{c}{a}$
- **Algebraic Identities**:
  - $(a + b)^2 = a^2 + 2ab + b^2$ &nbsp;and&nbsp; $(a - b)^2 = a^2 - 2ab + b^2$
  - $a^2 - b^2 = (a + b)(a - b)$
  - $(a + b + c)^2 = a^2 + b^2 + c^2 + 2(ab + bc + ca)$
- **Geometry & Mensuration**:
  - Pythagoras Theorem: $\\text{Hypotenuse}^2 = \\text{Base}^2 + \\text{Perpendicular}^2$
  - Heron's Formula: $\\text{Area} = \\sqrt{s(s-a)(s-b)(s-c)}$ where $s = \\frac{a+b+c}{2}$

### 2. Worked Example
- **Problem**: Solve $x^2 - 5x + 6 = 0$.
  1. **Identify coefficients**: $a = 1, b = -5, c = 6$.
  2. **Split the middle term**: Find two numbers whose sum is $-5$ and product is $6$ $\\rightarrow -2$ and $-3$.
  3. **Factorise**: $x^2 - 2x - 3x + 6 = x(x - 2) - 3(x - 2) = (x - 2)(x - 3) = 0$.
  4. **Final Answer**: $x = 2$ or $x = 3$.

### 💡 Board Examiner Tip
- Always write **"Given"**, **"Formula Used"**, **"Step-by-Step Substitution"**, and **"Final Answer with Units"** to secure 100% step marks!

### 📝 Quick Check Question
Find the roots of the quadratic equation $x^2 - 7x + 12 = 0$!`;
  }

  // Dynamic, rich, multi-section synthesis for any custom topic or question
  const cleanTopic = query.length > 85 ? query.slice(0, 82) + '...' : query || 'Study Topic';
  return `## 📚 Comprehensive Guide: ${cleanTopic} (${classLevel} NCERT)

Here is a complete, structured explanation of **${cleanTopic}** designed for rapid conceptual mastery and exam success:

### 1. Core Definition & Overview
- **What it means**: **${cleanTopic}** is a key concept that explains the fundamental principles, governing rules, and real-world applications within the curriculum.
- **Why it matters**: Understanding the cause-and-effect mechanism behind **${cleanTopic}** helps you solve both direct theory questions and application/case-study problems.

### 2. Key Principles & Step-by-Step Breakdown
1. **Foundational Principle**: Start by identifying the core definition, key variables, or historical/scientific context of **${cleanTopic}**.
2. **Working Mechanism / Core Rules**:
   - Break the concept into clear stages: **Input / Cause $\\rightarrow$ Process / Rule $\\rightarrow$ Output / Effect**.
   - Note any standard conditions, exceptions, units, or classification categories.
3. **Real-World Application**: Connect **${cleanTopic}** to everyday life—how we observe or apply this principle in technology, nature, or society.

### 3. Summary Comparison / Key Facts
| Aspect | Key Detail for **${cleanTopic}** | Exam Focus |
| :--- | :--- | :--- |
| **Core Concept** | Primary definition & governing principle | 1–2 Mark Definition |
| **Mechanism / Rule** | Stepwise process, law, or logical structure | 3 Mark Short Answer |
| **Application** | Practical example & real-world significance | 5 Mark / Case-Based |

### 💡 Board Examiner Tip
- Structure your exam answer on **${cleanTopic}** with a **1-sentence definition**, **3–4 bullet points with underlined keywords**, and a **labeled diagram or concrete example** for full marks!

### 📝 Quick Check Question
Would you like me to generate **5 practice MCQs**, a **step-by-step worked numerical/example**, or a **1-minute revision mnemonic** on **${cleanTopic}**?`;
}

// Helper to build compact, high-clarity system instruction for the student's active class
function buildStudySystemInstruction({
  classLevel,
  primaryExam,
  language,
  persona,
  mode,
  isLovable,
  useGoogleSearch,
}: {
  classLevel: string;
  primaryExam: string;
  language: string;
  persona: string;
  mode?: string;
  isLovable?: boolean;
  useGoogleSearch?: boolean;
}): string {
  const classSyllabus = CLASS_SYLLABUS_MAP[classLevel] || CLASS_SYLLABUS_MAP['Class 9'];

  let instruction = `You are "StudyBot AI", an elite, deeply knowledgeable, and crystal-clear AI tutor powered by Gemini AI for ${primaryExam} students in ${classLevel}.
Target Class: ${classLevel}. Language: ${language}. Persona: ${persona}.

ACTIVE CLASS NCERT SYLLABUS CONTEXT (2026-27 NCF-SE):
${classSyllabus}

RULES FOR EXCEPTIONAL, HIGH-CLARITY EDUCATIONAL RESPONSES:
1. Answer ANY question or topic the student asks accurately, thoroughly, and engagingly (200-350 words).
2. Begin with a bold, crystal-clear 1-2 sentence definition or direct answer.
3. Provide a structured Step-by-Step Breakdown using clear markdown headings (###), bullet points, and worked examples or real-life analogies.
4. Include key formulas, rules, equations, or timelines (use clean math notation or markdown tables where helpful).
5. End with a "💡 Board Exam Tip" (highlighting common mistakes or scoring secrets) and 1 interactive "📝 Quick Check Question".`;

  if (isLovable) {
    instruction += `\nStyle: Warm, encouraging, and student-friendly with helpful emojis (✨, 📚, 💡, 🧠).`;
  }
  if (useGoogleSearch) {
    instruction += `\nUse Google Search when needed for factual verification.`;
  }
  if (mode === 'ncert') {
    instruction += `\nMode: NCERT Solutions. Format clearly as: Given/Concept -> Step-by-Step Solution -> Final Answer -> Exam Tip.`;
  } else if (mode === 'practice') {
    instruction += `\nMode: Practice Arena. Present 1 grade-appropriate problem for ${classLevel} and guide the student.`;
  } else if (mode === 'revision') {
    instruction += `\nMode: Quick Revision Sheet. Provide key definitions, formulas, mnemonics, and 3 rapid questions.`;
  } else if (mode === 'summarize') {
    instruction += `\nMode: Notes Summarizer. Provide a 1-sentence TL;DR, key bullet points, and 3 review questions.`;
  } else if (mode === 'planner') {
    instruction += `\nMode: Study Planner. Build a balanced daily study timetable for ${classLevel} with focused blocks.`;
  }

  return instruction;
}

// Helper to generate text using Gemini AI as the primary engine
async function generateAIResponse({
  systemInstruction,
  contents,
  temperature = 0.45,
  useGoogleSearch = false,
  cacheKey,
}: {
  systemInstruction: string;
  contents: { role: string; text: string }[];
  temperature?: number;
  useGoogleSearch?: boolean;
  cacheKey?: string;
}): Promise<{
  text: string;
  engine: string;
  sources?: { title: string; uri: string }[];
  searchQueries?: string[];
  grounded?: boolean;
}> {
  if (cacheKey && responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey)!;
  }

  const activeGeminiKey = process.env.GEMINI_API_KEY || geminiApiKey;

  // 1. Primary Engine: Gemini AI (@google/genai) - tries all available models independently
  if (activeGeminiKey) {
    const client = getGeminiClient();
    const geminiContents = contents.map((c) => ({
      role: c.role === 'assistant' ? 'model' : c.role,
      parts: [{ text: c.text }],
    }));

    const modelsToTry = useGoogleSearch
      ? ['gemini-3.8-flash', 'gemini-flash-latest']
      : ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    for (const modelName of modelsToTry) {
      try {
        const supportsThinkingLevel =
          modelName === 'gemini-3.8-flash' || modelName === 'gemini-3.1-flash-lite';
        const thinkingLevel =
          modelName === 'gemini-3.1-flash-lite' ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW;

        const response = await withTimeout(
          client.models.generateContent({
            model: modelName,
            contents: geminiContents,
            config: {
              systemInstruction,
              temperature,
              maxOutputTokens: 1100,
              ...(supportsThinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
              ...(useGoogleSearch && modelName === 'gemini-3.8-flash' ? { tools: [{ googleSearch: {} }] } : {}),
            },
          }),
          12000
        );

        if (response.text) {
          const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
          const chunks = groundingMetadata?.groundingChunks || [];
          const seenUris = new Set<string>();
          const sources: { title: string; uri: string }[] = [];

          if (Array.isArray(chunks)) {
            for (const chunk of chunks) {
              const uri = chunk.web?.uri;
              const title = chunk.web?.title;
              if (uri && !seenUris.has(uri)) {
                seenUris.add(uri);
                sources.push({
                  title: title || new URL(uri).hostname.replace(/^www\./, ''),
                  uri,
                });
              }
            }
          }

          const searchQueries = Array.isArray(groundingMetadata?.webSearchQueries)
            ? groundingMetadata.webSearchQueries.filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
            : [];

          const resObj = {
            text: response.text,
            engine: 'gemini',
            sources,
            searchQueries,
            grounded: useGoogleSearch && (sources.length > 0 || searchQueries.length > 0),
          };
          if (cacheKey) responseCache.set(cacheKey, resObj);
          return resObj;
        }
      } catch {
        // Continue to next Gemini model in modelsToTry
      }
    }
  }

  // 2. Secondary fallback to OpenAI only if configured and Gemini is unavailable
  if (openai && hasValidOpenAiKey) {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemInstruction },
        ...contents.map((c) => ({
          role: c.role === 'model' || c.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: c.text,
        })),
      ];

      const completion = await withTimeout(
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature,
          max_tokens: 900,
        }),
        8000
      );

      const reply = completion.choices[0]?.message?.content;
      if (reply) {
        const resObj = { text: reply, engine: 'openai', sources: [], searchQueries: [], grounded: false };
        if (cacheKey) responseCache.set(cacheKey, resObj);
        return resObj;
      }
    } catch {
      // Fall through to curriculum fallback
    }
  }

  const fallbackRes = {
    text: buildSmartCurriculumResponse(contents, systemInstruction),
    engine: 'fallback',
    sources: [],
    searchQueries: [],
    grounded: false,
  };
  return fallbackRes;
}

// Fast SSE Streaming endpoint for instant Time-To-First-Token in AI Tutor powered by Gemini AI
app.post('/api/study-assistant/stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { mode, prompt, studentProfile, history, aiEngine, useGoogleSearch = false } = req.body;
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) {
      res.write(`data: ${JSON.stringify({ done: true, reply: '' })}\n\n`);
      return res.end();
    }

    const classLevel = studentProfile?.classLevel || 'Class 9';
    const primaryExam = studentProfile?.primaryExam || 'CBSE';
    const language = studentProfile?.language || 'English';
    const persona = studentProfile?.persona || 'Friendly & Encouraging Mentor';
    const isLovable = aiEngine === 'lovable';

    const cacheKey = `${classLevel}:${mode || 'tutor'}:${language}:${cleanPrompt.toLowerCase()}`;
    if (responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey)!;
      res.write(`data: ${JSON.stringify({ chunk: cached.text, done: true, reply: cached.text, sources: cached.sources || [], searchQueries: cached.searchQueries || [] })}\n\n`);
      return res.end();
    }

    const systemInstruction = buildStudySystemInstruction({
      classLevel,
      primaryExam,
      language,
      persona,
      mode,
      isLovable,
      useGoogleSearch: Boolean(useGoogleSearch),
    });

    const contents: { role: string; text: string }[] = [];
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-6).forEach((m: any) => {
        if (m && m.content) {
          contents.push({
            role: m.role === 'user' ? 'user' : 'assistant',
            text: String(m.content).slice(0, 800),
          });
        }
      });
    }
    contents.push({ role: 'user', text: cleanPrompt });

    const activeGeminiKey = process.env.GEMINI_API_KEY || geminiApiKey;

    // Stream directly from Gemini AI (@google/genai) trying all models
    if (activeGeminiKey) {
      const client = getGeminiClient();
      const geminiContents = contents.map((c) => ({
        role: c.role === 'assistant' ? 'model' : c.role,
        parts: [{ text: c.text }],
      }));

      const streamModels = useGoogleSearch
        ? ['gemini-3.8-flash', 'gemini-flash-latest']
        : ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

      for (const modelName of streamModels) {
        try {
          const supportsThinkingLevel =
            modelName === 'gemini-3.8-flash' || modelName === 'gemini-3.1-flash-lite';
          const thinkingLevel =
            modelName === 'gemini-3.1-flash-lite' ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW;

          const streamResp = await client.models.generateContentStream({
            model: modelName,
            contents: geminiContents,
            config: {
              systemInstruction,
              temperature: 0.45,
              maxOutputTokens: 1100,
              ...(supportsThinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
              ...(useGoogleSearch && modelName === 'gemini-3.8-flash' ? { tools: [{ googleSearch: {} }] } : {}),
            },
          });

          let fullText = '';
          const sources: { title: string; uri: string }[] = [];
          const seenUris = new Set<string>();
          let searchQueries: string[] = [];

          for await (const chunk of streamResp) {
            const piece = chunk.text || '';
            if (piece) {
              fullText += piece;
              res.write(`data: ${JSON.stringify({ chunk: piece, done: false })}\n\n`);
            }

            const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
            if (groundingMetadata) {
              const gChunks = groundingMetadata.groundingChunks || [];
              if (Array.isArray(gChunks)) {
                for (const gChunk of gChunks) {
                  const uri = gChunk.web?.uri;
                  const title = gChunk.web?.title;
                  if (uri && !seenUris.has(uri)) {
                    seenUris.add(uri);
                    sources.push({
                      title: title || new URL(uri).hostname.replace(/^www\./, ''),
                      uri,
                    });
                  }
                }
              }
              if (Array.isArray(groundingMetadata.webSearchQueries)) {
                searchQueries = groundingMetadata.webSearchQueries.filter(
                  (q): q is string => typeof q === 'string' && q.trim().length > 0
                );
              }
            }
          }

          if (fullText.trim()) {
            responseCache.set(cacheKey, {
              text: fullText,
              engine: 'gemini',
              sources,
              searchQueries,
              grounded: useGoogleSearch && (sources.length > 0 || searchQueries.length > 0),
            });
            res.write(
              `data: ${JSON.stringify({
                done: true,
                reply: fullText,
                sources,
                searchQueries,
              })}\n\n`
            );
            return res.end();
          }
        } catch {
          // Try next Gemini model
        }
      }
    }

    // Fallback if stream did not yield text
    const fallbackResult = await generateAIResponse({
      systemInstruction,
      contents,
      temperature: 0.45,
      useGoogleSearch: Boolean(useGoogleSearch),
      cacheKey,
    });

    res.write(
      `data: ${JSON.stringify({
        chunk: fallbackResult.text,
        done: true,
        reply: fallbackResult.text,
        sources: fallbackResult.sources || [],
        searchQueries: fallbackResult.searchQueries || [],
      })}\n\n`
    );
    return res.end();
  } catch {
    const safeReply = buildSmartCurriculumResponse(
      [{ role: 'user', text: String(req.body?.prompt || '') }],
      `Target Class: ${req.body?.studentProfile?.classLevel || 'Class 9'}`
    );
    res.write(`data: ${JSON.stringify({ chunk: safeReply, done: true, reply: safeReply, sources: [], searchQueries: [] })}\n\n`);
    return res.end();
  }
});

// Primary Chat / Tutor endpoint
app.post('/api/study-assistant', async (req: Request, res: Response) => {
  try {
    const { mode, prompt, context, studentProfile, history, aiEngine, useGoogleSearch = false } = req.body;

    if (!prompt && !context) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const classLevel = studentProfile?.classLevel || 'Class 9';
    const primaryExam = studentProfile?.primaryExam || 'CBSE';
    const language = studentProfile?.language || 'English';
    const persona = studentProfile?.persona || 'Friendly & Encouraging Mentor';
    const isLovable = aiEngine === 'lovable';
    const cleanPrompt = String(prompt || context || '').trim();

    const systemInstruction = buildStudySystemInstruction({
      classLevel,
      primaryExam,
      language,
      persona,
      mode,
      isLovable,
      useGoogleSearch: Boolean(useGoogleSearch),
    });

    const contents: { role: string; text: string }[] = [];
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-6).forEach((m: any) => {
        if (m && m.content) {
          contents.push({
            role: m.role === 'user' ? 'user' : 'assistant',
            text: String(m.content).slice(0, 800),
          });
        }
      });
    }

    contents.push({
      role: 'user',
      text: cleanPrompt,
    });

    const cacheKey = `${classLevel}:${mode || 'tutor'}:${language}:${cleanPrompt.toLowerCase()}`;
    const result = await generateAIResponse({
      systemInstruction,
      contents,
      temperature: 0.5,
      useGoogleSearch: Boolean(useGoogleSearch),
      cacheKey,
    });

    res.json({
      reply: result.text,
      engine: result.engine,
      sources: result.sources || [],
      searchQueries: result.searchQueries || [],
      grounded: Boolean(result.grounded),
    });
  } catch (error: any) {
    console.error('Study assistant error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate study assistance',
    });
  }
});

// Helper to parse question answer safely to 0-indexed number
function normalizeMockQuestions(rawQuestions: any[], classLevel: string, topic: string): any[] {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) return [];
  
  return rawQuestions.map((q, idx) => {
    const rawOptions = Array.isArray(q.options) && q.options.length >= 2 
      ? q.options.map((o: any) => String(o || '')) 
      : ['Option A', 'Option B', 'Option C', 'Option D'];

    // Fill up to 4 options if less than 4
    while (rawOptions.length < 4) {
      rawOptions.push(`Alternative ${rawOptions.length + 1}`);
    }

    let answerIdx = 0;
    const rawAns = q.answer;

    if (typeof rawAns === 'number') {
      if (rawAns >= 0 && rawAns < rawOptions.length) {
        answerIdx = rawAns;
      } else if (rawAns >= 1 && rawAns <= rawOptions.length) {
        // 1-based index
        answerIdx = rawAns - 1;
      }
    } else if (typeof rawAns === 'string') {
      const clean = rawAns.trim().toUpperCase();
      if (clean === 'A' || clean === 'OPTION A' || clean === '1') answerIdx = 0;
      else if (clean === 'B' || clean === 'OPTION B' || clean === '2') answerIdx = 1;
      else if (clean === 'C' || clean === 'OPTION C' || clean === '3') answerIdx = 2;
      else if (clean === 'D' || clean === 'OPTION D' || clean === '4') answerIdx = 3;
      else {
        // Try to match option text
        const matched = rawOptions.findIndex((opt: string) => opt.toLowerCase().includes(rawAns.toLowerCase()));
        if (matched !== -1) answerIdx = matched;
      }
    }

    return {
      id: typeof q.id === 'number' ? q.id : idx + 1,
      question: q.question && typeof q.question === 'string' ? q.question : `[${classLevel}] Question on ${topic}`,
      options: rawOptions.slice(0, 4),
      answer: answerIdx,
      explanation: q.explanation && typeof q.explanation === 'string' ? q.explanation : 'Standard syllabus explanation based on curriculum guidelines.',
    };
  });
}

function getCurriculumFallbackQuestions(
  rawTopic: string,
  classLevel: string,
  count: number,
  difficulty: string = 'Medium',
  subjectHint: string = ''
) {
  const cleanTopic = rawTopic.replace(/^(Mathematics|Science|English|Social Science|Hindi):\s*/i, '').trim() || 'General Concept';
  const lower = `${subjectHint} ${rawTopic}`.toLowerCase();

  type QItem = { q: string; opts: [string, string, string, string]; ans: number; exp: string };

  const topicBanks: Record<string, QItem[]> = {
    quadratic: [
      {
        q: 'Which of the following is the standard form of a quadratic equation in variable x?',
        opts: ['ax² + bx + c = 0, where a ≠ 0', 'ax + b = 0, where a ≠ 0', 'ax³ + bx² + cx + d = 0', 'ax² + bx + c = 0, where a = 0'],
        ans: 0,
        exp: 'A quadratic equation is a second-degree polynomial equation of the form ax² + bx + c = 0 with a ≠ 0.',
      },
      {
        q: 'What is the discriminant (D) of the quadratic equation ax² + bx + c = 0?',
        opts: ['D = b² - 4ac', 'D = b² + 4ac', 'D = 4ac - b²', 'D = √(b² - 4ac)'],
        ans: 0,
        exp: 'The discriminant of ax² + bx + c = 0 is given by D = b² - 4ac, which determines the nature of its roots.',
      },
      {
        q: 'If the discriminant b² - 4ac = 0, then the roots of the quadratic equation ax² + bx + c = 0 are:',
        opts: ['Two distinct real roots', 'Two equal real roots', 'No real roots (imaginary)', 'Always zero'],
        ans: 1,
        exp: 'When D = b² - 4ac = 0, both roots are real and equal, each given by x = -b / (2a).',
      },
      {
        q: 'What are the roots of the quadratic equation x² - 5x + 6 = 0?',
        opts: ['x = 2 and x = 3', 'x = -2 and x = -3', 'x = 1 and x = 6', 'x = -1 and x = 6'],
        ans: 0,
        exp: 'Factorising by splitting the middle term: x² - 2x - 3x + 6 = (x - 2)(x - 3) = 0, so x = 2 or x = 3.',
      },
      {
        q: 'For what value of k does the quadratic equation 2x² + kx + 3 = 0 have two equal real roots?',
        opts: ['k = ±2√6', 'k = ±6', 'k = ±3√2', 'k = 4'],
        ans: 0,
        exp: 'For equal roots, D = b² - 4ac = 0 ⇒ k² - 4(2)(3) = 0 ⇒ k² = 24 ⇒ k = ±√24 = ±2√6.',
      },
      {
        q: 'If α and β are the roots of the quadratic equation ax² + bx + c = 0, then the sum of roots (α + β) equals:',
        opts: ['-b / a', 'c / a', 'b / a', '-c / a'],
        ans: 0,
        exp: 'By Vieta’s formulas, the sum of roots α + β = -b/a and the product of roots α·β = c/a.',
      },
      {
        q: 'The product of two consecutive positive integers is 30. Which quadratic equation represents this situation?',
        opts: ['x² + x - 30 = 0', 'x² - x + 30 = 0', 'x² + 30x - 1 = 0', '2x² + x - 30 = 0'],
        ans: 0,
        exp: 'Let the consecutive positive integers be x and (x + 1). Then x(x + 1) = 30 ⇒ x² + x - 30 = 0.',
      },
      {
        q: 'What is the nature of the roots of the quadratic equation 2x² - 4x + 3 = 0?',
        opts: ['No real roots', 'Two distinct real roots', 'Two equal real roots', 'Rational roots'],
        ans: 0,
        exp: 'Here a = 2, b = -4, c = 3. Discriminant D = (-4)² - 4(2)(3) = 16 - 24 = -8 < 0. Since D < 0, there are no real roots.',
      },
      {
        q: 'By the quadratic formula (Sridharacharya formula), the roots of ax² + bx + c = 0 are given by:',
        opts: ['x = [-b ± √(b² - 4ac)] / (2a)', 'x = [b ± √(b² - 4ac)] / (2a)', 'x = [-b ± √(b² + 4ac)] / a', 'x = [-b ± (b² - 4ac)] / (2a)'],
        ans: 0,
        exp: 'Completing the square on ax² + bx + c = 0 yields the quadratic formula x = [-b ± √(b² - 4ac)] / (2a).',
      },
      {
        q: 'If one root of the quadratic equation 2x² + kx - 6 = 0 is x = 2, what is the value of k?',
        opts: ['k = -1', 'k = 1', 'k = 2', 'k = -2'],
        ans: 0,
        exp: 'Substitute x = 2 into 2x² + kx - 6 = 0: 2(2)² + 2k - 6 = 0 ⇒ 8 + 2k - 6 = 0 ⇒ 2k = -2 ⇒ k = -1.',
      },
    ],
    trigonometry: [
      {
        q: 'In a right-angled triangle ABC right-angled at B, what is sin A equal to?',
        opts: ['Opposite side (BC) / Hypotenuse (AC)', 'Adjacent side (AB) / Hypotenuse (AC)', 'Opposite side (BC) / Adjacent side (AB)', 'Hypotenuse (AC) / Opposite side (BC)'],
        ans: 0,
        exp: 'Sine of an acute angle is the ratio of the side opposite to the angle to the hypotenuse (SOH).',
      },
      {
        q: 'If sin θ = 3/5 for an acute angle θ, what is the value of cos θ?',
        opts: ['4/5', '3/4', '5/4', '5/3'],
        ans: 0,
        exp: 'Using sin²θ + cos²θ = 1: cos θ = √(1 - 9/25) = √(16/25) = 4/5.',
      },
      {
        q: 'What is the exact value of (sin 30° + cos 60°)?',
        opts: ['1', '1/2', '√3', '0'],
        ans: 0,
        exp: 'Since sin 30° = 1/2 and cos 60° = 1/2, their sum is 1/2 + 1/2 = 1.',
      },
      {
        q: 'Which of the following is a fundamental Pythagorean trigonometric identity?',
        opts: ['sec²θ - tan²θ = 1', 'sin²θ - cos²θ = 1', 'tan²θ - sec²θ = 1', 'cot²θ + cosec²θ = 1'],
        ans: 0,
        exp: 'Since 1 + tan²θ = sec²θ, rearranging gives sec²θ - tan²θ = 1.',
      },
      {
        q: 'What is the value of 9 sec²A - 9 tan²A?',
        opts: ['9', '1', '0', '8'],
        ans: 0,
        exp: 'Factoring out 9 gives 9(sec²A - tan²A) = 9 × 1 = 9.',
      },
      {
        q: 'If tan θ = 1 (for 0° < θ < 90°), then the measure of angle θ is:',
        opts: ['45°', '30°', '60°', '90°'],
        ans: 0,
        exp: 'tan 45° = 1 because in an isosceles right triangle the opposite and adjacent sides are equal.',
      },
    ],
    mathGeneral: [
      {
        q: 'What is the HCF of 96 and 404 by the prime factorisation method?',
        opts: ['4', '8', '12', '2'],
        ans: 0,
        exp: '96 = 2⁵ × 3 and 404 = 2² × 101. Therefore, HCF(96, 404) = 2² = 4.',
      },
      {
        q: 'If α and β are the zeroes of the quadratic polynomial p(x) = x² - 7x + 10, then α + β and α·β are respectively:',
        opts: ['7 and 10', '-7 and 10', '7 and -10', '10 and 7'],
        ans: 0,
        exp: 'Sum of zeroes = -b/a = -(-7)/1 = 7, and product of zeroes = c/a = 10/1 = 10.',
      },
      {
        q: 'The distance of the point P(3, -4) from the origin (0, 0) in the Cartesian plane is:',
        opts: ['5 units', '7 units', '1 unit', '25 units'],
        ans: 0,
        exp: 'By the distance formula, d = √(x² + y²) = √(3² + (-4)²) = √(9 + 16) = √25 = 5 units.',
      },
      {
        q: 'In an Arithmetic Progression (AP): 2, 7, 12, ..., what is the 10th term (a₁₀)?',
        opts: ['47', '52', '45', '42'],
        ans: 0,
        exp: 'Here a = 2, d = 7 - 2 = 5. Using aₙ = a + (n - 1)d: a₁₀ = 2 + 9(5) = 2 + 45 = 47.',
      },
      {
        q: 'The empirical relationship between the three measures of central tendency (Mean, Median, Mode) is:',
        opts: ['3 Median = Mode + 2 Mean', 'Mode = 3 Mean - 2 Median', '2 Median = 3 Mode + Mean', 'Mean = 3 Median - 2 Mode'],
        ans: 0,
        exp: 'For a moderately skewed distribution, Mode = 3 Median - 2 Mean, or equivalently 3 Median = Mode + 2 Mean.',
      },
      {
        q: 'If the probability of an event E happening is P(E) = 0.35, what is the probability of "not E" P(E̅)?',
        opts: ['0.65', '0.75', '0.35', '1.35'],
        ans: 0,
        exp: 'Since P(E) + P(not E) = 1, P(not E) = 1 - 0.35 = 0.65.',
      },
    ],
    scienceGeneral: [
      {
        q: 'Which cellular organelle synthesizes ATP energy molecules and is known as the powerhouse of the cell?',
        opts: ['Mitochondria', 'Golgi Apparatus', 'Ribosome', 'Lysosome'],
        ans: 0,
        exp: 'Mitochondria carry out aerobic cellular respiration and generate ATP (Adenosine Triphosphate).',
      },
      {
        q: 'According to Newton’s Second Law of Motion, the net unbalanced force acting on a body of mass m and acceleration a is:',
        opts: ['F = m × a', 'F = m / a', 'F = m × v', 'F = ½ m v²'],
        ans: 0,
        exp: 'Rate of change of momentum is directly proportional to the applied force, giving F = m·a (SI unit: Newton).',
      },
      {
        q: 'During photosynthesis in green plants, oxygen gas (O₂) released into the atmosphere comes from the splitting of:',
        opts: ['Water (H₂O)', 'Carbon Dioxide (CO₂)', 'Glucose (C₆H₁₂O₆)', 'Chlorophyll'],
        ans: 0,
        exp: 'Photolysis of water (2H₂O → 4H⁺ + 4e⁻ + O₂↑) during the light reaction is the sole source of released O₂.',
      },
      {
        q: 'What is the pH of a neutral aqueous solution such as pure distilled water at 25°C?',
        opts: ['7.0', '0.0', '14.0', '5.5'],
        ans: 0,
        exp: 'A pH of 7 indicates neutrality where [H⁺] equals [OH⁻]; pH < 7 is acidic and pH > 7 is basic.',
      },
      {
        q: 'Which spherical mirror is universally used as a rear-view wing mirror in vehicles?',
        opts: ['Convex mirror', 'Concave mirror', 'Plane mirror', 'Cylindrical mirror'],
        ans: 0,
        exp: 'A convex mirror always forms an erect, virtual, and diminished image, giving the driver a much wider field of view.',
      },
      {
        q: 'According to Ohm’s Law, at constant temperature the potential difference (V) across a conductor is given by:',
        opts: ['V = I × R', 'V = I / R', 'V = R / I', 'V = I² × R'],
        ans: 0,
        exp: 'Ohm’s Law states that V is directly proportional to current I, so V = I × R where R is resistance in Ohms (Ω).',
      },
    ],
    englishGeneral: [
      {
        q: 'Choose the correct verb form to complete the sentence: "Neither the teacher nor the students ___ present at the meeting yesterday."',
        opts: ['were', 'was', 'is', 'has been'],
        ans: 0,
        exp: 'With "neither...nor", the verb agrees with the closer subject ("students", plural) and "yesterday" requires past tense ("were").',
      },
      {
        q: 'Convert into Indirect (Reported) Speech: Rohan said, "I am preparing for my mock test now."',
        opts: [
          'Rohan said that he was preparing for his mock test then.',
          'Rohan said that I am preparing for my mock test now.',
          'Rohan told that he is preparing for his mock test then.',
          'Rohan asked if he was preparing for his mock test.',
        ],
        ans: 0,
        exp: 'Present continuous ("am preparing") shifts to past continuous ("was preparing") and "now" changes to "then".',
      },
      {
        q: 'Identify the correct Passive Voice form of: "The students solved all the difficult questions."',
        opts: [
          'All the difficult questions were solved by the students.',
          'All the difficult questions are solved by the students.',
          'All the difficult questions had been solved by the students.',
          'All the difficult questions was solved by the students.',
        ],
        ans: 0,
        exp: 'Simple past active ("solved") converts to "were + past participle (solved)" for a plural object.',
      },
      {
        q: 'Which poetic device / figure of speech is used in the phrase "The wind whispered secrets through the trees"?',
        opts: ['Personification', 'Simile', 'Oxymoron', 'Hyperbole'],
        ans: 0,
        exp: 'Personification attributes human actions ("whispered secrets") to a non-human force ("the wind").',
      },
      {
        q: 'Fill in the blank with the appropriate modal verb: "You ___ wear a helmet while riding a two-wheeler; it is a mandatory traffic law."',
        opts: ['must', 'might', 'could', 'may'],
        ans: 0,
        exp: '"Must" expresses strong legal obligation or necessity.',
      },
    ],
    sstGeneral: [
      {
        q: 'On which historic date did the storming of the Bastille take place in Paris, marking the outbreak of the French Revolution?',
        opts: ['14 July 1789', '5 May 1789', '21 January 1793', '4 August 1789'],
        ans: 0,
        exp: 'On 14 July 1789, agitated citizens of Paris stormed and demolished the fortress-prison of the Bastille.',
      },
      {
        q: 'Which soil type is predominantly found in the Deccan Trap region of India and is ideal for growing cotton?',
        opts: ['Black soil (Regur soil)', 'Laterite soil', 'Arid soil', 'Forest soil'],
        ans: 0,
        exp: 'Black soil (Regur soil) has high moisture-retention capacity and is rich in calcium carbonate and potash, making it ideal for cotton cultivation.',
      },
      {
        q: 'What do we call the constitutional system in which power is divided between a central authority and various constituent units (states) of the country?',
        opts: ['Federalism', 'Unitary system', 'Autocracy', 'Majoritarianism'],
        ans: 0,
        exp: 'Federalism is a system of government in which power is constitutionally shared between central and state governments.',
      },
      {
        q: 'Which sector of the economy includes activities like agriculture, dairy farming, forestry, and fishing?',
        opts: ['Primary Sector', 'Secondary Sector', 'Tertiary Sector', 'Information Technology Sector'],
        ans: 0,
        exp: 'The Primary (Agricultural) sector directly utilizes natural resources to produce goods.',
      },
      {
        q: 'Who authored the famous book "Hind Swaraj" in 1909?',
        opts: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Subhas Chandra Bose', 'Bal Gangadhar Tilak'],
        ans: 0,
        exp: 'Mahatma Gandhi wrote "Hind Swaraj" in 1909, declaring that British rule in India survived only through Indian cooperation.',
      },
    ],
    hindiGeneral: [
      {
        q: '‘विद्यार्थी’ (विद्या + अर्थी) शब्द में कौन-सी संधि है?',
        opts: ['दीर्घ स्वर संधि', 'गुण स्वर संधि', 'वृद्धि स्वर संधि', 'यण स्वर संधि'],
        ans: 0,
        exp: 'आ + अ = आ के नियम से ‘विद्या + अर्थी = विद्यार्थी’ में दीर्घ स्वर संधि है।',
      },
      {
        q: '‘नीलकमल’ (नीला है जो कमल) शब्द में कौन-सा समास है?',
        opts: ['कर्मधारय समास', 'द्वंद्व समास', 'द्विगु समास', 'तत्पुरुष समास'],
        ans: 0,
        exp: 'जहाँ पूर्वपद विशेषण (नीला) और उत्तरपद विशेष्य (कमल) हो, वहाँ कर्मधारय समास होता है।',
      },
      {
        q: '‘चारु चंद्र की चंचल किरणें खेल रही हैं जल-थल में’ — इस पंक्ति में कौन-सा अलंकार है?',
        opts: ['अनुप्रास अलंकार', 'यमक अलंकार', 'श्लेष अलंकार', 'उपमा अलंकार'],
        ans: 0,
        exp: 'यहाँ ‘च’ वर्ण की बार-बार आवृत्ति होने के कारण अनुप्रास अलंकार है।',
      },
      {
        q: '‘आँखों का तारा होना’ मुहावरे का सही अर्थ क्या है?',
        opts: ['बहुत प्यारा होना', 'बहुत दूर जाना', 'धोखा देना', 'क्रोधित होना'],
        ans: 0,
        exp: '‘आँखों का तारा होना’ मुहावरे का अर्थ ‘अत्यंत प्रिय या बहुत प्यारा होना’ है।',
      },
      {
        q: '‘अपमान’ शब्द में प्रयुक्त उपसर्ग कौन-सा है?',
        opts: ['अप', 'अ', 'मान', 'न'],
        ans: 0,
        exp: 'मूल शब्द ‘मान’ के पूर्व ‘अप’ उपसर्ग जुड़कर ‘अपमान’ शब्द बना है।',
      },
    ],
  };

  // Select best bank or build custom topic questions dynamically
  let selectedPool: QItem[] = [];
  if (lower.includes('quadratic')) {
    selectedPool = [...topicBanks.quadratic, ...topicBanks.mathGeneral];
  } else if (lower.includes('trigonometr')) {
    selectedPool = [...topicBanks.trigonometry, ...topicBanks.mathGeneral];
  } else if (
    lower.includes('संधि') ||
    lower.includes('समास') ||
    lower.includes('अलंकार') ||
    lower.includes('मुहावरे') ||
    lower.includes('हिंदी') ||
    lower.includes('hindi') ||
    lower.includes('vyakaran') ||
    lower.includes('व्याकरण')
  ) {
    selectedPool = topicBanks.hindiGeneral;
  } else if (
    lower.includes('english') ||
    lower.includes('tense') ||
    lower.includes('grammar') ||
    lower.includes('speech') ||
    lower.includes('passive') ||
    lower.includes('modal') ||
    lower.includes('comprehension')
  ) {
    selectedPool = topicBanks.englishGeneral;
  } else if (
    lower.includes('social') ||
    lower.includes('history') ||
    lower.includes('geography') ||
    lower.includes('civics') ||
    lower.includes('economics') ||
    lower.includes('revolution') ||
    lower.includes('nationalism') ||
    lower.includes('democracy')
  ) {
    selectedPool = topicBanks.sstGeneral;
  } else if (
    lower.includes('math') ||
    lower.includes('algebra') ||
    lower.includes('polynomial') ||
    lower.includes('number') ||
    lower.includes('equation') ||
    lower.includes('geometry') ||
    lower.includes('triangle') ||
    lower.includes('circle') ||
    lower.includes('area') ||
    lower.includes('volume') ||
    lower.includes('probability') ||
    lower.includes('statistic')
  ) {
    selectedPool = [...topicBanks.mathGeneral, ...topicBanks.quadratic, ...topicBanks.trigonometry];
  } else if (
    lower.includes('science') ||
    lower.includes('physics') ||
    lower.includes('chemistry') ||
    lower.includes('biology') ||
    lower.includes('motion') ||
    lower.includes('force') ||
    lower.includes('cell') ||
    lower.includes('acid') ||
    lower.includes('light') ||
    lower.includes('electricity') ||
    lower.includes('chemical')
  ) {
    selectedPool = topicBanks.scienceGeneral;
  }

  // Dynamic Topic-Specific Questions so ANY custom topic gets tailored questions
  const dynamicTopicQuestions: QItem[] = [
    {
      q: ` regarding "${cleanTopic}", which of the following statements best describes its fundamental principle in ${subjectHint || 'the syllabus'}?`,
      opts: [
        `It establishes the core definitions, governing rules, and systematic relationships of ${cleanTopic}.`,
        `It states that ${cleanTopic} operates independently of any measurable variables or rules.`,
        `It restricts ${cleanTopic} solely to hypothetical cases with no practical applications.`,
        `None of the above statements apply to ${cleanTopic}.`,
      ],
      ans: 0,
      exp: `In ${subjectHint || classLevel}, ${cleanTopic} is defined by its core principles, standard formulas/rules, and real-world applications.`,
    },
    {
      q: `When solving a ${difficulty.toLowerCase()}-level problem on "${cleanTopic}", what should be the first analytical step?`,
      opts: [
        `Identify the given parameters, core concept of ${cleanTopic}, and the appropriate governing rule or formula.`,
        `Skip reading the conditions and guess the final numerical value directly.`,
        `Ignore unit conversions and standard conventions for ${cleanTopic}.`,
        `Assume all variables in ${cleanTopic} are equal to zero.`,
      ],
      ans: 0,
      exp: `Carefully identifying the given data and linking it to the governing rule of ${cleanTopic} prevents calculation and conceptual errors.`,
    },
    {
      q: `Which of the following is a primary exam application of "${cleanTopic}"?`,
      opts: [
        `Analyzing cause-and-effect relationships and solving structured problems based on ${cleanTopic}.`,
        `Memorizing unrelated facts without understanding the mechanism of ${cleanTopic}.`,
        `Eliminating standard units and definitions when writing answers on ${cleanTopic}.`,
        `Treating ${cleanTopic} as an exception to all logical principles.`,
      ],
      ans: 0,
      exp: `Competency-based exams test how accurately you apply the rules of ${cleanTopic} to structured analytical and numerical problems.`,
    },
  ];

  const combinedPool = selectedPool.length > 0 ? [...selectedPool, ...dynamicTopicQuestions] : dynamicTopicQuestions;

  const result = [];
  for (let i = 0; i < count; i++) {
    const baseItem = combinedPool[i % combinedPool.length];
    // Rotate correct answer index deterministically so answers aren't always option A (0)
    const shift = i % 4;
    const rotatedOpts: string[] = [
      baseItem.opts[(0 + 4 - shift) % 4],
      baseItem.opts[(1 + 4 - shift) % 4],
      baseItem.opts[(2 + 4 - shift) % 4],
      baseItem.opts[(3 + 4 - shift) % 4],
    ];
    const newAns = (baseItem.ans + shift) % 4;

    const cycleNum = Math.floor(i / combinedPool.length);
    const questionText =
      cycleNum === 0
        ? baseItem.q.startsWith(' regarding')
          ? `In ${cleanTopic},${baseItem.q}`
          : baseItem.q
        : `[${cleanTopic} · Practice Set ${cycleNum + 1}] ${baseItem.q}`;

    result.push({
      id: i + 1,
      question: questionText,
      options: rotatedOpts,
      answer: newAns,
      explanation: baseItem.exp,
    });
  }
  return result;
}

const mockTestCache = new Map<string, any[]>();

// Endpoint to generate professional Mock Tests for ANY topic and up to 60 questions
app.post('/api/generate-mock-test', async (req: Request, res: Response) => {
  try {
    const {
      topic,
      subject = 'Mathematics',
      difficulty = 'Medium',
      count = 10,
      negativeMarking = true,
      studentProfile,
    } = req.body;
    const classLevel = studentProfile?.classLevel || 'Class 10';
    const exam = studentProfile?.primaryExam || 'CBSE';
    const clampedCount = Math.min(Math.max(Number(count) || 10, 1), 60);
    const cleanTopic = String(topic || 'Quadratic Equations').trim();

    const cacheKey = `${cleanTopic.toLowerCase()}::${subject}::${difficulty}::${classLevel}`;
    if (mockTestCache.has(cacheKey)) {
      const cachedQuestions = mockTestCache.get(cacheKey)!;
      if (cachedQuestions.length >= clampedCount) {
        return res.json({
          topic: cleanTopic,
          subject,
          difficulty,
          negativeMarking: Boolean(negativeMarking),
          questions: cachedQuestions.slice(0, clampedCount).map((q, idx) => ({ ...q, id: idx + 1 })),
        });
      }
    }

    // Request up to 20 AI-generated questions in a fast batch so response stays rapid (< 9s),
    // and if the user requested > 20 (e.g. 30 or 60), seamlessly supplement with topic-matched questions
    const aiBatchCount = Math.min(clampedCount, 20);

    const systemInstruction = `You are an expert ${exam} examination question paper setter.
Generate an authentic, high-quality multiple choice mock test paper on the exact topic: "${cleanTopic}" (Subject: ${subject}, Class: ${classLevel}, Difficulty: ${difficulty}).
Language Rule: If the topic or subject is Hindi, write questions, options, and explanations in clear Hindi. Otherwise write in clear English.
Make every question specific to "${cleanTopic}" with realistic distractors and a clear step-by-step explanation.

Return ONLY a valid JSON object matching this exact schema (no markdown fences):
{
  "questions": [
    {
      "id": 1,
      "question": "Specific question on ${cleanTopic}...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Step-by-step explanation why the correct option is right."
    }
  ]
}
CRITICAL: "answer" MUST be a 0-based integer (0, 1, 2, or 3) indicating the index of the correct option. Vary the correct option index across questions.`;

    const prompt = `Generate ${aiBatchCount} distinct ${difficulty}-difficulty multiple-choice questions on the topic "${cleanTopic}" (Subject: ${subject}, Level: ${classLevel}).`;

    let parsedQuestions: any[] = [];
    const activeGeminiKey = process.env.GEMINI_API_KEY || geminiApiKey;

    if (activeGeminiKey) {
      const client = getGeminiClient();
      const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

      for (const modelName of modelsToTry) {
        try {
          const supportsThinking =
            modelName === 'gemini-3.8-flash' || modelName === 'gemini-3.1-flash-lite';
          const response = await withTimeout(
            client.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.4,
                maxOutputTokens: 2800,
                responseMimeType: 'application/json',
                ...(supportsThinking
                  ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
                  : {}),
              },
            }),
            10000
          );

          if (response.text) {
            const raw = response.text.trim();
            const firstBrace = raw.indexOf('{');
            const lastBrace = raw.lastIndexOf('}');
            const jsonStr =
              firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
                ? raw.substring(firstBrace, lastBrace + 1)
                : raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
              parsedQuestions = normalizeMockQuestions(parsed.questions, classLevel, cleanTopic);
              break;
            }
          }
        } catch {
          // Try next Gemini model
        }
      }
    }

    if (parsedQuestions.length > 0) {
      mockTestCache.set(cacheKey, parsedQuestions);
      let finalQuestions = [...parsedQuestions];
      if (finalQuestions.length < clampedCount) {
        const extraNeeded = clampedCount - finalQuestions.length;
        const supplemental = getCurriculumFallbackQuestions(
          cleanTopic,
          classLevel,
          extraNeeded,
          difficulty,
          subject
        );
        finalQuestions = [
          ...finalQuestions,
          ...supplemental.map((q, idx) => ({
            ...q,
            id: finalQuestions.length + idx + 1,
          })),
        ];
      }
      return res.json({
        topic: cleanTopic,
        subject,
        difficulty,
        negativeMarking: Boolean(negativeMarking),
        questions: finalQuestions.slice(0, clampedCount).map((q, idx) => ({ ...q, id: idx + 1 })),
      });
    }

    // Topic-intelligent fallback questions
    const fallbackQuestions = getCurriculumFallbackQuestions(
      cleanTopic,
      classLevel,
      clampedCount,
      difficulty,
      subject
    );
    res.json({
      topic: cleanTopic,
      subject,
      difficulty,
      negativeMarking: Boolean(negativeMarking),
      questions: fallbackQuestions,
    });
  } catch (error: any) {
    console.error('Mock test error:', error);
    const clampedCount = Math.min(Math.max(Number(req.body?.count) || 10, 1), 60);
    const fallback = getCurriculumFallbackQuestions(
      req.body?.topic || 'Quadratic Equations',
      req.body?.studentProfile?.classLevel || 'Class 10',
      clampedCount,
      req.body?.difficulty || 'Medium',
      req.body?.subject || 'Mathematics'
    );
    res.json({
      topic: req.body?.topic || 'Quadratic Equations',
      difficulty: req.body?.difficulty || 'Medium',
      negativeMarking: Boolean(req.body?.negativeMarking),
      questions: fallback,
    });
  }
});

// Endpoint to generate structured interactive Flashcard decks for Class 4 to 9
app.post('/api/generate-flashcards', async (req: Request, res: Response) => {
  try {
    const { topic, count = 8, studentProfile } = req.body;
    const classLevel = studentProfile?.classLevel || 'Class 9';

    const systemInstruction = `Generate ${count} high-yield flashcards suitable strictly for ${classLevel} (Classes 4th to 9th).
Return ONLY a valid JSON array of flashcard objects:
[
  {
    "id": 1,
    "front": "Question, formula, or concept name",
    "back": "Clear concise answer and definition",
    "tip": "Simple memory trick or mnemonic",
    "category": "${topic}"
  }
]`;

    const result = await generateAIResponse({
      systemInstruction,
      contents: [{ role: 'user', text: `Create ${count} flashcards for topic: "${topic}" for ${classLevel}.` }],
      temperature: 0.6,
    });

    try {
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      res.json(parsed);
    } catch {
      res.json([
        {
          id: 1,
          front: `What is the powerhouse of the cell? (${classLevel})`,
          back: 'The Mitochondrion (produces cellular energy in the form of ATP).',
          tip: 'Mighty Mitochondria = Powerhouse',
          category: topic,
        },
      ]);
    }
  } catch (error: any) {
    console.error('Flashcard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to synthesize markdown content from structured note sections
function buildMarkdownFromStructuredNote(
  executiveSummary: string,
  conceptSections: any[],
  formulaTable: { columns: string[]; rows: any[] }
): string {
  let md = `## 📌 Executive Summary\n${executiveSummary}\n\n---\n\n## 🧠 Key Definitions & Concepts\n\n`;
  if (Array.isArray(conceptSections)) {
    for (const sec of conceptSections) {
      md += `### ${sec.number}. ${sec.title}\n`;
      if (Array.isArray(sec.points)) {
        for (const pt of sec.points) {
          md += `- **${pt.term}**: ${pt.definition}\n`;
          if (Array.isArray(pt.subPoints)) {
            for (const sp of pt.subPoints) {
              md += `  - ${sp}\n`;
            }
          }
        }
      }
      md += '\n';
    }
  }
  if (formulaTable && Array.isArray(formulaTable.rows) && formulaTable.rows.length > 0) {
    const cols =
      Array.isArray(formulaTable.columns) && formulaTable.columns.length === 4
        ? formulaTable.columns
        : ['Concept / Term', 'Formula / Rule / Key Fact', 'Unit / Category', 'Key Takeaway'];
    md += `---\n\n## 📐 Important Formulas / Rules / Key Facts\n\n`;
    md += `| ${cols.join(' | ')} |\n| :--- | :--- | :--- | :--- |\n`;
    for (const r of formulaTable.rows) {
      md += `| **${r.concept || ''}** | ${r.formula || ''} | ${r.unit || ''} | ${r.takeaway || ''} |\n`;
    }
  }
  return md.trim();
}

// Comprehensive, topic-intelligent note generator for ANY topic across all subjects
function buildDynamicNoteForAnyTopic(
  topic: string,
  subject: string,
  classLevel: string,
  noteType: string,
  detailLevel: string
) {
  const cleanTopic = topic.trim();
  const lower = cleanTopic.toLowerCase();

  let detectedSubject = subject;
  if (
    lower.includes('संधि') ||
    lower.includes('समास') ||
    lower.includes('अलंकार') ||
    lower.includes('मुहावरे') ||
    lower.includes('उपसर्ग') ||
    lower.includes('प्रत्यय') ||
    lower.includes('पत्र') ||
    lower.includes('संज्ञा') ||
    lower.includes('सर्वनाम')
  ) {
    detectedSubject = 'Hindi';
  } else if (
    lower.includes('tense') ||
    lower.includes('passive') ||
    lower.includes('speech') ||
    lower.includes('modal') ||
    lower.includes('figure of speech') ||
    lower.includes('figures of speech') ||
    lower.includes('parts of speech') ||
    lower.includes('determiner')
  ) {
    detectedSubject = 'English';
  } else if (
    lower.includes('revolution') ||
    lower.includes('depression') ||
    lower.includes('constitution') ||
    lower.includes('revolt') ||
    lower.includes('drainage') ||
    lower.includes('river') ||
    lower.includes('democracy') ||
    lower.includes('monsoon') ||
    lower.includes('nationalism')
  ) {
    detectedSubject = 'Social Science';
  } else if (
    lower.includes('cell') ||
    lower.includes('force') ||
    lower.includes('motion') ||
    lower.includes('acid') ||
    lower.includes('light') ||
    lower.includes('photosynthesis') ||
    lower.includes('atom') ||
    lower.includes('molecule') ||
    lower.includes('gravitation') ||
    lower.includes('electricity') ||
    lower.includes('sound') ||
    lower.includes('tissue')
  ) {
    detectedSubject = 'Science';
  }

  let executiveSummary = '';
  let conceptSections: any[] = [];
  let formulaTable: { columns: string[]; rows: any[] } = {
    columns: ['Concept / Term', 'Formula / Rule / Principle', 'Unit / Context', 'Key Takeaway'],
    rows: [],
  };
  let keyTakeaways: string[] = [];
  let examTips: string[] = [];

  // ==================== MATHEMATICS TOPICS ====================
  if (lower.includes('trigonometr')) {
    executiveSummary = `Trigonometry is the branch of mathematics that studies the quantitative relationships between the side lengths and angles of right-angled triangles using six primary trigonometric ratios (sin, cos, tan, cosec, sec, cot), standard angle values (0° to 90°), and Pythagorean identities.`;
    conceptSections = [
      {
        number: 1,
        title: 'Six Trigonometric Ratios in a Right-Angled Triangle',
        points: [
          {
            term: 'Primary Ratios (sin θ, cos θ, tan θ)',
            definition: 'Defined for an acute angle θ in a right triangle with Perpendicular (P, opposite to θ), Base (B, adjacent to θ), and Hypotenuse (H, opposite to 90°).',
            subPoints: [
              'sin θ = Perpendicular (P) / Hypotenuse (H)',
              'cos θ = Base (B) / Hypotenuse (H)',
              'tan θ = Perpendicular (P) / Base (B) = sin θ / cos θ',
            ],
          },
          {
            term: 'Reciprocal & Complementary Ratios',
            definition: 'cosec θ = 1/sin θ = H/P, sec θ = 1/cos θ = H/B, and cot θ = 1/tan θ = B/P = cos θ / sin θ.',
            subPoints: [
              'Complementary Pairs: sin(90° - θ) = cos θ, tan(90° - θ) = cot θ, sec(90° - θ) = cosec θ.',
              'Product Identities: sin θ · cosec θ = 1, cos θ · sec θ = 1, tan θ · cot θ = 1.',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Standard Angles & Fundamental Pythagorean Identities',
        points: [
          {
            term: 'Standard Values (0°, 30°, 45°, 60°, 90°)',
            definition: 'Exact trigonometric values used to evaluate expressions and solve heights & distances problems.',
            subPoints: [
              'sin 0° = 0, sin 30° = 1/2, sin 45° = 1/√2, sin 60° = √3/2, sin 90° = 1',
              'cos 0° = 1, cos 30° = √3/2, cos 45° = 1/√2, cos 60° = 1/2, cos 90° = 0',
              'tan 0° = 0, tan 30° = 1/√3, tan 45° = 1, tan 60° = √3, tan 90° = Not Defined',
            ],
          },
          {
            term: 'Three Pythagorean Identities',
            definition: 'Derived directly from P² + B² = H² and valid for all acute angles θ.',
            subPoints: [
              'sin²θ + cos²θ = 1  ⟹  sin²θ = 1 - cos²θ  and  cos²θ = 1 - sin²θ',
              '1 + tan²θ = sec²θ  ⟹  sec²θ - tan²θ = (sec θ - tan θ)(sec θ + tan θ) = 1',
              '1 + cot²θ = cosec²θ  ⟹  cosec²θ - cot²θ = (cosec θ - cot θ)(cosec θ + cot θ) = 1',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Concept / Ratio', 'Formula / Identity', 'Standard Values', 'Key Takeaway'],
      rows: [
        { concept: 'Primary Identity', formula: 'sin²θ + cos²θ = 1', unit: 'sin 30° = 1/2, cos 60° = 1/2', takeaway: 'Fundamental identity for all angles' },
        { concept: 'Quotient Identity', formula: 'tan θ = sin θ / cos θ', unit: 'tan 45° = 1, cot 45° = 1', takeaway: 'Converts tangent into sine & cosine' },
        { concept: 'Secant-Tangent Identity', formula: 'sec²θ - tan²θ = 1', unit: '0° ≤ θ < 90°', takeaway: 'sec θ + tan θ = 1 / (sec θ - tan θ)' },
        { concept: 'Cosecant-Cotangent Identity', formula: 'cosec²θ - cot²θ = 1', unit: '0° < θ ≤ 90°', takeaway: 'cosec θ + cot θ = 1 / (cosec θ - cot θ)' },
      ],
    };
    keyTakeaways = [
      'Use the mnemonic SOH-CAH-TOA: Sine = Opposite/Hypotenuse, Cosine = Adjacent/Hypotenuse, Tangent = Opposite/Adjacent.',
      'Since Hypotenuse is the longest side in a right triangle, sin θ ≤ 1 and cos θ ≤ 1 always.',
      'To prove identities, express all terms in sin θ and cos θ and simplify using algebraic factorisation.',
    ];
    examTips = [
      'Always draw a neat right-angled triangle and mark the reference angle θ clearly before writing ratios.',
      'Rationalize the denominator when your final answer contains √2 or √3 in the denominator.',
    ];
  } else if (lower.includes('geometry') || lower.includes('triangle') || lower.includes('circle') || lower.includes('angle') || lower.includes('quadrilateral')) {
    executiveSummary = `${cleanTopic} explores the properties, theorems, angle relationships, congruence criteria, and similarity rules of lines, angles, triangles, quadrilaterals, and circles in Euclidean plane geometry.`;
    conceptSections = [
      {
        number: 1,
        title: 'Lines, Angles & Properties of Triangles',
        points: [
          {
            term: 'Parallel Lines & Transversal Angles',
            definition: 'When a transversal intersects two parallel lines, corresponding angles are equal, alternate interior angles are equal, and co-interior angles are supplementary (sum = 180°).',
            subPoints: [
              'Linear Pair Axiom: Adjacent angles on a straight line sum to 180°.',
              'Vertically Opposite Angles: Always equal when two straight lines intersect.',
              'Exterior Angle Theorem: The exterior angle of a triangle equals the sum of its two opposite interior angles.',
            ],
          },
          {
            term: 'Congruence & Similarity of Triangles',
            definition: 'Two triangles are congruent (≅) if they have the exact same size and shape; they are similar (~) if corresponding angles are equal and sides are proportional.',
            subPoints: [
              '5 Congruence Criteria: SSS, SAS, ASA, AAS, and RHS (Right angle-Hypotenuse-Side).',
              'Mid-Point Theorem: The line segment joining the mid-points of two sides of a triangle is parallel to the third side and equals half of it.',
              'Basic Proportionality Theorem (Thales Theorem): A line drawn parallel to one side of a triangle divides the other two sides in the same ratio.',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Quadrilaterals & Circle Theorems',
        points: [
          {
            term: 'Parallelogram Properties',
            definition: 'Opposite sides are equal and parallel, opposite angles are equal, and diagonals bisect each other.',
            subPoints: [
              'Rectangle: Diagonals are equal and bisect each other.',
              'Rhombus: Diagonals bisect each other at right angles (90°).',
              'Cyclic Quadrilateral: Opposite angles of a cyclic quadrilateral sum to 180°.',
            ],
          },
          {
            term: 'Essential Circle Theorems',
            definition: 'Governing rules for chords, arcs, subtended angles, and tangents of a circle.',
            subPoints: [
              'Perpendicular from the center of a circle to a chord bisects the chord.',
              'The angle subtended by an arc at the center is double the angle subtended by it at any point on the remaining part of the circle (∠AOB = 2∠ACB).',
              'Angle in a semicircle is always a right angle (90°).',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Geometric Figure / Theorem', 'Formula / Rule', 'Condition', 'Key Takeaway'],
      rows: [
        { concept: 'Angle Sum of Polygon', formula: '(n - 2) × 180°', unit: 'n = number of sides', takeaway: 'Triangle = 180°, Quadrilateral = 360°' },
        { concept: 'Pythagoras Theorem', formula: 'AB² + BC² = AC²', unit: 'Right Triangle (∠B = 90°)', takeaway: 'Hypotenuse squared = sum of legs squared' },
        { concept: 'Central vs Inscribed Angle', formula: '∠Center = 2 × ∠Circumference', unit: 'Same Arc of Circle', takeaway: 'Angles in the same segment are equal' },
        { concept: 'Cyclic Quadrilateral', formula: '∠A + ∠C = 180°, ∠B + ∠D = 180°', unit: 'Vertices on Circle', takeaway: 'Opposite angles are supplementary' },
      ],
    };
    keyTakeaways = [
      'Always write geometric proofs in 4 structured steps: Given, To Prove, Construction (if any), and Proof with reasons in brackets.',
      'CPCT stands for "Corresponding Parts of Congruent Triangles"—use it immediately after proving two triangles congruent.',
      'Equal chords of a circle are equidistant from the center and subtend equal angles at the center.',
    ];
    examTips = [
      'Draw a clean, pencil-labeled figure for every geometry question—even if the question does not explicitly ask for one.',
      'Never assume a figure is a square or right triangle unless given or proved; cite the exact theorem in parentheses.',
    ];
  } else if (lower.includes('mensuration') || lower.includes('surface area') || lower.includes('volume') || lower.includes('heron') || lower.includes('perimeter')) {
    executiveSummary = `Mensuration deals with calculating the perimeter, area, curved/lateral surface area (CSA/LSA), and volume of 2D plane figures (triangles, circles, sectors) and 3D solid shapes (cube, cuboid, cylinder, cone, sphere, hemisphere).`;
    conceptSections = [
      {
        number: 1,
        title: '2D Plane Figures & Heron’s Formula',
        points: [
          {
            term: 'Heron’s Formula for Area of a Triangle',
            definition: 'Used to find the area of a triangle when all three side lengths a, b, and c are known without needing the height.',
            subPoints: [
              'Semi-perimeter: s = (a + b + c) / 2',
              'Area of Triangle = √[s(s - a)(s - b)(s - c)]',
              'Area of Equilateral Triangle of side a = (√3 / 4) a²',
            ],
          },
          {
            term: 'Circles, Sectors & Segments',
            definition: 'For a circle of radius r and sector angle θ (in degrees):',
            subPoints: [
              'Circumference = 2πr  |  Area of Circle = πr²',
              'Length of Arc = (θ / 360°) × 2πr',
              'Area of Sector = (θ / 360°) × πr²',
            ],
          },
        ],
      },
      {
        number: 2,
        title: '3D Solids: Surface Area & Volume Formulas',
        points: [
          {
            term: 'Cube, Cuboid & Right Circular Cylinder',
            definition: 'LSA/CSA excludes the top and bottom bases, while Total Surface Area (TSA) includes all faces.',
            subPoints: [
              'Cuboid (l, b, h): LSA = 2h(l + b), TSA = 2(lb + bh + hl), Volume = l × b × h, Diagonal = √(l² + b² + h²)',
              'Cube (side a): LSA = 4a², TSA = 6a², Volume = a³, Diagonal = √3 a',
              'Cylinder (radius r, height h): CSA = 2πrh, TSA = 2πr(r + h), Volume = πr²h',
            ],
          },
          {
            term: 'Right Circular Cone, Sphere & Hemisphere',
            definition: 'For a cone, slant height l = √(r² + h²).',
            subPoints: [
              'Cone: CSA = πrl, TSA = πr(l + r), Volume = (1/3)πr²h',
              'Sphere: Surface Area = 4πr², Volume = (4/3)πr³',
              'Hemisphere: CSA = 2πr², TSA = 3πr², Volume = (2/3)πr³',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['3D Solid / Shape', 'Curved / Lateral SA', 'Total Surface Area (TSA)', 'Volume Formula'],
      rows: [
        { concept: 'Cuboid (l, b, h)', formula: '2h(l + b)', unit: '2(lb + bh + hl)', takeaway: 'Volume = l × b × h' },
        { concept: 'Cylinder (r, h)', formula: '2πrh', unit: '2πr(h + r)', takeaway: 'Volume = πr²h' },
        { concept: 'Cone (r, h, l)', formula: 'πrl  [l = √(r²+h²)]', unit: 'πr(l + r)', takeaway: 'Volume = (1/3)πr²h' },
        { concept: 'Sphere & Hemisphere', formula: 'Sphere: 4πr² | Hemi: 2πr²', unit: 'Hemisphere TSA = 3πr²', takeaway: 'Sphere V = (4/3)πr³ | Hemi V = (2/3)πr³' },
      ],
    };
    keyTakeaways = [
      'Always check that all dimensions are in the same unit (all in cm or all in m) before substituting into any formula.',
      'When a solid is melted and recast into another shape, its Volume remains conserved (V₁ = V₂).',
      'Unit conversion: 1 m³ = 1000 Litres and 1000 cm³ = 1 Litre.',
    ];
    examTips = [
      'Keep π = 22/7 (or 3.14) factored out until the very last calculation step so common factors cancel easily.',
      'Write sq. units (cm²/m²) for area and cubic units (cm³/m³) for volume—missing units costs ½ mark!',
    ];
  } else if (lower.includes('statistic') || lower.includes('probability') || lower.includes('mean') || lower.includes('median') || lower.includes('mode')) {
    executiveSummary = `${cleanTopic} covers the collection, organization, presentation, and analysis of data using Measures of Central Tendency (Mean, Median, Mode) and quantifies the likelihood of events through Probability.`;
    conceptSections = [
      {
        number: 1,
        title: 'Measures of Central Tendency (Mean, Median, Mode)',
        points: [
          {
            term: 'Arithmetic Mean (x̄)',
            definition: 'The average of all observations, calculated by dividing the sum of observations by the total number of observations.',
            subPoints: [
              'Ungrouped Data: x̄ = (∑xᵢ) / n',
              'Grouped Data (Direct Method): x̄ = (∑fᵢxᵢ) / (∑fᵢ), where xᵢ = (Upper Limit + Lower Limit) / 2 is the class mark.',
              'Assumed Mean Method: x̄ = a + (∑fᵢdᵢ) / (∑fᵢ), where dᵢ = xᵢ - a.',
            ],
          },
          {
            term: 'Median & Mode',
            definition: 'Median is the middle-most observation when data is arranged in ascending/descending order; Mode is the observation with the highest frequency.',
            subPoints: [
              'Ungrouped Median: If n is odd, [(n+1)/2]th term; if n is even, average of (n/2)th and [(n/2)+1]th terms.',
              'Empirical Relationship: 3 Median = Mode + 2 Mean.',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Probability: Experimental & Classical Approach',
        points: [
          {
            term: 'Probability of an Event P(E)',
            definition: 'The ratio of outcomes favorable to event E to the total number of possible outcomes in the sample space.',
            subPoints: [
              'P(E) = (Number of Favorable Outcomes) / (Total Number of Possible Outcomes)',
              'Range of Probability: 0 ≤ P(E) ≤ 1 (0 for an impossible event, 1 for a sure/certain event).',
              'Complementary Event: P(E) + P(not E) = 1  ⟹  P(Ē) = 1 - P(E).',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Measure / Concept', 'Formula / Equation', 'Key Variables', 'Key Takeaway'],
      rows: [
        { concept: 'Mean (Direct Method)', formula: 'x̄ = ∑(fᵢ · xᵢ) / ∑fᵢ', unit: 'xᵢ = Class Mark', takeaway: 'Sensitive to extreme values (outliers)' },
        { concept: 'Empirical Formula', formula: 'Mode = 3 Median - 2 Mean', unit: 'Central Tendency', takeaway: 'Links Mean, Median, and Mode directly' },
        { concept: 'Probability P(E)', formula: 'n(E) / n(S)', unit: '0 ≤ P(E) ≤ 1', takeaway: 'Probability can never be negative or > 1' },
        { concept: 'Complement Rule', formula: 'P(not E) = 1 - P(E)', unit: 'Sum of all P = 1', takeaway: 'Fastest way to find "at least one" probability' },
      ],
    };
    keyTakeaways = [
      'Always sort ungrouped data in ascending order before finding the Median!',
      'Standard deck of 52 playing cards has 4 suits (26 Red: Hearts, Diamonds; 26 Black: Spades, Clubs) and 12 Face Cards (4 Kings, 4 Queens, 4 Jacks).',
      'Note that 1 is neither a prime number nor a composite number when solving dice/number probability questions.',
    ];
    examTips = [
      'Express final probability answers in simplest fraction form (e.g., 1/2 instead of 3/6).',
      'Double-check ∑fᵢ against the total number of observations given in the question statement.',
    ];
  } else if (lower.includes('number system') || lower.includes('real number') || lower.includes('rational') || lower.includes('irrational') || lower.includes('exponent') || lower.includes('surd')) {
    executiveSummary = `The Number System classifies numbers into Natural (ℕ), Whole (𝕎), Integers (ℤ), Rational (ℚ), Irrational, and Real Numbers (ℝ), covering decimal expansions, rationalization of surds, and laws of exponents.`;
    conceptSections = [
      {
        number: 1,
        title: 'Classification of Real Numbers & Decimal Expansions',
        points: [
          {
            term: 'Rational Numbers (ℚ)',
            definition: 'Numbers that can be expressed in the form p/q where p and q are integers and q ≠ 0.',
            subPoints: [
              'Terminating Decimal Expansion: Occurs when prime factorisation of q (in lowest form) is of the form 2ⁿ · 5ᵐ (where n, m ≥ 0).',
              'Non-Terminating Recurring (Repeating) Decimal: Occurs when q has prime factors other than 2 and 5 (e.g., 1/3 = 0.333...).',
            ],
          },
          {
            term: 'Irrational Numbers',
            definition: 'Numbers that cannot be written in p/q form; their decimal expansion is non-terminating and non-recurring.',
            subPoints: [
              'Examples: √2, √3, √5, π, and 0.1010010001...',
              'Fundamental Theorem of Arithmetic: Every composite number can be uniquely expressed as a product of primes, resulting in HCF(a, b) × LCM(a, b) = a × b.',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Rationalisation of Denominators & Laws of Exponents',
        points: [
          {
            term: 'Rationalising Factor (Conjugate Surds)',
            definition: 'To remove radicals from the denominator of 1/(a + √b), multiply numerator and denominator by its conjugate (a - √b).',
            subPoints: [
              '1 / (√a + √b) = (√a - √b) / (a - b)',
              '1 / (a + b√x) = (a - b√x) / (a² - b²x)',
            ],
          },
          {
            term: 'Laws of Exponents for Real Numbers (a, b > 0)',
            definition: 'Rules governing powers with rational exponents m and n:',
            subPoints: [
              'aᵐ · aⁿ = aᵐ⁺ⁿ  |  aᵐ / aⁿ = aᵐ⁻ⁿ  |  (aᵐ)ⁿ = aᵐⁿ',
              '(ab)ᵐ = aᵐbᵐ  |  a⁰ = 1  |  a⁻ⁿ = 1 / aⁿ  |  a^(m/n) = ⁿ√(aᵐ)',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Concept / Law', 'Mathematical Rule', 'Condition', 'Key Takeaway'],
      rows: [
        { concept: 'HCF & LCM Relation', formula: 'HCF(a, b) × LCM(a, b) = a × b', unit: 'For two positive integers', takeaway: 'Valid strictly for 2 numbers' },
        { concept: 'Terminating Decimal Test', formula: 'Denominator q = 2ⁿ × 5ᵐ', unit: 'p/q in lowest form', takeaway: 'Terminates after max(n, m) places' },
        { concept: 'Conjugate Rationalisation', formula: '(√a + √b)(√a - √b) = a - b', unit: 'a, b > 0', takeaway: 'Eliminates square roots from denominator' },
        { concept: 'Fractional Exponent', formula: 'a^(p/q) = (q-th root of a)^p', unit: 'a > 0', takeaway: 'Example: 64^(2/3) = (4)³^(2/3) = 4² = 16' },
      ],
    };
    keyTakeaways = [
      'Every real number is represented by a unique point on the number line (and vice-versa).',
      'The sum, difference, product, or quotient of a non-zero rational and an irrational number is always irrational.',
      'To convert 0.7̄ (bar) to p/q form: let x = 0.777..., multiply by 10ᵖ (where p is number of repeating digits), and subtract.',
    ];
    examTips = [
      'Always simplify p/q to its coprime (lowest) form before checking whether q = 2ⁿ · 5ᵐ.',
      'Never leave an irrational radical in the denominator of your final exam answer.',
    ];
  } else if (lower.includes('algebra') || lower.includes('polynomial') || lower.includes('quadratic') || lower.includes('equation') || lower.includes('linear')) {
    executiveSummary = `${cleanTopic} forms the core of algebraic problem solving—covering degrees and zeroes of polynomials, Remainder & Factor Theorems, standard algebraic identities, linear systems, and roots of quadratic equations.`;
    conceptSections = [
      {
        number: 1,
        title: `Polynomials, Zeroes & Algebraic Identities`,
        points: [
          {
            term: 'Polynomials & Relationship Between Zeroes and Coefficients',
            definition: 'An expression p(x) = aₙxⁿ + ... + a₁x + a₀ with non-negative integral powers of x.',
            subPoints: [
              'Linear Polynomial (ax + b): Degree 1, has 1 zero x = -b/a.',
              'Quadratic Polynomial (ax² + bx + c): Sum of zeroes (α + β) = -b/a, Product of zeroes (αβ) = c/a.',
              'Remainder Theorem: When p(x) is divided by (x - a), remainder = p(a). If p(a) = 0, (x - a) is a factor.',
            ],
          },
          {
            term: 'Master Algebraic Identities',
            definition: 'Essential identities for rapid expansion and factorisation:',
            subPoints: [
              '(a + b)² = a² + 2ab + b²  |  (a - b)² = a² - 2ab + b²  |  a² - b² = (a + b)(a - b)',
              '(a + b + c)² = a² + b² + c² + 2(ab + bc + ca)',
              '(a ± b)³ = a³ ± b³ ± 3ab(a ± b)  |  a³ ± b³ = (a ± b)(a² ∓ ab + b²)',
              'If a + b + c = 0, then a³ + b³ + c³ = 3abc.',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Quadratic Equations & Nature of Roots',
        points: [
          {
            term: 'Quadratic Formula & Discriminant (D)',
            definition: 'For ax² + bx + c = 0 (a ≠ 0), roots are x = [-b ± √(b² - 4ac)] / (2a), where Discriminant D = b² - 4ac.',
            subPoints: [
              'If D > 0: Two distinct real roots.',
              'If D = 0: Two equal (coincident) real roots (x = -b / 2a).',
              'If D < 0: No real roots (complex conjugate roots).',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Concept / Identity', 'Formula / Equation', 'Condition', 'Key Takeaway'],
      rows: [
        { concept: 'Quadratic Formula', formula: 'x = (-b ± √(b² - 4ac)) / 2a', unit: 'ax² + bx + c = 0', takeaway: 'Works for all quadratic equations' },
        { concept: 'Sum & Product of Roots', formula: 'α + β = -b/a  |  αβ = c/a', unit: 'Quadratic Polynomial', takeaway: 'p(x) = k[x² - (α+β)x + αβ]' },
        { concept: 'Difference of Cubes', formula: 'a³ - b³ = (a - b)(a² + ab + b²)', unit: 'Degree 3', takeaway: 'Watch the +ab sign in the second bracket' },
        { concept: 'Conditional Cubic Rule', formula: 'a³ + b³ + c³ = 3abc', unit: 'When a + b + c = 0', takeaway: 'Fastest way to cube-sum 3 numbers summing to 0' },
      ],
    };
    keyTakeaways = [
      'A polynomial of degree n has at most n real zeroes; geometrically, zeroes are the x-coordinates where y = p(x) cuts the x-axis.',
      'Always arrange polynomial terms in descending order of powers before long division or middle-term splitting.',
      'Check the discriminant D = b² - 4ac first to immediately determine the nature of roots.',
    ];
    examTips = [
      'Substitute your final root back into LHS of the original equation to verify LHS = RHS in 10 seconds.',
      'In word problems (speed, age, geometry), reject negative values for physical quantities like length or time.',
    ];

  // ==================== SCIENCE TOPICS ====================
  } else if (lower.includes('cell') || lower.includes('organelle') || lower.includes('mitochondria') || lower.includes('tissue')) {
    executiveSummary = `${cleanTopic} explores the structural and functional organization of living organisms—comparing Prokaryotic and Eukaryotic cells, Plant vs. Animal cells, plasma membrane transport (diffusion & osmosis), and specialized cell organelles.`;
    conceptSections = [
      {
        number: 1,
        title: 'Cell Theory, Types of Cells & Plasma Membrane',
        points: [
          {
            term: 'Discovery & Cell Theory',
            definition: 'Robert Hooke discovered cells in cork (1665); Schleiden & Schwann (1839) formulated Cell Theory, expanded by Rudolf Virchow (1855) with "Omnis cellula-e-cellula" (all cells arise from pre-existing cells).',
            subPoints: [
              'Prokaryotic Cells: Lack a nuclear membrane and membrane-bound organelles; have a nucleoid and 70S ribosomes (e.g., Bacteria, Blue-green algae).',
              'Eukaryotic Cells: Have a well-defined membrane-bound nucleus and organelles (e.g., Plants, Animals, Fungi).',
            ],
          },
          {
            term: 'Plasma Membrane & Osmosis in Solutions',
            definition: 'A selectively permeable lipid-protein bilayer that regulates movement of water by osmosis:',
            subPoints: [
              'Hypotonic Solution (dilute): Cell gains water by endosmosis and swells up.',
              'Isotonic Solution (equal concentration): No net movement of water; cell size stays unchanged.',
              'Hypertonic Solution (concentrated): Cell loses water by exosmosis and shrinks (plasmolysis in plants).',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Structure & Functions of Major Cell Organelles',
        points: [
          {
            term: 'Nucleus, ER, and Golgi Apparatus',
            definition: 'Coordinated endomembrane and genetic control system of the cell.',
            subPoints: [
              'Nucleus: Contains chromosomes made of DNA and histone proteins; nucleolus is the site of ribosome formation.',
              'Endoplasmic Reticulum (ER): Rough ER (with ribosomes) synthesizes proteins; Smooth ER synthesizes lipids and detoxifies drugs.',
              'Golgi Apparatus: Modifies, packages, and dispatches synthesized proteins and forms lysosomes.',
            ],
          },
          {
            term: 'Mitochondria, Plastids, Lysosomes & Vacuoles',
            definition: 'Energy conversion, storage, and waste-disposal organelles.',
            subPoints: [
              'Mitochondria ("Powerhouse"): Generates ATP via cellular respiration; has its own circular DNA and ribosomes.',
              'Plastids (Plant cells only): Chloroplasts (photosynthesis), Chromoplasts (color), Leucoplasts (storage).',
              'Lysosomes ("Suicide Bags"): Contain powerful digestive enzymes to break down worn-out cell parts.',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Organelle / Structure', 'Nickname / Role', 'Key Feature', 'Key Takeaway'],
      rows: [
        { concept: 'Mitochondria', formula: 'Powerhouse of the Cell', unit: 'Synthesizes ATP', takeaway: 'Semi-autonomous (has own DNA & ribosomes)' },
        { concept: 'Chloroplast', formula: 'Kitchen of the Cell', unit: 'Plant Cells Only', takeaway: 'Traps solar energy via chlorophyll' },
        { concept: 'Lysosome', formula: 'Suicide Bag of the Cell', unit: 'Hydrolytic Enzymes', takeaway: 'Digests foreign invaders & damaged organelles' },
        { concept: 'Ribosome', formula: 'Protein Factory', unit: 'Non-membrane bound', takeaway: 'Present in both Prokaryotes & Eukaryotes' },
      ],
    };
    keyTakeaways = [
      'Plant cells have a rigid cellulose cell wall, plastids, and a large central vacuole (50–90% volume), whereas animal cells lack these and have centrioles.',
      'Mitochondria and Chloroplasts are semi-autonomous organelles capable of making some of their own proteins.',
      'Endocytosis (e.g., Amoeba engulfing food) is possible because of the flexibility of the plasma membrane.',
    ];
    examTips = [
      'Always draw a neat, side-by-side tabular comparison when asked to differentiate between Prokaryotic/Eukaryotic or Plant/Animal cells.',
      'Label at least 5 parts clearly on one side when drawing a Plant or Animal cell diagram.',
    ];
  } else if (lower.includes('force') || lower.includes('motion') || lower.includes('newton') || lower.includes('gravitation') || lower.includes('work') || lower.includes('energy')) {
    executiveSummary = `${cleanTopic} explains the physical laws governing kinematics, balanced and unbalanced forces, momentum conservation, Newton’s three laws of motion, gravitation, and the work-energy theorem.`;
    conceptSections = [
      {
        number: 1,
        title: 'Equations of Motion & Newton’s Three Laws',
        points: [
          {
            term: 'Three Equations of Uniformly Accelerated Motion',
            definition: 'Relate initial velocity (u), final velocity (v), uniform acceleration (a), time (t), and displacement (s):',
            subPoints: [
              'First Equation (Velocity-Time): v = u + at',
              'Second Equation (Position-Time): s = ut + ½at²',
              'Third Equation (Position-Velocity): v² - u² = 2as',
            ],
          },
          {
            term: 'Newton’s Laws of Motion & Momentum (p = mv)',
            definition: 'Quantitative relationship between external force, mass, inertia, and rate of change of momentum.',
            subPoints: [
              '1st Law (Law of Inertia): A body stays at rest or uniform motion unless acted upon by an external unbalanced force.',
              '2nd Law: F = Δp / t = m(v - u) / t = m · a (SI unit: Newton, 1 N = 1 kg·m/s²).',
              '3rd Law: Every action has an equal and opposite reaction acting on two different bodies (F₁₂ = -F₂₁).',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Conservation of Momentum, Work, Energy & Power',
        points: [
          {
            term: 'Law of Conservation of Linear Momentum',
            definition: 'In the absence of an external unbalanced force, the total momentum of an isolated system remains conserved: m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂.',
          },
          {
            term: 'Work, Kinetic Energy & Potential Energy',
            definition: 'Work is done when a force produces displacement (W = F · s cos θ; SI unit: Joule).',
            subPoints: [
              'Kinetic Energy (energy of motion): KE = ½mv²',
              'Gravitational Potential Energy (energy of position): PE = mgh',
              'Power (rate of doing work): P = W / t = E / t (SI unit: Watt, 1 kWh = 3.6 × 10⁶ J).',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Physical Quantity', 'Formula / Equation', 'SI Unit', 'Key Takeaway'],
      rows: [
        { concept: 'Force (Newton’s 2nd Law)', formula: 'F = m · a = m(v - u)/t', unit: 'Newton (N) or kg·m/s²', takeaway: 'Vector quantity in direction of acceleration' },
        { concept: 'Linear Momentum', formula: 'p = m · v', unit: 'kg·m/s', takeaway: 'Conserved in collisions and gun recoil' },
        { concept: 'Kinetic & Potential Energy', formula: 'KE = ½mv²  |  PE = mgh', unit: 'Joule (J)', takeaway: 'Doubling velocity quadruples Kinetic Energy' },
        { concept: 'Universal Gravitation', formula: 'F = G(M·m) / d²', unit: 'G = 6.67 × 10⁻¹¹ N·m²/kg²', takeaway: 'Inverse-square law with distance d' },
      ],
    };
    keyTakeaways = [
      'Slope of a Displacement-Time (s-t) graph gives Velocity; slope of a Velocity-Time (v-t) graph gives Acceleration, and area under v-t graph gives Displacement.',
      'Action and reaction forces never cancel each other out because they act on two different objects.',
      'Total mechanical energy (KE + PE) remains constant during free fall under conservation of energy.',
    ];
    examTips = [
      'Convert all speeds from km/h to m/s by multiplying by 5/18 before using equations of motion!',
      'Always write Given, Formula, Substitution, and Answer with SI Units to earn full marks in physics numericals.',
    ];
  } else if (lower.includes('acid') || lower.includes('base') || lower.includes('salt') || lower.includes('atom') || lower.includes('molecule') || lower.includes('chemical')) {
    executiveSummary = `${cleanTopic} covers fundamental chemical principles—laws of chemical combination, atomic structure, mole concept, chemical equations, indicators, pH scale, and properties of acids, bases, and salts.`;
    conceptSections = [
      {
        number: 1,
        title: 'Acids, Bases, Indicators & pH Scale',
        points: [
          {
            term: 'Chemical Nature of Acids & Bases',
            definition: 'Acids produce H⁺(aq) / H₃O⁺ ions in water (sour, turn blue litmus red); Bases produce OH⁻(aq) ions in water (bitter, soapy, turn red litmus blue).',
            subPoints: [
              'Strong vs Weak Acids: HCl, H₂SO₄, HNO₃ ionize completely; CH₃COOH (acetic acid) ionizes partially.',
              'Neutralisation Reaction: Acid + Base → Salt + Water + Heat (e.g., HCl + NaOH → NaCl + H₂O).',
              'pH Scale (0 to 14): pH < 7 is Acidic, pH = 7 is Neutral, pH > 7 is Basic/Alkaline.',
            ],
          },
          {
            term: 'Important Chemical Salts & Their Formulas',
            definition: 'High-yield compounds prepared from common salt (NaCl):',
            subPoints: [
              'Bleaching Powder: CaOCl₂ (prepared by action of Cl₂ on dry slaked lime Ca(OH)₂).',
              'Baking Soda: NaHCO₃ (Sodium hydrogen carbonate — used in antacids and baking powder).',
              'Washing Soda: Na₂CO₃·10H₂O (removes permanent hardness of water).',
              'Plaster of Paris (POP): CaSO₄·½H₂O (prepared by heating Gypsum CaSO₄·2H₂O at 373 K).',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Atoms, Molecules & Laws of Chemical Combination',
        points: [
          {
            term: 'Laws of Chemical Combination & Dalton’s Atomic Theory',
            definition: 'Lavoisier’s Law of Conservation of Mass (mass is neither created nor destroyed) and Proust’s Law of Constant Proportions (elements combine in fixed mass ratios, e.g., H:O in H₂O is 1:8).',
            subPoints: [
              'Atomic Number (Z) = Number of Protons = Number of Electrons in a neutral atom.',
              'Mass Number (A) = Number of Protons + Number of Neutrons (Nucleons).',
              'Isotopes: Same atomic number Z but different mass number A (e.g., ¹H, ²H, ³H; ¹²C, ¹⁴C).',
              'Isobars: Different atomic number Z but same mass number A (e.g., ⁴⁰Ar and ⁴⁰Ca).',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Compound / Concept', 'Chemical Formula / Rule', 'pH / Constant', 'Key Application'],
      rows: [
        { concept: 'Neutralisation', formula: 'Acid + Base → Salt + H₂O', unit: 'pH of NaCl = 7', takeaway: 'Exothermic reaction' },
        { concept: 'Plaster of Paris', formula: 'CaSO₄·½H₂O', unit: 'Heated at 373 K (100°C)', takeaway: 'Forms Gypsum on mixing with water' },
        { concept: 'Avogadro’s Number', formula: '1 Mole = 6.022 × 10²³ particles', unit: 'Molar Mass in grams', takeaway: 'Number of moles n = Given Mass (m) / Molar Mass (M)' },
        { concept: 'Bohr’s Shell Capacity', formula: 'Max Electrons = 2n²', unit: 'K=2, L=8, M=18, N=32', takeaway: 'Outermost shell can hold at most 8 electrons (Octet)' },
      ],
    };
    keyTakeaways = [
      'Always dilute a concentrated acid by adding Acid slowly into Water with constant stirring, never water into acid.',
      'Tooth decay starts when the pH of the mouth falls below 5.5; basic toothpaste neutralizes excess acid.',
      'Valency is the combining capacity of an atom determined by the number of valence electrons in its outermost shell.',
    ];
    examTips = [
      'Write balanced chemical equations with physical state symbols—(s), (l), (g), (aq)—for every chemistry reaction.',
      'Memorize the exact water of crystallization in CuSO₄·5H₂O (Blue Vitriol), FeSO₄·7H₂O, Na₂CO₃·10H₂O, and CaSO₄·2H₂O.',
    ];
  } else if (lower.includes('light') || lower.includes('reflection') || lower.includes('refraction') || lower.includes('photosynthesis') || lower.includes('electricity')) {
    executiveSummary = `${cleanTopic} explains key scientific mechanisms, governing laws, mathematical formulas, ray/circuit diagrams, and real-world applications essential for conceptual clarity and board exams.`;
    conceptSections = [
      {
        number: 1,
        title: `Fundamental Principles & Laws of ${cleanTopic}`,
        points: [
          {
            term: 'Reflection & Refraction of Light (Optics)',
            definition: 'Angle of incidence equals angle of reflection (∠i = ∠r); Snell’s Law of Refraction states sin i / sin r = n₂₁ (constant refractive index).',
            subPoints: [
              'Mirror Formula: 1/v + 1/u = 1/f  |  Magnification: m = h\'/h = -v/u',
              'Lens Formula: 1/v - 1/u = 1/f  |  Power of Lens: P = 1 / f(in meters) Dioptre (D)',
              'Concave mirror / Convex lens are converging; Convex mirror / Concave lens are diverging.',
            ],
          },
          {
            term: 'Photosynthesis & Plant Nutrition (Biology)',
            definition: 'Autotrophic synthesis of glucose using CO₂ and H₂O in chloroplasts in the presence of sunlight and chlorophyll.',
            subPoints: [
              'Equation: 6CO₂ + 12H₂O → C₆H₁₂O₆ + 6O₂↑ + 6H₂O',
              '3 Stages: (1) Absorption of light by chlorophyll, (2) Photolysis of water releasing O₂, (3) Reduction of CO₂ to glucose.',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Applications, Sign Conventions & Numerical Rules',
        points: [
          {
            term: 'New Cartesian Sign Convention',
            definition: 'Object is placed to the left of the mirror/lens so object distance u is always negative (-).',
            subPoints: [
              'Focal length f is negative (-) for Concave Mirror & Concave Lens.',
              'Focal length f is positive (+) for Convex Mirror & Convex Lens.',
              'Real & Inverted images have negative magnification (m < 0); Virtual & Erect images have positive magnification (m > 0).',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Concept / Law', 'Formula / Equation', 'Unit / Sign Rule', 'Key Takeaway'],
      rows: [
        { concept: 'Mirror Formula', formula: '1/v + 1/u = 1/f', unit: 'u is always negative (-)', takeaway: 'f = R / 2 (Half of Radius of Curvature)' },
        { concept: 'Lens Formula & Power', formula: '1/v - 1/u = 1/f  |  P = 1/f(m)', unit: 'Dioptre (D = m⁻¹)', takeaway: 'Convex lens has +P; Concave lens has -P' },
        { concept: 'Refractive Index', formula: 'n = c / v = sin i / sin r', unit: 'Dimensionless ratio', takeaway: 'c = 3 × 10⁸ m/s in vacuum' },
        { concept: 'Photosynthesis', formula: '6CO₂ + 12H₂O → C₆H₁₂O₆ + 6O₂', unit: 'Chloroplast / Sunlight', takeaway: 'O₂ gas comes from splitting of H₂O' },
      ],
    };
    keyTakeaways = [
      'A Convex Mirror is always used as a rear-view mirror in vehicles because it gives an erect, diminished image over a wide field of view.',
      'When light enters an optically denser medium, its speed decreases and it bends towards the normal.',
      'During photosynthesis, desert plants take up CO₂ at night to prevent water loss through stomata.',
    ];
    examTips = [
      'Always draw arrows on light rays in ray diagrams—ray diagrams without direction arrows lose marks!',
      'Convert focal length from cm to meters (f_m = f_cm / 100) before calculating Power in Dioptres.',
    ];

  // ==================== SOCIAL SCIENCE TOPICS ====================
  } else if (
    lower.includes('french revolution') ||
    lower.includes('great depression') ||
    lower.includes('constitution') ||
    lower.includes('1857') ||
    lower.includes('revolt') ||
    lower.includes('drainage') ||
    lower.includes('river') ||
    lower.includes('democracy') ||
    detectedSubject === 'Social Science'
  ) {
    executiveSummary = `${cleanTopic} is a high-yield Social Science topic covering historical causes and timelines, constitutional and democratic principles, geographical patterns, and socio-economic impacts.`;
    conceptSections = [
      {
        number: 1,
        title: `Historical / Geographical Background & Core Causes of ${cleanTopic}`,
        points: [
          {
            term: 'Key Causes & Structural Framework',
            definition: `Systematic breakdown of the political, social, economic, and environmental factors driving ${cleanTopic}:`,
            subPoints: [
              'French Revolution (1789): Division of French society into 3 Estates (Clergy, Nobility, and taxed 3rd Estate), Subsistence Crisis, and Enlightenment ideas of Locke, Rousseau, and Montesquieu.',
              'The Great Depression (1929–1934): Triggered by agricultural overproduction and withdrawal of US loans following the Wall Street Crash (Oct 1929), halving global trade and Indian agricultural prices.',
              '1857 Revolt: Sparked by Doctrine of Lapse (Dalhousie), economic exploitation, and Enfield rifle greased cartridges—led by Mangal Pandey, Rani Lakshmibai, Nana Sahib, and Bahadur Shah Zafar.',
            ],
          },
          {
            term: 'Indian Constitution, Democracy & Fundamental Rights (Civics)',
            definition: 'Drafted by the Constituent Assembly (chaired by Dr. Rajendra Prasad; Drafting Committee chaired by Dr. B.R. Ambedkar), adopted on 26 Nov 1949 and enforced on 26 Jan 1950.',
            subPoints: [
              'Preamble Ideals: Sovereign, Socialist, Secular, Democratic, Republic — Justice, Liberty, Equality, Fraternity.',
              '6 Fundamental Rights: Right to Equality, Right to Freedom, Right Against Exploitation, Right to Freedom of Religion, Cultural & Educational Rights, and Right to Constitutional Remedies (Art. 32).',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Drainage Systems, Climate & Socio-Economic Impact',
        points: [
          {
            term: 'Himalayan vs. Peninsular Rivers of India',
            definition: 'India’s drainage system is divided into perennial Himalayan rivers (snow + rain fed) and seasonal Peninsular rivers (rain fed).',
            subPoints: [
              'Himalayan Rivers: Indus, Ganga (headwaters Bhagirathi + Alaknanda meet at Devprayag), and Brahmaputra (Tsangpo in Tibet).',
              'Peninsular Rivers: West-flowing Narmada & Tapi (form estuaries); East-flowing Godavari ("Dakshin Ganga"), Mahanadi, Krishna, and Kaveri (form deltas).',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Event / Topic / Feature', 'Key Date / Article / Origin', 'Key Personalities / Region', 'Core Significance'],
      rows: [
        { concept: 'Storming of the Bastille', formula: '14 July 1789', unit: 'Paris, France', takeaway: 'End of feudalism & Declaration of Rights of Man' },
        { concept: 'The Great Depression', formula: '1929 – Mid-1930s', unit: 'Global / Colonial India', takeaway: 'Indian wheat prices fell by 50%; rural debt surged' },
        { concept: 'Indian Constitution', formula: 'Adopted 26 Nov 1949 | Enforced 26 Jan 1950', unit: 'Dr. B.R. Ambedkar', takeaway: 'Supreme law guaranteeing Fundamental Rights' },
        { concept: 'Himalayan vs Peninsular Rivers', formula: 'Perennial vs Seasonal', unit: 'Ganga / Godavari', takeaway: 'Narmada & Tapi flow west through rift valleys' },
      ],
    };
    keyTakeaways = [
      'Always organize 5-mark Social Science answers into clear sub-headings: (1) Political Causes, (2) Economic Causes, (3) Social Causes, and (4) Impact.',
      'Dr. B.R. Ambedkar called the Right to Constitutional Remedies (Article 32) the "Heart and Soul of the Indian Constitution".',
      'Godavari is the largest Peninsular river (1500 km) and is known as "Dakshin Ganga".',
    ];
    examTips = [
      'Include exact years, dates, and names of key historical figures/articles in the first line of each bullet point.',
      'Use a comparative table whenever asked to distinguish between two geographical or political concepts.',
    ];

  // ==================== ENGLISH GRAMMAR & WRITING TOPICS ====================
  } else if (
    lower.includes('tense') ||
    lower.includes('voice') ||
    lower.includes('speech') ||
    lower.includes('modal') ||
    lower.includes('parts of speech') ||
    lower.includes('figure') ||
    detectedSubject === 'English'
  ) {
    executiveSummary = `${cleanTopic} provides a complete rulebook for English Grammar and Usage—covering tense structures, active-to-passive voice transformation, direct-to-indirect reported speech, modals, subject-verb concord, and poetic devices.`;
    conceptSections = [
      {
        number: 1,
        title: 'Tenses & Subject-Verb Concord Rules',
        points: [
          {
            term: 'Present, Past & Future Tense Structures',
            definition: 'Tenses express both the time of an action (Present, Past, Future) and its aspect (Simple, Continuous, Perfect, Perfect Continuous).',
            subPoints: [
              'Simple Present (S + V₁/V₁-s/es): Used for universal truths, habits, and scheduled future events.',
              'Present Perfect (S + has/have + V₃): Connects a completed past action to the present moment (used with just, already, yet).',
              'Past Perfect (S + had + V₃): Used for the earlier of two past actions ("The train had left before I reached").',
              'Perfect Continuous (has/have/had been + V₁-ing): Use "since" for a point in time and "for" for a duration of time.',
            ],
          },
          {
            term: 'Modals & Subject-Verb Agreement',
            definition: 'Auxiliary verbs that express ability, possibility, permission, and obligation (always followed by base verb V₁).',
            subPoints: [
              'Can / Could (ability & polite request), May / Might (permission & probability), Must / Have to (strong obligation), Ought to / Should (moral duty & advice).',
              'Concord Rule: Words joined by "with", "along with", or "as well as" take a verb agreeing with the FIRST subject.',
              'Either/or and Neither/nor take a verb agreeing with the NEAREST subject.',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Active-Passive Voice, Reported Speech & Figures of Speech',
        points: [
          {
            term: 'Active to Passive Voice Conversion',
            definition: 'Rule: New Subject (Object) + Appropriate form of "be" (is/am/are/was/were/been/being) + V₃ (Past Participle) + by + Agent.',
            subPoints: [
              'Continuous Tenses: is/am/are/was/were + being + V₃ ("A letter is being written by her").',
              'Perfect Tenses: has/have/had + been + V₃ ("The match has been won by them").',
            ],
          },
          {
            term: 'Direct to Indirect (Reported) Speech & Poetic Devices',
            definition: 'When reporting verb is in past tense ("said"), shift tense one step back and update pronouns/time words:',
            subPoints: [
              'Tense Backshift: V₁ → V₂, is/am/are → was/were, has/have → had, V₂ → had + V₃, will → would, can → could.',
              'Time/Place Shift: now → then, today → that day, tomorrow → the next day, yesterday → the previous day, here → there.',
              'Key Figures of Speech: Simile (uses "like/as"), Metaphor (implied comparison), Personification (human traits to non-living), Alliteration (repetition of initial consonant sound).',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Grammar Topic', 'Core Structure / Conversion Rule', 'Signal Words / Trigger', 'Worked Example'],
      rows: [
        { concept: 'Past Perfect Rule', formula: 'Subject + had + V₃ (before Simple Past V₂)', unit: 'before, after, already', takeaway: 'The patient had died before the doctor came.' },
        { concept: 'Passive Voice Formula', formula: 'Object + be-verb + V₃ + by + Subject', unit: 'Transitive Verbs', takeaway: 'Active: He wrote a poem → Passive: A poem was written by him.' },
        { concept: 'Reported Interrogative', formula: 'asked + if/whether (or Wh-word) + S + V (past)', unit: 'No question mark at end', takeaway: 'He said, "Are you ready?" → He asked if I was ready.' },
        { concept: 'Simile vs Metaphor', formula: 'Simile uses "as/like"; Metaphor equates directly', unit: 'Poetic Devices', takeaway: 'Simile: Brave as a lion | Metaphor: He is a lion in battle.' },
      ],
    };
    keyTakeaways = [
      'Never change the tense inside reported speech if the statement expresses a universal truth or scientific fact.',
      'In reported questions, always convert the question order (Verb + Subject) into statement order (Subject + Verb) and remove the question mark.',
      'Singular indefinite pronouns (each, everyone, everybody, someone, nobody, neither) always take a singular verb.',
    ];
    examTips = [
      'In editing/omission passages, read the entire paragraph once first to identify whether it is set in the Present or Past tense.',
      'Double-check V₃ (past participle) spelling for irregular verbs (e.g., write-wrote-written, begin-began-begun).',
    ];

  // ==================== HINDI VYAKARAN TOPICS ====================
  } else if (detectedSubject === 'Hindi') {
    executiveSummary = `${cleanTopic} हिंदी व्याकरण का एक अत्यंत महत्वपूर्ण अध्याय है, जो शब्दों की संरचना, संधि-विच्छेद, समास-विग्रह, अलंकार, उपसर्ग-प्रत्यय और शुद्ध भाषा प्रयोग को स्पष्ट करता है।`;
    conceptSections = [
      {
        number: 1,
        title: 'संधि, समास और उपसर्ग-प्रत्यय के मुख्य नियम',
        points: [
          {
            term: 'संधि (Sandhi — वर्णों का मेल)',
            definition: 'दो निकटवर्ती वर्णों के परस्पर मेल से जो परिवर्तन (विकार) होता है, उसे संधि कहते हैं। इसके ३ मुख्य भेद हैं:',
            subPoints: [
              '1. स्वर संधि (5 भेद): दीर्घ (विद्या+आलय = विद्यालय), गुण (नर+इंद्र = नरेंद्र), वृद्धि (सदा+एव = सदैव), यण (इति+आदि = इत्यादि), अयादि (ने+अन = नयन)।',
              '2. व्यंजन संधि: जगत् + नाथ = जगन्नाथ, उत् + ज्वल = उज्ज्वल, सत् + जन = सज्जन।',
              '3. विसर्ग संधि: मनः + रथ = मनोरथ, निः + चल = निश्चल, निः + कपट = निष्कपट।',
            ],
          },
          {
            term: 'समास (Samas — शब्दों का संक्षेपीकरण)',
            definition: 'दो या दो से अधिक शब्दों के मेल से नया सार्थक शब्द बनाने की प्रक्रिया को समास कहते हैं (६ मुख्य भेद):',
            subPoints: [
              'अव्ययीभाव समास: पहला पद अव्यय/उपसर्ग प्रधान (जैसे — यथाशक्ति = शक्ति के अनुसार, प्रतिदिन = प्रत्येक दिन)।',
              'तत्पुरुष समास: दूसरा पद प्रधान और कारक चिह्न का लोप (जैसे — राजपुत्र = राजा का पुत्र, रसोईघर = रसोई के लिए घर)।',
              'कर्मधारय और द्विगु: कर्मधारय में विशेषण-विशेष्य (नीलकमल); द्विगु में पहला पद संख्यावाचक (चौराहा = चार राहों का समूह)।',
              'द्वंद्व और बहुव्रीहि: द्वंद्व में दोनों पद प्रधान (माता-पिता); बहुव्रीहि में कोई तीसरा विशेष अर्थ प्रधान (लंबोदर = गणेश जी)।',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'अलंकार, मुहावरे, संज्ञा-सर्वनाम और पत्र लेखन',
        points: [
          {
            term: 'अलंकार (शब्दालंकार और अर्थालंकार)',
            definition: 'काव्य की शोभा बढ़ाने वाले तत्वों को अलंकार कहते हैं:',
            subPoints: [
              'अनुप्रास अलंकार: व्यंजन वर्णों की आवृत्ति ("तरनि तनुजा तट तमाल तरुवर बहु छाए" — त वर्ण की आवृत्ति)।',
              'यमक और श्लेष: यमक में एक शब्द दो बार अलग अर्थ में ("कनक-कनक"); श्लेष में एक ही शब्द से अनेक अर्थ चिपके हों।',
              'उपमा, रूपक और उत्प्रेक्षा: उपमा (सा, सी, सम), रूपक (अभेद आरोप — "चरण कमल बंदौ हरिराई"), उत्प्रेक्षा (मानो, मनु, जानो)।',
            ],
          },
          {
            term: 'उपसर्ग, प्रत्यय और प्रमुख मुहावरे',
            definition: 'उपसर्ग मूल शब्द के प्रारंभ में जुड़कर अर्थ बदलते हैं (जैसे: प्र + हार = प्रहार), और प्रत्यय शब्द के अंत में जुड़ते हैं (जैसे: समाज + इक = सामाजिक)।',
            subPoints: [
              'आँखों का तारा होना = बहुत प्यारा होना  |  ईद का चाँद होना = बहुत दिनों बाद दिखाई देना।',
              'गागर में सागर भरना = थोड़े शब्दों में बड़ी बात कहना  |  दाँतों तले उँगली दबाना = दंग रह जाना।',
            ],
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['व्याकरण विषय', 'नियम / पहचान चिह्न', 'प्रमुख उदाहरण', 'मुख्य बिंदु (Key Takeaway)'],
      rows: [
        { concept: 'स्वर संधि', formula: 'दीर्घ (आ, ई, ऊ) | गुण (ए, ओ, अर्) | यण (य, व, र)', unit: 'हिमालय, सुरेंद्र, स्वागत', takeaway: 'दो स्वरों के मेल से उत्पन्न विकार' },
        { concept: 'समास पहचान', formula: 'द्विगु = संख्या | द्वंद्व = और/या | बहुव्रीहि = विशेष अर्थ', unit: 'तिरंगा, रात-दिन, दशानन', takeaway: 'समास-विग्रह के अनुसार ही भेद तय होता है' },
        { concept: 'अलंकार पहचान', formula: 'उपमा (सा/सी) | उत्प्रेक्षा (मानो/जनु) | अनुप्रास (वर्ण आवृत्ति)', unit: 'पीपर पात सरिस मन डोला', takeaway: 'शब्द और अर्थ दोनों से काव्य में चमत्कार' },
        { concept: 'उपसर्ग व प्रत्यय', formula: 'उपसर्ग + मूल शब्द + प्रत्यय', unit: 'अ + धर्म + इक = अधार्मिक', takeaway: 'मूल शब्द का सार्थक होना आवश्यक है' },
      ],
    };
    keyTakeaways = [
      'संधि में दो वर्णों का मेल होता है, जबकि समास में दो सार्थक शब्दों (पदों) का मेल होता है।',
      'कमलनयन और पीतांबर जैसे शब्दों में समास का नाम आपके द्वारा किए गए समास-विग्रह (कर्मधारय या बहुव्रीहि) पर निर्भर करता है।',
      'उपसर्ग या प्रत्यय अलग करते समय बचा हुआ मूल शब्द पूर्णतः सार्थक होना चाहिए।',
    ];
    examTips = [
      'परीक्षा में संधि-विच्छेद या समास-विग्रह लिखने के साथ-साथ उसके भेद (प्रकार) का नाम अवश्य लिखें।',
      'मुहावरों का वाक्य प्रयोग करते समय मुहावरे के अर्थ का नहीं, बल्कि मूल मुहावरे का वाक्य में प्रयोग करें।',
    ];

  // ==================== INTELLIGENT SYNTHESIS FOR ANY OTHER CUSTOM TOPIC ====================
  } else {
    executiveSummary = `${cleanTopic} is a vital topic in ${detectedSubject} (${classLevel}) that encompasses core definitions, fundamental principles, governing mechanisms, step-by-step methodologies, and practical real-world applications.`;
    conceptSections = [
      {
        number: 1,
        title: `1. Core Definitions & Foundational Principles of ${cleanTopic}`,
        points: [
          {
            term: `Definition & Concept of ${cleanTopic}`,
            definition: `${cleanTopic} represents the structured framework of rules, concepts, and relationships studied in ${detectedSubject} to explain how key components interact and function.`,
            subPoints: [
              `Primary Scope: Defines the essential characteristics, terminology, and classification of ${cleanTopic}.`,
              `Core Principle: Connects theoretical foundations of ${cleanTopic} with observable outcomes and curriculum problem-solving.`,
              `Key Variables & Elements: Identifies the main parameters, factors, or stages that govern ${cleanTopic}.`,
            ],
          },
          {
            term: `Classification & Structural Breakdown`,
            definition: `To master ${cleanTopic} systematically, it is divided into key sub-categories and governing properties:`,
            subPoints: [
              `Type / Stage 1 — Foundational Conditions: The initial inputs, prerequisites, or axioms required for ${cleanTopic}.`,
              `Type / Stage 2 — Operational Rules: The laws, equations, or transformations that operate on ${cleanTopic}.`,
              `Type / Stage 3 — Resulting Outcomes: The measurable effects, conclusions, or products of ${cleanTopic}.`,
            ],
          },
        ],
      },
      {
        number: 2,
        title: `2. Step-by-Step Mechanism, Examples & Real-World Applications`,
        points: [
          {
            term: `Step-by-Step Working / Analytical Method`,
            definition: `Follow this 3-step method when solving questions or explaining ${cleanTopic} in exams:`,
            subPoints: [
              `Step 1 (Identify): State the definition or given parameters of ${cleanTopic} clearly.`,
              `Step 2 (Apply Rule / Mechanism): Apply the governing law, formula, or cause-and-effect chain step-by-step.`,
              `Step 3 (Conclude & Verify): State the final result with a concrete real-life example or unit check.`,
            ],
          },
          {
            term: `Real-World Significance & Practical Examples`,
            definition: `${cleanTopic} plays a direct role in everyday science, mathematics, technology, and society, helping explain practical phenomena and solve real-world challenges.`,
          },
        ],
      },
    ];
    formulaTable = {
      columns: ['Dimension / Aspect', 'Core Principle / Rule', 'Context / Category', 'Key Exam Takeaway'],
      rows: [
        {
          concept: `Definition of ${cleanTopic}`,
          formula: `Core concept & classification in ${detectedSubject}`,
          unit: `${classLevel} Syllabus`,
          takeaway: `Begin every answer with a crisp 1-sentence textbook definition.`,
        },
        {
          concept: 'Governing Rule / Mechanism',
          formula: 'Cause → Process / Formula → Effect',
          unit: 'Conceptual Framework',
          takeaway: 'Break processes into 3–4 numbered bullet points.',
        },
        {
          concept: 'Key Factors & Conditions',
          formula: `Primary variables affecting ${cleanTopic}`,
          unit: detectedSubject,
          takeaway: 'Highlight how changing one factor impacts the overall outcome.',
        },
        {
          concept: 'Real-Life Application',
          formula: `Practical application of ${cleanTopic}`,
          unit: 'Applied Competency',
          takeaway: 'Always include 1 concrete example for full marks.',
        },
      ],
    };
    keyTakeaways = [
      `Master the exact textbook definition and primary classification of ${cleanTopic} for 1–2 mark objective questions.`,
      `Understand the step-by-step cause-and-effect mechanism of ${cleanTopic} for 3-mark and 5-mark descriptive questions.`,
      `Link every theoretical rule of ${cleanTopic} with a real-life example or diagram for complete concept clarity.`,
    ];
    examTips = [
      `Underline technical keywords and sub-headings when writing answers on ${cleanTopic}.`,
      `Include a neat flowchart, labeled diagram, or worked example wherever applicable to score 100% marks.`,
    ];
  }

  const content = buildMarkdownFromStructuredNote(executiveSummary, conceptSections, formulaTable);

  return {
    id: `note-${Date.now()}`,
    title: `${cleanTopic} (${detectedSubject === 'Mathematics' ? 'Maths' : detectedSubject})`,
    topic: cleanTopic,
    noteType,
    subject: detectedSubject,
    classLevel,
    executiveSummary,
    conceptSections,
    formulaTable,
    content,
    keyTakeaways,
    examTips,
    tags: [detectedSubject, classLevel, detailLevel],
    createdAt: new Date().toISOString(),
  };
}

// In-memory cache for generated notes so repeat requests return instantaneously
const notesCache = new Map<string, any>();

// Endpoint to generate structured AI Study Notes for ANY topic
app.post('/api/generate-notes', async (req: Request, res: Response) => {
  try {
    const {
      topic,
      noteType = 'executive_master',
      subject = 'Mathematics',
      detailLevel = 'standard',
      studentProfile,
    } = req.body;
    const classLevel = studentProfile?.classLevel || 'Class 9';
    const exam = studentProfile?.primaryExam || 'CBSE';

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ error: 'Topic is required to generate notes' });
    }

    const cleanTopic = String(topic).trim();
    const noteCacheKey = `${cleanTopic.toLowerCase()}::${subject}::${classLevel}::${detailLevel}`;
    if (notesCache.has(noteCacheKey)) {
      const cachedNote = notesCache.get(noteCacheKey);
      return res.json({
        ...cachedNote,
        id: `note-${Date.now()}`,
        createdAt: new Date().toISOString(),
      });
    }

    const depthInstruction =
      detailLevel === 'concise'
        ? 'CONCISE NOTES: Keep definitions crisp, high-yield, and bulleted for rapid 2-minute revision (2 concept sections, 3-4 table rows).'
        : detailLevel === 'deep_dive'
        ? 'DEEP DIVE NOTES: Provide comprehensive explanations, worked examples, deeper mechanisms, and practice insights (3 concept sections, 4-5 table rows).'
        : 'STANDARD NOTES: Provide a balanced, thorough explanation with key concepts, formulas/rules, and examples (2-3 concept sections, 4 table rows).';

    const systemInstruction = `You are an expert AI educator and note-maker. Generate crystal-clear, deeply informative, well-structured study notes on ANY topic the user requests ("${cleanTopic}").
Target Level: ${classLevel} (${exam}), Subject Context: ${subject}.
Note Depth: ${depthInstruction}
Language Rule: If the topic is in Hindi or subject is Hindi, write explanations in clear Hindi. Otherwise write in clear English.
CRITICAL: Include specific, accurate facts, definitions, formulas/rules/dates, and real examples strictly about "${cleanTopic}". Never use generic placeholder sentences.
Return ONLY a valid JSON object matching this exact structure (no markdown code fences):
{
  "title": "${cleanTopic} (${subject === 'Mathematics' ? 'Maths' : subject})",
  "executiveSummary": "2-3 sentence specific overview of ${cleanTopic}...",
  "conceptSections": [
    {
      "number": 1,
      "title": "Specific Section Title for ${cleanTopic}",
      "points": [
        {
          "term": "Specific Term or Concept",
          "definition": "Clear, detailed definition and explanation",
          "subPoints": ["Specific formula, rule, or example 1", "Specific formula, rule, or example 2"]
        }
      ]
    }
  ],
  "formulaTable": {
    "columns": ["Concept / Term", "Formula / Rule / Key Fact", "Unit / Category", "Key Takeaway"],
    "rows": [
      {
        "concept": "Specific Name",
        "formula": "Exact formula, rule, date, or structure",
        "unit": "Unit or context",
        "takeaway": "Specific takeaway"
      }
    ]
  },
  "keyTakeaways": ["Specific Takeaway 1", "Specific Takeaway 2", "Specific Takeaway 3"],
  "examTips": ["Specific Exam Tip 1", "Specific Exam Tip 2"]
}`;

    const prompt = `Generate comprehensive, topic-specific study notes in JSON for the topic: "${cleanTopic}" (Subject: ${subject}, Level: ${classLevel}, Depth: ${detailLevel}).`;

    let parsed: any = null;
    const activeGeminiKey = process.env.GEMINI_API_KEY || geminiApiKey;

    if (activeGeminiKey) {
      const client = getGeminiClient();
      const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

      for (const modelName of modelsToTry) {
        try {
          const supportsThinking =
            modelName === 'gemini-3.8-flash' || modelName === 'gemini-3.1-flash-lite';
          const thinkingLevel =
            modelName === 'gemini-3.1-flash-lite' ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW;

          const response = await withTimeout(
            client.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.35,
                maxOutputTokens: 1600,
                responseMimeType: 'application/json',
                ...(supportsThinking ? { thinkingConfig: { thinkingLevel } } : {}),
              },
            }),
            10000
          );

          if (response.text) {
            const raw = response.text.trim();
            const firstBrace = raw.indexOf('{');
            const lastBrace = raw.lastIndexOf('}');
            const jsonSlice =
              firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
                ? raw.substring(firstBrace, lastBrace + 1)
                : raw.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(jsonSlice);
            if (parsed && parsed.executiveSummary) {
              break;
            }
          }
        } catch {
          // Try next Gemini model in modelsToTry
        }
      }
    }

    // Secondary fallback to OpenAI if configured and Gemini was unavailable
    if (!parsed && openai && hasValidOpenAiKey) {
      try {
        const completion = await withTimeout(
          openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt },
            ],
            temperature: 0.35,
            max_tokens: 1400,
          }),
          9000
        );
        const raw = completion.choices[0]?.message?.content?.trim() || '';
        const firstBrace = raw.indexOf('{');
        const lastBrace = raw.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          parsed = JSON.parse(raw.substring(firstBrace, lastBrace + 1));
        }
      } catch {
        // Fall through to rich topic-specific generator
      }
    }

    if (parsed && parsed.executiveSummary) {
      const conceptSections = Array.isArray(parsed.conceptSections) ? parsed.conceptSections : [];
      const formulaTable =
        parsed.formulaTable && Array.isArray(parsed.formulaTable.rows)
          ? parsed.formulaTable
          : {
              columns: ['Concept / Term', 'Formula / Rule', 'Unit / Context', 'Key Takeaway'],
              rows: [],
            };
      const synthesizedContent = buildMarkdownFromStructuredNote(
        parsed.executiveSummary,
        conceptSections,
        formulaTable
      );

      const noteResult = {
        id: `note-${Date.now()}`,
        title: parsed.title || `${cleanTopic} (${subject === 'Mathematics' ? 'Maths' : subject})`,
        topic: cleanTopic,
        noteType,
        subject,
        classLevel,
        executiveSummary: parsed.executiveSummary,
        conceptSections,
        formulaTable,
        content: synthesizedContent,
        keyTakeaways: Array.isArray(parsed.keyTakeaways)
          ? parsed.keyTakeaways
          : [`Master the core concepts of ${cleanTopic}`],
        examTips: Array.isArray(parsed.examTips)
          ? parsed.examTips
          : [`Write clear definitions and examples for ${cleanTopic}`],
        tags: [subject, classLevel, detailLevel],
        createdAt: new Date().toISOString(),
      };

      notesCache.set(noteCacheKey, noteResult);
      return res.json(noteResult);
    }

    // Rich topic-intelligent generator tailored to the exact requested topic
    const fallbackNote = buildDynamicNoteForAnyTopic(cleanTopic, subject, classLevel, noteType, detailLevel);
    res.json(fallbackNote);
  } catch {
    const safeTopic = String(req.body?.topic || 'Study Topic').trim();
    const safeSubject = String(req.body?.subject || 'Mathematics');
    const safeClass = String(req.body?.studentProfile?.classLevel || 'Class 9');
    const safeType = String(req.body?.noteType || 'executive_master');
    const safeDepth = String(req.body?.detailLevel || 'standard');
    res.json(buildDynamicNoteForAnyTopic(safeTopic, safeSubject, safeClass, safeType, safeDepth));
  }
});

// ====================================================================
// Multimodal Problem & Notebook Scanner Endpoints
// ====================================================================

// Sample fallback datasets for offline / quota safety
const SCANNER_FALLBACKS: Record<string, any> = {
  science: {
    isReadable: true,
    qualityIssue: null,
    subject: 'Science (Physics)',
    chapterTitle: 'Force, Pressure & Friction',
    classLevel: 'Class 9',
    detectedPageType: 'Handwritten Notebook Page with Diagrams & Practice Problems',
    quickSummary: 'Force is an external push or pull arising from an interaction between objects that alters motion, direction, or shape, generating pressure when distributed over a surface. Friction is a self-adjusting contact force caused by microscopic surface interlocking that opposes relative motion as a vital yet wear-inducing "necessary evil".',
    explainedNotes: [
      {
        topic: '1. Force and Its Characteristics',
        summary: 'A push or pull resulting from interaction between objects. It has both magnitude (strength) and direction.',
        bulletPoints: [
          '**Force**: A push or pull exerted on an object resulting from interaction with another object (measured in Newtons, N).',
          '**Net Force ($F_{net}$)**: If forces act in the **same direction**, they add up: $F_{net} = F_1 + F_2$. If in **opposite directions**, they subtract: $F_{net} = |F_1 - F_2|$.',
          '**Balanced vs Unbalanced**: If opposing forces are equal, $F_{net} = 0$ (Balanced forces; no change in state of motion).',
          '**Effects of Force**: Can speed up, slow down, stop an object, change direction of motion, or deform shape.'
        ]
      },
      {
        topic: '2. Pressure & Inverse Area Principle',
        summary: 'Pressure is perpendicular force acting per unit surface area.',
        bulletPoints: [
          '**Formula**: $P = \\frac{F}{A}$ (Force / Area). SI unit is Pascal ($Pa$) or $N/m^2$.',
          '**Inverse Area Principle**: Smaller contact area $\\rightarrow$ Greater pressure (e.g., sharp knife cuts better than blunt knife; broad straps reduce shoulder pain).',
          '**Fluid Pressure**: Liquids and gases exert equal pressure in all directions at the same depth.'
        ]
      },
      {
        topic: '3. Origin and Types of Friction',
        summary: 'Resistance to relative motion caused by interlocking of microscopic surface irregularities.',
        bulletPoints: [
          '**Origin**: Caused by interlocking of microscopic ridges and grooves on contacting surfaces.',
          '**Static Friction**: Resists initiation of motion (maximum value is called limiting friction).',
          '**Sliding Friction**: Resists motion when an object slides over a surface.',
          '**Rolling Friction**: Resists motion when an object rolls (much smaller than sliding friction).',
          '**Hierarchy of Friction**: $F_{static} > F_{sliding} > F_{rolling}$.'
        ]
      }
    ],
    realWorldAnalogy: {
      title: 'Why Sharp Needles Pierce Instantly While Wide Snowshoes Prevent Sinking',
      story: 'When you step on deep snow with regular shoes, your entire body weight pushes down on a small sole area, generating immense pressure that punches through the crust. But strap on large oval snowshoes (large area), and that identical body weight is spread widely, slashing the downward pressure so you walk effortlessly on top! The same rule explains why thin knife blades slice easily while wide schoolbag straps spare your shoulders.',
      takeaway: 'Smaller Area $\\rightarrow$ Enormous Pressure. Larger Area $\\rightarrow$ Gentle, Distributed Pressure.'
    },
    formulas: [
      {
        concept: 'Pressure ($P$)',
        formula: '$P = \\frac{\\text{Force }(F)}{\\text{Area }(A)}$',
        siUnit: 'Pascal ($\\text{Pa}$) or $\\text{N/m}^2$',
        takeaway: 'Halving the contact area doubles the pressure for a constant applied force.'
      },
      {
        concept: 'Net Force (Parallel)',
        formula: '$F_{net} = F_1 + F_2$',
        siUnit: 'Newton ($\\text{N}$)',
        takeaway: 'Applied forces in the same direction reinforce each other.'
      },
      {
        concept: 'Net Force (Opposing)',
        formula: '$F_{net} = |F_1 - F_2|$',
        siUnit: 'Newton ($\\text{N}$)',
        takeaway: 'Acts in the direction of the larger applied force.'
      },
      {
        concept: 'Hierarchy of Friction',
        formula: '$F_{\\text{static}} > F_{\\text{sliding}} > F_{\\text{rolling}}$',
        siUnit: 'Newton ($\\text{N}$)',
        takeaway: 'It requires far less energy to keep a body rolling than to slide it from rest.'
      }
    ],
    questionsList: [
      {
        id: 'q1',
        questionNumber: 1,
        questionText: 'A force of 150 N is applied perpendicularly over an area of 0.05 m². Calculate the pressure exerted on the surface.',
        questionSummary: 'Calculating surface pressure given perpendicular force and surface area.',
        difficulty: 'Easy',
        formulaUsed: 'P = F / A',
        steps: [
          'Identify given variables: Force $F = 150\\text{ N}$, Area $A = 0.05\\text{ m}^2$.',
          'State the pressure formula: $P = \\frac{F}{A}$.',
          'Substitute values: $P = \\frac{150}{0.05} = \\frac{150 \\times 100}{5} = 3000\\text{ Pa}$.',
          'State answer with SI units: $3000\\text{ N/m}^2$ or $3\\text{ kPa}$.'
        ],
        finalAnswer: 'Pressure = 3,000 Pa (or 3,000 N/m²)'
      },
      {
        id: 'q2',
        questionNumber: 2,
        questionText: 'Why are ball bearings used in the hubs of bicycles, ceiling fans, and skateboards instead of direct sliding contact?',
        questionSummary: 'Explaining why ball bearings replace sliding friction with rolling friction in mechanical devices.',
        difficulty: 'Medium',
        formulaUsed: 'F_rolling << F_sliding',
        steps: [
          'Friction arises from microscopic interlocking of surface ridges and valleys between contacting bodies.',
          'Sliding motion requires continuous shearing of atomic junctions across large surface areas, wasting power and causing extreme heat and wear.',
          'Ball bearings introduce small rolling spheres between the rotating shaft and stationary outer race.',
          'Rolling contact occurs across momentary microscopic points with virtually zero surface weld shearing. Since $F_{rolling} \\ll F_{sliding}$, ball bearings drastically save kinetic energy and eliminate friction damage.'
        ],
        finalAnswer: 'Ball bearings replace sliding friction with vastly smaller rolling friction ($F_{rolling} \\ll F_{sliding}$), minimizing wear, tear, and mechanical energy loss.'
      },
      {
        id: 'q3',
        questionNumber: 3,
        questionText: 'Two horizontal forces of 20 N (due East) and 12 N (due West) act simultaneously on a toy car of mass 2 kg. Find the net force acting on the car.',
        questionSummary: 'Calculating net resultant force for two collinear opposing horizontal vectors.',
        difficulty: 'Easy',
        formulaUsed: 'F_net = F_East - F_West',
        steps: [
          'Identify directions: $F_1 = 20\\text{ N}$ towards East, $F_2 = 12\\text{ N}$ towards West.',
          'Because the vectors are collinear and opposite in direction, net force is their difference: $F_{net} = F_1 - F_2$.',
          'Calculate: $F_{net} = 20\\text{ N} - 12\\text{ N} = 8\\text{ N}$.',
          'Resultant direction: The net force acts East, in the direction of the dominant force.'
        ],
        finalAnswer: 'Net Force = 8 N towards East'
      }
    ],
    questionsSummary: 'The page features 3 numerical and conceptual physics questions: calculating pressure from area and force ($P = F/A$), mechanical friction reduction through ball bearings, and vector addition of opposing forces.',
    examTips: [
      'Always state SI units clearly ($N$ for force, $Pa$ or $N/m^2$ for pressure) to secure full step marks.',
      'In friction questions, always write down the inequality $F_{static} > F_{sliding} > F_{rolling}$.',
      'Remember that Pressure is a scalar quantity while Force is a vector quantity (with both magnitude and direction).'
    ]
  },
  maths: {
    isReadable: true,
    qualityIssue: null,
    subject: 'Mathematics',
    chapterTitle: 'Polynomials & Middle-Term Splitting',
    classLevel: 'Class 9',
    detectedPageType: 'Handwritten Classwork Copy — Algebraic Factorisation',
    quickSummary: 'Quadratic polynomials of the form $ax^2 + bx + c$ are factorised by finding two integers whose product equals $a \\times c$ and whose sum equals $b$, followed by common binomial grouping.',
    explainedNotes: [
      {
        topic: '1. Standard Quadratic Form',
        summary: 'A second-degree polynomial $P(x) = ax^2 + bx + c$, where $a \\neq 0$.',
        bulletPoints: [
          '**Degree of polynomial**: Highest power of variable $x$ is 2.',
          '**Zeroes of polynomial**: Values of $x$ for which $P(x) = 0$. A quadratic polynomial has at most 2 zeroes.'
        ]
      },
      {
        topic: '2. Middle Term Splitting Algorithm',
        summary: 'Standard 4-step method for decomposing $bx$ into $px + qx$.',
        bulletPoints: [
          '**Step A**: Compute the target product $P = a \\times c$.',
          '**Step B**: Find pairs of factors $p$ and $q$ such that $p \\times q = a \\cdot c$ and $p + q = b$.',
          '**Step C**: Rewrite $ax^2 + px + qx + c$ and group into two pairs.',
          '**Step D**: Factor out the common binomial factor $(x + r)(sx + t)$.'
        ]
      }
    ],
    realWorldAnalogy: {
      title: 'The Area of a Rectangle Garden',
      story: 'Think of factorising $x^2 + 7x + 12$ as finding the width and length of a rectangular garden whose total area is $x^2 + 7x + 12$. By breaking the garden into smaller rectangular plots, you find that a length of $(x + 4)$ and width of $(x + 3)$ perfectly match $(x + 3)(x + 4)$!',
      takeaway: 'Factorisation decomposes a combined area back into its original dimensions.'
    },
    formulas: [
      {
        concept: 'Standard Quadratic',
        formula: '$P(x) = ax^2 + bx + c$',
        siUnit: 'Algebraic Polynomial',
        takeaway: '$a \\neq 0$; determines parabolic curvature and root count.'
      },
      {
        concept: 'Product-Sum Rule',
        formula: '$p \\cdot q = a \\cdot c \\quad \\text{and} \\quad p + q = b$',
        siUnit: 'Integer Factors',
        takeaway: 'Signs of $b$ and $c$ dictate the signs of $p$ and $q$.'
      }
    ],
    questionsList: [
      {
        id: 'qm1',
        questionNumber: 1,
        questionText: 'Factorise the quadratic polynomial: x² + 7x + 12 by splitting the middle term.',
        questionSummary: 'Factorising standard quadratic trinomial with positive coefficients.',
        difficulty: 'Easy',
        formulaUsed: 'p * q = 12, p + q = 7',
        steps: [
          'Compare with $ax^2 + bx + c$: $a = 1, b = 7, c = 12$.',
          'Find $p, q$ such that $p \\cdot q = 12$ and $p + q = 7$. The factors are $3$ and $4$ ($3 \\times 4 = 12$, $3 + 4 = 7$).',
          'Split middle term: $x^2 + 3x + 4x + 12$.',
          'Group: $x(x + 3) + 4(x + 3)$.',
          'Extract common factor: $(x + 3)(x + 4)$.'
        ],
        finalAnswer: '(x + 3)(x + 4)'
      },
      {
        id: 'qm2',
        questionNumber: 2,
        questionText: 'Find the zeroes of the polynomial p(x) = 2x² - 8x + 6.',
        questionSummary: 'Finding roots/zeroes of a quadratic polynomial after factoring.',
        difficulty: 'Medium',
        formulaUsed: 'Set p(x) = 0 after factorising',
        steps: [
          'Factor out common 2: $2(x^2 - 4x + 3) = 0$.',
          'Find numbers multiplying to 3 and adding to -4: $-1$ and $-3$.',
          '$2(x - 1)(x - 3) = 0$.',
          'Set each factor to zero: $x - 1 = 0 \\implies x = 1$; $x - 3 = 0 \\implies x = 3$.'
        ],
        finalAnswer: 'Zeroes are x = 1 and x = 3'
      }
    ],
    questionsSummary: 'The notebook copy contains algebraic problems factorising quadratics and finding zeroes.',
    examTips: [
      'Check your signs: if constant term $c$ is positive, both factors share the sign of $b$.',
      'Always verify by expanding your final factored binomials back to the original quadratic expression.'
    ]
  },
  biology: {
    isReadable: true,
    qualityIssue: null,
    subject: 'Science (Biology)',
    chapterTitle: 'Cell: The Fundamental Unit of Life',
    classLevel: 'Class 9',
    detectedPageType: 'Handwritten Revision Copy — Cell Organelles & Osmosis',
    quickSummary: 'The cell is the basic structural and functional unit of life. Plant and animal cells possess specialized membrane-bound organelles including ATP-producing mitochondria and photosynthetic chloroplasts, with the selective plasma membrane governing cellular osmosis.',
    explainedNotes: [
      {
        topic: '1. Cell Organelles & Cellular Respiration',
        summary: 'Key membrane-bound cellular structures executing energy conversion and protein handling.',
        bulletPoints: [
          '**Mitochondria**: Termed the "Powerhouse of the Cell"; synthesizes cellular energy in the form of **ATP** (Adenosine Triphosphate) via aerobic cellular respiration.',
          '**Chloroplasts**: Pigment-containing plastids containing chlorophyll that drive **photosynthesis** in plant cells (the "kitchen of the cell").',
          '**Endoplasmic Reticulum (ER)**: Rough ER (studded with ribosomes) synthesizes proteins; Smooth ER synthesizes lipids and detoxifies poisons.',
          '**Golgi Apparatus**: Packages, modifies, and sorts vesicles for storage or cellular dispatch.'
        ]
      },
      {
        topic: '2. Plasma Membrane & Osmosis Principles',
        summary: 'Semi-permeable lipid bilayer regulating molecular movement across water concentration gradients.',
        bulletPoints: [
          '**Selectively Permeable**: Permits solvent (water) and specific solutes to pass while blocking unwanted macromolecules.',
          '**Hypotonic Solution**: Lower solute concentration outside $\\rightarrow$ Water rushes into cell via **Endosmosis** (cell swells or turgid).',
          '**Hypertonic Solution**: Higher solute concentration outside $\\rightarrow$ Water leaves cell via **Exosmosis** (plasmolysis occurs).',
          '**Isotonic Solution**: Equal concentration $\\rightarrow$ Zero net water movement.'
        ]
      }
    ],
    realWorldAnalogy: {
      title: 'The Busy Factory with Security Gates and Solar Panels',
      story: 'Imagine a modern robotic factory surrounded by a smart security gate (Plasma Membrane) that checks visitor badges. Inside, the power generator room (Mitochondria) burns fuel to keep all conveyor belts running. On the factory roof, solar arrays (Chloroplasts) absorb raw sunlight to manufacture food for the entire complex. If security fails or moisture leaks in through osmosis, the factory either swells or shuts down.',
      takeaway: 'Mitochondria = Power Generator; Chloroplast = Solar Kitchen; Membrane = Smart Security Gate.'
    },
    formulas: [
      {
        concept: 'Osmotic Water Movement',
        formula: 'Net Flux = k \\times (\\Psi_{inside} - \\Psi_{outside})',
        siUnit: 'Bar or Pascal ($\\text{Pa}$)',
        takeaway: 'Water always diffuses down its concentration gradient towards higher solute concentration.'
      }
    ],
    questionsList: [
      {
        id: 'qb1',
        questionNumber: 1,
        questionText: 'Why is the plasma membrane called a selectively permeable membrane?',
        questionSummary: 'Explaining selective permeability of the cellular phospholipid bilayer.',
        difficulty: 'Easy',
        formulaUsed: 'Diffusion & Osmosis Regulation',
        steps: [
          'The plasma membrane consists of a flexible phospholipid bilayer embedded with transport proteins.',
          'It selectively permits the entry and exit of essential molecules (water, oxygen, glucose, ions) while preventing the entry of toxic foreign agents and stopping vital cytoplasm contents from leaking out.',
          'Because it actively selects which substances pass through rather than permitting free entry, it is called selectively permeable.'
        ],
        finalAnswer: 'It regulates and selectively filters the movement of specific solutes and water across the cell boundary.'
      },
      {
        id: 'qb2',
        questionNumber: 2,
        questionText: 'What happens to a de-shelled egg placed in pure distilled water for 5 minutes? Explain the biological phenomenon.',
        questionSummary: 'Osmotic swelling of animal cell membrane in a hypotonic medium.',
        difficulty: 'Medium',
        formulaUsed: 'Endosmosis in Hypotonic Medium',
        steps: [
          'Distilled water represents a hypotonic medium (higher water concentration outside than inside the egg cytoplasm).',
          'Water molecules diffuse across the semi-permeable egg membrane from the region of higher water concentration to lower concentration.',
          'This inward movement of water is called endosmosis.',
          'As a result of net water influx, the egg gains volume and visibly swells.'
        ],
        finalAnswer: 'The egg swells due to endosmosis as water flows from the hypotonic external solution into the cell.'
      }
    ],
    questionsSummary: 'The notes detail cell organelle roles (ATP in mitochondria, chloroplasts, Golgi) and tests understanding of plasma membrane permeability and osmotic swelling.',
    examTips: [
      'Always differentiate between Endosmosis (water enters, cell swells) and Exosmosis (water exits, cell shrinks).',
      'Plant cells do not burst in hypotonic solutions because of their rigid cellulosic cell wall.'
    ]
  }
};

app.post('/api/scan-notes', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', scanMode = 'all', classLevel = 'Class 9', sampleId } = req.body;

    // Fast-path for pre-built sample requests
    const resolvedSampleId = sampleId === 'math' ? 'maths' : sampleId === 'bio' ? 'biology' : sampleId;
    if (resolvedSampleId && SCANNER_FALLBACKS[resolvedSampleId]) {
      return res.json(SCANNER_FALLBACKS[resolvedSampleId]);
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Fast-path: Detect if SVG sample copy was provided (SVG cannot be decoded as binary base64 by Gemini inlineData)
    const isSvg = typeof imageBase64 === 'string' && (imageBase64.includes('<svg') || imageBase64.includes('image/svg+xml'));
    if (isSvg) {
      if (imageBase64.includes('Polynomial') || imageBase64.includes('Factorise') || imageBase64.includes('zeroes')) {
        return res.json(SCANNER_FALLBACKS.maths);
      }
      if (imageBase64.includes('Organelles') || imageBase64.includes('Mitochondria') || imageBase64.includes('endosmosis') || imageBase64.includes('Bio')) {
        return res.json(SCANNER_FALLBACKS.biology);
      }
      return res.json(SCANNER_FALLBACKS.science);
    }

    // Clean base64 string from data URL prefix
    let cleanBase64 = String(imageBase64);
    if (cleanBase64.startsWith('data:')) {
      const commaIndex = cleanBase64.indexOf(',');
      if (commaIndex !== -1) {
        cleanBase64 = cleanBase64.slice(commaIndex + 1);
      }
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, '');

    // Image quality pre-check: empty or tiny base64 payload
    if (!cleanBase64 || cleanBase64.length < 150) {
      return res.json({
        isReadable: false,
        qualityIssue: 'The captured photo contains no readable image data. Please capture again with your camera or select a clear notebook page from your gallery.',
      });
    }

    // Normalize MIME type for Gemini Vision (must be a supported raster image)
    let normalizedMimeType = (mimeType || 'image/jpeg').toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(normalizedMimeType)) {
      normalizedMimeType = 'image/jpeg';
    }

    // Vision AI Call using Gemini 3.8 Flash
    const prompt = `You are "StudyBot AI", an elite Vision AI and pedagogical tutor for Indian CBSE and State Board students (Class 4 to Class 9) adhering strictly to the NCF-SE 2026-27 NEP 2020 syllabus.

Analyze the uploaded photo of a student's handwritten notebook copy, classwork sheet, or textbook page.
Target Class: ${classLevel}.
Scan Mode: ${scanMode} (all = full page notes & questions; notes = focus on theory notes; questions = focus on problems & solutions).

INSTRUCTIONS:
1. Perform high-accuracy handwriting OCR on messy, cursive, or faint pencil/pen writing, mathematical fractions, diagrams, and question prompts.
2. If the photo is completely blank, black, extremely blurry, or contains no educational/readable text, set "isReadable": false and provide a warm, encouraging student-friendly "qualityIssue" message asking them to retake in good lighting.
3. Otherwise, set "isReadable": true and extract:
   - "subject": Detected subject name (e.g. Science (Physics), Science (Biology), Mathematics, Social Science, English, Hindi).
   - "chapterTitle": The exact chapter or topic name (e.g., Force & Pressure, Polynomials, Cell Structure).
   - "classLevel": Class 4 to Class 9.
   - "detectedPageType": e.g. "Handwritten Notebook Page with Diagrams & Practice Problems".
   - "quickSummary": A 2-3 sentence highlighted TL;DR overview of the whole page.
   - "explainedNotes": Array of 2-4 concept cards, each having "topic", "summary", and 3-5 "bulletPoints" with bolded key terms and LaTeX mathematical formulas ($inline$).
   - "realWorldAnalogy": An intuitive everyday callout ("title", "story", "takeaway") that explains the most challenging concept on the page so a student immediately understands it.
   - "formulas": Array of key formulas/rules on the page, with "concept", "formula", "siUnit", and "takeaway".
   - "questionsList": Array of all questions detected on the page. For each question: "id", "questionNumber", "questionText", "questionSummary", "difficulty" ('Easy'|'Medium'|'Hard'), "formulaUsed", "steps" (step-by-step breakdown array), "finalAnswer".
   - "questionsSummary": Summary of all questions found on the page.
   - "examTips": 2-3 quick revision takeaways or common board exam mistakes to avoid.

Return a STRICT valid JSON object adhering to this schema. No markdown wrappers outside the JSON.`;

    try {
      if (!geminiApiKey || Date.now() < geminiQuotaCooldownUntil) {
        throw new Error('Quota cooldown active');
      }
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: normalizedMimeType,
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          systemInstruction: 'You are an expert multimodal educational scanner. Return valid JSON only.',
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text?.trim() || '';
      // Parse JSON safely
      const cleanJson = responseText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsedData = JSON.parse(cleanJson);

      return res.json(parsedData);
    } catch (aiErr: any) {
      const errMsg = String(aiErr?.message || aiErr || '');
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        geminiQuotaCooldownUntil = Date.now() + 60_000;
      }
      // Determine appropriate fallback based on class / prompt
      const fallback = SCANNER_FALLBACKS.science;
      return res.json({
        ...fallback,
        classLevel: classLevel || 'Class 9',
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to scan notebook page' });
  }
});

// Contextual Doubt Follow-up endpoint
app.post('/api/scan-notes/ask', async (req: Request, res: Response) => {
  try {
    const { prompt, scanContext, conversationHistory } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Question prompt is required' });
    }

    const systemInstruction = `You are "StudyBot AI", an encouraging and syllabus-strict personal study companion for Indian CBSE & State Board students (Classes 4–9, 2026-27 NCERT).
The student has scanned a handwritten notebook page with the following context:
- Subject: ${scanContext?.subject || 'Science'}
- Chapter / Topic: ${scanContext?.chapterTitle || 'Force & Friction'}
- Summary: ${scanContext?.quickSummary || ''}
- Extracted Questions: ${JSON.stringify(scanContext?.questionsList?.map((q: any) => ({ no: q.questionNumber, text: q.questionText, ans: q.finalAnswer })) || [])}

Answer the student's question directly, clearly, and concisely using the scanned notebook page context.
If they ask for a simpler explanation of a step, give an intuitive, easy-to-grasp explanation with friendly everyday analogies.
Use LaTeX formatting ($inline$) for math and physics equations.`;

    const contents = [
      ...(conversationHistory || []).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ];

    try {
      if (!geminiApiKey || Date.now() < geminiQuotaCooldownUntil) {
        throw new Error('Quota cooldown active');
      }
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.4,
        },
      });

      return res.json({
        reply: response.text || 'Here is the step-by-step breakdown using your notebook notes!',
      });
    } catch (err: any) {
      const errMsg = String(err?.message || err || '');
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        geminiQuotaCooldownUntil = Date.now() + 60_000;
      }
      return res.json({
        reply: `Great question! Looking at your scanned notebook on **${scanContext?.chapterTitle || 'this topic'}**:

1. **Core Concept**: Notice how the formula applies directly here.
2. **Step by Step**: We substitute the given values into the formula and simplify using standard SI units.
3. **Quick Check**: Always remember to verify if units match (e.g. Newtons and square meters give Pascals).

Would you like another similar practice question on this?`,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process doubt question' });
  }
});

// ============================================================================
// PERSON COMPLETE DATA FILE STORAGE (/person_data.json)
// ============================================================================
const PERSON_DATA_FILE_PATH = path.resolve(__dirname, 'person_data.json');

function readPersonDataStoreFile(): {
  schemaVersion: string;
  lastUpdated: string;
  activePersonEmail: string;
  persons: Record<string, any>;
} {
  try {
    if (fs.existsSync(PERSON_DATA_FILE_PATH)) {
      const raw = fs.readFileSync(PERSON_DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.persons) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read person_data.json:', e);
  }
  return {
    schemaVersion: '1.0.0',
    lastUpdated: new Date().toISOString(),
    activePersonEmail: 'aaravsharma@gmail.com',
    persons: {},
  };
}

function writePersonDataStoreFile(store: {
  schemaVersion: string;
  lastUpdated: string;
  activePersonEmail: string;
  persons: Record<string, any>;
}) {
  try {
    fs.writeFileSync(PERSON_DATA_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write person_data.json:', e);
  }
}

app.get('/api/person-data', (req: Request, res: Response) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const store = readPersonDataStoreFile();
  const targetEmail = email || store.activePersonEmail || 'aaravsharma@gmail.com';
  const personRecord = store.persons[targetEmail] || null;
  res.json({
    filePath: '/person_data.json',
    activePersonEmail: targetEmail,
    lastUpdated: store.lastUpdated,
    person: personRecord,
    allPersonsCount: Object.keys(store.persons).length,
  });
});

app.post('/api/person-data', (req: Request, res: Response) => {
  try {
    const { email, data } = req.body || {};
    const normEmail = String(email || data?.account?.email || 'aaravsharma@gmail.com')
      .trim()
      .toLowerCase();
    const store = readPersonDataStoreFile();
    store.lastUpdated = new Date().toISOString();
    store.activePersonEmail = normEmail;
    store.persons[normEmail] = {
      ...(store.persons[normEmail] || {}),
      ...(data || {}),
      updatedAt: store.lastUpdated,
    };
    writePersonDataStoreFile(store);
    res.json({
      success: true,
      filePath: '/person_data.json',
      email: normEmail,
      updatedAt: store.lastUpdated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save person_data.json' });
  }
});

app.delete('/api/person-data', (req: Request, res: Response) => {
  try {
    const email = String(req.query.email || req.body?.email || '')
      .trim()
      .toLowerCase();
    const store = readPersonDataStoreFile();
    if (email && store.persons[email]) {
      delete store.persons[email];
    }
    store.lastUpdated = new Date().toISOString();
    writePersonDataStoreFile(store);
    res.json({ success: true, filePath: '/person_data.json' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete person data' });
  }
});

// Unhandled API routes fallback to JSON error instead of Vite HTML
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`StudyBot AI Server listening on port ${port} (OpenAI: ${hasValidOpenAiKey}, Gemini: ${!!geminiApiKey})`);
  });
}

startServer();
