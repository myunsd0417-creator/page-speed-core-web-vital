// Page Speed & Core Web Vitals Checker — Apify Actor
// Runs Google Lighthouse (lab data) in a headless Chrome for each URL the user provides.
// No API key needed. Charges one "page-tested" event per successfully tested URL & device.
import { Actor, log } from 'apify';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
    urls = [],
    device = 'mobile',
    maxUrls = 20,
    language = 'en',
} = input;

const ja = language === 'ja';
const t = (en, jp) => (ja ? jp : en);

const list = [...new Set(
    urls.map((u) => (typeof u === 'string' ? u : u?.url)).filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim())).map((u) => u.trim()),
)].slice(0, maxUrls);

if (!list.length) {
    await Actor.fail('Input "urls" must contain at least one full URL starting with http:// or https://');
}

const devices = device === 'both' ? ['mobile', 'desktop'] : [device === 'desktop' ? 'desktop' : 'mobile'];

const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH || process.env.APIFY_CHROME_EXECUTABLE_PATH || undefined,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const ms = (v) => (typeof v === 'number' ? Math.round(v) : null);
const pct = (v) => (typeof v === 'number' ? Math.round(v * 100) : null);
const rate = (metric, value) => {
    // Google's Core Web Vitals / Lighthouse thresholds
    const th = { lcp: [2500, 4000], fcp: [1800, 3000], tbt: [200, 600], cls: [0.1, 0.25], si: [3400, 5800] }[metric];
    if (value == null || !th) return null;
    return value <= th[0] ? 'good' : value <= th[1] ? 'needs-improvement' : 'poor';
};

let tested = 0;
const results = [];

outer: for (const url of list) {
    for (const dev of devices) {
        log.info(`Testing ${url} (${dev})`);
        try {
            const config = dev === 'desktop' ? desktopConfig : undefined;
            const runner = await lighthouse(url, {
                port: chrome.port,
                output: 'json',
                logLevel: 'error',
                onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
                locale: ja ? 'ja' : 'en',
                maxWaitForLoad: 45000,
            }, config);
            const lhr = runner?.lhr;
            if (!lhr || lhr.runtimeError) throw new Error(lhr?.runtimeError?.message || 'Lighthouse returned no result');

            const a = lhr.audits;
            const lcp = a['largest-contentful-paint']?.numericValue;
            const cls = a['cumulative-layout-shift']?.numericValue;
            const tbt = a['total-blocking-time']?.numericValue;
            const fcp = a['first-contentful-paint']?.numericValue;
            const si = a['speed-index']?.numericValue;

            // Lighthouse 12+ reports savings in metricSavings (insights); older audits use overallSavingsMs.
            const savings = (x) => Math.max(
                x.details?.overallSavingsMs ?? 0,
                x.metricSavings?.LCP ?? 0,
                x.metricSavings?.FCP ?? 0,
                x.metricSavings?.TBT ?? 0,
            );
            const seen = new Set();
            const opportunities = Object.values(a)
                .filter((x) => typeof x.score === 'number' && x.score < 0.9 && savings(x) >= 50)
                .sort((x, y) => savings(y) - savings(x))
                .filter((x) => (seen.has(x.title) ? false : seen.add(x.title)))
                .slice(0, 6)
                .map((x) => ({ title: x.title, estimatedSavingsMs: ms(savings(x)) }));

            const row = {
                url,
                finalUrl: lhr.finalDisplayedUrl || lhr.finalUrl || url,
                device: dev,
                performanceScore: pct(lhr.categories.performance?.score),
                seoScore: pct(lhr.categories.seo?.score),
                accessibilityScore: pct(lhr.categories.accessibility?.score),
                bestPracticesScore: pct(lhr.categories['best-practices']?.score),
                lcpMs: ms(lcp), lcpRating: rate('lcp', lcp),
                cls: typeof cls === 'number' ? Math.round(cls * 1000) / 1000 : null, clsRating: rate('cls', cls),
                tbtMs: ms(tbt), tbtRating: rate('tbt', tbt),
                fcpMs: ms(fcp), fcpRating: rate('fcp', fcp),
                speedIndexMs: ms(si), speedIndexRating: rate('si', si),
                pageWeightKb: a['total-byte-weight']?.numericValue ? Math.round(a['total-byte-weight'].numericValue / 1024) : null,
                requestCount: a['network-requests']?.details?.items?.length ?? null,
                topOpportunities: opportunities,
                testedAt: new Date().toISOString(),
                error: null,
            };
            await Actor.pushData(row);
            results.push(row);

            const charge = await Actor.charge({ eventName: 'page-tested' });
            tested++;
            if (charge?.eventChargeLimitReached) {
                log.info('Spending limit reached — stopping.');
                break outer;
            }
        } catch (e) {
            log.warning(`Failed: ${url} (${dev}) — ${e.message}`);
            const row = { url, device: dev, error: e.message, testedAt: new Date().toISOString() };
            await Actor.pushData(row);
            results.push(row);
        }
    }
}

await chrome.kill();

await Actor.setValue('REPORT.html', renderHtml(results), { contentType: 'text/html; charset=utf-8' });
log.info(`Done. ${tested} page test(s) charged.`);
await Actor.exit();

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function cell(v, r, unit = '') {
    if (v == null) return '<td>—</td>';
    const color = { good: '#0a7f4f', 'needs-improvement': '#b26a00', poor: '#c0262d' }[r] || '#222';
    return `<td style="color:${color};font-weight:600">${v}${unit}</td>`;
}
function scoreCell(v) {
    if (v == null) return '<td>—</td>';
    const color = v >= 90 ? '#0a7f4f' : v >= 50 ? '#b26a00' : '#c0262d';
    return `<td style="color:${color};font-weight:700">${v}</td>`;
}
function renderHtml(rows) {
    const body = rows.map((r) => (r.error
        ? `<tr><td>${esc(r.url)}</td><td>${r.device}</td><td colspan="6" style="color:#c0262d">${esc(r.error)}</td></tr>`
        : `<tr><td><a href="${esc(r.url)}">${esc(r.url)}</a></td><td>${r.device}</td>${scoreCell(r.performanceScore)}${cell(r.lcpMs, r.lcpRating, ' ms')}${cell(r.cls, r.clsRating)}${cell(r.tbtMs, r.tbtRating, ' ms')}${scoreCell(r.seoScore)}<td>${r.topOpportunities.map((o) => `${esc(o.title)} (−${o.estimatedSavingsMs} ms)`).join('<br>')}</td></tr>`)).join('');
    return `<!doctype html><html lang="${ja ? 'ja' : 'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t('Page Speed Report', 'ページ速度レポート')}</title>
<style>body{font-family:system-ui,sans-serif;max-width:1100px;margin:24px auto;padding:0 16px;color:#222}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}.wrap{overflow-x:auto}</style>
<h1>${t('Page Speed & Core Web Vitals Report', 'ページ速度・Core Web Vitals レポート')}</h1>
<p>${t('Lab data from Google Lighthouse. Green = good, orange = needs improvement, red = poor.', 'Google Lighthouseによる計測値です。緑=良好、橙=要改善、赤=不良。')}</p>
<div class="wrap"><table><tr><th>URL</th><th>${t('Device', '端末')}</th><th>${t('Performance', '速度スコア')}</th><th>LCP</th><th>CLS</th><th>TBT</th><th>SEO</th><th>${t('Top fixes', '主な改善点')}</th></tr>${body}</table></div></html>`;
}
