# RprPDF — 100% Client-Side, Zero-Storage PDF Architecture & Suite

RprPDF is an enterprise-grade, zero-storage, 100% client-side PDF workspace built strictly with browser-native APIs and WebAssembly. Sensitive legal contracts, invoices, tax documents, and financial records **never leave the user's computer** or touch any remote server.

---

## 🏛️ Technical Architecture & Roadmap

```
                               ┌───────────────────────────────────────────────┐
                               │           RprPDF Browser Sandbox            │
                               │          (100% Client-Side Execution)         │
                               └──────────────────────┬────────────────────────┘
                                                      │
         ┌──────────────────┬─────────────────────────┼─────────────────────────┬──────────────────┐
         ▼                  ▼                         ▼                         ▼                  ▼
┌─────────────────┐ ┌───────────────┐ ┌───────────────────────────────┐ ┌───────────────┐ ┌────────────────┐
│   Mozilla PDF.js│ │    pdf-lib    │ │  WebAssembly Document Engine  │ │  Web Workers  │ │ Memory Manager │
│ HTML5 Previews &│ │ Merge, Split, │ │ Mammoth (.docx) & SheetJS     │ │ Background    │ │ Zero Leaks,    │
│ Thumbnails Grid │ │ Layers, Edit  │ │ Serverless Office Conversion  │ │ Computation   │ │ Auto Revoke    │
└─────────────────┘ └───────────────┘ └───────────────────────────────┘ └───────────────┘ └────────────────┘
```

### 1. Zero-Storage Privacy Philosophy
- **No Uploads**: Network requests are never made for user files. Processing executes directly on the client's CPU and RAM.
- **Offline Capable**: Fully functional even when disconnected from the internet.
- **Enterprise Compliant**: Ideal for HIPAA, GDPR, NDA, and legal data security.

### 2. Universal Drop Zone with MIME Auto-Routing
- When a user drops a file anywhere on screen, RprPDF inspects the MIME type and extension:
  - `.docx`, `.txt`, `.md` ➔ Automatically opens **Word to PDF**
  - `.xlsx`, `.xls`, `.csv` ➔ Automatically opens **Excel to PDF**
  - `.jpg`, `.jpeg`, `.png`, `.webp` ➔ Automatically opens **Images to PDF**
  - `.pdf` ➔ Prompts with **Smart Quick Action Selector** or opens current tool

### 3. Progressive Feedback
- Skeleton loaders during thumbnail rendering
- Real-time animated progress modal with percentages and localized status updates
- Success celebrations with confetti

### 4. Client-Side Performance Optimization
- **Web Workers**: Dedicated `js/pdf-worker.js` handles heavy tasks off the main UI thread.
- **Memory Management**: FileReader API releases `ArrayBuffer` objects, explicit zeroing, and `URL.revokeObjectURL()` ensures no memory leaks.
- **Dynamic Imports**: Mammoth, SheetJS, and jsPDF AutoTable are lazy-loaded on-demand only when a conversion tool is triggered, keeping initial page load under 1 second.

---

## 🗺️ Roadmap & Implemented Phases

| Phase | Feature Module | Technical Execution |
| :--- | :--- | :--- |
| **Phase 1: MVP** | **Merge, Split, & Compress** | Core drag-and-drop interface. `pdf-lib` extracts and combines page streams. Client-side stream optimization and metadata stripping. |
| **Phase 2: Visuals** | **Page Viewer & Organization** | Mozilla PDF.js renders clickable thumbnails. **Drag-and-drop page reordering**, rotate (90°/180°/270°), duplicate, and page deletion. |
| **Phase 3: Editing** | **Text & Image Insertion** | Overlay structural text, custom logos/images, and translucent highlight boxes on existing PDF layers (iCreatePDF style). Coordinates mapped to PDF point space. |
| **Phase 4: Conversions**| **Office to PDF** | Serverless conversion of Word (`.docx`), Excel (`.xlsx`), and plain text (`.txt`, `.md`) directly in local memory using Mammoth and SheetJS. |

---

## 🛠️ Complete Tool Suite

1. ✍️ **Edit PDF (Interactive)**: Add structural text, adjust font size/colors, insert graphics/images, and place highlight rectangles anywhere on the canvas.
2. 🔄 **Organize & Reorder Pages**: Visual drag-and-drop page ordering powered by PDF.js thumbnails.
3. ✂️ **Visual Split PDF**: Select specific pages with visual previews, extract page sets, or split all pages into a `.zip` archive.
4. 📑 **Merge PDF**: Combine multiple PDFs into a unified file with drag-and-drop sorting.
5. 🗜️ **Compress PDF**: Optimize internal streams and dictionary structures client-side.
6. 📄 **Word to PDF**: Convert `.docx` and `.txt` files directly into formatted PDF documents.
7. 📊 **Excel to PDF**: Parse `.xlsx` and `.csv` spreadsheets in memory and output paginated table PDFs.
8. ✍️ **Sign PDF**: Place drawn canvas signatures, typed cursive, or uploaded images onto any page.
9. 🔒 **Watermark PDF**: Apply diagonal "CONFIDENTIAL" or custom copyright text.
10. 🖼️ **PDF to Images**: Render pages to high-res PNGs and download as a ZIP archive.
11. 📸 **Images to PDF**: Convert photos/scans (JPG/PNG) into a single PDF document.
12. 🔐 **Protect PDF**: ISO-compliant 128-bit RC4 encryption with password lock directly in browser memory.
13. 🔢 **Page Numbers**: Add header/footer pagination with English and Hindi (Devanagari) numerals.
14. 🌓 **PDF to Grayscale**: Convert color documents to clean black & white for ink-friendly printing.
15. 📐 **Crop Margins & Flatten**: Trim unwanted margins and flatten interactive form fields into static read-only pages.
16. 🖼️ **Image Compressor**: Batch compress & resize JPG, PNG, and WebP images by up to 90% in memory with ZIP download.

---

## 🚀 How to Run Locally

Run with any local web server:

```bash
# Using Python
python -m http.server 8000
```

Then visit:
```
http://localhost:8000
```

---

## 📁 Project Structure

```
├── index.html                # Single Page Application (SPA) & tool views
├── css/
│   └── styles.css            # Custom animations, drag-and-drop overlay & thumbnail styles
├── js/
│   ├── app.js                # Core controller, universal drop zone & MIME router
│   ├── utils.js              # Memory management, dynamic loader, progress feedback
│   ├── pdf-worker.js         # Web Worker for background array & stream processing
│   └── tools/
│       ├── edit.js           # Phase 3 Text, Image & Highlight structural editor
│       ├── rotate.js         # Phase 2 Visual Drag-and-Drop Page Organizer
│       ├── office.js         # Phase 4 Serverless Word (.docx) & Excel (.xlsx) converter
│       ├── split.js          # Phase 1/2 PDF.js visual split & page extractor
│       ├── merge.js          # Phase 1 Multi-file PDF merger
│       ├── compress.js       # Phase 1 Client-side stream optimizer
│       ├── sign.js           # Signature pad & draggable placer
│       ├── watermark.js      # Text watermarking
│       └── convert.js        # Images to PDF & PDF to Images (ZIP)
├── generate_sample.py        # Python script to generate sample multi-page test PDFs
├── sample-10-pages.pdf       # 10-page test PDF for immediate testing
└── README.md
```


## Developer Contact
For support, inquiries, or feedback: [rprrpf1@gmail.com](mailto:rprrpf1@gmail.com)
