/**
 * index.js — Job Alerter v2
 * - Polls all career APIs every N minutes
 * - Stores seen job IDs in local JSON file
 * - First run: silently stores all jobs (no alerts)
 * - Second run onwards: alerts only new jobs via Telegram + Email
 */

require("dotenv").config();

const express = require("express");
const cron    = require("node-cron");
const config  = require("./config/sources.json");
const state   = require("./engine/state");
const { sendEmail } = require("./utils/mailer");

// ── Fetcher registry ───────────────────────────────────────────────────────────
const { fetchJPMCJobs }                   = require("./fetchers/jpmc");
const { fetchMorganStanleyJobs,
        fetchMicrosoftJobs }              = require("./fetchers/eightfold");
const { fetchGoldmanSachsJobs }           = require("./fetchers/goldmansachs");
const { fetchMastercardJobs,
        fetchWorkdayIncJobs }             = require("./fetchers/workday");
const { fetchAmazonJobs }                 = require("./fetchers/amazon");
const { fetchAdobeJobs }                  = require("./fetchers/adobe");
const { fetchCiscoJobs }                  = require("./fetchers/cisco");
const { fetchDeepIntentJobs,
        fetchGreenhouseJobs }             = require("./fetchers/greenhouse");
const { fetchWalmartJobs }                = require("./fetchers/walmart");
const { fetchLinkedInJobs }               = require("./fetchers/linkedin");

const FETCHERS = {
    jpmc:          (url)      => fetchJPMCJobs(url),
    morganstanley: (url)      => fetchMorganStanleyJobs(url),
    microsoft:     (url)      => fetchMicrosoftJobs(url),
    goldmansachs:  (url)      => fetchGoldmanSachsJobs(url),
    mastercard:    (url, org) => fetchMastercardJobs(url, org),
    workday:       (url, org) => fetchWorkdayIncJobs(url, org),
    amazon:        (url)      => fetchAmazonJobs(url),
    adobe:         (url)      => fetchAdobeJobs(url),
    cisco:         (url)      => fetchCiscoJobs(url),
    deepintent:    (url)      => fetchDeepIntentJobs(url),
    walmart:       (url)      => fetchWalmartJobs(url),
    linkedin:      (url)      => fetchLinkedInJobs(url),
    // ── ADD NEW COMPANIES BELOW ───────────────────────────────────────────────
};

// ── Stats ──────────────────────────────────────────────────────────────────────
const STATS = {
    startedAt:    new Date().toISOString(),
    runCount:     0,
    totalNewJobs: 0,
    totalEmails:  0,
    lastRunAt:    null,
    lastRunMs:    0,
    isRunning:    false,
    companies:    {},
};

config.organisations.forEach(org => {
    STATS.companies[org.name] = {
        label:   org.label || org.name,
        fetched: 0,
        newJobs: 0,
        errors:  0,
        lastRun: null,
        status:  "waiting",
    };
});

// ── Helpers ────────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function withRetry(fn, label, attempts = 3) {
    for (let i = 1; i <= attempts; i++) {
        try { return await fn(); } catch (err) {
            if (i === attempts) throw err;
            console.warn(`  [${label}] attempt ${i} failed, retry in ${i * 2}s`);
            await sleep(i * 2000);
        }
    }
}

// ── Process one company ────────────────────────────────────────────────────────
async function processCompany(org) {
    const { name, label, url } = org;
    const fetcher = FETCHERS[name];
    const cs      = STATS.companies[name];

    if (!fetcher) {
        console.log(`  [${name}] No fetcher registered — skipping`);
        if (cs) cs.status = "no-fetcher";
        return { fetched: 0, newCount: 0, error: null };
    }

    if (cs) cs.status = "running";

    try {
        const jobs = await withRetry(() => fetcher(url, org), name);

        if (cs) {
            cs.fetched = jobs.length;
            cs.lastRun = new Date().toISOString();
            cs.status  = "ok";
        }

        const seenIds  = await state.getSeenIds(name);
        const newJobs  = jobs.filter(j => j.id && !seenIds.has(String(j.id)));
        const firstRun = await state.isFirstRun();

        if (newJobs.length > 0) {
            if (firstRun) {
                // First run — store silently, no alerts
                console.log(`  [${name}] 🔕 First run — storing ${newJobs.length} jobs silently (no alert)`);
                await state.markAsSeen(name, newJobs);
            } else {
                // Second run onwards — send alerts
                console.log(`  [${name}] 🆕 ${newJobs.length} new jobs`);
                newJobs.slice(0, 5).forEach(j =>
                    console.log(`    → ${j.title} | ${j.location}`)
                );

                await Promise.all([
                    sendEmail(name, label || name, newJobs),
                    state.markAsSeen(name, newJobs),
                    state.logAlert(name, label || name, newJobs),
                ]);

                if (cs) cs.newJobs += newJobs.length;
                STATS.totalNewJobs += newJobs.length;
                STATS.totalEmails  += 1;
            }
        } else {
            console.log(`  [${name}] No new jobs`);
        }

        return { fetched: jobs.length, newCount: firstRun ? 0 : newJobs.length, error: null };

    } catch (err) {
        if (cs) { cs.errors++; cs.status = "error"; }
        console.error(`  [${name}] ERROR: ${err.message}`);
        return { fetched: 0, newCount: 0, error: err.message };
    }
}

// ── Full poll run ──────────────────────────────────────────────────────────────
let isRunning = false;

async function runAll() {
    if (isRunning) {
        console.log("  [scheduler] Previous run still active — skipping");
        return;
    }

    isRunning       = true;
    STATS.isRunning = true;
    STATS.runCount += 1;
    STATS.lastRunAt = new Date().toISOString();
    const startMs   = Date.now();

    const ts = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" });
    console.log(`\n${"─".repeat(60)}`);
    console.log(`  RUN #${STATS.runCount} @ ${ts}`);
    console.log(`${"─".repeat(60)}`);

    const firstRun = await state.isFirstRun();
    if (firstRun) console.log("  [state] 🔕 FIRST RUN — storing all jobs silently, no alerts");

    const fastOrgs = config.organisations.filter(o => o.name !== "linkedin");
    const liOrg    = config.organisations.find(o => o.name === "linkedin");

    let totalFetched = 0, totalNew = 0;
    const errors = [];

    const fastResults = await Promise.allSettled(
        fastOrgs.map(org => processCompany(org))
    );
    fastResults.forEach((r, i) => {
        const res = r.status === "fulfilled" ? r.value : { fetched: 0, newCount: 0, error: r.reason?.message };
        totalFetched += res.fetched;
        totalNew     += res.newCount;
        if (res.error) errors.push(`${fastOrgs[i].name}: ${res.error}`);
    });

    if (liOrg) {
        const liRes = await processCompany(liOrg);
        totalFetched += liRes.fetched;
        totalNew     += liRes.newCount;
        if (liRes.error) errors.push(`linkedin: ${liRes.error}`);
    }

    const durationMs = Date.now() - startMs;
    STATS.lastRunMs  = durationMs;
    STATS.isRunning  = false;
    isRunning        = false;

    await state.logRun(totalFetched, totalNew, durationMs, errors);

    // Mark ready after first run so alerts fire from second run
    if (firstRun) await state.markReady();

    console.log(`${"─".repeat(60)}`);
    console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s · ${totalFetched} fetched · ${totalNew} new`);
    if (firstRun) console.log("  [state] ✅ Ready — next run will send alerts for new jobs");
    console.log(`${"─".repeat(60)}\n`);
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function renderDashboard(data) {
    const { runs, alerts, companyCounts, totalSeen } = data;

    const companyRows = config.organisations.map(org => {
        const cs          = STATS.companies[org.name] || {};
        const seen        = companyCounts[org.name]   || 0;
        const statusColor = cs.status === "ok"      ? "#4ade80"
                          : cs.status === "error"   ? "#f87171"
                          : cs.status === "running" ? "#fbbf24"
                          : "#4b5563";
        return `
        <tr>
          <td>
            <div style="font-weight:600;color:#e5e7eb;">${org.label || org.name}</div>
            <div style="font-size:11px;color:#4b5563;margin-top:2px;">${org.type || "—"}</div>
          </td>
          <td style="text-align:center;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
                         background:${statusColor};box-shadow:0 0 6px ${statusColor};"></span>
            &nbsp;<span style="font-size:12px;color:${statusColor};">${cs.status || "—"}</span>
          </td>
          <td style="text-align:center;font-family:monospace;color:#e5e7eb;">${cs.fetched || 0}</td>
          <td style="text-align:center;font-family:monospace;color:#4ade80;">${cs.newJobs || 0}</td>
          <td style="text-align:center;font-family:monospace;color:#d1d5db;">${seen.toLocaleString()}</td>
          <td style="font-size:11px;color:#4b5563;">${cs.lastRun ? new Date(cs.lastRun).toLocaleTimeString("en-IN") : "—"}</td>
        </tr>`;
    }).join("");

    const recentRuns = runs.slice(0, 10).map(r => `
        <tr>
          <td style="font-size:11px;color:#6b7280;">${new Date(r.ran_at).toLocaleString("en-IN")}</td>
          <td style="text-align:center;font-family:monospace;color:#d1d5db;">${r.total_fetched}</td>
          <td style="text-align:center;font-family:monospace;color:#4ade80;">${r.total_new}</td>
          <td style="text-align:center;font-size:11px;color:#6b7280;">${(r.duration_ms/1000).toFixed(1)}s</td>
          <td style="font-size:11px;color:#ef4444;">${(r.errors||[]).join(", ")||"—"}</td>
        </tr>`).join("") || '<tr><td colspan="5" style="text-align:center;color:#4b5563;padding:24px;">No runs yet</td></tr>';

    const recentAlerts = alerts.slice(0, 15).map(a => `
        <tr>
          <td style="font-size:11px;color:#6b7280;">${new Date(a.sent_at).toLocaleString("en-IN")}</td>
          <td style="font-weight:600;color:#e5e7eb;">${a.label || a.company}</td>
          <td style="text-align:center;font-family:monospace;color:#fbbf24;">${a.job_count}</td>
          <td style="font-size:11px;color:#6b7280;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${(a.job_titles||[]).slice(0,3).join(", ")}
          </td>
        </tr>`).join("") || '<tr><td colspan="4" style="text-align:center;color:#4b5563;padding:24px;">No alerts sent yet</td></tr>';

    const pollInterval = process.env.POLL_INTERVAL || "*/2 * * * *";
    const uptimeMin    = Math.floor(process.uptime() / 60);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Job Alerter — Dashboard</title>
  <meta http-equiv="refresh" content="30">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:#080810; --surface:#0f0f1a; --surface2:#141420;
      --border:#1e1e2e; --border2:#252535;
      --text:#e2e8f0; --muted:#4b5563;
      --amber:#f59e0b; --amber2:#fbbf24;
      --green:#4ade80; --red:#f87171; --blue:#60a5fa;
    }
    body { background:var(--bg); color:var(--text); font-family:'Inter',system-ui,sans-serif; font-size:14px; line-height:1.6; min-height:100vh; }
    body::before { content:''; position:fixed; inset:0; background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px); background-size:48px 48px; pointer-events:none; z-index:0; }
    .wrap { position:relative; z-index:1; max-width:1200px; margin:0 auto; padding:32px 20px; }
    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:36px; flex-wrap:wrap; gap:16px; }
    .logo { display:flex; align-items:center; gap:12px; }
    .logo-icon { width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#f59e0b,#fbbf24); display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 0 24px rgba(245,158,11,.3); }
    .logo-text { font-size:20px; font-weight:700; color:var(--text); }
    .logo-sub  { font-size:12px; color:var(--muted); }
    .pulse-wrap { display:flex; align-items:center; gap:8px; padding:8px 16px; border-radius:20px; background:rgba(74,222,128,.08); border:1px solid rgba(74,222,128,.2); }
    .pulse { width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 8px var(--green); animation:pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    .pulse-text { font-size:12px; font-weight:600; color:var(--green); }
    .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; margin-bottom:28px; }
    .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:20px; position:relative; overflow:hidden; }
    .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent); }
    .stat-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin-bottom:8px; }
    .stat-value { font-family:'JetBrains Mono',monospace; font-size:28px; font-weight:500; line-height:1; }
    .stat-sub { font-size:11px; color:var(--muted); margin-top:4px; }
    .section { margin-bottom:28px; }
    .section-title { font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin-bottom:14px; display:flex; align-items:center; gap:8px; }
    .section-title::after { content:''; flex:1; height:1px; background:var(--border); }
    .table-wrap { background:var(--surface); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
    table { width:100%; border-collapse:collapse; }
    thead th { padding:12px 16px; text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); background:var(--surface2); border-bottom:1px solid var(--border); }
    tbody td { padding:12px 16px; border-bottom:1px solid var(--border); vertical-align:middle; }
    tbody tr:last-child td { border-bottom:none; }
    tbody tr:hover td { background:rgba(255,255,255,.015); }
    .footer { margin-top:40px; padding-top:20px; border-top:1px solid var(--border); text-align:center; font-size:11px; color:var(--muted); }
    @media(max-width:640px){ .stats-grid{grid-template-columns:1fr 1fr} .header{flex-direction:column;align-items:flex-start} }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo">
      <div class="logo-icon">🎯</div>
      <div>
        <div class="logo-text">Job Alerter</div>
        <div class="logo-sub">Live career API monitor · India</div>
      </div>
    </div>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
      <div class="pulse-wrap">
        <div class="pulse"></div>
        <span class="pulse-text">${STATS.isRunning ? "Fetching now…" : "Polling active"}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);">Auto-refresh every 30s</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Runs</div>
      <div class="stat-value" style="color:var(--blue);">${STATS.runCount}</div>
      <div class="stat-sub">since startup</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">New Jobs Found</div>
      <div class="stat-value" style="color:var(--amber);">${STATS.totalNewJobs.toLocaleString()}</div>
      <div class="stat-sub">alerts sent: ${STATS.totalEmails}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Seen</div>
      <div class="stat-value" style="color:var(--text);">${totalSeen.toLocaleString()}</div>
      <div class="stat-sub">in local file</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Poll Interval</div>
      <div class="stat-value" style="color:var(--green);font-size:18px;padding-top:4px;">${pollInterval}</div>
      <div class="stat-sub">uptime ${uptimeMin}m</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Last Run</div>
      <div class="stat-value" style="color:var(--text);font-size:16px;padding-top:4px;">
        ${STATS.lastRunAt ? new Date(STATS.lastRunAt).toLocaleTimeString("en-IN") : "—"}
      </div>
      <div class="stat-sub">${STATS.lastRunMs ? `${(STATS.lastRunMs/1000).toFixed(1)}s duration` : "—"}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Companies</div>
      <div class="stat-value" style="color:var(--text);">${config.organisations.length}</div>
      <div class="stat-sub">sources active</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Company Status</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Company</th><th style="text-align:center;">Status</th><th style="text-align:center;">Fetched</th><th style="text-align:center;">New</th><th style="text-align:center;">Total Seen</th><th>Last Run</th></tr></thead>
        <tbody>${companyRows}</tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Recent Runs</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Time</th><th style="text-align:center;">Fetched</th><th style="text-align:center;">New</th><th style="text-align:center;">Duration</th><th>Errors</th></tr></thead>
        <tbody>${recentRuns}</tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Recent Alerts Sent</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Sent At</th><th>Company</th><th style="text-align:center;">Jobs</th><th>Titles</th></tr></thead>
        <tbody>${recentAlerts}</tbody>
      </table>
    </div>
  </div>

  <div class="footer">Job Alerter v2 · Local file state · Render deployment · Auto-refreshes every 30s</div>
</div>
</body>
</html>`;
}

// ── Express server ─────────────────────────────────────────────────────────────
const app = express();

app.get("/", async (_req, res) => {
    try {
        const data = await state.getDashboardData();
        res.send(renderDashboard(data));
    } catch (err) {
        res.status(500).send(`<pre style="background:#000;color:#f87171;padding:20px;">Dashboard error: ${err.message}</pre>`);
    }
});

app.get("/health", (_req, res) => {
    res.json({ status:"running", uptime_s:Math.floor(process.uptime()), isRunning:STATS.isRunning, runCount:STATS.runCount, newJobs:STATS.totalNewJobs });
});

app.post("/run-now", async (_req, res) => {
    if (STATS.isRunning) return res.json({ status:"already_running" });
    runAll().catch(console.error);
    res.json({ status:"started" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`  [server] Dashboard → http://localhost:${PORT}`);
    console.log(`  [server] Health    → http://localhost:${PORT}/health\n`);
});

// ── Scheduler ──────────────────────────────────────────────────────────────────
const INTERVAL = process.env.POLL_INTERVAL || "*/2 * * * *";

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║               JOB ALERTER v2 — STARTED                  ║");
console.log(`║  Poll   : ${INTERVAL.padEnd(48)}║`);
console.log(`║  Sources: ${String(config.organisations.length).padEnd(48)}║`);
console.log(`║  Port   : ${String(PORT).padEnd(48)}║`);
console.log("╚══════════════════════════════════════════════════════════╝\n");

runAll();
cron.schedule(INTERVAL, runAll);
