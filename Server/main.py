import os
import sys
from pathlib import Path

# Thêm thư mục gốc vào PYTHONPATH
current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent
sys.path.append(str(root_dir))

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import jwt as PyJWT
import bcrypt
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import JSONResponse, HTMLResponse
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],  # Your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client.CNM
users_collection = db.Users


# Cấu hình JWT
SECRET_KEY = "FEAFIEA285482@kfaefkkkMCMEA2582SACkfaefkkkMCMEA2582SAC"  # Thay đổi thành một key phức tạp hơn
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Cấu hình email
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USER = "dounecompany@gmail.com"  # Thay email của bạn
EMAIL_PASSWORD = "zasa vbpy arko snov"  # Mật khẩu ứng dụng từ Google

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    fullname: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str

# Add these new models after the existing models
class Movie(BaseModel):
    id: str
    title: str
    description: str
    duration: int
    genre: str
    release_date: str
    poster_url: str
    trailer_url: str

class Showtime(BaseModel):
    id: str
    movie_id: str
    theater_id: str
    start_time: datetime
    end_time: datetime
    available_seats: List[str]
# Booking model
class BookingRequest(BaseModel):
    movie_title: str
    theater_name: str
    date: str
    time: str
    seats: List[str]
    user_email: str

def normalize_name(name):
    # Bỏ hậu tố kiểu " - Rạp 1" hoặc các ký tự phụ
    return name.replace("- Rạp 1", "").strip()

@app.post("/api/book-seats")
async def book_seats(booking: BookingRequest):
    try:
        print(f"📥 Booking request received: {booking.dict()}")

        # Normalize tên phim và rạp để tăng khả năng khớp
        normalized_movie_title = normalize_name(booking.movie_title)
        normalized_theater_name = normalize_name(booking.theater_name)

        # Tìm theo logic mềm (cho phép khớp gần đúng)
        showtime = db.showtime_seats.find_one({
            "movie_title": {"$regex": normalized_movie_title, "$options": "i"},
            "theater_name": {"$regex": normalized_theater_name, "$options": "i"},
            "date": booking.date,
            "time": booking.time
        })

        if not showtime:
            print(f"❌ Không tìm thấy suất chiếu. Log toàn bộ suất chiếu hiện tại cho phim '{booking.movie_title}'")
            all_showtimes = list(db.showtime_seats.find({
                "movie_title": {"$regex": normalized_movie_title, "$options": "i"}
            }))
            for st in all_showtimes:
                print(f"🎥 Movie: {st['movie_title']}, Theater: {st['theater_name']}, Date: {st['date']}, Time: {st['time']}")

            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy suất chiếu '{booking.movie_title}' tại '{booking.theater_name}' ngày {booking.date} lúc {booking.time}."
            )

        # Check ghế đã được đặt chưa
        existing_booked_seats = showtime.get('booked_seats', [])
        existing_booked_seat_ids = [seat['seat_id'] for seat in existing_booked_seats]
        overlapping_seats = set(booking.seats) & set(existing_booked_seat_ids)

        if overlapping_seats:
            raise HTTPException(
                status_code=400,
                detail=f"Các ghế {', '.join(overlapping_seats)} đã được đặt trước."
            )

        # Cập nhật ghế đã đặt
        new_booked_seats = [{'seat_id': seat} for seat in booking.seats]
        db.showtime_seats.update_one(
            {"_id": showtime['_id']},
            {"$push": {"booked_seats": {"$each": new_booked_seats}}}
        )

        # Tạo bản ghi booking
        booking_record = {
            "user_email": booking.user_email,
            "movie_title": booking.movie_title,
            "theater_name": booking.theater_name,
            "date": booking.date,
            "time": booking.time,
            "seats": booking.seats,
            "booking_time": datetime.now()
        }
        result = db.bookings.insert_one(booking_record)

        return {
            "message": "Đặt vé thành công!",
            "booking_id": str(result.inserted_id),
            "seats": booking.seats
        }

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"🔥 Error processing booking: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi hệ thống khi xử lý đặt vé: {str(e)}"
        )

    

 
# Add these new endpoints before the custom_openapi function
@app.get("/api/movies/now-showing")
async def get_now_showing_movies():
    movies = db.movies.find({
        "status": "Now Showing"
    })
    movie_list = []
    for movie in movies:
        movie["_id"] = str(movie["_id"])  # Convert ObjectId to string
        movie_list.append(movie)
    return movie_list 
    
@app.get("/api/showtime-seats")
async def get_showtime_seats(movie: str, theater: str, date: str, time: str):
    try:
        # More flexible query to handle potential variations
        query = {
            "movie_title": movie,
            "theater_name": theater,
            "date": date,
            "time": time
        }
        
        print(f"Searching for showtime with query: {query}")
        showtime_seats = db.showtime_seats.find_one(query)

        if not showtime_seats:
            # If no exact match, try a more lenient search
            similar_showtime = db.showtime_seats.find_one({
                "movie_title": {"$regex": movie, "$options": "i"},
                "theater_name": {"$regex": theater, "$options": "i"},
                "date": date,
                "time": time
            })
            
            if similar_showtime:
                showtime_seats = similar_showtime
            else:
                # If still no match, return a default layout
                print(f"No showtime found for query: {query}")
                return {
                    "movie_title": movie,
                    "theater_name": theater,
                    "date": date,
                    "time": time,
                    "occupiedSeats": []  # Empty list means all seats are available
                }

        # Convert ObjectId to string for JSON serialization
        showtime_seats["_id"] = str(showtime_seats["_id"])
        
        # Get list of occupied seats
        booked_seats = showtime_seats.get('booked_seats', [])
        occupied_seats = [seat['seat_id'] for seat in booked_seats] if booked_seats else []
        
        # Format the response
        return {
            "movie_title": showtime_seats["movie_title"],
            "theater_name": showtime_seats["theater_name"],
            "date": showtime_seats["date"],
            "time": showtime_seats["time"],
            "occupiedSeats": occupied_seats
        }
    except Exception as e:
        print(f"Error in get_showtime_seats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while fetching seat data: {str(e)}"
        )
        
@app.get("/api/movies/coming-soon") 
async def get_coming_soon_movies():
    movies = db.movies.find({
        "status": "Coming Soon"
    })
    movie_list = []
    for movie in movies:
        movie["_id"] = str(movie["_id"])  # Convert ObjectId to string
        movie_list.append(movie)
    return movie_list
@app.get("/api/showtimes") 
async def get_all_showtimes():
    try:
        # Directly return the first document in showtimes collection
        showtime_data = db.showtimes.find_one()
        if not showtime_data:
            raise HTTPException(status_code=404, detail="No showtime data found")
        
        # Ensure the ObjectId is converted to string
        showtime_data["_id"] = str(showtime_data["_id"])
        
        return showtime_data
    except Exception as e:
        print(f"Error fetching showtimes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch showtimes data: {str(e)}"
        )

@app.get("/api/showtimes/by-date/{date}")
async def get_showtimes_by_date(date: str):
    showtime_data = db.showtimes.find_one()
    if not showtime_data:
        raise HTTPException(status_code=404, detail="No showtime data found")
    
    for day in ["today", "tomorrow", "wednesday"]:
        day_data = showtime_data.get(day, {})
        if day_data.get("date") == date:
            return day_data
    
    raise HTTPException(status_code=404, detail=f"No showtimes found for date {date}")
@app.get("/api/showtimes/by-movie/{movie_title}")
async def get_movie_showtimes(movie_title: str):
    showtime_data = db.showtimes.find_one()
    if not showtime_data:
        raise HTTPException(status_code=404, detail="No showtime data found")
    
    result = []
    for day in ["today", "tomorrow", "wednesday"]:
        day_data = showtime_data.get(day, {})
        for movie in day_data.get("movies", []):
            if movie["title"] == movie_title: 
                movie_info = {
                    "date": day_data["date"],
                    "movie": {
                        "title": movie["title"],
                        "image": movie["image"],
                        "duration": movie["duration"],
                        "rating": movie["rating"],
                        "genre": movie["genre"]
                    },
                    "theaters": movie["theaters"]
                }
                result.append(movie_info)
    
    if not result:
        raise HTTPException(status_code=404, detail=f"No showtimes found for movie {movie_title}")
        
    return result
@app.get("/api/seats/{showtime_id}")
async def get_showtime_seats(showtime_id: str):
    seats = db.seats.find({
        "showtime_id": showtime_id
    })
    seat_list = []
    for seat in seats:
        seat["_id"] = str(seat["_id"])  # Convert ObjectId to string
        seat_list.append(seat)
    return seat_list
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
# Hàm tiện ích
def create_jwt_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = PyJWT.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
def send_email(to_email: str, subject: str, body: str):
    msg = MIMEMultipart()
    msg['From'] = EMAIL_USER
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))
    with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(msg)
# API endpoints
@app.post("/register")
async def register(user: UserRegister):
    # Kiểm tra email đã tồn tại
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email đã được đăng ký")
    
    # Mã hóa mật khẩu
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    
    # Tạo user mới
    new_user = {
        "email": user.email,
        "fullname": user.fullname,
        "password": hashed_password,
        "verified": False,
        "created_at": datetime.utcnow()
    }
    
    # Lưu vào database
    users_collection.insert_one(new_user)
    
    # Tạo token xác thực email
    verification_token = create_jwt_token({"email": user.email, "type": "verification"})
    
    # Sửa lại verification_link để trỏ đến API backend
    verification_link = f"http://localhost:8000/verify-email?token={verification_token}"
    
    # Gửi email xác thực
    email_body = f"""
    <h2>Xác thực tài khoản của bạn</h2>
    <p>Vui lòng click vào link sau để xác thực tài khoản:</p>
    <a href="{verification_link}">Xác thực tài khoản</a>
    """
    send_email(user.email, "Xác thực tài khoản", email_body)
    
    return {"message": "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."}
@app.post("/login")
async def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=400, detail="Email hoặc mật khẩu không chính xác")
    
    if not bcrypt.checkpw(user.password.encode('utf-8'), db_user['password']):
        raise HTTPException(status_code=400, detail="Email hoặc mật khẩu không chính xác")
    
    if not db_user.get('verified', False):
        raise HTTPException(status_code=400, detail="Tài khoản chưa được xác thực")
    
    access_token = create_jwt_token({"email": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
@app.get("/verify-email")  # Đổi từ POST sang GET
async def verify_email(token: str):
    try:
        payload = PyJWT.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("email")
        if payload.get("type") != "verification":
            raise HTTPException(status_code=400, detail="Token không hợp lệ")
        
        result = users_collection.update_one(
            {"email": email},
            {"$set": {"verified": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Không thể xác thực tài khoản")
        
        # Trả về HTML response
        html_content = """
        <html>
            <head>
                <title>Xác thực tài khoản thành công</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background-color: #f0f2f5;
                    }
                    .container {
                        text-align: center;
                        padding: 20px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    h1 { color: #1a73e8; }
                    p { color: #5f6368; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Xác thực tài khoản thành công!</h1>
                    <p>Bạn có thể đóng tab này và đăng nhập vào ứng dụng.</p>
                </div>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=200)
        
    except PyJWT.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token đã hết hạn")
    except PyJWT.JWTError:
        raise HTTPException(status_code=400, detail="Token không hợp lệ")
@app.post("/forgot-password")
async def forgot_password(forgot_pwd: ForgotPassword):
    user = users_collection.find_one({"email": forgot_pwd.email})
    if not user:
        raise HTTPException(status_code=400, detail="Email không tồn tại")
    
    # Tạo token reset password
    reset_token = create_jwt_token({"email": forgot_pwd.email, "type": "reset_password"})
    
    # Sửa lại reset_link để trỏ đến API backend
    reset_link = f"http://localhost:8000/reset-password?token={reset_token}"
    
    # Gửi email
    email_body = f"""
    <h2>Đặt lại mật khẩu</h2>
    <p>Click vào link sau để đặt lại mật khẩu của bạn:</p>
    <a href="{reset_link}">Đặt lại mật khẩu</a>
    """
    send_email(forgot_pwd.email, "Đặt lại mật khẩu", email_body)
    
    return {"message": "Email đặt lại mật khẩu đã được gửi"}
@app.post("/reset-password")
async def reset_password(reset_pwd: ResetPassword):
    try:
        # Verify token
        payload = PyJWT.decode(reset_pwd.token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "reset_password":
            raise HTTPException(status_code=400, detail="Token không hợp lệ")
        
        email = payload.get("email")
        # Mã hóa mật khẩu mới
        hashed_password = bcrypt.hashpw(reset_pwd.new_password.encode('utf-8'), bcrypt.gensalt())
        
        # Cập nhật mật khẩu trong database
        result = users_collection.update_one(
            {"email": email},
            {"$set": {"password": hashed_password}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Không thể đặt lại mật khẩu")
        
        return {"message": "Đặt lại mật khẩu thành công"}
        
    except PyJWT.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token đã hết hạn")
    except PyJWT.JWTError:
        raise HTTPException(status_code=400, detail="Token không hợp lệ")
@app.get("/reset-password")
async def reset_password_page(token: str):
    try:
        # Verify token trước
        payload = PyJWT.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "reset_password":
            raise HTTPException(status_code=400, detail="Token không hợp lệ")
        
        # Trả về form HTML để đặt lại mật khẩu
        html_content = f"""
        <html>
            <head>
                <title>Đặt lại mật khẩu</title>
                <style>
                    body {{ 
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background-color: #f0f2f5;
                    }}
                    .container {{
                        text-align: center;
                        padding: 20px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        width: 100%;
                        max-width: 400px;
                    }}
                    h1 {{ color: #1a73e8; }}
                    .form-group {{
                        margin-bottom: 15px;
                    }}
                    input {{
                        width: 100%;
                        padding: 8px;
                        margin: 8px 0;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        box-sizing: border-box;
                    }}
                    button {{
                        background-color: #1a73e8;
                        color: white;
                        padding: 10px 20px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        width: 100%;
                    }}
                    button:hover {{
                        background-color: #1557b0;
                    }}
                    .error {{
                        color: red;
                        display: none;
                        margin-top: 10px;
                    }}
                </style>
                <script>
                    async function resetPassword(event) {{
                        event.preventDefault();
                        const password = document.getElementById('password').value;
                        const confirmPassword = document.getElementById('confirmPassword').value;
                        const errorDiv = document.getElementById('error');
                        
                        if (password !== confirmPassword) {{
                            errorDiv.style.display = 'block';
                            errorDiv.textContent = 'Mật khẩu không khớp';
                            return;
                        }}
                        
                        try {{
                            const response = await fetch('/reset-password', {{
                                method: 'POST',
                                headers: {{
                                    'Content-Type': 'application/json',
                                }},
                                body: JSON.stringify({{
                                    token: '{token}',
                                    new_password: password
                                }})
                            }});
                            
                            const data = await response.json();
                            
                            if (response.ok) {{
                                document.querySelector('.container').innerHTML = `
                                    <h1>Thành công!</h1>
                                    <p>Mật khẩu của bạn đã được đặt lại.</p>
                                    <p>Bạn có thể đóng tab này và đăng nhập với mật khẩu mới.</p>
                                `;
                            }} else {{
                                errorDiv.style.display = 'block';
                                errorDiv.textContent = data.detail || 'Có lỗi xảy ra';
                            }}
                        }} catch (error) {{
                            errorDiv.style.display = 'block';
                            errorDiv.textContent = 'Có lỗi xảy ra';
                        }}
                    }}
                </script>
            </head>
            <body>
                <div class="container">
                    <h1>Đặt lại mật khẩu</h1>
                    <form onsubmit="resetPassword(event)">
                        <div class="form-group">
                            <input type="password" id="password" placeholder="Mật khẩu mới" required>
                        </div>
                        <div class="form-group">
                            <input type="password" id="confirmPassword" placeholder="Xác nhận mật khẩu" required>
                        </div>
                        <button type="submit">Đặt lại mật khẩu</button>
                        <div id="error" class="error"></div>
                    </form>
                </div>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content)
        
    except PyJWT.ExpiredSignatureError:
        return HTMLResponse(content="""
            <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
                    <h1 style="color: red;">Token đã hết hạn</h1>
                    <p>Vui lòng yêu cầu đặt lại mật khẩu mới.</p>
                </body>
            </html>
        """)
    except PyJWT.JWTError:
        return HTMLResponse(content="""
            <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding-top: 50px;">
                    <h1 style="color: red;">Token không hợp lệ</h1>
                    <p>Vui lòng yêu cầu đặt lại mật khẩu mới.</p>
                </body>
            </html>
        """)
# Middleware để xác thực JWT token
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = PyJWT.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("email")
        if email is None:
            raise HTTPException(status_code=401, detail="Token không hợp lệ")
    except PyJWT.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token đã hết hạn")
    except PyJWT.JWTError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    
    user = users_collection.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="Người dùng không tồn tại")
    
    return user
# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    try:
        with open("swagger.json", "r", encoding="utf-8") as f:
            openapi_schema = json.load(f)
            app.openapi_schema = openapi_schema
            return app.openapi_schema
    except Exception as e:
        print(f"Error loading swagger.json: {e}")
        # Return a basic OpenAPI schema instead of JSONResponse
        return {
            "openapi": "3.0.0",
            "info": {
                "title": "Cinema Authentication API",
                "description": "API cho hệ thống xác thực người dùng của ứng dụng Cinema",
                "version": "1.0.0"
            },
            "paths": {}
        }
    return app.openapi_schema

app.openapi = custom_openapi

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="Cinema Authentication API",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
    )

@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_json():
    return app.openapi_schema
# Add these models after your existing models
