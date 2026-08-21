# SmartERP Deployment & Setup Guide (GitHub, Vercel & Render)

This document provides complete, step-by-step instructions to configure and deploy SmartERP to GitHub, Render (Backend API), and Vercel (Frontend Next.js app).

---

## 1. Database Setup (PostgreSQL)

SmartERP requires a PostgreSQL database. You can use any managed PostgreSQL provider (e.g. **Neon**, **Supabase**, or **Render PostgreSQL**):

### Option A: Free Neon PostgreSQL (Recommended)
1. Go to [Neon.tech](https://neon.tech) and create a free project.
2. Copy your Connection String (e.g. `postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require`).

### Option B: Supabase PostgreSQL
1. Go to [Supabase.com](https://supabase.com) and create a project.
2. Under Project Settings -> Database -> Connection String (URI), copy the connection URL.

### Option C: Render PostgreSQL
1. On your Render dashboard, click **New +** -> **PostgreSQL**.
2. Copy the **External Connection String** (for local testing) or **Internal Connection String** (for Render backend service).

---

## 2. Render Deployment (Backend API)

1. Connect your GitHub repository `Smart-ERP` on [Render.com](https://render.com).
2. Create a **Web Service**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
3. Configure Environment Variables in Render:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or leave default provided by Render)
   - `DATABASE_URL`: `postgresql://<user>:<password>@<host>:<port>/<dbname>`
   - `JWT_SECRET`: `<your-secure-random-jwt-secret>`
   - `CORS_ORIGIN`: `https://your-app.vercel.app` (or comma-separated list of allowed origins)
4. Deploy the Web Service. Render will build and start the backend. On server boot, backend will automatically run database schema migrations!

---

## 3. Vercel Deployment (Frontend Next.js App)

1. Import your GitHub repository `Smart-ERP` on [Vercel.com](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Configure Environment Variables in Vercel:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend.onrender.com/api` (Replace with your actual Render backend URL)
4. Click **Deploy**.

---

## 4. Local Development Setup

To run SmartERP locally:

1. In `backend/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL=postgresql://user:password@localhost:5432/smart_erp
   JWT_SECRET=smart-erp-dev-secret-key-2024
   CORS_ORIGIN=http://localhost:3000
   ```
2. Run database migrations:
   ```bash
   cd backend
   npm run migrate
   ```
3. Start Backend:
   ```bash
   cd backend
   npm run dev
   ```
4. Start Frontend:
   ```bash
   cd frontend
   npm run dev
   ```
