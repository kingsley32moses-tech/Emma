# Emma's Event Designer

New `/planner` experience for customers. Customers sign in/register before saving plans. They can specify event type/date/location/guest count/theme/colours, select materials visually, adjust quantities and see an estimated budget in MWK. Only fixed prices are included in totals; quotation-only options are labelled clearly.

## Admin catalogue API

All endpoints require an authenticated admin session (and completion of first-login password change):
- `GET/POST /api/admin/vendors`
- `PATCH/DELETE /api/admin/vendors/:id`
- `GET/POST /api/admin/materials`
- `PATCH/DELETE /api/admin/materials/:id`

A vendor must have `approved: true` before its materials appear publicly. Do not add a supplier as approved unless Emma confirms that she uses or has verified that supplier in Malawi. Set `price_type` to `fixed` only for a confirmed price; otherwise use `quote`. Images may be supplied as trusted image URLs for now.

Customer endpoints: `GET /api/planner/catalogue`, `POST /api/planner/plans` (login required), `GET /api/customer/plans`.

No supplier names or market prices have been invented or preloaded. Emma must enter verified local suppliers, material photos and current prices in the admin catalogue before they are shown to customers.
