# SQL practice roadmap from the 300-question PDF

Source: *300 Real SQL Interview Questions* (the owner's PDF). Questions are referenced by PDF number and a short title only; solutions are NOT copied. Topics and levels are MIRROR's own tagging, assigned from the shape of each question and of its reference solution (window functions, CTEs, joins, nested subqueries, length), then balanced so each level is a sensible share of the set.

**Totals:** 300 questions, Beginner 81, Pro 135, Advanced 84, 17 topics in 4 stages.

## The route at a glance

| Stage | Topic | Beginner | Pro | Advanced | Total |
|---|---|---:|---:|---:|---:|
| 1 · Foundations | Filtering, sorting and basics | 2 | 1 | 0 | 3 |
| 1 · Foundations | Aggregation and GROUP BY | 43 | 8 | 0 | 51 |
| 1 · Foundations | Joins and enriching rows | 2 | 11 | 1 | 14 |
| 1 · Foundations | Dates and time windows | 15 | 6 | 1 | 22 |
| 2 · Core patterns | Anti-joins, EXISTS and missing data | 6 | 27 | 1 | 34 |
| 2 · Core patterns | Subqueries and comparing to an average | 8 | 2 | 6 | 16 |
| 2 · Core patterns | Duplicates and set operations | 3 | 3 | 0 | 6 |
| 2 · Core patterns | Conditional aggregation, pivots and percentages | 2 | 4 | 1 | 7 |
| 3 · Interview staples | Nth highest and ranking | 0 | 24 | 8 | 32 |
| 3 · Interview staples | Top-N per group | 0 | 14 | 12 | 26 |
| 3 · Interview staples | Self-joins, hierarchies and overlaps | 0 | 17 | 6 | 23 |
| 3 · Interview staples | Window functions: running totals and LAG/LEAD | 0 | 5 | 4 | 9 |
| 3 · Interview staples | Median, percentiles and statistics | 0 | 5 | 4 | 9 |
| 4 · Advanced patterns | Gaps, islands and consecutive runs | 0 | 3 | 11 | 14 |
| 4 · Advanced patterns | Relational division: "all" and "every" | 0 | 4 | 12 | 16 |
| 4 · Advanced patterns | Trends and retention over time | 0 | 0 | 15 | 15 |
| 4 · Advanced patterns | Recursive CTEs and trees | 0 | 1 | 2 | 3 |

How to walk it: finish a stage's Beginner questions, then its Pro questions, before the next stage; take a topic's Advanced questions once its Pro set feels easy. Stages 1-2 are the screen-round basics, stage 3 is what most onsite loops reward, stage 4 separates senior candidates.


## Stage 1 · Foundations

### Filtering, sorting and basics (3)
Pick, filter and sort rows; simple conditions and string tests.

**Beginner (2)**

- Q35. List employees whose names start and end with the same letter.
- Q243. Find customers with orders where no product quantity is less than 5.

**Pro (1)**

- Q178. Find employees who have been promoted but their salary didn’t increase.

### Aggregation and GROUP BY (51)
Counts, sums, averages, HAVING, first/last per group, repeats.

**Beginner (43)**

- Q4. Count employees in each department having more than 5 employees.
- Q24. Write a query to find the number of employees in each job title.
- Q34. Find the department with the lowest average salary.
- Q50. Write a query to concatenate employee names in each department (string aggregation).
- Q77. Find employees who have worked in more than 3 different departments.
- Q89. Find the first order date for each customer.
- Q90. Find employees who have been promoted more than twice.
- Q110. Get the most recent order date per customer.
- Q115. Find the number of employees with the same job title per department.
- Q117. Calculate average salary by department and job title.
- Q119. Find employees who have been promoted more than once.
- Q132. Find the department with the lowest average salary.
- Q149. List employees who have been in the company for more than 10 years.
- Q157. Find the difference in days between the first and last order for each customer.
- Q166. Find customers with sales in at least 3 different years.
- Q170. Find the most recent promotion date per employee.
- Q191. Find the number of employees who have worked in more than one department.
- Q198. Find the number of employees who have changed departments more than twice.
- Q199. Find the product with the highest average rating.
- Q221. Find the first order date for each customer.
- Q256. Find the first and last login date for each user.
- Q278. Find the average salary for each job title within each department.
- Q279. Find customers who placed orders with multiple payment methods.
- Q22. Write a query to get the first and last purchase date for each customer.
- Q44. Find customers who purchased more than once in the same day.
- Q55. Show the department with the highest number of employees and the count.
- Q67. Find employees who have managed more than 3 projects.
- Q103. Find the department with the most employees.
- Q106. List departments with average salary greater than the overall average.
- Q107. Find employees with the highest number of dependents.
- Q127. Find the average number of orders per customer.
- Q128. Find employees who have worked on more than 5 projects.
- Q130. Find customers with orders totaling more than $10,000.
- Q164. Find the product that has been sold in the highest quantity in a single order.
- Q175. Find the department with the highest number of projects.
- Q211. Find customers who ordered the same product multiple times in one day.
- Q220. Find the employee who worked the most hours in a project.
- Q233. Find the department with the youngest average employee age.
- Q236. Find the employee(s) with the highest number of late arrivals.
- Q269. Find employees who manage more than 3 projects.
- Q291. Find employees who have worked on projects for more than 2 years.
- Q63. Find employees whose salary is above their department’s average but below the overall average salary
- Q69. Write a query to find the department with the highest average years of experience.

**Pro (8)**

- Q150. Find the department with the most promotions.
- Q151. Find customers who ordered products from at least 3 different categories.
- Q159. Find employees who have the same salary as the average salary in their job title.
- Q169. Find employees who have worked on at least one project with a budget over $1,000,000.
- Q254. Find employees who have been assigned projects outside their department.
- Q23. Find departments with the highest average salary.
- Q162. Find the employee with the maximum salary in each department.
- Q248. Find employees whose salaries are within 10% of their department’s average salary.

### Joins and enriching rows (14)
Bring tables together, including rows with zero matches.

**Beginner (2)**

- Q20. Aggregate JSON data (if supported) to list all employee names in a department as a JSON array.
- Q239. Find the total revenue generated per sales representative.

**Pro (11)**

- Q285. Find products that have been discontinued but still have sales.
- Q122. Get employees who joined after their department was created.
- Q298. Find products ordered on their launch date.
- Q92. Find the total sales per customer including those with zero sales.
- Q120. Calculate total sales by product category.
- Q154. Calculate total revenue and number of orders per country.
- Q212. Find the total sales for each product including products with zero sales.
- Q268. Find the average order value per customer segment.
- Q45. List all departments and their employee counts, including departments with zero employees.
- Q88. Write a query to list all employees who have a salary equal to the average salary of their departmen
- Q177. Get the total sales amount for each product category including categories with zero sales.

**Advanced (1)**

- Q280. Find products with the lowest average rating per category.

### Dates and time windows (22)
Per month/year/week, last N days, tenure and durations.

**Beginner (15)**

- Q129. Find the total number of products sold each day.
- Q145. Get the average salary of employees hired each year.
- Q190. Find the day with the highest number of new hires.
- Q193. Find the average days taken to ship orders per shipping method.
- Q232. Find the average time difference between order and delivery.
- Q287. Find the average delivery time by shipping method.
- Q42. Find the average tenure of employees by department.
- Q64. Calculate the total sales amount and number of orders per customer in the last year.
- Q114. Get the number of employees hired each year.
- Q168. Find the average order amount per customer per year.
- Q183. Find customers whose last order was placed more than 1 year ago.
- Q192. Find customers who ordered the most products in 2023.
- Q214. Find the day with the largest difference between maximum and minimum temperature.
- Q255. Calculate the average time to close tickets per support agent.
- Q262. Find the average tenure of employees by department.

**Pro (6)**

- Q277. Find the number of employees who changed departments in the last year.
- Q282. Find the total number of orders placed each day in the last week.
- Q296. Get total working hours per employee per week.
- Q182. Write a query to find employees who worked on more than 3 projects in 2023.
- Q165. Find employees who joined before their department was created.
- Q252. Find the department with the most projects completed last year.

**Advanced (1)**

- Q238. Find employees who have worked more than 40 hours in a week.


## Stage 2 · Core patterns

### Anti-joins, EXISTS and missing data (34)
Who never did something: LEFT JOIN NULL, NOT EXISTS, NOT IN traps.

**Beginner (6)**

- Q25. Find employees who don’t have a department assigned.
- Q172. Find products never ordered.
- Q185. Find employees who have never been promoted.
- Q200. Find customers who have placed orders but never used a discount.
- Q247. Find customers who have placed orders but never paid by credit card.
- Q240. Find customers with no orders in the last year.

**Pro (27)**

- Q41. Find employees who have never made a sale.
- Q54. Find employees with no corresponding entries in the salary_history table.
- Q59. Write a query to find the employee(s) who have never received a promotion.
- Q81. Find employees who have never taken any leave.
- Q91. Find employees who have not been assigned to any project.
- Q123. Find customers with no sales records.
- Q131. Find employees who have never received a bonus.
- Q161. List the departments with no employees.
- Q176. Find employees who do not have dependents.
- Q270. Find products that have never been returned.
- Q281. Find employees who have never received a promotion.
- Q289. Find customers who made orders but never returned a product.
- Q6. Get departments with no employees.
- Q15. Find customers who have not made any purchase.
- Q28. Identify employees who haven’t received a salary raise in more than a year.
- Q48. Find products that have never been sold.
- Q62. Find products that have never been ordered.
- Q94. Find customers with no orders in the last year.
- Q134. Find customers who ordered products only from one category.
- Q216. Find products with sales only in a specific country.
- Q226. Find employees who have not been assigned to any project in the last year.
- Q244. Find products ordered only by customers from one country.
- Q265. Find the employees who have never been late to work.
- Q266. Find products with sales only during holiday seasons.
- Q271. Find customers with orders but no shipments.
- Q300. List departments with no open positions.
- Q290. Find products that have been ordered but never reviewed.

**Advanced (1)**

- Q82. List customers who placed orders in January but not in February.

### Subqueries and comparing to an average (16)
Above/below an average, department or company benchmark.

**Beginner (8)**

- Q19. Write a query to find employees with salary greater than average salary in the entire company, order
- Q97. Find employees who earn more than the average salary of the entire company.
- Q179. Find customers with average order amount above $500.
- Q180. Find orders where the total quantity exceeds 100 units.
- Q217. Find employees with a salary greater than all employees in department 10.
- Q288. Find orders where the total quantity exceeds 100.
- Q31. Find employees who earn more than the average salary across the company but less than the highest sa
- Q51. Find employees whose salary is above the average salary of their department but below the company-wi

**Pro (2)**

- Q86. Find employees whose salary is above the average salary of their department but below the company-wi
- Q147. Find employees with salaries higher than their department average.

**Advanced (6)**

- Q113. List products with sales above the average sales amount.
- Q171. Find customers who made orders totaling more than the average order amount.
- Q242. Find departments where average salary is higher than the company average.
- Q258. Find products with sales revenue above the average revenue per product.
- Q167. Find employees whose salary is above the company’s average but below their department’s average.
- Q225. Find customers who spent more than average in their country.

### Duplicates and set operations (6)
Duplicates, distinct counts, UNION, INTERSECT, "bought both".

**Beginner (3)**

- Q2. Find duplicate records in a table.
- Q283. Find customers with orders in both online and in- store channels.
- Q140. Find customers who purchased both Product A and Product B.

**Pro (3)**

- Q273. Find the total number of unique products sold in the last quarter.
- Q13. Compare two tables and find rows with differences in any column (all columns).
- Q195. Find the total number of unique customers per product category.

### Conditional aggregation, pivots and percentages (7)
CASE inside SUM/COUNT, pivots, shares and ratios.

**Beginner (2)**

- Q259. Find departments where more than 50% of employees have a salary above $60,000.
- Q263. Find the number of orders placed on weekends vs weekdays.

**Pro (4)**

- Q16. Write a query to perform a conditional aggregation (count males and females in each department).
- Q224. Calculate the ratio of males to females in each department.
- Q26. Write a query to pivot rows into columns dynamically (if dynamic pivot is not supported, simulate it
- Q184. Find the average salary increase percentage per department.

**Advanced (1)**

- Q218. Find the percentage of employees in each department.


## Stage 3 · Interview staples

### Nth highest and ranking (32)
Second/third/nth highest, RANK vs DENSE_RANK vs ROW_NUMBER, ties.

**Pro (24)**

- Q1. Find the second highest salary from the Employee table.
- Q101. Find customers who placed orders only in the last 6 months.
- Q124. Find the second highest salary in the company.
- Q141. Find the top N customers by total sales amount.
- Q143. Write a query to display all employees who have worked on a project longer than 6 months.
- Q144. Find the nth highest salary in a company (e.g., 5th highest).
- Q38. Find average order value per month and product category.
- Q53. Retrieve the Nth highest salary from the employees table.
- Q125. Find products with sales only in the current month.
- Q174. Calculate the number of employees hired each month in the last year.
- Q187. Find customers with orders totaling more than $5000 in the last 6 months.
- Q206. Find the average salary of employees hired each month.
- Q246. Find the total discount given in each month.
- Q5. Find employees who joined in the last 6 months.
- Q264. Find the percentage of orders with discounts per month.
- Q142. Find the month with the highest sales in the current year.
- Q173. Find the month with the lowest sales in the past year.
- Q14. Write a query to rank employees based on salary with ties handled properly.
- Q197. Find employees with no projects assigned in the last 6 months.
- Q245. Find employees who have not submitted their timesheets in the last month.
- Q251. Find employees who have not taken any leave in the last 6 months.
- Q40. Write a query to find the second most recent order date per customer.
- Q74. Find customers who haven’t ordered in the last 6 months.
- Q79. Write a query to pivot monthly sales data for each product into columns.

**Advanced (8)**

- Q66. Write a query to get the nth highest salary per department.
- Q222. Find the second most expensive product per category.
- Q257. Find customers who made purchases only in one month of the year.
- Q84. Find the department(s) with the second highest average salary.
- Q274. Find the day with the highest sales in each month.
- Q60. Write a query to find the top 3 products with the highest total sales amount each month.
- Q78. Calculate the percentage contribution of each product’s sales to the total sales per month.
- Q292. Find the product with the highest sales for each month.

### Top-N per group (26)
Top 3 per category, latest order per customer, highest per month.

**Pro (14)**

- Q99. Find the difference in days between the earliest and latest orders per customer.
- Q121. Find the top 3 products by sales amount.
- Q250. Find the top 5 longest projects.
- Q93. Find the highest salary by department and the employee(s) who earn it.
- Q95. Find employees whose salary is within 10% of the highest salary in their department.
- Q276. Find the top 5 customers by total order value in the last year.
- Q61. Find the customers who placed orders only in the last 30 days.
- Q284. Find the top 3 sales reps by number of deals closed this quarter.
- Q33. Find employees with no salary changes in the last 2 years.
- Q188. Find the rank of employees based on salary within their department.
- Q32. Retrieve the last 5 orders for each customer.
- Q58. Calculate the total revenue for each customer, and rank them from highest to lowest spender.
- Q65. List the top 5 highest-paid employees per department.
- Q80. Find the 3 most recent orders per customer including order details.

**Advanced (12)**

- Q98. Get the last 3 orders placed by each customer.
- Q47. Rank employees by salary within their department, and calculate percent rank.
- Q215. Find the 3 most recent orders per customer.
- Q207. Find the first 5 orders after a customer's registration date.
- Q156. Find the top 3 products by quantity sold in each category.
- Q227. Find the top 3 customers by total order amount in each region.
- Q213. List the top 5 employees by number of projects in each department.
- Q249. Find customers who ordered the most products in each category.
- Q223. Find employees with the highest salary in each job title.
- Q73. Get the product with the highest sales for each category.
- Q87. Write a query to find customers with the highest purchase amount per year.
- Q293. Find customers with the highest order count in each region.

### Self-joins, hierarchies and overlaps (23)
Employee-manager, same-as-manager, overlapping ranges, pairs.

**Pro (17)**

- Q116. Find employees with no manager assigned.
- Q205. Find all managers who do not manage any employee.
- Q210. Find the number of employees who share the same birthday.
- Q72. List employees who earn more than all their subordinates.
- Q230. Find employees with the highest number of direct reports.
- Q111. List all employees and their manager names.
- Q135. Write a query to display employee names alongside their manager names, including those without manag
- Q3. Retrieve employees who earn more than their manager.
- Q18. Identify overlapping date ranges for bookings.
- Q21. Find employees who have the same salary as their manager.
- Q112. Find employees with the same salary as their manager.
- Q155. Find the employees who were hired on the same day as their managers.
- Q160. Write a query to calculate the difference in salary between employees and their managers.
- Q286. Find employees who report to a manager hired after them.
- Q295. Find employees whose hire date is the same weekday as their manager’s.
- Q57. Write a query to identify overlapping shifts for employees.
- Q68. Write a query to calculate the difference in days between each employee's hire date and their manage

**Advanced (6)**

- Q105. Find employees who were hired before their managers.
- Q228. Find employees hired after their managers.
- Q70. Identify employees who had overlapping project assignments.
- Q85. Find employees who joined in the same month and year.
- Q194. Find employees with overlapping project assignments.
- Q237. Find the most common product combinations in orders (pairs).

### Window functions: running totals and LAG/LEAD (9)
Running totals, moving averages, previous-row differences.

**Pro (5)**

- Q17. Write a query to calculate the difference between current row and previous row's salary (lag functio
- Q148. Find the difference between each row's value and the previous row’s value in sales.
- Q8. Running total of salaries by department.
- Q36. Use window function to find the difference between current row’s sales and previous row’s sales part
- Q96. Find the running total of sales by date.

**Advanced (4)**

- Q133. Get cumulative count of orders per customer over time.
- Q139. Calculate the difference between each order amount and the previous order amount per customer.
- Q209. Calculate the moving average of sales over the last 3 days.
- Q39. Write a query to create a running count of how many employees joined in each year.

### Median, percentiles and statistics (9)
Median, percentile bands, variance, trimmed averages.

**Pro (5)**

- Q118. Find the median salary of employees.
- Q138. Find the department with the highest variance in salaries.
- Q219. Find the median salary per department.
- Q12. Calculate cumulative distribution (CDF) of salaries.
- Q43. Get employees with salary in the top 10% in their department.

**Advanced (4)**

- Q7. Write a query to find the median salary.
- Q146. Find employees whose salaries are between the 25th and 75th percentile.
- Q202. Find the average order amount excluding the top 5% largest orders.
- Q299. Retrieve employees with salary in top 5% company-wide.


## Stage 4 · Advanced patterns

### Gaps, islands and consecutive runs (14)
Streaks, missing IDs and days, longest run, gaps between events.

**Pro (3)**

- Q75. Find the maximum salary gap between any two employees within the same department.
- Q11. Write a query to find gaps in a sequence of numbers (missing IDs).
- Q76. Write a query to generate a calendar table with all dates for the current year.

**Advanced (11)**

- Q104. Write a query to find gaps in employee IDs.
- Q102. Get the total number of orders per day, including days with zero orders.
- Q46. Find gaps in date sequences for each customer (missing days).
- Q126. Find employees with consecutive workdays.
- Q9. Find the longest consecutive streak of daily logins for each user.
- Q152. Find the average gap (in days) between orders per customer.
- Q49. Write a query to find consecutive days where sales were above a threshold.
- Q108. Find customers with the longest gap between two consecutive orders.
- Q204. Find employees with the longest consecutive workdays.
- Q235. Find customers whose orders decreased consecutively for 3 months.
- Q253. Find customers who have increased their order frequency month-over-month for 3 consecutive months.

### Relational division: "all" and "every" (16)
Customers who bought all products, employees on every project.

**Pro (4)**

- Q186. Find products ordered by all customers.
- Q27. Find customers who made purchases in every category available.
- Q100. Find employees who have worked on all projects.
- Q153. List all customers who have never ordered product X.

**Advanced (12)**

- Q52. List the customers who purchased all products in a specific category.
- Q29. Write a query to rank salespeople by monthly sales, resetting the rank every month.
- Q201. Find employees who have worked on every project in their department.
- Q109. Find customers who ordered all products in a category.
- Q234. Find products that were sold in every quarter of the current year.
- Q71. Find customers who made purchases in every month of the current year.
- Q163. Find customers with orders on every day in the last week.
- Q297. Identify suppliers who delivered to all regions.
- Q260. Find employees who worked on all projects in the company.
- Q208. Find customers who placed orders every month for the last 6 months.
- Q261. Find customers who ordered products from all categories.
- Q229. Find customers who ordered all products from a specific category.

### Trends and retention over time (15)
Month-over-month growth, always-increasing series, retention.

**Advanced (15)**

- Q30. Calculate the percentage change in sales compared to the previous month for each product.
- Q189. Find customers who purchased a product but never reordered it.
- Q158. Find customers who have increased their order volume every month for the last 3 months.
- Q56. Generate a report that shows sales and sales growth percentage compared to the same month last year.
- Q83. Find products that have seen a price increase in the last 6 months.
- Q136. Find products with sales increasing every month for the last 3 months.
- Q203. Find the top 3 employees with the highest salary increase over last year.
- Q272. Find employees whose salaries increased every year.
- Q181. Find products whose sales have doubled compared to the previous month.
- Q196. Find customers whose orders increased by at least 20% compared to the previous month.
- Q275. Find the products with the highest sales increase compared to the previous month.
- Q294. Flag customers with an increase in orders every month this year.
- Q231. Calculate the retention rate of customers month- over-month.
- Q267. Find the department with the largest increase in employee count compared to last year.
- Q241. Find products with an increasing sales trend over the last 3 months.

### Recursive CTEs and trees (3)
Reporting chains, descendants, tree depth.

**Pro (1)**

- Q37. Write a query to find all employees who are at the lowest level in the hierarchy (no subordinates).

**Advanced (2)**

- Q10. Recursive query to find the full reporting chain for each employee.
- Q137. Write a recursive query to get all descendants of a manager.


## Concepts stage: explain-it questions

Added from the sprintzeal SQL interview page (36 definition-style questions: SQL subsets, keys, constraints, DELETE/TRUNCATE/DROP, indexes, normal forms, ACID, triggers, NULL, joins, subqueries) and extended with the usual follow-ups. MIRROR's versions are written from scratch and correct the page's errors. In the app they live under the **Concepts** tab of SQL practice as multiple-choice with a model spoken answer; four have animated scenes (indexes, normalisation, ACID, DELETE/TRUNCATE/DROP). Suggested place in the route: take each Concepts topic right after the matching stage (keys and commands with Stage 1, joins/NULL with Stage 2, indexes and transactions before Stage 4).

| Topic | Beginner | Pro | Advanced | Total |
|---|---:|---:|---:|---:|
| SQL commands and data types | 4 | 4 | 3 | 11 |
| Keys and constraints | 4 | 4 | 3 | 11 |
| Normalisation and design | 3 | 5 | 3 | 11 |
| Indexes and performance | 2 | 4 | 5 | 11 |
| Transactions and ACID | 3 | 5 | 3 | 11 |
| Joins, sets and NULL | 4 | 5 | 4 | 13 |

### SQL commands and data types

**Beginner**: The five parts of SQL; GRANT and REVOKE; ALTER or UPDATE?; DBMS and its kinds

**Pro**: CHAR or VARCHAR?; DELETE, TRUNCATE or DROP?; Money in FLOAT or DECIMAL?; Dates as DATE, not text

**Advanced**: Can TRUNCATE be rolled back?; Undoing a DROP TABLE; UPDATE without WHERE


### Keys and constraints

**Beginner**: What a primary key guarantees; What a foreign key does; NOT NULL, CHECK, DEFAULT; Data and referential integrity

**Pro**: UNIQUE or PRIMARY KEY?; NULLs in a foreign key; Candidate, composite, surrogate; Key for order items

**Advanced**: ON DELETE CASCADE; Email or generated id as key?; Database rule or app rule?


### Normalisation and design

**Beginner**: Why normalise?; Breaking 1NF; Entities and cardinality

**Pro**: The normal forms in one line each; Breaking 2NF; Breaking 3NF; When to denormalise; Modelling many-to-many

**Advanced**: BCNF versus 3NF; Star schema or normalised?; Spotting an update anomaly


### Indexes and performance

**Beginner**: What an index is; What a unique index adds

**Pro**: Clustered or non-clustered?; What a covering index is; LIKE with a leading wildcard; Reading EXPLAIN

**Advanced**: Column order in an index; Function on an indexed column; Index the optimiser ignores; Slower after adding indexes; Index exists but a full scan runs


### Transactions and ACID

**Beginner**: ACID in one go; COMMIT, ROLLBACK, SAVEPOINT; What a trigger is

**Pro**: Which property rolls back?; What durability means; Which anomaly is this? (1); Default isolation levels; Trigger, procedure or view?

**Advanced**: Which anomaly is this? (2); Which anomaly is this? (3); Deadlock


### Joins, sets and NULL

**Beginner**: NULL, zero and blank; WHERE or HAVING?; UNION or UNION ALL?; LIKE and BETWEEN

**Pro**: COUNT(*) or COUNT(column)?; Which join keeps all customers?; Cross join or natural join?; Self join; Subquery, join or CTE?

**Advanced**: The NOT IN trap; LEFT JOIN that acts like INNER; Correlated subquery and EXISTS; AND before OR
