// Spanish names for the movements the catalog only knows in English.
//
// Why this file exists: the illustrated catalog is English-only, and the app is
// used in Spanish — "Sentadilla" and "Squat" share no letters, so no amount of
// fuzzy matching connects them. This is a translation problem, and a hand-written
// table is the only honest solution to it.
//
// Rules for anything added here:
//
//   * Exact names only, never fragments. "curl" alone matches eighteen
//     movements in the catalog and would confidently pick the wrong one; only
//     names that identify a single movement belong here.
//
//   * When a name is genuinely ambiguous, leave it out. "Remo" is a barbell row
//     to one user and the cardio machine to another, and guessing wrong shows
//     someone a rowing erg where they logged back work. An exercise with no
//     illustration is a smaller failure than an exercise with the wrong one.
//
//   * Keys are matched after normalisation (lowercased, accents and punctuation
//     folded), so "PRESS DE BANCA", "press de banca" and "Press De Banca" all
//     resolve through the same entry. Write keys in plain lowercase.
//
// Coverage is deliberately limited to the lifts people actually log. It is not
// meant to reach all 302 movements — the picker in the create form handles the
// long tail, and anything unmatched simply renders without an illustration.

export const GUIDE_SLUG_BY_SPANISH_NAME = {
  // Chest
  'press de banca': 'bench-press',
  'press banca': 'bench-press',
  'press plano': 'bench-press',
  'press de banca plano': 'bench-press',
  'press inclinado': 'incline-bench-press',
  'press de banca inclinado': 'incline-bench-press',
  'press inclinado con mancuernas': 'incline-dumbbell-press',
  'press declinado': 'decline-bench-press',
  'press de banca declinado': 'decline-bench-press',
  'press con mancuernas': 'dumbbell-bench-press',
  'press de pecho en maquina': 'machine-chest-press',
  'aperturas': 'dumbbell-fly',
  'aperturas con mancuernas': 'dumbbell-fly',
  'aperturas en polea': 'cable-fly',
  'cruces en polea': 'cable-fly',
  'peck deck': 'pec-deck',
  'contractora': 'pec-deck',
  'flexiones': 'push-up',
  'flexiones de brazos': 'push-up',
  'lagartijas': 'push-up',

  // Back
  'dominadas': 'pull-up',
  'dominada': 'pull-up',
  'dominadas supinas': 'chin-up',
  'jalon al pecho': 'lat-pulldown',
  'jalon': 'lat-pulldown',
  'polea al pecho': 'lat-pulldown',
  'remo con barra': 'barbell-row',
  'remo con mancuerna': 'one-arm-dumbbell-row',
  'remo con mancuernas': 'dumbbell-bent-over-row',
  'remo sentado': 'seated-row',
  'remo en polea': 'seated-row',
  'remo en maquina': 'machine-row',
  'remo t': 't-bar-row',
  'encogimientos': 'shrug',
  'encogimientos con barra': 'shrug',
  'encogimientos con mancuernas': 'dumbbell-shrug',
  'hiperextensiones': 'back-extension',
  'extensiones de espalda': 'back-extension',

  // Shoulders
  'press militar': 'overhead-press',
  'press de hombros': 'overhead-press',
  'press sobre la cabeza': 'overhead-press',
  'press de hombros con mancuernas': 'seated-dumbbell-press',
  'press arnold': 'arnold-press',
  'elevaciones laterales': 'lateral-raise',
  'vuelos laterales': 'lateral-raise',
  'elevaciones frontales': 'front-raise',
  'vuelos posteriores': 'rear-delt-fly',
  'pajaro': 'rear-delt-fly',
  'remo al menton': 'upright-row',

  // Arms
  'curl de biceps': 'bicep-curl',
  'curl de biceps con mancuernas': 'bicep-curl',
  'curl martillo': 'hammer-curl',
  'curl predicador': 'preacher-curl',
  'curl en banco scott': 'preacher-curl',
  'curl en polea': 'cable-curl',
  'extension de triceps': 'tricep-pushdown',
  'triceps en polea': 'tricep-pushdown',
  'press frances': 'skull-crusher',
  'rompecraneos': 'skull-crusher',
  'fondos': 'dip',
  'fondos en paralelas': 'dip',
  'curl de muneca': 'wrist-curl',

  // Legs
  'sentadilla': 'squat',
  'sentadillas': 'squat',
  'sentadilla con barra': 'squat',
  'sentadilla frontal': 'front-squat',
  'sentadilla bulgara': 'bulgarian-split-squat',
  'sentadilla goblet': 'goblet-squat',
  'prensa': 'leg-press',
  'prensa de piernas': 'leg-press',
  'peso muerto': 'deadlift',
  'peso muerto rumano': 'romanian-deadlift',
  'peso muerto sumo': 'sumo-deadlift',
  'extension de cuadriceps': 'leg-extension',
  'extensiones de cuadriceps': 'leg-extension',
  'camilla de cuadriceps': 'leg-extension',
  'curl femoral': 'leg-curl',
  'curl de femoral': 'leg-curl',
  'camilla femoral': 'leg-curl',
  'zancadas': 'walking-lunge',
  'estocadas': 'forward-lunge',
  'buenos dias': 'good-morning',
  'elevacion de talones': 'standing-calf-raise',
  'elevaciones de talones': 'standing-calf-raise',
  'gemelos': 'standing-calf-raise',
  'gemelos sentado': 'seated-calf-raise',
  'pantorrillas': 'standing-calf-raise',
  'abductores': 'hip-abduction-machine',
  'aductores': 'hip-adduction-machine',

  // Glutes
  'empuje de cadera': 'hip-thrust',
  'puente de gluteos': 'glute-bridge',
  'patada de gluteo': 'cable-kickback',

  // Core
  'plancha': 'plank',
  'plancha lateral': 'side-plank',
  'abdominales': 'crunch',
  'crunch abdominal': 'crunch',
  'giro ruso': 'russian-twist',
  'russian twist': 'russian-twist',
  'escaladores': 'mountain-climber',
  'elevacion de piernas colgado': 'hanging-leg-raise',
  'rueda abdominal': 'ab-wheel',

  // Full body / conditioning
  'burpees': 'burpee',
  'balanceo con pesa rusa': 'kettlebell-swing',
  'salto a la cuerda': 'jump-rope',
  'soga': 'jump-rope',
  'correr': 'running',
  'trotar': 'running',
  'caminar': 'walking',
  'bicicleta': 'cycling',
  'eliptico': 'elliptical',
};
