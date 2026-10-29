# AI Business Operator

**Give the AI a business goal. It plans the work, researches, analyzes, decides what needs to
happen, prepares actions, reviews its own work, and gives you a clear result.**

Built for the Nebius × NVIDIA Global AI Hackathon.

```
GOAL → PLAN → RESEARCH → ANALYZE → QUALIFY → ACT → REVIEW → RESULT
```

You never tell the Operator *how* to do the work. You state the outcome you want and it decides
the plan, the research method, the scoring model and the message — then stops for your approval
before anything leaves the workspace.

---

## 1. Quick start

Two processes: a FastAPI backend and a Vite/React frontend.

```bash
# Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env          # optional - the app runs in demo mode without it
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend (separate terminal)
cd frontend
npm install --legacy-peer-deps
npm run dev -- --host 0.0.0.0 --port 5173
```

Open **http://localhost:5173** and choose **Continue with Demo Workspace**.

> The demo workspace is seeded on first boot by running the *real* agent pipeline, so every screen
> is backed by internally consistent data: 47 researched companies, 24 qualified leads,
> 8 high-intent opportunities, 17 reviewed messages and 6 follow-ups due today.

### Demo credentials

| Field    | Value              |
| -------- | ------------------ |
| Email    | `sadik@myagency.in` |
| Password | `operator`         |

---

## 2. Connecting real inference (Nebius Token Factory)

The application never hard-codes a model. The AI layer is a provider interface:

```
Frontend → Backend API → Agent Orchestrator → AIProvider → Nebius Token Factory → NVIDIA Nemotron
```

Add a key on the server and the same workflow runs on real inference — no application code changes.

```bash
# backend/.env
NEBIUS_API_KEY=your_server_side_key
NEBIUS_BASE_URL=https://api.studio.nebius.ai/v1
NEBIUS_MODEL=nvidia/Llama-3.1-Nemotron-Nano-8B-v1
```

`backend/app/services/provider_factory.py` picks the provider at runtime:

| Condition              | Provider                       | Mode  |
| ---------------------- | ------------------------------ | ----- |
| `NEBIUS_API_KEY` set   | `NebiusProvider`               | live  |
| No key / `FORCE_DEMO_PROVIDER=true` | `DemoProvider`     | demo  |

Both implement `AIProvider.complete(request) -> AIResponse`, so every agent, the orchestrator and
the API are identical in both modes. **Credentials are read from the server environment only and
are never bundled into the frontend.**

---

## 3. Architecture

```
ai-business-operator/
├── backend/
│   ├── app/
│   │   ├── agents/            # the six agents + the Operator
│   │   │   ├── base.py        #   Agent contract, AgentContext
│   │   │   ├── planner.py     #   goal  -> execution plan
│   │   │   ├── researcher.py  #   discovery + cited evidence
│   │   │   ├── analyst.py     #   opportunity signal detection
│   │   │   ├── qualifier.py   #   scoring, ranking, pruning
│   │   │   ├── writer.py      #   personalised outreach
│   │   │   ├── reviewer.py    #   grounding + tone + spam checks
│   │   │   └── operator.py    #   workflow orchestration + mission state
│   │   ├── services/
│   │   │   ├── ai_provider.py #   provider interface (ABC)
│   │   │   ├── nebius.py      #   Nebius Token Factory client (live)
│   │   │   ├── demo.py        #   deterministic demo provider
│   │   │   ├── demo_dataset.py#   seeded fictional research universe
│   │   │   └── provider_factory.py
│   │   ├── routers/           # HTTP layer, one module per domain
│   │   ├── db.py              # schema + thin SQL repository
│   │   ├── repository.py      # persistence helpers
│   │   ├── security.py        # PBKDF2 passwords, HMAC session tokens
│   │   ├── seed.py            # demo workspace generator
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/        # layout, ui primitives, mission, shared
│       ├── context/           # auth + toast providers
│       ├── hooks/             # data fetching
│       ├── lib/               # api client, types, formatters
│       └── pages/             # one file per route
└── .env.example
```

### Agent responsibilities

| Agent         | Responsibility                                             |
| ------------- | ---------------------------------------------------------- |
| Planner       | Converts the business goal into steps and success criteria  |
| Researcher    | Collects company information and cites every source         |
| Analyst       | Detects opportunity signals from the collected evidence      |
| Qualification | Scores, ranks and removes opportunities it cannot justify    |
| Writer        | Drafts outreach conditioned on detected signals             |
| Reviewer      | Verifies every claim, checks tone and spam risk              |
| Operator      | Coordinates the whole workflow and owns mission state        |

### Data model

`users`, `workspaces`, `workspace_members`, `sessions`, `missions`, `mission_steps`, `agents`,
`companies`, `leads`, `research_records`, `opportunity_scores`, `signals`, `outreach_messages`,
`follow_ups`, `activity_logs`, `knowledge_items`, `integrations`, `workspace_settings`.

Every mission belongs to a workspace; every lead belongs to a mission; every activity entry carries
`timestamp`, `agent`, `action`, `status` and `message`.

---

## 4. Product behaviour that matters

- **Autonomy is visible.** The mission page shows a 7-stage workflow timeline, a live agent team
  panel and a timestamped activity feed while the Operator works.
- **Evidence, not guesses.** The Research page lists every collected field with its source, URL and
  confidence. The Reviewer refuses unsupported claims and flags them before a human sees them.
- **Humans stay in control.** Nothing is sent automatically. Outreach is drafted, reviewed and
  approved by a person; approval schedules the follow-up.
- **Honest about its own state.** Every mission is labelled `live` or `demo`. A failed step stops the
  workflow with a clear reason and a Retry action instead of a blank screen.

---

## 5. Routes

`/login` · `/dashboard` · `/missions` · `/missions/new` · `/missions/:id` · `/leads` · `/leads/:id` ·
`/research` · `/outreach` · `/follow-ups` · `/analytics` · `/insights` · `/knowledge` · `/activity` ·
`/integrations` · `/settings`

---

## 6. Security

- Passwords hashed with PBKDF2-HMAC-SHA256 (180k iterations, per-user salt).
- Sessions are HMAC-signed, expiring, server-verified tokens; the browser only stores the string.
- API keys are read from the server environment and are never exposed to the frontend.
- `.env` is git-ignored; `.env.example` contains placeholders only.
- All request bodies are validated with Pydantic; all generated content is rendered as plain text
  (React escapes by default — no `dangerouslySetInnerHTML` anywhere).

---

## 7. Demo script (2 minutes)

1. **Login** — `Continue with Demo Workspace`.
2. **Dashboard** — the Operator waiting for a goal, plus the live snapshot (24 leads, 8 high intent,
   17 outreach, 6 follow-ups).
3. **Create a mission** — type *"Find 10 high-value healthcare businesses in India that need a new
   website."* and press **Launch Mission**.
4. **Watch it work** — Plan → Research → Analyze → Qualify → Personalize → Review → Result, with
   the agent team and activity feed updating live.
5. **Result** — 47 researched, 24 qualified, 8 high intent, 17 outreach ready.
6. **Leads** → open *MedCare Health Systems* — the score, the reasons it was selected, the detected
   signals and the cited research record.
7. **Outreach** — read the personalised message, check the reviewer's notes, press **Approve**.
8. **Follow-ups** — the next touch is already scheduled.

---

## 8. Environment variables

See `.env.example` for the full list.

| Variable                | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `SECRET_KEY`            | HMAC key for session tokens                        |
| `DATABASE_PATH`         | SQLite file location                               |
| `NEBIUS_API_KEY`        | Nebius Token Factory key (server side only)        |
| `NEBIUS_BASE_URL`       | Inference endpoint                                 |
| `NEBIUS_MODEL`          | Model id, e.g. an NVIDIA Nemotron model            |
| `FORCE_DEMO_PROVIDER`   | Force demo mode even when a key is present         |
| `DEMO_STEP_DELAY`       | Seconds each demo agent "thinks" per step           |
| `CORS_ORIGINS`          | Allowed browser origins                            |
