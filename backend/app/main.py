import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db_pool
from app.services.seed_service import run_seed
from app.routes import (
    auth_routes,
    dashboard_routes,
    expense_routes,
    approval_routes,
    budget_routes,
    admin_routes,
    copilot_routes
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Resolve frontend build path
dist_path = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing FastAPI Backend and Database Pool...")
    init_db_pool()
    try:
        run_seed()
    except Exception as e:
        logger.error(f"Error during database startup seed: {e}")
    yield
    logger.info("Shutting down backend...")

app = FastAPI(
    title="Intelligent Expense Approval & Budget Monitoring System",
    description="AI-powered financial control platform evaluating expenses, policies, and budgets.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for development and external testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Mount API routers first
app.include_router(auth_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(expense_routes.router)
app.include_router(approval_routes.router)
app.include_router(budget_routes.router)
app.include_router(admin_routes.router)
app.include_router(copilot_routes.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Intelligent Expense & Budget System",
        "version": "1.0.0",
        "frontend_integrated": (dist_path / "index.html").exists()
    }

# 2. Mount static assets
if (dist_path / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")

# 3. Serve root
@app.get("/")
def serve_root():
    index_file = dist_path / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return HTMLResponse("<h1>Backend Running. Run 'npm run build' in frontend to compile UI.</h1>")

# 4. React SPA Router Catch-All Fallback
@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    # Never intercept API calls
    if full_path.startswith("api/") or full_path == "api":
        raise HTTPException(status_code=404, detail="API endpoint not found")

    # If static file exists in dist (e.g. favicon.svg, icons.svg)
    file_candidate = dist_path / full_path
    if file_candidate.is_file():
        return FileResponse(str(file_candidate))

    # Return React index.html for all client-side routes
    index_file = dist_path / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))

    raise HTTPException(status_code=404, detail="Resource not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
