async function fetchCitiJobs(url) {

    const allJobs = [];

    for (let page = 1; page <= 5; page++) {

        const res = await fetch(`${url}&page=${page}`, {
            method: "GET",
            headers: {
                "accept": "application/json",
                "user-agent": "Mozilla/5.0",
                "referer": "https://jobs.citi.com/"
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
        }

        const data = await res.json();

        const jobs = data?.data || data?.jobs || [];

        if (!jobs.length) break;

        for (const job of jobs) {
            allJobs.push({
                id: job.jobId || job.id,
                title: job.title || job.jobTitle || "N/A",
                location: job.location || `${job.city || ""}, ${job.country || ""}`,
                postedAt: job.postedDate ? new Date(job.postedDate) : null,
                url: job.applyUrl || `https://jobs.citi.com/job/${job.jobId || job.id}`
            });
        }

        allJobs.sort((a, b) => {
            if (!a.postedAt) return 1;
            if (!b.postedAt) return -1;
            return b.postedAt - a.postedAt;
        });

        if (jobs.length < 10) break;
    }

    return allJobs;
}

module.exports = { fetchCitiJobs };
