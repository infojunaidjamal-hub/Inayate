# Maison Bags (Inayate Bags)

Next.js 16 online store with a seller panel. Database: built-in SQLite (needs Node 22 or newer). Payments: Razorpay.

## Run on your computer
1. `npm install`
2. First time only, to create an EMPTY database: `node setup-db.mjs`
   (WARNING: this deletes data/maison.db and starts fresh. Never run it on a store that has real orders.)
3. `npm run dev`  then open http://localhost:3000

## .env keys
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, AUTH_SECRET, SELLER_SIGNUP_CODE, SITE_URL

## Helper scripts
- `node scripts/backup-db.mjs`  : database backup now (the site also makes a daily backup, kept 14 days, in data/backups)
- `node reset-owner.mjs`        : emergency reset if the Owner loses the password and the 2FA codes
- `node test-webhook.mjs MB1050`: test the Razorpay webhook on your own computer

## Folders that are NOT in git (keep safe)
`data/` (database and its backups), `public/uploads/` (product photos), `.env`
