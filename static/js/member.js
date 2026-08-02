// ============================================
// Library Member Portal - JavaScript
// ============================================

// Global variables
let currentPage = 1;
let memberData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check if member is logged in
    await verifySession();
    
    // Load initial data
    loadDashboardStats();
    loadCategories();
    loadBooks();
    loadMyIssues();
    loadNewArrivals();
    loadProfile();
    
    // Event listeners
    setupEventListeners();
});

// Verify session
async function verifySession() {
    try {
        const response = await fetch('/member/verify-session');
        const data = await response.json();
        
        if (!data.success) {
            window.location.href = '/member/login';
            return;
        }
        
        memberData = data.member;
        
        // Display member info
        document.getElementById('memberName').textContent = memberData.name || memberData.username;
        document.getElementById('welcomeName').textContent = memberData.name || memberData.username;
        document.getElementById('memberRoleBadge').textContent = memberData.membership_type || 'Member';
        document.getElementById('welcomeRole').textContent = 
            memberData.membership_type === 'Teacher' 
                ? 'Welcome to your Teacher library account'
                : 'Welcome to your Student library account';
        
        // Set role-based theming
        document.body.setAttribute('data-role', (memberData.membership_type || 'student').toLowerCase());
    } catch (error) {
        console.error('Session verification failed:', error);
        window.location.href = '/member/login';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Logout button
    document.getElementById('memberLogoutBtn').addEventListener('click', logout);

    // Profile form
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);

    // Search
    document.getElementById('bookSearch').addEventListener('input', debounce(searchBooks, 500));
    document.getElementById('globalSearch').addEventListener('input', debounce(globalSearch, 500));

    // Filters
    document.getElementById('categoryFilter').addEventListener('change', filterBooks);
    document.getElementById('issueStatusFilter').addEventListener('change', loadMyIssues);
    document.getElementById('returnSearch').addEventListener('input', debounce(searchReturnedBooks, 500));
}

// Show page
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    if (page === 'dashboard') {
        document.getElementById('dashboardPage').classList.add('active');
        loadDashboardStats();
    } else if (page === 'books') {
        document.getElementById('booksPage').classList.add('active');
        loadBooks();
    } else if (page === 'my-issues') {
        document.getElementById('myIssuesPage').classList.add('active');
        loadMyIssues();
    } else if (page === 'my-returns') {
        document.getElementById('myReturnsPage').classList.add('active');
        loadMyReturns();
    } else if (page === 'pay-fines') {
        document.getElementById('payFinesPage').classList.add('active');
        loadFinesData();
    } else if (page === 'new-arrivals') {
        document.getElementById('newArrivalsPage').classList.add('active');
        loadNewArrivals();
    } else if (page === 'profile') {
        document.getElementById('profilePage').classList.add('active');
        loadProfile();
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============ DASHBOARD FUNCTIONS ============

// Load dashboard stats
async function loadDashboardStats() {
    try {
        const response = await fetch('/member/api/dashboard-stats');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            
            document.getElementById('totalBooks').textContent = stats.total_books || 0;
            document.getElementById('availableBooks').textContent = stats.available_books || 0;
            document.getElementById('myIssuedBooks').textContent = stats.my_issued_books || 0;
            document.getElementById('newArrivalsCount').textContent = stats.new_arrivals || 0;
            
            // Fine display
            const fineCard = document.getElementById('fineInfoCard');
            const pendingFine = stats.pending_fine || 0;
            document.getElementById('pendingFineAmount').textContent = `₹${pendingFine}`;
            
            if (pendingFine > 0) {
                fineCard.classList.add('has-fine');
            } else {
                fineCard.classList.remove('has-fine');
                document.querySelector('.fine-note').textContent = 'You have no pending fines. Keep it up!';
            }
            
            // Load recent issues
            loadRecentIssues();
        }
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

// Load recent issues for dashboard
async function loadRecentIssues() {
    try {
        const response = await fetch('/member/api/my-issues?status=issued');
        const data = await response.json();
        
        const list = document.getElementById('recentIssuesList');
        
        if (!data.success || data.data.length === 0) {
            list.innerHTML = '<p class="no-activities">You have no books currently issued.</p>';
            return;
        }
        
        // Show top 5
        const issues = data.data.slice(0, 5);
        
        list.innerHTML = issues.map(issue => `
            <div class="activity-item">
                <strong>${issue.book ? issue.book.title : 'Unknown Book'}</strong>
                <small>Due: ${formatDate(issue.return_date)} | Status: ${issue.status}</small>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load recent issues:', error);
    }
}

// ============ BOOK FUNCTIONS ============

// Load categories
async function loadCategories() {
    try {
        const response = await fetch('/member/api/categories');
        const data = await response.json();
        
        if (data.success) {
            const categoryFilter = document.getElementById('categoryFilter');
            
            data.data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                categoryFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

// Load books
async function loadBooks(page = 1) {
    try {
        currentPage = page;
        const search = document.getElementById('bookSearch')?.value || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        
        let url = `/member/api/books?page=${page}&limit=9`;
        if (search) url += `&search=${search}`;
        if (category) url += `&category=${category}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayBooks(data.data);
            displayPagination('booksPagination', data.pagination, 'loadBooks');
        }
    } catch (error) {
        console.error('Failed to load books:', error);
        showToast('Failed to load books', 'error');
    }
}

// Display books grid
function displayBooks(books) {
    const grid = document.getElementById('booksGrid');
    
    if (books.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-book-open"></i><p>No books found</p></div>';
        return;
    }
    
    grid.innerHTML = books.map(book => `
        <div class="book-card">
            <div class="book-cover">
                ${book.cover_image 
                    ? `<img src="/static/images/uploads/${book.cover_image}" alt="${book.title}">`
                    : `<div class="book-cover-placeholder"><i class="fas fa-book"></i></div>`
                }
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author || 'Unknown Author'}</p>
                <p class="book-meta">
                    <span class="badge">${book.category || 'General'}</span>
                    <span class="availability ${book.available_quantity > 0 ? 'available' : 'unavailable'}">
                        ${book.available_quantity > 0 ? `${book.available_quantity} available` : 'Not available'}
                    </span>
                </p>
                <div class="book-details">
                    <small>ISBN: ${book.isbn || '-'}</small>
                    <small>Book ID: ${book.book_id || '-'}</small>
                </div>
            </div>
        </div>
    `).join('');
}

// Search books
async function searchBooks() {
    loadBooks(1);
}

// Filter books
function filterBooks() {
    loadBooks(1);
}

// ============ MY ISSUES FUNCTIONS ============

// Load my issued books
async function loadMyIssues() {
    try {
        const status = document.getElementById('issueStatusFilter')?.value || '';
        
        let url = '/member/api/my-issues';
        if (status) url += `?status=${status}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayMyIssues(data.data);
        }
    } catch (error) {
        console.error('Failed to load my issues:', error);
        showToast('Failed to load issues', 'error');
    }
}

// Display my issues
function displayMyIssues(issues) {
    const tbody = document.getElementById('myIssuesTableBody');
    
    if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No records found</td></tr>';
        return;
    }
    
    tbody.innerHTML = issues.map(issue => {
        const status = issue.display_status || formatMemberStatus(issue);
        const statusClass = status.toLowerCase() === 'returned' ? 'status-returned' :
                           (status.toLowerCase() === 'overdue' ? 'status-overdue' : 'status-issued');
        
        let fine = issue.fine_amount || 0;
        if (issue.status === 'issued' && issue.overdue_fine) {
            fine = issue.overdue_fine;
        }
        
        return `
            <tr>
                <td>
                    <strong>${issue.book ? issue.book.title : 'Unknown'}</strong><br>
                    <small>${issue.book ? issue.book.author : ''}</small>
                </td>
                <td>${formatDate(issue.issue_date)}</td>
                <td>${formatDate(issue.return_date)}</td>
                <td>${issue.actual_return_date ? formatDate(issue.actual_return_date) : '-'}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>
                    ${fine > 0 
                        ? `<span class="fine-amount-text">₹${fine}</span>` 
                        : '<span class="text-muted">₹0</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

// Format status from dates (fallback if server doesn't provide display_status)
function formatMemberStatus(issue) {
    try {
        if (issue.status === 'returned') return 'Returned';
        
        if (issue.return_date) {
            const returnDate = new Date(issue.return_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (!isNaN(returnDate.getTime()) && returnDate < today) {
                return 'Overdue';
            }
        }
        
        return 'Issued';
    } catch (error) {
        return issue.status || 'Issued';
    }
}

// ============ MY RETURNED BOOKS FUNCTIONS ============

// Load my returned books
async function loadMyReturns() {
    try {
        const search = document.getElementById('returnSearch')?.value || '';
        
        let url = '/member/api/my-issues?status=returned';
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayMyReturns(data.data);
        }
    } catch (error) {
        console.error('Failed to load my returned books:', error);
        showToast('Failed to load returned books', 'error');
    }
}

// Search returned books
function searchReturnedBooks() {
    loadMyReturns();
}

// Display my returned books
function displayMyReturns(returns) {
    const tbody = document.getElementById('myReturnsTableBody');
    
    if (!returns || returns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No returned books found</td></tr>';
        return;
    }
    
    tbody.innerHTML = returns.map(issue => {
        const status = 'Returned';
        const statusClass = 'status-returned';
        const fine = issue.fine_amount || 0;
        
        return `
            <tr>
                <td>
                    <strong>${issue.book ? issue.book.title : 'Unknown'}</strong><br>
                    <small>${issue.book ? issue.book.author : ''}</small>
                </td>
                <td>${formatDate(issue.issue_date)}</td>
                <td>${formatDate(issue.return_date)}</td>
                <td>${issue.actual_return_date ? formatDate(issue.actual_return_date) : '-'}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>
                    ${fine > 0 
                        ? `<span class="fine-amount-text">₹${fine}</span>` 
                        : '<span class="text-muted">₹0</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

// ============ PAY FINES FUNCTIONS ============

// Global: current list of outstanding fines (for payFine lookups)
let currentFines = [];

// Load fines data (outstanding fines + payment history)
async function loadFinesData() {
    try {
        const response = await fetch('/member/api/my-fines');
        const data = await response.json();

        if (data.success) {
            currentFines = data.data || [];
            displayOutstandingFines(currentFines);
        } else {
            showToast(data.message || 'Failed to load fines', 'error');
        }
    } catch (error) {
        console.error('Failed to load outstanding fines:', error);
        showToast('Failed to load fines', 'error');
    }

    try {
        const response = await fetch('/member/api/payment-history');
        const data = await response.json();

        if (data.success) {
            displayPaymentHistory(data.data);
        } else {
            showToast(data.message || 'Failed to load payment history', 'error');
        }
    } catch (error) {
        console.error('Failed to load payment history:', error);
        showToast('Failed to load payment history', 'error');
    }
}

// Display outstanding fines
function displayOutstandingFines(fines) {
    const tbody = document.getElementById('finesTableBody');
    const totalEl = document.getElementById('finesTotalAmount');

    if (!fines || fines.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No outstanding fines. Great job!</td></tr>';
        if (totalEl) totalEl.textContent = '₹0';
        return;
    }

    const total = fines.reduce((sum, fine) => sum + (fine.amount || 0), 0);
    if (totalEl) totalEl.textContent = '₹' + total;

    tbody.innerHTML = fines.map(fine => `
        <tr>
            <td>
                <strong>${fine.book_title || 'Unknown Book'}</strong>
            </td>
            <td>${fine.reason || 'Overdue book fine'}</td>
            <td>${formatDate(fine.due_date || fine.return_date)}</td>
            <td><span class="fine-amount-text">₹${fine.amount || 0}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="payFine('${fine.issue_id}')">
                    <i class="fas fa-credit-card"></i> Pay Now
                </button>
            </td>
        </tr>
    `).join('');
}

// Pay a single fine (look up from the already-loaded outstanding fines)
function payFine(issueId) {
    const fine = currentFines.find(f => f.issue_id === issueId);

    if (!fine) {
        showToast('Fine not found. Please refresh.', 'error');
        loadFinesData();
        return;
    }

    // Open payment gateway with the fine details
    openFinePaymentGateway({
        amount: fine.amount,
        customerName: (memberData && memberData.name) ? memberData.name : 'Member',
        customerEmail: (memberData && memberData.email) ? memberData.email : '',
        customerPhone: '',
        merchantName: 'Smart Library',
        issueIds: [issueId],
        onSuccess: (paymentResult) => {
            // Record payment in backend
            recordFinePayment(paymentResult);
        },
        onFailure: () => {
            showToast('Payment was not completed', 'error');
        }
    });
}

// Record a successful fine payment in the backend
async function recordFinePayment(paymentResult) {
    try {
        const response = await fetch('/member/api/pay-fine', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                issue_ids: paymentResult.issueIds || [],
                transaction_id: paymentResult.transactionId || '',
                amount: paymentResult.amount || 0,
                payment_method: paymentResult.paymentMethod || 'UPI'
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Payment recorded! Awaiting librarian confirmation.', 'success');
            // Refresh fines data and dashboard stats
            loadFinesData();
            loadDashboardStats();
        } else {
            showToast(data.message || 'Failed to record payment', 'error');
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        showToast('Failed to record payment', 'error');
    }
}

// Display payment history
function displayPaymentHistory(payments) {
    const tbody = document.getElementById('paymentHistoryTableBody');

    if (!payments || payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No payments yet</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(payment => {
        const status = (payment.status || 'pending').toLowerCase();
        const statusLabel = status === 'confirmed' ? 'Confirmed' : 'Pending';
        const statusClass = status === 'confirmed' ? 'status-confirmed' : 'status-pending';
        return `
            <tr>
                <td>${payment.payment_id || payment._id || '-'}</td>
                <td>${payment.transaction_id || '-'}</td>
                <td><span class="fine-amount-text">₹${payment.amount || 0}</span></td>
                <td>${payment.payment_method || '-'}</td>
                <td>${formatDate(payment.paid_at || payment.created_at)}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
            </tr>
        `;
    }).join('');
}

// ============ NEW ARRIVALS FUNCTIONS ============

// Load new arrivals
async function loadNewArrivals() {
    try {
        const response = await fetch('/member/api/books/new');
        const data = await response.json();
        
        const grid = document.getElementById('newArrivalsGrid');
        
        if (!data.success || data.data.books.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>No new books yet. Check back soon!</p></div>';
            return;
        }
        
        grid.innerHTML = data.data.books.map(book => `
            <div class="book-card new-arrival-card">
                <div class="new-arrival-tag">
                    <i class="fas fa-star"></i> New
                </div>
                <div class="book-cover">
                    ${book.cover_image 
                        ? `<img src="/static/images/uploads/${book.cover_image}" alt="${book.title}">`
                        : `<div class="book-cover-placeholder"><i class="fas fa-book"></i></div>`
                    }
                </div>
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-author">${book.author || 'Unknown Author'}</p>
                    <p class="book-meta">
                        <span class="badge">${book.category || 'General'}</span>
                    </p>
                    <div class="book-details">
                        <small>Added: ${formatDate(book.created_at)}</small>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load new arrivals:', error);
        showToast('Failed to load new arrivals', 'error');
    }
}

// ============ PROFILE FUNCTIONS ============

// Load profile
async function loadProfile() {
    try {
        const response = await fetch('/member/api/profile');
        const data = await response.json();
        
        if (data.success) {
            const profile = data.data;
            
            document.getElementById('profileUsername').value = profile.username || '';
            document.getElementById('profileEmail').value = profile.email || '';
            document.getElementById('profilePhone').value = profile.phone || '';
            document.getElementById('profileDepartment').value = profile.department || '';
            document.getElementById('profileRoll').value = profile.roll_number || '';
            document.getElementById('profileAddress').value = profile.address || '';
            
            document.getElementById('profileName').textContent = profile.name || '';
            document.getElementById('profileType').textContent = profile.membership_type || '';
            
            if (profile.profile_image) {
                const imageUrl = `/static/images/uploads/${profile.profile_image}`;
                document.getElementById('profileImage').src = imageUrl;
                document.getElementById('memberProfileImg').src = imageUrl;
            }
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

// Handle profile update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const data = {
        phone: document.getElementById('profilePhone').value,
        department: document.getElementById('profileDepartment').value,
        roll_number: document.getElementById('profileRoll').value,
        address: document.getElementById('profileAddress').value
    };
    
    try {
        const response = await fetch('/member/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Profile updated successfully', 'success');
        } else {
            showToast(result.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('An error occurred', 'error');
    }
}

// ============ UTILITY FUNCTIONS ============

// Display pagination
function displayPagination(elementId, pagination, functionName) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    
    if (pagination.total_pages <= 1) return;
    
    // Previous button
    if (pagination.has_prev) {
        const btn = document.createElement('button');
        btn.textContent = 'Previous';
        btn.onclick = () => window[functionName](pagination.prev_page);
        container.appendChild(btn);
    }
    
    // Page numbers
    for (let i = 1; i <= pagination.total_pages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === pagination.page ? 'active' : '';
        btn.onclick = () => window[functionName](i);
        container.appendChild(btn);
    }
    
    // Next button
    if (pagination.has_next) {
        const btn = document.createElement('button');
        btn.textContent = 'Next';
        btn.onclick = () => window[functionName](pagination.next_page);
        container.appendChild(btn);
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (error) {
        return dateString;
    }
}

// Global search
async function globalSearch() {
    const query = document.getElementById('globalSearch').value.trim();
    
    if (!query) return;
    
    // Navigate to books page and search
    navigateTo('books');
    document.getElementById('bookSearch').value = query;
    loadBooks(1);
}

// Navigate to page
function navigateTo(page) {
    document.querySelector(`[data-page="${page}"]`).click();
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
}

// Logout
async function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        const response = await fetch('/member/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/member/login';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

