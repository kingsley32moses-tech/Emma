# Render deployment checklist — Emma's Decor Mw

## Web Service settings

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Node version: 22 (supported by `package.json`)

## Required Environment variables

Add these in **Render → your Web Service → Environment**. Do not add real secrets to this project or commit them to Git.

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `SESSION_SECRET` | A unique random string, at least 32 characters |
| `ADMIN_INITIAL_PASSWORD` | A unique password, at least 12 characters |
| `ADMIN_EMAIL` | Your chosen admin email (optional; defaults to `admin@emmasdecormw.com`) |

Generate a random session secret on a computer with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The application refuses to start in production if the session secret or initial admin password is missing, too short, or a known placeholder. This avoids deploying with the development session key or the old sample admin password.

## Persistent storage

The application stores SQLite data and uploaded portfolio images on disk. Attach a persistent disk to the service, for example mounted at `/var/data`, then add:

| Key | Value |
| --- | --- |
| `DATA_DIR` | `/var/data` |
| `UPLOADS_DIR` | `/var/data/uploads` |

Without persistent storage, Render may erase the database and uploaded images when an instance is replaced or redeployed. Confirm the persistent disk is available before launch.

## After deployment

1. Wait for the deploy to finish and check the service logs for `Emma's Decor Mw website running`.
2. Open `https://YOUR-SERVICE.onrender.com/`.
3. Open `https://YOUR-SERVICE.onrender.com/admin` and sign in using the configured `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`.
4. Complete the forced password change immediately.
5. Test an enquiry submission, admin login, and a portfolio image upload.

If this is an existing service with an existing SQLite database, changing `ADMIN_INITIAL_PASSWORD` does not reset an existing admin account. Use the current account password and the in-app password-change flow.

### Customer accounts
- Customer registration: `/register`
- Customer sign-in/dashboard: `/login` and `/account`
- Admin sign-in remains at `/admin`.
- Customer accounts and session data are stored in the SQLite database under `DATA_DIR`. Configure a persistent disk for the data directory.
- For a booking to appear in a customer's dashboard, the booking phone number entered by the admin must match the phone number on the customer's account.
