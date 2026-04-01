// engine/state.js
const fs = require("fs/promises");
const path = require("path");

async function ensureDirExists(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

function getFilePath(company) {
    return path.join(__dirname, "../data", `${company}.json`);
}

// Load state
async function loadState(company) {
    try {
        const filePath = getFilePath(company);
        await ensureDirExists(path.dirname(filePath));
        const data = await fs.readFile(filePath, "utf-8");
        const parsed = JSON.parse(data);

        // Migrate old object format { id, seenAt } → plain string IDs
        parsed.seen_ids = parsed.seen_ids.map(entry =>
            typeof entry === "object" ? String(entry.id) : String(entry)
        );

        return parsed;
    } catch (err) {
        return { seen_ids: [] };
    }
}

// Save state
async function saveState(company, state) {
    const filePath = getFilePath(company);
    await ensureDirExists(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
}

// Merge new IDs into existing — plain strings only
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
