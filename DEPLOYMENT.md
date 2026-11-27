# 🚀 RprPDF Deployment Guide

RprPDF is engineered as a **100% client-side, zero-storage static web application**. Because all processing happens inside the user's browser via WebAssembly and HTML5 Canvas, **no backend server or database is required**.

You can deploy RprPDF in seconds to any static hosting provider or container environment.

---

## ⚡ Option 1: Vercel (Recommended — 1-Click / CLI)

RprPDF includes [`vercel.json`](./vercel.json) pre-configured with security headers and caching rules.

### Via Vercel Web Dashboard (Drag-and-Drop)
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New Project** ➔ **Import Git Repository** (or drag this project folder directly).
3. Framework Preset: Choose **Other** (Root directory: `./`).
4. Click **Deploy**. Your site will be live on a fast global edge network in seconds.

### Via Vercel CLI
```bash
# If you have Vercel CLI installed:
vercel deploy --prod
```

---

## 🌐 Option 2: Netlify (1-Click / Drag-and-Drop)

RprPDF includes [`netlify.toml`](./netlify.toml) configured for SPA redirects and caching.

### Via Netlify Drop (Zero Configuration)
1. Visit [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop this folder directly into the browser window.
3. Your private PDF editor is instantly live with a free SSL certificate.

---

## 🐙 Option 3: GitHub Pages (Free Automated CI/CD)

RprPDF includes a pre-configured GitHub Actions workflow in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

1. Push this codebase to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of RprPDF"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/privapdf.git
   git push -u origin main
   ```
2. In your GitHub repo, go to **Settings** ➔ **Pages**.
3. Under **Source**, select **GitHub Actions**.
4. The deployment workflow will trigger automatically and publish your site at `https://YOUR_USERNAME.github.io/privapdf/`.

---

## ☁️ Option 4: Cloudflare Pages

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ **Workers & Pages** ➔ **Create Application**.
2. Connect your Git repository.
3. Build Settings:
   - **Framework Preset**: None
   - **Build command**: (Leave empty)
   - **Build output directory**: `.`
4. Click **Save and Deploy**.

---

## 🐳 Option 5: Docker / Self-Hosted (Nginx)

RprPDF includes a multi-stage production [`Dockerfile`](./Dockerfile), [`nginx.conf`](./nginx.conf), and [`docker-compose.yml`](./docker-compose.yml).

### Using Docker Compose
```bash
docker compose up -d --build
```
Your instance will be running locally at `http://localhost:8080`.

### Manual Docker Build
```bash
docker build -t privapdf .
docker run -d -p 80:80 --name privapdf-app privapdf
```

---

## 💻 Option 6: Local Development / Offline Testing

RprPDF includes [`server.py`](./server.py), a zero-dependency server that automatically configures WebAssembly, Service Worker, and Web Manifest MIME types:

```bash
python server.py
```
This automatically launches your default web browser at `http://localhost:8000`.

---

## 📱 Progressive Web App (PWA) Offline Installation

Because RprPDF includes a Service Worker ([`sw.js`](./sw.js)) and Web App Manifest ([`manifest.json`](./manifest.json)):
- Users can install it directly to their **Desktop or Home Screen** (Chrome, Edge, Safari, Firefox).
- It works **100% offline without an active internet connection**, verifying the zero-cloud privacy guarantee.
