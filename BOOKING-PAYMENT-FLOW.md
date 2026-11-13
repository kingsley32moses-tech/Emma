# Booking and payment workflow

The public homepage explains the four-step booking process: enquiry, personalised quotation, deposit to reserve the date, and the remaining balance by the agreed pre-event deadline.

## Customer payment submissions
- A customer must sign in and have a booking linked to their account to submit a payment.
- The customer enters the amount, payment method (TNM Mpamba, Airtel Money, bank transfer or cash), and transaction/receipt reference.
- The submission is stored as **Pending verification**. It is not treated as money received.
- Customers can view submissions, admin decisions, confirmed paid totals, the agreed deposit and the remaining quotation balance in their account.

## Admin verification
- The admin opens **Payments** in the management portal. Pending submissions appear first, with a pending count that refreshes periodically while the admin is signed in.
- The admin must check the actual business mobile-money/bank transaction history or cash receipt record. A customer-entered reference is not proof by itself.
- The admin chooses **Confirm** only after matching the amount and reference. Otherwise the admin can reject it and provide a note for the customer.
- A booking becomes Confirmed automatically once confirmed payments meet the agreed deposit amount.

## Admin setup per booking
When creating or editing a booking, enter the agreed deposit and total quotation in MWK. These values are displayed in the customer's account. Link the booking to the customer account by creating it from their enquiry or using the same phone number as their account. If the customer registers later with that same phone number, existing unlinked records are attached automatically.

## Important limits
- No payment gateway, bank/mobile-money API, automated transaction matching, email, or WhatsApp notification has been configured. Customers see updates in their account after refreshing; admins see pending submissions in the Payments page.
- Payment details (wallet/account number) should be shared directly by Emma's Decor after the quotation is accepted. No account number is invented or displayed by the website.
- The business must verify actual funds before confirming.


## Event date availability and capacity

The public enquiry form now includes a date picker that checks `/api/availability` and displays the remaining booking spots for the selected date. A full or blocked date cannot be submitted through the enquiry form. The server checks availability again when the enquiry is received.

The admin workspace includes an **Event availability** page. The admin can set the default daily event capacity, review dates with existing bookings, set a special capacity for an individual date, block a date, or remove a date override. Tentative and confirmed bookings count against capacity; cancelled and completed bookings do not. Admin booking creation and edits are checked against the same capacity rules.

The default capacity is deliberately set to **1 event per day** until the business confirms how many independent decoration teams it can reliably operate. The admin can increase this value after confirming staffing, transport and equipment capacity. Enquiries are not counted as bookings; only admin-created booking records consume a slot. A booking enquiry remains a request, not a confirmed reservation.
