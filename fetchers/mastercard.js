// async function fetchMastercardJobs(url) {
//     const allJobs = [];

//     try {
//         // base payload (your given)
//         const basePayload = {
//             lang: "en_us",
//             deviceType: "desktop",
//             country: "us",
//             pageName: "search-results",
//             ddoKey: "eagerLoadRefineSearch",
//             sortBy: "Most recent",
//             subsearch: "",
//             jobs: true,
//             counts: true,
//             all_fields: [
//                 "category",
//                 "country",
//                 "state",
//                 "city",
//                 "postalCode",
//                 "jobType",
//                 "phLocSlider"
//             ],
//             size: 10,
//             clearAll: false,
//             jdsource: "facets",
//             isSliderEnable: true,
//             pageId: "page11",
//             siteType: "external",
//             keywords: "",
//             global: true,
//             selected_fields: {
//                 country: ["India"],
//                 category: ["Software Engineering", "IT", "AI & Data"]
//             },
//             sort: {
//                 order: "desc",
//                 field: "postedDate"
//             },
//             locationData: {
//                 sliderRadius: 302,
//                 aboveMaxRadius: true,
//                 LocationUnit: "kilometers"
//             },
//             s: "1"
//         };

//         // pagination
//         for (let page = 0; page < 5; page++) {
//             const payload = {
//                 ...basePayload,
//                 from: page * 10
//             };

//             const res = await fetch(url, {
//                 method: "POST",
//                 headers: {
//                     "content-type": "application/json",
//                     "user-agent": "Mozilla/5.0",
//                     "origin": "https://careers.mastercard.com",
//                     "referer": "https://careers.mastercard.com/"
//                 },
//                 body: JSON.stringify(payload)
//             });

//             if (!res.ok) {
//                 throw new Error(`HTTP ${res.status}`);
//             }

//             const data = await res.json();

//             const jobs =
//                 data?.eagerLoadRefineSearch?.data?.jobs || [];

//             if (!jobs.length) break;

//             const mapped = jobs.map(job => ({
//                 id: job.jobId || job.reqId,
//                 title: job.title || "N/A",
//                 location: job.location || `${job.city}, ${job.country}`,
//                 postedAt: job.postedDate
//                     ? new Date(job.postedDate)
//                     : null,
//                 url: job.applyUrl || "N/A"
//             }));

//             allJobs.push(...mapped);

//             // stop if last page
//             if (jobs.length < 10) break;
//         }

//         allJobs.sort((a, b) => {
//             if (!a.postedAt) return 1;
//             if (!b.postedAt) return -1;
//             return b.postedAt - a.postedAt;
//         });

//         return allJobs;

//     } catch (err) {
//         console.error("Mastercard Fetch Error:", err.message);
//         return [];
//     }
// }

// module.exports = { fetchMastercardJobs };


function parsePostedOn(text) {
    if (!text) return null;

    const lower = text.toLowerCase();

    if (lower.includes("today")) return new Date();

    const match = lower.match(/(\d+)/);
    if (!match) return null;

    const days = parseInt(match[1]);

    const date = new Date();
    date.setDate(date.getDate() - days);

    return date;
}


async function fetchMastercardJobs(url) {
    const allJobs = [];

    try {
        const basePayload = {
            appliedFacets: {
                jobFamilyGroup: [
                    "866c0ed135ff106f00587685e7483440",
                    "79159e74ef6f01a1ba398ea19325020c",
                    "866c0ed135ff106f00a52e9d27783579",
                    "32c63b91509d1037cda1181eda955821",
                    "0ea6171d1dd81001035429e2c6b00000"
                ],
                locations: [
                    "8eab563831bf10acb97b7fba5feff76e",
                    "28905a74db1b10019f5bb16c36030000",
                    "8eab563831bf10acbc722e4859721571"
                ]
            },
            limit: 20,
            searchText: ""
        };

        for (let page = 0; page < 3; page++) {
            const payload = {
                ...basePayload,
                offset: page * 20
            };

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "user-agent": "Mozilla/5.0",
                    "origin": "https://mastercard.wd1.myworkdayjobs.com/en-US/CorporateCareers",
                    "referer": "https://mastercard.wd1.myworkdayjobs.com/en-US/CorporateCareers"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            const jobs = data?.jobPostings || [];

            if (!jobs.length) break;

            const mapped = jobs.map(job => ({
                id: job.bulletFields?.[0] || job.externalPath,
                title: job.title || "N/A",
                location: job.locationsText || "N/A",
                postedAt: parsePostedOn(job.postedOn),
                url: job.externalPath
                    ? "https://mastercard.wd1.myworkdayjobs.com/en-US/CorporateCareers" + job.externalPath
                    : "N/A"
            }));

            allJobs.push(...mapped);

            if (jobs.length < 20) break;
        }

        // sort latest first
        allJobs.sort((a, b) => {
            if (!a.postedAt) return 1;
            if (!b.postedAt) return -1;
            return b.postedAt - a.postedAt;
        });

        return allJobs;

    } catch (err) {
        console.error("Mastercard Workday Fetch Error:", err.message);
        return [];
    }
}

module.exports = { fetchMastercardJobs };