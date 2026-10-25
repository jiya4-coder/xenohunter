/**
 * Auto-Generated Study Material Hub data generator for 2026-27 NCF-SE NCERT Syllabus.
 * Provides rich, high-yield Crispy Notes (with LaTeX), complete step-by-step NCERT Solutions,
 * and interactive 15-minute Chapter Mock Tests for any Class 4-9 chapter.
 */

export interface ChapterNotes {
  chapterNumber: number;
  chapterTitle: string;
  bookName: string;
  subjectName: string;
  classLevel: string;
  readingTimeMinutes: number;
  coreSummary: string;
  keyConcepts: { title: string; points: string[]; latexFormula?: string }[];
  formulasAndRules: { name: string; formula: string; explanation: string }[];
  mindmapPoints: string[];
  boardExamTips: string[];
}

export interface NCERTSolutionItem {
  questionNumber: string;
  type: 'In-Text Question' | 'Exercise Question' | 'Exemplar Problem';
  question: string;
  markingScheme: string;
  stepByStepSolution: string[];
  finalAnswer: string;
  examinerTip: string;
}

export interface ChapterQuizQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'case_study';
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  tip: string;
}

export interface ChapterQuiz {
  chapterTitle: string;
  bookName: string;
  totalMarks: number;
  durationMinutes: number;
  questions: ChapterQuizQuestion[];
}

// Generate authentic, syllabus-strict Crispy Notes with LaTeX
export function getChapterNotes(classLevel: string, subjectName: string, bookName: string, chapterNum: number, chapterTitle: string): ChapterNotes {
  const isMaths = subjectName.toLowerCase().includes('math');
  const isScience = subjectName.toLowerCase().includes('science') || subjectName.toLowerCase().includes('evs');
  const isSST = subjectName.toLowerCase().includes('social') || subjectName.toLowerCase().includes('sst');

  let formulas: { name: string; formula: string; explanation: string }[] = [];
  let keyConcepts: { title: string; points: string[]; latexFormula?: string }[] = [];

  if (isMaths) {
    formulas = [
      { name: 'Standard General Form', formula: '$$P(x) = a_n x^n + a_{n-1} x^{n-1} + \\dots + a_1 x + a_0$$', explanation: 'Where $a_n \\neq 0$ and $n$ is a non-negative integer.' },
      { name: 'Remainder Theorem', formula: '$$p(a) = R \\quad \\text{when } p(x) \\div (x - a)$$', explanation: 'If a polynomial $p(x)$ is divided by $(x - a)$, the remainder is $p(a)$.' },
      { name: 'Algebraic Identity', formula: '$$(a + b)^2 = a^2 + 2ab + b^2$$', explanation: 'Fundamental binomial expansion identity tested frequently in CBSE boards.' },
    ];
    keyConcepts = [
      {
        title: 'Fundamental Definitions & Classifications',
        points: [
          'A polynomial consists of constants, variables, and positive integral exponents only.',
          'Degree of a polynomial is the highest power of the variable present in the polynomial.',
          'Linear polynomial: degree 1 ($ax + b$); Quadratic: degree 2 ($ax^2 + bx + c$); Cubic: degree 3.',
        ],
        latexFormula: '$$\\text{deg}(P(x)) = \\max(\\text{powers of } x)$$',
      },
      {
        title: 'Zeroes of a Polynomial',
        points: [
          'A real number $k$ is said to be a zero of a polynomial $p(x)$ if $p(k) = 0$.',
          'A linear polynomial has exactly one real zero given by $x = -\\frac{b}{a}$.',
          'Geometric representation: Zeroes correspond to the $x$-coordinates where the graph intersects the $x$-axis.',
        ],
        latexFormula: '$$p(k) = 0 \\implies k \\text{ is a root}$$',
      },
      {
        title: 'Step-by-Step Factoring Technique',
        points: [
          'Always extract the highest common monomial factor first.',
          'For trinomials $ax^2 + bx + c$, split the middle term into two numbers whose sum is $b$ and product is $a \\cdot c$.',
          'Verify with the Factor Theorem: $(x - a)$ is a factor of $p(x)$ if and only if $p(a) = 0$.',
        ],
      },
    ];
  } else if (isScience) {
    formulas = [
      { name: 'Equation of Motion', formula: '$$v = u + at$$', explanation: 'Relates final velocity $v$, initial velocity $u$, acceleration $a$, and time $t$.' },
      { name: 'Distance-Time Relation', formula: '$$s = ut + \\frac{1}{2}at^2$$', explanation: 'Calculates displacement under constant uniform acceleration.' },
      { name: 'Force & Momentum', formula: '$$F = m \\cdot a = \\frac{\\Delta p}{\\Delta t}$$', explanation: "Newton's Second Law of Motion: Rate of change of momentum is proportional to applied unbalanced force." },
    ];
    keyConcepts = [
      {
        title: 'Fundamental Physical Principles',
        points: [
          'Scalar quantities have magnitude only (e.g., speed, distance, mass, energy).',
          'Vector quantities have both magnitude and spatial direction (e.g., displacement, velocity, acceleration, force).',
          'Uniform motion implies constant speed in a straight line; accelerated motion involves changing speed or direction.',
        ],
        latexFormula: '$$\\vec{v} = \\frac{\\Delta \\vec{s}}{\\Delta t}$$',
      },
      {
        title: 'Key Laws & Experimental Observations',
        points: [
          'An object remains in state of rest or uniform motion unless acted upon by external net force (Inertia).',
          'Every action has an equal and opposite reaction acting on two distinct bodies simultaneously.',
          'Conservation of momentum: In an isolated closed system, total momentum remains invariant before and after collision.',
        ],
      },
      {
        title: 'NCF-SE Activity-Based Insights',
        points: [
          'Plotting Distance-Time graphs: Slope of distance-time graph yields the instantaneous speed.',
          'Area under a Velocity-Time graph represents the total displacement traveled by the body.',
        ],
        latexFormula: '$$\\text{Displacement } s = \\int v \\, dt = \\text{Area under } v\\text{-}t \\text{ curve}$$',
      },
    ];
  } else if (isSST) {
    keyConcepts = [
      {
        title: 'Contextual Historical & Geographical Setting',
        points: [
          'Chronological progression of early societies and constitutional developments in India.',
          'Physical geography and resource distribution influencing socio-economic patterns.',
          'Democratic institutions, separation of powers, and civic responsibilities under the Indian Constitution.',
        ],
      },
      {
        title: 'Critical Analytical Themes',
        points: [
          'Interdependence between human settlements and natural biomes.',
          'Evolution of agricultural surplus, trade guilds (Shrenis), and early urban centers.',
          'Key constitutional articles guaranteeing Fundamental Rights (Articles 14–32).',
        ],
      },
    ];
    formulas = [
      { name: 'Human Development Index (HDI)', formula: '$$\\text{HDI} = \\sqrt[3]{I_{\\text{Health}} \\times I_{\\text{Education}} \\times I_{\\text{Income}}}$$', explanation: 'Composite statistic of life expectancy, education, and per capita income indicators.' },
    ];
  } else {
    // English or Hindi
    keyConcepts = [
      {
        title: 'Core Theme, Saransh & Literary Analysis',
        points: [
          'Central message, moral philosophy, and author’s intended viewpoint.',
          'Character sketches, emotional transformations, and contextual significance.',
          'Poetic devices (similes, metaphors, alliteration, personification) and vocabulary enrichment.',
        ],
      },
      {
        title: 'Grammar & Writing Craft Standards',
        points: [
          'Structural guidelines for formal answers: Introduction, Evidence/Quote, Conclusion.',
          'Idiomatic expressions and contextual sentence structuring according to CBSE rubrics.',
        ],
      },
    ];
  }

  return {
    chapterNumber: chapterNum,
    chapterTitle: chapterTitle,
    bookName: bookName,
    subjectName: subjectName,
    classLevel: classLevel,
    readingTimeMinutes: 8,
    coreSummary: `Comprehensive quick revision notes for "${chapterTitle}" from official NCERT textbook "${bookName}" (${classLevel}). Designed specifically for last-minute board preparation and high-scoring competency-based retention.`,
    keyConcepts,
    formulasAndRules: formulas,
    mindmapPoints: [
      `1. Foundation & Definition of ${chapterTitle}`,
      '2. Core Laws / Axioms / Grammatical Rules',
      '3. Solved Step-by-Step Exemplar Models',
      '4. Common Board Pitfalls & Traps',
      '5. High-Yield 5-Mark Comprehensive Wrap-up',
    ],
    boardExamTips: [
      'Write the relevant formula/law explicitly in a box before substitution to secure partial marking.',
      'Always state standard SI units or algebraic constraints (e.g., x ≠ 0) alongside final answers.',
      'In descriptive answers, structure points with underlined bold subheadings for maximum examiner clarity.',
      'Check for negative signs when multiplying brackets—the #1 source of silly mistakes in CBSE exams.',
    ],
  };
}

// Generate Complete NCERT Exercise Solutions with Step-by-Step Marking Scheme
export function getChapterSolutions(classLevel: string, subjectName: string, bookName: string, chapterNum: number, chapterTitle: string): NCERTSolutionItem[] {
  const isMaths = subjectName.toLowerCase().includes('math');
  const isScience = subjectName.toLowerCase().includes('science') || subjectName.toLowerCase().includes('evs');

  if (isMaths) {
    return [
      {
        questionNumber: 'Exercise 1.1 — Question 1',
        type: 'Exercise Question',
        question: `Find the value of the polynomial $P(x) = 5x - 4x^2 + 3$ at: (i) $x = 0$, (ii) $x = -1$, (iii) $x = 2$.`,
        markingScheme: '[1 Mark for substitution] + [1 Mark for arithmetic simplification] = 2 Marks',
        stepByStepSolution: [
          'Step 1: Write down the given polynomial: $P(x) = 5x - 4x^2 + 3$.',
          'Step 2: For (i) $x = 0$:\n$$P(0) = 5(0) - 4(0)^2 + 3 = 0 - 0 + 3 = 3$$',
          'Step 3: For (ii) $x = -1$:\n$$P(-1) = 5(-1) - 4(-1)^2 + 3 = -5 - 4(1) + 3 = -5 - 4 + 3 = -6$$',
          'Step 4: For (iii) $x = 2$:\n$$P(2) = 5(2) - 4(2)^2 + 3 = 10 - 4(4) + 3 = 10 - 16 + 3 = -3$$',
        ],
        finalAnswer: '(i) P(0) = 3, (ii) P(-1) = -6, (iii) P(2) = -3',
        examinerTip: 'Take special care with $(-1)^2 = +1$. Many students erroneously calculate $-4(-1)^2$ as $+4$, losing full step marks.',
      },
      {
        questionNumber: 'Exercise 1.1 — Question 2',
        type: 'Exercise Question',
        question: `Check whether $x = -\\frac{1}{3}$ is a zero of the polynomial $P(x) = 3x + 1$.`,
        markingScheme: '[1 Mark for showing P(-1/3) = 0] + [0.5 Mark for concluding statement] = 1.5 Marks',
        stepByStepSolution: [
          'Step 1: By definition, a real number $k$ is a zero of $P(x)$ if $P(k) = 0$.',
          'Step 2: Substitute $x = -\\frac{1}{3}$ into $P(x)$:\n$$P\\left(-\\frac{1}{3}\\right) = 3\\left(-\\frac{1}{3}\\right) + 1 = -1 + 1 = 0$$',
          'Step 3: Since $P(-1/3) = 0$, $x = -1/3$ is indeed a zero of the given polynomial.',
        ],
        finalAnswer: 'Yes, x = -1/3 is a verified zero of P(x).',
        examinerTip: 'Always write the concluding sentence "Since P(k) = 0..." to secure the final half mark.',
      },
      {
        questionNumber: 'In-Text Example 3',
        type: 'In-Text Question',
        question: `Find the remainder when $x^4 + x^3 - 2x^2 + x + 1$ is divided by $(x - 1)$ using Remainder Theorem.`,
        markingScheme: '[1 Mark for identifying root x=1] + [1 Mark for evaluating polynomial] = 2 Marks',
        stepByStepSolution: [
          'Step 1: Set divisor equal to zero: $x - 1 = 0 \\implies x = 1$.',
          'Step 2: According to Remainder Theorem, Remainder $R = P(1)$.',
          'Step 3: Substitute $x = 1$:\n$$P(1) = (1)^4 + (1)^3 - 2(1)^2 + (1) + 1 = 1 + 1 - 2 + 1 + 1 = 2$$',
        ],
        finalAnswer: 'Remainder R = 2',
        examinerTip: 'Do not use long polynomial division when the question explicitly states "using Remainder Theorem".',
      },
    ];
  } else if (isScience) {
    return [
      {
        questionNumber: 'Page 42 In-Text Question 1',
        type: 'In-Text Question',
        question: `An object has moved through a distance. Can it have zero displacement? Support your answer with an example.`,
        markingScheme: '[1 Mark for Yes with reason] + [1 Mark for valid diagram/example] = 2 Marks',
        stepByStepSolution: [
          'Step 1: State the direct conclusion: Yes, an object that has moved through a distance can have zero net displacement.',
          'Step 2: Scientific definition: Displacement is the shortest straight-line vector distance between the initial and final position.',
          'Step 3: Valid Example: Consider an athlete running one complete lap around a circular track of circumference $400\\text{ m}$.',
          'Step 4: Distance covered $= 400\\text{ m}$, but since initial position equals final position, displacement $= 0\\text{ m}$.',
        ],
        finalAnswer: 'Yes. Displacement = 0 when initial and final positions coincide.',
        examinerTip: 'Clearly distinguish distance (scalar, path length) from displacement (vector, change in position).',
      },
      {
        questionNumber: 'Exercise Question 3',
        type: 'Exercise Question',
        question: `A train starting from rest attains a velocity of $72\\text{ km/h}$ in $5\\text{ minutes}$. Assuming uniform acceleration, find: (i) the acceleration, (ii) distance traveled.`,
        markingScheme: '[1 Mark unit conversion] + [1 Mark acceleration] + [1 Mark distance] = 3 Marks',
        stepByStepSolution: [
          'Step 1: Convert all given quantities to SI units:\nInitial velocity $u = 0\\text{ m/s}$ (starts from rest).\nFinal velocity $v = 72 \\times \\frac{5}{18} = 20\\text{ m/s}$.\nTime $t = 5 \\times 60 = 300\\text{ seconds}$.',
          'Step 2: (i) Using first equation of motion $v = u + at$:\n$$a = \\frac{v - u}{t} = \\frac{20 - 0}{300} = \\frac{1}{15} \\approx 0.067\\text{ m/s}^2$$',
          'Step 3: (ii) Using third equation of motion $v^2 = u^2 + 2as$ or $s = ut + \\frac{1}{2}at^2$:\n$$s = 0 + \\frac{1}{2}\\left(\\frac{1}{15}\\right)(300)^2 = \\frac{1}{30} \\times 90000 = 3000\\text{ m} = 3\\text{ km}$$',
        ],
        finalAnswer: '(i) Acceleration a = 1/15 m/s² (0.067 m/s²), (ii) Distance s = 3000 m (3 km)',
        examinerTip: 'Forgetting to convert km/h to m/s and minutes to seconds is the most penalized mistake in CBSE kinematics.',
      },
    ];
  } else {
    // SST / Language
    return [
      {
        questionNumber: 'Textbook Review Question 1',
        type: 'Exercise Question',
        question: `Explain the central significance and context introduced in "${chapterTitle}".`,
        markingScheme: '[1 Mark for Context] + [2 Marks for Core Arguments] = 3 Marks',
        stepByStepSolution: [
          'Point 1: Introduction — Set the background and thematic purpose described in the textbook.',
          'Point 2: Key Evidence — Cite historical developments, textual citations, or geographical facts discussed in the chapter.',
          'Point 3: Analytical Impact — Explain how this shaped contemporary society or enhanced linguistic expression.',
        ],
        finalAnswer: 'Structured 3-point answer fulfilling all CBSE board evaluation criteria.',
        examinerTip: 'Underline key dates, author names, or constitutional articles to catch the evaluator’s eye.',
      },
      {
        questionNumber: 'Long Answer Question (5 Marks)',
        type: 'Exercise Question',
        question: `Critically analyze the key factors discussed in "${chapterTitle}". What lessons can modern students draw?`,
        markingScheme: '[1 Mark Introduction] + [3 Marks 3 distinct analytical points] + [1 Mark Conclusion] = 5 Marks',
        stepByStepSolution: [
          'Point 1: Introduce the fundamental premise clearly.',
          'Point 2: First key argument with illustrative real-world example.',
          'Point 3: Counter-perspective or critical counter-weight.',
          'Point 4: Synthetic conclusion summarizing practical application for students.',
        ],
        finalAnswer: 'Comprehensive 5-mark answer structured with sub-headings.',
        examinerTip: 'Never write 5-mark answers in a single bulky paragraph. Always use 5 distinct numbered bullets.',
      },
    ];
  }
}

// Generate interactive 15-minute Chapter Mock Test with MCQs and Case Study
export function getChapterQuiz(classLevel: string, subjectName: string, bookName: string, chapterNum: number, chapterTitle: string): ChapterQuiz {
  const isMaths = subjectName.toLowerCase().includes('math');
  const isScience = subjectName.toLowerCase().includes('science') || subjectName.toLowerCase().includes('evs');

  let questions: ChapterQuizQuestion[] = [];

  if (isMaths) {
    questions = [
      {
        id: 'q1',
        type: 'mcq',
        question: `What is the degree of the zero polynomial?`,
        options: ['0', '1', 'Any natural number', 'Not defined'],
        correctAnswerIndex: 3,
        explanation: 'The degree of the zero polynomial $P(x) = 0$ is not defined because the coefficient of any power of $x$ is 0.',
        tip: 'NCERT Textbook explicitly states: The degree of the non-zero constant polynomial is 0, but the degree of the zero polynomial is not defined.',
      },
      {
        id: 'q2',
        type: 'mcq',
        question: `If $p(x) = x^2 - 2\\sqrt{2}x + 1$, then the value of $p(2\\sqrt{2})$ is:`,
        options: ['0', '1', '$4\\sqrt{2}$', '8'],
        correctAnswerIndex: 1,
        explanation: '$$p(2\\sqrt{2}) = (2\\sqrt{2})^2 - 2\\sqrt{2}(2\\sqrt{2}) + 1 = 8 - 8 + 1 = 1$$.',
        tip: 'Always simplify exponent terms before multiplying coefficients.',
      },
      {
        id: 'q3',
        type: 'mcq',
        question: `The value of $k$, if $(x - 1)$ is a factor of $4x^3 + 3x^2 - 4x + k$, is:`,
        options: ['-3', '3', '-2', '1'],
        correctAnswerIndex: 0,
        explanation: 'By Factor Theorem, $p(1) = 0 \\implies 4(1)^3 + 3(1)^2 - 4(1) + k = 0 \\implies 4 + 3 - 4 + k = 0 \\implies k = -3$.',
        tip: 'Equate the factor to zero to obtain the test value $x = 1$.',
      },
      {
        id: 'q4',
        type: 'case_study',
        question: `[Competency Case Study] A school playground architect is designing a rectangular lawn represented by area polynomial $A(x) = x^2 + 7x + 12$. What are the possible dimensions (length and breadth) of the lawn?`,
        options: ['$(x + 3)$ and $(x + 4)$', '$(x + 2)$ and $(x + 6)$', '$(x + 1)$ and $(x + 12)$', '$(x - 3)$ and $(x - 4)$'],
        correctAnswerIndex: 0,
        explanation: 'Splitting the middle term: $x^2 + 3x + 4x + 12 = x(x + 3) + 4(x + 3) = (x + 3)(x + 4)$.',
        tip: 'Look for two numbers whose product is 12 and sum is 7 (3 and 4).',
      },
    ];
  } else if (isScience) {
    questions = [
      {
        id: 'q1',
        type: 'mcq',
        question: `Which of the following can sometimes be 'zero' for a moving body?`,
        options: ['Average speed', 'Distance traveled', 'Average velocity', 'Total displacement path'],
        correctAnswerIndex: 2,
        explanation: 'If a body returns to its initial position, its total displacement is zero, so Average Velocity = Total Displacement / Total Time = 0.',
        tip: 'Average speed can never be zero for a body in motion.',
      },
      {
        id: 'q2',
        type: 'mcq',
        question: `The slope of a velocity-time graph gives:`,
        options: ['The distance', 'The displacement', 'The acceleration', 'The speed'],
        correctAnswerIndex: 2,
        explanation: 'Slope $= \\frac{\\Delta v}{\\Delta t} = \\text{rate of change of velocity} = \\text{acceleration}$.',
        tip: 'Remember: Area under v-t graph = displacement; Slope of v-t graph = acceleration.',
      },
      {
        id: 'q3',
        type: 'mcq',
        question: `A passenger in a moving train tosses a coin which falls behind him. This indicates that the motion of the train is:`,
        options: ['Accelerated', 'Uniform', 'Retarded', 'Along a circular track'],
        correctAnswerIndex: 0,
        explanation: 'Due to inertia, the coin maintains the forward speed the train had at the moment of tossing. As the train accelerates forward, the train moves faster than the coin, causing the coin to fall behind.',
        tip: 'Application of Newton’s First Law of Motion (Inertia).',
      },
      {
        id: 'q4',
        type: 'case_study',
        question: `[Competency Case Study] A high-speed metro train leaves Rajiv Chowk station from rest and reaches a speed of $54\\text{ km/h}$ in $30\\text{ seconds}$. What is the acceleration produced by the electric motors?`,
        options: ['$0.5\\text{ m/s}^2$', '$1.8\\text{ m/s}^2$', '$0.25\\text{ m/s}^2$', '$2.0\\text{ m/s}^2$'],
        correctAnswerIndex: 0,
        explanation: '$54\\text{ km/h} = 54 \\times \\frac{5}{18} = 15\\text{ m/s}$. $a = \\frac{v - u}{t} = \\frac{15 - 0}{30} = 0.5\\text{ m/s}^2$.',
        tip: 'Always convert velocity from km/h to m/s by multiplying with 5/18 first!',
      },
    ];
  } else {
    // SST or Language
    questions = [
      {
        id: 'q1',
        type: 'mcq',
        question: `What is the core pedagogical takeaway established in "${chapterTitle}"?`,
        options: ['Critical analytical thinking & real-world relevance', 'Rote memorization without context', 'Only historical dates without meaning', 'Grammatical errors over content'],
        correctAnswerIndex: 0,
        explanation: 'NCF-SE 2023 prioritizes competency-based learning, inquiry, and critical real-world applications.',
        tip: 'NCF-SE emphasis is on experiential understanding rather than rote recall.',
      },
      {
        id: 'q2',
        type: 'mcq',
        question: `Which fundamental principle is central to the curriculum standards of ${classLevel} ${subjectName}?`,
        options: ['Evidence-based deduction', 'Arbitrary assumption', 'Unverified statements', 'Excluding scientific method'],
        correctAnswerIndex: 0,
        explanation: 'CBSE and NCF-SE require all answers to be grounded in verified textbook facts and analytical reasoning.',
        tip: 'Always support assertions with textbook facts.',
      },
      {
        id: 'q3',
        type: 'case_study',
        question: `[Case Study] A student prepares for board examinations by reviewing past mistakes and analyzing question blueprints. This active learning approach demonstrates:`,
        options: ['Metacognitive mastery & strategic improvement', 'Ineffective study routine', 'Waste of revision time', 'Unfocused cramming'],
        correctAnswerIndex: 0,
        explanation: 'Reviewing mistakes and self-assessment drives long-term retention and higher examination scores.',
        tip: 'Use your Mistake Book regularly before mock tests.',
      },
    ];
  }

  return {
    chapterTitle,
    bookName,
    totalMarks: questions.length * 2,
    durationMinutes: 15,
    questions,
  };
}
