async function fetchAdobeJobs(url) {
    const allJobs = [];

    for (let page = 0; page < 5; page++) { // pagination
        const payload = {
            lang: "en_us",
            deviceType: "desktop",
            country: "us",
            pageName: "search-results",
            ddoKey: "refineSearch",
            sortBy: "Most recent",
            subsearch: "",
            from: page * 10,
            irs: false,
            jobs: true,
            counts: true,
            all_fields: [
                "remote",
                "country",
                "state",
                "city",
                "experienceLevel",
                "category",
                "profession",
                "employmentType",
                "jobLevel"
            ],
            size: 10,
            clearAll: false,
            jdsource: "facets",
            isSliderEnable: false,
            pageId: "page15-ds",
            siteType: "external",
            keywords: "",
            global: true,
            selected_fields: {
                country: ["India"],
                category: ["Engineering and Product", "Information Technology"]
            },
            sort: {
                order: "desc",
                field: "postedDate"
            },
            locationData: {}
        };

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "user-agent": "Mozilla/5.0",
                "origin": "https://careers.adobe.com",
                "referer": "https://careers.adobe.com/"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        const jobs = data?.refineSearch?.data?.jobs || [];

        if (!jobs.length) break;

        for (const job of jobs) {
            allJobs.push({
                id: job.jobId || job.reqId,
                title: job.title || "N/A",
                location: job.location || `${job.city}, ${job.country}`,
                postedAt: job.postedDate || null,
                url: job.applyUrl || "N/A"
            });
        }

        allJobs.sort((a, b) => {
            if (!a.postedAt) return 1;
            if (!b.postedAt) return -1;
            return b.postedAt - a.postedAt;
        });

        // stop if last page
        if (jobs.length < 10) break;
    }

    return allJobs;
}


module.exports = {fetchAdobeJobs}