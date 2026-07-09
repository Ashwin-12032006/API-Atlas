import http.server
import socketserver
import subprocess
import sys
import os

PORT = 8000

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # API Endpoint for Live Agent Verification Execution
        if self.path.startswith('/run-verify'):
            import urllib.parse
            parsed_url = urllib.parse.urlparse(self.path)
            query_components = urllib.parse.parse_qs(parsed_url.query)
            sample_size = query_components.get('sample', ['15'])[0]

            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.end_headers()
            
            print(f"[Server] Starting verify_agent.py live execution stream (Sample: {sample_size})...")
            
            # Start verify_agent.py as an unbuffered subprocess (python -u)
            process = subprocess.Popen(
                [sys.executable, '-u', 'verify_agent.py', '--sample', sample_size],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                cwd=os.getcwd()
            )
            
            # Stream the stdout line by line to the browser in real-time
            try:
                for line in iter(process.stdout.readline, ''):
                    if not line:
                        break
                    # Format as standard Server-Sent Event data
                    clean_line = line.strip('\n')
                    self.wfile.write(f"data: {clean_line}\n\n".encode('utf-8'))
                    self.wfile.flush()
            except Exception as e:
                print(f"[Server Error] Streaming interrupted: {e}")
            finally:
                process.stdout.close()
                process.wait()
                
            # Signal the end of the stream
            self.wfile.write("data: [DONE]\n\n".encode('utf-8'))
            self.wfile.flush()
            print("[Server] Live verification stream completed successfully.")
            return
        else:
            return super().do_GET()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_POST(self):
        if self.path == '/add-app':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            import json
            try:
                new_app = json.loads(post_data.decode('utf-8'))
                
                results_path = 'research_results.json'
                results = []
                if os.path.exists(results_path):
                    with open(results_path, 'r') as f:
                        results = json.load(f)
                
                new_app['id'] = len(results) + 1
                results.append(new_app)
                
                with open(results_path, 'w') as f:
                    json.dump(results, f, indent=2)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "app": new_app}).encode('utf-8'))
                print(f"[Server] Successfully registered new SaaS app: {new_app['name']}")
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
                print(f"[Server Error] Failed to add app: {e}")
            return

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def main():
    # Set directory to workspace root to serve index.html correctly
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
        print(f"==================================================")
        print(f"Composio Product Ops Case Study Local Server")
        print(f"Serving at: http://localhost:{PORT}")
        print(f"Live Verification Endpoint: http://localhost:{PORT}/run-verify")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.shutdown()

if __name__ == "__main__":
    main()
