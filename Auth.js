console.log('Auth.js loaded');

const API_URL = 'http://localhost:8000';

// Kiểm tra trạng thái đăng nhập ngay khi file được load
document.addEventListener('DOMContentLoaded', checkLoginStatus);

// Hàm kiểm tra trạng thái đăng nhập
function checkLoginStatus() {
    console.log('Checking login status...');
    const token = localStorage.getItem('token');
    console.log('Current token:', token);
    updateAuthUI(token);
}

// Đợi header load xong
setTimeout(() => {
    const loginBtn = document.querySelector('.login');
    const registerBtn = document.querySelector('.register');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => showModal('login'));
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => showModal('register'));
    }

    // Kiểm tra lại trạng thái sau khi header được load
    checkLoginStatus();
}, 100);

// Form handling functions
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const errorDiv = document.getElementById('error');

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Login successful, token:', data.access_token);
            localStorage.setItem('token', data.access_token);
            document.getElementById('authModal').remove();
            updateAuthUI(data.access_token);
        } else {
            errorDiv.style.display = 'block';
            errorDiv.textContent = data.detail || 'Đăng nhập thất bại';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Có lỗi xảy ra khi đăng nhập';
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const fullname = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelectorAll('input[type="password"]')[0].value;
    const confirmPassword = form.querySelectorAll('input[type="password"]')[1].value;
    const errorDiv = document.getElementById('error');

    if (password !== confirmPassword) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Mật khẩu không khớp';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, fullname, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Hiển thị thông báo thành công
            document.querySelector('.auth-form.active').innerHTML = `
                <div class="success-message">
                    <h3>Đăng ký thành công!</h3>
                    <p>Vui lòng kiểm tra email để xác thực tài khoản.</p>
                    <button onclick="switchTab('login')">Đăng nhập</button>
                </div>
            `;
        } else {
            errorDiv.style.display = 'block';
            errorDiv.textContent = data.detail || 'Đăng ký thất bại';
        }
    } catch (error) {
        console.error('Register error:', error);
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Có lỗi xảy ra khi đăng ký';
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const errorDiv = document.getElementById('error');

    try {
        const response = await fetch(`${API_URL}/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            // Hiển thị thông báo thành công
            document.getElementById('forgotPasswordForm').innerHTML = `
                <div class="success-message">
                    <h3>Yêu cầu đặt lại mật khẩu đã được gửi!</h3>
                    <p>Vui lòng kiểm tra email của bạn để đặt lại mật khẩu.</p>
                    <button onclick="switchTab('login')">Quay lại đăng nhập</button>
                </div>
            `;
        } else {
            errorDiv.style.display = 'block';
            errorDiv.textContent = data.detail || 'Không thể gửi yêu cầu đặt lại mật khẩu';
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Có lỗi xảy ra khi gửi yêu cầu';
    }
}

// Modal handling functions
function showModal(modalType) {
    const modalHTML = `
        <div class="auth-modal" id="authModal">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <div class="auth-tabs">
                    <button class="tab-btn ${modalType === 'login' ? 'active' : ''}" onclick="switchTab('login')">Đăng nhập</button>
                    <button class="tab-btn ${modalType === 'register' ? 'active' : ''}" onclick="switchTab('register')">Đăng ký</button>
                </div>

                <!-- Login Form -->
                <div class="auth-form ${modalType === 'login' ? 'active' : ''}" id="loginForm">
                    <form onsubmit="handleLogin(event)">
                        <div class="form-group">
                            <input type="email" placeholder="Email" required>
                        </div>
                        <div class="form-group">
                            <input type="password" placeholder="Mật khẩu" required>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="submit-btn">Đăng nhập</button>
                            <a href="#" onclick="showForgotPassword(event)">Quên mật khẩu?</a>
                        </div>
                        <div id="error" class="error"></div>
                    </form>
                </div>

                <!-- Register Form -->
                <div class="auth-form ${modalType === 'register' ? 'active' : ''}" id="registerForm">
                    <form onsubmit="handleRegister(event)">
                        <div class="form-group">
                            <input type="text" placeholder="Họ và tên" required>
                        </div>
                        <div class="form-group">
                            <input type="email" placeholder="Email" required>
                        </div>
                        <div class="form-group">
                            <input type="password" placeholder="Mật khẩu" required>
                        </div>
                        <div class="form-group">
                            <input type="password" placeholder="Xác nhận mật khẩu" required>
                        </div>
                        <button type="submit" class="submit-btn">Đăng ký</button>
                        <div id="error" class="error"></div>
                    </form>
                </div>

                <!-- Forgot Password Form -->
                <div class="auth-form" id="forgotPasswordForm">
                    <form onsubmit="handleForgotPassword(event)">
                        <h3>Quên mật khẩu</h3>
                        <div class="form-group">
                            <input type="email" placeholder="Email" required>
                        </div>
                        <button type="submit" class="submit-btn">Gửi yêu cầu</button>
                        <button type="button" class="back-btn" onclick="switchTab('login')">Quay lại đăng nhập</button>
                        <div id="error" class="error"></div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setupModalListeners();
}

function setupModalListeners() {
    const modal = document.getElementById('authModal');
    const closeBtn = document.querySelector('.close-modal');

    closeBtn.onclick = () => modal.remove();
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    };
}

function switchTab(tab) {
    const forms = document.querySelectorAll('.auth-form');
    const tabs = document.querySelectorAll('.tab-btn');
    const errorDivs = document.querySelectorAll('.error');
    
    // Ẩn tất cả thông báo lỗi
    errorDivs.forEach(div => {
        div.style.display = 'none';
        div.textContent = '';
    });

    forms.forEach(form => form.classList.remove('active'));
    tabs.forEach(tab => tab.classList.remove('active'));

    if (tab === 'login') {
        document.getElementById('loginForm').classList.add('active');
        tabs[0].classList.add('active');
    } else if (tab === 'register') {
        document.getElementById('registerForm').classList.add('active');
        tabs[1].classList.add('active');
    }
    document.getElementById('forgotPasswordForm').classList.remove('active');
}

function showForgotPassword(event) {
    event.preventDefault();
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById('forgotPasswordForm').classList.add('active');
}

// Hàm cập nhật UI dựa trên trạng thái đăng nhập
function updateAuthUI(token) {
    console.log('Updating UI with token:', token);
    const authButtons = document.querySelector('.auth-buttons');
    
    if (authButtons) {
        if (token) {
            authButtons.innerHTML = `
                <button onclick="handleLogout()" class="logout">Đăng xuất</button>
            `;
        } else {
            authButtons.innerHTML = `
                <button class="login">Đăng nhập</button>
                <button class="register">Đăng ký</button>
            `;
            // Gắn lại event listeners
            const loginBtn = authButtons.querySelector('.login');
            const registerBtn = authButtons.querySelector('.register');
            
            if (loginBtn) {
                loginBtn.addEventListener('click', () => showModal('login'));
            }
            if (registerBtn) {
                registerBtn.addEventListener('click', () => showModal('register'));
            }
        }
    }
}

// Hàm đăng xuất
function handleLogout() {
    console.log('Logging out...');
    localStorage.removeItem('token');
    updateAuthUI(null);
}
