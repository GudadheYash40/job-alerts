async function fetchWalmartJobs(url) {
    const allJobs = [];

    try {
        for (let page = 0; page < 4; page++) {
            const threadId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

            const payload = {
                query: `query GetJobSearchAssistant($chatRequest: JobChatRequest!) {
                    jobSearchAssistant(chatRequest: $chatRequest) {
                        tool_messages {
                            artifact {
                                jobs {
                                    job_id
                                    title
                                    jobPostingTitle
                                    city
                                    state
                                    country
                                    jobPostingStartDate
                                }
                            }
                        }
                    }
                }`,
                variables: {
                    chatRequest: {
                        thread_id: threadId,
                        messages: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text",
                                        text: "sort by newest and search again"
                                    }
                                ]
                            }
                        ],
                        channel: "job_search",
                        context: {
                            job_search_context: {
                                refined_query: "jobId == '*'",
                                locale: "en_US",
                                sort: "newest",
                                active_tab: "jobs",
                                job_page: page // 🔥 pagination here
                            }
                        }
                    }
                }
            };

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "user-agent": "Mozilla/5.0",
                    "origin": "https://careers.walmart.com",
                    "referer": "https://careers.walmart.com/"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            const jobs =
                data?.data?.jobSearchAssistant?.tool_messages?.[0]?.artifact?.jobs || [];

            if (!jobs.length) break;

            const mapped = jobs.map(job => ({
                id: job.job_id,
                title: job.jobPostingTitle || job.title || "N/A",
                location: `${job.city || ""}, ${job.state || ""}, ${job.country || ""}`,
                postedAt: job.jobPostingStartDate
                    ? new Date(job.jobPostingStartDate)
                    : null,
                url: job.job_id
                    ? `https://careers.walmart.com/us/en/jobs/${job.job_id}`
                    : "N/A"
            }));

            allJobs.push(...mapped);

            // stop early if last page
            if (jobs.length < 10) break;
        }

        // 🔥 keep sorting
        allJobs.sort((a, b) => {
            if (!a.postedAt) return 1;
            if (!b.postedAt) return -1;
            return b.postedAt - a.postedAt;
        });

        return allJobs;

    } catch (err) {
        console.error("Walmart Fetch Error:", err.message);
        return [];
    }
}

module.exports = { fetchWalmartJobs }