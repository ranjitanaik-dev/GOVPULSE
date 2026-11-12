import asyncio
import aiosqlite

async def main():
    print("Connecting...")
    async with aiosqlite.connect("data/test.db") as db:
        print("Connected!")
        await db.execute("CREATE TABLE IF NOT EXISTS t (id INT)")
        await db.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
