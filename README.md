# FastAPI Calculator — Module 13 (JWT + Front-End + Playwright)

Adds an HTML/JS front-end for user registration and login on top of the Module 12 JWT-authenticated API, with Playwright end-to-end tests running in the CI/CD pipeline.

**Status:** pytest 70/70 · Playwright 11/11 · CI green · Image deployed to Docker Hub

## What's new in Module 13

- **Front-end pages** — `/`, `/register`, `/login`, `/dashboard` served from `static/`
  - Client-side validation: email format, password min-length, password confirmation match
  - JWT stored in `localStorage` on successful login
  - Dashboard fetches the authenticated user via `GET /users/me` and renders their info
  - Logout clears the stored token
- **Playwright E2E tests** — positive and negative flows for both register and login
- **Updated CI pipeline** — new `e2e` job runs the Playwright suite with a spun-up Postgres + auto-started uvicorn server
- **Flexible login** — the `/users/login` endpoint now accepts either `username` or `email` as the identifier, so the front-end can stay email-first while existing pytest integration tests keep passing

## Project Layout

```
app/
  main.py                  # FastAPI app + static file mount + page routes
  routers/
    users.py               # /users/register, /users/login (flex), /users/token, /users/me
    calculations.py        # BREAD (from Module 12)
  auth/
    hashing.py             # bcrypt
    jwt.py                 # JWT create/decode + get_current_user
  schemas/                 # Pydantic v2 models
  models/                  # SQLAlchemy tables
static/
  index.html
  register.html
  login.html
  dashboard.html
  css/style.css
  js/
    api.js                 # Shared fetch helper + localStorage token handling
    register.js
    login.js
    dashboard.js
e2e/
  package.json
  playwright.config.ts     # webServer auto-start in CI, local uvicorn otherwise
  tests/
    register.spec.ts       # 5 tests
    login.spec.ts          # 6 tests
tests/
  unit/                    # From Module 12 — no DB required
  integration/             # From Module 12 — real Postgres
  conftest.py
.github/workflows/ci.yml   # test → e2e → build-and-push
Dockerfile                 # Copies app/ + static/
docker-compose.yml
requirements.txt
REFLECTION.md
```

## Running the Front-End Locally

### Option A — Docker Compose (fastest)

```bash
cp .env.example .env
# edit JWT_SECRET_KEY in .env
docker compose up --build
```

Then open http://localhost:8000 in your browser.

### Option B — Python + Postgres container

```bash
# 1. Start Postgres
docker run -d --name fastapi-pg \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fastapi_calc \
  -p 5432:5432 postgres:16

docker exec -i fastapi-pg psql -U postgres -c "CREATE DATABASE fastapi_calc_test;"

# 2. Install deps
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 3. Set a dev JWT secret
export JWT_SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(64))")

# 4. Run the app
uvicorn app.main:app --reload
```

Open http://localhost:8000 — landing page links to register/login. After login you land on the dashboard.

## Running the Playwright E2E Tests

The E2E suite requires the FastAPI server to be running and a fresh Postgres connection.

### First-time setup

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
```

### Run the tests

Start the FastAPI server in one terminal:

```bash
uvicorn app.main:app --reload
```

In a second terminal:

```bash
cd e2e
npx playwright test            # headless
npx playwright test --headed   # watch them run in a real browser
npx playwright test --ui       # interactive test runner
```

View the HTML report after a run:

```bash
npx playwright show-report
```

## Running the Python Test Suite

```bash
# Full (unit + integration)
pytest --cov=app --cov-report=term-missing -v

# Unit only (no DB)
pytest tests/unit -v

# Integration only
pytest tests/integration -v
```

## Manual Walk-Through (the demo path Playwright automates)

1. `GET /` → landing page with Register and Login buttons
2. `/register` — fill username, email, password, confirm → submit
3. Redirects to `/login` with a success banner
4. `/login` — fill email + password → submit
5. JWT is stored in `localStorage` under key `auth_token`
6. Redirects to `/dashboard` showing username, email, user ID, join date
7. **Log out** button clears the token and returns to `/login`
8. Manually navigating to `/dashboard` without a token auto-redirects to `/login`

## Docker Hub

```bash
docker pull gxutxm7/fastapi-calculator:latest
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql+psycopg2://postgres:postgres@host.docker.internal:5432/fastapi_calc \
  -e JWT_SECRET_KEY=your-secret-here \
  gxutxm7/fastapi-calculator:latest
```

**Docker Hub repo:** https://hub.docker.com/r/gxutxm7/fastapi-calculator

## CI/CD

`.github/workflows/ci.yml` runs three jobs on every push to `main`:

1. **test** — pytest against Postgres 16 (unit + integration, 70 tests, 96% coverage)
2. **e2e** — Playwright against a fresh Postgres + auto-started uvicorn, then uploads the HTML report as a workflow artifact
3. **build-and-push** — only on `main`, builds the Docker image, pushes `latest` + SHA tag to Docker Hub, scans with Trivy

Required repository secret: `DOCKERHUB_TOKEN` (Docker Hub Access Token with Read/Write/Delete scope).

## Security Notes

- Passwords are **never** stored in plaintext — only bcrypt hashes.
- JWTs are signed with HS256 using `JWT_SECRET_KEY` loaded from environment.
- The JWT is stored in `localStorage` for this assignment; for production, an HTTP-only cookie (immune to XSS token theft) would be safer. Documented as a known limitation for Module 14.
- Duplicate-registration attempts return `409 Conflict`, which is surfaced in the UI as a friendly message rather than leaking the raw `IntegrityError`.
- Client-side validation is **not** the only line of defense — Pydantic enforces every constraint server-side too.


