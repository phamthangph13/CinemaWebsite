from pymongo import MongoClient
import json
from datetime import datetime

# Kết nối tới MongoDB
client = MongoClient('mongodb://localhost:27017')
db = client['CNM']

# Lấy danh sách tất cả collection
collections = db.list_collection_names()

# Hàm convert dữ liệu MongoDB sang JSON serializable
def serialize_doc(doc):
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])  # Convert ObjectId

    # Xử lý tất cả field trong doc
    for key, value in doc.items():
        if isinstance(value, bytes):
            doc[key] = value.decode('utf-8')  # Convert bytes to string (bcrypt password chẳng hạn)

        elif isinstance(value, datetime):
            doc[key] = value.isoformat()  # Convert datetime sang ISO 8601 string

    return doc

# Lặp qua tất cả collection
all_data = {}
for collection_name in collections:
    collection = db[collection_name]
    data = list(collection.find())
    serialized_data = [serialize_doc(doc) for doc in data]
    all_data[collection_name] = serialized_data
    print(f"✅ Đã export {len(serialized_data)} bản ghi từ collection '{collection_name}'")

# Ghi ra file JSON
with open('cnm_data.json', 'w', encoding='utf-8') as f:
    json.dump(all_data, f, indent=4, ensure_ascii=False)

print("✅ Extract toàn bộ data thành công, lưu tại 'cnm_data.json'")
