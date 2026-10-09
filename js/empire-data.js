/**
 * Datos de la pestaña "Imperio": autoridades (sistema de puntos de ética),
 * forma de gobierno (Authority) y requisitos de principios (Civics).
 *
 * Fuente: páginas de la Wiki "Government", "Civics", "Hive mind civics",
 * "Machine intelligence civics" y "Corporate civics" (aportadas por
 * Morteux). Los nombres, textos y requisitos de autoridad/forma de
 * gobierno/principios de este archivo vienen de ahí; no hay cifras de
 * juego inventadas.
 *
 * ── Simplificaciones deliberadas (para no inventar mecánicas no dadas) ──
 * - Autoridades: solo se modelan las autoridades base (Democrática,
 *   Oligárquica, Dictatorial, Imperial, Corporativa, Inteligencia de
 *   Máquina, Mente Colmena). Se omiten Inteligencia Mutualista (exige el
 *   origen Naturaleza Salvaje, no modelado en este simulador) y todas las
 *   autoridades de ascensión (exigen completar una situación de ascensión,
 *   tampoco modelada).
 * - Principios: un requisito de principio que hace referencia a un origen,
 *   a otro principio/DLC concreto NO se aplica aquí (no hay datos de
 *   orígenes ni de dependencias entre principios en este simulador); solo
 *   se aplican los requisitos de ética y de forma de gobierno, tal cual
 *   aparecen en la Wiki. Los principios de las páginas de Mente Colmena,
 *   Inteligencia de Máquina y Corporativos SÍ llevan su forma de gobierno
 *   requerida (lo dice el propio texto introductorio de cada página).
 * - No se modelan bonificaciones numéricas por ética individual: la Wiki
 *   aportada no incluye una página de Éticas dedicada, así que esta
 *   pantalla solo sirve para ELEGIR qué desbloqueas (autoridad y
 *   principios disponibles), no para calcular los efectos de cada ética.
 * - Un principio que no aparece en este archivo (CIVIC_REQUIREMENTS) no
 *   tiene requisito conocido y se considera siempre disponible.
 */

/** Presupuesto total de puntos para elegir autoridades (éticas). */
export const ETHICS_MAX_POINTS = 3;

/**
 * Cuatro ejes de autoridad; cada eje ofrece hasta 4 opciones mutuamente
 * excluyentes entre sí (normal/fanática de cada uno de los dos polos).
 * Elegir una opción de un eje no afecta a los demás ejes.
 */
export const ETHIC_AXES = [
  {
    id: "xenoAxis",
    options: [
      { id: "xenophile", i18nKey: "ethicXenophile", cost: 1 },
      { id: "fanaticXenophile", i18nKey: "ethicFanaticXenophile", cost: 2 },
      { id: "xenophobe", i18nKey: "ethicXenophobe", cost: 1 },
      { id: "fanaticXenophobe", i18nKey: "ethicFanaticXenophobe", cost: 2 }
    ]
  },
  {
    id: "warAxis",
    options: [
      { id: "pacifist", i18nKey: "ethicPacifist", cost: 1 },
      { id: "fanaticPacifist", i18nKey: "ethicFanaticPacifist", cost: 2 },
      { id: "militarist", i18nKey: "ethicMilitarist", cost: 1 },
      { id: "fanaticMilitarist", i18nKey: "ethicFanaticMilitarist", cost: 2 }
    ]
  },
  {
    id: "beliefAxis",
    options: [
      { id: "materialist", i18nKey: "ethicMaterialist", cost: 1 },
      { id: "fanaticMaterialist", i18nKey: "ethicFanaticMaterialist", cost: 2 },
      { id: "spiritualist", i18nKey: "ethicSpiritualist", cost: 1 },
      { id: "fanaticSpiritualist", i18nKey: "ethicFanaticSpiritualist", cost: 2 }
    ]
  },
  {
    id: "powerAxis",
    options: [
      { id: "egalitarian", i18nKey: "ethicEgalitarian", cost: 1 },
      { id: "fanaticEgalitarian", i18nKey: "ethicFanaticEgalitarian", cost: 2 },
      { id: "authoritarian", i18nKey: "ethicAuthoritarian", cost: 1 },
      { id: "fanaticAuthoritarian", i18nKey: "ethicFanaticAuthoritarian", cost: 2 }
    ]
  }
];

/**
 * Consciencia gestalt: opción especial que sustituye por completo a los 4
 * ejes anteriores (no se puede combinar con ninguna otra ética) y consume
 * de golpe todo el presupuesto de puntos.
 */
export const GESTALT_CONSCIOUSNESS = { id: "gestaltConsciousness", i18nKey: "ethicGestaltConsciousness", cost: 3 };

/** Todas las opciones de ética (los 16 polos + consciencia gestalt), indexadas por id. */
export const ETHIC_OPTIONS = Object.fromEntries(
  [...ETHIC_AXES.flatMap((axis) => axis.options), GESTALT_CONSCIOUSNESS].map((option) => [option.id, option])
);

/** id de la ética "fanática" -> id de su versión base equivalente, para que un requisito de la base también lo cumpla la fanática. */
const FANATIC_OF = {
  fanaticXenophile: "xenophile",
  fanaticXenophobe: "xenophobe",
  fanaticMilitarist: "militarist",
  fanaticPacifist: "pacifist",
  fanaticMaterialist: "materialist",
  fanaticSpiritualist: "spiritualist",
  fanaticEgalitarian: "egalitarian",
  fanaticAuthoritarian: "authoritarian"
};

/** ¿La ética seleccionada `selectedEthicId` cumple el requisito `requiredEthicId`? (la fanática también cumple el requisito de su base). */
export function ethicSatisfies(selectedEthicId, requiredEthicId) {
  if (!selectedEthicId) return false;
  if (selectedEthicId === requiredEthicId) return true;
  return FANATIC_OF[selectedEthicId] === requiredEthicId;
}

/** ¿Alguna de las éticas actualmente seleccionadas (Set/array de ids) cumple `requiredEthicId`? */
export function ethicsSatisfy(selectedEthicIds, requiredEthicId) {
  for (const id of selectedEthicIds) {
    if (ethicSatisfies(id, requiredEthicId)) return true;
  }
  return false;
}

/**
 * Autoridades (Authority), según la tabla de autoridades individualistas /
 * gestalt de la Wiki (página Government). IMPORTANTE: la columna
 * "Requirements" de la Wiki marca casi todos los requisitos como
 * EXCLUSIONES (icono "No"): p. ej. la democrática exige NO ser
 * autoritario, no "ser autoritario". excludesEthics: la autoridad queda
 * bloqueada si hay seleccionada CUALQUIERA de esas éticas (una ética base
 * también bloquea su versión fanática; una fanática solo se bloquea a sí
 * misma). gestalt: true → solo con Consciencia gestalt; el resto de
 * autoridades exigen NO ser gestalt (lo dice la página de Éticas).
 * Cuadra con la página de Éticas: Autoritario fanático "debe usar
 * autoridad autocrática" (= solo quedan Dictatorial/Imperial) e
 * Igualitario fanático "debe usar democrática".
 */
export const AUTHORITIES = [
  { id: "democratic", i18nKey: "authorityDemocratic", blurbI18nKey: "authorityDemocraticBlurb", img: "authorities/Auth_democratic.png", gestalt: false, excludesEthics: ["authoritarian"] },
  { id: "oligarchic", i18nKey: "authorityOligarchic", blurbI18nKey: "authorityOligarchicBlurb", img: "authorities/Auth_oligarchic.png", gestalt: false, excludesEthics: ["fanaticAuthoritarian", "fanaticEgalitarian"] },
  { id: "dictatorial", i18nKey: "authorityDictatorial", blurbI18nKey: "authorityDictatorialBlurb", img: "authorities/Auth_dictatorial.png", gestalt: false, excludesEthics: ["egalitarian"] },
  { id: "imperial", i18nKey: "authorityImperial", blurbI18nKey: "authorityImperialBlurb", img: "authorities/Auth_imperial.png", gestalt: false, excludesEthics: ["egalitarian"] },
  { id: "corporate", i18nKey: "authorityCorporate", blurbI18nKey: "authorityCorporateBlurb", img: "authorities/Auth_corporate.png", gestalt: false, excludesEthics: ["fanaticAuthoritarian", "fanaticEgalitarian"] },
  { id: "machineIntelligence", i18nKey: "authorityMachineIntelligence", blurbI18nKey: "authorityMachineIntelligenceBlurb", img: "authorities/Auth_machine_intelligence.png", gestalt: true, excludesEthics: [] },
  { id: "hiveMind", i18nKey: "authorityHiveMind", blurbI18nKey: "authorityHiveMindBlurb", img: "authorities/Auth_hive_mind.png", gestalt: true, excludesEthics: [] }
];

/** ¿Hay un conjunto de éticas válido? La página de Éticas exige gastar los 3 puntos (3 moderadas, 1 fanática + 1 moderada, o gestalt). */
export function ethicsComplete(selectedEthicIds) {
  let total = 0;
  for (const id of selectedEthicIds) total += (ETHIC_OPTIONS[id]?.cost || 0);
  return total === ETHICS_MAX_POINTS;
}

/** ¿La autoridad está desbloqueada con las éticas actualmente seleccionadas? */
export function authorityAvailable(authority, selectedEthicIds) {
  if (!ethicsComplete(selectedEthicIds)) return false;
  const isGestalt = ethicsSatisfy(selectedEthicIds, GESTALT_CONSCIOUSNESS.id);
  if (authority.gestalt !== isGestalt) return false;
  return !authority.excludesEthics.some((id) => ethicsSatisfy(selectedEthicIds, id));
}

/** Éticas seleccionadas que bloquean una autoridad (para explicar el bloqueo al usuario). */
export function blockingEthics(authority, selectedEthicIds) {
  return authority.excludesEthics.filter((id) => ethicsSatisfy(selectedEthicIds, id));
}

/**
 * Principios: la Wiki confirma "Each empire starts with up to two civics",
 * con un tercero disponible al investigar Galactic Administration. Este
 * simulador asume toda la investigación desbloqueada (a petición de
 * Morteux), así que se permiten 3 desde el principio; en partida real ese
 * tercer hueco es especial porque solo se desbloquea al avanzar (no es un
 * hueco inicial), algo que este simulador no distingue.
 */
export const MAX_CIVICS = 3;

/**
 * Requisitos de principios (Civics), indexados por el mismo i18nKey que ya
 * usa el catálogo de principios del bingo (js/bingo-data.js /
 * js/i18n.js). Cada principio es una lista de grupos que se exigen TODOS
 * a la vez (Y lógico entre grupos); dentro de un grupo basta con UNA de
 * las éticas o UNA de las autoridades listadas (O lógico). "exclude:true"
 * invierte el grupo: el principio exige NO tener ninguna de esas éticas o
 * autoridades. Un principio que no aparece aquí no tiene requisito
 * conocido (siempre disponible).
 */
export const CIVIC_REQUIREMENTS = {
  principleAgrarianIdyll: [{ exclude: false, ethics: ["pacifist", "fanaticPacifist"], authorities: [] }],
  principleAristocraticElite: [{ exclude: false, ethics: [], authorities: ["oligarchic", "imperial"] }, { exclude: true, ethics: ["egalitarian", "fanaticEgalitarian"], authorities: [] }],
  principleAscensionists: [{ exclude: false, ethics: ["spiritualist", "fanaticSpiritualist"], authorities: [] }],
  principleBeaconOfLiberty: [{ exclude: false, ethics: [], authorities: ["democratic"] }, { exclude: false, ethics: ["egalitarian", "fanaticEgalitarian"], authorities: [] }, { exclude: true, ethics: ["xenophobe", "fanaticXenophobe"], authorities: [] }],
  principleBrandLoyalty: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principleCitizenService: [{ exclude: false, ethics: [], authorities: ["democratic", "oligarchic"] }, { exclude: false, ethics: ["militarist", "fanaticMilitarist"], authorities: [] }, { exclude: true, ethics: ["fanaticXenophile"], authorities: [] }],
  principleCorporateDeathCult: [{ exclude: false, ethics: [], authorities: ["corporate"] }, { exclude: false, ethics: ["spiritualist", "fanaticSpiritualist"], authorities: [] }],
  principleCorporateDominion: [{ exclude: false, ethics: [], authorities: ["oligarchic"] }, { exclude: true, ethics: ["xenophobe", "fanaticXenophobe"], authorities: [] }],
  principleCorporateHedonism: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principleCorveeSystem: [{ exclude: true, ethics: ["egalitarian", "fanaticEgalitarian"], authorities: [] }],
  principleCrusaderSpirit: [{ exclude: false, ethics: ["authoritarian", "fanaticAuthoritarian", "spiritualist", "fanaticSpiritualist", "militarist", "fanaticMilitarist"], authorities: [] }, { exclude: false, ethics: ["authoritarian", "fanaticAuthoritarian"], authorities: [] }, { exclude: false, ethics: ["spiritualist", "fanaticSpiritualist"], authorities: [] }, { exclude: false, ethics: ["militarist", "fanaticMilitarist"], authorities: [] }, { exclude: true, ethics: ["pacifist", "fanaticPacifist"], authorities: [] }],
  principleDeathCult: [{ exclude: false, ethics: ["spiritualist", "fanaticSpiritualist"], authorities: [] }],
  principleDimensionalWorship: [{ exclude: false, ethics: ["spiritualist", "fanaticSpiritualist"], authorities: [] }],
  principleDividedAttention: [{ exclude: false, ethics: [], authorities: ["hiveMind"] }],
  principleEmpath: [{ exclude: false, ethics: [], authorities: ["hiveMind"] }],
  principleEntropyDrinkers: [{ exclude: true, ethics: ["egalitarian", "fanaticEgalitarian"], authorities: [] }],
  principleExaltedPriesthood: [{ exclude: false, ethics: [], authorities: ["oligarchic", "dictatorial"] }, { exclude: false, ethics: ["spiritualist", "fanaticSpiritualist"], authorities: [] }],
  principleFranchising: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principleFreeHaven: [{ exclude: false, ethics: ["xenophile", "fanaticXenophile"], authorities: [] }],
  principleFreeTraders: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principleGospelOfTheMasses: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principleHiredGuns: [{ exclude: false, ethics: ["militarist", "fanaticMilitarist"], authorities: [] }],
  principleHiveAscetic: [{ exclude: false, ethics: [], authorities: ["hiveMind"] }],
  principleHiveCordycepticDrones: [{ exclude: false, ethics: [], authorities: ["hiveMind"] }],
  principleHiveOneMind: [{ exclude: false, ethics: [], authorities: ["hiveMind"] }],
  principleHivePooledKnowledge: [{ exclude: false, ethics: [], authorities: ["hiveMind"] }],
  principleImperialCult: [{ exclude: false, ethics: [], authorities: ["imperial"] }, { exclude: false, ethics: ["authoritarian", "fanaticAuthoritarian"], authorities: [] }, { exclude: false, ethics: ["spiritualist", "fanaticSpiritualist"], authorities: [] }],
  principleIndenturedAssets: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principleIndividualMachinePredictiveAnalysis: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleIndividualMachineReplication: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleIndividualMachineWarbots: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineBuiltToLast: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineDelegatedFunctions: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineDiplomaticProtocols: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineIntrospective: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineMaintenanceProtocols: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineOtaUpdates: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineRockbreakers: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineSovereignCircuits: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineStalwartNetwork: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineUnitaryCohesion: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineWarbots: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMachineZeroWasteProtocols: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleMediaConglomerate: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principleMemorialist: [{ exclude: false, ethics: [], authorities: ["machineIntelligence"] }],
  principleNationalisticZeal: [{ exclude: false, ethics: ["militarist", "fanaticMilitarist"], authorities: [] }],
  principleNaturalNeuralNetwork: [{ exclude: false, ethics: [], authorities: ["hiveMind"] }],
  principleNavalContractors: [{ exclude: false, ethics: [], authorities: ["corporate"] }, { exclude: false, ethics: ["militarist", "fanaticMilitarist"], authorities: [] }],
  principleParliamentarySystem: [{ exclude: false, ethics: [], authorities: ["democratic"] }],
  principlePermanentEmployment: [{ exclude: false, ethics: [], authorities: ["corporate"] }, { exclude: true, ethics: ["egalitarian", "fanaticEgalitarian"], authorities: [] }],
  principlePoliceState: [{ exclude: true, ethics: ["fanaticEgalitarian"], authorities: [] }],
  principlePompousPurists: [{ exclude: false, ethics: ["xenophobe", "fanaticXenophobe"], authorities: [] }],
  principlePrivateMilitaryCompanies: [{ exclude: false, ethics: [], authorities: ["corporate"] }, { exclude: false, ethics: ["militarist", "fanaticMilitarist"], authorities: [] }],
  principlePrivateProspectors: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principlePrivatizedExploration: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principlePublicRelationsSpecialists: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principleRelentlessIndustrialists: [{ exclude: false, ethics: ["materialist", "fanaticMaterialist"], authorities: [] }],
  principleRuthlessCompetition: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principleSelectiveKinship: [{ exclude: true, ethics: ["xenophile", "fanaticXenophile"], authorities: [] }, { exclude: true, ethics: ["fanaticEgalitarian"], authorities: [] }],
  principleShadowCouncil: [{ exclude: false, ethics: [], authorities: ["democratic", "oligarchic", "dictatorial"] }],
  principleSharedBurdens: [{ exclude: false, ethics: ["fanaticEgalitarian"], authorities: [] }, { exclude: true, ethics: ["xenophobe", "fanaticXenophobe"], authorities: [] }],
  principleSlaverGuilds: [{ exclude: false, ethics: ["authoritarian", "fanaticAuthoritarian"], authorities: [] }],
  principleStrengthOfLegions: [{ exclude: false, ethics: [], authorities: ["hiveMind"] }],
  principleSubspaceEphapse: [{ exclude: false, ethics: [], authorities: ["hiveMind"] }],
  principleSubsumedWill: [{ exclude: false, ethics: [], authorities: ["hiveMind"] }],
  principleTechnocracy: [{ exclude: false, ethics: ["materialist", "fanaticMaterialist"], authorities: [] }],
  principleTradingPosts: [{ exclude: false, ethics: [], authorities: ["corporate"] }],
  principleVoidHive: [{ exclude: false, ethics: [], authorities: ["hiveMind"] }],
  principleWorkerCoop: [{ exclude: false, ethics: [], authorities: ["corporate"] }, { exclude: false, ethics: ["egalitarian", "fanaticEgalitarian"], authorities: [] }, { exclude: true, ethics: ["xenophobe", "fanaticXenophobe"], authorities: [] }]
};

/** ¿Está disponible el principio `i18nKey` con las éticas y la autoridad actuales? (authorityId puede ser null si aún no se ha elegido). */
export function civicAvailable(i18nKey, selectedEthicIds, authorityId) {
  const groups = CIVIC_REQUIREMENTS[i18nKey];
  if (!groups) return true;
  return groups.every((group) => {
    const anyMatch = group.ethics.some((id) => ethicsSatisfy(selectedEthicIds, id))
      || (authorityId != null && group.authorities.includes(authorityId));
    return group.exclude ? !anyMatch : anyMatch;
  });
}

/**
 * Rueda de éticas tal y como se ve en el juego (la Wiki la muestra con la
 * misma cuadrícula de 5×5): fanáticas en el anillo exterior, moderadas en
 * el interior, cada eje es un diámetro que pasa por el centro y la
 * consciencia gestalt ocupa el centro. [fila, columna] empiezan en 1.
 */
export const ETHIC_WHEEL = {
  fanaticSpiritualist: [1, 1], fanaticMilitarist: [1, 3], fanaticXenophobe: [1, 5],
  spiritualist: [2, 2], militarist: [2, 3], xenophobe: [2, 4],
  fanaticAuthoritarian: [3, 1], authoritarian: [3, 2], gestaltConsciousness: [3, 3], egalitarian: [3, 4], fanaticEgalitarian: [3, 5],
  xenophile: [4, 2], pacifist: [4, 3], materialist: [4, 4],
  fanaticXenophile: [5, 1], fanaticPacifist: [5, 3], fanaticMaterialist: [5, 5]
};

/** Icono de cada ética (carpeta ethics/ de StellarisAssets). */
export const ETHIC_ICONS = {
  xenophile: "ethics/Xenophile.png", fanaticXenophile: "ethics/Fanatic_xenophile.png",
  xenophobe: "ethics/Xenophobe.png", fanaticXenophobe: "ethics/Fanatic_xenophobe.png",
  militarist: "ethics/Militarist.png", fanaticMilitarist: "ethics/Fanatic_militarist.png",
  pacifist: "ethics/Pacifist.png", fanaticPacifist: "ethics/Fanatic_pacifist.png",
  materialist: "ethics/Materialist.png", fanaticMaterialist: "ethics/Fanatic_materialist.png",
  spiritualist: "ethics/Spiritualist.png", fanaticSpiritualist: "ethics/Fanatic_spiritualist.png",
  egalitarian: "ethics/Egalitarian.png", fanaticEgalitarian: "ethics/Fanatic_egalitarian.png",
  authoritarian: "ethics/Authoritarian.png", fanaticAuthoritarian: "ethics/Fanatic_authoritarian.png",
  gestaltConsciousness: "ethics/Gestalt_consciousness.png"
};

/**
 * Efectos numéricos de cada ética y autoridad (Wiki: páginas Ethics y
 * Government, columna "Empire effects"). Cada efecto: { label (clave de
 * etiqueta, ver effectLabel* en i18n.js), value, unit: "percent" | "flat",
 * apply? }. Solo los efectos con "apply" se aplican a los cálculos del
 * planeta; el resto se muestran como información (no hay estadística
 * equivalente en este simulador, o falta algún dato — ver nota abajo):
 *  - { type: "resourceMult", resource } multiplica la producción POSITIVA
 *    de ese recurso (p. ej. "+10% Monthly unity").
 *  - { type: "resourceFlat", resource } suma una cantidad fija mensual.
 * Sin aplicar a propósito: "Worker/Specialist job efficiency" (falta saber
 * qué empleos son de obreros y cuáles de especialistas: la Wiki de
 * designaciones/éticas no lo dice), "Research speed" (es velocidad de
 * investigación de tecnologías, no producción de recursos), y todo lo que
 * depende de estadísticas que el simulador no rastrea (estabilidad, tamaño
 * de imperio, facciones, edictos, flota, enviados...). Se omiten los
 * efectos solo para nómadas/arca.
 */
const pct = (label, value, apply) => ({ label, value, unit: "percent", ...(apply ? { apply } : {}) });
const flat = (label, value, apply) => ({ label, value, unit: "flat", ...(apply ? { apply } : {}) });
const UNITY_MULT = { type: "resourceMult", resource: "unity" };
const TRADE_MULT = { type: "resourceMult", resource: "trade" };
const INFLUENCE_FLAT = { type: "resourceFlat", resource: "influence" };

export const ETHIC_EFFECTS = {
  fanaticSpiritualist: [pct("monthlyUnity", 0.2, UNITY_MULT), pct("edictCost", -0.2), pct("edictUpkeep", -0.2)],
  spiritualist: [pct("monthlyUnity", 0.1, UNITY_MULT), pct("edictCost", -0.1), pct("edictUpkeep", -0.1)],
  fanaticMilitarist: [pct("shipFireRate", 0.2), pct("claimInfluenceCost", -0.2)],
  militarist: [pct("shipFireRate", 0.1), pct("claimInfluenceCost", -0.1)],
  fanaticXenophobe: [pct("popGrowthOrAssembly", 0.2), pct("starbaseInfluenceCost", -0.4), pct("refugeeAttraction", -0.3)],
  xenophobe: [pct("popGrowthOrAssembly", 0.1), pct("starbaseInfluenceCost", -0.2), pct("refugeeAttraction", -0.15)],
  fanaticAuthoritarian: [flat("monthlyInfluence", 1, INFLUENCE_FLAT), pct("workerJobEfficiency", 0.1)],
  authoritarian: [flat("monthlyInfluence", 0.5, INFLUENCE_FLAT), pct("workerJobEfficiency", 0.05)],
  fanaticEgalitarian: [pct("factionResourceOutput", 0.3), pct("specialistJobEfficiency", 0.1)],
  egalitarian: [pct("factionResourceOutput", 0.15), pct("specialistJobEfficiency", 0.05)],
  fanaticXenophile: [pct("tradeFromJobs", 0.2, TRADE_MULT), flat("availableEnvoys", 2), pct("refugeeAttraction", 0.3), pct("observationInsights", 1)],
  xenophile: [pct("tradeFromJobs", 0.1, TRADE_MULT), flat("availableEnvoys", 1), pct("refugeeAttraction", 0.15), pct("observationInsights", 0.5)],
  fanaticPacifist: [pct("empireSizeFromPops", -0.2), flat("stability", 10)],
  pacifist: [pct("empireSizeFromPops", -0.1), flat("stability", 5)],
  fanaticMaterialist: [pct("robotUpkeep", -0.2), pct("researchSpeed", 0.1)],
  materialist: [pct("robotUpkeep", -0.1), pct("researchSpeed", 0.05)],
  gestaltConsciousness: [pct("warExhaustionGain", -0.2), flat("monthlyInfluence", 1, INFLUENCE_FLAT), flat("encryption", 2)]
};

export const AUTHORITY_EFFECTS = {
  democratic: [pct("factionApproval", 0.1), flat("recruitableLeaders", 1)],
  oligarchic: [flat("councilorSkill", 2)],
  dictatorial: [pct("rulerExperience", 0.25), flat("recruitableLeaders", -1)],
  imperial: [pct("capitalSystemResources", 0.1), flat("recruitableLeaders", -1)],
  corporate: [flat("availableEnvoys", 1), pct("tradeFromJobsAndContracts", 0.1, TRADE_MULT), pct("empireSizeFromPlanets", 0.5)],
  machineIntelligence: [pct("colonyDevelopmentSpeed", 0.25), pct("miningStationResources", 0.1), flat("mechanicalPopAssembly", 1)],
  hiveMind: [pct("popGrowthSpeed", 0.25), pct("empireSizeEffect", -0.25)]
};

/** Efectos aplicables a los cálculos: devuelve { resourceMult: {recurso: fracción}, resourceFlat: {recurso: cantidad} } para las éticas y la autoridad dadas. */
export function collectAppliedEffects(selectedEthicIds, authorityId) {
  const resourceMult = {};
  const resourceFlat = {};
  const effectLists = [...selectedEthicIds.map((id) => ETHIC_EFFECTS[id] || []), AUTHORITY_EFFECTS[authorityId] || []];
  effectLists.forEach((list) => list.forEach((effect) => {
    if (!effect.apply) return;
    const bucket = effect.apply.type === "resourceMult" ? resourceMult : resourceFlat;
    bucket[effect.apply.resource] = (bucket[effect.apply.resource] || 0) + effect.value;
  }));
  return { resourceMult, resourceFlat };
}
