from pymongo import MongoClient
from datetime import datetime, timedelta

# Kết nối MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client.CNM

# Xóa sạch dữ liệu cũ
db.showtime_seats.delete_many({})
db.showtimes.delete_many({})

# Xác định ngày hôm nay, ngày mai và ngày kia
today = datetime.now()
tomorrow = today + timedelta(days=1)
day_after = today + timedelta(days=2)

# Format ngày kiểu "dd/MM"
def format_date(date):
    return date.strftime("%d/%m")

# Danh sách phim mẫu
movies = [
    {
        "title": "Godzilla x Kong: Đế Chế Mới",
        "image": "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/lTpnAtn1hWXDLxEmkD28l6UyPlF.jpg",
        "duration": "115 phút",
        "rating": "C13",
        "genre": "Hành động, Phiêu lưu"
    },
    {
        "title": "Dune: Hành Tinh Cát - Phần 2",
        "image": "https://th.bing.com/th?id=OSK.7ZTAP31F9iuIrYtqx6mEzU10efR-m0iH-9B_CUGr3k8&w=46&h=46&c=11&rs=1&qlt=80&o=6&dpr=2&pid=SANGAM",
        "duration": "166 phút",
        "rating": "C16",
        "genre": "Khoa học viễn tưởng"
    }
]

# Các rạp
theaters = ["Rạp 1 - IMAX", "Rạp 2 - 4DX"]

# Giờ chiếu mẫu
showtimes = ["09:30", "13:00", "16:30", "19:00"]

# Tạo dữ liệu cho collection showtime_seats
all_showtime_seats = []

def generate_showtime_seats(date):
    for movie in movies:
        for theater in theaters:
            for time in showtimes:
                all_showtime_seats.append({
                    "movie_title": movie["title"],
                    "theater_name": theater,
                    "date": date,
                    "time": time,
                    "available_seats": [],
                    "booked_seats": []
                })

# Tạo dữ liệu cho collection showtimes (phục vụ API)
showtimes_doc = {
    "today": {
        "date": format_date(today),
        "movies": []
    },
    "tomorrow": {
        "date": format_date(tomorrow),
        "movies": []
    },
    "day_after_tomorrow": {
        "date": format_date(day_after),
        "movies": []
    }
}

def generate_showtimes_data(date_key, date):
    for movie in movies:
        theaters_data = []
        for theater in theaters:
            showtime_list = []
            for time in showtimes:
                showtime_list.append({
                    "time": time,
                    "available_seats": 150
                })
            theaters_data.append({
                "name": theater,
                "showtimes": showtime_list
            })

        showtimes_doc[date_key]["movies"].append({
            "title": movie["title"],
            "image": movie["image"],
            "duration": movie["duration"],
            "rating": movie["rating"],
            "genre": movie["genre"],
            "theaters": theaters_data
        })

# Tạo dữ liệu cho cả 3 ngày
generate_showtime_seats(format_date(today))
generate_showtime_seats(format_date(tomorrow))
generate_showtime_seats(format_date(day_after))

generate_showtimes_data("today", today)
generate_showtimes_data("tomorrow", tomorrow)
generate_showtimes_data("day_after_tomorrow", day_after)

# Đẩy dữ liệu mới vào MongoDB
db.showtime_seats.insert_many(all_showtime_seats)
db.showtimes.insert_one(showtimes_doc)

print("✅ Đã xóa và thêm mới dữ liệu showtimes & showtime_seats thành công.")
