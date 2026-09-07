/**
 * Diccionario de textos de interfaz y utilidades de idioma.
 *
 * Para añadir un idioma nuevo:
 * 1. Copia el bloque "en", tradúcelo y añade su código (ej. "fr") a SUPPORTED_LANGS.
 * 2. Opcionalmente, añade traducciones de contenido en content.js dentro de `i18n`.
 */

export const SUPPORTED_LANGS = ["es", "en", "jp"];
export const DEFAULT_LANG = "es";
const STORAGE_KEY = "codex-ignis-lang";

const strings = {
    es: {
        skipLink: "Saltar al archivo",
        onlineStatus: "EN LÍNEA",
        pageTitle: "Codex Ignis",
        introCopy: "Archivo de combate de Stellaris para el canal de YouTube <a href=\"https://www.youtube.com/@IgnisStellaris\" target=\"_blank\" rel=\"noopener noreferrer\">@IgnisStellaris</a>. Formando almirantes desde 2200.",
        indexHeading: "ÍNDICE",
        searchLabel: "Buscar registros",
        searchPlaceholder: "Buscar…",
        waitingRecords: "Esperando registros del archivo.",
        noRecordsToSearch: "No hay registros disponibles para buscar todavía.",
        noMatches: "No hay coincidencias.",
        matchesFound: (n) => `${n} registro(s) encontrado(s).`,
        noActiveEntriesIndex: "sin entradas activas",
        introPrompt: "<span class=\"prompt\"><span aria-hidden=\"true\">›</span> Terminal de conocimiento / Inicio</span>",
        statusInitialized: "ESTADO / INICIALIZADO",
        statusActive: "REGISTRO / ACTIVO",
        emptyGlyph: "[ 00 ]",
        readyTitle: "El archivo está listo.",
        welcomeHtml: `<br />
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
            Únete al canal de Discord de la comunidad <a href="https://discord.com/invite/PE2vGqxZpz" target="_blank" rel="noopener noreferrer">aquí</a>.`,
        footerText: "CODEX_IGNIS · volcando base de conocimiento",
        privacyLink: "Privacidad",
        cookiesLink: "Cookies",
        documentDescription: "Archivo de conocimiento personal de Stellaris centrado en combate y estrategia militar."
    },
    en: {
        skipLink: "Skip to the archive",
        onlineStatus: "ONLINE",
        pageTitle: "Codex Ignis",
        introCopy: "Stellaris combat archive for the <a href=\"https://www.youtube.com/@IgnisStellaris\" target=\"_blank\" rel=\"noopener noreferrer\">@IgnisStellaris</a> YouTube channel. Forming admirals since 2200.",
        indexHeading: "INDEX",
        searchLabel: "Search records",
        searchPlaceholder: "Search…",
        waitingRecords: "Waiting for archive records.",
        noRecordsToSearch: "There are no records to search yet.",
        noMatches: "No matches found.",
        matchesFound: (n) => `${n} record(s) found.`,
        noActiveEntriesIndex: "no active entries",
        introPrompt: "<span class=\"prompt\"><span aria-hidden=\"true\">›</span> Knowledge terminal / Home</span>",
        statusInitialized: "STATUS / INITIALIZED",
        statusActive: "RECORD / ACTIVE",
        emptyGlyph: "[ 00 ]",
        readyTitle: "The archive is ready.",
        welcomeHtml: `<br />
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
            Join the community Discord <a href="https://discord.com/invite/PE2vGqxZpz" target="_blank" rel="noopener noreferrer">here</a>.`,
        footerText: "CODEX_IGNIS · dumping the knowledge base",
        privacyLink: "Privacy",
        cookiesLink: "Cookies",
        documentDescription: "Personal Stellaris knowledge archive focused on combat and military strategy."
    },
    jp: {
        skipLink: "アーカイブへスキップ",
        onlineStatus: "オンライン",
        pageTitle: "Codex Ignis",
        introCopy: "YouTubeチャンネル <a href=\"https://www.youtube.com/@IgnisStellaris\" target=\"_blank\" rel=\"noopener noreferrer\">@IgnisStellaris</a> のStellaris戦闘アーカイブ。2200年から提督を育成。",
        indexHeading: "目次",
        searchLabel: "記録を検索",
        searchPlaceholder: "検索…",
        waitingRecords: "アーカイブの記録を待機中。",
        noRecordsToSearch: "検索できる記録はまだありません。",
        noMatches: "一致する項目はありません。",
        matchesFound: (n) => `${n}件の記録が見つかりました。`,
        noActiveEntriesIndex: "有効な項目なし",
        introPrompt: "<span class=\"prompt\"><span aria-hidden=\"true\">›</span> 知識ターミナル / ホーム</span>",
        statusInitialized: "ステータス / 初期化済み",
        statusActive: "記録 / アクティブ",
        emptyGlyph: "[ 00 ]",
        readyTitle: "アーカイブの準備が整いました。",
        welcomeHtml: `<br />
            Stellarisのニュース、ゲームプレイ、ガイド、豆知識をスペイン語でお届けするチャンネルです。<br />
            <br />
            毎週、開発日記を中心に取り上げており、週末にはシングルプレイや協力プレイの配信も行っています。たまに実績解除もやっています！<br />
            <br />
            YouTube <a href="https://www.youtube.com/@IgnisStellaris" target="_blank" rel="noopener noreferrer">@IgnisStellaris</a> と Twitch <a href="https://www.twitch.tv/ignisost" target="_blank" rel="noopener noreferrer">@IgnisOST</a> で配信しています。<br />
            <br />
            📅 配信スケジュール（金曜日・土曜日）<br />
            🇪🇸 スペイン 22:30<br />
            🇦🇷 アルゼンチン 18:30<br />
            🇨🇱 チリ 18:30<br />
            🇨🇴 コロンビア 16:30<br />
            🇵🇪 ペルー 16:30<br />
            🇲🇽 メキシコ 15:30<br />
            <br />
            コミュニティのDiscordサーバーには<a href="https://discord.com/invite/PE2vGqxZpz" target="_blank" rel="noopener noreferrer">こちら</a>から参加できます。`,
        footerText: "CODEX_IGNIS · 知識ベースをダンプ中",
        privacyLink: "プライバシー",
        cookiesLink: "Cookie",
        documentDescription: "戦闘と軍事戦略に特化したStellarisの個人向け知識アーカイブ。"
    },
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
