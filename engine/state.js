// engine/state.js
// Uses Upstash Redis to store seen IDs permanently
// Survives Render restarts, deploys, and sleep cycles

const { Redis } = require("@upstash/redis");

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Load seen IDs for a company from Redis
async function loadState(company) {
    try {
        const ids = await redis.get(`seen_ids:${company}`);
        return { seen_ids: ids || [] };
    } catch (err) {
        console.error(`Redis loadState error (${company}):`, err.message);
        return { seen_ids: [] };
    }
}

// Save seen IDs for a company to Redis
async function saveState(company, state) {
    try {
        await redis.set(`seen_ids:${company}`, state.seen_ids);
    } catch (err) {
        console.error(`Redis saveState error (${company}):`, err.message);
    }
}

// Merge new IDs into old — plain strings, deduped, capped at 500
function updateSeenIds(oldIds, newIds, limit = 500) {
    const normalized = [
        ...newIds.map(id => String(id)),
        ...oldIds.map(id => typeof id === "object" ? String(id.id) : String(id))
    ];
    return Array.from(new Set(normalized)).slice(0, limit);
}

// Build a Set for fast lookup
function buildSeenSet(seenIds) {
    return new Set(seenIds.map(id =>
        typeof id === "object" ? String(id.id) : String(id)
    ));
}

module.exports = { loadState, saveState, updateSeenIds, buildSeenSet };
