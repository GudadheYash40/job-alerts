async function fetchStandardCharteredJobs(url) {
    const allJobs = [];

    try {
        for (let page = 0; page < 3; page++) {
            const payload = {
                locale: "en_GB",
                pageNumber: page,
                sortBy: "date",
                keywords: "",
                location: "",
                facetFilters: {
                    cust_region: ["Asia"]
                },
                brand: "",
                skills: [],
                categoryId: 9783557,
                alertId: "",
                rcmCandidateId: ""
            };

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "user-agent": "Mozilla/5.0",
                    "origin": "https://jobs.standardchartered.com",
                    "referer": "https://jobs.standardchartered.com/"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            const jobs = data?.jobSearchResult || [];

            if (!jobs.length) break;

            const mapped = jobs.map(job => {
                const r = job.response;
                return {
                    id: r.id,
                    title: r.unifiedStandardTitle || "N/A",
                    location: r.jobLocationShort?.[0]?.trim() || r.jobLocationCountry?.[0] || "N/A",
                    postedAt: r.unifiedStandardStart ? new Date(r.unifiedStandardStart) : null,
                    url: r.urlTitle
                        ? `https://jobs.standardchartered.com/en/jobs/${r.id}/${r.urlTitle}`
                        : "N/A"
                };
            });

            allJobs.push(...mapped);

            if (jobs.length < 10) break;
        }

        // Sort latest first
        allJobs.sort((a, b) => {
            if (!a.postedAt) return 1;
            if (!b.postedAt) return -1;
            return b.postedAt - a.postedAt;
        });

        return allJobs;

    } catch (err) {
        console.error("Standard Chartered Fetch Error:", err.message);
        return [];
    }
}

module.exports = { fetchStandardCharteredJobs };
