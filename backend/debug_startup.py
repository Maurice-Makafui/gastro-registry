import asyncio, traceback

async def run():
    try:
        from app.services.registry_automation import register_registry_listeners
        register_registry_listeners()
        from app.database import create_tables, run_migrations
        create_tables()
        print("create_tables OK", flush=True)
        run_migrations()
        print("run_migrations OK", flush=True)
        from app.seed import seed_database
        seed_database()
        print("seed OK", flush=True)
        from app.tasks.cld_scan_tasks import execute_cld_risk_scan
        execute_cld_risk_scan()
        print("ALL STARTUP OK", flush=True)
    except Exception:
        traceback.print_exc()

asyncio.run(run())
