# HeyPoco — MVP Product Requirements Document

> **One sentence:** Speak your life once, access it anytime.

---

## Problem Statement

People experience life in one continuous stream, but record it across five different apps — or not at all. The moment you have to decide where something belongs before you can log it, most things never get logged. The result is financial blindness, forgotten commitments, and no honest picture of where your time and money actually go.

**The problem is not too many apps. The problem is the cost of that split-second decision, compounded every day.**

---

## What We Are Building

A **voice-first personal life logger**. You speak naturally. The app understands, remembers, and reflects it back to you intelligently. No categories to choose. No forms to fill. One place for everything. Nothing leaves without your control.

---

## What We Are NOT Building

| ❌ Never | Reason |
|---|---|
| Integrations with any external app | Permanent decision — protects what makes this product different |
| A budgeting tool with limits and goals | We are a mirror, not a coach |
| A task manager or to-do list | We hold commitments, not checklists |
| A social or shared experience | Privacy is foundational |
| A career or health tracker | Scope protection |
| Anything requiring the other person to be in the app | Zero adoption friction for others |

---

## Core Features — MVP

### 1. Voice Logging
One tap, speak naturally, done. The app accepts any natural sentence about anything that happened, is planned, or needs to be remembered. No command syntax. No structure required from the user.

### 2. AI Understanding
Every log is processed silently. The app identifies what type of entry it is — **finance**, **event**, or **general** — and extracts the relevant data: amount, merchant, person, date, duration, location. Finer-grained labels (career, commitment, health, etc.) are applied as tags. **The user never manually categorizes anything.**

### 3. Expense Awareness
Logged expenses accumulate automatically by week and rough category. If a shared cost is involved — *"I paid $50 for the three of us"* — the app asks one clarifying question, tracks what others owe you, and closes the balance when repayment is logged. Your expense picture is always honest, not inflated by costs others actually covered.

### 4. Commitment Tracking
When you say you will do something, the app holds it. No aggressive reminders.

### 5. Daily Feed
A clean chronological view of everything logged on any given day. The single answer to *"what did I actually do today?"*

Scannable in under **30 seconds**.

### 6. Weekly Summary
Every Sunday, a short plain-language paragraph generated from your week's logs. Where your money went. Where your time went. What you committed to and whether you followed through. **No charts. Just an honest mirror.**

### 7. Query Interface
Ask your own data natural questions:
- *"How much did I spend on food this month?"*
- *"When did I last see Ahmed?"*
- *"What did I plan to do this week?"*

Answered from your logs using semantic search. When an exact match exists, the app answers directly. When it doesn't — for example, asking about "coffee" when only "Zigle's" is logged — the app surfaces the most related entries and is transparent about what it knows vs. what it's inferring. **Never fabricates. Never goes silent.**

### 8. Security
- Data stored securely in the cloud (Supabase — PostgreSQL with Row-Level Security)
- Each user's data is fully isolated at the database layer
- Biometric app lock
- No data shared with or visible to other users

---

## Product Feel

| Principle | Description |
|---|---|
| **Relief, not obligation** | Using the app should feel like putting something down, not picking something up |
| **Honest, not optimistic** | The app shows what is, not what you wish was |
| **Effortless, not impressive** | The magic is in what disappears, not what appears |

---

## MVP Success Criteria

> A user opens the app on **day 28**, reads their weekly summary, and thinks:
> *"Nothing else could have told me that about my own week."*

---

## Explicitly Saved for Later

- Receipt / photo capture
- Document vault
- Subscription tracking
- Relationship memory
- Time pattern insights

All real, all valid. None needed to prove the core value.

---

## What Is Never Built

- Bank sync
- Third-party integrations
- Streaks or gamification
- Social features

These are **not deferrals**. They are **permanent decisions** that protect what makes this product different.
