/**
 * The in-game ethics wheel: position and icon of every ethic, shared by the simulator's empire
 * tab (js/empire.js, through js/empire-data.js) and the ethics bingo (js/bingo-data.js, P24.3).
 * The ids are those of ETHIC_OPTIONS (js/empire-data.js); the name of each one is the i18n key
 * "ethic" + Id (js/i18n-empire-names.js).
 */

/**
 * The wheel as seen in the game (the wiki shows it in the same 5×5 grid): fanatic ethics on the
 * outer ring, moderate ones inside, every axis is a diameter through the centre and gestalt
 * consciousness is in the centre. [row, column] start at 1.
 */
export const ETHIC_WHEEL = {
  fanaticSpiritualist: [1, 1], fanaticMilitarist: [1, 3], fanaticXenophobe: [1, 5],
  spiritualist: [2, 2], militarist: [2, 3], xenophobe: [2, 4],
  fanaticAuthoritarian: [3, 1], authoritarian: [3, 2], gestaltConsciousness: [3, 3], egalitarian: [3, 4], fanaticEgalitarian: [3, 5],
  xenophile: [4, 2], pacifist: [4, 3], materialist: [4, 4],
  fanaticXenophile: [5, 1], fanaticPacifist: [5, 3], fanaticMaterialist: [5, 5]
};

/** Icon of every ethic (ethics/ folder of StellarisAssets; T2523: the icons of the 4.6.0 game files). */
export const ETHIC_ICONS = {
  xenophile: "ethics/Ethic_xenophile.png", fanaticXenophile: "ethics/Fanatic_xenophile.png",
  xenophobe: "ethics/Ethic_xenophobe.png", fanaticXenophobe: "ethics/Fanatic_xenophobe.png",
  militarist: "ethics/Ethic_militarist.png", fanaticMilitarist: "ethics/Fanatic_militarist.png",
  pacifist: "ethics/Ethic_pacifist.png", fanaticPacifist: "ethics/Fanatic_pacifist.png",
  materialist: "ethics/Ethic_materialist.png", fanaticMaterialist: "ethics/Fanatic_materialist.png",
  spiritualist: "ethics/Ethic_spiritualist.png", fanaticSpiritualist: "ethics/Fanatic_spiritualist.png",
  egalitarian: "ethics/Ethic_egalitarian.png", fanaticEgalitarian: "ethics/Fanatic_egalitarian.png",
  authoritarian: "ethics/Ethic_authoritarian.png", fanaticAuthoritarian: "ethics/Fanatic_authoritarian.png",
  gestaltConsciousness: "ethics/Gestalt_consciousness.png"
};
