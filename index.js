require("dotenv").config();
const config = require("./config/source.json");
const { isEntryLevel } = require("./utils/filter");
const cron = require("node-cron");
const express = require("express");
const app = express();
// fetchers
const { fetchJPMCJobs } = require("./fetchers/jpmc");
const { fetchMorganStanleyJobs } = require("./fetchers/morganstanley")
const { fetchCiscoJobs } = require("./fetchers/cisco")
const { fetchGoldmanJobs } = require("./fetchers/goldmansachs")
const { fetchAdobeJobs } = require("./fetchers/adobe")
const { fetchMastercardJobs } = require("./fetchers/mastercard")
const { fetchAmazonJobs } = require("./fetchers/amazon")
// const { fetchWalmartJobs } = require("./fetchers/walmart")
const { fetchWorkdayJobs } = require("./fetchers/workday")
const { fetchMicrosoftJobs } = require("./fetchers/microsoft")
const { fetchDeepIntentJobs } = require("./fetchers/deepintent")
const { loadState, saveState, updateSeenIds } = require("./engine/state");
const { sendEmail }=require("./utils/mailer")


//
let isRunning = false;
//Map company -> fetcher
const fetcherMap = {
    jpmc: fetchJPMCJobs,
    morganstanley : fetchMorganStanleyJobs,
    cisco : fetchCiscoJobs,
    goldmansachs : fetchGoldmanJobs,
    adobe : fetchAdobeJobs,
    mastercard : fetchMastercardJobs,
    amazon : fetchAmazonJobs,
    // walmart : fetchWalmartJobs,
    workday : fetchWorkdayJobs,
    deepintent : fetchDeepIntentJobs,
    microsoft : fetchMicrosoftJobs,
};

console.log("---------------------- START -------------------------")
console.log("RUN:", new Date().toISOString());

function formatDate(date) {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
}

async function processCompany(org) {
    const { name, url } = org;

    try {
        console.log(`\nProcessing: ${name}`);

        const fetcher = fetcherMap[name];

        if (!fetcher) {
            console.log(`No fetcher found for ${name}`);
            return;
        }

        // Fetch jobs
        const jobs = await fetcher(url);
        console.log(`Fetched ${jobs.length} jobs`);

        // Load state
        let state = await loadState(name);
        const seenSet = new Set(state.seen_ids);

        const newJobs = [];

        for (let job of jobs) {
            // filter first
            if (!isEntryLevel(job)) continue;
        
            if (!seenSet.has(job.id)) {
                newJobs.push(job);
            }
        }

        // Logging new jobs
        if (newJobs.length > 0) {
            console.log(`\nNew Jobs (${newJobs.length}) for ${name}:\n`);

            newJobs.forEach((job, index) => {
                console.log(`Job ${index + 1}:`);
                console.log(`ID        : ${job.id}`);
                console.log(`Title     : ${job.title}`);
                console.log(`Location  : ${job.location}`);
                console.log(`Posted At : ${formatDate(job.postedAt)}`);
                console.log(`URL       : ${job.url}`);
                console.log("--------------------------------------------------");
            });

            // EMAIL Integration
            if (newJobs.length > 0) {
                console.log(`New Jobs (${newJobs.length}) for ${name}`);
            
                await sendEmail(name, newJobs);
            
            } else {
                console.log(`No new jobs for ${name}`);
            }

        } else {
            console.log(`No new jobs for ${name}`);
        }

        // Update state
        const newIds = jobs.map(j => j.id);
        state.seen_ids = updateSeenIds(state.seen_ids, newIds);

        await saveState(name, state);

    } catch (err) {
        console.error(`Error processing ${name}:`, err.message);
    }
}

async function main() {
    const organisations = config.organisations;

    await Promise.all(
        organisations.map(org => processCompany(org))
    );
    console.log("RUN END:", new Date().toISOString());
    console.log("---------------------- END -------------------------\n");
}

// to deploy on render we need this
app.get("/", (req, res) => {
    res.send("Running");
});
app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});

cron.schedule("*/3 * * * *", async () => {
    if (isRunning) {
        console.log("Skipping run, previous still executing");
        return;
    }

    isRunning = true;
    console.log("Starting job at:", new Date().toISOString());

    try {
        await main();
    } catch (err) {
        console.error("Main job failed:", err.message);
    } finally{
        isRunning = false
    }
});