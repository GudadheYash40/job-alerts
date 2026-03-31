async function fetchMorganStanleyJobs(baseUrl) {
    try {
        const allJobs = [];

        for (let start = 0; start < 30; start += 10) {
            const url = `${baseUrl}&start=${start}`;

            const res = await fetch(url);

            if (!res.ok) {
                throw new Error(`HTTP error: ${res.status}`);
            }

            const data = await res.json();

            // Validate structure
            if (
                !data?.data ||
                !Array.isArray(data.data.positions)
            ) {
                throw new Error("Invalid API response structure (Morgan Stanley)");
            }

            const jobs = data.data.positions;

            for (const job of jobs) {
                // Prefer postedTs, fallback to creationTs
                const timestamp = job.postedTs || job.creationTs;

                allJobs.push({
                    id: job.id,
                    title: job.name || "N/A",
                    location: Array.isArray(job.locations)
                        ? job.locations.join(", ")
                        : "",
                    postedAt: timestamp
                        ? new Date(timestamp * 1000) // convert seconds → ms
                        : null,
                    url: job.positionUrl
                        ? `https://morganstanley.eightfold.ai${job.positionUrl}`
                        : `https://morganstanley.eightfold.ai/careers/job/${job.id}`
                });
            }

            allJobs.sort((a, b) => {
                if (!a.postedAt) return 1;
                if (!b.postedAt) return -1;
                return b.postedAt - a.postedAt;
            });
            // Stop early if fewer results
            if (jobs.length < 10) break;
        }

        return allJobs;

    } catch (err) {
        console.error("Morgan Stanley Fetch Error:", err.message);
        throw err;
    }
}

module.exports = { fetchMorganStanleyJobs };