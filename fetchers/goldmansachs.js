async function fetchGoldmanJobs(url) {
    const allJobs = [];

    for (let page = 0; page < 3; page++) { // 20 * 3 = 60 jobs
        const payload = {
            operationName: "GetRoles",
            variables: {
                searchQueryInput: {
                    page: {
                        pageSize: 20,
                        pageNumber: page
                    },
                    sort: {
                        sortStrategy: "POSTED_DATE",
                        sortOrder: "DESC"
                    },
                    filters: [
                        {
                            filterCategoryType: "LOCATION",
                            filters: [
                                {
                                    filter: "India",
                                    subFilters: [
                                        {
                                            filter: "Karnataka",
                                            subFilters: [
                                                { filter: "Bengaluru", subFilters: [] }
                                            ]
                                        },
                                        {
                                            filter: "Maharashtra",
                                            subFilters: [
                                                { filter: "Mumbai", subFilters: [] }
                                            ]
                                        },
                                        {
                                            filter: "Telangana",
                                            subFilters: [
                                                { filter: "Hyderabad", subFilters: [] }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    experiences: ["EARLY_CAREER", "PROFESSIONAL"],
                    searchTerm: ""
                }
            },
            query: `query GetRoles($searchQueryInput: RoleSearchQueryInput!) {
                roleSearch(searchQueryInput: $searchQueryInput) {
                    totalCount
                    items {
                        roleId
                        jobTitle
                        locations {
                            city
                            country
                        }
                        externalSource {
                            sourceId
                        }
                    }
                }
            }`
        };

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "user-agent": "Mozilla/5.0",
                "origin": "https://higher.gs.com",
                "referer": "https://higher.gs.com/"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        const jobs = data?.data?.roleSearch?.items || [];

        if (!jobs.length) break;

        for (const job of jobs) {
            const locationObj = job.locations?.[0] || {};

            allJobs.push({
                id: job.roleId,
                title: job.jobTitle || "N/A",
                location: `${locationObj.city || ""}, ${locationObj.country || ""}`,
                postedAt: null, // ❗ no field available
                url: `https://higher.gs.com/roles/${job.externalSource?.sourceId}`
            });
        }

        allJobs.sort((a, b) => {
            if (!a.postedAt) return 1;
            if (!b.postedAt) return -1;
            return b.postedAt - a.postedAt;
        });

        if (jobs.length < 20) break;
    }

    return allJobs;
}

module.exports = {fetchGoldmanJobs}