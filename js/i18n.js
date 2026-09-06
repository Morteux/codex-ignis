/**
 * Diccionario de textos de interfaz y utilidades de idioma.
 *
 * Para añadir un idioma nuevo:
 * 1. Copia el bloque "en", tradúcelo y añade su código (ej. "fr") a SUPPORTED_LANGS.
 * 2. Opcionalmente, añade traducciones de contenido en content.js dentro de `i18n`.
 */

export const SUPPORTED_LANGS = ["es", "en"];
export const DEFAULT_LANG = "es";
const STORAGE_KEY = "codex-ignis-lang";

const strings = {
  es: {
    skipLink: "Saltar al archivo",
    onlineStatus: "EN LÍNEA",
    introPrompt: "Terminal de conocimiento / Inicio",
    pageTitle: "Codex Ignis",
    introCopy: "Archivo de combate de Stellaris para el canal de YouTube @IgnisStellaris",
    indexHeading: "ÍNDICE",
    searchLabel: "Buscar registros",
    searchPlaceholder: "Buscar cuando haya entradas…",
    waitingRecords: "Esperando registros del archivo.",
    noRecordsToSearch: "No hay registros disponibles para buscar todavía.",
    noMatches: "No hay coincidencias.",
    matchesFound: (n) => `${n} registro(s) encontrado(s).`,
    noActiveEntriesIndex: "sin entradas activas",
    sectorLabel: "SECTOR / STELLARIS",
    statusInitialized: "ESTADO / INICIALIZADO",
    statusActive: "REGISTRO / ACTIVO",
    emptyGlyph: "[ 00 ]",
    readyTitle: "El archivo está listo.",
    welcomeHtml: `
      <br />
      Canal dedicado a subir noticias, gameplay, guías y curiosidades sobre Stellaris en español.<br />
      <br />
      Suelo cubrir los diarios de desarrollo cada semana y hago directos los fines de semana con partidas de un jugador y cooperativas. ¡También cazo logros de vez en cuando!<br />
      <br />
      Hago directos en YouTube <a href="https://www.youtube.com/@IgnisStellaris" target="_blank" rel="noopener noreferrer">@IgnisStellaris</a> y en Twitch <a href="https://www.twitch.tv/ignisost" target="_blank" rel="noopener noreferrer">@IgnisOST</a><br />
      <br />
      📅 Horario de directo (viernes y sábado)<br />
      🇪🇸 España 22:30<br />
      🇦🇷 Argentina 18:30<br />
      🇨🇱 Chile 18:30<br />
      🇨🇴 Colombia 16:30<br />
      🇵🇪 Perú 16:30<br />
      🇲🇽 México 15:30<br />
      <br />
      Únete al canal de Discord de la comunidad <a href="https://discord.com/invite/PE2vGqxZpz" target="_blank" rel="noopener noreferrer">aquí</a>.
    `,
    footerText: "CODEX_IGNIS · volcando base de conocimiento",
    privacyLink: "Privacidad",
    cookiesLink: "Cookies",
    documentDescription: "Archivo de conocimiento personal de Stellaris centrado en combate y estrategia militar."
  },
  en: {
    skipLink: "Skip to the archive",
    onlineStatus: "ONLINE",
    introPrompt: "Knowledge terminal / Home",
    pageTitle: "Codex Ignis",
    introCopy: "Stellaris combat archive for the @IgnisStellaris YouTube channel",
    indexHeading: "INDEX",
    searchLabel: "Search records",
    searchPlaceholder: "Search once entries are available…",
    waitingRecords: "Waiting for archive records.",
    noRecordsToSearch: "There are no records to search yet.",
    noMatches: "No matches found.",
    matchesFound: (n) => `${n} record(s) found.`,
    noActiveEntriesIndex: "no active entries",
    sectorLabel: "SECTOR / STELLARIS",
    statusInitialized: "STATUS / INITIALIZED",
    statusActive: "RECORD / ACTIVE",
    emptyGlyph: "[ 00 ]",
    readyTitle: "The archive is ready.",
    welcomeHtml: `
      <br />
      Channel dedicated to Stellaris news, gameplay, guides and trivia, in Spanish.<br />
      <br />
      I usually cover the weekly dev diaries and stream on weekends with singleplayer and co-op runs. I also hunt achievements from time to time!<br />
      <br />
      I stream on YouTube <a href="https://www.youtube.com/@IgnisStellaris" target="_blank" rel="noopener noreferrer">@IgnisStellaris</a> and Twitch <a href="https://www.twitch.tv/ignisost" target="_blank" rel="noopener noreferrer">@IgnisOST</a><br />
      <br />
      📅 Stream schedule (Friday and Saturday)<br />
      🇪🇸 Spain 22:30<br />
      🇦🇷 Argentina 18:30<br />
      🇨🇱 Chile 18:30<br />
      🇨🇴 Colombia 16:30<br />
      🇵🇪 Peru 16:30<br />
      🇲🇽 Mexico 15:30<br />
      <br />
      Join the community Discord <a href="https://discord.com/invite/PE2vGqxZpz" target="_blank" rel="noopener noreferrer">here</a>.
    `,
    footerText: "CODEX_IGNIS · dumping the knowledge base",
    privacyLink: "Privacy",
    cookiesLink: "Cookies",
    documentDescription: "Personal Stellaris knowledge archive focused on combat and military strategy."
  }
};

export function getStoredLang() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  } catch (error) {
    // localStorage no disponible (modo privado, etc.): se ignora.
  }
  return null;
}

export function storeLang(lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch (error) {
    // Ignorar si no se puede persistir.
  }
}

export function detectInitialLang() {
  const stored = getStoredLang();
  if (stored) return stored;
  const browserLang = (navigator.language || "").slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG;
}

export function t(lang, key) {
  const dict = strings[lang] || strings[DEFAULT_LANG];
  return dict[key] ?? strings[DEFAULT_LANG][key];
}
