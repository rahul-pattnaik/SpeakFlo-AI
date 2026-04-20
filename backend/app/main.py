from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes.auth import router as auth_router
from .api.routes.coach import router as coach_router
from .api.routes.users import protected_router as profile_router
from .api.routes.users import router as users_router
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


app.include_router(users_router)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(coach_router)
