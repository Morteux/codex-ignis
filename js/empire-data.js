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
 * Formas de gobierno (Authority), según la tabla de autoridades
 * individualistas/gestalt de la Wiki (página Government).
 * requiresEthicsAnyOf: basta con tener seleccionada UNA de estas éticas.
 */
export const AUTHORITIES = [
  {
    id: "democratic",
    i18nKey: "authorityDemocratic",
    blurbI18nKey: "authorityDemocraticBlurb",
    requiresEthicsAnyOf: ["authoritarian"]
  },
  {
    id: "oligarchic",
    i18nKey: "authorityOligarchic",
    blurbI18nKey: "authorityOligarchicBlurb",
    requiresEthicsAnyOf: ["fanaticAuthoritarian", "fanaticEgalitarian"]
  },
  {
    id: "dictatorial",
    i18nKey: "authorityDictatorial",
    blurbI18nKey: "authorityDictatorialBlurb",
    requiresEthicsAnyOf: ["egalitarian"]
  },
  {
    id: "imperial",
    i18nKey: "authorityImperial",
    blurbI18nKey: "authorityImperialBlurb",
    requiresEthicsAnyOf: ["egalitarian"]
  },
  {
    id: "corporate",
    i18nKey: "authorityCorporate",
    blurbI18nKey: "authorityCorporateBlurb",
    requiresEthicsAnyOf: ["fanaticAuthoritarian", "fanaticEgalitarian"]
  },
  {
    id: "machineIntelligence",
    i18nKey: "authorityMachineIntelligence",
    blurbI18nKey: "authorityMachineIntelligenceBlurb",
    requiresEthicsAnyOf: ["gestaltConsciousness"]
  },
  {
    id: "hiveMind",
    i18nKey: "authorityHiveMind",
    blurbI18nKey: "authorityHiveMindBlurb",
    requiresEthicsAnyOf: ["gestaltConsciousness"]
  }
];

/** ¿La autoridad está desbloqueada con las éticas actualmente seleccionadas? */
export function authorityAvailable(authority, selectedEthicIds) {
  return authority.requiresEthicsAnyOf.some((id) => ethicsSatisfy(selectedEthicIds, id));
}

/**
 * Principios de partida: la Wiki confirma "Each empire starts with up to
 * two civics" (un tercero requiere investigar Galactic Administration,
 * tecnología no modelada en este simulador).
 */
export const MAX_CIVICS = 2;

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
