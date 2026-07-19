import uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
    correlation = request.headers.get("x-correlation-id", "mir_" + uuid.uuid4().hex[:16])
    request.state.correlation_id = correlation
    response = await call_next(request)
    response.headers["x-correlation-id"] = correlation
    response.headers["x-content-type-options"] = "nosniff"
    return response

@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {}
    code = detail.get("code", "http_error")
    message = detail.get("message", "Request could not be completed safely.")
    details = {key: value for key, value in detail.items() if key not in {"code", "message"}}
    return JSONResponse(status_code=exc.status_code, content={"code": code, "message": message, "correlation_id": getattr(request.state, "correlation_id", "unknown"), "details": details})


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"code": "validation_error", "message": "Request validation failed.", "correlation_id": getattr(request.state, "correlation_id", "unknown"), "details": {"errors": exc.errors()}})


@app.exception_handler(Exception)
async def server_error(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"code": "server_error", "message": "Unexpected server error.", "correlation_id": getattr(request.state, "correlation_id", "unknown"), "details": {}})

app.include_router(router, prefix="/api/v1")
