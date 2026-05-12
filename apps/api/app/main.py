from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

from app.config import settings
from app.routers import health, papers

app = FastAPI(title="BrainBite API", version="0.1.0")


@app.get("/", tags=["meta"], response_model=None)
def root(request: Request) -> HTMLResponse | JSONResponse:
    """JSON for tools; HTML when opened in a browser so it does not look like a blank page."""
    accept = (request.headers.get("accept") or "").lower()
    if "text/html" in accept:
        return HTMLResponse(
            content="""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BrainBite API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem;
           line-height: 1.5; color: #0f172a; background: #f8fafc; }
    h1 { font-size: 1.25rem; }
    a { color: #0d9488; }
    code { background: #e2e8f0; padding: 0.15rem 0.35rem; border-radius: 0.25rem; }
    .box { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem 1.25rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>BrainBite API 서버입니다</h1>
  <p>지금 주소는 <strong>백엔드(FastAPI)</strong>예요. 여기서는 JSON만 내려가서 화면이 비어 보일 수 있습니다.</p>
  <div class="box">
    <p><strong>웹 앱(연구실 화면)</strong>은 보통 아래에서 켭니다.</p>
    <ul>
      <li>개발: <a href="http://localhost:5173">http://localhost:5173</a> 또는 <a href="http://127.0.0.1:5173">http://127.0.0.1:5173</a></li>
      <li>터미널: 저장소 루트에서 <code>npm run dev:web</code> (또는 <code>apps/web</code>에서 <code>npm run dev</code>)</li>
    </ul>
  </div>
  <div class="box">
    <p>유용한 링크</p>
    <ul>
      <li><a href="/docs">API 문서 (Swagger)</a></li>
      <li><a href="/api/health">GET /api/health</a> (JSON)</li>
    </ul>
  </div>
</body>
</html>""",
            status_code=200,
        )
    return JSONResponse(
        {
            "service": "brainbite-api",
            "docs": "/docs",
            "health": "/api/health",
            "web_dev_hint": "Open the Vite app at http://localhost:5173 (not this port).",
        }
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(papers.router, prefix="/api")
