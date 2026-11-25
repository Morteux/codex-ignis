/**
 * Vercel serverless function of the Testellaris hall of fame (TESTELLARIS_GDD.md §7.2):
 * GET the top 10 of a ruleset, POST one entry. The rules live in `_lib/board.js`; the data in
 * MongoDB Atlas through the `MONGODB_URI` environment variable (`_lib/mongo-store.js`).
 */
import { createHandler } from "./_lib/board.js";
import { mongoStore } from "./_lib/mongo-store.js";

const handle = createHandler({ store: () => mongoStore() });

export default function hallOfFame(req, res) {
    return handle(req, res);
}
