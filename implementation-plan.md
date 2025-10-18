## Implementation Plan: Advanced Admin Portal & Investor Workflow

This plan outlines the necessary steps to build an advanced admin portal that integrates with the "Comp AI" analysis, manages the pricing and approval workflow, and facilitates property listings for investors, including a bidding system and email notifications.

### **Phase 1: Admin Dashboard for Seller Submissions**

**Objective:** Create a centralized view for admins to manage and review new property analysis submissions from sellers.

**1. Backend (API Endpoints):**

*   **`GET /api/admin/submissions`**:
    *   Fetches a paginated list of all property analysis submissions.
    *   Each item in the list should include:
        *   `submission_id`
        *   `seller_name`
        *   `property_address`
        *   `submission_date`
        *   `status` (e.g., 'Pending Review', 'Admin Approved', 'Seller Approved', 'Listed')
    *   This will require joining the `comp_vision_analyses`, `seller_profiles`, and `properties` tables.

*   **`GET /api/admin/submissions/:id`**:
    *   Fetches the detailed information for a single submission.
    *   This should return all the data from the `comp_vision_analyses` table, including the AI-generated analysis, comparable properties, and the suggested listing price.

**2. Frontend (React Components):**

*   **`AdminDashboardPage` (`/admin/dashboard`):**
    *   This will be the main page for the admin portal.
    *   It will use the `GET /api/admin/submissions` endpoint to display a table or list of submissions.
    *   The table will have columns for the data mentioned above and will allow sorting and filtering by status.

*   **`SubmissionDetailPage` (`/admin/submissions/:id`):**
    *   This page will display the detailed analysis for a selected submission.
    *   It will be divided into sections:
        *   Seller Information
        *   Property Details
        *   "Comp AI" Analysis Results (including comps, confidence scores, etc.)
        *   A prominent section for the AI-suggested listing price.

### **Phase 2: Pricing Review and Approval Workflow**

**Objective:** Enable admins to review, revise, and send pricing information to sellers for approval.

**1. Backend (API Endpoints):**

*   **`POST /api/admin/submissions/:id/revise-price`**:
    *   Allows an admin to submit a revised price for a property.
    *   The request body will contain the `new_price` and `revision_notes`.
    *   This will update the `pricing_revisions` table with the new price and set the status to 'Pending Seller Approval'.

*   **`POST /api/admin/submissions/:id/approve-price`**:
    *   Allows an admin to approve the AI-suggested price.
    *   This will trigger a notification to the seller.

**2. Frontend (React Components):**

*   **`PriceRevisionModal` (on `SubmissionDetailPage`):**
    *   A modal dialog that allows the admin to enter a new price and notes.
    *   It will have "Send to Seller" and "Cancel" buttons.

*   **`SellerApprovalStatus` (on `SubmissionDetailPage`):**
    *   A component that displays the current status of the seller's approval (e.g., "Pending," "Approved," "Rejected").

### **Phase 3: Investor Pricing and Listing**

**Objective:** Automate the calculation of an investor-facing price and allow admins to list the property.

**1. Backend (AI & API):**

*   **"Comp AI" Enhancement:**
    *   The "Comp AI" service will be updated to include a new function that takes an approved seller price and calculates an optimal investor price.
    *   This calculation will factor in:
        *   The seller's price.
        *   A target profit margin for "Quickly Close."
        *   Market data and comps to ensure the price is attractive to investors.

*   **`POST /api/admin/submissions/:id/list-property`**:
    *   This endpoint will be called after a seller approves the price.
    *   It will:
        1.  Invoke the "Comp AI" to get the investor price.
        2.  Update the property's status to 'Listed'.
        3.  Save the investor price to the `properties` table.
        4.  Trigger an email notification to all registered investors.

**2. Frontend (React Components):**

*   **`InvestorPriceSection` (on `SubmissionDetailPage`):**
    *   This section will appear after the seller has approved the price.
    *   It will display the AI-suggested investor price and a button for the admin to "Approve and List."

### **Phase 4: Bidding System**

**Objective:** Implement a timed bidding system for properties.

**1. Backend (API & Database):**

*   **Database Schema Changes:**
    *   A new `bids` table will be created with columns for `property_id`, `investor_id`, `bid_amount`, and `created_at`.
    *   The `properties` table will have new columns: `is_bidding_active`, `bidding_ends_at`, and `current_highest_bid`.

*   **`POST /api/properties/:id/start-bidding`**:
    *   An admin-only endpoint to put a property up for bidding.
    *   Sets `is_bidding_active` to `true` and `bidding_ends_at` to 48 hours from the current time.

*   **`POST /api/properties/:id/place-bid`**:
    *   An investor-only endpoint to place a bid.
    *   It will validate that the bid is higher than the `current_highest_bid`.

**2. Frontend (React Components):**

*   **`BiddingControls` (on `SubmissionDetailPage`):**
    *   Admin-only controls to start or stop a bidding process.

*   **`BiddingInterface` (on the investor-facing property page):**
    *   A component that shows the current highest bid, the remaining time, and an input for investors to place a new bid.

### **Phase 5: Email Notifications**

**Objective:** Keep investors informed about new listings and bidding opportunities.

**1. Backend (Email Service):**

*   **Integration with an Email Service:**
    *   We will use a service like SendGrid or AWS SES to send transactional emails.

*   **Email Templates:**
    *   Create two new email templates in the `email_templates` table:
        *   `new_listing_notification`
        *   `bidding_announcement`

*   **Trigger Logic:**
    *   The `POST /api/admin/submissions/:id/list-property` endpoint will trigger the `new_listing_notification` email.
    *   The `POST /api/properties/:id/start-bidding` endpoint will trigger the `bidding_announcement` email.
