from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes.auth import router as auth_router
from .core.config import settings
from .database import init_db

init_db()

app = FastAPI(title="SpeakFlo AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "SpeakFlo AI backend is running"}


app.include_router(auth_router)
