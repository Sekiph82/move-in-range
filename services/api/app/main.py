from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .routes import router
from .db.session import init_db
from .settings import get_settings

app = FastAPI(title="MoveInRange API", version="0.1.0", openapi_url="/api/v1/openapi.json")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

@app.middleware("http")
async def correlation_id(request: Request, call_next):
    response = await call_next(request)
    response.headers["x-correlation-id"] = request.headers.get("x-correlation-id", "local-dev")
    response.headers["x-content-type-options"] = "nosniff"
    return response

app.include_router(router, prefix="/api/v1")
