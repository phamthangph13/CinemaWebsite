document.addEventListener('DOMContentLoaded', function() {
    // Modal and UI element references
    const modal = document.getElementById('seatModal');
    const closeBtn = document.querySelector('.close-modal');
    const seatingPlan = document.querySelector('.seating-plan');
    const selectedSeatsText = document.getElementById('selectedSeatsText');
    const totalAmount = document.getElementById('totalAmount');
    const bookSeatsBtn = document.getElementById('bookSeatsBtn');

    // Ticket Prices
    const PRICES = {
        regular: 90000,
        vip: 120000,
        couple: 200000
    };

    // Memoized Showtime Fetching
    const memoizedFetchShowtimes = (() => {
        let cachedShowtimes = null;
        let lastFetchTime = 0;
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

        return async () => {
            const now = Date.now();
            if (!cachedShowtimes || (now - lastFetchTime > CACHE_DURATION)) {
                try {
                    const response = await fetch('http://localhost:8000/api/showtimes', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include'
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    cachedShowtimes = await response.json();
                    lastFetchTime = now;
                } catch (error) {
                    console.error('Network or parsing error:', error);
                    return null;
                }
            }
            return cachedShowtimes;
        };
    })();

    // Input Validation for Showtime Parameters
    function validateShowtimeParams(movieTitle, theaterName, showDate, showTime) {
        if (!movieTitle || !theaterName || !showDate || !showTime) {
            console.error('Invalid showtime parameters');
            return false;
        }
        return true;
    }

    // Render Movie Schedules
    async function renderMovieSchedules(dateKey) {
        const movieSchedulesContainer = document.querySelector('.movie-schedules');
        movieSchedulesContainer.innerHTML = '<p class="loading">Đang tải lịch chiếu...</p>';
        
        try {
            const showtimeData = await memoizedFetchShowtimes();
            if (!showtimeData) {
                throw new Error('Failed to fetch showtime data');
            }
            const dateData = showtimeData[dateKey];
            if (!dateData || !dateData.movies || dateData.movies.length === 0) {
                movieSchedulesContainer.innerHTML = '<p class="no-data">Không có lịch chiếu cho ngày này</p>';
                return;
            }
            
            // Clear the container
            movieSchedulesContainer.innerHTML = '';
            
            // Get the selected date from the active date selector
            const selectedDate = document.querySelector('.date-selector.active').dataset.date;
            
            // Render each movie
            dateData.movies.forEach(movie => {
                const movieCard = document.createElement('div');
                movieCard.className = 'movie-schedule-card';
                movieCard.dataset.date = selectedDate; // Use the selected date
                
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

    // Create Seating Plan
    async function createSeatingPlan(movieTitle, theaterName, showDate, showTime) {
        if (!validateShowtimeParams(movieTitle, theaterName, showDate, showTime)) {
            seatingPlan.innerHTML = '<p class="error">Thông tin xuất chiếu không hợp lệ</p>';
            return;
        }

        seatingPlan.innerHTML = '<p class="loading">Đang tải sơ đồ ghế...</p>';
        try {
            const response = await fetch(`http://localhost:8000/api/showtime-seats?movie=${encodeURIComponent(movieTitle)}&theater=${encodeURIComponent(theaterName)}&date=${showDate}&time=${showTime}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });
            const seatData = await response.json();
            seatingPlan.innerHTML = '';
            const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            rows.forEach(row => {
                const seatRow = document.createElement('div');
                seatRow.className = 'seat-row';
                
                // Row label
                const rowLabel = document.createElement('div');
                rowLabel.className = 'row-label';
                rowLabel.textContent = row;
                seatRow.appendChild(rowLabel);
                
                // Seats per row
                const seatsPerRow = 12;
                
                for (let i = 1; i <= seatsPerRow; i++) {
                    const seat = document.createElement('div');
                    const seatNumber = `${row}${i}`;
                    
                    // Seat type determination
                    if (row === 'A' || row === 'B') {
                        seat.className = 'seat vip';
                    } else if (row === 'H' && (i === 1 || i === 2 || i === 11 || i === 12)) {
                        seat.className = 'seat couple';
                        seat.style.width = '70px';
                        i++; // Skip next seat for couple seats
                    } else {
                        seat.className = 'seat available';
                    }
                    
                    // Check if seat is occupied from API data
                    const occupiedSeats = seatData.occupiedSeats || [];
                    if (occupiedSeats.includes(seatNumber)) {
                        seat.classList.add('occupied');
                        seat.classList.remove('available');
                        seat.style.pointerEvents = 'none'; // Make occupied seats unclickable
                    }
                    seat.dataset.seatNumber = seatNumber;
                    seat.textContent = seatNumber;
                    seatRow.appendChild(seat);
                }
                seatingPlan.appendChild(seatRow);
            });
        } catch (error) {
            console.error('Error loading seating plan:', error);
            seatingPlan.innerHTML = '<p class="error">Không thể tải sơ đồ ghế. Vui lòng thử lại sau.</p>';
        }
    }

    // Attach Showtime Events
    function attachShowtimeEvents() {
        const showtimeBtns = document.querySelectorAll('.showtime-btn');
        showtimeBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const movieTitle = btn.dataset.movie;
                const theaterName = btn.dataset.theater;
                const showtime = btn.dataset.time;
                const showDate = btn.closest('.movie-schedule-card').dataset.date;
                
                // Update modal header
                const modalHeader = document.querySelector('.modal-header h2');
                modalHeader.textContent = `Chọn Ghế: ${movieTitle} - ${theaterName} - ${showtime}`;
                
                modal.style.display = 'block';
                await createSeatingPlan(movieTitle, theaterName, showDate, showtime);
            });
        });
    }

    // Book Seats - Updated function to match backend model
    bookSeatsBtn.addEventListener('click', async () => {
        const selectedSeats = document.querySelectorAll('.seat.selected');
        if (selectedSeats.length === 0) {
            alert('Vui lòng chọn ghế trước khi đặt vé');
            return; 
        }
    
        const modalHeaderText = document.querySelector('.modal-header h2').textContent.replace('Chọn Ghế: ', '');
        const parts = modalHeaderText.split(' - ');

        const movieTitle = parts[0];
        const theaterName = parts.slice(1, parts.length - 1).join(' - ');  // Ghép tất cả trừ thời gian
        const time = parts[parts.length - 1];

    
        const showDate = document.querySelector('.date-selector.active').dataset.date;
        const seatNumbers = Array.from(selectedSeats).map(seat => seat.dataset.seatNumber);
    
        try {
            const response = await fetch('http://localhost:8000/api/book-seats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    movie_title: movieTitle,
                    theater_name: theaterName,
                    date: showDate,
                    time: time,
                    seats: seatNumbers,
                    user_email: 'user@example.com'
                })
            });
    
            const result = await response.json();
    
            if (!response.ok) {
                throw new Error(result.detail || 'Đặt vé không thành công');
            }
    
            alert('Đặt vé thành công!');
            modal.style.display = 'none';
    
            const activeDateSelector = document.querySelector('.date-selector.active');
            const dateIndex = Array.from(dateSelectors).indexOf(activeDateSelector);
            renderMovieSchedules(dateKeyMap[dateIndex]);
    
        } catch (error) {
            console.error('Error booking seats:', error);
            alert(error.message || 'Có lỗi xảy ra khi đặt vé. Vui lòng thử lại.');
        }
    });
    
    
 

    // Update Booking Summary
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

    // Modal Event Listeners
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    seatingPlan.addEventListener('click', function(e) {
        if (e.target.classList.contains('seat')) {
            if (e.target.classList.contains('occupied')) {
                return; // Prevent selection of occupied seats
            }
            e.target.classList.toggle('selected');
            updateBookingSummary();
        }
    });



    // Date Selector Handling
    const dateKeyMap = {
        0: 'today',
        1: 'tomorrow',
        2: 'wednesday'
    };

    const dateSelectors = document.querySelectorAll('.date-selector');
    dateSelectors.forEach((selector, index) => {
        selector.addEventListener('click', () => {
            dateSelectors.forEach(s => s.classList.remove('active'));
            selector.classList.add('active');
            
            renderMovieSchedules(dateKeyMap[index]);
        });
    });

    // Date Formatting Utilities
    function formatDate(date) {
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    function getDayName(date) {
        const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
        return days[date.getDay()];
    }

    // Update Date Selectors
    function updateDateSelectors() {
        const dateSelectors = document.querySelectorAll('.date-selector');
        const today = new Date();

        // Today
        dateSelectors[0].querySelector('.day').textContent = 'Hôm nay';
        dateSelectors[0].querySelector('.date').textContent = formatDate(today);
        dateSelectors[0].dataset.date = formatDate(today);  // Store as DD/MM

        // Tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateSelectors[1].querySelector('.day').textContent = 'Ngày mai';
        dateSelectors[1].querySelector('.date').textContent = formatDate(tomorrow);
        dateSelectors[1].dataset.date = formatDate(tomorrow);  // Store as DD/MM

        // Day after tomorrow
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);
        dateSelectors[2].querySelector('.day').textContent = getDayName(dayAfter);
        dateSelectors[2].querySelector('.date').textContent = formatDate(dayAfter);
        dateSelectors[2].dataset.date = formatDate(dayAfter);  // Store as DD/MM
    }

    // Initialize the page
    updateDateSelectors();
    renderMovieSchedules('today');
});
