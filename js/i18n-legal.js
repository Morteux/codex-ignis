/**
 * Interface texts of the legal pages and the 404 (privacy.html, cookies.html, 404.html), es/en/jp.
 * Imported by the page scripts that need it; importing it registers the texts in js/i18n.js.
 */

import { addStrings } from "./i18n.js";

export const strings = {
    es: {

        // Comunes a privacy.html, cookies.html y 404.html
        informationalDocLabel: "Documento informativo",
        error404Label: "Error 404",
        currentStateHeading: "Estado actual",
        futureAdsHeading: "Publicidad futura",

        // privacy.html
        privacyPageTitle: "Privacidad · Codex Ignis",
        privacyMetaDescription: "Política de privacidad del Codex Ignis.",
        privacyHeading: "Privacidad",
        lastUpdatedNotice: "Última actualización: 6 de septiembre de 2026.",
        privacyLastUpdatedNotice: "Última actualización: 25 de noviembre de 2026.",
        privacyCurrentStateText: "Codex Ignis es una web estática de consulta. En su estado actual no incorpora anuncios, analítica, cuentas de usuario ni tecnologías de seguimiento propias. El único formulario que envía datos a un servidor es el del nombre en el salón de la fama de Testellaris, descrito más abajo.",
        privacyHofHeading: "Salón de la fama de Testellaris",
        privacyHofIntroText: "El juego Testellaris tiene un top 10 compartido por todos los jugadores, sin cuentas de usuario. Consultarlo no guarda ningún dato en la base de datos. Tu puntuación solo se envía cuando, al terminar una partida que entra en el top 10, escribes un nombre y lo guardas.",
        privacyHofEntryText: "De cada entrada se guardan: el nombre que escribas, la puntuación, la fecha, el nivel alcanzado, las preguntas respondidas, las respuestas correctas (en total y por nivel), los DLC marcados y la versión del juego. El nombre, la puntuación y los datos de la partida son públicos para quien visite la página, así que no uses como nombre ningún dato personal. La entrada se conserva mientras siga en el top 10 y se borra cuando sale de él.",
        privacyHofRateText: "Para limitar los envíos abusivos, cada intento de guardar una puntuación, se acepte o no, registra un hash con sal de tu dirección IP junto con la hora. Ese registro se borra automáticamente a las 24 horas. La base de datos no guarda la dirección IP en claro.",
        privacyHofHostingText: "El servidor del salón de la fama funciona en Vercel y los datos se guardan en una base de datos MongoDB Atlas. Cada proveedor aplica sus propias condiciones y políticas de privacidad.",
        privacyHofRemovalText: "Para pedir que se borre tu entrada, utiliza el canal de contacto indicado al final de esta página.",
        privacyBrowserStorageHeading: "Datos guardados en tu navegador",
        privacyBrowserStorageText: "El idioma, los imperios y planetas del simulador, las preferencias del árbol de tecnologías y de Testellaris y, si el salón de la fama no está disponible, un top 10 local se guardan en el almacenamiento local de tu navegador. Puedes borrarlos desde la configuración del navegador.",
        privacyFutureAdsText: "La publicidad de Google AdSense está desactivada. Antes de activarla, esta política se actualizará para explicar el tratamiento de datos, las cookies y tecnologías que puedan utilizar Google y otros proveedores publicitarios. Cuando corresponda, se ofrecerá un mecanismo de consentimiento conforme a la normativa aplicable.",
        privacyExternalLinksHeading: "Enlaces externos",
        privacyExternalLinksText: "Esta web puede incluir enlaces a servicios externos en el futuro. Cada servicio aplica sus propias condiciones y políticas de privacidad.",
        privacyThirdPartyContentHeading: "Contenido de terceros",
        privacyThirdPartyContentText: "Este sitio utiliza contenido del videojuego Stellaris, publicado por Paradox Interactive, incluidos archivos propios del juego. Al tratarse de un aviso legal, se mantiene en su idioma e ortografía originales:",
        privacyParadoxNotice: "Use is made of content from Stellaris, published by Paradox Interactive, including their game files. The copyright to such content is held by Paradox Interactive AB or its subsidiary Paradox Development Studio. The following notice applies to such material. Copyright © 2014 Paradox Interactive AB.",
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
        notFoundMetaDescription: "La coordenada solicitada no existe en este codex.",
        notFoundBackLink: "Volver al inicio",
    },
    en: {

        // Shared by privacy.html, cookies.html and 404.html
        informationalDocLabel: "Informational document",
        error404Label: "Error 404",
        currentStateHeading: "Current status",
        futureAdsHeading: "Future advertising",

        // privacy.html
        privacyPageTitle: "Privacy · Codex Ignis",
        privacyMetaDescription: "Codex Ignis privacy policy.",
        privacyHeading: "Privacy",
        lastUpdatedNotice: "Last updated: September 6, 2026.",
        privacyLastUpdatedNotice: "Last updated: November 25, 2026.",
        privacyCurrentStateText: "Codex Ignis is a static reference website. In its current state it does not include ads, analytics, user accounts, or its own tracking technologies. The only form that sends data to a server is the name field of the Testellaris hall of fame, described below.",
        privacyHofHeading: "Testellaris hall of fame",
        privacyHofIntroText: "The Testellaris game has a top 10 shared by all players, without user accounts. Viewing it stores nothing in the database. Your score is sent only when, after a game that enters the top 10, you type a name and save it.",
        privacyHofEntryText: "Each entry stores: the name you type, the score, the date, the tier reached, the questions answered, the correct answers (in total and per tier), the DLCs checked and the game version. The name, the score and the game details are public to anyone visiting the page, so do not use any personal data as your name. The entry is kept while it stays in the top 10 and is deleted when it drops out.",
        privacyHofRateText: "To limit abusive submissions, every attempt to save a score, accepted or not, records a salted hash of your IP address together with the time. That record is deleted automatically after 24 hours. The database does not store the IP address itself.",
        privacyHofHostingText: "The hall of fame server runs on Vercel and the data is stored in a MongoDB Atlas database. Each provider applies its own terms and privacy policies.",
        privacyHofRemovalText: "To ask for your entry to be deleted, use the contact channel given at the end of this page.",
        privacyBrowserStorageHeading: "Data stored in your browser",
        privacyBrowserStorageText: "The language, the empires and planets of the simulator, the preferences of the tech tree and of Testellaris and, if the hall of fame is unavailable, a local top 10 are kept in your browser's local storage. You can delete them in your browser settings.",
        privacyFutureAdsText: "Google AdSense advertising is currently disabled. Before it is enabled, this policy will be updated to explain the data handling, cookies, and technologies that Google and other advertising providers may use. Where applicable, a consent mechanism compliant with the relevant regulations will be provided.",
        privacyExternalLinksHeading: "External links",
        privacyExternalLinksText: "This website may include links to external services in the future. Each service applies its own terms and privacy policies.",
        privacyThirdPartyContentHeading: "Third-party content",
        privacyThirdPartyContentText: "This site uses content from the video game Stellaris, published by Paradox Interactive, including their game files. As a legal notice, it is kept in its original wording:",
        privacyParadoxNotice: "Use is made of content from Stellaris, published by Paradox Interactive, including their game files. The copyright to such content is held by Paradox Interactive AB or its subsidiary Paradox Development Studio. The following notice applies to such material. Copyright © 2014 Paradox Interactive AB.",
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
        notFoundMetaDescription: "The requested coordinate does not exist in this codex.",
        notFoundBackLink: "Back to home",
    },
    jp: {

        // privacy.html、cookies.html、404.html共通
        informationalDocLabel: "案内ページ",
        error404Label: "Error 404",
        currentStateHeading: "現在の状況",
        futureAdsHeading: "今後の広告",

        // privacy.html
        privacyPageTitle: "プライバシー · Codex Ignis",
        privacyMetaDescription: "Codex Ignisのプライバシーポリシー。",
        privacyHeading: "プライバシー",
        lastUpdatedNotice: "最終更新日:2026年9月6日。",
        privacyLastUpdatedNotice: "最終更新日:2026年11月25日。",
        privacyCurrentStateText: "Codex Ignisは静的な参考用ウェブサイトです。現時点では、広告、アクセス解析、ユーザーアカウント、独自のトラッキング技術は導入していません。サーバーにデータを送信する入力欄は、下記のTestellaris殿堂入りランキングの名前欄のみです。",
        privacyHofHeading: "Testellarisの殿堂入りランキング",
        privacyHofIntroText: "ゲーム「Testellaris」には、全プレイヤー共通のトップ10があります。ユーザーアカウントはありません。ランキングを閲覧しても、データベースには何も保存されません。スコアが送信されるのは、トップ10に入るゲームの終了後に、名前を入力して保存した場合のみです。",
        privacyHofEntryText: "各エントリーには、入力した名前、スコア、日付、到達したレベル、回答した問題数、正解数（合計とレベル別）、選択したDLC、ゲームのバージョンが保存されます。名前、スコア、ゲームの詳細はページを訪れた誰にでも公開されるため、名前に個人情報を使わないでください。エントリーはトップ10に残っている間のみ保存され、圏外になると削除されます。",
        privacyHofRateText: "不正な連続送信を防ぐため、スコアの保存を試みるたびに（受理の有無を問わず）、IPアドレスのソルト付きハッシュと時刻を記録します。この記録は24時間後に自動的に削除されます。IPアドレスそのものはデータベースに保存しません。",
        privacyHofHostingText: "殿堂入りランキングのサーバーはVercel上で動作し、データはMongoDB Atlasのデータベースに保存されます。各事業者にはそれぞれ独自の利用規約とプライバシーポリシーが適用されます。",
        privacyHofRemovalText: "エントリーの削除を希望する場合は、本ページ末尾に記載の連絡先をご利用ください。",
        privacyBrowserStorageHeading: "ブラウザに保存されるデータ",
        privacyBrowserStorageText: "表示言語、シミュレーターの帝国と惑星、技術ツリーとTestellarisの設定、および殿堂入りランキングが利用できない場合のローカルのトップ10は、ブラウザのローカルストレージに保存されます。これらはブラウザの設定から削除できます。",
        privacyFutureAdsText: "Google AdSense広告は現在無効になっています。有効化する前に、Googleおよびその他の広告プロバイダーが使用する可能性のあるデータの取り扱い、Cookie、技術について本ポリシーを更新します。該当する場合は、適用される法令に準拠した同意取得の仕組みを導入します。",
        privacyExternalLinksHeading: "外部リンク",
        privacyExternalLinksText: "本サイトでは今後、外部サービスへのリンクを掲載する場合があります。各サービスにはそれぞれ独自の利用規約とプライバシーポリシーが適用されます。",
        privacyThirdPartyContentHeading: "サードパーティ コンテンツについて",
        privacyThirdPartyContentText: "本サイトでは、Paradox Interactiveが発売したビデオゲーム『Stellaris』のコンテンツ（ゲームファイルを含む）を使用しています。法的な通知文のため、原文のまま掲載します:",
        privacyParadoxNotice: "Use is made of content from Stellaris, published by Paradox Interactive, including their game files. The copyright to such content is held by Paradox Interactive AB or its subsidiary Paradox Development Studio. The following notice applies to such material. Copyright © 2014 Paradox Interactive AB.",
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
        notFoundMetaDescription: "指定された座標はこのコデックスに存在しません。",
        notFoundBackLink: "ホームに戻る",
    },
};

addStrings(strings);
