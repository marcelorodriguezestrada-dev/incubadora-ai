"""
main.py actualizado — registra todos los routers incluyendo auth.
Reemplaza el main.py existente.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

# Importar el router unificado que tiene todos los endpoints
from api.routes import router
app = FastAPI(
    title="Incubadora AI",
    description="Evaluador e incubadora de emprendimientos con IA — contexto argentino",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "https://*.vercel.app",
        "https://*.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "0.4.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
    }
