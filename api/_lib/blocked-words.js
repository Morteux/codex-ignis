/**
 * Word filter of the hall of fame names (TESTELLARIS_GDD.md §7.3), server side only.
 *
 * PROPOSAL (T4302): a first list of insults and slurs in es/en/jp written by Claude, to be
 * reviewed by the owner (DECISIONS_TO_REVIEW.md). Both lists are compared in folded form (see
 * `fold`: accents, spaces, look-alike characters and the kana form removed).
 *
 * - BLOCKED_ANYWHERE: rejected wherever they appear in the name.
 * - BLOCKED_ALONE: rejected only as a whole word of the name, or as the whole name, because they
 *   are also part of ordinary names ("shit" in Yamashita, "dick" in Dickens, "cono" in icono).
 */

export const BLOCKED_ANYWHERE = [
    // en
    "fuck", "cunt", "bitch", "nigger", "nigga", "faggot", "retard", "whore", "slut", "rapist", "nazi", "hitler",
    "pussy", "asshole", "wank", "twat", "porn", "kkk",
    // es
    "puta", "puto", "mierda", "polla", "joder", "cabron", "maricon", "marica", "gilipollas", "pendejo", "verga",
    "zorra", "culero", "follar", "chocho", "subnormal", "retrasado", "negrata", "sudaca", "panchito",
    // jp
    "ちんこ", "ちんぽ", "まんこ", "ころす", "殺す", "死ね", "きちがい", "気違い", "がいじ", "糞", "にがー", "れいぷ",
    "せっくす", "めくら", "つんぼ",
];

export const BLOCKED_ALONE = [
    "shit", "dick", "cock", "rape", "fuk", "fag", "cum", "tits", "penis", "anus",
    "cono", "culo", "mamon", "pene", "teta", "tetas", "mongolo",
    "しね", "くそ", "ちょん", "ばか", "あほ",
];

/** Look-alike characters folded to the Latin letter they imitate (digits as in leetspeak, Cyrillic, Greek). */
const LOOK_ALIKES = {
    0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 6: "g", 7: "t", 8: "b", 9: "g",
    а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x", і: "i", ј: "j", ѕ: "s",
    α: "a", β: "b", ε: "e", η: "n", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x",
};

/**
 * Folded form of a text: NFKC (full-width and half-width forms), lower case, accents and kana
 * voicing marks removed, look-alikes replaced, katakana as hiragana, and only letters left.
 */
export function fold(text) {
    const plain = String(text).normalize("NFKC").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    return [...plain]
        .map((char) => LOOK_ALIKES[char] ?? char)
        .map((char) => (char >= "ァ" && char <= "ヶ" ? String.fromCharCode(char.charCodeAt(0) - 0x60) : char))
        .join("")
        .replace(/[^\p{L}ー]/gu, "");
}

const ANYWHERE = BLOCKED_ANYWHERE.map(fold);
const ALONE = new Set(BLOCKED_ALONE.map(fold));

export function isBlockedName(name) {
    const whole = fold(name);
    if (ANYWHERE.some((word) => whole.includes(word))) return true;
    return ALONE.has(whole) || String(name).split(/[\s._-]+/u).some((word) => ALONE.has(fold(word)));
}
