import os

def create_sample_pdf(filename="sample-10-pages.pdf", num_pages=10):
    """Generates a valid, minimal multi-page PDF without third-party dependencies."""
    objects = []
    
    # 1: Catalog
    # 2: Pages
    # 3.. 3+num_pages-1: Page objects
    # 3+num_pages .. : Content streams
    # font object
    
    catalog_id = 1
    pages_id = 2
    font_id = 3
    
    page_ids = [4 + i * 2 for i in range(num_pages)]
    content_ids = [5 + i * 2 for i in range(num_pages)]
    
    pdf = []
    pdf.append("%PDF-1.4\n")
    
    offsets = {}
    
    def add_obj(obj_id, content):
        offsets[obj_id] = sum(len(x.encode('latin1')) for x in pdf)
        pdf.append(f"{obj_id} 0 obj\n{content}\nendobj\n")
        
    add_obj(catalog_id, f"<< /Type /Catalog /Pages {pages_id} 0 R >>")
    
    kids_str = " ".join(f"{pid} 0 R" for pid in page_ids)
    add_obj(pages_id, f"<< /Type /Pages /Kids [{kids_str}] /Count {num_pages} >>")
    
    add_obj(font_id, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    
    for i in range(num_pages):
        pid = page_ids[i]
        cid = content_ids[i]
        
        # Content stream
        text = f"BT /F1 36 Tf 150 700 Td (Page {i+1} of {num_pages}) Tj ET "
        text += f"BT /F1 18 Tf 150 650 Td (PrivaPDF Visual Split Preview Test) Tj ET "
        text += f"BT /F1 14 Tf 150 600 Td (Processed 100% in your browser without cloud uploads.) Tj ET "
        
        # Draw a colored decorative box
        text += f"0.3 0.4 0.9 rg 120 550 360 4 re f "
        
        stream_len = len(text)
        add_obj(cid, f"<< /Length {stream_len} >>\nstream\n{text}\nendstream")
        
        # Page obj
        add_obj(pid, f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 595 842] /Contents {cid} 0 R /Resources << /Font << /F1 {font_id} 0 R >> >> >>")
        
    startxref = sum(len(x.encode('latin1')) for x in pdf)
    
    max_id = max(offsets.keys())
    xref = [f"xref\n0 {max_id + 1}\n0000000000 65535 f \n"]
    for i in range(1, max_id + 1):
        pos = offsets.get(i, 0)
        xref.append(f"{pos:010d} 00000 n \n")
        
    trailer = f"trailer\n<< /Size {max_id + 1} /Root {catalog_id} 0 R >>\nstartxref\n{startxref}\n%%EOF\n"
    
    final_data = "".join(pdf) + "".join(xref) + trailer
    with open(filename, "wb") as f:
        f.write(final_data.encode('latin1'))
    print(f"Generated {filename} with {num_pages} pages successfully!")

if __name__ == "__main__":
    create_sample_pdf()
