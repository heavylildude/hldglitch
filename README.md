# HLD Glitch

A standalone, zero-dependency plugin files:

1. [hldglitch.js] *(Single-file drop-in script with auto-injected styles)*
2. [hldglitch.css] *(Optional separate stylesheet if you ever prefer pure CSS)*

---

### How to Use on **ANY** HTML Page

#### 1. Basic (Single-line Drop-in)
Just add this single line before `</body>`:
```html
<script src="hldglitch.js"></script>
```
*It automatically injects its required styles, creates the overlay/slice DOM elements if not already present, starts after 3s, and randomizes subsequent bursts.*

---

#### 2. Custom Intervals via HTML Data Attributes
You can customize intervals directly in HTML:
```html
<script src="hldglitch.js" 
  data-start="3000" 
  data-min="50000" 
  data-max="95000"
  data-banner-top="▓▒░ SIGNAL CORRUPTION // FRAME DESYNC ░▒▓"
  data-banner-bottom="ERR::PACKET_LOSS ███ SYSTEM UNSTABLE ███ RETRY">
</script>
```

---

#### 3. Custom Intervals via JavaScript Object
```html
<script>
window.HLD_GLITCH_CONFIG = {
  startInterval: 3000,    // Initial wait on page load (ms)
  minInterval: 50000,     // Minimum random interval (ms)
  maxInterval: 95000,     // Maximum random interval (ms)
  minDuration: 650,       // Minimum burst duration (ms)
  maxDuration: 1050       // Maximum burst duration (ms)
};
</script>
<script src="hldglitch.js"></script>
```

---

#### 4. JavaScript Public API
You can manually trigger or control the glitch from your own scripts:
```javascript
// Trigger an immediate 800ms distortion burst
window.HLDGlitch.burst(800);

// Stop all scheduled bursts
window.HLDGlitch.stop();

// Resume / restart scheduled bursts
window.HLDGlitch.start();

// Dynamically update config
window.HLDGlitch.configure({ minInterval: 40000, maxInterval: 80000 });
```