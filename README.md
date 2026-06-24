# SmartERP

A cloud-based, Tally-inspired Billing, Inventory, and Accounting Management System.

## Project Structure

- `frontend/` - Next.js 16 (App Router) + Tailwind CSS + Lucide React
- `backend/` - Node.js + Express.js REST API + PostgreSQL (local)

## Getting Started

### Database Setup
1. Ensure a PostgreSQL instance is running locally on port `5432`.
2. Configure `.env` in `backend/` with your connection string.
3. Run migrations:
   ```bash
   cd backend
   npm run migrate
   ```

### Running Backend
```bash
cd backend
npm run dev
```

### Running Frontend
```bash
cd frontend
npm run dev
```
