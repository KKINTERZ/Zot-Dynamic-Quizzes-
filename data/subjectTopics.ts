
import { Subject } from '../types';

export const ZAMBIAN_LANGUAGES = [
  "Bemba", "Nyanja", "Tonga", "Lozi", "Kaonde", "Lunda", "Luvale"
];

export const LITERATURE_BOOKS = [
  // Novels (Prose) - African & Non-African
  "Novel: Things Fall Apart (Chinua Achebe)",
  "Novel: A Cowrie of Hope (Binwell Sinyangwe)",
  "Novel: The River Between (Ngugi wa Thiong'o)",
  "Novel: Quills of Desire (Binwell Sinyangwe)",
  "Novel: The Bones of the Ancestors",
  "Novel: Uneasy Yoke (K.A. Banda)",
  "Novel: Animal Farm (George Orwell)",
  "Novel: Jungle Pilot (Russell T. Hitt)",
  "Novel: Mission to Kala (Mongo Beti)",
  "Novel: The Concubine (Elechi Amadi)",
  "Novel: Mine Boy (Peter Abrahams)",
  "Novel: Weep Not, Child (Ngugi wa Thiong'o)",
  
  // Plays (Drama) - African, Non-African & Shakespeare
  "Play: The Lion and the Jewel (Wole Soyinka)",
  "Play: Kong's Harvest (Wole Soyinka)",
  "Play: Inheritance (David Mulwa)",
  "Play: The Government Inspector (Nikolai Gogol)",
  "Play: Betrayal in the City (Francis Imbuga)",
  "Play: A Raisin in the Sun (Lorraine Hansberry)",
  "Play: Macbeth (William Shakespeare)",
  "Play: Romeo and Juliet (William Shakespeare)",
  "Play: Julius Caesar (William Shakespeare)",
  "Play: Othello (William Shakespeare)"
];

export const SUBJECT_TOPICS: Record<Subject, string[]> = {
  [Subject.Mathematics]: [
    "Sets & Theory", "Index Notation", "Algebra & Equations", "Matrices", 
    "Similarity & Congruence", "Travel Graphs", "Social & Commercial Arithmetic", 
    "Statistics & Probability", "Geometry & Angles", "Trigonometry", 
    "Calculus (Diff/Int)", "Vectors", "Functions", "Earth Geometry", "Linear Programming"
  ],
  [Subject.Biology]: [
    "Living Organisms", "Cell Organization", "Enzymes", "Plant Nutrition", 
    "Animal Nutrition", "Respiratory System", "Transport in Plants/Animals", 
    "Excretion & Homeostasis", "Nervous System & Sense Organs", 
    "Skeletons & Locomotion", "Reproduction & Growth", "Genetics & Heredity", "Ecology"
  ],
  [Subject.Physics]: [
    "General Physics & Measurement", "Mechanics & Motion", "Energy, Work & Power", 
    "Thermal Physics", "Light & Reflection", "Sound & Waves", 
    "Magnetism", "Static & Current Electricity", "Atomic Physics", "Basic Electronics"
  ],
  [Subject.Chemistry]: [
    "Particulate Nature of Matter", "Experimental Techniques", "Atoms, Elements & Compounds", 
    "Stoichiometry & Mole Concept", "The Periodic Table", "Chemical Bonding", 
    "Acids, Bases & Salts", "Chemical Kinetics & Equilibrium", "Redox Reactions", 
    "Metals & Extraction", "Non-Metals", "Organic Chemistry"
  ],
  [Subject.Civics]: [
    "The Constitution", "Governance Systems", "Citizenship", "Human Rights", 
    "Corruption", "Cultural Studies", "Substance Abuse", "Family Law", 
    "Development Planning", "Global Issues & Poverty", "International Relations"
  ],
  [Subject.English]: [
    "Structure (Grammar)", "Comprehension", "Summary Writing", "Rewrites/Transformations", 
    "Vocabulary", "Idioms & Phrasal Verbs"
  ],
  [Subject.History]: [
    "Pre-Colonial History", "Migration of Bantu Speaking People", "European Exploration", 
    "Slave Trade", "Colonial Rule in Zambia", "Federation of Rhodesia & Nyasaland", 
    "Struggle for Independence", "Post-Independence Zambia", "World History (WWI/WWII)", 
    "The United Nations"
  ],
  [Subject.Geography]: [
    "Map Reading", "Physical Geography (Earth/Relief)", "Weather & Climate", 
    "Vegetation & Soil", "Population & Settlement", "Agriculture in Zambia", 
    "Forestry & Fishing", "Mining & Manufacturing", "Energy & Power", 
    "Transport & Communication", "Tourism"
  ],
  [Subject.ReligiousEducation]: [
    "Birth & Infancy of Jesus", "Ministry of Jesus", "Discipleship", 
    "Miracles of Jesus", "Parables & Teachings", "Death & Resurrection", 
    "The Early Church", "Christian Attitudes to Work/Leisure", "Marriage & Family", 
    "Authority & Leadership"
  ],
  [Subject.Commerce]: [
    "Production", "Trade (Home/International)", "Banking & Money", "Insurance", 
    "Transport", "Communication", "Advertising", "Warehousing", "Business Units"
  ],
  [Subject.Accounts]: [
    "Accounting Equation", "Double Entry System", "Books of Original Entry", 
    "The Ledger", "Trial Balance", "Financial Statements", "Adjustments", 
    "Partnerships", "Non-Profit Organizations"
  ],
  [Subject.ComputerStudies]: [
    "Computer Hardware", "Software", "Operating Systems", "Data Representation", 
    "Networks & Internet", "Computer Security & Ethics", "Word Processing", 
    "Spreadsheets", "Algorithms & Programming"
  ],
  [Subject.AgriculturalScience]: [
    "General Agriculture", "Soil Science", "Crop Production", "Livestock Production", 
    "Farm Machinery", "Farm Management"
  ],
  [Subject.Literature]: [
    // Theory & Fundamentals
    "Literary Terms & Figures of Speech",
    "Plot Structure & Narrative Techniques",
    "Characterization & Role Analysis",
    "Themes, Settings & Context",
    "Poetry: Analysis of Unseen Poems",
    "Poetry: Poetic Devices & Imagery",
    "Set Books (Novels & Plays)" // The "Folder" entry
  ],
  [Subject.AdditionalMathematics]: [
    "Functions", "Quadratic Equations", "Indices & Surds", "Polynomials", 
    "Simultaneous Equations", "Logarithms", "Coordinate Geometry", 
    "Circular Measure", "Trigonometry", "Permutations & Combinations", 
    "Calculus", "Kinematics"
  ],
  [Subject.IntegratedScience]: [
    "The Human Body", "Health & Disease", "The Environment", "Plants & Animals",
    "Materials & Matter", "Energy & Forces", "Electricity & Magnetism", "The Solar System"
  ],
  [Subject.SocialStudies]: [
    "Governance in Zambia", "Zambian History", "Physical Features of Zambia",
    "Weather & Climate", "Population", "Economic Activities", "Civic Duties",
    "Culture & Values", "Regional Cooperation"
  ],
  
  // New Subjects
  [Subject.CTS]: [
    "Safety in Work Environment", "Tools and Equipment", "Materials", 
    "Entrepreneurship", "Hygiene", "Technology in Daily Life", "Computer Basics", "Crafts"
  ],
  [Subject.HomeEconomics]: [
    "Personal Hygiene", "The Kitchen", "Food & Nutrition", "Textile & Clothing", 
    "Home Management", "Consumer Education", "Needlework", "Laundry"
  ],
  [Subject.BusinessStudies]: [
    "The Office", "Office Equipment", "Communication", "Filing & Indexing", 
    "Home & International Trade", "Money & Banking", "Entrepreneurship", "Transport"
  ],
  [Subject.DesignAndTechnology]: [
    "Health & Safety", "Tools", "Materials (Wood, Metal, Plastics)", 
    "Graphic Communication", "Design Process", "Structures", "Mechanisms", "Electronics"
  ],
  [Subject.ArtAndDesign]: [
    "Elements of Art", "Principles of Design", "Drawing & Painting", 
    "Graphic Design", "Lettering", "Fabric Design/Printing", "3D Construction", "Art History"
  ],
  [Subject.ZambianLanguages]: [
    "Comprehension", "Summary Writing", "Composition (Essay)", 
    "Translation", "Structure (Grammar)", "Proverbs & Idioms", "Culture & Tradition"
  ],
  [Subject.French]: [
    "Greetings & Introductions", "Family & Friends", "School & Education", 
    "Hobbies & Leisure", "Travel & Transport", "Food & Drink", "Health & Environment",
    "Grammar & Vocabulary", "Translation"
  ],
  [Subject.FoodAndNutrition]: [
    "Nutrients & Functions", "Diet & Meal Planning", "Digestion & Absorption", 
    "Cooking Methods", "Flour Mixtures", "Sauces", "Food Preservation", 
    "Kitchen Hygiene", "Consumer Studies"
  ],

  // Special Papers (Primary)
  [Subject.SpecialPaper1]: [
    "Verbal Reasoning", "Letter Series", "Analogies", "Odd One Out",
    "Word Formation", "Sentence Completion", "Coding and Decoding", "Logical Deduction"
  ],
  [Subject.SpecialPaper2]: [
    "Non-Verbal Reasoning", "Pattern Completion", "Figure Matrices", "Mirror Images",
    "Shape Construction", "Spatial Visualization", "Series Completion", "Geometric Shapes"
  ]
};
