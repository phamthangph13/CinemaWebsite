// Initialize Swiper
const swiper = new Swiper('.swiper', {
    // Optional parameters
    direction: 'horizontal',
    loop: true,
    autoplay: {
        delay: 5000,
        disableOnInteraction: false,
    },

    // If we need pagination
    pagination: {
        el: '.swiper-pagination',
        clickable: true
    },

    // Navigation arrows
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },
});

// Smooth scroll for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const section = document.querySelector(this.getAttribute('href'));
        if (section) {
            section.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

//LOAD FILM

$(document).ready(function () {
    // Load Now Showing movies
    $.getJSON("assets/Movie_data.json", function (data) {
        let movieSection = $(".movies-section .movie-grid");
        movieSection.empty(); // Xóa nội dung mặc định

        data.movies.forEach(movie => {
            let movieCard = `
                <div class="movie-card">
                    <img src="${movie.image}" alt="${movie.title}">
                    <h3>${movie.title}</h3>
                    <p>Thể loại: ${movie.genre}</p>
                    <p>Thời lượng: ${movie.duration}</p>
                    <button class="book-now">${movie.buttonText}</button>
                </div>
            `;
            movieSection.append(movieCard);
        });
    }).fail(function () {
        console.log("Không thể tải dữ liệu phim đang chiếu.");
    });

    // Load Coming Soon movies
    $.getJSON("assets/Movie_comming.json", function (data) {
        let comingSection = $(".movies-section.coming-soon .movie-grid");
        comingSection.empty(); // Xóa nội dung mặc định

        data.movies.forEach(movie => {
            let movieCard = `
                <div class="movie-card">
                    <img src="${movie.image}" alt="${movie.title}">
                    <h3>${movie.title}</h3>
                    <p>Thể loại: ${movie.genre}</p>
                    <p>Thời lượng: ${movie.duration}</p>
                    <button class="notify-me">${movie.buttonText}</button>
                </div>
            `;
            comingSection.append(movieCard);
        });
    }).fail(function () {
        console.log("Không thể tải dữ liệu phim sắp chiếu.");
    });
});

