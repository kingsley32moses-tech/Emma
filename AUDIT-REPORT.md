# Technical audit — Emma's Decor Mw v1.0.1

## Static checks completed
- ZIP archive integrity: passed.
- Node syntax checks: passed for `server.js`, `public/app.js`, and `public/admin.js`.
- `npm test` (syntax-check script): passed.
- HTML parser checks: passed for the public site and admin page.
- CSS brace-balance checks: passed for both stylesheets.
- Package manifest JSON: valid.

## Fixes applied
- Enforced the mandatory first-login password change in protected admin API routes, not just in the browser interface.
- Added a health-check endpoint at `/api/health`.
- Added phone and WhatsApp click-to-contact links, with the WhatsApp destination controlled by admin settings.
- Added the optional budget field to the public enquiry form.
- Added a public testimonials section that appears when genuine testimonials are added in the dashboard.
- Added a workflow to create a tentative booking from an enquiry.
- Added basic email/date validation for public enquiries.
- Validated Facebook URLs as HTTPS links and checked WhatsApp number format before saving settings.
- Added image file-signature checks so uploaded files must match their declared supported image type.
- Generated upload file extensions from the declared MIME type rather than trusting the original filename.
- Added optional reverse-proxy trust configuration for secure cookies on hosts such as Render.
- Added a `TRUST_PROXY` setting to `.env.example`, an npm test command, and updated deployment notes.
- Updated Multer to the 2.x dependency line.

## Not yet verified
- Full dependency installation and live server startup were not completed in this environment. An `npm install` attempt timed out, so runtime integration tests could not be run here.
- No real hosting deployment, HTTPS check, database persistence check on a host, or real-device browser test has been performed.
- Business contact details, location, Facebook URL, services, photos and testimonials must be confirmed with the business owner.
- Stock photos remain visual placeholders and must not be represented as the business's own event work.
- Enquiries are stored in SQLite. The app does not send automatic email or WhatsApp notifications.
- For production, configure persistent storage for both `data/` and `uploads/`, set `NODE_ENV=production`, set a strong unique `SESSION_SECRET`, and set `TRUST_PROXY=1` only when the host is behind a trusted reverse proxy.
