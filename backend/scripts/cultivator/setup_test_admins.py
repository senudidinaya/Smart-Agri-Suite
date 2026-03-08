"""Setup test data for CallTask workflow verification."""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from cultivator.core.database import connect_db, get_db, close_db


async def setup_admins():
    """Update admins with dailyCallLimit."""
    await connect_db()
    db = get_db()
    
    # Update admins with dailyCallLimit
    result = await db.users.update_many(
        {'role': 'admin'},
        {'$set': {'dailyCallLimit': 2, 'isActive': True}}
    )
    print(f'Updated {result.modified_count} admins with dailyCallLimit=2')
    
    # List admins
    cursor = db.users.find({'role': 'admin'})
    admins = await cursor.to_list(100)
    print(f'\nFound {len(admins)} admin(s):')
    for admin in admins:
        print(f'  - {admin.get("username")}: dailyCallLimit={admin.get("dailyCallLimit", "N/A")}')
    
    await close_db()


if __name__ == "__main__":
    asyncio.run(setup_admins())
