import logging
from pathlib import Path
from minio import Minio
from minio.error import S3Error
from urllib.parse import urlparse

from app.core.config import settings

logger = logging.getLogger(__name__)


class MinioService:
    LOCAL_BUCKET = "__local_temp__"

    @staticmethod
    def _normalize_endpoint(raw_endpoint: str) -> tuple[str, bool]:
        cleaned = (raw_endpoint or "").strip()
        if not cleaned:
            raise RuntimeError("ENDPOINT MinIO manquant.")

        # Tolerate malformed values like http://host::9000
        cleaned = cleaned.replace("::", ":")
        if "://" not in cleaned:
            cleaned = f"http://{cleaned}"

        parsed = urlparse(cleaned)
        endpoint = parsed.netloc or parsed.path
        if not endpoint:
            raise RuntimeError(f"Endpoint MinIO invalide: {raw_endpoint}")

        logger.info(
            "MinIO endpoint normalise: endpoint=%s secure=%s",
            endpoint.rstrip("/"),
            parsed.scheme == "https",
        )
        return endpoint.rstrip("/"), parsed.scheme == "https"

    @staticmethod
    def _client() -> Minio:
        endpoint, secure = MinioService._normalize_endpoint(settings.MINIO_ENDPOINT)

        return Minio(
            endpoint,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=secure,
        )

    @staticmethod
    def ensure_bucket_exists() -> None:
        client = MinioService._client()
        bucket = settings.MINIO_BUCKET

        try:
            exists = client.bucket_exists(bucket)
        except Exception as exc:
            raise RuntimeError(
                f"Echec verification bucket MinIO '{bucket}' sur endpoint '{settings.MINIO_ENDPOINT}': {exc}"
            ) from exc

        if not exists:
            raise RuntimeError(
                f"Bucket MinIO introuvable: {bucket} sur endpoint '{settings.MINIO_ENDPOINT}'"
            )

    @staticmethod
    def upload_file(file_path: str, object_key: str, content_type: str) -> dict:
        client = MinioService._client()
        bucket = settings.MINIO_BUCKET

        MinioService.ensure_bucket_exists()

        file_obj = Path(file_path)

        try:
            client.fput_object(
                bucket,
                object_key,
                str(file_obj),
                content_type=content_type,
            )
        except Exception as exc:
            raise RuntimeError(
                f"Echec upload MinIO bucket='{bucket}' object_key='{object_key}' file='{file_obj}': {exc}"
            ) from exc

        return {
            "bucket": bucket,
            "object_key": object_key,
            "file_size": file_obj.stat().st_size,
        }

    @staticmethod
    def get_object(bucket_name: str, object_key: str):
        if bucket_name == MinioService.LOCAL_BUCKET:
            return Path(object_key)

        client = MinioService._client()

        try:
            return client.get_object(bucket_name, object_key)
        except S3Error as e:
            raise RuntimeError(
                f"Echec lecture MinIO bucket='{bucket_name}' object_key='{object_key}': {e}"
            ) from e
