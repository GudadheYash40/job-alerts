async function fetchDeepIntentJobs(url) {
    try {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        const jobs = data?.jobPosts?.data || [];

        const mapped = jobs.map(job => ({
            id: job.id,
            title: job.title || "N/A",
            location: job.location?.trim() || "N/A",
            postedAt: job.updated_at
                ? new Date(job.updated_at)
                : job.published_at
                ? new Date(job.published_at)
                : null,
            url: job.absolute_url || "N/A"
        }));

        // sort latest first (safety)
        mapped.sort((a, b) => {
            if (!a.postedAt) return 1;
            if (!b.postedAt) return -1;
            return b.postedAt - a.postedAt;
        });

        return mapped;

    } catch (err) {
        console.error("DeepIntent Fetch Error:", err.message);
        return [];
    }
}

module.exports = { fetchDeepIntentJobs };