# Oni247 Product Feature Roadmap

**Document type:** Product roadmap / proposed feature scope  
**Status:** Planning document — features in this document are proposed additions or expansions, not a statement that they are already implemented.  
**Product:** Oni247  
**Repository:** `ok-igneous/Oni247`

## Purpose

This document records the product capabilities discussed for Oni247 beyond its existing storefront functionality. It is a product-planning reference, not an implementation audit, technical migration plan, or declaration that every item is approved for immediate development.

The roadmap positions Oni247 as a business website, commerce, customer-management and business-operations platform rather than only a storefront generator.

## 1. Customer accounts and customer portal

- Customer registration and sign-in
- Email verification and password recovery
- Customer profile and account settings
- Customer dashboard / account portal
- Order history and order details
- Order tracking from the customer account
- Saved delivery addresses
- Wishlist and saved products
- Customer membership / loyalty profile
- Loyalty points, rewards and redemption
- Customer account security and session management

## 2. Professional website builder

- Visual drag-and-drop website editor
- AI-assisted website generation
- Professional website templates and template library
- Template marketplace / reusable template catalogue
- Multiple websites managed from one account
- Real-time editing and preview
- Custom page layouts and reusable sections
- Custom components and reusable content blocks
- Advanced typography, colours and design controls
- Responsive editing for mobile, tablet and desktop
- Custom navigation, headers and footers
- Website version history
- Website backup and restoration
- Website duplication / cloning
- Draft, preview, publish and revision workflow

## 3. Professional SEO engine

- Central SEO management
- AI-assisted SEO recommendations
- Keyword research and keyword tracking
- Page-level SEO titles and descriptions
- Product and category SEO
- Image optimisation and alternative text
- Structured data / Schema.org support
- Organisation, LocalBusiness, Product and Event schema
- XML sitemap generation and management
- Robots.txt management
- Canonical URL controls
- Redirect management (including 301 redirects)
- Broken-link detection
- Google Search Console integration
- Search indexing status and monitoring
- Open Graph and social-sharing metadata
- SEO health checks, scoring and reports
- Technical SEO checks for performance, crawlability and indexability

## 4. Advanced product and inventory management

- Advanced product catalogue
- Product variants and attributes
- SKU and barcode management
- Multiple product images and specifications
- Product bundles / kits
- Digital and downloadable products
- Product collections and categories
- Bulk product import, export and editing
- Stock quantities by product and variant
- Multiple warehouse / stock locations
- Stock movement history and audit trail
- Stock adjustments and stock transfers
- Purchase orders and supplier management
- Goods receiving
- Low-stock and out-of-stock alerts
- Inventory valuation and inventory reports
- Product availability controls
- Returns and restocking workflows
- Inventory controls at product and variant level

## 5. Advanced commerce engine

- Shopping cart and persistent carts
- Customer checkout
- Coupons and discount rules
- Promotional campaigns
- Automatic discounts
- Abandoned-cart detection and recovery
- Order management and order status workflows
- Refunds, returns and exchanges
- Payment gateway integrations and multiple payment methods
- Shipping methods, delivery zones and fulfilment settings
- Tax configuration
- Customer order history
- Sales and commerce reports
- Conversion tracking

## 6. CRM and sales management

- Central customer database
- Customer segmentation and groups
- Customer activity and purchase history
- Sales / lead pipeline
- Lead capture and qualification
- Follow-up tasks and reminders
- Customer notes
- Communication history
- Customer lifetime value metrics
- Retention and repeat-purchase reporting
- Loyalty and customer-retention programmes

## 7. Booking and appointment engine

- Service and appointment scheduling
- Booking calendar
- Service availability configuration
- Staff / resource availability
- Booking administration
- Customer booking accounts
- Booking confirmations and reminders
- Booking cancellation and rescheduling
- Booking payments and payment status
- Appointment history and reports

## 8. Marketing automation engine

- Email campaign management
- WhatsApp messaging and notifications
- Automated customer follow-ups
- Abandoned-cart messages
- Promotional campaign workflows
- Audience segmentation
- Birthday and milestone messages (with customer consent)
- Customer retention campaigns
- Campaign templates
- Campaign delivery and performance reporting
- Trigger-based marketing automation

## 9. Analytics and conversion intelligence

- Website traffic and visitor analytics
- Page-view and landing-page analytics
- Customer behaviour and engagement events
- Product and category performance
- Sales and conversion analytics
- Traffic-source attribution
- Campaign and referral attribution
- Product-link and collection-link tracking
- Conversion funnels
- ROI reporting
- A/B testing
- Customer acquisition and retention reports

## 10. AI business assistant

- AI-assisted website generation
- AI content and page-copy generation
- AI product-description generation
- AI SEO assistant
- AI marketing assistant
- AI customer-support assistant / chatbot
- AI-assisted sales analysis
- AI inventory insights and recommendations
- AI business performance summaries
- AI recommendations for improving website and conversion performance

AI actions that can change business data, send messages, issue refunds or otherwise affect customers must use explicit permissions, confirmation and auditability appropriate to the action.

## 11. Communication and customer engagement

- Website live chat
- Customer support inbox / chat
- Automated replies
- Email communication
- WhatsApp integration
- Customer and order notifications
- Enquiry management
- Support ticket management
- Visitor engagement tools

## 12. Internationalisation and localisation

- Multilingual websites
- Translation management for pages and content
- Language switcher
- Translated product and service content
- Localised currency display
- Regional formats and settings
- Time-zone-aware dates and events

## 13. Developer and integration platform

- Public API
- API key management
- Webhooks and event subscriptions
- Third-party integrations
- Developer / integration accounts
- MCP integration
- External application integrations
- Custom integration support
- Developer documentation and API references

## 14. Backup, security and access control

- Automatic website backups
- Website and content restoration
- Version history and change tracking
- Multi-user / team access
- Role-based permissions
- Website-level access controls
- Secure authentication and session management
- Activity and audit logs
- Security monitoring and alerts

## 15. Application distribution centre / software marketplace

A proposed Oni247 marketplace for third-party developers to publish and distribute applications.

- Developer registration and publisher profiles
- Application listings and categories
- Application submission and review
- Application descriptions, screenshots and media
- Application uploads and downloadable packages
- Application version management
- Application updates and release notes
- Application discovery and search
- Application ratings and reviews
- Free and paid applications
- In-app or application subscription support, subject to platform/payment policy
- Developer earnings dashboard
- Revenue-share configuration
- Developer payout management
- Application moderation and reporting

## 16. Reusable platform engines

The capabilities above should be evaluated as reusable platform engines rather than unrelated one-off features.

| Engine | Responsibility |
|---|---|
| Website Builder Engine | Visual website creation, templates, pages, layout and publishing |
| Commerce Engine | Catalogue, cart, checkout, inventory, orders and fulfilment |
| Customer Engine | Customer accounts, profiles, CRM, loyalty and segmentation |
| Booking Engine | Availability, appointments, reservations and reminders |
| Content Engine | Pages, blog, media library and reusable content |
| Form Engine | Reusable forms, validation and submission management |
| Marketing Engine | SEO, campaigns, messaging and automation |
| AI Engine | AI-assisted content, support and business insights |
| Analytics Engine | Traffic, sales, attribution and conversion intelligence |
| Integration Engine | APIs, webhooks, third-party integrations and MCP |

## Product boundaries and planning notes

1. This is a roadmap of proposed new capabilities and expansions. It does not certify that a feature is missing from the current codebase.
2. Existing functionality must be inspected before implementation so existing features are extended rather than duplicated.
3. Do not treat every roadmap item as committed for the same release. Prioritisation, acceptance criteria, dependencies, pricing and rollout phases require separate decisions.
4. Customer accounts are distinct from business-owner/admin accounts. Their permissions, data access and user journeys must be designed separately.
5. Inventory must support stock at both product and variant level; multi-location stock should not be modelled as one global quantity.
6. SEO must cover technical SEO and structured data, not only editable meta titles and descriptions.
7. AI capabilities must respect tenant isolation, customer privacy, usage limits and approval controls for consequential actions.
8. The application marketplace is a distinct platform business capability and should not be conflated with the website builder or ordinary product catalogue.
9. Domain registration, hosting and business email are related commercial services, but their provider integrations and operational requirements should be planned separately from these product engines.

## Suggested planning sequence

This is a dependency-oriented suggestion, not an approved delivery schedule:

1. Customer identity and account model
2. Website Builder Engine and publishing model
3. Commerce Engine, including product variants and inventory
4. Customer Engine / CRM
5. Professional SEO Engine
6. Booking and Form capabilities
7. Analytics and Marketing Automation
8. AI Business Assistant
9. Internationalisation and developer integrations
10. Application Distribution Centre

Each phase should receive its own functional specification, data model, permissions model, acceptance criteria and implementation plan before coding begins.

## Change control

Update this roadmap when product scope changes. Record implementation status in a separate delivery tracker; do not mark roadmap items complete solely because they are documented or partially present in the application.
