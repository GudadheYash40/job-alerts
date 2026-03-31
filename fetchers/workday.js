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

async function fetchWorkdayJobs(url) {
    const allJobs = [];

    try {
        const basePayload = {
            appliedFacets: {
                Location_Country: ["c4f78be1a8f14da0ab49ce1162348a5e"], // India
                jobFamilyGroup: [
                    "8c5ce7a1cffb43e0a819c249a49fcb00",
                    "a88cba90a00841e0b750341c541b9d56",
                    "11d42f4a487c46b9b29ab3e087c2f5ca"
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
                    "origin": "https://workday.wd5.myworkdayjobs.com",
                    "referer": "https://workday.wd5.myworkdayjobs.com/"
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
                id: job.bulletFields?.[0],
                title: job.title || "N/A",
                location: job.locationsText || "N/A",
                postedAt: parsePostedOn(job.postedOn),
                url: job.externalPath
                    ? `https://workday.wd5.myworkdayjobs.com/en-US/Workday${job.externalPath}`
                    : "N/A"
            }));

            allJobs.push(...mapped);

            if (jobs.length < 20) break;
        }

        //Sort latest first
        allJobs.sort((a, b) => {
            if (!a.postedAt) return 1;
            if (!b.postedAt) return -1;
            return b.postedAt - a.postedAt;
        });

        return allJobs;

    } catch (err) {
        console.error("Workday Fetch Error:", err.message);
        return [];
    }
}

module.exports = { fetchWorkdayJobs };