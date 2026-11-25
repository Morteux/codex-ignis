/**
 * Testellaris hall of fame on the server (TESTELLARIS_GDD.md §7.2): the request handler without
 * the database, so the tests can run it with the in-memory store of `memory-store.js`.
 *
 *   GET  /api/hall-of-fame?ruleset=<rulesetId>  → 200 { rulesetId, entries: [top 10] }
 *   POST /api/hall-of-fame  { name, score, maxTier, answered, correct, dlcs, rulesetId }
 *        → 201 { saved: true, entry, entries } when the score enters the top 10 (the date is set
 *          here), 200 { saved: false, entries } when it does not; only the top 10 is kept.
 *
 * Errors: 400 { error } for a bad request (codes of `entry-rules.js`), 405 for another method,
 * 413 for a body over 1 KB, 429 { error: "rate" } over the rate limit, 503 { error: "unavailable" }
 * when the database cannot be reached (the game then uses its local top 10).
 *
 * Rate limit (GDD §7.3): at most RATE_LIMIT POSTs per RATE_WINDOW_MS per client, valid or not,
 * keyed by a salted SHA-256 of the IP address; the raw IP is never stored and the store drops
 * the hashes after 24 hours.
 *
 * A store is { top(rulesetId, limit), insert(entry), trim(rulesetId, limit),
 * hit(key, since, at) → hits of `key` after `since` before this one (recorded at `at`) } (all
 * async). `createHandler({ store, salt })` takes the store or an async function that returns it
 * (null when there is no database), and the salt or a function that returns it.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { TOP_SIZE, qualifies } from "../../js/testellaris-scores.js";
import { validateEntry } from "./entry-rules.js";

/** Ruleset ids as the bank folders name them (`stellaris-pc-4.5.4`); also keeps paths inside data/. */
export const RULESET_PATTERN = /^[a-z0-9][a-z0-9.-]{0,63}$/;

/** Fields of an entry the API returns: never anything else the database holds. */
export const PUBLIC_FIELDS = ["name", "score", "maxTier", "answered", "correct", "dlcs", "rulesetId", "date"];

export function publicEntry(entry) {
    return Object.fromEntries(PUBLIC_FIELDS.map((field) => [field, entry[field]]));
}

const bankCache = new Map();

/**
 * { total, byTier: { 1: n, … 5: n }, baseTotal (questions without DLC) } of the question bank of a ruleset, or null when the ruleset
 * has no bank (unknown ruleset). Read once per instance from data/testellaris/<id>/questions.json.
 */
export function readBankInfo(rulesetId) {
    if (typeof rulesetId !== "string" || !RULESET_PATTERN.test(rulesetId) || rulesetId.includes("..")) return null;
    if (!bankCache.has(rulesetId)) {
        let info = null;
        try {
            const url = new URL(`../../data/testellaris/${rulesetId}/questions.json`, import.meta.url);
            const bank = JSON.parse(readFileSync(url, "utf8"));
            if (bank.rulesetId === rulesetId && Array.isArray(bank.questions)) {
                const byTier = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                bank.questions.forEach((question) => { if (question.tier in byTier) byTier[question.tier] += 1; });
                const baseTotal = bank.questions.filter((question) => !question.dlc?.length).length;
                info = { total: bank.questions.length, byTier, baseTotal };
            }
        } catch (error) {
            info = null; // no bank for this ruleset
        }
        bankCache.set(rulesetId, info);
    }
    return bankCache.get(rulesetId);
}

function send(res, status, body) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
}

function queryParam(req, name) {
    if (req.query && typeof req.query[name] === "string") return req.query[name];
    return new URL(req.url || "/", "http://localhost").searchParams.get(name);
}

export class BadRequest extends Error {
    constructor(code, status = 400) {
        super(code);
        this.code = code;
        this.status = status;
    }
}

/** Largest body accepted (GDD §7.3: under 1 KB). */
export const MAX_BODY_BYTES = 1024;

/** The JSON body: Vercel parses it into `req.body`; a plain Node request is read here. */
async function readBody(req) {
    const length = Number(req.headers?.["content-length"]);
    if (length > MAX_BODY_BYTES) throw new BadRequest("size", 413);
    let body = req.body;
    if (body === undefined && typeof req.on === "function") {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) throw new BadRequest("size", 413);
            chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
    }
    if (Buffer.isBuffer(body)) body = body.toString("utf8");
    if (typeof body === "string") {
        if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new BadRequest("size", 413);
        try {
            body = JSON.parse(body);
        } catch (error) {
            throw new BadRequest("json");
        }
    } else if (body !== null && typeof body === "object" && Buffer.byteLength(JSON.stringify(body)) > MAX_BODY_BYTES) {
        throw new BadRequest("size", 413);
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new BadRequest("json");
    return body;
}

export const RATE_LIMIT = 5;
export const RATE_WINDOW_MS = 10 * 60 * 1000;

/** Client address as Vercel forwards it. */
export function clientIp(req) {
    const headers = req.headers || {};
    const forwarded = String(headers["x-forwarded-for"] || "").split(",")[0].trim();
    return String(headers["x-real-ip"] || "").trim() || forwarded || req.socket?.remoteAddress || "unknown";
}

export function clientKey(req, salt) {
    return createHash("sha256").update(`${salt}\n${clientIp(req)}`).digest("hex");
}

/**
 * Salt of the IP hashes: `HALL_OF_FAME_SALT` when set, else derived from the secret
 * `MONGODB_URI`, so every function instance hashes an address the same way.
 */
export function defaultSalt(env = process.env) {
    return env.HALL_OF_FAME_SALT || createHash("sha256").update(`testellaris-hall-of-fame\n${env.MONGODB_URI || ""}`).digest("hex");
}

export function createHandler({ store, now = () => new Date(), bankInfo = readBankInfo, salt = defaultSalt } = {}) {
    const openStore = async () => (typeof store === "function" ? store() : store);
    const saltValue = () => (typeof salt === "function" ? salt() : salt);

    async function rateLimit(req, res, db) {
        const at = now();
        const hits = await db.hit(clientKey(req, saltValue()), new Date(at.getTime() - RATE_WINDOW_MS), at);
        if (hits >= RATE_LIMIT) {
            res.setHeader("Retry-After", String(RATE_WINDOW_MS / 1000));
            throw new BadRequest("rate", 429);
        }
    }

    async function getBoard(req, res, db) {
        const rulesetId = queryParam(req, "ruleset");
        if (!bankInfo(rulesetId)) throw new BadRequest("ruleset");
        const entries = await db.top(rulesetId, TOP_SIZE);
        send(res, 200, { rulesetId, entries: entries.map(publicEntry) });
    }

    async function postEntry(req, res, db) {
        await rateLimit(req, res, db);
        const body = await readBody(req);
        const checked = validateEntry(body, { bankInfo });
        if (checked.error) throw new BadRequest(checked.error);
        const entry = { ...checked.entry, date: now().toISOString() };
        const board = await db.top(entry.rulesetId, TOP_SIZE);
        if (!qualifies(board, entry)) {
            send(res, 200, { saved: false, entries: board.map(publicEntry) });
            return;
        }
        await db.insert(entry);
        await db.trim(entry.rulesetId, TOP_SIZE);
        const entries = await db.top(entry.rulesetId, TOP_SIZE);
        send(res, 201, { saved: true, entry: publicEntry(entry), entries: entries.map(publicEntry) });
    }

    return async function handle(req, res) {
        res.setHeader("Cache-Control", "no-store");
        try {
            if (req.method !== "GET" && req.method !== "POST") {
                res.setHeader("Allow", "GET, POST");
                send(res, 405, { error: "method" });
                return;
            }
            const db = await openStore();
            if (!db) {
                send(res, 503, { error: "unavailable" });
                return;
            }
            await (req.method === "GET" ? getBoard : postEntry)(req, res, db);
        } catch (error) {
            if (error instanceof BadRequest) {
                send(res, error.status, { error: error.code });
                return;
            }
            console.error("hall of fame:", error);
            send(res, 503, { error: "unavailable" });
        }
    };
}
