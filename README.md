# Second Route Decisions

Build a polished, competition-ready web prototype called SecondRoute.

SecondRoute is a context-aware returns disposition decision engine for fashion retailers.

CORE PRODUCT IDEA

When a returned garment enters the system, SecondRoute evaluates the item's current context and determines the best executable destination:

Resell

Refurbish

Exchange

Donate

Recycle

Write-off

The core principle is:

The same returned item can receive a different recommendation when its context changes.

The prototype must demonstrate:

Item → Feasibility → Economic evaluation → Ranking → Recommendation → Explanation → Human override → Decision log

This is NOT an ML demo. The prototype should use a deterministic rules + economics decision engine. External systems such as inventory, demand and channel availability should be simulated with realistic mock data.

TECH STACK

Use:

React

Vite

TypeScript

Tailwind CSS

shadcn/ui

FastAPI backend if supported by the environment

SQLite for persistence

If a backend cannot be deployed through Lovable, create a clean frontend service layer with mock persistence, but structure it so the backend can be connected later.

Do NOT use unnecessary third-party APIs.

VISUAL DIRECTION

The interface should feel like a real enterprise retail operations product, not an AI-generated dashboard.

Design language:

Premium

Minimal

Modern

Data-driven

Clean typography

Strong hierarchy

Lots of whitespace

Subtle borders

Restrained use of color

Professional retail-tech aesthetic

Avoid:

Excessive gradients

Neon colors

Huge hero illustrations

Chatbot UI

Generic AI imagery

Excessive animations

Dashboard clutter

Fake 3D graphics

Use subtle micro-interactions and smooth transitions only where they improve usability.

Desktop-first and responsive.

APPLICATION STRUCTURE

Create these main screens:

1. Returns Queue

2. Return Detail / Decision Screen

3. Decision History

4. Simple Settings / Scenario Controls

The Return Detail / Decision Screen is the hero screen and should receive the most visual attention.

1. RETURNS QUEUE

Create a clean table containing approximately 15–20 synthetic returned fashion items.

Columns:

Return ID

Product

Category

Condition

Location

Return Date

Current Status

Recommendation

Example records:

RT-20481 — Urban Utility Jacket

RT-20482 — Classic Straight Jeans

RT-20483 — Everyday Cotton Tee

RT-20484 — Performance Activewear

RT-20485 — Linen Kurta

Include enough additional records to make the system feel realistic.

Clicking a row opens the Return Detail / Decision screen.

Keep the queue intentionally simple.

Do NOT build advanced analytics, complicated filtering systems or giant dashboards.

2. RETURN DETAIL / DECISION SCREEN

This is the most important screen.

For the selected return, show:

ITEM HEADER

Example:

RT-20481

Urban Utility Jacket

Category: Outerwear

Location: Delhi Fulfilment Centre

Return reason: Size issue

ITEM CONTEXT

Show the variables used by the decision engine:

Condition

Category

Location

Season

Demand

Inventory

Processing Cost

Refurbishment Cost

Logistics Cost

Channel Availability

Make these values visually clear.

DECISION ENGINE

Implement a deterministic decision engine.

Every destination must first pass a feasibility gate.

Possible destinations:

RESELL

Eligible when item condition and operational requirements allow resale.

REFURBISH

Eligible when condition is repairable and refurbishment is economically/operationally viable.

EXCHANGE

Eligible when replacement inventory/channel is available.

DONATE

Eligible only when a configured donation channel exists.

RECYCLE

Eligible when an appropriate recycling channel exists and the item can be processed.

WRITE-OFF

Always available as the fallback destination.

IMPORTANT:

Feasibility and economic scoring are separate concepts.

A destination that is not executable must NOT win simply because its theoretical recovery value is high.

ECONOMIC MODEL

Use deterministic formulas.

For each feasible route calculate:

Expected Realizable Value

then:

Expected Net Recovery =
Expected Realizable Value
− Processing Cost
− Refurbishment Cost
− Logistics Cost
− Time / Markdown Risk
− Other Costs

Use route-specific factors rather than making every variable affect every route equally.

Example conceptual dependencies:

| Variable | Resell | Refurbish | Exchange | Donate | Recycle |
| Condition | Yes | Yes | Yes | Partial | Yes |
| Demand | Yes | Yes | Yes | No | No |
| Season | Yes | Yes | Partial | No | No |
| Inventory | Yes | Yes | Yes | No | No |
| Location | Yes | Partial | Partial | Yes | Yes |
| Logistics | Yes | Yes | Yes | Yes | Yes |

The exact values should be deterministic and believable.

Do NOT pretend these numbers come from real ML predictions.

Clearly label simulated data where appropriate.

DECISION RANKING

After feasibility filtering:

Calculate expected net recovery for every feasible destination.

Rank destinations by expected net recovery.

Select the highest-ranked executable destination.

Use deterministic tie-breaking rules.

Write a short explanation for why the winning route was selected.

The engine must NOT simply select a route based on hardcoded item names.

The result must actually change when scenario variables change.

HERO RECOMMENDATION CARD

Make the recommendation extremely prominent.

Example:

RECOMMENDED DESTINATION

RESELL

₹2,980 expected net recovery

Then show:

Decision confidence: HIGH

Do NOT present this as ML probability.

Under confidence, show:

Strong data coverage + ₹570 lead over next-best executable route

Confidence should be derived from:

Data completeness

Decision margin between first and second route

Use HIGH / MEDIUM / LOW.

DECISION TRACE

Below the recommendation, create a visually strong comparison of all six destinations.

For every route show:

Destination

Feasibility

Expected value

Total cost

Expected net recovery

Status

Example:

RESELL — ₹2,980
✓ Feasible
Good condition + high demand + low logistics

REFURBISH — ₹2,410
✓ Feasible
Repair cost reduces recovery

EXCHANGE — ₹2,180
✓ Feasible
Replacement stock available

RECYCLE — ₹640
✓ Feasible
Lower economic outcome

DONATE
— Not feasible
No configured donation channel

WRITE-OFF — ₹0
Fallback

Clearly indicate:

WHY IT WON

and

WHY OTHERS LOST

The winning destination should be visually distinguished.

SCENARIO CONTROL PANEL

Create a compact panel allowing the user to change decision inputs live.

Controls:

Condition

Season

Location

Demand

Inventory

Processing Cost

Refurbishment Cost

Logistics Cost

Channel Availability

When a value changes:

DO NOT simply change displayed text.

Actually recalculate the decision engine.

Flow:

Context changed
→ Recalculate feasibility
→ Recalculate values/costs
→ Re-rank destinations
→ Update recommendation
→ Update decision trace

DECISION CHANGED ANIMATION

This is a critical demo feature.

If the recommendation changes after a scenario modification, show a small but highly visible notification:

DECISION UPDATED

Resell → Refurbish

Reason:

Condition changed from Good → Repairable

Also show the previous and new expected recovery values.

Keep the animation subtle and professional.

The goal is to visually demonstrate:

Same item → changed context → recalculated economics → different decision

THREE GUARANTEED DEMO SCENARIOS

Preconfigure the main demo item:

RT-20481 — Urban Utility Jacket

Scenario 1:

Condition: Good
Season: In-season
Demand: High
Inventory: Normal

Expected recommendation:

RESELL

Scenario 2:

Condition: Repairable
Demand: Moderate
Refurbishment Cost: Reasonable

Expected recommendation:

REFURBISH

Scenario 3:

Condition: Severely damaged
Verified recycling channel: Available

Expected recommendation:

RECYCLE

Then demonstrate:

Disable recycling channel.

Expected result:

WRITE-OFF

This demonstrates the principle:

Feasibility ≠ scoring.

The system must never recommend an unavailable route.

Tune the synthetic data so these scenarios reliably produce the intended results.

DATA CONTEXT

Add a small enterprise-style section showing the source/context of inputs.

Example:

DATA CONTEXT

QC status: Verified
Inventory: Simulated
Demand: Simulated
Channel availability: Configured

Add a small label:

Prototype data

Do not pretend that live retailer integrations exist.

HUMAN OVERRIDE

Provide:

ACCEPT DECISION

and

OVERRIDE

If Override is selected:

Show destination options

Allow selecting another feasible destination

Require a short reason

Save the override

Record timestamp

Record original recommendation

Record final decision

Record reason

Make it clear that:

The engine recommends. A human can override.

Do not allow meaningless overrides without a reason.

DECISION HISTORY

Create a simple history page.

Show:

Return ID

Original recommendation

Final decision

Override status

Timestamp

Reason

Clicking a decision should show the input snapshot used when that decision was made.

This is important because decisions should be auditable.

PERSISTENCE

Persist:

Returns

Evaluations

Decision history

Overrides

Input snapshots

Timestamps

Prefer SQLite.

If backend persistence is unavailable, implement a clean local mock persistence layer but keep the data structures backend-ready.

API STRUCTURE

If using FastAPI, create approximately:

GET /items

GET /items/{id}

POST /evaluate

POST /override

GET /decisions

Keep API responses clean and typed.

The frontend should call the decision engine rather than duplicating the scoring logic in multiple components.

IMPORTANT ARCHITECTURE RULE

Create ONE central decision-engine function/service.

Conceptually:

evaluateReturn(itemContext)

→ scope validation

→ feasibility gates

→ value estimation

→ cost calculation

→ net recovery

→ ranking

→ confidence

→ explanation

→ recommendation

Every scenario control must call this same engine.

Do NOT create separate hardcoded logic for each UI scenario.

WHAT NOT TO BUILD

This prototype intentionally does NOT include:

Mobile application

Chatbot

Computer vision

Live marketplace

Nationwide recycler discovery

Live retailer integrations

Authentication system

Complex ML model

Real-time external APIs

RTO/NDR management

Giant analytics dashboard

Complex admin portal

IoT devices

Barcode hardware

Computer vision condition detection

Keep the scope tightly focused on the decision engine.

EMPTY / ERROR STATES

Build polished states for:

Missing data

No feasible recovery route

Invalid cost

Missing channel

Failed evaluation

Override validation

If critical data is missing, explain what is missing instead of silently generating a recommendation.

DEMO EXPERIENCE

The primary user journey should be:

Returns Queue
→ Select RT-20481
→ View item context
→ View recommendation
→ Open decision trace
→ Change condition
→ Engine recalculates
→ Recommendation changes
→ Show “DECISION UPDATED”
→ Accept or Override
→ Decision saved to history

The entire experience should feel fast and intentional.

FINAL PRODUCT MESSAGE

The UI should communicate this idea without excessive marketing copy:

Returns don't have one destination.
Their best next route depends on context.

SecondRoute turns that context into an executable, explainable disposition decision.

Build the prototype around this thesis.

Prioritize:

Decision engine correctness > believable data > clear decision trace > demo flow > visual polish

Do not over-engineer features outside this scope. make a polished ui and phone compatible SecondRoute flow =

📸 Upload clothing photo
→ 📝 Select context/data
→ ⚙️ Evaluate
→ 📊 Compare all feasible routes
→ 🏆 Recommend best destination
→ 💡 Explain why
→ 🔄 Change a variable
→ Decision changes if the economics justify it
→ 👤 Accept / Override
→ 🧾 Log decision

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/87d6580d-0d38-455e-9415-c2fb4734adab).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
