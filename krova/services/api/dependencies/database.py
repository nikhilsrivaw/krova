"""
KROVA — Database Dependency
Re-exports the async session dependency from shared so routers
can import from a single, consistent location.

Usage in a router:
    from services.api.dependencies.database import get_db

    @router.get("/customers")
    async def list_customers(db: AsyncSession = Depends(get_db)):
        ...
"""

from shared.database.connection import get_db

__all__ = ["get_db"]
