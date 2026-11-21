# Product Manager Interview Prep (Indian Startups)

## Overview
PM hiring at Indian seed-to-growth startups (Swiggy, Razorpay, CRED, Meesho, Zepto, and peers) is built for generalists who can operate with incomplete data, thin specs, and fast-changing priorities rather than specialists who've only shipped inside mature processes. Interviewers weight scrappiness, cost/latency sensitivity for a price-conscious market, and hands-on SQL/analytics fluency more heavily than at MNC product orgs, since most teams don't have dedicated analysts. Loops are shorter (often 3-5 rounds across 2-4 weeks) and frequently include a direct founder or leadership round, since culture fit and ownership mindset weigh as much as frameworks.

## Interview Rounds

### Round 1: Product Sense & Case Study
**Tests:** This round evaluates user empathy, structured thinking under ambiguity, and the ability to translate a vague prompt into a concrete, prioritized product design grounded in the company's actual market (India-specific constraints like low-bandwidth users, trust deficits, cash-on-delivery, vernacular users).

**Practice Questions:**
1. How would you redesign the Swiggy/Zomato post-order experience to reduce "where is my order" support tickets?
2. A merchant on Razorpay complains that onboarding takes too long. How would you redesign the onboarding flow?
3. Design a feature to increase repeat usage on CRED for users who already pay bills on time and have no missed-payment anxiety.
4. How would you design Meesho's product discovery for a first-time reseller in a Tier-3 town with a low-end Android phone?
5. Zepto wants to improve basket size for 10-minute grocery delivery without hurting delivery speed. What would you build?
6. How would you design a trust-building feature for first-time users of a P2P lending app in India?
7. You're the PM for Swiggy Instamart. How would you decide whether to launch a subscription/loyalty program?
8. Design a feature for Razorpay to help small merchants reconcile payments without a finance team.
9. How would you improve the checkout experience for users who abandon carts due to payment failures on a low-connectivity network?
10. CRED wants to expand beyond credit-card users to a broader segment. What product would you build, and who is it for?

### Round 2: Analytical / Metrics & SQL
**Tests:** This round evaluates quantitative rigor — defining the right success metrics, diagnosing a metric drop through root-cause analysis, and writing/interpreting SQL queries against product data, since most startup PMs pull their own data without an analyst.

**Practice Questions:**
1. Weekly active users on your food delivery app dropped 8% in one city but not others. Walk through your root-cause analysis.
2. How would you define North Star and guardrail metrics for a UPI-based payments product?
3. Write a SQL query to find the percentage of users who made a second order within 7 days of their first order.
4. Order-to-delivery time increased by 15% this month on a quick-commerce app. What data would you pull first, and in what order?
5. How would you measure whether a new "buy now, pay later" feature is cannibalizing full-payment transactions versus growing overall GMV?
6. Given a table of transactions (user_id, merchant_id, amount, status, created_at), write a query to find merchants with a payment success rate below 90% in the last 30 days.
7. A/B test shows a new onboarding flow increases signups by 12% but decreases day-30 retention by 5%. Would you ship it? How would you decide?
8. How would you set up funnel metrics to diagnose drop-off between "add to cart" and "order placed" on an e-commerce app?
9. Define the key metrics you'd track for a merchant-facing dashboard feature in its first 90 days post-launch.
10. Write a SQL query to find the top 3 most-ordered items per city last month using window functions.

### Round 3: Execution & Prioritization
**Tests:** This round evaluates the candidate's ability to scope ambiguous problems into a shippable plan, make trade-offs between speed, quality, and resources, and communicate a roadmap under real-world constraints like a small engineering team or a tight runway.

**Practice Questions:**
1. You have two engineers and three weeks before a board demo. How would you prioritize features for a new seller dashboard?
2. Engineering says a requested feature will take 6 weeks; the founder wants it in 2. How do you resolve this?
3. How would you prioritize a backlog that includes a critical bug fix, a growth experiment, and a partner-requested integration, with only one sprint of capacity?
4. Walk me through how you'd write a PRD for a feature with no existing data to validate the problem.
5. A key feature you shipped is underperforming against its goal metric three weeks post-launch. What do you do next?
6. How would you decide between building an in-house KYC flow versus integrating a third-party vendor for a lending startup?
7. Your team is split between fixing tech debt that's slowing releases and shipping a new feature a large customer is asking for. How do you decide?
8. Describe how you'd run a successful beta launch for a new payment method with 1% of traffic before a full rollout.
9. A competitor just launched a feature your leadership is pushing you to copy within a month. How do you respond?
10. How would you structure a 90-day plan after joining as PM for a product that's growing but has no clear ownership of its core funnel?

### Round 4: Behavioral / Leadership
**Tests:** This round evaluates ownership, stakeholder management, and conflict-resolution skills through STAR-style stories, probing how the candidate operates under pressure, handles disagreement with engineering or leadership, and learns from failure.

**Practice Questions:**
1. Tell me about a time you shipped something that failed. What did you learn, and what would you do differently?
2. Describe a situation where you strongly disagreed with your engineering lead or manager. How did you resolve it?
3. Tell me about a time you had to influence a stakeholder without direct authority over them.
4. Describe a time you had to say no to a feature request from a senior leader or founder. How did you handle it?
5. Tell me about a decision you made with incomplete data. How did you validate you made the right call?
6. Describe the most difficult trade-off you've made between user experience and business metrics.
7. Tell me about a time a project failed because of poor cross-functional coordination. What was your role, and what changed afterward?
8. Describe a time you had to deliver difficult feedback to a designer, engineer, or peer PM.
9. Tell me about a time you took ownership of a problem that wasn't technically your responsibility.
10. Describe how you've handled working with a team that was understaffed or under-resourced relative to the ask.

### Round 5: Founder / Culture-Fit
**Tests:** This round evaluates alignment with the company's mission, risk appetite, and working style, assessing whether the candidate can thrive with startup-level ambiguity, limited process, and direct accountability to leadership.

**Practice Questions:**
1. Why do you want to join us specifically, versus a larger, more established company?
2. What's a product decision we've made publicly that you'd have done differently, and why?
3. How do you operate when there's no clear process or playbook for a decision you need to make today?
4. What's your biggest weakness as a PM, and how has it shown up in a real project?
5. Where do you see our biggest product or market risk over the next 12 months?
6. Tell me about a time you had to move fast with 70% confidence instead of waiting for 100% certainty.
7. How do you handle working directly with founders who may change direction frequently?
8. What would you build first in your initial 30 days if you joined this team?
9. How do you think about building for price-sensitive Indian users versus optimizing for engagement or margin?
10. What questions do you have for us about the company's current challenges or trajectory?

## Tips
- Research the company's actual product mechanics before the interview (e.g., how Swiggy's delivery-partner matching works, how Razorpay routes a payment) — generic frameworks without specifics read as unprepared.
- Practice SQL hands-on (joins, window functions, subqueries) even for PM roles; several Indian startups screen for it directly rather than treating it as a nice-to-have.
- Structure every case-study answer explicitly: clarify the user/goal, state assumptions, prioritize 2-3 solutions, and define a metric to measure success — interviewers are scoring the process, not just the final idea.
- Prepare STAR stories that show ownership and conflict resolution with limited resources, since startup interviewers probe for scrappiness more than polish.
- In founder/culture-fit rounds, have a genuine, specific point of view on the company's product and market — vague enthusiasm is a common rejection reason at this stage.

## Sources
- [Meesho Product Manager Interview Questions + Guide in 2025](https://www.interviewquery.com/interview-guides/meesho-product-manager)
- [Swiggy interview guide](https://dataford.io/interview-guides/swiggy/product-manager)
- [Razorpay product manager interview](https://productmanagementjob.com/interview/razorpay-product-manager)
- [Product-Based Companies Interview Prep India 2026: Flipkart, Swiggy, Razorpay, Zomato & More](https://claveprep.com/blog/product-based-companies-interview-prep-india-2026)
- [32 Senior Product Manager Interview Questions (India Centric)](https://medium.com/@product-manager/32-senior-product-manager-interview-questions-india-centric-8585ad048a69)
- [How to crack Product Sense Interview Round?](https://thetechhope.substack.com/p/how-to-crack-product-sense-interview)
- [Product metric interview questions](https://igotanoffer.com/blogs/product-manager/product-metric-interview-questions)
- [The PM Guide: Product Execution Interviews](https://www.rocketblocks.me/guide/pm/product-execution-interviews.php)
- [Nailing Product Manager Interview for Startups](https://productleadership.com/?p=73743)
- [7 Product Manager Interview Tips for Startup Roles](https://underdog.io/blog/product-manager-interview-tips)
