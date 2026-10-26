# Sama · سما

Website for a Middle Eastern rooftop restaurant, café bar and shisha lounge in Downtown Dubai. English and Arabic.

## Run it

```sh
cd sama
python3 -m http.server 8642 --bind 127.0.0.1
```

Open http://127.0.0.1:8642. There's no build step. GSAP, ScrollTrigger and Lenis load from a CDN.

## Files

- `index.html`: page structure
- `css/style.css`: colour and type tokens are at the top
- `js/content.js`: **all text, dishes, prices and flavours, in English and Arabic.** Edit the menu here.
- `js/main.js`: scroll animations, language switch, menu tabs and the booking form
- `assets/img/`: placeholder photos from Unsplash. Replace them with the restaurant's own photos using the same file names.

## Not built yet

- The booking form only shows a confirmation message. It needs to be connected to WhatsApp, email or a booking system.
- The address, phone number and social links are placeholders.
