/**
 * Interface texts of the bingo (bingo.html), es/en/jp.
 * Imported by the page scripts that need it; importing it registers the texts in js/i18n.js.
 */

import { addStrings } from "./i18n.js";

export const strings = {
    es: {

        // bingo.html
        bingoPageTitle: "Bingo · Codex Ignis",
        bingoMetaDescription: "Bingo de orígenes de Stellaris.",
        bingoHeading: "Bingo",
        bingoInstructions: "Haz clic en una casilla para marcarla como conseguida.",
        bingoDownloadButton: "Descargar como imagen",
        bingoDownloadError: "No se pudo generar la imagen. Inténtalo de nuevo.",
        bingoTypeLabel: "Tipo de bingo",
        bingoTypeOrigins: "Orígenes",
        bingoTypePrinciples: "Principios",
        bingoTypeEmpty: "Este bingo todavía no tiene casillas. Vuelve pronto.",
        // Draft descriptions (P24.1), pending review
        bingoOriginsDescription: "Marca los orígenes con los que ya has jugado una partida.",
        bingoPrinciplesDescription: "Marca los principios que ya has usado en algún imperio.",
        a11yBingoGrid: "Casillas del bingo",
    },
    en: {

        // bingo.html
        bingoPageTitle: "Bingo · Codex Ignis",
        bingoMetaDescription: "Stellaris origins bingo.",
        bingoHeading: "Bingo",
        bingoInstructions: "Click a tile to mark it as obtained.",
        bingoDownloadButton: "Download as image",
        bingoDownloadError: "The image could not be generated. Please try again.",
        bingoTypeLabel: "Bingo type",
        bingoTypeOrigins: "Origins",
        bingoTypePrinciples: "Civics",
        bingoTypeEmpty: "This bingo has no tiles yet. Check back soon.",
        // Draft descriptions (P24.1), pending review
        bingoOriginsDescription: "Mark the origins you have already played a game with.",
        bingoPrinciplesDescription: "Mark the civics you have already used in an empire.",
        a11yBingoGrid: "Bingo squares",
    },
    jp: {

        // bingo.html
        bingoPageTitle: "ビンゴ · Codex Ignis",
        bingoMetaDescription: "Stellarisの起源ビンゴ。",
        bingoHeading: "ビンゴ",
        bingoInstructions: "マス目をクリックすると、達成済みとしてマークされます。",
        bingoDownloadButton: "画像としてダウンロード",
        bingoDownloadError: "画像を生成できませんでした。もう一度お試しください。",
        bingoTypeLabel: "ビンゴの種類",
        bingoTypeOrigins: "起源",
        bingoTypePrinciples: "国是",
        bingoTypeEmpty: "このビンゴにはまだマスがありません。またお越しください。",
        // Draft descriptions (P24.1), pending review
        bingoOriginsDescription: "これまでにプレイしたことのある起源をマークしましょう。",
        bingoPrinciplesDescription: "これまでに帝国で使ったことのある国是をマークしましょう。",
        a11yBingoGrid: "ビンゴのマス",
    },
};

addStrings(strings);
