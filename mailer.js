// utils/mailer.js
// Telegram Bot Alerts — replaces email entirely
// No extra npm package needed — uses plain fetch()

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function formatDate(date) {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function formatJobMessage(company, jobs) {
    const header = `🚀 *${jobs.length} New Job${jobs.length > 1 ? "s" : ""} — ${company.toUpperCase()}*\n`;
    const divider = `\n${"─".repeat(30)}\n`;

    const jobLines = jobs.map((job, i) => {
        return [
            `*${i + 1}. ${escapeMarkdown(job.title)}*`,
            `📍 ${escapeMarkdown(job.location || "N/A")}`,
            `🕒 ${formatDate(job.postedAt)}`,
            `🔗 [Apply Here](${job.url})`,
        ].join("\n");
    });

    return header + divider + jobLines.join(divider) + divider;
}

// Escape special chars for Telegram MarkdownV2
function escapeMarkdown(text) {
    if (!text) return "N/A";
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

async function sendTelegram(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "Markdown",
            disable_web_page_preview: true,
        }),
    });

    const data = await res.json();

    if (!data.ok) {
        throw new Error(`Telegram error: ${data.description}`);
    }

    return data;
}

// Split into chunks if too many jobs (Telegram has 4096 char limit)
async function sendEmail(company, jobs) {
    if (!jobs.length) return;

    try {
        const CHUNK_SIZE = 5; // send 5 jobs per message

        for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
            const chunk = jobs.slice(i, i + CHUNK_SIZE);
            const message = formatJobMessage(company, chunk);
            await sendTelegram(message);

            // Small delay between messages to avoid rate limiting
            if (i + CHUNK_SIZE < jobs.length) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        console.log(`Telegram alert sent for ${company} (${jobs.length} jobs)`);

    } catch (err) {
        console.error("Telegram alert failed:", err.message);
    }
}

module.exports = { sendEmail };
