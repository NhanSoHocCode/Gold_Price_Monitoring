from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

def fix_all_records():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("Error: MONGO_URI not found in .env file.")
        return
    
    try: 
        # Connect to MongoDB
        client = MongoClient(mongo_uri)
        db = client.get_database("gold_db")
        collection = db.get_collection("gold_prices")

        # Find all documents
        cursor = collection.find({})
        total_checked = 0
        total_updated = 0

        print("Start data cleanup for records...")

        for doc in cursor:
            total_checked += 1
            doc_id = doc.get("_id")
            entries_data = doc.get("entries", [])
            modified = False

            cleaned_entries = []
            for entry in entries_data:
                # Convert to string to slice first 6 characters
                buy_str = str(entry.get('buy', 0))
                sell_str = str(entry.get('sell', 0))

                print(f"Example: buy={buy_str} ({type(buy_str)}), sell={sell_str} ({type(sell_str)})")
                
                # Keep only the first 6 digits if longer, otherwise keep as is 
                new_buy = buy_str[:6] if len(buy_str) > 6 else int(buy_str)
                new_sell = sell_str[:6] if len(sell_str) > 6 else int(sell_str)

                print(f"Updated: buy={new_buy} ({type(new_buy)}), sell={new_sell} ({type(new_sell)})")

                # Check if change is actually needed
                if new_buy != entry.get('buy') or new_sell != entry.get('sell'):
                    modified = True
                
                cleaned_entries.append({
                    'brand': entry.get('brand'),
                    'buy': new_buy,
                    'sell': new_sell
                })
            
            # Update document only if values were changed
            if modified:
                collection.update_one({'_id': doc_id}, {'$set': {'entries': cleaned_entries}})
                total_updated += 1
                print(f"Updated document {doc_id} with {len(cleaned_entries)} cleaned entries")
        client.close()
        print("Data cleanup completed.")
        print(f"Total records processed: {total_checked}")
        print(f"Total records updated: {total_updated}")
        
    except Exception as e:
        print(f"An error occurred: {e}")
    
    