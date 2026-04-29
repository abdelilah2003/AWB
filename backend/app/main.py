import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.admin_catalog import router as admin_catalog_router
from app.api.admin_questionnaire import router as admin_questionnaire_router
from app.api.analysis import router as analysis_router
from app.api.questionnaire import router as questionnaire_router
from app.api.reports import router as reports_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


app = FastAPI(title="AWB Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled backend exception: path=%s method=%s",
        request.url.path,
        request.method,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "error_type": "UNHANDLED_EXCEPTION",
                "step": "global_exception_handler",
                "message": "Une erreur non geree est survenue dans le backend.",
                "cause": str(exc),
                "path": request.url.path,
                "method": request.method,
            }
        },
    )


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(questionnaire_router)
app.include_router(admin_questionnaire_router)
app.include_router(admin_catalog_router)
app.include_router(analysis_router)
app.include_router(reports_router)


@app.get("/")
def root():
    return {"message": "AWB FastAPI backend is running"}
