# Implementation status

## Completed in this project package
- Luxury visual refresh and responsive public website.
- Customer registration, sign-in and booking/enquiry portal.
- Public booking process explanation and enquiry form.
- Manual payment submission and admin verification workflow.
- Admin payment queue with pending count refresh, confirm/reject actions and customer-facing review notes.
- Booking deposit and total quotation fields (MWK) with safe SQLite schema upgrades.

## Payment workflow limits
- No payment gateway or automated mobile-money/bank API is connected.
- No email/SMS/WhatsApp notifications are configured. Admins see new submissions in the Payments area; customers see decisions in their account after refreshing.
- The business must check its actual account/receipt records before confirming a payment.

## Verification
- `npm test` passes JavaScript syntax checks for server and browser scripts.
- SQLite schema and safe-upgrade SQL were checked independently.
- Full live integration testing requires installing dependencies and running the project with its environment configuration.


## Public business profile update (November 2026)
- Updated the homepage event selector and enquiry form to the six event categories found in public business listings: weddings, engagements, bridal showers, send-off ceremonies, corporate functions, and church/special events. Kept an “Other occasion” option for enquiries about unlisted services.
- Updated the public service cards and service ribbon to match those categories.
- Added idempotent server-side service seeding so existing installations receive missing service entries without overwriting admin-edited descriptions.
- Applied publicly listed phone, WhatsApp, location, and Facebook values as defaults for fresh installs; existing admin settings are preserved.
- Set unverified service-area and business-hours text to enquiry-based wording. No rates, customer reviews, Instagram handle, or business portfolio photographs were invented.
- See BUSINESS-PROFILE-RESEARCH.md for launch verification notes.

## Verification for this update
- `npm test` passes JavaScript syntax checks.
- ZIP archive integrity is checked after packaging.
- A full live server/browser booking test has not been run in this environment.
