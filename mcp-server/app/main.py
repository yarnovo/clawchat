from fastapi import FastAPI

from app.logging_config import setup_logging
from app.middleware import RequestIDMiddleware
from app.routers import health

setup_logging()

app = FastAPI(title="ClawChat API", version="0.1.0")
app.add_middleware(RequestIDMiddleware)
app.include_router(health.router)
