# Architecture Overview – Internal Attendance System (KITE)

---

## 1. High‑Level Stack
| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Vite + React (TypeScript) | UI, routing, state, API calls |
| **Styling** | Vanilla CSS (with optional Tailwind utilities) | Modern look, dark‑mode, micro‑animations |
| **Backend** | Node.js + Express (TypeScript) | REST API, authentication, business logic |
| **ORM / DB** | mysql2/promise + MySQL | Data modeling, migrations, type‑safe queries |
| **Auth** | JSON Web Tokens (jwt) + bcrypt | Password hashing, stateless token auth |
| **Configuration** | dotenv (`.env`) + `src/config/env.ts` | Centralised runtime config (port, DB URL, JWT secret, etc.) |

---

## 2. Data Model (MySQL)
```sql
model User {
  id            Int      @id @default(autoincrement())
  email         String   @unique
  username      String   @unique
  passwordHash  String   // bcrypt hash
  role          Role     @default(USER) // ADMIN or USER
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  // … other relations (attendance, leaves, etc.)
}

enum Role {
  ADMIN
  USER
}
```

- **Where credentials are stored** – The `User` table lives in the configured MySQL database locally and in the private MySQL RDS database in production. Passwords never appear in plain text; they are stored as bcrypt hashes.
- The **JWT secret** (`JWT_SECRET`) and **expiry** (`JWT_EXPIRES_IN`) are defined in `.env` and loaded via `src/config/env.ts`.

---

## 3. User Creation Flow
1. **Client side** – A registration page collects `email`, `username`, and `password`.
2. **API call** – `POST /api/auth/register` sends the payload to `AuthController.register`.
3. **Backend processing**:
   - The password is hashed with `bcrypt.hash(password, config.bcryptSaltRounds)`.
   - A new `User` record is created with the hashed password.
   - The DB write is performed through the parameterized MySQL data-access layer.
4. **Response** – The endpoint returns a **201 Created** with a short success message (no token is issued yet).

> **Result:** The user’s credentials are persisted securely in the configured MySQL database; the raw password never touches the database.

---

## 4. Login & JWT Generation
1. **Client** posts `email|username` + `password` to `POST /api/auth/login`.
2. **AuthController.login**
   - Finds the user by *email* **or** *username* (flexible lookup).
   - Uses `bcrypt.compare` to verify the supplied password against `user.passwordHash`.
   - On success, calls the utility `generateJwt(user.id, user.role)`.
3. **JWT Utility (`src/utils/jwt.utils.ts`)**
   ```ts
   export const generateJwt = (userId: number, role: Role) => {
     return jwt.sign({ sub: userId, role }, config.jwtSecret, {
       expiresIn: config.jwtExpiresIn,
     });
   };
   ```
   - Payload contains `sub` (user id) and `role`.
   - Signed with the secret from `.env`.
   - Expiration is read from `config.jwtExpiresIn` (default `1d`).
4. **Response** – The server returns `{ token: <JWT> }`.
5. **Frontend handling** – The `login` function in `frontend/src/services/api.ts` stores the token in `localStorage` and updates the global `AuthContext` state.

---

## 5. JWT Validation (Protected Routes)
1. **Middleware (`src/middleware/auth.middleware.ts`)**
   ```ts
   export const authenticate = (req, res, next) => {
     const header = req.headers.authorization?.split(' ')[1];
     if (!header) return res.status(401).json({ message: 'Missing token' });

     try {
       const payload = jwt.verify(header, config.jwtSecret) as JwtPayload;
       req.user = { id: payload.sub, role: payload.role };
       next();
     } catch (err) {
       return res.status(401).json({ message: 'Invalid or expired token' });
     }
   };
   ```
2. The middleware is attached to any route that needs authentication (e.g., `router.use('/attendance', authenticate, attendanceRouter)`).
3. After verification, `req.user` is available for controllers to enforce role‑based access (e.g., only `ADMIN` can manage other users).

---

## 6. Front‑End Token Usage
- **Axios interceptor (`frontend/src/services/api.ts`)** adds `Authorization: Bearer <token>` to every outgoing request after a user logs in.
- The token is read from `localStorage.getItem('token')`.
- When a 401 response is received, the interceptor can optionally clear the token and redirect to the login page (not shown but easy to add).

---

## 7. Configuration & Secrets
- **`.env`** (root of `backend/`)
  ```dotenv
  PORT=5000
  # Local development:
  DATABASE_URL=mysql://<user>:<password>@<host>:3306/<database>
  # Production (Amazon RDS MySQL):
  # DATABASE_URL=mysql://<username>:<password>@<rds-endpoint>:3306/<database>
  JWT_SECRET=super_secret_key_here
  JWT_EXPIRES_IN=1d
  BCRYPT_SALT_ROUNDS=10
  ```
- These values are loaded via `dotenv` in `src/config/env.ts` and exported as the `config` object used across the codebase.
- **Important** – Do **not** commit `.env` to source control; it is listed in `.gitignore`.

---

## 8. Summary of Flow
```mermaid
flowchart TD
    subgraph Frontend
        F1[Login Page] -->|POST /api/auth/login| B1[Backend Auth]
        F2[Store JWT in localStorage]
        F3[Axios interceptor adds Authorization header]
        F4[Protected UI pages]
    end
    subgraph Backend
        B1[AuthController.login]
        B1 -->|bcrypt.compare| DB[User table (MySQL)]
        B1 -->|jwt.sign| JWT[JWT token]
        JWT --> F2
        subgraph ProtectedRoutes
            PR[authenticate middleware]
            PR -->|jwt.verify| JWT
            PR --> Controllers[Business logic]
        end
    end
```

---

## 9. Where to Find the Code
| Concern | File Path (backend) |
|---------|--------------------|
| Config & env vars | `src/config/env.ts` |
| MySQL connection pool | `src/utils/mysql.ts` |
| JWT utilities | `src/utils/jwt.utils.ts` |
| Auth controller (register/login) | `src/controllers/auth.controller.ts` |
| Auth middleware | `src/middleware/auth.middleware.ts` |
| Database schema | `sql/schema.mysql.sql` |

---

**That completes the architectural overview.**  Let me know if you need deeper details on any specific component (e.g., database seeding, role‑based guards, or UI design).

## 10. AWS Deployment Plan

The production deployment is intentionally documented as a manual AWS process. Docker Compose and Terraform are not required.

### 10.1 Create the network

1. Select an AWS Region.
2. Create a VPC with DNS hostnames and DNS resolution enabled.
3. Create a public subnet for the ECS task.
4. Create private subnets in different Availability Zones for RDS.
5. Attach an Internet Gateway to the VPC.
6. Configure a route table for the public subnet with a default route through the Internet Gateway.

### 10.2 Create security groups

Create separate security groups with these rules:

| Security group | Inbound | Outbound |
|---|---|---|
| ECS backend | TCP 5000 from the application users' trusted IP range | All |
| RDS MySQL | TCP 3306 only from the ECS security group | Default |

The ECS task uses a public IP because this deployment does not use a load balancer. Restrict port 5000 to the smallest practical trusted IP range, and do not make RDS publicly accessible.

### 10.3 Create the RDS database

1. Create an RDS MySQL instance in the private subnets.
2. Enable storage encryption and automated backups.
3. Set a strong admin username and password. Store them in AWS Secrets Manager rather than in source code.
4. Record the RDS endpoint and database name.
5. Build the production MySQL URL:

```text
mysql://<username>:<password>@<rds-endpoint>:3306/<database>
```

### 10.4 Build and publish the backend image

Create an ECR repository, then from the repository root run:

```powershell
aws ecr get-login-password --region <region> |
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com

docker build -t attendance-backend:latest .\backend
docker tag attendance-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/attendance-backend:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/attendance-backend:latest
```

The backend image uses the direct MySQL data-access layer during its production build. Do not use `docker compose`.

### 10.5 Create ECS/Fargate

1. Create an ECS cluster using the Fargate launch type.
2. Create a task execution role with permission to pull from ECR, write to CloudWatch Logs, and read the required Secrets Manager secrets.
3. Create a CloudWatch log group.
4. Create a task definition with:
   - Container image: the ECR backend image.
   - CPU: at least 0.25 vCPU.
   - Memory: at least 512 MB.
   - Container port: `5000`.
   - `NODE_ENV=production`.
   - `PORT=5000`.
   - `DATABASE_URL` from Secrets Manager.
   - `JWT_SECRET` from Secrets Manager.
   - `JWT_EXPIRES_IN=7d`.
   - `BCRYPT_SALT_ROUNDS=12`.
   - `CORS_ORIGIN` set to the final CloudFront URL.
5. Create an ECS service using the public subnet, enable public IP assignment, and set the task security group to allow TCP `5000` only from the trusted application users' IP range.
6. Use the ECS task's public DNS/IP (or a DNS record that points to it) as the API origin. ECS task public IPs can change when tasks are replaced, so update the frontend configuration and DNS record after redeployments.

### 10.6 Create the frontend S3 and CloudFront distribution

1. Create a private S3 bucket with Block Public Access enabled.
2. Create a CloudFront distribution using the S3 bucket as its origin.
3. Configure CloudFront Origin Access Control (OAC), and allow only that distribution to read the bucket.
4. Configure the default root object as `index.html`.
5. Configure CloudFront custom error responses for 403 and 404 to return `/index.html` with status 200, so React Router routes work.
6. Build and upload the frontend using the API URL:

```powershell
cd frontend
npm ci
$env:VITE_API_URL = "https://<api-domain>"
npm run build
aws s3 sync .\dist s3://<frontend-bucket> --delete
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

`VITE_API_URL` must contain only the API origin, without the `/api` suffix. The application appends `/api` itself.

### 10.7 Final configuration and verification

1. Set the backend `CORS_ORIGIN` to the CloudFront URL.
2. Restart or redeploy the ECS service so the new environment variable is loaded.
3. Verify the API health endpoint at `https://<api-domain>/api/health`.
4. Verify:
   - The ECS target is healthy.
   - The backend can connect to RDS.
   - Login returns a JWT.
   - Authenticated attendance, leave, task, and announcement requests work.
   - Refreshing a deep-linked frontend route does not return an S3 404.
   - CloudWatch logs contain no database connection errors.

Run the MySQL schema script from a controlled environment that can reach the private RDS instance:

```powershell
cd backend
$env:DATABASE_URL = "postgresql://<username>:<password>@<rds-endpoint>:5432/<database>?schema=public"
mysql --host=<host> --user=<user> --password <database> < sql/schema.mysql.sql
```

Keep schema changes in reviewed SQL scripts before each production release. Seed demo credentials only in non-production environments.
