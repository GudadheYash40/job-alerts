async function fetchMicrosoftJobs(url) {
    const allJobs = [];

    try {
        for (let page = 0; page < 5; page++) {
            const paginatedUrl = `${url}&start=${page * 10}`;

            const res = await fetch(paginatedUrl);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            if (!data?.data || !Array.isArray(data.data.positions)) {
                throw new Error("Invalid API response structure (Microsoft)");
            }

            const jobs = data.data.positions;

            for (const job of jobs) {
                allJobs.push({
                    id: job.id,
                    title: job.name || "N/A",
                    location: job.locations?.[0] || "",
                    postedAt: job.postedTs
                        ? new Date(job.postedTs * 1000)
                        : null,
                    url: job.positionUrl
                        ? `https://apply.careers.microsoft.com${job.positionUrl}`
                        : null
                });
            }
        }
        allJobs.sort((a, b) => {
            if (!a.postedAt) return 1;
            if (!b.postedAt) return -1;
            return b.postedAt - a.postedAt;
        });
        return allJobs;

    } catch (err) {
        console.error("Microsoft Fetch Error:", err.message);
        throw err;
    }
}

module.exports = { fetchMicrosoftJobs };