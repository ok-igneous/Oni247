# Editable Portfolio / Professional Profile Builder

**Product:** Oni247  
**Status:** Specification — not yet implemented in the GitHub source  
**Prototype:** `/emmanuel-ponle` on the existing Floot-hosted Oni247 app  
**Design direction:** Custom “Modern Minimalist Editorial” visual style

## 1. Problem being corrected

The first portfolio page was created as a page-specific React component with page-specific CSS. That approach produced a custom visual design, but its content is effectively hard-coded: changing text, adding a project, replacing a photo, or rearranging sections requires code changes.

That is not an acceptable long-term editing experience for a website-builder product.

The portfolio must become **content-managed and editable from the Oni247 app**. The design must be a presentation layer, not the place where the user's content is stored.

This document is a product and implementation specification. It does not claim that the editor, upload pipeline, database model, or migration has already been implemented.

## 2. Product goal

Allow a user to create and maintain a professional portfolio or personal/business profile without editing source code. The owner must be able to update written information, upload and replace images, add projects and services, control section visibility and order, preview changes, and publish them to a public page.

Example public route:

- `/emmanuel-ponle` (current prototype route)
- A configurable public slug for each account/profile, subject to Oni247's existing routing and tenancy rules.

## 3. Editing experience

Provide a dedicated **Portfolio / Profile Editor** in the authenticated Oni247 dashboard.

### 3.1 Profile identity
- Display name or business name.
- Professional headline / role.
- Short tagline and introduction.
- Profile photograph or brand logo.
- Location (optional).
- Email, phone, WhatsApp, and other contact links.
- Social and professional links (for example LinkedIn, GitHub, Facebook, Instagram).
- Public page slug and page visibility.
- Optional downloadable CV/resume file.

### 3.2 Page sections
The owner can:
- Add, edit, duplicate, hide/show, delete, and reorder sections.
- Edit section title, body text, labels, links, and call-to-action text.
- Choose from supported section layouts.
- Preview each section and the complete page.
- Save drafts without changing the live page.
- Publish changes only when ready.

Initial section types:
1. Hero / introduction.
2. About.
3. Skills and capabilities.
4. Services.
5. Projects / portfolio case studies.
6. Work experience (optional).
7. Education and certifications (optional).
8. Testimonials (optional).
9. Gallery / media.
10. Contact and call-to-action.
11. Resume / downloadable documents (optional).

The editor should not force every section onto every portfolio. Empty optional sections should remain hidden on the public page.

### 3.3 Project and case-study manager
Each project must be independently editable and support:
- Project name and short summary.
- Detailed description / challenge / approach / outcome fields.
- Cover image and optional gallery images.
- Technologies, skills, or categories.
- Project URL and optional demo URL.
- Date or status (optional).
- Featured/unfeatured state.
- Draft/published state and display order.

Do not invent metrics, client names, employment history, qualifications, or project outcomes. The owner supplies and approves factual claims.

### 3.4 Services and skills manager
- Add, edit, reorder, feature, hide, and remove services.
- Service name, description, icon/image (optional), and CTA/link.
- Skills grouped by category with optional proficiency labels.
- Avoid unsupported skill ratings or claims unless explicitly entered by the owner.

## 4. Image and media management

Image editing must be available to the owner in the app; requiring a developer to change JSX/CSS for every image is not acceptable.

Required capabilities:
- Upload images from a phone or computer.
- Select an existing image from the user's media library.
- Replace or remove an image.
- Add meaningful alt text.
- Set focal point / crop position where supported.
- Preview the image in its intended layout.
- Validate file type and size; show clear errors.
- Generate responsive variants/thumbnails where the storage pipeline supports it.
- Preserve aspect ratio and use safe fallbacks when an image is missing.
- Keep media ownership and access scoped to the correct account/tenant.
- Do not expose private uploads through public URLs unless the user publishes or explicitly shares them.

Initial image slots:
- Profile photo / logo.
- Hero image or background media.
- Project cover images.
- Project gallery images.
- Service images/icons.
- Testimonials or supporting media (optional).

Support common web image formats such as JPEG, PNG, and WebP. Consider AVIF where the existing image pipeline supports it. Do not promise video upload until storage, processing, playback, and limits are designed.

## 5. Theme and design system

The prototype's “Modern Minimalist Editorial” style is a custom visual direction, not an existing Oni247 theme-engine preset.

The production implementation must separate:
- **Content:** profile fields, sections, projects, services, links, and media references.
- **Presentation:** theme tokens, typography, spacing, colors, borders, layouts, and responsive behavior.
- **Editor:** controls for changing content and supported presentation settings.

Requirements:
- Reuse Oni247's theme system where it can support the required layouts.
- If the current theme engine cannot represent this layout, extend it with reusable section/layout primitives rather than embedding content in page-specific CSS.
- Offer “Modern Minimalist Editorial” as a reusable portfolio style/preset after it is implemented through the theme/layout system.
- Allow supported customization of color palette, typography scale, button style, section spacing, and image treatment.
- Provide desktop, tablet, and mobile previews.
- Maintain accessible contrast, keyboard navigation, semantic headings, and visible focus states.
- Do not modify or remove the existing Floot banner as part of this feature unless explicitly requested.

## 6. SEO and sharing

Per-profile SEO settings:
- Editable page title.
- Meta description.
- Canonical URL where applicable.
- Social share title, description, and image.
- Open Graph and Twitter card metadata.
- Descriptive image alt text.
- Clean, editable slug with uniqueness validation.
- Sitemap inclusion and indexability controls, subject to the user's plan and site settings.
- Structured data only where the page content supports it truthfully (for example, Person or Organization); do not fabricate ratings, reviews, or credentials.

Provide copy/share actions for the public profile URL.

## 7. Draft, preview, and publishing workflow

Expected workflow:
1. Open Portfolio Editor.
2. Edit profile details and sections.
3. Upload/select images and add alt text.
4. Reorder or hide sections.
5. Preview desktop and mobile.
6. Save draft.
7. Publish.
8. Confirm the public page reflects the published version.

Important behavior:
- Draft changes must not silently overwrite the live version.
- Show save state and useful validation errors.
- Warn before navigating away with unsaved changes.
- Publishing should be explicit and produce a clear success/failure result.
- Slug changes must handle redirects or a clear old-URL policy to avoid broken shared links.
- Public pages must render safely if optional content or media is absent.

## 8. Data model direction

Adapt names and types to the existing Oni247 architecture after code inspection. The following is a logical model, not a demand to create duplicate tables if equivalent models already exist.

- `profiles`: owner/account reference, display name, headline, bio, slug, contact details, social links, SEO fields, publication state.
- `profile_sections`: profile reference, section type, title, content/settings JSON with schema validation, sort order, visibility, publication state.
- `profile_projects`: profile reference, title, summary, case-study fields, links, tags, cover media reference, featured flag, sort order, publication state.
- `profile_services`: profile reference, title, description, optional media/icon, CTA, sort order, visibility.
- `profile_skills`: profile reference, category, skill name, optional owner-entered level, sort order.
- `media_assets`: owner/account scope, storage key, MIME type, size, dimensions, alt text, metadata, timestamps.
- `profile_revisions` or equivalent: draft/published snapshots and audit history if the current publishing architecture supports versioning.

Use stable IDs and explicit ownership checks. Never trust a profile ID, media ID, or slug supplied by the browser without server-side authorization and tenant-scope validation.

## 9. Permissions and security

- Only the profile owner and explicitly authorized collaborators may edit the profile.
- Public visitors may read published content only.
- Validate and sanitize rich text and links to prevent stored XSS and unsafe URL schemes.
- Enforce upload MIME/type, size, and authorization checks on the server.
- Prevent cross-account media access and insecure direct object references.
- Rate-limit public forms and protect contact/enquiry endpoints against abuse.
- Do not expose private email/phone fields unless the owner chooses to publish them.
- Record important publication and ownership changes in the existing audit approach where available.

## 10. Responsive and accessibility requirements

- Mobile-first editing and public-page layouts.
- Upload/select media from mobile devices.
- No horizontal overflow or clipped navigation.
- Touch-friendly controls and clear save/publish states.
- Keyboard-accessible editor controls and dialogs.
- Labels for all form fields; meaningful alt text for informative images.
- Respect reduced-motion preferences.

## 11. Suggested implementation sequence

### Phase 0 — Inspect and map existing architecture
- Inspect current routing, authentication, account/tenant ownership, database, media storage, page builder, theme engine, and publishing flow.
- Identify reusable existing models and components before adding new ones.
- Confirm how Floot-hosted prototype code relates to the GitHub source. Do not assume the prototype files are already in this repository.

### Phase 1 — Content model and read-only renderer
- Define validated content schemas and ownership rules.
- Implement public profile rendering from stored data.
- Migrate the current portfolio content into structured profile data.
- Preserve the current visual direction without hard-coding profile content in JSX.

### Phase 2 — Editor
- Build profile identity and section editing.
- Add section ordering and visibility.
- Add project, service, and skills managers.
- Add draft save and preview.

### Phase 3 — Media
- Integrate authorized upload and media-library selection.
- Add replace/remove, alt text, crop/focal point, and responsive rendering.
- Test mobile uploads and storage failure states.

### Phase 4 — Theme integration
- Implement the editorial style as a reusable theme/layout preset.
- Add supported design controls and responsive previews.
- Confirm the editor can change content without code changes.

### Phase 5 — SEO and publishing
- Add per-profile SEO and sharing metadata.
- Implement publish workflow, revision safety, slug validation, and old-slug handling.
- Verify public/private access boundaries.

### Phase 6 — QA and release
- Test owner, collaborator, and public visitor permissions.
- Test empty sections, missing images, invalid links, long text, and mobile layouts.
- Test upload limits, unauthorized media access, draft isolation, and publish failures.
- Run typecheck, lint, tests, and production build before release.

## 12. Acceptance criteria

The feature is not complete until all of the following are true:

- [ ] Owner can edit every visible profile text field from Oni247 without code changes.
- [ ] Owner can add, edit, remove, hide, show, and reorder sections.
- [ ] Owner can add and manage multiple projects and services.
- [ ] Owner can upload, select, replace, and remove profile/project images.
- [ ] Owner can set alt text and preview image crops.
- [ ] Changes can be saved as drafts and previewed before publishing.
- [ ] Publishing is explicit and the public route displays the published version.
- [ ] The visual style is reusable and separate from profile content.
- [ ] The page works on mobile, tablet, and desktop.
- [ ] SEO and social-sharing fields are editable.
- [ ] Server-side ownership and media authorization prevent cross-account access.
- [ ] Automated checks and manual permission/upload tests pass.

## 13. Current prototype content (seed data only)

The first prototype page was prepared for Emmanuel Ponle Okunyode and included:
- Intro / professional headline.
- About.
- Capabilities and services: customer and technical support, web development, software development, IT/POS support, software implementation, and business technology.
- Selected product work: Oni247, VendMage, OniRep, and OniShield.
- Work process.
- Contact actions using the supplied WhatsApp and email details.

Treat this as editable seed content, not immutable copy. The owner must be able to correct, expand, replace, or remove every item. Do not treat product prototypes or work-in-progress as completed client deployments.

## 14. Non-goals and cautions

- This specification does not authorize rebuilding the whole Oni247 website builder.
- It does not authorize changing the existing production hosting or removing the Floot banner.
- It does not assert that the current prototype is already editable.
- It does not authorize fabricated biography, employment, certifications, testimonials, client results, or performance metrics.
- Do not create a separate theme engine just for the portfolio if the existing Oni247 theme architecture can be extended safely.
