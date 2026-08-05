# Basscraft Landing Page

Welcome to the Basscraft Landing Page project! This repository contains the fully built, responsive frontend for the Basscraft Haptic Cushion.

## Project Structure
- `index.html`: The main markup file containing the entire single-page layout, shopping cart modals, and GSAP trigger sections.
- `styles.css`: All styling, including responsive media queries, custom CSS variables, and layout systems. Uses vanilla CSS.
- `app.js`: The core logic file. Handles GSAP scroll animations, video playback syncing, global audio state, and the custom shopping cart math.
- `assets/`: Contains all images, SVGs, and exported videos.

## Architecture & Dependencies
- **GSAP (GreenSock) & ScrollTrigger**: We use GSAP heavily for scroll-linked animations, fading elements, and triggering videos at specific scroll depths. The GSAP scripts are loaded via CDN at the bottom of `index.html`.
- **Vanilla JavaScript**: No heavy frameworks (React/Vue) were used. All DOM manipulation, state management (cart quantities), and event listeners are written in vanilla JS inside `app.js`.
- **CSS Variables**: The design system relies on a set of CSS variables defined in the `:root` pseudo-class in `styles.css` (e.g., `--bg`, `--dark`, `--ruby`).
- **Custom Shopping Cart**: The shopping cart is a custom built modal overlay in `index.html`. The logic in `app.js` handles custom quantity selection and automatically calculates a $100 discount for every pair of kits added.

## Developer Notes & Known Quirks
- **Video Syncing**: We use a `videoObserver` and custom GSAP `onUpdate` logic to play/pause videos as they enter and leave the viewport. This is crucial for performance since there are many high-quality video assets. 
- **Sub-pixel Video Borders**: On mobile, rounded videos (`.vid-r`) have a slight `100% + 2px` scaling applied in CSS to hide standard browser sub-pixel rendering gaps.
- **Global Audio**: There is a global audio mute toggle in the top nav. The script in `app.js` loops through all playable videos and updates their `muted` property based on this state.
- **Sticky Wrap Logic**: The "Command Central" sections use a tall `100vh` sticky wrapper. GSAP is used to interpolate scrolling progress into cross-fading UI cards and animating the UI layout.

## Next Steps for Production
- You'll likely want to hook up the `buy-btn` and `#cart-checkout-btn` click listeners in `app.js` to your actual checkout backend (e.g. Stripe checkout sessions or Shopify storefront API).
- Ensure the video assets in `assets/` are correctly hosted or served via a CDN in production for optimal load speeds.

Enjoy working on the project!
