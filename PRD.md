# Google Reviews Globe PRD

## 1. Product Summary

Google Reviews Globe is a personal web experience that turns Google Maps restaurant reviews and review photos into an interactive 3D globe. The site will showcase restaurants reviewed around the world, aggregate impact metrics from review/photo views, and let visitors explore reviews geographically.

The first version focuses on restaurants using the existing `organized_restaurants` dataset. The app should feel like a dark, polished personal portfolio rather than a generic map dashboard.

## 2. Goals

- Present all restaurant reviews in a visually memorable globe-based interface.
- Show credibility through aggregate stats such as total restaurants reviewed, total photo views, countries visited, average rating, and highest-viewed photos.
- Let visitors move from high-level geography to individual reviews through a clear drilldown flow.
- Display review photos and photo metadata where available.
- Use a static-friendly architecture that can be regenerated from local review/photo files.

## 3. Non-Goals

- No user accounts, comments, likes, or social features.
- No live Google Maps API dependency for the core experience.
- No in-browser data editing UI for V1.
- No generic support for non-restaurant Google reviews in V1, although the schema should leave room for tourist sites, museums, landmarks, and other future review types.
- No automatic Google Maps scraping.

## 4. Target Audience

- Friends, recruiters, and personal-site visitors who want a quick, impressive view of review history.
- Food and travel audiences interested in restaurants across countries and cuisines.
- Anyone who wants to browse the best or highest-impact reviews/photos.

## 5. Source Data

The repo currently contains an `organized_restaurants` folder. Each restaurant has its own folder with:

- `review_info.txt`: human-readable review metadata and full review text.
- `*.jpg.json`: per-photo metadata exported from Google Takeout or a related processing step.

Example `review_info.txt` fields:

- `Location`
- `Address`
- `Rating`
- `Review Date`
- `Google Maps`
- Full review body after `--- Review ---`

Example photo metadata fields:

- `title`
- `description`
- `imageViews`
- `creationTime`
- `photoTakenTime`, when available
- `geoDataExif.latitude`
- `geoDataExif.longitude`
- `geoDataExif.altitude`

As of this PRD, the folder contains 63 restaurant review files and 269 photo metadata JSON files. The actual image files are not currently visible in the repo, so V1 implementation should either add the matching image assets or gracefully render photo metadata until assets are provided.

## 6. Data Model

The app should generate a sanitized static dataset from `organized_restaurants`.

### Restaurant Review

Required fields:

- `id`: stable slug derived from the restaurant folder name.
- `name`: restaurant name.
- `address`: full address from `review_info.txt`.
- `countryCode`: ISO country code inferred from address or geocoding/enrichment.
- `countryName`: display country name.
- `city`: city or locality when derivable.
- `coordinates`: latitude/longitude, preferably from matched photo metadata or an enriched review coordinate source.
- `rating`: numeric rating from the review.
- `reviewDate`: ISO date.
- `googleMapsUrl`: original Google Maps URL.
- `reviewText`: full review text.
- `category`: default `Restaurant` for V1.
- `cuisine`: normalized cuisine label, such as `German`, `Spanish`, `Thai`, `Italian`, `Indian`, `Japanese`, `Lebanese`, `Mexican`, `Vietnamese`, `American`, or `Other`.
- `cuisineFlag`: emoji or asset key representing the cuisine origin shown in popups.
- `photos`: array of matched photos.

Optional fields:

- `questionRatings`: Google Maps sub-ratings, if available from a later Takeout source.
- `manualTags`: curated tags such as `beer`, `ramen`, `fine dining`, `market`, or `bakery`.
- `featured`: whether to highlight the restaurant in intro sections.

### Photo

Required fields:

- `id`: stable slug derived from metadata filename.
- `title`: photo title from metadata.
- `description`: photo description/caption.
- `imageViews`: numeric view count parsed from metadata.
- `metadataPath`: source metadata path.
- `assetPath`: matching image path if available.

Optional fields:

- `creationTime`
- `photoTakenTime`
- `coordinates`
- `altitude`

## 7. Data Processing Requirements

Build a script that:

1. Reads every folder under `organized_restaurants`.
2. Parses each `review_info.txt` file into structured review fields.
3. Reads all `*.jpg.json` metadata files in the same restaurant folder.
4. Parses `imageViews` as a number.
5. Infers restaurant coordinates from the median or first valid photo coordinates when no review-level coordinates are present.
6. Infers country from address and/or coordinates.
7. Computes aggregate metrics:
   - total restaurants reviewed
   - total countries
   - total photos
   - total photo views
   - average rating
   - reviews per country
   - photos/views per restaurant
8. Applies cuisine metadata from a curated mapping file.
9. Outputs sanitized static JSON for the frontend.

### Cuisine Mapping

Because cuisine is not reliably present in the existing files, V1 should include a manually maintained mapping file such as `data/cuisine-map.json`.

Example:

```json
{
  "Prost DC": {
    "cuisine": "German",
    "cuisineFlag": "🇩🇪"
  },
  "Mercado de San Miguel": {
    "cuisine": "Spanish",
    "cuisineFlag": "🇪🇸"
  },
  "Balinese Home Cooking": {
    "cuisine": "Indonesian",
    "cuisineFlag": "🇮🇩"
  }
}
```

If a restaurant is not mapped, use:

- `cuisine`: `Other`
- `cuisineFlag`: `🏳️`

## 8. Technical Requirements

- Framework: Vite with React and TypeScript.
- 3D rendering: `react-three-globe`.
- Styling: CSS Modules, plain CSS, or a small styling layer chosen during implementation. Avoid overbuilding the styling system.
- Data: static JSON generated from local source files.
- Deployment target: static hosting such as Vercel, Netlify, or GitHub Pages.
- Runtime API: none required for V1.

## 9. Site Structure

### Intro Tab

Purpose: explain the project and establish credibility quickly.

Required content:

- Short intro paragraph about Google Maps reviewing and why the globe exists.
- Headline metrics:
  - total restaurants
  - total countries
  - total photo views
  - total photos
  - average rating
  - top country by review count
- Featured review/photo callout, ideally the highest-viewed photo or a favorite restaurant.
- CTA to open the Reviews tab.

### Reviews Tab

Purpose: primary exploration surface.

Required elements:

- Dark background.
- Interactive 3D globe.
- Country review counts.
- Category/cuisine legend in the top right.
- Country drilldown behavior.
- Restaurant markers.
- Hover preview cards.
- Click-to-open full review details.

## 10. Globe UX

### World View

- Render a dark, atmospheric 3D globe.
- Display countries with subtle boundaries.
- Highlight countries that contain restaurant reviews.
- Show a numeric label on each reviewed country representing restaurant review count.
- Allow users to rotate and zoom the globe.
- Clicking a reviewed country zooms/focuses the camera toward that country.

### Country View

- Show individual restaurant markers within the selected country.
- Keep the top-right cuisine/category legend visible.
- Provide a clear back control to return to world view.
- Reduce clutter by hiding unrelated countries' markers or dimming them.
- Keep marker colors consistent with cuisine/category legend.

### Marker Hover

Hovering a restaurant marker should show a compact popup with:

- Cuisine flag.
- Restaurant name.
- Rating.
- Cuisine.
- City/country or short address.
- Review date.
- Total photo views for that restaurant, if available.

Hover should not show the full review text.

### Marker Click

Clicking a restaurant marker opens a detail panel or modal with:

- Cuisine flag and cuisine label.
- Restaurant name.
- Full rating.
- Address.
- Review date.
- Google Maps link.
- Full review text.
- Photo gallery if image assets are available.
- Photo metadata cards if image assets are not available.
- Total views across that restaurant's photos.

## 11. Visual Design

### Theme

- Use a dark background across the site.
- Favor deep navy/black gradients with subtle glow accents.
- Keep typography crisp and high-contrast.
- The globe should feel premium and cinematic, but not distract from review content.

### Color And Legend

The legend should support both broad categories and cuisine distinctions.

V1 recommendation:

- Primary marker grouping: cuisine.
- Secondary metadata: all items are restaurants for now.
- Future expansion: categories such as `Restaurant`, `Cafe`, `Market`, `Museum`, `Castle`, `Landmark`, and `Other`.

Each cuisine should have:

- a distinct marker color,
- a text label,
- a cuisine-origin flag shown in hover/detail popups.

### Flags

Flags represent cuisine origin, not necessarily restaurant location.

Examples:

- German cuisine: 🇩🇪
- Spanish cuisine: 🇪🇸
- Indian cuisine: 🇮🇳
- Japanese cuisine: 🇯🇵
- Thai cuisine: 🇹🇭
- Lebanese cuisine: 🇱🇧
- Mexican cuisine: 🇲🇽
- Vietnamese cuisine: 🇻🇳
- American cuisine: 🇺🇸
- Italian cuisine: 🇮🇹

## 12. Responsive Behavior

- Desktop: full globe interaction with hover cards and right-side detail panel.
- Tablet: same flow with larger tap targets.
- Mobile:
  - Tap markers instead of hover.
  - Use a bottom sheet for review details.
  - Keep globe controls simple.
  - Avoid dense country labels at small sizes.

## 13. Accessibility Requirements

- Provide keyboard-accessible tabs.
- Ensure popups and detail panels can be opened and closed by keyboard.
- Maintain sufficient contrast on dark backgrounds.
- Provide text alternatives for photos when descriptions exist.
- Avoid relying on color alone; include cuisine labels and flags.
- Respect reduced-motion preferences where practical.

## 14. MVP Acceptance Criteria

- App is built with Vite, React, and TypeScript.
- Globe rendering uses `react-three-globe`.
- Site has Intro and Reviews tabs.
- Site uses a dark visual theme.
- Reviews tab displays reviewed countries with country-level counts.
- Clicking a country zooms or focuses into that country.
- Country view displays restaurant markers.
- Hovering a marker shows a compact popup with restaurant name, rating, cuisine, and cuisine flag.
- Clicking a marker opens full review details.
- Photo metadata appears in the detail view, including photo descriptions and view counts.
- Actual photos appear when matching image assets are available.
- Dataset is generated from `organized_restaurants` rather than hardcoded directly in React components.
- Cuisine flags come from a maintainable mapping file.

## 15. Risks And Open Questions

- Actual image files are not currently present in `organized_restaurants`; only photo metadata JSON files are visible.
- Coordinates may need to be inferred from photos, which can be ambiguous if a restaurant has inaccurate or missing photo GPS metadata.
- Country inference from address strings may need a small library or manual overrides.
- Cuisine classification requires manual curation for accuracy.
- `react-three-globe` should be validated early for country labels, country click handling, and drilldown behavior.

## 16. Suggested Implementation Milestones

1. Scaffold Vite React TypeScript app.
2. Add data parsing script for `organized_restaurants`.
3. Add cuisine mapping file and generated static dataset.
4. Build dark themed app shell with Intro and Reviews tabs.
5. Render initial `react-three-globe` world view.
6. Add reviewed-country counts and country focus behavior.
7. Add restaurant markers, hover popups, and click detail panel.
8. Add photo metadata/gallery rendering.
9. Polish responsive behavior and accessibility.
10. Prepare static deployment workflow.
