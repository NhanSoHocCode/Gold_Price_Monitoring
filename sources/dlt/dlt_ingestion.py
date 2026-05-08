from dotenv import load_dotenv
import dlt
from dlt.destinations import postgres
from sources.mongodb import mongodb
import sys
import os

# ---------------------------------------------------------------------------
# Path setup — prefer making this a proper package over sys.path hacks
# ---------------------------------------------------------------------------
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

load_dotenv()

def _build_destination() -> postgres | None:
    """Resolve Supabase Postgres destination from environment variables."""
    db_host = os.getenv("SUPABASE_DB_HOST")
    db_user = os.getenv("SUPABASE_DB_USER")
    db_pass = os.getenv("SUPABASE_DB_PASSWORD")
    db_port = os.getenv("SUPABASE_DB_PORT")
    db_name = os.getenv("SUPABASE_DB_NAME")
    supabase_url = os.getenv("SUPABASE_DB_URL")

    if all([db_host, db_user, db_pass, db_port, db_name]):
        print("[INFO] Using individual environment variables for destination.")
        return postgres(
            credentials={
                "drivername": "postgresql",
                "host": db_host,
                "port": int(db_port),
                "username": db_user,
                "password": db_pass,
                "database": db_name,
            }
        )

    if supabase_url:
        print("[INFO] Using SUPABASE_DB_URL for destination.")
        return postgres(credentials=supabase_url)

    print("[ERROR] Destination not configured: set either SUPABASE_DB_URL or the individual SUPABASE_DB_* variables.")
    return None


def load_mongo_to_supabase() -> None:
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("[ERROR] MONGO_URI is not set.")
        return

    destination = _build_destination()
    if destination is None:
        return

    pipeline = dlt.pipeline(
        pipeline_name="gold_price_pipeline",
        dataset_name="gold_raw",
        destination=destination,
    )

    source = mongodb(
        connection_url=mongo_uri,
        database="gold_db",
        collection_names=["gold_prices"],
    )

    source.gold_prices.apply_hints(
        primary_key="_id",
        write_disposition="merge",
    )

    print(f"[INFO] Starting pipeline run: {pipeline.pipeline_name}")
    try:
        info = pipeline.run(source)
        print(f"[INFO] Pipeline completed: {info}")
    except Exception as e:
        print(f"[ERROR] Pipeline run failed: {e}")
        raise


if __name__ == "__main__":
    load_mongo_to_supabase()