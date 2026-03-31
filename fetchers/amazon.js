async function fetchAmazonJobs(url) {
    const allJobs = [];

    try {
        for (let page = 0; page < 5; page++) {
            const paginatedUrl = `${url}offset=${page * 10}`;

            const res = await fetch(paginatedUrl);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            const jobs = data?.jobs || [];

            if (!jobs.length) break;

            const mapped = jobs.map(job => {
                // Convert "March 19, 2026" → Date
                let postedAt = null;
                if (job.posted_date) {
                    postedAt = new Date(job.posted_date);
                }

                return {
                    id: job.id || job.id_icims,
                    title: job.title || "N/A",
                    location:
                        job.normalized_location ||
                        job.location ||
                        `${job.city}, India`,
                    postedAt,
                    url: job.job_path
                        ? `https://www.amazon.jobs${job.job_path}`
                        : "N/A"
                };
            });

            allJobs.push(...mapped);

            if (jobs.length < 10) break;
        }

        //Keep sorting (same logic)
        allJobs.sort((a, b) => {
            if (!a.postedAt) return 1;
            if (!b.postedAt) return -1;
            return b.postedAt - a.postedAt;
        });

        return allJobs;

    } catch (err) {
        console.error("Amazon Fetch Error:", err.message);
        return [];
    }
}

module.exports = { fetchAmazonJobs };