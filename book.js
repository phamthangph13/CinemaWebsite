document.addEventListener('DOMContentLoaded', function() {
    // Existing modal code
    const modal = document.getElementById('seatModal');
    const closeBtn = document.querySelector('.close-modal');
    const seatingPlan = document.querySelector('.seating-plan');
    const selectedSeatsText = document.getElementById('selectedSeatsText');
    const totalAmount = document.getElementById('totalAmount');
    const bookSeatsBtn = document.getElementById('bookSeatsBtn');

    // Giá vé
    const PRICES = {
        regular: 90000,
        vip: 120000,
        couple: 200000
    };

    // ---- Fetch showtime data from API ----
    async function fetchShowtimes() {
        try {
            const response = await fetch('http://localhost:8000/api/showtimes');
            if (!response.ok) {
                throw new Error('Failed to fetch showtimes');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching showtimes:', error);
            return null;
        }
    }

    // Render movie schedules based on selected date
    async function renderMovieSchedules(dateKey) {
        const movieSchedulesContainer = document.querySelector('.movie-schedules');
        movieSchedulesContainer.innerHTML = '<p class="loading">Đang tải lịch chiếu...</p>';
        
        try {
            const showtimeData = await fetchShowtimes();
            if (!showtimeData || !showtimeData[dateKey]) {
                movieSchedulesContainer.innerHTML = '<p class="no-data">Không có lịch chiếu cho ngày này</p>';
                return;
            }
            
            const movies = showtimeData[dateKey].movies;
            if (!movies || movies.length === 0) {
                movieSchedulesContainer.innerHTML = '<p class="no-data">Không có phim chiếu trong ngày này</p>';
                return;
            }
            
            // Clear the container
            movieSchedulesContainer.innerHTML = '';
            
            // Render each movie
            movies.forEach(movie => {
                const movieCard = document.createElement('div');
                movieCard.className = 'movie-schedule-card';
                
                // Create movie info section
                const movieInfoHTML = `
                    <div class="movie-info">
                        <img src="${movie.image}" alt="${movie.title}">
                        <div class="movie-details">
                            <h3>${movie.title}</h3>
                            <p class="movie-meta">
                                <span class="duration"><i class="far fa-clock"></i> ${movie.duration}</span>
                                <span class="rating">${movie.rating}</span>
                            </p>
                            <p class="genre">Thể loại: ${movie.genre}</p>
                        </div>
                    </div>
                `;
                
                // Create showtime list section
                let showtimeListHTML = '<div class="showtime-list">';
                
                movie.theaters.forEach(theater => {
                    showtimeListHTML += `
                        <div class="cinema-group">
                            <h4>${theater.name}</h4>
                            <div class="showtimes">
                    `;
                    
                    theater.showtimes.forEach(showtime => {
                        showtimeListHTML += `
                            <a href="#" class="showtime-btn" data-movie="${movie.title}" data-time="${showtime.time}" data-theater="${theater.name}">
                                <span class="time">${showtime.time}</span>
                                <span class="seats">${showtime.available_seats} ghế trống</span>
                            </a>
                        `;
                    });
                    
                    showtimeListHTML += '</div></div>';
                });
                
                showtimeListHTML += '</div>';
                
                // Combine and add to the container
                movieCard.innerHTML = movieInfoHTML + showtimeListHTML;
                movieSchedulesContainer.appendChild(movieCard);
            });
            
            // Add event listeners to the newly created showtime buttons
            attachShowtimeEvents();
            
        } catch (error) {
            console.error('Error rendering movie schedules:', error);
            movieSchedulesContainer.innerHTML = '<p class="error">Đã xảy ra lỗi khi tải lịch chiếu</p>';
        }
    }
    
    // Attach event listeners to showtime buttons
    function attachShowtimeEvents() {
        const showtimeBtns = document.querySelectorAll('.showtime-btn');
        showtimeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // You can use data attributes to store movie, theater and time info
                const movieTitle = btn.dataset.movie;
                const theaterName = btn.dataset.theater;
                const showtime = btn.dataset.time;
                
                // You can display this info in the modal if needed
                const modalHeader = document.querySelector('.modal-header h2');
                modalHeader.textContent = `Chọn Ghế: ${movieTitle} - ${theaterName} - ${showtime}`;
                
                modal.style.display = 'block';
                createSeatingPlan();
            });
        });
    }

    // Map date selectors to API date keys
    const dateKeyMap = {
        0: 'today',
        1: 'tomorrow',
        2: 'wednesday' // For the third day
    };

    // Xử lý sự kiện click vào date selector
    const dateSelectors = document.querySelectorAll('.date-selector');
    dateSelectors.forEach((selector, index) => {
        selector.addEventListener('click', () => {
            // Remove active class from all selectors
            dateSelectors.forEach(s => s.classList.remove('active'));
            // Add active class to clicked selector
            selector.classList.add('active');
            
            // Render movie schedules for the selected date
            renderMovieSchedules(dateKeyMap[index]);
        });
    });

    // Existing seating plan functions
    function createSeatingPlan() {
        const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        seatingPlan.innerHTML = '';

        rows.forEach(row => {
            const seatRow = document.createElement('div');
            seatRow.className = 'seat-row';
            
            // Thêm nhãn hàng
            const rowLabel = document.createElement('div');
            rowLabel.className = 'row-label';
            rowLabel.textContent = row;
            seatRow.appendChild(rowLabel);

            // Số ghế mỗi hàng
            const seatsPerRow = 12;
            
            for (let i = 1; i <= seatsPerRow; i++) {
                const seat = document.createElement('div');
                const seatNumber = `${row}${i}`;
                
                // Xác định loại ghế
                if (row === 'A' || row === 'B') {
                    seat.className = 'seat vip';
                } else if (row === 'H' && (i === 1 || i === 2 || i === 11 || i === 12)) {
                    seat.className = 'seat couple';
                    seat.style.width = '70px';
                    i++; // Skip next seat for couple seats
                } else {
                    seat.className = 'seat available';
                }

                // Random một số ghế đã được đặt
                if (Math.random() < 0.3) {
                    seat.classList.add('occupied');
                }

                seat.dataset.seatNumber = seatNumber;
                seat.textContent = seatNumber;
                seatRow.appendChild(seat);
            }
            seatingPlan.appendChild(seatRow);
        });
    }

    // Cập nhật thông tin ghế đã chọn và tổng tiền
    function updateBookingSummary() {
        const selectedSeats = document.querySelectorAll('.seat.selected');
        const seatNumbers = Array.from(selectedSeats).map(seat => seat.dataset.seatNumber);
        
        let total = 0;
        selectedSeats.forEach(seat => {
            if (seat.classList.contains('vip')) {
                total += PRICES.vip;
            } else if (seat.classList.contains('couple')) {
                total += PRICES.couple;
            } else {
                total += PRICES.regular;
            }
        });

        selectedSeatsText.textContent = seatNumbers.length ? seatNumbers.join(', ') : 'Chưa chọn ghế';
        totalAmount.textContent = `${total.toLocaleString()}đ`;
    }

    // Modal event listeners
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    seatingPlan.addEventListener('click', (e) => {
        if (e.target.classList.contains('seat') && !e.target.classList.contains('occupied')) {
            e.target.classList.toggle('selected');
            updateBookingSummary();
        }
    });

    bookSeatsBtn.addEventListener('click', () => {
        const selectedSeats = document.querySelectorAll('.seat.selected');
        if (selectedSeats.length === 0) {
            alert('Vui lòng chọn ghế trước khi đặt vé');
            return;
        }
        alert('Đặt vé thành công!');
        modal.style.display = 'none';
    });

    // Thêm hàm để format date
    function formatDate(date) {
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    function getDayName(date) {
        const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
        return days[date.getDay()];
    }

    // Cập nhật date selectors
    function updateDateSelectors() {
        const dateSelectors = document.querySelectorAll('.date-selector');
        const today = new Date();

        // Cập nhật cho ngày hôm nay
        dateSelectors[0].querySelector('.day').textContent = 'Hôm nay';
        dateSelectors[0].querySelector('.date').textContent = formatDate(today);
        dateSelectors[0].dataset.date = today.toISOString();

        // Cập nhật cho ngày mai
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateSelectors[1].querySelector('.day').textContent = 'Ngày mai';
        dateSelectors[1].querySelector('.date').textContent = formatDate(tomorrow);
        dateSelectors[1].dataset.date = tomorrow.toISOString();

        // Cập nhật cho ngày kia
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);
        dateSelectors[2].querySelector('.day').textContent = getDayName(dayAfter);
        dateSelectors[2].querySelector('.date').textContent = formatDate(dayAfter);
        dateSelectors[2].dataset.date = dayAfter.toISOString();
    }

    // Initialize the page
    updateDateSelectors();
    
    // Load today's movie schedules by default
    renderMovieSchedules('today');
});