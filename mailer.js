// utils/mailer.js
// Sends alerts via Telegram + Email simultaneously

const nodemailer = require("nodemailer");

const TELEGRAM_TOKEN   = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function formatDate(date) {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function escapeMarkdown(text) {
    if (!text) return "N/A";
    return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

function buildTelegramMessage(label, jobs) {
    const header  = `🚀 *${jobs.length} New Job${jobs.length > 1 ? "s" : ""} — ${escapeMarkdown(label).toUpperCase()}*`;
    const divider = `\n${"─".repeat(28)}\n`;
    const lines   = jobs.map((job, i) => [
        `*${i + 1}\\. ${escapeMarkdown(job.title)}*`,
        `📍 ${escapeMarkdown(job.location || "N/A")}`,
        `🕒 ${formatDate(job.postedAt)}`,
        `🔗 [Apply Here](${job.url})`,
    ].join("\n"));
    return header + divider + lines.join(divider) + divider;
}

async function sendTelegram(company, label, jobs) {
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn("  [telegram] Token or Chat ID not set — skipping");
        return;
    }
    const CHUNK = 5;
    for (let i = 0; i < jobs.length; i += CHUNK) {
        const chunk   = jobs.slice(i, i + CHUNK);
        const message = buildTelegramMessage(label || company, chunk);
        const res     = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                chat_id:                  TELEGRAM_CHAT_ID,
                text:                     message,
                parse_mode:               "MarkdownV2",
                disable_web_page_preview: true,
            }),
        });
        const data = await res.json();
        if (!data.ok) console.error(`  [telegram] Failed: ${data.description}`);
        if (i + CHUNK < jobs.length) await new Promise(r => setTimeout(r, 500));
    }
    console.log(`  [telegram] ✅ Sent ${jobs.length} jobs for ${label || company}`);
}

let transporter = null;
function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: "smtp.gmail.com", port: 465, secure: true,
            auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS },
            family: 4,
        });
    }
    return transporter;
}

function buildEmailHtml(label, jobs) {
    return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;">
        <h2 style="color:#2c3e50;">🚀 ${jobs.length} New Job${jobs.length > 1 ? "s" : ""} — ${label}</h2><hr/>
        ${jobs.map((job, i) => `
            <div style="margin-bottom:20px;">
                <h3 style="margin:0;color:#34495e;">${i + 1}. ${job.title || "N/A"}</h3>
                <p><strong>📍</strong> ${job.location || "N/A"}</p>
                <p><strong>🕒</strong> ${formatDate(job.postedAt)}</p>
                <p><a href="${job.url}" style="color:#1d4ed8;">🔗 Apply Here</a></p><hr/>
            </div>`).join("")}
        <p style="color:#888;font-size:12px;">Job Alerter v2</p>
    </div>`;
}

async function sendEmailAlert(company, label, jobs) {
    if (!process.env.EMAIL || !process.env.EMAIL_PASS) {
        console.warn("  [email] EMAIL or EMAIL_PASS not set — skipping");
        return;
    }
    try {
        await getTransporter().sendMail({
            from:    process.env.EMAIL,
            to:      process.env.EMAIL,
            subject: `🚀 ${jobs.length} New Jobs — ${label || company}`,
            html:    buildEmailHtml(label || company, jobs),
        });
        console.log(`  [email] ✅ Sent for ${label || company}`);
    } catch (err) {
        console.error(`  [email] Failed: ${err.message}`);
    }
}

async function sendEmail(company, label, jobs) {
    if (!jobs || !jobs.length) return;
    await Promise.allSettled([
        sendTelegram(company, label, jobs),
        sendEmailAlert(company, label, jobs),
    ]);
}

module.exports = { sendEmail };
