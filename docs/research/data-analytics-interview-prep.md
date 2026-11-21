# Data Analytics Interview Prep (Indian Startups)

## Overview
Data analyst hiring at seed-to-growth Indian startups (Swiggy, Zomato, Razorpay, CRED, and similarly-staged companies) leans heavily on business-metrics fluency over academic rigor — interviewers care more about whether you can connect a SQL query to a revenue or retention decision than whether you know every window function syntax. SQL is treated as a baseline, non-negotiable skill tested in almost every round, while statistics/A-B testing appears mostly in product-heavy orgs (fintech, food-delivery, consumer apps) running constant experiments. Because these companies are lean and flat, analysts are expected to talk directly to product, ops, and growth stakeholders, so communication and "so what" framing are evaluated nearly as hard as technical correctness. Tooling expectations skew toward SQL + Excel/Sheets + one BI tool (Power BI, Tableau, or Metabase) plus Python/R for the more data-mature teams.

## Interview Rounds

### Round 1: Online Assessment / SQL Technical Screen
**Tests:** Core SQL fluency (joins, aggregation, window functions, subqueries) and basic query-writing speed/accuracy under time pressure, usually via a HackerEarth/HackerRank-style timed test or a live screen-share query round.

**Practice Questions:**
1. Write a query to find the second-highest order value per city from an `orders` table.
2. Given a `transactions` table with `user_id`, `txn_date`, `amount`, write a query for the cumulative (running) revenue per user by month.
3. Find customers who placed orders in every month of the last quarter using `orders(user_id, order_date)`.
4. Write a query to identify duplicate rows in a `restaurants` table based on `name` and `address`, keeping only the latest `created_at`.
5. From a `delivery_partners` and `deliveries` table, calculate each partner's average delivery time and rank partners within each city using a window function.
6. Write a query to compute month-over-month percentage growth in GMV from a `payments` table.
7. Given `users` and `logins` tables, write a query to find users who logged in on their signup day but never again (one-time users).
8. Explain the difference between `RANK()`, `DENSE_RANK()`, and `ROW_NUMBER()` and give a scenario where each is the correct choice.
9. Write a query to find the top 3 products by revenue in each category using a CTE and window function.
10. Given a self-referencing `employees(id, manager_id)` table, write a recursive query to list the full reporting chain for a given employee.

### Round 2: Business Case Study / Product Metrics
**Tests:** Structured business thinking — can the candidate convert a vague, open-ended business question into a hypothesis-driven analysis plan, pick the right metric, and reason about trade-offs the way a founder or product manager would.

**Practice Questions:**
1. Weekly order volume on our food-delivery app dropped 8% in one city but grew elsewhere — walk me through how you'd investigate.
2. Define the North Star metric you'd pick for a UPI-based payments app and justify why over alternatives like DAU or transaction count.
3. Our checkout funnel shows a 20% drop between "add to cart" and "payment initiated" — how would you diagnose the cause?
4. A growth team wants to launch a referral program — what metrics would you track to decide if it's working within 30 days?
5. Restaurant partner churn increased 15% quarter-over-quarter — design an analysis to identify the drivers.
6. How would you measure whether a new onboarding flow actually improved activation, not just vanity signups?
7. The CEO asks "why did revenue grow but profit didn't" — how do you structure the investigation using the data available?
8. Design a cohort retention analysis for a subscription product (e.g., CRED-style rewards app) and explain what a healthy curve looks like.
9. You're given ambiguous instructions from a stakeholder ("look into user drop-off") — how do you clarify scope and set expectations before starting?
10. A/B test shows a new UI increased clicks but decreased conversions — how would you reconcile this and what would you recommend shipping?

### Round 3: Statistics & A/B Testing
**Tests:** Statistical reasoning and experiment design — understanding of hypothesis testing, sample size/power, and common experimentation pitfalls that come up constantly at consumer/fintech startups running live experiments.

**Practice Questions:**
1. Explain p-value and statistical significance to a non-technical product manager in plain language.
2. How do you determine the minimum sample size needed for an A/B test on checkout conversion rate?
3. What is a Type I vs Type II error, and which would you prioritize avoiding when testing a pricing change?
4. Describe what "peeking" at A/B test results early can do to your conclusions, and how you'd prevent it.
5. What is the novelty effect in experimentation, and how would you design a test to detect it?
6. You run an A/B test and see a sample ratio mismatch (49/51 instead of 50/50) — what does this suggest and how do you proceed?
7. Explain when you'd use a t-test vs a chi-square test vs a Mann-Whitney U test in an analytics context.
8. How would you design an experiment to test a new discount strategy when network effects between users make standard A/B splitting risky?
9. Walk through calculating confidence intervals for a conversion rate lift and interpreting them for a stakeholder.
10. Your A/B test shows a statistically significant 2% lift, but the business impact seems small — how do you decide whether to ship it?

### Round 4: Tools & Dashboarding (Excel, Power BI/Tableau, Python)
**Tests:** Practical tool fluency — can the candidate build, debug, and explain an end-to-end reporting pipeline (data pull, cleaning, visualization) using the stack the company actually runs on daily.

**Practice Questions:**
1. Explain how you'd use pivot tables and `INDEX/MATCH` (or `XLOOKUP`) in Excel to reconcile two large transaction sheets.
2. Walk through building a DAX measure in Power BI to calculate a rolling 7-day average of daily active users.
3. In Tableau, how would you build a cohort retention heatmap from raw event-level data?
4. Describe how you'd clean a messy CSV export (missing values, inconsistent date formats, duplicate IDs) using Python/pandas before loading it into a dashboard.
5. What's the difference between a calculated field and a calculated measure, and when would you use each in a BI tool?
6. How would you design a single-page executive dashboard for a seed-stage startup's weekly business review — what 5-6 metrics would you include and why?
7. Explain how you'd set up a parameterized/filterable dashboard so different city managers see only their own city's data.
8. Write a Python snippet (pandas) to detect outliers in a `delivery_time` column using the IQR method.
9. How do you decide between building something in Excel vs. Python vs. a BI tool for a one-off analysis request?
10. A dashboard's numbers don't match the data warehouse's source-of-truth report — how do you debug the discrepancy?

### Round 5: Behavioral & Stakeholder Communication
**Tests:** Communication, prioritization, and cross-functional collaboration skills — whether the candidate can manage ambiguous asks, push back constructively, and translate analysis into decisions for non-technical stakeholders, a core expectation in flat startup teams.

**Practice Questions:**
1. Tell me about a time you had to push back on a stakeholder's request because the data didn't support their assumption.
2. Describe a situation where two teams wanted conflicting metrics prioritized — how did you resolve it?
3. Walk me through a time your analysis directly changed a business decision.
4. How do you handle a situation where a senior leader asks for a report "by end of day" that would normally take two days to do properly?
5. Tell me about a time you found an error in your own analysis after sharing it — what did you do?
6. How do you present a nuanced or negative finding (e.g., a feature isn't working) to the person who championed that feature?
7. Describe how you'd explain a complex statistical result (like a confidence interval) to a founder with no data background.
8. Tell me about a time you had to work with incomplete or messy data and still needed to deliver an actionable insight.
9. How do you prioritize when you have five ad-hoc stakeholder requests and one quarterly deep-dive due the same week?
10. Describe a time you disagreed with a product/growth decision based on your data — how did you voice it and what was the outcome?

## Tips
- Treat SQL as table stakes, not a differentiator — practice window functions, CTEs, and self-joins until they're fluent, since nearly every round (even case studies) expects you to sketch a query on a whiteboard or doc.
- Always anchor answers in a metric and a "so what": Indian startup interviewers consistently reward candidates who frame analysis around business impact (revenue, retention, CAC) rather than technical elegance.
- Prepare 2-3 STAR-format stories in advance covering pushing back on stakeholders, catching your own mistake, and influencing a decision — behavioral rounds at these companies are structured but often under-rehearsed by candidates.
- For the tools round, be ready to explain your dashboard/report choices end-to-end (why this chart, why this metric, how you'd debug a mismatch), not just demonstrate syntax.
- Research the specific company's product and recent metrics moves (pricing changes, new cities, funding stage) before the case-study round — interviewers often adapt generic case prompts to the company's actual current problems.

## Sources
- [Swiggy Data Analyst Interview Questions + Guide](https://www.interviewquery.com/interview-guides/swiggy-data-analyst)
- [Razorpay Data Analyst Interview Guide](https://www.interviewquery.com/guides/razorpay-data-analyst)
- [Swiggy Data Analyst Interview Process — 2026 Guide](https://skillsetmaster.com/data-analyst-interview/swiggy)
- [SQL Interview Questions for Data Analysts (2025): Real Scenarios + Answers](https://www.interviewquery.com/p/sql-questions-data-analyst)
- [Koo India Data Analyst Interview Guide](https://www.interviewquery.com/interview-guides/koo-india-data-analyst)
- [Data Analyst Interview Questions 2026: 50 Questions with Expert Answers](https://growai.in/data-analyst-interview-questions-2026/)
- [CRED Data Analyst Interview Guide](https://www.interviewquery.com/interview-guides/cred-data-analyst)
- [CRED Data Analyst Interview Process — 2026 Guide](https://skillsetmaster.com/data-analyst-interview/cred)
- [Top 60 Statistics & A/B Testing Interview Questions (2025)](https://www.interviewquery.com/p/statistics-ab-testing-interview-questions)
- [Data Analyst Interview Prep (2025 Guide)](https://nazariancareers.csun.edu/blog/2025/06/09/data-analyst-interview-prep-2025-guide/)
