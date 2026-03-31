// engine/state.js
const fs = require("fs/promises");
const path = require("path");

async function ensureDirExists(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

function getFilePath(company) {
    return path.join(__dirname, "../data", `${company}.json`);
}

// Load state for a company
async function loadState(company) {
    try {
        const filePath = getFilePath(company);
        await ensureDirExists(path.dirname(filePath));
        const data = await fs.readFile(filePath, "utf-8");
        return JSON.parse(data);
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

// Always store IDs as strings — fixes repeat job bug
function updateSeenIds(oldIds, newIds, limit = 500) {
    // Normalize everything to strings
    const normalizedOld = oldIds.map(id => String(id));
    const normalizedNew = newIds.map(id => String(id));

    const combined = [...normalizedNew, ...normalizedOld];
    const unique = Array.from(new Set(combined));
    return unique.slice(0, limit);
}

// Build a Set of string IDs for comparison
function buildSeenSet(seenIds) {
    return new Set(seenIds.map(id => String(id)));
}

module.exports = {
    loadState,
    saveState,
    updateSeenIds,
    buildSeenSet,
};
