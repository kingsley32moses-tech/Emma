# Homepage Event Request Experience

- Added large event-selection cards to the homepage. Selecting a card synchronises the event type in the enquiry form.
- Added a homepage decoration-material catalogue backed by the existing public `/api/planner/catalogue` endpoint. Only materials already published in the existing catalogue appear.
- Customers can select/deselect materials and adjust quantities. Fixed-price items contribute to an indicative subtotal; quote-only items are marked for quotation.
- The selected event, material names and quantities are included in the existing public enquiry submission. Prices are not treated as confirmed and are not trusted as customer-submitted payment amounts.
- The existing `/planner` event designer remains available. The main homepage flow does not require a customer account.
- Event types shown on the homepage are proposed options; Emma's Decor should confirm which ones it actually offers before publishing.
