import type { CatalogRow } from '@/data/catalog/catalog'
import {
  NURSERY_GRADES,
  PRIMARY_GRADES,
  sectionForGrade,
} from '@/data/school/grades'

type TermPlan = {
  course: string
  coverage: string
  weeks?: number
}

const TERMS = ['Term I', 'Term II', 'Term III'] as const

/** What learners are meant to study — Uganda nursery & primary by class × term. */
const PLANS: Record<string, Record<(typeof TERMS)[number], TermPlan[]>> = {
  'Baby Class': {
    'Term I': [
      {
        course: 'Language',
        coverage:
          'Settling-in talk, greetings, name recognition, simple songs & rhymes, listening games.',
      },
      {
        course: 'Numeracy Play',
        coverage:
          'Counting songs 1–5, big/small, matching objects, colour sorting.',
      },
      {
        course: 'Physical',
        coverage:
          'Gross motor outdoor play, walking line, ball roll, hand–eye coordination.',
      },
      {
        course: 'Creative',
        coverage: 'Finger painting, free drawing, playdough, sand & water play.',
      },
    ],
    'Term II': [
      {
        course: 'Language',
        coverage:
          'Picture talk, animal sounds, short stories, vocabulary for home & school.',
      },
      {
        course: 'Numeracy Play',
        coverage: 'Counting 1–10, more/less, shapes (circle, square), pattern copy.',
      },
      {
        course: 'Physical',
        coverage: 'Climbing, balancing, dancing to rhythm, fine motor with pegs.',
      },
      {
        course: 'Social habits',
        coverage: 'Sharing, toilet routines, washing hands, classroom rules.',
      },
    ],
    'Term III': [
      {
        course: 'Language',
        coverage:
          'Retelling simple stories, letter awareness (own name), speaking in sentences.',
      },
      {
        course: 'Numeracy Play',
        coverage: 'Counting 1–15, grouping, simple puzzles, days of the week song.',
      },
      {
        course: 'Creative',
        coverage: 'Collage, nature walks, role play (home corner), music circle.',
      },
      {
        course: 'Physical',
        coverage: 'Relay games, bean bags, skipping prep, outdoor free play.',
      },
    ],
  },
  'Middle Class': {
    'Term I': [
      {
        course: 'Language',
        coverage:
          'Letter sounds A–M, oral storytelling, picture description, listening for instructions.',
      },
      {
        course: 'Numeracy Play',
        coverage:
          'Numbers 1–20, one-to-one counting, compare sets, basic shapes.',
      },
      {
        course: 'Environmental',
        coverage: 'Myself & my family, school environment, weather & seasons intro.',
      },
      {
        course: 'Creative',
        coverage: 'Cutting & sticking, colouring within lines, songs with actions.',
      },
    ],
    'Term II': [
      {
        course: 'Language',
        coverage:
          'Letter sounds N–Z, blending CVC orally, reading picture books, writing strokes.',
      },
      {
        course: 'Numeracy Play',
        coverage:
          'Numbers 1–50, add/take away with objects, patterns, money play (coins).',
      },
      {
        course: 'Environmental',
        coverage: 'Animals & plants, food we eat, community helpers.',
      },
      {
        course: 'Physical',
        coverage: 'Ball skills, relay, dance, fine motor pencil grip practice.',
      },
    ],
    'Term III': [
      {
        course: 'Language',
        coverage:
          'Simple word reading, name writing, story sequence, speaking confidently.',
      },
      {
        course: 'Numeracy Play',
        coverage:
          'Numbers 1–100 intro, tens & ones with counters, measuring with hands/cups.',
      },
      {
        course: 'Environmental',
        coverage: 'Keeping clean & safe, transport, Uganda flag colours intro.',
      },
      {
        course: 'Creative',
        coverage: 'End-of-year concert pieces, craft exhibition, drama.',
      },
    ],
  },
  'Top Class': {
    'Term I': [
      {
        course: 'Literacy Readiness',
        coverage:
          'Phonics review, reading short sentences, handwriting letters, oral news.',
      },
      {
        course: 'Numeracy Play',
        coverage:
          'Numbers 1–100, place value tens/ones, add/subtract within 20, shapes & solids.',
      },
      {
        course: 'Environmental',
        coverage: 'Living & non-living, my body, home & school rules, safety.',
      },
      {
        course: 'Creative',
        coverage: 'Drawing from observation, songs for assembly, clay modelling.',
      },
    ],
    'Term II': [
      {
        course: 'Literacy Readiness',
        coverage:
          'Guided reading books, writing simple sentences, dictation of CVC words.',
      },
      {
        course: 'Numeracy Play',
        coverage:
          'Add/subtract within 50, skip counting 2s & 5s, time (o’clock), money UGX play.',
      },
      {
        course: 'Environmental',
        coverage: 'Plants & animals of Uganda, weather recording, water & hygiene.',
      },
      {
        course: 'Physical',
        coverage: 'Team games, athletics basics, coordination circuits.',
      },
    ],
    'Term III': [
      {
        course: 'Literacy Readiness',
        coverage:
          'P.1 readiness reading, writing a short paragraph, listening comprehension.',
      },
      {
        course: 'Numeracy Play',
        coverage:
          'Word problems with pictures, number bonds, measure length/weight, calendar.',
      },
      {
        course: 'Environmental',
        coverage:
          'Community & map of school, recycling, preparation for primary transition.',
      },
      {
        course: 'Creative',
        coverage: 'Graduation concert, portfolio of work, role play “P.1 day”.',
      },
    ],
  },
  'P.1': {
    'Term I': [
      {
        course: 'English',
        coverage:
          'Letters Aa–Zz sounds, reading CVC words, oral greetings, handwriting patterns.',
      },
      {
        course: 'Mathematics',
        coverage:
          'Numbers 1–100, place value, add/subtract within 20, shapes, patterns.',
      },
      {
        course: 'Literacy (Luganda / local)',
        coverage: 'Oral language, rhymes, letter sounds in local language, picture talk.',
      },
      {
        course: 'Religious Education',
        coverage: 'Creation story, prayer & respect, caring for others.',
      },
    ],
    'Term II': [
      {
        course: 'English',
        coverage:
          'Simple sentences, guided reading, nouns & verbs intro, spelling lists.',
      },
      {
        course: 'Mathematics',
        coverage:
          'Add/subtract within 50, skip count 2/5/10, money, time (hour), measure.',
      },
      {
        course: 'Science',
        coverage: 'Living things, my body senses, weather, water & cleanliness.',
      },
      {
        course: 'Social Studies',
        coverage: 'Home & school, family roles, our village / town.',
      },
    ],
    'Term III': [
      {
        course: 'English',
        coverage:
          'Comprehension passages, writing 3–5 sentences, punctuation (capital, full stop).',
      },
      {
        course: 'Mathematics',
        coverage:
          'Word problems, numbers to 200, doubles, simple fractions (½), revision.',
      },
      {
        course: 'Science',
        coverage: 'Plants & animals, day/night, safety at home & road.',
      },
      {
        course: 'Social Studies',
        coverage: 'Uganda our country (intro), national symbols, helping in community.',
      },
    ],
  },
  'P.2': {
    'Term I': [
      {
        course: 'English',
        coverage:
          'Reading fluency, sentence building, adjectives, handwriting joined prep.',
      },
      {
        course: 'Mathematics',
        coverage:
          'Numbers to 500, add/subtract with regrouping intro, multiplication as groups.',
      },
      {
        course: 'Science',
        coverage: 'Air & water, plants parts, animals around us, hygiene.',
      },
      {
        course: 'Social Studies',
        coverage: 'Map of school/home, occupations, transport & communication.',
      },
    ],
    'Term II': [
      {
        course: 'English',
        coverage: 'Story writing, comprehension, tenses (present/past), spelling.',
      },
      {
        course: 'Mathematics',
        coverage:
          'Multiplication tables 2–5, division sharing, money & change, length.',
      },
      {
        course: 'Science',
        coverage: 'Weather instruments simple, soil, food groups, first aid basics.',
      },
      {
        course: 'Social Studies',
        coverage: 'District features, culture & customs, leadership at home/school.',
      },
    ],
    'Term III': [
      {
        course: 'English',
        coverage: 'Letters & invitations, reading poetry, revision for promotion.',
      },
      {
        course: 'Mathematics',
        coverage: 'Fractions ½ ¼, time half-hour, data pictographs, revision.',
      },
      {
        course: 'Science',
        coverage: 'Energy (light/heat) intro, environment care, project work.',
      },
      {
        course: 'Social Studies',
        coverage: 'Uganda regions intro, peace & unity, end-of-year project.',
      },
    ],
  },
  'P.3': {
    'Term I': [
      {
        course: 'English',
        coverage:
          'Paragraph writing, comprehension strategies, grammar (nouns, verbs, adjectives).',
      },
      {
        course: 'Mathematics',
        coverage:
          'Numbers to 1000, multiply/divide 2–10, place value, perimeter intro.',
      },
      {
        course: 'Science',
        coverage: 'Human body systems intro, plants reproduction, matter states.',
      },
      {
        course: 'Social Studies',
        coverage: 'Map reading (compass), population of home area, government intro.',
      },
    ],
    'Term II': [
      {
        course: 'English',
        coverage: 'Formal/informal letters, dialogue, punctuation, vocabulary building.',
      },
      {
        course: 'Mathematics',
        coverage: 'Fractions & decimals intro, area of rectangles, data tables.',
      },
      {
        course: 'Science',
        coverage: 'Electricity safety, magnets, environment pollution, health.',
      },
      {
        course: 'Social Studies',
        coverage: 'Economic activities, resources of Uganda, culture diversity.',
      },
    ],
    'Term III': [
      {
        course: 'English',
        coverage: 'Creative writing, summary skills, oral presentations, revision.',
      },
      {
        course: 'Mathematics',
        coverage: 'Word problems mixed ops, volume intro, revision for P.4.',
      },
      {
        course: 'Science',
        coverage: 'Simple machines, soil conservation, science fair project.',
      },
      {
        course: 'Social Studies',
        coverage: 'Citizenship, rights & responsibilities, Uganda neighbours intro.',
      },
    ],
  },
  'P.4': {
    'Term I': [
      {
        course: 'English',
        coverage:
          'Composition (narrative), comprehension, parts of speech review, spelling.',
      },
      {
        course: 'Mathematics',
        coverage:
          'Large numbers, factors/multiples, fractions operations, angles intro.',
      },
      {
        course: 'Science',
        coverage: 'Classification of living things, digestion, weather & climate.',
      },
      {
        course: 'Social Studies',
        coverage: 'Location of Uganda, physical features, early man / history intro.',
      },
    ],
    'Term II': [
      {
        course: 'English',
        coverage: 'Descriptive writing, summary, reported speech intro, poetry.',
      },
      {
        course: 'Mathematics',
        coverage: 'Decimals, percentages intro, perimeter/area, time & speed intro.',
      },
      {
        course: 'Science',
        coverage: 'Circulatory system, plants photosynthesis, energy forms.',
      },
      {
        course: 'Social Studies',
        coverage: 'Pre-colonial societies, farming & fishing, map work districts.',
      },
    ],
    'Term III': [
      {
        course: 'English',
        coverage: 'Argumentative paragraph, exam technique, oral debates.',
      },
      {
        course: 'Mathematics',
        coverage: 'Data handling, construction of shapes, revision assessments.',
      },
      {
        course: 'Science',
        coverage: 'Environment management, diseases prevention, practicals.',
      },
      {
        course: 'Social Studies',
        coverage: 'Local government, trade, cultural heritage project.',
      },
    ],
  },
  'P.5': {
    'Term I': [
      {
        course: 'English',
        coverage:
          'Essay types, comprehension inference, grammar (tenses, agreement).',
      },
      {
        course: 'Mathematics',
        coverage:
          'Integers intro, fractions/decimals mastery, ratio, geometry angles.',
      },
      {
        course: 'Science',
        coverage: 'Respiratory system, classification of plants, soil & agriculture.',
      },
      {
        course: 'Social Studies',
        coverage: 'East Africa location, climate, colonial history beginnings.',
      },
    ],
    'Term II': [
      {
        course: 'English',
        coverage: 'Formal letters, summary writing, figures of speech, vocabulary.',
      },
      {
        course: 'Mathematics',
        coverage: 'Percentages & profit/loss intro, area/volume, algebraic thinking.',
      },
      {
        course: 'Science',
        coverage: 'Electricity & magnetism, light, reproductive health intro.',
      },
      {
        course: 'Social Studies',
        coverage: 'Colonial rule in Uganda, economic activities, map skills.',
      },
    ],
    'Term III': [
      {
        course: 'English',
        coverage: 'Creative & factual writing, oral literature, revision papers.',
      },
      {
        course: 'Mathematics',
        coverage: 'Scale drawing, averages, mixed revision for mid-primary.',
      },
      {
        course: 'Science',
        coverage: 'Environment & conservation, science investigations.',
      },
      {
        course: 'Social Studies',
        coverage: 'Independence struggle, governance, regional cooperation.',
      },
    ],
  },
  'P.6': {
    'Term I': [
      {
        course: 'English',
        coverage:
          'PLE-style composition, comprehension, grammar accuracy, summary.',
      },
      {
        course: 'Mathematics',
        coverage:
          'Number bases intro, sets, fractions/ratios/%, geometry constructions.',
      },
      {
        course: 'Science',
        coverage: 'Human systems revision, ecology, chemistry of air & water.',
      },
      {
        course: 'Social Studies',
        coverage: 'World map & continents, Africa regions, Uganda post-independence.',
      },
    ],
    'Term II': [
      {
        course: 'English',
        coverage: 'Functional writing, guided composition, oral & aural practice.',
      },
      {
        course: 'Mathematics',
        coverage: 'Algebra basics, commercial arithmetic, graphs, probability intro.',
      },
      {
        course: 'Science',
        coverage: 'Energy & machines, health & diseases, practical experiments.',
      },
      {
        course: 'Social Studies',
        coverage: 'Population & development, resources, international organisations.',
      },
    ],
    'Term III': [
      {
        course: 'English',
        coverage: 'Mock papers, error correction, speaking & listening exams.',
      },
      {
        course: 'Mathematics',
        coverage: 'Full syllabus revision, speed drills, mock PLE maths.',
      },
      {
        course: 'Science',
        coverage: 'Integrated science revision, project reports.',
      },
      {
        course: 'Social Studies',
        coverage: 'Civics & citizenship, map work mastery, mock papers.',
      },
    ],
  },
  'P.7': {
    'Term I': [
      {
        course: 'English',
        coverage:
          'PLE composition mastery, comprehension techniques, grammar & summary.',
      },
      {
        course: 'Mathematics',
        coverage:
          'Full primary maths: sets, number, geometry, commercial arith, graphs.',
      },
      {
        course: 'Science',
        coverage: 'Integrated science PLE syllabus — biology, physics, chemistry themes.',
      },
      {
        course: 'Social Studies',
        coverage: 'History, geography, civics of Uganda & East Africa — PLE focus.',
      },
    ],
    'Term II': [
      {
        course: 'English',
        coverage: 'Weekly mocks, guided marking, oral literature & debate.',
      },
      {
        course: 'Mathematics',
        coverage: 'Topic drills, past papers, weak-area clinics.',
      },
      {
        course: 'Science',
        coverage: 'Past-paper practicals & theory, diagrams practice.',
      },
      {
        course: 'Social Studies',
        coverage: 'Past papers, map tracing, current affairs for civics.',
      },
    ],
    'Term III': [
      {
        course: 'English',
        coverage: 'Final PLE revision, timed papers, exam rules & confidence.',
      },
      {
        course: 'Mathematics',
        coverage: 'Final PLE revision packs, formula sheet fluency.',
      },
      {
        course: 'Science',
        coverage: 'Final integrated science revision & diagram drills.',
      },
      {
        course: 'Social Studies',
        coverage: 'Final SST revision, map work, national symbols & governance.',
      },
    ],
  },
}

function statusTheme(status: string) {
  return status === 'Active' ? 'green' : 'gray'
}

/** Seed study-coverage rows for every Uganda class × term × subject block. */
export function seedStudyCoverageRows(): CatalogRow[] {
  const rows: CatalogRow[] = []
  let n = 1
  const classes = [...NURSERY_GRADES, ...PRIMARY_GRADES]

  for (const className of classes) {
    const byTerm = PLANS[className]
    if (!byTerm) continue
    const program = sectionForGrade(className)
    for (const term of TERMS) {
      for (const plan of byTerm[term]) {
        const id = `SC-${String(n).padStart(3, '0')}`
        n += 1
        rows.push({
          id,
          name: `${className} · ${term} · ${plan.course}`,
          status: 'Active',
          statusTheme: statusTheme('Active'),
          subtitle: plan.coverage,
          className,
          grade: className,
          term,
          course: plan.course,
          program,
          coverage: plan.coverage,
          weeks: plan.weeks ?? 12,
          academicYear: '2026',
        })
      }
    }
  }
  return rows
}
