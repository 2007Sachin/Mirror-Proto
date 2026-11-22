# Financial Analyst Interview Prep (Indian Startups)

## Overview
Financial Analyst hiring at Indian startups, especially in fintech and consumer internet (companies such as Razorpay, CRED and Zerodha are typical examples, and stages vary widely), differs from traditional corporate finance hiring because the role is often a generalist hybrid of FP&A, controllership, and strategy, usually in a small finance team with limited room for narrow specialists. Interviews weight driver-based modeling under uncertainty, cash burn and runway discipline, and startup-specific unit economics (take rate, CAC/LTV, NPA, GMV vs net revenue) far more heavily than textbook DCF or ratio analysis. Candidates are expected to be Excel-fluent builders who can go from messy, limited-history data to a board-ready number within hours, and to communicate that number convincingly to non-finance founders and product leaders.

## Interview Rounds

### Round 1: Accounting & Excel Fundamentals Screen
**Tests:** Command of core accounting mechanics (three-statement linkages, accruals, working capital) and practical Excel fluency (lookups, pivots, data cleaning) needed to operate independently without heavy supervision in a small team.

**Practice Questions:**
1. Walk me through how a Rs 10 lakh increase in prepaid expenses flows through the three financial statements.
2. If a company recognizes revenue on a subscription basis but collects cash upfront, how does deferred revenue appear on the balance sheet, and how does it reverse over time?
3. Explain the difference between accrual and cash accounting using an example of a payments company recognizing processing-fee revenue.
4. How would you calculate net working capital for an e-commerce startup with high inventory and payables, and why does it matter for cash flow?
5. What's the difference between gross merchandise value (GMV) and net revenue for a marketplace business, and why do investors care about the distinction?
6. Describe the Excel formula you'd use to pull a product's monthly revenue from a transaction-level table using SUMIFS with multiple criteria (month, category, status = "completed").
7. How would you build a dashboard in Excel that lets a user toggle between monthly and quarterly views using a single dropdown or pivot slicer?
8. A vendor expense report has duplicate entries with slightly different spellings. How would you clean and reconcile this dataset before analysis?
9. Explain what a circular reference is in a financial model (e.g., interest expense feeding into cash, which feeds into the debt schedule) and how you'd resolve it without breaking the model.
10. If asked to audit a colleague's Excel model for errors before it goes to the CFO, what are the first five checks you would run?

### Round 2: Financial Modeling Case Study
**Tests:** Ability to build or extend a driver-based operating model from scratch under time pressure, reflecting the real startup constraint of limited historical data and fast-changing assumptions.

**Practice Questions:**
1. Build a 12-month revenue forecast for a UPI-based payments startup given monthly transaction volume growth, average transaction value, and a declining take rate — show your driver tree.
2. Given 6 months of actuals for a D2C brand's orders, AOV, and return rate, build an 18-month rolling forecast and flag the two assumptions most likely to break it.
3. How would you model headcount cost for a 150-person startup hiring 40 more people across engineering, sales, and support, factoring in notice-period lag and attrition?
4. Model the EBITDA impact if the company cuts CAC by 20% but new customer adds also fall by 15% as a result.
5. Build a cohort-based retention model for a subscription product (CRED-style rewards app) and use it to project 24-month revenue from a single acquisition cohort.
6. A lending startup's NPA rate rises from 2% to 4% in a quarter. Walk through how you'd adjust provisioning expense and its effect on the P&L and balance sheet.
7. How would you build a best/base/worst-case scenario toggle into a model so leadership can flex growth and churn assumptions with one click?
8. Given monthly fixed costs and variable cost per unit, build a breakeven analysis for a new product line and identify the sales volume needed to breakeven by month 9.
9. The company has only 9 months of history post-pivot. How do you build a credible annual plan despite the thin base, and what external proxies would you use?
10. Walk through how you'd stress-test a model for a 30% drop in Q4 bookings — which line items move first, and how do you flag the risk to the CFO?

### Round 3: Valuation & Unit Economics
**Tests:** Grasp of valuation frameworks suited to early-stage companies and fluency in startup-specific unit economics (LTV/CAC, contribution margin, burn multiple, take-rate economics) used to assess business health and support fundraising narratives.

**Practice Questions:**
1. How would you value a pre-revenue or early-revenue startup where DCF isn't meaningful — what methods would you use instead (VC method, comparable GMV/revenue multiples)?
2. Calculate LTV:CAC for a fintech app given monthly churn, ARPU, gross margin, and blended CAC — and assess whether a 2:1 ratio is healthy at this stage.
3. How does a payment aggregator's take rate compound into net revenue, and why might net revenue margin shrink even as GMV grows rapidly?
4. Explain contribution margin versus gross margin for a quick-commerce business, and why order-level unit economics matter more than company-level P&L early on.
5. What is CAC payback period, and how would you calculate it for a startup with a 6-month free trial before monetization begins?
6. If asked to defend the company's valuation to existing investors in a down-round scenario, which metrics (ARR growth, net dollar retention, burn multiple) would you lead with and why?
7. How would you calculate "burn multiple" (net burn ÷ net new ARR), and why do growth-stage investors prefer it over absolute burn figures?
8. Walk through comparable company analysis for a stock-broking platform like Zerodha — how would you pick comps, and which multiples (P/E, revenue, AUM) would be most relevant?
9. A lending startup earns both interest income and processing fees. How would you separate and analyze unit economics of the lending book versus the fee business?
10. If LTV is rising but CAC is rising faster, what would you investigate first, and how would you communicate the trend to leadership?

### Round 4: Business Acumen & Behavioral
**Tests:** Ability to translate numbers into recommendations non-finance stakeholders can act on, and cultural fit with a fast-paced, resource-constrained, low-hierarchy environment.

**Practice Questions:**
1. Tell me about a time you delivered a financial recommendation that was unpopular with a business or product team — how did you handle the pushback?
2. Walk me through a time you found a significant error in a model or report right before it was due to leadership — what did you do?
3. How do you prioritize when the CEO wants a board deck by Friday, the CFO wants a variance analysis by Wednesday, and a business head wants ad hoc numbers today?
4. Describe a time you had to explain a complex financial concept (deferred revenue, burn multiple) to a non-finance founder or product manager.
5. Tell me about a time you worked with incomplete or messy data and still had to produce a reliable number for a decision-maker.
6. How do you build trust with business teams who see FP&A as "the people who say no" to their budget requests?
7. Describe a time you proactively flagged a risk (slowing growth, rising churn, tightening cash runway) before anyone asked you to.
8. How do you stay accurate and detail-oriented while moving fast enough to keep pace with a startup's rate of change?
9. Tell me about a time your forecast was significantly wrong — what did you learn, and how did you change your process afterward?
10. Why do you want to move from a larger or more traditional finance environment into an early-to-growth stage startup, and what do you think will be hardest about that transition?

### Round 5: CFO / Leadership Round
**Tests:** Strategic maturity and judgment under ambiguity — whether the candidate can be a trusted thought partner on capital allocation and growth trade-offs, not just a number-cruncher.

**Practice Questions:**
1. If you joined us today, what are the first three things you'd want to understand about our business before touching a model?
2. How would you advise the CEO if burn increased 30% month-over-month while the sales pipeline is softening — what trade-offs would you lay out?
3. What does a healthy cash runway look like for a company at our stage, and how would you structure monthly runway reporting to the board?
4. If asked to cut 15% of operating costs next quarter without touching headcount, where would you look first and why?
5. How would you balance a founder who wants to show aggressive growth to investors against a finance function that wants conservative, defensible numbers?
6. Walk me through how you'd set up a monthly business review (MBR) deck for leadership — what 5-6 metrics would you insist on including every month?
7. Our next fundraise is 9-12 months away. What financial narrative and metrics would you start preparing now to support that raise?
8. How do you think about the trade-off between investing in growth versus extending runway when the market turns more cautious on startup funding?
9. Describe how you would build finance's credibility in a company where finance has historically been seen as a back-office cost center.
10. What's one assumption in a typical startup financial model that you think gets underestimated or overlooked most often, and why?

## Tips
- Build a small portfolio of 2-3 self-made models (a SaaS cohort model, a marketplace GMV/take-rate model, a cash runway tracker) you can walk through live — interviewers consistently probe for hands-on build ability, not just theory.
- Get fluent in the vocabulary of the specific business model you're interviewing for: take rate and float for payments, NPA and provisioning for lending, AUM and brokerage yield for broking, GMV and contribution margin for commerce.
- Practice narrating assumptions out loud as you build, not just the output — interviewers are evaluating your reasoning process under ambiguity as much as the final number.
- Expect to work with incomplete data; state your assumptions explicitly and show how you'd validate or stress-test them rather than waiting for "clean" data that won't exist.
- Prepare one real story each for finding an error under deadline pressure, pushing back on a business team, and proactively flagging a risk — these come up in nearly every behavioral round.
