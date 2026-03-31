const fs = require("fs/promises");
const path = require("path");


async function ensureDirExists(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}
//Build file path: data/jpmc.json
function getFilePath(company) {
    return path.join(__dirname, "../data", `${company}.json`);
}

//Load state for a company
async function loadState(company) {
    try {
        const filePath = getFilePath(company);
        await ensureDirExists(path.dirname(filePath));
        const data = await fs.readFile(filePath, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        // file doesn't exist , first run
        return { seen_ids: [] };
    }
}

//Save state
async function saveState(company, state) {
    const filePath = getFilePath(company);
    await ensureDirExists(path.dirname(filePath));

    await fs.writeFile(
        filePath,
        JSON.stringify(state, null, 2),
        "utf-8"
    );
}

//Merge + dedupe + trim
function updateSeenIds(oldIds, newIds, limit = 200) {
    const combined = [...newIds, ...oldIds];
    const unique = Array.from(new Set(combined));
    return unique.slice(0, limit);
}

module.exports = {
    loadState,
    saveState,
    updateSeenIds
};