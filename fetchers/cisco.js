async function fetchCiscoJobs(url) {
    const allJobs = [];

    for (let from = 0; from < 50; from += 10) {
        const payload = {
            sortBy: "Most recent",
            subsearch: "",
            from: from,
            jobs: true,
            counts: true,
            all_fields: [
                "category",
                "raasJobRequisitionType",
                "country",
                "state",
                "city",
                "type",
                "RemoteType"
            ],
            pageName: "product-and-engineering",
            pageType: "category",
            size: 10,
            clearAll: true,
            jdsource: "facets",
            isSliderEnable: false,
            pageId: "page490-prod",
            siteType: "external",
            location: "",
            keywords: "",
            global: true,
            selected_fields: {
                category: ["Product and Engineering", "Information Technology"],
                country: ["India"]
            },
            sort: {
                order: "desc",
                field: "postedDate"
            },
            lang: "en_global",
            deviceType: "desktop",
            country: "global",
            refNum: "CISCISGLOBAL",
            ddoKey: "refineSearch"
        };

        const res = await fetch(`${url}/widgets`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "origin": `${url}`,
                "referer": `${url}/`,
                "user-agent": "Mozilla/5.0"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        const jobs = data?.refineSearch?.data?.jobs || [];

        if (!jobs.length) break;

        for (const job of jobs) {
            allJobs.push({
                id: job.jobId,
                title: job.title || "N/A",
                location: job.location || `${job.city || ""}, ${job.country || ""}`,
                postedAt: job.postedDate ? new Date(job.postedDate) : null,
                url: `https://careers.cisco.com/global/en/job/${job.jobId}`
            });
        }

        allJobs.sort((a, b) => {
            if (!a.postedAt) return 1;
            if (!b.postedAt) return -1;
            return b.postedAt - a.postedAt;
        });

        // stop early if less than expected
        if (jobs.length < 10) break;
    }

    return allJobs;
}

module.exports = { fetchCiscoJobs };