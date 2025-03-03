const API_URL = 'http://localhost:8000';
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Swiper
    const swiper = new Swiper('.swiper', {
        loop: true,
        pagination: {
            el: '.swiper-pagination',
            clickable: true
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev'
        },
        autoplay: {
            delay: 5000,
            disableOnInteraction: false
        }
    });

    // Function to fetch movie data
    async function fetchMovies() {
        try {
            // Fetch currently showing movies
            const nowShowingResponse = await fetch(`${API_URL}/api/movies/now-showing`);
            const nowShowingData = await nowShowingResponse.json();

            // Fetch upcoming movies
            const upcomingResponse = await fetch(`${API_URL}/api/movies/coming-soon`);
            const upcomingData = await upcomingResponse.json();

            // Function to get proper image URL
            function getProperImageUrl(url) {
                // Handle Bing image URLs
                if (url.includes('th.bing.com')) {
                    // Remove size constraints from Bing URLs
                    return url.replace(/&w=\d+&h=\d+/, '&w=300&h=450');
                }
                // Handle Moveek URLs
                if (url.includes('moveek.com')) {
                    // URLs are already in good format
                    return url;
                }
                // Handle TMDb URLs
                if (url.includes('themoviedb.org')) {
                    // URLs are already in good format
                    return url;
                }
                return url;
            }

            // Update Now Showing section
            const nowShowingGrid = document.querySelector('.movies-section:not(.coming-soon) .movie-grid');
            nowShowingGrid.innerHTML = nowShowingData.map(movie => `
                <div class="movie-card">
                    <img src="${getProperImageUrl(movie.image)}" alt="${movie.title}">
                    <h3>${movie.title}</h3>
                    <p>Thể loại: ${movie.genre}</p>
                    <p>Thời lượng: ${movie.duration}</p>
                    <button class="book-now">Đặt vé ngay</button>
                </div>
            `).join('');

            // Update Coming Soon section
            const comingSoonGrid = document.querySelector('.movies-section.coming-soon .movie-grid');
            comingSoonGrid.innerHTML = upcomingData.map(movie => `
                <div class="movie-card">
                    <img src="${getProperImageUrl(movie.image)}" alt="${movie.title}">
                    <h3>${movie.title}</h3>
                    <p>Thể loại: ${movie.genre}</p>
                    <p>Thời lượng: ${movie.duration}</p>
                    <button class="notify-me">Xem trailer</button>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error fetching movie data:', error);
        }
    }

    // Call the fetchMovies function
    fetchMovies();
});

