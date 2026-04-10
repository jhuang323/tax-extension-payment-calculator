# 2025 Tax Extension Payment Calculator

**A free, client-side tool that tells your clients exactly how much to pay with their federal and California tax extension — in under 2 minutes.**

Built by [JH Group CPA](https://jhgroupcpa.com) for tax professionals and their clients. No login, no server, no data ever leaves the browser.

---

## Why We Built This

Every April, clients call with the same question: *"How much should I send in with my extension?"*

Getting it wrong is expensive — underpay and you face IRS interest (currently 7% APR) plus a 0.5%/month late payment penalty. Overpay and you've given the government an interest-free loan.

This calculator solves that. Enter three numbers from last year's return, make a rough guess at this year's income, and get a precise, safe-harbor-based payment recommendation in seconds.

---

## Features

- **Federal + California** extension payments calculated simultaneously
- **Safe harbor engine** — automatically applies the correct threshold (100% or 110% of prior year, or 90% of current year estimate) based on AGI and filing status
- **Penalty & interest projections** — shows exactly what underpaying will cost
- **Three risk scenarios** — Conservative, Standard, and Aggressive options so clients can choose their own comfort level
- **Quick Estimator** — built-in federal and CA tax estimator using 2025 brackets, so clients don't need to know their tax liability ahead of time
- **Direct payment links** — IRS Direct Pay, EFTPS, and CA FTB Web Pay
- **Printable summary** — clean one-page printout with all figures, ready to hand to a client
- **Zero dependencies** — pure HTML, CSS, and vanilla JavaScript. No build step, no npm, no frameworks
- **Dark mode UI** — professional branded design, works on mobile and desktop

---

## Live Demo

> Deploy it yourself in 30 seconds — see the [Deployment](#deployment) section below.

---

## Screenshot

![2025 Tax Extension Payment Calculator — JH Group CPA](Screenshot-Calculator.png)

*Enter three numbers from last year's return, get an instant safe-harbor payment recommendation with federal and California breakdowns.*

---

## How It Works

The calculator uses IRS and CA FTB safe harbor rules to determine the **minimum payment required to avoid penalties**:

### Federal (Form 4868)
| Prior Year AGI | Safe Harbor Rule |
|---|---|
| ≤ $150,000 (≤ $75,000 MFS) | 100% of prior year tax, or 90% of current year estimate — whichever is **less** |
| > $150,000 (> $75,000 MFS) | 110% of prior year tax, or 90% of current year estimate — whichever is **less** |

**Extension payment = Safe harbor amount − payments already made (withholding + quarterly estimates)**

### California (FTB 3519)
| CA AGI | Safe Harbor Rule |
|---|---|
| ≤ $150,000 | 100% of prior year CA tax, or 90% of current year — whichever is less |
| $150,001–$999,999 | 110% of prior year CA tax, or 90% of current year — whichever is less |
| ≥ $1,000,000 | Must use 90% of current year (millionaire's rule) |

---

## Deployment

The entire app is four static files. No server-side code, no database, no build process.

### Option 1 — GitHub Pages (Free, Recommended)

1. Fork or clone this repo
2. Go to **Settings → Pages** in your GitHub repo
3. Set source to `main` branch, `/ (root)` folder
4. Your calculator is live at `https://yourusername.github.io/repo-name`

### Option 2 — Netlify Drop (30 seconds)

1. Go to [netlify.com/drop](https://app.netlify.com/drop)
2. Drag the project folder onto the page
3. Done — you get a live URL instantly with a free SSL certificate

### Option 3 — Any Static Host

Upload all four files to any web host (Cloudflare Pages, Vercel, S3 + CloudFront, your existing website, etc.). No configuration required.

### Option 4 — Run Locally

```bash
# Python (comes pre-installed on macOS and most Linux)
python -m http.server 3000
# Then open http://localhost:3000
```

```bash
# Node.js
npx serve .
# Then open http://localhost:3000
```

---

## Customization

All branding is in `index.html` and `style.css`. To white-label for your own firm:

| What to change | Where |
|---|---|
| Firm name & logo | `index.html` — search for `JH Group CPA` |
| Brand colors | `style.css` — search for `--color-primary` and `--color-gold` |
| Disclaimer text | `index.html` — bottom of the Payment Summary section |
| Page title & meta description | `index.html` `<head>` section |

No JavaScript changes needed for branding.

---

## File Structure

```
├── index.html   # All markup and UI structure
├── app.js       # All calculations and interactivity (vanilla JS)
├── style.css    # Component styles, layout, dark mode
└── base.css     # CSS custom properties, reset, typography
```

---

## Tax Year Coverage

This build covers **Tax Year 2025** returns filed on extension in 2026:

- 2025 federal tax brackets (10%–37%)
- 2025 CA tax brackets (1%–13.3% + Mental Health Services Tax)
- 2025 Social Security wage base ($176,100)
- 2025 standard deductions: $15,000 Single / $30,000 MFJ
- Extension deadline: **April 15, 2026** (federal and CA)

---

## Disclaimer

This tool provides **estimates only** and is intended to help clients make informed extension payment decisions. It does not constitute tax advice. Results depend on the accuracy of the inputs provided. Consult a licensed tax professional for guidance specific to your situation.

---

## About JH Group CPA

JH Group CPA is a full-service accounting and tax advisory firm. We work with individuals, business owners, and investors on tax planning, compliance, and financial strategy.

---

## License

MIT — free to use, modify, and deploy. Attribution appreciated but not required.
