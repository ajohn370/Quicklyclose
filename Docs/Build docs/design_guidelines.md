**design_guidelines.md**

---

# 1. Brand & Visual Identity

- **Logo & Colors**
  - Primary: #1D4ED8 (Blue) for trust and action
  - Accent: #10B981 (Green) for success/confirmation
  - Neutral palette: whites (#FFFFFF), dark gray (#1F2937) for text, light gray (#F3F4F6) for backgrounds

- **Typography**
  - Headings: Inter, Bold (sizes: xl–2xl)
  - Body: Inter, Regular (size: base)
  - Code/Monospace: Source Code Pro for technical snippets

- **Spacing & Layout**
  - 8pt grid: use multiples of 8px for margins, padding
  - Consistent card padding: p-4 (1rem)
  - Section margins: mt-8 or mb-8

---

# 2. Component Library

## 2.1. Buttons
- Base: `btn`, styles: `btn-primary` (blue bg, white text), `btn-secondary` (white bg, blue text, border)
- States: hover (darker), active (pressed), disabled (50% opacity)

## 2.2. Forms & Inputs
- Input fields: `input`, full-width by default, rounded-lg, border-gray-300
- Labels: `text-sm font-medium text-gray-700`
- Error messages: `text-xs text-red-600`
- Group spacing: `space-y-4`

## 2.3. Cards & Panels
- Card container: rounded-2xl, shadow-sm, bg-white
- Header: p-4 border-b
- Body: p-4
- Footer: p-4 border-t (for actions)

## 2.4. Alerts & Notifications
- Success: green banner with check icon
- Error: red banner with exclamation icon
- Info: blue banner with info icon
- Use Tailwind utility classes for quick variants

---

# 3. Page & Flow Patterns

## 3.1. Seller Flow
- **Landing Page**: full-screen hero, centered form card (max-w-lg), trust logos testmonials strip below
- **Progressive Intake**: multi-step form (Wizard). Use stepper at top, `Next`/`Back` buttons
- **Processing State**: skeleton loaders for valuation, animated progress bar
- **Result Page**: clear offer box, call-to-action button to schedule call

## 3.2. Investor Flow
- **Dashboard**: two-column grid (feed + comp panel). Sticky right panel for Comp Vision
- **Property Card**: image, title, key metrics (ARV diff, days listed), action button
- **Comp Vision Panel**: tabbed view—`Overview`, `Visual Comps`, `Metrics`
- **Bid Modal**: centered modal, pre-filled price field, toggle for custom terms

## 3.3. 3D/360° Visual Matching

- **Viewer Layout:** Full-screen, responsive panoramic viewer with interactive controls (rotate, zoom, pan).
- **Controls & UI:** Minimalist overlay toolbar (e.g. rotate, zoom icons) styled with translucent panels; use your brand’s primary and accent colors for buttons and highlights; include concise tooltips on hover.
- **Loading & Placeholders:** Show a skeleton loader or spinner overlay during 3D mesh/render generation; display a low-res fallback thumbnail while processing.
- **Seller Capture Prompt:** In the seller portal, embed an illustrated guide that walks users through capturing a panorama with their phone; include a progress indicator for the stitching phase.
- **Mobile Optimization:** Leverage device orientation sensors to smooth out stitching; surface a clear progress bar and on-screen instructions to minimize capture errors.
- **Visual Consistency:** Wrap the viewer in a card/panel using `rounded-2xl`, `shadow-sm`, and `p-4`; follow your 8-pt grid for spacing around the component.


---

# 4. Interaction & Accessibility

- **Keyboard Navigation:** all interactive elements focusable, `focus:ring-2 focus:ring-offset-2`
- **ARIA labels:** meaningful labels on form controls and buttons
- **Contrast:** 4.5:1 ratio on text vs background
- **Motion:** subtle hover animations, avoid motion sickness (reduce for user preference)

---

# 5. Illustration & Iconography

- Use minimalist line icons (lucide-react) for consistency
- Illustrations: simple, friendly, 2–3 color palette matching brand
- Image placeholders: gray bg with camera icon for missing photos

---

*Prepared by: Design Team / CTO*

