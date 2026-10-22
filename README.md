# Internal Attendance System (KITE) – Quick Start Guide

## Prerequisites
- **Node.js** (v18 or later) and **npm** (v9 or later) installed. Download from https://nodejs.org/.
- **Git** (optional, for cloning the repository).
- **SQLite** is used locally (no extra installation needed).

## 1. Clone the repository (if you haven't already)
```bash
git clone https://github.com/Thanvirassif731/kgisl-internal-attendance-system.git
cd your-folder-name
```

## 2. Install dependencies
### Backend
```bash
cd backend
npm install
```
### Frontend
```bash
cd ../frontend
npm install
```

## 3. Configure environment variables
Create a `.env` file in the **backend** directory (copy from `.env.example` if present) with at least the following keys:
```
PORT=5000
DATABASE_URL=file:./dev.db   # SQLite DB file (auto‑created)
JWT_SECRET=your_secret_key   # replace with a strong secret
JWT_EXPIRES_IN=1d
BCRYPT_SALT_ROUNDS=10
```
> The SQLite file `dev.db` will be created automatically on first run.

## 4. Initialise the database schema
From the **backend** folder run:
```bash
npx prisma generate   # generates Prisma client
npx prisma db push    # applies schema to SQLite DB
```
Optionally seed demo data:
```bash
npm run db:setup   # or the appropriate seed script if defined
```

## 5. Run the applications
### Backend API server
```bash
npm run dev   # starts server at http://localhost:5000
```
### Frontend UI
Open a new terminal and run:
```bash
cd ../frontend
npm run dev   # starts Vite dev server at http://localhost:5173
```
The frontend proxies API calls to the backend.

## 6. Open the app
Visit **http://localhost:5173** in your browser.

## Demo credentials
| Role | Username / Email | Password |
|------|------------------|----------|
| **Admin** | `admin` (or `admin@company.com`) | `admin123` |
| **Team member** | `ashfaq` (or `ashfaq.new@company.com`) | `user123` |

## 7. Common commands
- **Stop servers** – Press `Ctrl+C` in the terminal where each `npm run dev` is running.
- **Run tests** (if configured):
  ```bash
  cd backend && npm test
  cd ../frontend && npm test
  ```
- **Build for production** (optional):
  ```bash
  cd backend && npm run build   # adjust script if defined
  cd ../frontend && npm run build
  ```

## 8. Troubleshooting
- **`tsx` not found** – Ensure you ran `npm install` after any cleanup; the backend uses `tsx` for TypeScript execution.
- **Database errors** – Verify `DATABASE_URL` points to a writable location and that `dev.db` exists.
- **Port conflicts** – Change `PORT` in `.env` if another service uses `5000`.

## Production AWS database

Local development uses SQLite. The production Docker image generates a Prisma client for **MySQL**, intended for an Amazon RDS MySQL instance:

```dotenv
DATABASE_URL=mysql://<username>:<password>@<rds-endpoint>:3306/<database>
```

The deployment uses a single ECS/Fargate backend task with port `5000` exposed directly; it does not use a load balancer. Keep the RDS instance private and restrict inbound MySQL traffic (`3306`) to the ECS security group. See [architecture_documentation.md](architecture_documentation.md) for the AWS deployment steps.

---

You now have the full development environment set up. Happy coding!
