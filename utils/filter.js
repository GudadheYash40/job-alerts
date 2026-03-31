// utils/filter.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SMART FILTER for BBA Fresher — India Job Market
//
// PHILOSOPHY:
// Don't try to whitelist — you'll miss roles you never heard of.
// Instead, ONLY block what is 100% wrong for a BBA fresher:
//   1. Pure hands-on coding/engineering jobs
//   2. Senior/leadership roles needing years of experience
//   3. Specific level numbers (II, III, IV...)
//
// Everything else passes — including roles like:
//   "Wealth & Retail Banking", "Treasury Analyst", "KYC Analyst",
//   "Trade Finance", "Relationship Manager", "Credit Analyst",
//   "Category Manager", "Demand Planner", "Revenue Analyst" etc.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function isEntryLevel(job) {
    const title = (job.title || "").toLowerCase().trim();

    // ─────────────────────────────────────────────────────
    // ❌ BLOCK 1: SENIORITY — needs years of experience
    // Be careful: "associate" is ENTRY LEVEL, don't block it
    // ─────────────────────────────────────────────────────
    const seniorityBlock = [
        "senior",
        " sr ",
        "sr.",
        " lead",
        "team lead",
        "tech lead",
        "principal",
        "staff engineer",
        "staff software",
        "director",
        "vice president",
        " vp ",
        "(vp)",
        "head of",
        "head,",
        "president",
        "chief ",
        "cto",
        "cfo",
        "ceo",
        "coo",
        "ciso",
        "managing director",
        " md,",
        "partner",
        "group manager",
        "senior manager",
        "regional manager",
        "country manager",
        "general manager",
        "avp",                  // Assistant Vice President (still senior)
        "assistant vice",
    ];
    if (seniorityBlock.some(w => title.includes(w))) return false;

    // ─────────────────────────────────────────────────────
    // ❌ BLOCK 2: PURE CODING / ENGINEERING ROLES
    // Only block when the ENTIRE role is hands-on technical.
    // "Business Analyst" at a tech company = KEEP
    // "Software Engineer" = BLOCK
    // ─────────────────────────────────────────────────────
    const pureEngineeringBlock = [
        "software engineer",
        "software developer",
        "engineer",
        "swe ",
        "(swe)",
        "backend engineer",
        "frontend engineer",
        "full stack engineer",
        "fullstack engineer",
        "full-stack engineer",
        "devops engineer",
        "site reliability engineer",
        " sre ",
        "ml engineer",
        "machine learning engineer",
        "ai engineer",
        "deep learning engineer",
        "embedded engineer",
        "embedded systems",
        "hardware engineer",
        "network engineer",
        "security engineer",
        "cloud engineer",
        "platform engineer",
        "infrastructure engineer",
        "qa engineer",
        "quality assurance engineer",
        "test engineer",
        "automation engineer",
        "firmware engineer",
        "data engineer",          // pure pipeline/ETL role
        "database administrator",
        "dba ",
        "systems engineer",
        "systems administrator",
        "sdet",                   // software dev engineer in test
        "solutions engineer",     // usually needs coding
        "integration engineer",
        "release engineer",
        "build engineer",
    ];
    if (pureEngineeringBlock.some(w => title.includes(w))) return false;

    // ─────────────────────────────────────────────────────
    // ❌ BLOCK 3: EXPERIENCE LEVEL NUMBERS
    // "Analyst II", "Engineer III" = experienced hire
    // But DON'T block "1" or "I" — too common in normal titles
    // ─────────────────────────────────────────────────────
    const levelBlock = [
        " ii",      // Engineer II, Analyst II
        " iii",
        " iv",
        " v ",
        " vi",
        " 2",
        " 3",
        " 4",
        " 5",
        " 6",
        " 7",
    ];
    if (levelBlock.some(w => title.includes(w))) return false;

    // ─────────────────────────────────────────────────────
    // ✅ ALLOW EVERYTHING ELSE
    //
    // This lets through ALL of these (and more):
    //
    // BANKING & FINANCE:
    //   Wealth & Retail Banking, Relationship Manager, Credit Analyst,
    //   KYC Analyst, AML Analyst, Trade Finance, Treasury Analyst,
    //   Financial Analyst, Investment Analyst, Equity Research,
    //   Audit Associate, Risk Analyst, Compliance Analyst,
    //   Loan Officer, Underwriter, Insurance Analyst
    //
    // BUSINESS & CONSULTING:
    //   Business Analyst, Strategy Analyst, Management Consultant,
    //   Program Coordinator, Project Coordinator, PMO Analyst,
    //   Research Analyst, Market Research, Consulting Analyst
    //
    // OPERATIONS & SUPPLY CHAIN:
    //   Operations Analyst, Supply Chain Analyst, Demand Planner,
    //   Category Manager, Procurement Analyst, Logistics Analyst,
    //   Vendor Management, Inventory Analyst
    //
    // MARKETING & GROWTH:
    //   Marketing Analyst, Brand Manager (entry), Growth Analyst,
    //   Digital Marketing, Content Strategist, Market Intelligence
    //
    // ENTRY-LEVEL CATCH-ALL:
    //   Graduate Trainee, Management Trainee, Associate,
    //   Junior Analyst, Fresher, Intern, Apprentice
    //
    // DATA & TECH-ADJACENT (BBA can do these):
    //   Data Analyst, Business Intelligence Analyst, Reporting Analyst,
    //   MIS Analyst, Insights Analyst, Tableau Analyst
    // ─────────────────────────────────────────────────────
    return true;
}

module.exports = { isEntryLevel };
