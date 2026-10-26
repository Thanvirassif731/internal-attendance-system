# Internal Attendance System (KITE) – Quick Start Guide

## Prerequisites
- **Node.js** (v18 or later) and **npm** (v9 or later) installed. Download from https://nodejs.org/.
- **Git** (optional, for cloning the repository).
- **MySQL** is used for both local development and production.

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
DATABASE_URL=mysql://<user>:<password>@<host>:3306/<database>
JWT_SECRET=your_secret_key   # replace with a strong secret
JWT_EXPIRES_IN=1d
BCRYPT_SALT_ROUNDS=10
```
> Run the explicit schema script `backend/sql/schema.mysql.sql` against MySQL before starting the API.

## 4. Initialise the database schema
From the **backend** folder run:
```bash
mysql --host=<host> --user=<user> --password <database> < sql/schema.mysql.sql
```
Optionally seed demo data:
```bash
npm run db:seed    # optional; clears and recreates demo data in the configured database
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
- **Database errors** – Verify the local MySQL service is running, the credentials in `DATABASE_URL` are valid, and `sql/schema.mysql.sql` has been applied.
- **Port conflicts** – Change `PORT` in `.env` if another service uses `5000`.

## Production AWS database

Local development and production use **MySQL**. Configure the database through the environment:

```dotenv
DATABASE_URL=mysql://<username>:<password>@<rds-endpoint>:3306/<database>
```

The deployment uses a single ECS/Fargate backend task with port `5000` exposed directly; it does not use a load balancer. Keep the RDS instance private and restrict inbound MySQL traffic (`3306`) to the ECS security group. See [architecture_documentation.md](architecture_documentation.md) for the AWS deployment steps.

---

You now have the full development environment set up. Happy coding!
