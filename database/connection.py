from pymongo import MongoClient
from pprint import pprint
import json
from datetime import datetime

def connect_to_mongodb():
    try:
        client = MongoClient('mongodb://localhost:27017/')
        db = client['CNM']
        return db
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None

def get_collection_info():
    db = connect_to_mongodb()
    if db is not None:
        try:
            database_info = {}
            collections = db.list_collection_names()
            
            print("Collecting database information...")
            for collection in collections:
                print(f"Processing collection: {collection}")
                collection_data = []
                cursor = db[collection].find({})
                
                for doc in cursor:
                    # Convert ObjectId to string for JSON serialization
                    doc['_id'] = str(doc['_id'])
                    collection_data.append(doc)
                
                database_info[collection] = {
                    'document_count': len(collection_data),
                    'documents': collection_data
                }
            
            # Create filename with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'database_export_{timestamp}.json'
            
            # Save to JSON file
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(database_info, f, ensure_ascii=False, indent=2)
            
            print(f"\nDatabase information saved to {filename}")
                
        except Exception as e:
            print(f"Error getting collection info: {e}")

if __name__ == "__main__":
    get_collection_info()