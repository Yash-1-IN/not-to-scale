"""A tiny local web server for working on the book (no install needed beyond Python).

    python tools/serve.py          # then open http://127.0.0.1:8000/index.html
    python tools/serve.py 8123     # a different port

It sends "Cache-Control: no-store" so the browser always reloads your latest edits (the plain
`python -m http.server` lets Chrome keep old copies of the .js files). Add ?test to the address to run
the self-test, e.g. http://127.0.0.1:8000/index.html?test
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):   # keep the terminal quiet
        pass


if __name__ == "__main__":
    os.chdir(ROOT)
    print("Serving", ROOT, "at http://127.0.0.1:%d/index.html  (Ctrl+C to stop)" % PORT)
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
