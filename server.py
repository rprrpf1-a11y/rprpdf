#!/usr/bin/env python3
"""
PrivaPDF Local Development & Production Preview Server
Serves the application with proper WASM, Service Worker, and Manifest MIME types.
"""
import http.server
import socketserver
import webbrowser
import os
import sys

PORT = int(os.environ.get("PORT", 8000))

class PrivaHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable Cross-Origin Isolation for high-performance WebAssembly and Workers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def guess_type(self, path):
        # Ensure correct MIME types for modern web APIs
        if path.endswith('.wasm'):
            return 'application/wasm'
        if path.endswith('.js'):
            return 'application/javascript'
        if path.endswith('.json') or path.endswith('.webmanifest'):
            return 'application/manifest+json'
        if path.endswith('.svg'):
            return 'image/svg+xml'
        return super().guess_type(path)

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), PrivaHTTPRequestHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print(f"🔒 PrivaPDF Server Running at: {url}")
        print("100% Client-Side. No files are uploaded to any server.")
        print("Press Ctrl+C to stop the server.")
        print("=" * 60)
        
        # Automatically open in browser if not running in CI
        if "--no-browser" not in sys.argv:
            try:
                webbrowser.open(url)
            except Exception:
                pass
                
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down PrivaPDF server. Goodbye!")
            httpd.server_close()

if __name__ == "__main__":
    run()
