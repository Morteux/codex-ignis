/**
 * Interface texts of the wiki (index.html), es/en/jp.
 * Imported by the page scripts that need it; importing it registers the texts in js/i18n.js.
 */

import { addStrings } from "./i18n.js";

export const strings = {
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
        imageMissing: (alt) => `Imagen no disponible: ${alt}`,
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
        documentDescription: "Archivo de conocimiento personal de Stellaris centrado en combate y estrategia militar.",
        a11yOnlineStatus: "Sistema en línea",
        a11yArchiveExplorer: "Explorador del archivo",
        a11yKnowledgeNav: "Navegación de conocimiento",
        a11yEntryCount: "Número de entradas",
        a11yAdSlot: "Espacio publicitario reservado",
        a11yLegalNav: "Información legal",
        a11yCloseImage: "Cerrar imagen",
        a11yImageViewer: "Visor de imágenes",
        a11yZoomImage: "Ampliar imagen",
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
        imageMissing: (alt) => `Image not available: ${alt}`,
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
        documentDescription: "Personal Stellaris knowledge archive focused on combat and military strategy.",
        a11yOnlineStatus: "System online",
        a11yArchiveExplorer: "Archive explorer",
        a11yKnowledgeNav: "Knowledge navigation",
        a11yEntryCount: "Number of entries",
        a11yAdSlot: "Reserved advertising space",
        a11yLegalNav: "Legal information",
        a11yCloseImage: "Close image",
        a11yImageViewer: "Image viewer",
        a11yZoomImage: "Enlarge image",
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
        imageMissing: (alt) => `画像を表示できません：${alt}`,
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
        documentDescription: "戦闘と軍事戦略に特化したStellarisの個人向け知識アーカイブ。",
        a11yOnlineStatus: "システム稼働中",
        a11yArchiveExplorer: "アーカイブ・エクスプローラー",
        a11yKnowledgeNav: "ナレッジナビゲーション",
        a11yEntryCount: "エントリー数",
        a11yAdSlot: "広告用の予約スペース",
        a11yLegalNav: "法的情報",
        a11yCloseImage: "画像を閉じる",
        a11yImageViewer: "画像ビューアー",
        a11yZoomImage: "画像を拡大",
    },
};

addStrings(strings);
