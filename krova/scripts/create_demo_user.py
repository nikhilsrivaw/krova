"""
Create a Supabase Auth user + matching KROVA users row, then trigger the
existing dev seeder to populate that user's workspace with realistic data.

Usage:
  cd krova
  python -m scripts.create_demo_user \\
    --email demo@krova.in \\
    --password demo1234 \\
    --name "Demo Owner"

  # Add --reset to wipe and reseed if the user already exists.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import select  # noqa: E402

from shared.database.connection import AsyncSessionLocal  # noqa: E402
from shared.database.models.user import User  # noqa: E402
from scripts.seed_dev import seed  # noqa: E402


SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]


async def create_supabase_user(email: str, password: str, name: str) -> str:
    """Create the auth user via Supabase Admin API. Returns the auth user UUID."""
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "email": email,
        "password": password,
        "email_confirm": True,  # auto-verify so they can log in immediately
        "user_metadata": {"full_name": name},
    }
    async with httpx.AsyncClient(timeout=20, verify=False) as client:
        r = await client.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=headers,
            json=body,
        )
        if r.status_code == 422 or r.status_code == 400:
            # Probably already exists — look up the user
            print(f"   User probably exists, looking up by email...")
            r2 = await client.get(
                f"{SUPABASE_URL}/auth/v1/admin/users",
                headers=headers,
                params={"email": email, "page": 1, "per_page": 1},
            )
            r2.raise_for_status()
            data = r2.json()
            users = data.get("users", [])
            if users:
                existing = users[0]
                print(f"  [OK] Found existing Supabase user: {existing['id']}")
                return existing["id"]
            raise SystemExit(f"Could not create or find Supabase user: {r.text}")
        r.raise_for_status()
        user = r.json()
        print(f"  [OK] Created Supabase Auth user: {user['id']}")
        return user["id"]


async def ensure_krova_user(supabase_id: str, email: str, name: str) -> None:
    """Make sure the KROVA users table has a row linked to the auth user."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        if existing:
            if existing.supabase_user_id != supabase_id:
                existing.supabase_user_id = supabase_id
                await db.commit()
                print(f"  [OK] Updated KROVA user link → {supabase_id}")
            else:
                print(f"  [OK] KROVA user already linked")
            return
        user = User(email=email, supabase_user_id=supabase_id, full_name=name)
        db.add(user)
        await db.commit()
        print(f"  [OK] Created KROVA users row")


async def main(args: argparse.Namespace) -> None:
    print(f"\nCreating demo account for {args.email}")
    print("=" * 60)

    print("\n1. Creating Supabase Auth user...")
    supabase_id = await create_supabase_user(args.email, args.password, args.name)

    print("\n2. Linking KROVA users row...")
    await ensure_krova_user(supabase_id, args.email, args.name)

    print("\n3. Seeding workspace data...")
    async with AsyncSessionLocal() as db:
        await seed(args.email, args.reset, db)

    print("\n" + "=" * 60)
    print(f"[DONE] You can now log in:")
    print(f"  Email:    {args.email}")
    print(f"  Password: {args.password}")
    print(f"  URL:      http://localhost:3000/login")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Demo Owner")
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()

    try:
        asyncio.run(main(args))
    except KeyboardInterrupt:
        sys.exit(130)
