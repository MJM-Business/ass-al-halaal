# Ass Al Halaal / Kabsh Najd — Operational Application

This project is a local-first ordering and operations platform with a shared Node.js backend, SQLite database, customer storefront, admin portal, real admin 2FA, RBAC, audit history, slaughterhouse operations, delivery/courier workflows, finance records, WhatsApp integration hooks and a local business-grounded AI assistant.

## Run in Cursor

1. Open the project folder in Cursor.
2. Make sure Node.js 22.5+ is installed.
3. Run:

```bash
npm start
```

4. Open:

```text
http://127.0.0.1:5173
```

5. Keep the terminal open while using the app.

No `npm install` is required for the current web build when using only the built-in Node.js modules already used by the project.

## Environment Setup

The real `.env` file contains private configuration and secrets and must never be committed to source control.

Use the included `.env.example` as the safe template.

Important local-development values:

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=5173
KABSH_COOKIE_SECURE=0
KABSH_TRUST_PROXY=0
```

For live HTTPS hosting, use production-safe settings and real secrets only in the private `.env` file.

## Admin Authentication

Admin authentication uses:

```text
Admin ID + Password -> OTP Verification -> Secure Admin Session
```

The old local PIN login is no longer used.

Admin authentication includes:

- Passwords hashed server-side with bcrypt (cost 12). Legacy scrypt hashes are verified only for migration and automatically upgraded to bcrypt after a successful password login.
- Real OTP delivery through configured email and/or SMS providers.
- OTP expiration.
- Wrong-code attempt limits.
- OTP resend cooldown and resend limits.
- HttpOnly admin session cookies.
- Configurable session lifetime.
- Login and security events recorded in the audit/governance system.
- Brute-force protection for admin password attempts.

Default admin ID:

```text
ADM-JED-001
```

The admin password is configured privately through `.env`.

Never store the real password, OTP pepper, API keys, tokens or provider secrets in source files or README documentation.

## Customer Authentication

Customer accounts support password-based login and optional Google sign-in when configured.

Customer sessions use HttpOnly cookies and include login throttling and production-safe cookie behavior.

## What Is Operational

### Customer Storefront

- Arabic and English interface.
- Product catalogue and product search.
- Product customisation.
- Cart and checkout.
- Server-side price validation.
- Customer account login.
- Order tracking and account orders.
- Shared backend/database rather than browser-only demo storage.

### Admin Portal

- Dashboard.
- Suppliers.
- Orders and slaughterhouse operations.
- Veterinary / slaughter / preparation workflow records.
- Delivery and courier management.
- Finance and settlements.
- AI Center.
- WhatsApp Inbox foundation.
- Marketing.
- Users and governance.
- Central audit log.
- Role-based permissions.

### Security

- Password + OTP admin 2FA.
- Secure admin sessions.
- RBAC.
- Append-only central audit history.
- Security event logging.
- Login throttling.
- Security response headers.
- Environment-secret separation.
- Production-aware secure cookies.

### Database

SQLite is created automatically at:

```text
data/kabsh-najd.sqlite3
```

The application also uses SQLite WAL mode.

Database files are excluded from Git by `.gitignore`.

## Order Lifecycle

Current customer/admin order lifecycle:

```text
Received
-> Confirmed
-> Preparing
-> Ready
-> Delivery
-> Completed
```

Cancelled is also supported.

Operational slaughterhouse and courier workflows keep their own related status histories.

## Admin 2FA Providers

### Email OTP

Email OTP can be delivered through Resend when configured.

Required private environment values:

```env
RESEND_API_KEY=
KABSH_OTP_FROM_EMAIL=
```

### SMS OTP

SMS OTP can be delivered through Twilio when configured and supported for the destination.

Required private environment values:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

The application can continue using email OTP while SMS is not configured.

## WhatsApp / Meta

WhatsApp Cloud API support is present in the backend.

Private credentials belong only in `.env`.

Typical configuration:

```env
WHATSAPP_ENABLED=0
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WABA_ID=
WHATSAPP_DISPLAY_PHONE_NUMBER=
WHATSAPP_GRAPH_VERSION=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
META_APP_SECRET=
```

Do not place access tokens or Meta secrets in frontend files.

## AI Assistant

The current AI service is business-grounded and rule-based by default.

It can work without exposing an external AI API key.

Optional hosted-provider keys can remain blank unless a hosted model is intentionally integrated.

## Main Files

- `scripts/serve.mjs` — HTTP server, API routes, authentication, SQLite, operations and security.
- `scripts/ai-service.mjs` — local business-grounded AI assistant.
- `www/index.html` — application shell.
- `www/style.css` — customer and admin styling.
- `www/app.js` — customer storefront and admin UI logic.
- `www/shop.js` — product catalogue metadata and validation helpers.
- `www/assets/` — local visual assets.
- `data/kabsh-najd.sqlite3` — generated local SQLite database.
- `.env` — private local secrets/configuration; never commit.
- `.env.example` — safe environment template.
- `.gitignore` — excludes secrets, database files, logs and generated folders.

## Tests

Run:

```bash
npm run check
```

This checks the main JavaScript files and runs the current automated test suite.

Health endpoint:

```bash
npm run health
```

## Local vs Production

### Local Development

Use:

```env
NODE_ENV=development
KABSH_COOKIE_SECURE=0
KABSH_TRUST_PROXY=0
```

### Production

Production must use HTTPS.

Recommended production configuration includes:

```env
NODE_ENV=production
KABSH_COOKIE_SECURE=1
```

Enable `KABSH_TRUST_PROXY=1` only when the deployment is actually behind a trusted reverse proxy that sets the client IP headers correctly.

Production also requires:

- Strong unique admin password.
- Persistent `KABSH_OTP_PEPPER`.
- Verified OTP email domain.
- Secure provider credentials.
- Database backup and restore process.
- Production payment gateway configuration when online payments are enabled.
- Monitoring and regular security review.

## Current Development Priorities

The current application foundation is operational.

Recommended next phases:

1. Align Users & Governance MFA labels with the real Email/SMS OTP system.
2. Add Admin Security Settings:
   - Change password
   - Change 2FA email
   - Change mobile
   - Active sessions
   - Logout all devices
3. Consolidate and modularize large frontend/backend files.
4. Clean duplicated CSS rules and standardize design tokens.
5. Optimize large image assets.
6. Increase automated test coverage.
7. Add database backup/restore tooling.
8. Integrate the production online payment gateway.
9. Complete production WhatsApp provider setup.
10. Prepare live HTTPS deployment.
