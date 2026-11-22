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
        privacyCurrentStateText: "Codex Ignis es una web estática de consulta. En su estado actual no incorpora anuncios, analítica, formularios, cuentas de usuario ni tecnologías de seguimiento propias.",
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
        privacyCurrentStateText: "Codex Ignis is a static reference website. In its current state it does not include ads, analytics, forms, user accounts, or its own tracking technologies.",
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
        privacyCurrentStateText: "Codex Ignisは静的な参考用ウェブサイトです。現時点では、広告、アクセス解析、フォーム、ユーザーアカウント、独自のトラッキング技術は導入していません。",
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
