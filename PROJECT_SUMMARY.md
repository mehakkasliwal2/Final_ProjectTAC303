# Sustainable Beauty Brand Directory — Final Project Summary

## Topic & Purpose
Directory of sustainable, cruelty-free beauty brands. Users can browse brand cards, see certification counts, and submit/update entries with packaging and sourcing details.

## How to Use
- Home: overview and featured brands.
- Browse: paginated brand list with edit/delete controls and certification aggregate table.
- Submit: create a brand with validation and dynamic certification tags.
- Edit/Delete: from Browse cards.

## Admin/Test Credentials
- No auth required (CRUD is open for grading).

## Data Source
- Seed data defined in `db/schema.sql` (Biossance, ILIA, Youth To The People, certification seeds). In-memory fallback used when `DATABASE_URL` is absent.

## Database Diagram
- Tables: `brands` (1), `certifications` (N), `brand_certifications` (N:N).
- Relationship: many-to-many between brands and certifications via `brand_certifications`.

## Features Implemented (meets 3+ requirement)
- Form with validation (regex URL + server-side error rendering).
- Pagination on `/browse`.
- SQL aggregate table (certification → brand count) on `/browse`.
- Event-driven DOM manipulation (add/remove certification pills on submit form).
- Many-to-many relationship (brands ↔ certifications).

## Third-Party APIs
- None used.

## CSS Frameworks/Templates
- Custom CSS only (`public/styles.css`). No external framework.

## Deployment URL (Render)
- To be filled after deploy: `https://<your-render-service>.onrender.com`

## Runbook
- Env var: `DATABASE_URL` (Render Postgres External URL).
- Build: `npm install`
- Start: `npm run start`
- Seed: `psql $DATABASE_URL -f db/schema.sql`
