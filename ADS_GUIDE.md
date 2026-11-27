# 📢 RprPDF Display Advertising Guide

RprPDF comes pre-configured with **high-converting, responsive display ad slots** designed according to standard IAB ad units (Interactive Advertising Bureau). 

All slots are configured with fixed aspect ratios and minimum heights to prevent **Cumulative Layout Shift (CLS)**, ensuring top-tier Google Core Web Vitals scores and high revenue RPMs.

---

## 📍 Configured Ad Placements

| Slot Location | Standard Dimensions | Typical CPM / Performance | Code Location in `index.html` |
| :--- | :--- | :--- | :--- |
| **Top Leaderboard** | `728 × 90` (Desktop)<br>`320 × 50` (Mobile) | Highest initial viewability across all users | Line ~117 (Below top navbar, above content) |
| **Mid-Page Billboard** | `970 × 90` (Billboard)<br>`728 × 90` (Leaderboard) | High engagement after exploring the tool grid | Line ~460 (Between tool grid & privacy comparison) |
| **Tool Workspace Rectangle** | `300 × 250` (Medium Rectangle) | Highest click-through rate (CTR) during file download | Line ~870 (Inside Compress & tool workspaces) |
| **Bottom Leaderboard** | `728 × 90` (Leaderboard) | Global site-wide footer viewability | Line ~1290 (Directly above `<footer>`) |

---

## 🛠️ How to Connect Your Ad Network

### 1. Google AdSense Setup

1. In the `<head>` of [`index.html`](./index.html), add your AdSense script tag:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
   ```

2. Replace any of the placeholder `<div>` blocks in [`index.html`](./index.html) with your AdSense ad tag:
   ```html
   <!-- Example Google AdSense Responsive Unit -->
   <ins class="adsbygoogle"
        style="display:block"
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot="YYYYYYYYYY"
        data-ad-format="auto"
        data-full-width-responsive="true"></ins>
   <script>
        (adsbygoogle = window.adsbygoogle || []).push({});
   </script>
   ```

---

### 2. Carbon Ads / EthicalAds Setup (For Developer / Privacy Audiences)

Since RprPDF is a privacy-first utility, developer-focused ad networks like **Carbon Ads** or **EthicalAds** convert exceptionally well without cookies:

```html
<!-- Example Carbon Ads Tag -->
<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=YOUR_CODE&placement=YOUR_DOMAIN" id="_carbonads_js"></script>
```

---

### 3. Direct Sponsorships or Affiliate Banners

You can also use these slots to promote your own software, premium tools, or affiliate products:
```html
<a href="https://your-sponsor-link.com" target="_blank" rel="noopener noreferrer" class="block w-full">
  <img src="assets/your-banner-728x90.png" alt="Sponsor Banner" class="w-full h-auto rounded-xl">
</a>
```
