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
        documentDescription: "Archivo de conocimiento personal de Stellaris centrado en combate y estrategia militar.",

        // Comunes a privacy.html, cookies.html y 404.html
        informationalDocLabel: "Documento informativo",
        backToCodexLink: "Volver al codex",
        error404Label: "Error 404",
        currentStateHeading: "Estado actual",
        futureAdsHeading: "Publicidad futura",

        // privacy.html
        privacyPageTitle: "Privacidad · Codex Ignis",
        privacyMetaDescription: "Política de privacidad del Codex Ignis.",
        privacyHeading: "Privacidad",
        lastUpdatedNotice: "Última actualización: 6 de septiembre de 2026.",
        privacyCurrentStateText: "Codex Ignis es una web estática de consulta. En su estado actual no incorpora anuncios, analítica, formularios, cuentas de usuario ni tecnologías de seguimiento propias.",
        privacyFutureAdsText: "La publicidad de Google AdSense está desactivada. Antes de activarla, esta política se actualizará para explicar el tratamiento de datos, las cookies y tecnologías que puedan utilizar Google y otros proveedores publicitarios. Cuando corresponda, se ofrecerá un mecanismo de consentimiento conforme a la normativa aplicable.",
        privacyExternalLinksHeading: "Enlaces externos",
        privacyExternalLinksText: "Esta web puede incluir enlaces a servicios externos en el futuro. Cada servicio aplica sus propias condiciones y políticas de privacidad.",
        privacyContactHeading: "Contacto",
        privacyContactText: "Para consultas sobre esta política, utiliza el canal de contacto que se publique junto con el proyecto.",

        // cookies.html
        cookiesPageTitle: "Cookies · Codex Ignis",
        cookiesMetaDescription: "Política de cookies del Codex Ignis.",
        cookiesHeading: "Cookies",
        cookiesCurrentStateText: "La versión actual de Codex Ignis no instala cookies propias ni carga servicios publicitarios o analíticos de terceros.",
        cookiesFutureAdsText: "Si se activa Google AdSense, Google y sus socios pueden utilizar cookies u otros identificadores para mostrar y medir anuncios. Antes de esa activación se actualizará esta página y, cuando sea necesario, se mostrará una plataforma de gestión del consentimiento.",
        cookiesMoreInfoHeading: "Más información",
        cookiesMoreInfoText: "Puedes consultar cómo Google utiliza los datos cuando usas sitios o aplicaciones de sus socios en <a href=\"https://business.safety.google/privacy/\" rel=\"noopener noreferrer\">la información de privacidad de Google</a>.",

        // 404.html
        notFoundPageTitle: "Registro no encontrado · Codex Ignis",
        notFoundHeading: "Registro no encontrado.",
        notFoundText: "La coordenada solicitada no existe en este codex.",
        notFoundBackLink: "Volver al inicio"
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
        documentDescription: "Personal Stellaris knowledge archive focused on combat and military strategy.",

        // Shared by privacy.html, cookies.html and 404.html
        informationalDocLabel: "Informational document",
        backToCodexLink: "Back to the codex",
        error404Label: "Error 404",
        currentStateHeading: "Current status",
        futureAdsHeading: "Future advertising",

        // privacy.html
        privacyPageTitle: "Privacy · Codex Ignis",
        privacyMetaDescription: "Codex Ignis privacy policy.",
        privacyHeading: "Privacy",
        lastUpdatedNotice: "Last updated: September 6, 2026.",
        privacyCurrentStateText: "Codex Ignis is a static reference website. In its current state it does not include ads, analytics, forms, user accounts, or its own tracking technologies.",
        privacyFutureAdsText: "Google AdSense advertising is currently disabled. Before it is enabled, this policy will be updated to explain the data handling, cookies, and technologies that Google and other advertising providers may use. Where applicable, a consent mechanism compliant with the relevant regulations will be provided.",
        privacyExternalLinksHeading: "External links",
        privacyExternalLinksText: "This website may include links to external services in the future. Each service applies its own terms and privacy policies.",
        privacyContactHeading: "Contact",
        privacyContactText: "For questions about this policy, use the contact channel published alongside the project.",

        // cookies.html
        cookiesPageTitle: "Cookies · Codex Ignis",
        cookiesMetaDescription: "Codex Ignis cookie policy.",
        cookiesHeading: "Cookies",
        cookiesCurrentStateText: "The current version of Codex Ignis does not set any first-party cookies or load third-party advertising or analytics services.",
        cookiesFutureAdsText: "If Google AdSense is enabled, Google and its partners may use cookies or other identifiers to serve and measure ads. Before that happens, this page will be updated and, when necessary, a consent management platform will be shown.",
        cookiesMoreInfoHeading: "More information",
        cookiesMoreInfoText: "You can review how Google uses data when you use its partners' sites or apps in <a href=\"https://business.safety.google/privacy/\" rel=\"noopener noreferrer\">Google's privacy information</a>.",

        // 404.html
        notFoundPageTitle: "Record not found · Codex Ignis",
        notFoundHeading: "Record not found.",
        notFoundText: "The requested coordinate does not exist in this codex.",
        notFoundBackLink: "Back to home"
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
        documentDescription: "戦闘と軍事戦略に特化したStellarisの個人向け知識アーカイブ。",

        // privacy.html、cookies.html、404.html共通
        informationalDocLabel: "案内ページ",
        backToCodexLink: "コデックスに戻る",
        error404Label: "Error 404",
        currentStateHeading: "現在の状況",
        futureAdsHeading: "今後の広告",

        // privacy.html
        privacyPageTitle: "プライバシー · Codex Ignis",
        privacyMetaDescription: "Codex Ignisのプライバシーポリシー。",
        privacyHeading: "プライバシー",
        lastUpdatedNotice: "最終更新日:2026年9月6日。",
        privacyCurrentStateText: "Codex Ignisは静的な参考用ウェブサイトです。現時点では、広告、アクセス解析、フォーム、ユーザーアカウント、独自のトラッキング技術は導入していません。",
        privacyFutureAdsText: "Google AdSense広告は現在無効になっています。有効化する前に、Googleおよびその他の広告プロバイダーが使用する可能性のあるデータの取り扱い、Cookie、技術について本ポリシーを更新します。該当する場合は、適用される法令に準拠した同意取得の仕組みを導入します。",
        privacyExternalLinksHeading: "外部リンク",
        privacyExternalLinksText: "本サイトでは今後、外部サービスへのリンクを掲載する場合があります。各サービスにはそれぞれ独自の利用規約とプライバシーポリシーが適用されます。",
        privacyContactHeading: "お問い合わせ",
        privacyContactText: "本ポリシーに関するご質問は、本プロジェクトとともに公開される連絡先までお問い合わせください。",

        // cookies.html
        cookiesPageTitle: "クッキー · Codex Ignis",
        cookiesMetaDescription: "Codex IgnisのCookieポリシー。",
        cookiesHeading: "クッキー",
        cookiesCurrentStateText: "現在のCodex Ignisは、独自のCookieを設置しておらず、第三者による広告・アクセス解析サービスも読み込んでいません。",
        cookiesFutureAdsText: "Google AdSenseを有効化した場合、Googleおよびそのパートナーは、広告の配信や効果測定のためにCookieやその他の識別子を使用することがあります。有効化する前にこのページを更新し、必要に応じて同意管理プラットフォーム(CMP)を表示します。",
        cookiesMoreInfoHeading: "詳細情報",
        cookiesMoreInfoText: "Googleのパートナーが提供するサイトやアプリをご利用の際にGoogleがデータをどのように使用するかについては、<a href=\"https://business.safety.google/privacy/\" rel=\"noopener noreferrer\">Googleのプライバシー情報</a>をご覧ください。",

        // 404.html
        notFoundPageTitle: "記録が見つかりません · Codex Ignis",
        notFoundHeading: "記録が見つかりません。",
        notFoundText: "指定された座標はこのコデックスに存在しません。",
        notFoundBackLink: "ホームに戻る"
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
