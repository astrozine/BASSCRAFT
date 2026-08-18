const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(
  'data-lightbox-src="assets/July 2026 website video exports/cushion/hero 2 cushions/hero 2 cushions - horizontal - h264.mp4"',
  'data-title="1. Hook it" data-subtitle="Simply slip the integrated hook under your driver or passenger headrest." data-lightbox-src="assets/July 2026 website video exports/cushion/hero 2 cushions/hero 2 cushions - horizontal - h264.mp4"'
);

html = html.replace(
  'data-lightbox-src="assets/July 2026 website video exports/controller/controller in reach/controller in reach - horizontal - h264.mp4"',
  'data-title="2. Mount it" data-subtitle="Place the compact Basscraft controller in your center console." data-lightbox-src="assets/July 2026 website video exports/controller/controller in reach/controller in reach - horizontal - h264.mp4"'
);

html = html.replace(
  'data-lightbox-playlist=\'["assets/July 2026 website video exports/controller/controller ports/2 power options/2 power options - usb c power - square - h264.mp4", "assets/July 2026 website video exports/controller/controller ports/2 power options/2 power options - cigarette dc power - square - h264.mp4"]\'>',
  'data-title="3. Power it" data-subtitle="Plug into any standard 12V cigarette lighter or a USB-C port." data-lightbox-playlist=\'["assets/July 2026 website video exports/controller/controller ports/2 power options/2 power options - usb c power - square - h264.mp4", "assets/July 2026 website video exports/controller/controller ports/2 power options/2 power options - cigarette dc power - square - h264.mp4"]\'>'
);

html = html.replace(
  'data-lightbox-src="assets/July 2026 website video exports/cushion/haptic speakers inside/haptic speakers inside - horizontal - h264.mp4"',
  'data-title="The Engine" data-subtitle="Dual high-torque haptic transducers deliver precise frequencies (10Hz&ndash;200Hz), tucked inside the cushion itself." data-lightbox-src="assets/July 2026 website video exports/cushion/haptic speakers inside/haptic speakers inside - horizontal - h264.mp4"'
);

html = html.replace(
  'data-lightbox-src="assets/July 2026 website video exports/cushion/cushion - exploded view/cushion - exploded view - horizontal - h264.mp4"',
  'data-title="Cushion Breakdown" data-subtitle="Memory foam core, breathable mesh, and embedded transducers &mdash; layered for all-day comfort and full-body bass." data-lightbox-src="assets/July 2026 website video exports/cushion/cushion - exploded view/cushion - exploded view - horizontal - h264.mp4"'
);

html = html.replace(
  'data-lightbox-src="assets/July 2026 website video exports/controller/exploded view/exploded view - horizontal - h264.mp4"',
  'data-title="Controller Breakdown" data-subtitle="The basscraft controller box and frequency sensor houses the amplifier, DAC, and intensity electronics that drive both cushions." data-lightbox-src="assets/July 2026 website video exports/controller/exploded view/exploded view - horizontal - h264.mp4"'
);

html = html.replace(
  'data-lightbox-src="assets/July 2026 website video exports/controller/controller knobs/controller knobs - horizontal - h264.mp4"',
  'data-title="Tactile Control" data-subtitle="Three analog knobs let you adjust intensity by feel &mdash; no app, no screen, no distraction." data-lightbox-src="assets/July 2026 website video exports/controller/controller knobs/controller knobs - horizontal - h264.mp4"'
);

html = html.replace(
  'data-lightbox-playlist=\'["assets/July 2026 website video exports/controller/controller ports/cable inputs reveal/cable inputs reveal - horizontal - h264.mp4", "assets/July 2026 website video exports/controller/controller ports/familiar cable types/familiar cable types - horizontal.mp4"]\'',
  'data-title="Cables &amp; Connectivity" data-subtitle="Familiar, standard cable types &mdash; fully wired for zero-latency response. No Bluetooth to pair, drop, or lag." data-lightbox-playlist=\'["assets/July 2026 website video exports/controller/controller ports/cable inputs reveal/cable inputs reveal - horizontal - h264.mp4", "assets/July 2026 website video exports/controller/controller ports/familiar cable types/familiar cable types - horizontal.mp4"]\''
);

html = html.replace(
  'shape-square-always vid-clickable" data-lightbox-playlist=\'["assets/July 2026 website video exports/controller/controller ports/2 power options/2 power options - usb c power - square - h264.mp4", "assets/July 2026 website video exports/controller/controller ports/2 power options/2 power options - cigarette dc power - square - h264.mp4"]\'',
  'shape-square-always vid-clickable" data-title="Power Options" data-subtitle="Plug into any 12V cigarette outlet or a USB-C port &mdash; universal power for any vehicle." data-lightbox-playlist=\'["assets/July 2026 website video exports/controller/controller ports/2 power options/2 power options - usb c power - square - h264.mp4", "assets/July 2026 website video exports/controller/controller ports/2 power options/2 power options - cigarette dc power - square - h264.mp4"]\''
);

html = html.replace(
  'data-lightbox-playlist=\'["assets/July 2026 website video exports/no bluetooth/full product demo with actor - square - h264.mp4","assets/July 2026 website video exports/no bluetooth/no bluetooth skit - square.mp4"]\'',
  'data-title="No Bluetooth" data-subtitle="Lag is the enemy of rhythm &mdash; that\'s why BASSCRAFT runs purely on a wired connection, so you feel the bass the exact millisecond it hits." data-lightbox-playlist=\'["assets/July 2026 website video exports/no bluetooth/full product demo with actor - square - h264.mp4","assets/July 2026 website video exports/no bluetooth/no bluetooth skit - square.mp4"]\''
);

html = html.replace(
  'data-lightbox-src="assets/July 2026 website video exports/sub cultural/amapiano - square - compressed.mp4"',
  'data-title="Music, activated." data-subtitle="Experience your favorite tracks like never before. Every 808, every bass drop, felt directly in your core." data-lightbox-src="assets/July 2026 website video exports/sub cultural/amapiano - square - compressed.mp4"'
);

html = html.replace(
  'data-lightbox-src="assets/July 2026 website video exports/sub cultural/hang drum - square - compressed.mp4"',
  'data-title="Music, activated." data-subtitle="Experience your favorite tracks like never before. Every 808, every bass drop, felt directly in your core." data-lightbox-src="assets/July 2026 website video exports/sub cultural/hang drum - square - compressed.mp4"'
);

html = html.replace(
  'data-lightbox-src="assets/July 2026 website video exports/sub cultural/phonk - square - compressed.mp4"',
  'data-title="Music, activated." data-subtitle="Experience your favorite tracks like never before. Every 808, every bass drop, felt directly in your core." data-lightbox-src="assets/July 2026 website video exports/sub cultural/phonk - square - compressed.mp4"'
);

fs.writeFileSync('index.html', html);
