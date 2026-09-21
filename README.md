# Alpha Creative CRM / ERP System

A full-stack Enterprise Resource Planning and Customer Relationship Management solution built with FastAPI, React 19, Vite, MySQL, and Redis.

## 🚀 Tech Stack

- **Backend:** Python 3.13, FastAPI, SQLAlchemy (Async), Pydantic v2, Python-Jose (JWT Auth)
- **Database & Cache:** MySQL / MariaDB, Redis (Async Caching)
- **Frontend:** React 19, TypeScript, Vite, TailwindCSS v4, Lucide React
- **Orchestration:** Monorepo process manager via root `main.py`

---

## 🛠️ System Requirements

- **Python:** 3.11+
- **Node.js:** 18+
- **Database:** MySQL 8.0+ running on `127.0.0.1:3306`
- **Cache:** Redis running on `127.0.0.1:6379` (Optional, graceful fallback)

---

## 📦 Project Structure

```
├── backend/            # FastAPI Async REST API
│   ├── app/
│   │   ├── api/        # Endpoint routers (Auth, Clients, Staff, Jobs, etc.)
│   │   ├── models/     # SQLAlchemy ORM models
│   │   ├── schemas/    # Pydantic validation schemas
│   │   ├── config.py   # System configuration & environment loading
│   │   └── cache.py    # Redis caching layer
│   └── run.py          # Uvicorn server launcher
├── frontend/           # Vite React 19 Single Page Application
│   └── src/
│       ├── components/ # Dashboard and management UI views
│       ├── context/    # DataContext & ThemeProvider
│       └── App.tsx     # App routing & Auth guards
├── .env                # Root environment configuration
└── main.py             # Single command server runner
```

---

## ⚙️ Environment Configuration (`.env`)

Configure system environment settings in the root `.env` file:

```env
BACKEND_PORT=8000
FRONTEND_PORT=5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=alpha_creative_db
DATABASE_URL=mysql+aiomysql://root:@127.0.0.1:3306/alpha_creative_db

REDIS_URL=redis://127.0.0.1:6379/0
SECRET_KEY=your_secure_jwt_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## 🚦 Getting Started

### 1. Install Dependencies

**Backend:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 2. Start Full-Stack Application

Run the unified runner from the root directory to launch both FastAPI backend and Vite frontend:

```bash
python3 main.py
```

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **FastAPI OpenAPI Specs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
