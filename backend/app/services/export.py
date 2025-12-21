"""Backward-compatible export service import path.

Some tests and older code import `ExportService` from `app.services.export`.
The canonical implementation lives in `app.services.export_service`.
"""

from app.services.export_service import ExportService

__all__ = ["ExportService"]
