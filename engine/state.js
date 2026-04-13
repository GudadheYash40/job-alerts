// engine/state.js
// Local JSON file storage
// FIRST RUN: silently stores all jobs, no alerts sent
// SECOND RUN onwards: only new jobs trigger alerts

const fs   = require("fs/promises");
const path = require("path");

const DATA_FILE  = path.join(__dirname, "../data/seen_jobs.json");
const READY_FILE = path.join(__dirname, "../data/ready.flag");

async function ensureFile() {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    try { await fs.access(DATA_FILE); }
    catch { await fs.writeFile(DATA_FILE, JSON.stringify({}), "utf-8"); }
}

async function readData() {
    await ensureFile();
    try { return JSON.parse(await fs.readFile(DATA_FILE, "utf-8")); }
    catch { return {}; }
}

async function writeData(data) {
    await ensureFile();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function isFirstRun() {
    try { await fs.access(READY_FILE); return false; }
    catch { return true; }
}

async function markReady() {
    await fs.mkdir(path.dirname(READY_FILE), { recursive: true });
    await fs.writeFile(READY_FILE, new Date().toISOString(), "utf-8");
    console.log("  [state] ✅ First run complete — alerts enabled from next run");
}

async function getSeenIds(company) {
    const data = await readData();
    return new Set((data[company] || []).map(id => String(id)));
}

async function markAsSeen(company, jobs) {
    const data   = await readData();
    const oldIds = data[company] || [];
    const newIds = jobs.map(j => String(j.id));
    data[company] = Array.from(new Set([...newIds, ...oldIds])).slice(0, 500);
    await writeData(data);
}

async function logAlert(company, label, jobs) {
    console.log(`  [state] Alert logged — ${label || company}: ${jobs.length} jobs`);
}

async function logRun(totalFetched, totalNew, durationMs, errors) {
    console.log(`  [state] Run — fetched:${totalFetched} new:${totalNew} time:${durationMs}ms errors:${errors.length}`);
}

async function getDashboardData() {
    const data          = await readData();
    const companyCounts = {};
    let   totalSeen     = 0;
    for (const [company, ids] of Object.entries(data)) {
        companyCounts[company] = ids.length;
        totalSeen += ids.length;
    }
    return { runs: [], alerts: [], companyCounts, totalSeen };
}

module.exports = { getSeenIds, markAsSeen, logAlert, logRun, getDashboardData, isFirstRun, markReady };
