# SecondRoute ♻️

### Context-Aware Returns Disposition Decision Engine

> **Returns don't have one destination. Their best next route depends on context.**

SecondRoute is a decision-support prototype designed for fashion retailers to determine the **best executable destination for returned products**.

Instead of treating every return the same way, SecondRoute evaluates the item's condition, demand, season, inventory, location, operational costs, and available recovery channels to determine whether the item should be:

**Resold · Refurbished · Exchanged · Donated · Recycled · Written-off**

The system combines **feasibility checks + economic evaluation + explainable ranking** to produce an actionable recommendation.

---

## 🎯 Problem

Returned fashion products often enter a fragmented recovery process.

A returned garment may be:

* Resalable
* Repairable
* Suitable for exchange
* Suitable for donation
* Recyclable
* Or economically unrecoverable

The challenge is not simply identifying what *can* be done with a return.

The challenge is determining:

> **What should be done with it right now, given its current context?**

A route that makes sense for one item may become unprofitable or infeasible when demand, condition, inventory, season, logistics, or channel availability changes.

---

## 💡 Solution

SecondRoute acts as a **decision layer** between returned inventory and possible recovery destinations.

### Core flow

```text
Upload Return
      ↓
Enter / Select Item Context
      ↓
Feasibility Checks
      ↓
Value & Cost Calculation
      ↓
Expected Net Recovery
      ↓
Rank Feasible Destinations
      ↓
Recommended Route
      ↓
Explanation + Decision Trace
      ↓
Accept / Override
      ↓
Decision Log
```

The same returned item can therefore receive a different recommendation when its context changes.

---

# 🚀 Key Features

## 1. 📸 Return Item Upload

Users can upload a photo of the returned clothing item.

The image becomes part of the return record and is displayed throughout the evaluation process.

> **Important:** The current prototype does not use computer vision to automatically determine garment condition. Condition and operational inputs are supplied through structured inputs.

---

## 2. 📝 Context-Based Inputs

The user can provide or modify key decision variables such as:

* Product category
* Condition
* Location
* Season
* Demand
* Inventory
* Processing cost
* Refurbishment cost
* Logistics cost
* Channel availability

These inputs form the context used by the decision engine.

---

## 3. ⚙️ Decision Engine

SecondRoute uses a deterministic **rules + economics** approach.

Every possible destination first passes through a feasibility check.

Only executable destinations are then economically evaluated.

### Possible destinations

| Destination   | Purpose                                                 |
| ------------- | ------------------------------------------------------- |
| **Resell**    | Return the item to saleable inventory                   |
| **Refurbish** | Repair or restore the item before recovery              |
| **Exchange**  | Use the item within an exchange workflow                |
| **Donate**    | Route the item through an available donation channel    |
| **Recycle**   | Recover material through an available recycling channel |
| **Write-off** | Use as the fallback when recovery is not viable         |

---

# 💰 Economic Evaluation

For each feasible route, SecondRoute estimates:

### Expected Net Recovery

```text
Expected Net Recovery
=
Expected Realizable Value
− Processing Cost
− Refurbishment Cost
− Logistics Cost
− Time / Markdown Risk
− Other Costs
```

The destination with the strongest executable economic outcome becomes the recommended route.

The prototype uses **synthetic/simulated data** for demonstration.

It does not claim that the displayed values are real retailer predictions.

---

# 🧠 Feasibility ≠ Scoring

One of the core principles of SecondRoute is that a theoretically attractive destination should not be recommended if it cannot actually be executed.

For example:

```text
Recycle
Expected Recovery: ₹1,200

BUT

No verified recycling channel available
        ↓
NOT FEASIBLE
        ↓
Cannot be recommended
```

This prevents the system from choosing a route merely because its theoretical recovery value is high.

---

# 📊 Explainable Decision Trace

Every evaluation provides a comparison between possible destinations.

Example:

```text
RESELL
✓ Feasible
Expected Net Recovery: ₹2,980

REFURBISH
✓ Feasible
Expected Net Recovery: ₹2,410

EXCHANGE
✓ Feasible
Expected Net Recovery: ₹2,180

RECYCLE
✓ Feasible
Expected Net Recovery: ₹640

DONATE
✕ Not feasible
No configured donation channel

WRITE-OFF
Fallback
₹0
```

The interface highlights:

### WHY IT WON

and

### WHY OTHERS LOST

This makes the recommendation explainable rather than presenting a black-box result.

---

# 🔄 Dynamic Scenario Evaluation

SecondRoute is designed to demonstrate that decisions are **context-dependent**.

For example:

```text
GOOD CONDITION
+ HIGH DEMAND
+ IN-SEASON
        ↓
      RESELL
```

Change the context:

```text
REPAIRABLE CONDITION
+ MODERATE DEMAND
+ VIABLE REFURBISHMENT COST
        ↓
    REFURBISH
```

Change it again:

```text
SEVERE DAMAGE
+ VERIFIED RECYCLING CHANNEL
        ↓
      RECYCLE
```

Disable the recycling channel:

```text
NO EXECUTABLE RECOVERY CHANNEL
        ↓
    WRITE-OFF
```

When the winning destination changes, the prototype displays a:

### **DECISION UPDATED**

indicator showing the previous and new recommendation.

---

# 👤 Human Override

SecondRoute is a **decision-support system**, not an autonomous replacement for human operators.

Users can:

* Accept the recommendation
* Override the recommendation
* Select another feasible destination
* Provide an override reason
* Save the final decision

The system records:

* Original recommendation
* Final decision
* Override status
* Reason
* Timestamp
* Input snapshot

This creates an auditable decision trail.

---

# 📋 Returns Queue

The prototype includes a lightweight returns queue containing synthetic return records.

Example:

| Return ID | Product                | Category    | Condition  | Location  |
| --------- | ---------------------- | ----------- | ---------- | --------- |
| RT-20481  | Urban Utility Jacket   | Outerwear   | Good       | Delhi     |
| RT-20482  | Classic Straight Jeans | Bottomwear  | Repairable | Delhi     |
| RT-20483  | Everyday Cotton Tee    | T-shirt     | Good       | Mumbai    |
| RT-20484  | Performance Activewear | Activewear  | Damaged    | Bengaluru |
| RT-20485  | Linen Kurta            | Ethnic Wear | Good       | Delhi     |

Selecting a return opens its decision screen.

---

# 🧪 Prototype Data

The prototype uses synthetic data to simulate upstream retailer systems.

Examples:

* Inventory data
* Demand signals
* Product condition
* Logistics costs
* Recovery costs
* Channel availability

These are intentionally simulated because the prototype's goal is to demonstrate the **decision layer**, not production integrations.

### Prototype principle

> **The upstream systems are mocked; the decision mechanism is real.**

---

# 🏗️ Architecture

```text
                    SECONDROUTE
                         │
                  RETURNS QUEUE
                         │
                  Select Return
                         │
                         ▼
              ┌─────────────────────┐
              │   DECISION ENGINE   │
              │                     │
              │ Scope Validation    │
              │        ↓            │
              │ Feasibility Gates   │
              │        ↓            │
              │ Value Estimation    │
              │        ↓            │
              │ Cost Calculation    │
              │        ↓            │
              │ Expected Recovery   │
              │        ↓            │
              │ Ranking + Tie-break │
              └──────────┬──────────┘
                         │
                         ▼
                   RECOMMENDATION
                         │
                ┌────────┴────────┐
                │                 │
             ACCEPT            OVERRIDE
                │                 │
                └────────┬────────┘
                         ▼
                    DECISION LOG
```

---

# 🛠️ Tech Stack

### Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* shadcn/ui

### Backend

* FastAPI
* SQLite

### Data

* Synthetic prototype dataset
* Structured return records
* Persisted evaluation and decision history

---

# 🔌 API Structure

The prototype is designed around a simple API layer.

```text
GET  /items
GET  /items/{id}

POST /evaluate
POST /override

GET  /decisions
```

The decision logic is centralized in a single evaluation service rather than duplicated across frontend components.

Conceptually:

```text
evaluateReturn(itemContext)

→ Validate inputs
→ Apply feasibility gates
→ Estimate realizable value
→ Calculate costs
→ Calculate net recovery
→ Rank destinations
→ Calculate decision confidence
→ Generate explanation
→ Return recommendation
```

---

# 📈 Decision Confidence

SecondRoute's confidence indicator is **not an ML probability**.

It is based on factors such as:

* Completeness of decision inputs
* Margin between the highest-ranked and second-ranked feasible destination

Example:

```text
DECISION CONFIDENCE
HIGH

Strong data coverage
+
₹570 lead over next-best route
```

This makes the confidence indicator transparent and interpretable.

---

# 🎬 Demonstration Scenario

The primary demonstration item is:

### RT-20481 — Urban Utility Jacket

#### Scenario 1

```text
Condition: Good
Season: In-season
Demand: High
Inventory: Normal

→ RESELL
```

#### Scenario 2

```text
Condition: Repairable
Demand: Moderate
Refurbishment Cost: Reasonable

→ REFURBISH
```

#### Scenario 3

```text
Condition: Severely damaged
Recycling Channel: Available

→ RECYCLE
```

Then:

```text
Disable recycling channel

→ WRITE-OFF
```

This demonstrates the central principle:

> **A destination must be both executable and economically justified.**

---

# 🎯 Design Philosophy

SecondRoute intentionally avoids unnecessary complexity.

The prototype does **not** attempt to build:

* A mobile application
* A chatbot
* Computer vision
* A live marketplace
* Nationwide recycler discovery
* Live retailer integrations
* A complex ML model
* IoT hardware
* A massive analytics platform
* RTO/NDR management
* A complex authentication system

The focus remains on one problem:

> **Making better, explainable disposition decisions for returned products.**

---

# 🔮 Future Scope

The current prototype establishes the decision layer.

With real retailer data, future versions could incorporate:

* ML-based demand forecasting
* Automated resale price prediction
* Computer vision for condition assessment
* Real inventory integrations
* Real logistics pricing
* Recycler/refurbisher network integrations
* Historical decision learning
* Route optimization
* Retailer-specific optimization models
* Carbon-impact estimation
* Automated policy recommendations

These are intentionally outside the current prototype scope.

---

# 🌱 Why SecondRoute?

Traditional return handling can treat recovery as a series of disconnected operational decisions.

SecondRoute introduces a unified decision layer that asks:

> **Given this item's current condition, market context, operational constraints and available channels — what is its best next route?**

The goal is to move from:

**Return → Fixed workflow**

to:

**Return → Context → Evaluation → Best executable route**

---

# 📌 Project Status

**Prototype / Proof of Concept**

The current version uses synthetic data and simulated upstream systems to demonstrate the decision engine, explainability, scenario re-evaluation and human override workflow.

---

**Returns move. The decision should move with them.**
