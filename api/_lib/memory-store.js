/**
 * In-memory hall of fame store with the interface of `mongo-store.js`: the local mock of the
 * database for the tests (tests/hall-of-fame/api-test.mjs). Nothing is persisted.
 */
import { sortEntries } from "../../js/testellaris-scores.js";

export function memoryStore() {
    const entries = [];
    const board = (rulesetId) => sortEntries(entries.filter((entry) => entry.rulesetId === rulesetId));
    return {
        entries,
        async top(rulesetId, limit) {
            return board(rulesetId).slice(0, limit).map((entry) => ({ ...entry }));
        },
        async insert(entry) {
            entries.push({ ...entry });
        },
        async trim(rulesetId, limit) {
            const keep = new Set(board(rulesetId).slice(0, limit));
            for (let index = entries.length - 1; index >= 0; index -= 1) {
                if (entries[index].rulesetId === rulesetId && !keep.has(entries[index])) entries.splice(index, 1);
            }
        },
    };
}
