// ============================================
// Smart Library Management System - JavaScript
// ============================================

// Global variables
let currentPage = 1;
let currentCategory = null;
let allCategories = [];
let issueChart = null;
let categoryChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    await verifySession();
    
    // Load initial data
    loadDashboardStats();
    loadCategories();
    loadBooks();
    loadMembers();
    
    // Set current date
    document.getElementById('issueDate').valueAsDate = new Date();
    document.getElementById('returnDate').valueAsDate = new Date();
    
    // Event listeners
    setupEventListeners();
});

// Verify session
async function verifySession() {
    try {
        const response = await fetch('/verify-session');
        const data = await response.json();
        
        if (!data.success) {
            window.location.href = '/login';
            return;
        }
        
        // Display admin info
        document.getElementById('adminName').textContent = data.full_name || data.username;
    } catch (error) {
        console.error('Session verification failed:', error);
        window.location.href = '/login';
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
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Forms
    document.getElementById('addBookForm').addEventListener('submit', handleAddBook);
    document.getElementById('addMemberForm').addEventListener('submit', handleAddMember);
    document.getElementById('issueForm').addEventListener('submit', handleIssueBook);
    document.getElementById('returnForm').addEventListener('submit', handleReturnBook);
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsUpdate);

    // Edit forms
    document.getElementById('editBookForm').addEventListener('submit', handleEditBook);
    document.getElementById('editMemberForm').addEventListener('submit', handleEditMember);
    document.getElementById('addCategoryForm').addEventListener('submit', handleAddCategory);

    // Search
    document.getElementById('bookSearch').addEventListener('input', debounce(searchBooks, 500));
    document.getElementById('memberSearch').addEventListener('input', debounce(searchMembers, 500));
    document.getElementById('globalSearch').addEventListener('input', debounce(globalSearch, 500));

    // Filters
    document.getElementById('categoryFilter').addEventListener('change', filterBooks);
    document.getElementById('memberStatusFilter').addEventListener('change', filterMembers);
    document.getElementById('paymentSearch').addEventListener('input', debounce(searchPayments, 500));
    document.getElementById('paymentStatusFilter').addEventListener('change', filterPayments);

    // Return date to fine calculation
    document.getElementById('returnDate').addEventListener('change', calculateFine);
    document.getElementById('returnIssue').addEventListener('change', calculateFine);

    // Return history search
    document.getElementById('returnSearch').addEventListener('input', debounce(searchReturnHistory, 500));

    // Profile image upload
    document.getElementById('imageInput').addEventListener('change', uploadProfileImage);
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
    } else if (page === 'members') {
        document.getElementById('membersPage').classList.add('active');
        loadMembers();
    } else if (page === 'issue') {
        document.getElementById('issuePage').classList.add('active');
        loadIssueData();
    } else if (page === 'return') {
        document.getElementById('returnPage').classList.add('active');
        loadReturnData();
    } else if (page === 'payments') {
        document.getElementById('paymentsPage').classList.add('active');
        loadPayments();
    } else if (page === 'reports') {
        document.getElementById('reportsPage').classList.add('active');
    } else if (page === 'profile') {
        document.getElementById('profilePage').classList.add('active');
        loadProfileData();
    } else if (page === 'settings') {
        document.getElementById('settingsPage').classList.add('active');
        loadSettingsData();
    }
}

// Navigate to page
function navigateTo(page) {
    document.querySelector(`[data-page="${page}"]`).click();
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

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch('/dashboard-stats');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            
            document.getElementById('totalBooks').textContent = stats.books.total_books || 0;
            document.getElementById('availableBooks').textContent = stats.books.available_books || 0;
            document.getElementById('issuedBooks').textContent = stats.issues.total_issued || 0;
            document.getElementById('totalMembers').textContent = stats.members.total_members || 0;
            
            // Load charts
            loadCharts(stats);
            
            // Load recent activities
            loadRecentActivities();
        }
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

// Load recent activities
async function loadRecentActivities() {
    try {
        const response = await fetch('/recent-activities');
        const data = await response.json();
        
        const list = document.getElementById('activitiesList');
        
        if (!data.success || data.data.length === 0) {
            list.innerHTML = '<p class="no-activities">No recent activities yet.</p>';
            return;
        }
        
        list.innerHTML = data.data.map(activity => `
            <div class="activity-item">
                <strong>${activity.description || activity.action || 'Activity'}</strong>
                <small>${activity.timestamp || ''}</small>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load recent activities:', error);
        document.getElementById('activitiesList').innerHTML = '<p class="no-activities">Failed to load activities.</p>';
    }
}

// Load charts
function loadCharts(stats) {
    // Issue Statistics Chart
    if (issueChart) issueChart.destroy();
    
    const issueCtx = document.getElementById('issueChart')?.getContext('2d');
    if (issueCtx) {
        issueChart = new Chart(issueCtx, {
            type: 'doughnut',
            data: {
                labels: ['Issued', 'Returned', 'Overdue'],
                datasets: [{
                    data: [
                        stats.issues.total_issued || 0,
                        stats.issues.total_returned || 0,
                        stats.issues.overdue_books || 0
                    ],
                    backgroundColor: ['#4facfe', '#43e97b', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Category Chart - load real data
    loadCategoryChart();
}

// Load category chart with real book counts
async function loadCategoryChart() {
    try {
        const response = await fetch('/category-counts');
        const data = await response.json();
        
        if (!data.success) return;
        
        const counts = data.data;
        const entries = Object.entries(counts).slice(0, 5);
        
        if (categoryChart) categoryChart.destroy();
        
        const categoryCtx = document.getElementById('categoryChart')?.getContext('2d');
        if (categoryCtx) {
            if (entries.length === 0) {
                categoryChart = new Chart(categoryCtx, {
                    type: 'bar',
                    data: {
                        labels: ['No Categories'],
                        datasets: [{
                            label: 'Books',
                            data: [0],
                            backgroundColor: '#667eea'
                        }]
                    },
                    options: {
                        responsive: true,
                        indexAxis: 'y',
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
                return;
            }
            
            categoryChart = new Chart(categoryCtx, {
                type: 'bar',
                data: {
                    labels: entries.map(([name]) => name),
                    datasets: [{
                        label: 'Books',
                        data: entries.map(([, count]) => count),
                        backgroundColor: '#667eea'
                    }]
                },
                options: {
                    responsive: true,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Failed to load category chart:', error);
    }
}

// ============ BOOK FUNCTIONS ============

// Load categories
async function loadCategories() {
    try {
        const response = await fetch('/categories');
        const data = await response.json();
        
        if (data.success) {
            allCategories = data.data;
            
            // Populate category filters
            const categoryFilter = document.getElementById('categoryFilter');
            const bookCategory = document.getElementById('bookCategory');
            
            data.data.forEach(category => {
                // Filter dropdown
                const option1 = document.createElement('option');
                option1.value = category.name;
                option1.textContent = category.name;
                categoryFilter.appendChild(option1);
                
                // Add book form
                const option2 = document.createElement('option');
                option2.value = category.name;
                option2.textContent = category.name;
                bookCategory.appendChild(option2);
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
        
        let url = `/books?page=${page}`;
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

// Display books
function displayBooks(books) {
    const tbody = document.getElementById('booksTableBody');
    
    if (books.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No books found</td></tr>';
        return;
    }
    
    tbody.innerHTML = books.map(book => `
        <tr>
            <td>${book.book_id}</td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.category}</td>
            <td>${book.isbn}</td>
            <td>${book.quantity}</td>
            <td><span class="badge">${book.available_quantity}</span></td>
            <td>₹${book.price}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editBook('${book._id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteBook('${book._id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Add book
async function handleAddBook(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/books', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Book added successfully', 'success');
            closeAddBookModal();
            loadBooks();
            e.target.reset();
        } else {
            showToast(data.message || 'Failed to add book', 'error');
        }
    } catch (error) {
        console.error('Error adding book:', error);
        showToast('An error occurred', 'error');
    }
}

// Delete book
async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    
    try {
        const response = await fetch(`/books/${bookId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Book deleted successfully', 'success');
            loadBooks();
        } else {
            showToast(data.message || 'Failed to delete book', 'error');
        }
    } catch (error) {
        console.error('Error deleting book:', error);
        showToast('An error occurred', 'error');
    }
}

// Edit book
async function editBook(bookId) {
    try {
        const response = await fetch(`/books/${bookId}`);
        const data = await response.json();
        
        if (!data.success) {
            showToast(data.message || 'Failed to load book', 'error');
            return;
        }
        
        const book = data.data;
        
        // Populate form fields
        document.getElementById('editBookId').value = book._id;
        document.getElementById('editBookISBN').value = book.isbn || '';
        document.getElementById('editBookTitle').value = book.title || '';
        document.getElementById('editBookAuthor').value = book.author || '';
        document.getElementById('editBookPublisher').value = book.publisher || '';
        document.getElementById('editBookQuantity').value = book.quantity || '';
        document.getElementById('editBookPrice').value = book.price || '';
        document.getElementById('editBookShelf').value = book.shelf_number || '';
        document.getElementById('editBookDescription').value = book.description || '';
        
        // Populate category dropdown
        const categorySelect = document.getElementById('editBookCategory');
        categorySelect.innerHTML = '';
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            option.selected = category.name === book.category;
            categorySelect.appendChild(option);
        });
        
        // Show modal
        document.getElementById('editBookModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading book:', error);
        showToast('Failed to load book details', 'error');
    }
}

// Handle edit book form submission
async function handleEditBook(e) {
    e.preventDefault();
    
    const bookId = document.getElementById('editBookId').value;
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`/books/${bookId}`, {
            method: 'PUT',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Book updated successfully', 'success');
            closeEditBookModal();
            loadBooks();
        } else {
            showToast(data.message || 'Failed to update book', 'error');
        }
    } catch (error) {
        console.error('Error updating book:', error);
        showToast('An error occurred', 'error');
    }
}

// Show edit book modal
function closeEditBookModal() {
    document.getElementById('editBookModal').style.display = 'none';
}

// Close add book modal when clicking outside
// (already handled in window.onclick)

// Search books
async function searchBooks() {
    loadBooks(1);
}

// Filter books
function filterBooks() {
    loadBooks(1);
}

// Show add book modal
function showAddBookModal() {
    const modal = document.getElementById('addBookModal');
    modal.style.display = 'flex';
}

function closeAddBookModal() {
    const modal = document.getElementById('addBookModal');
    modal.style.display = 'none';
}

// ============ CATEGORY FUNCTIONS ============

// Show category management modal
function showCategoryModal() {
    document.getElementById('categoryModal').style.display = 'flex';
    loadCategoriesTable();
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

// Load categories table
async function loadCategoriesTable() {
    try {
        const response = await fetch('/categories');
        const data = await response.json();
        
        const tbody = document.getElementById('categoriesTableBody');
        
        if (!data.success || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No categories yet. Add one above.</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.data.map(category => `
            <tr>
                <td>${category.name}</td>
                <td>${category.description || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category._id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load categories:', error);
        document.getElementById('categoriesTableBody').innerHTML = 
            '<tr><td colspan="3" class="text-center">Failed to load categories.</td></tr>';
    }
}

// Handle add category
async function handleAddCategory(e) {
    e.preventDefault();
    
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDescription').value.trim();
    
    if (!name) {
        showToast('Category name is required', 'error');
        return;
    }
    
    try {
        const response = await fetch('/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                description: description
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Category added successfully', 'success');
            e.target.reset();
            loadCategoriesTable();
            
            // Refresh category dropdowns
            allCategories = [];
            document.getElementById('categoryFilter').innerHTML = '<option value="">All Categories</option>';
            document.getElementById('bookCategory').innerHTML = '';
            loadCategories();
        } else {
            showToast(data.message || 'Failed to add category', 'error');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showToast('An error occurred', 'error');
    }
}

// Delete category
async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const response = await fetch(`/categories/${categoryId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Category deleted successfully', 'success');
            loadCategoriesTable();
            
            // Refresh category dropdowns
            allCategories = [];
            document.getElementById('categoryFilter').innerHTML = '<option value="">All Categories</option>';
            document.getElementById('bookCategory').innerHTML = '';
            loadCategories();
        } else {
            showToast(data.message || 'Failed to delete category', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('An error occurred', 'error');
    }
}

// ============ MEMBER FUNCTIONS ============

// Load members
async function loadMembers(page = 1) {
    try {
        currentPage = page;
        const search = document.getElementById('memberSearch')?.value || '';
        const status = document.getElementById('memberStatusFilter')?.value || '';
        
        let url = `/members?page=${page}`;
        if (search) url += `&search=${search}`;
        if (status) url += `&status=${status}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayMembers(data.data);
            displayPagination('membersPagination', data.pagination, 'loadMembers');
            
            // Load members for issue form
            loadMembersForIssue();
        }
    } catch (error) {
        console.error('Failed to load members:', error);
        showToast('Failed to load members', 'error');
    }
}

// Display members
function displayMembers(members) {
    const tbody = document.getElementById('membersTableBody');
    
    if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No members found</td></tr>';
        return;
    }
    
    tbody.innerHTML = members.map(member => `
        <tr>
            <td>${member.member_id}</td>
            <td>${member.name}</td>
            <td>${member.email}</td>
            <td>${member.phone}</td>
            <td>${member.membership_type}</td>
            <td><span class="badge">${member.status}</span></td>
            <td>${new Date(member.created_at).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editMember('${member._id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteMember('${member._id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Add member
async function handleAddMember(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/members', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Member added successfully', 'success');
            
            // Show member credentials for portal login
            const creds = data.data || {};
            if (creds.username) {
                const msg = `Member added!\n\nPortal Login Credentials:\nUsername: ${creds.username}\nPassword: ${creds.password || 'Member@123'}`;
                setTimeout(() => alert(msg), 300);
            }
            
            closeAddMemberModal();
            loadMembers();
            e.target.reset();
        } else {
            showToast(data.message || 'Failed to add member', 'error');
        }
    } catch (error) {
        console.error('Error adding member:', error);
        showToast('An error occurred', 'error');
    }
}

// Delete member
async function deleteMember(memberId) {
    if (!confirm('Are you sure you want to delete this member?')) return;
    
    try {
        const response = await fetch(`/members/${memberId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Member deleted successfully', 'success');
            loadMembers();
        } else {
            showToast(data.message || 'Failed to delete member', 'error');
        }
    } catch (error) {
        console.error('Error deleting member:', error);
        showToast('An error occurred', 'error');
    }
}

// Edit member
async function editMember(memberId) {
    try {
        const response = await fetch(`/members/${memberId}`);
        const data = await response.json();
        
        if (!data.success) {
            showToast(data.message || 'Failed to load member', 'error');
            return;
        }
        
        const member = data.data;
        
        // Populate form fields
        document.getElementById('editMemberId').value = member._id;
        document.getElementById('editMemberName').value = member.name || '';
        document.getElementById('editMemberEmail').value = member.email || '';
        document.getElementById('editMemberPhone').value = member.phone || '';
        document.getElementById('editMemberType').value = member.membership_type || 'Student';
        document.getElementById('editMemberDept').value = member.department || '';
        document.getElementById('editMemberRoll').value = member.roll_number || '';
        document.getElementById('editMemberStatus').value = member.status || 'active';
        document.getElementById('editMemberAddress').value = member.address || '';
        document.getElementById('editMemberUsername').value = member.username || '';
        document.getElementById('editMemberPassword').value = '';
        
        if (member.dob) {
            document.getElementById('editMemberDob').value = member.dob;
        }
        
        // Show modal
        document.getElementById('editMemberModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading member:', error);
        showToast('Failed to load member details', 'error');
    }
}

// Handle edit member form submission
async function handleEditMember(e) {
    e.preventDefault();
    
    const memberId = document.getElementById('editMemberId').value;
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`/members/${memberId}`, {
            method: 'PUT',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Member updated successfully', 'success');
            closeEditMemberModal();
            loadMembers();
        } else {
            showToast(data.message || 'Failed to update member', 'error');
        }
    } catch (error) {
        console.error('Error updating member:', error);
        showToast('An error occurred', 'error');
    }
}

// Close edit member modal
function closeEditMemberModal() {
    document.getElementById('editMemberModal').style.display = 'none';
}

// Search members
async function searchMembers() {
    loadMembers(1);
}

// Filter members
function filterMembers() {
    loadMembers(1);
}

// Show add member modal
function showAddMemberModal() {
    const modal = document.getElementById('addMemberModal');
    modal.style.display = 'flex';
}

function closeAddMemberModal() {
    const modal = document.getElementById('addMemberModal');
    modal.style.display = 'none';
}

// ============ ISSUE FUNCTIONS ============

// Load issue data
async function loadIssueData() {
    await loadMembersForIssue();
    await loadBooksForIssue();
    await loadRecentIssues();
}

// Load members for issue
async function loadMembersForIssue() {
    try {
        const response = await fetch('/members?limit=1000');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('issueMember');
            select.innerHTML = '<option value="">Choose Member</option>';
            
            data.data.forEach(member => {
                const option = document.createElement('option');
                option.value = member._id;
                option.textContent = `${member.name} (${member.member_id})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load members for issue:', error);
    }
}

// Load books for issue
async function loadBooksForIssue() {
    try {
        const response = await fetch('/books?limit=1000');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('issueBook');
            select.innerHTML = '<option value="">Choose Book</option>';
            
            data.data.filter(book => book.available_quantity > 0).forEach(book => {
                const option = document.createElement('option');
                option.value = book._id;
                option.textContent = `${book.title} (${book.available_quantity} available)`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load books for issue:', error);
    }
}

// Format status from dates (fallback if server doesn't provide display_status)
function formatStatus(issue) {
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

// Load recent issues
async function loadRecentIssues() {
    try {
        const response = await fetch('/issues?page=1');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('issuedBooksTableBody');
            
            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No issues found</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.data.map(issue => {
                const status = issue.display_status || formatStatus(issue);
                const statusClass = status.toLowerCase() === 'returned' ? 'status-returned' :
                                   (status.toLowerCase() === 'overdue' ? 'status-overdue' : 'status-issued');
                
                return `
                    <tr>
                        <td>${issue.issue_id}</td>
                        <td>${issue.member_name || issue.member_id}</td>
                        <td>${issue.book_title || issue.book_id}</td>
                        <td>${new Date(issue.issue_date).toLocaleDateString()}</td>
                        <td>${new Date(issue.return_date).toLocaleDateString()}</td>
                        <td><span class="status-badge ${statusClass}">${status}</span></td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Failed to load recent issues:', error);
    }
}

// Handle issue book
async function handleIssueBook(e) {
    e.preventDefault();
    
    const memberId = document.getElementById('issueMember').value;
    const bookId = document.getElementById('issueBook').value;
    const issueDate = document.getElementById('issueDate').value;
    const issueDays = document.getElementById('issueDays').value;
    
    if (!memberId || !bookId) {
        showToast('Please select member and book', 'error');
        return;
    }
    
    try {
        const response = await fetch('/issue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                member_id: memberId,
                book_id: bookId,
                issue_date: issueDate,
                issue_days: parseInt(issueDays)
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Book issued successfully', 'success');
            loadRecentIssues();
            e.target.reset();
            document.getElementById('issueDate').valueAsDate = new Date();
        } else {
            showToast(data.message || 'Failed to issue book', 'error');
        }
    } catch (error) {
        console.error('Error issuing book:', error);
        showToast('An error occurred', 'error');
    }
}

// ============ RETURN FUNCTIONS ============

// Load return data
async function loadReturnData() {
    await loadIssuedBooksForReturn();
    await loadReturnHistory();
}

// Load return history
async function loadReturnHistory(page = 1) {
    try {
        const search = document.getElementById('returnSearch')?.value || '';
        
        let url = `/returns?page=${page}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayReturnHistory(data.data);
            displayPagination('returnHistoryPagination', data.pagination, 'loadReturnHistory');
        }
    } catch (error) {
        console.error('Failed to load return history:', error);
        document.getElementById('returnHistoryTableBody').innerHTML = 
            '<tr><td colspan="8" class="text-center">Failed to load return history.</td></tr>';
    }
}

// Search return history
function searchReturnHistory() {
    loadReturnHistory(1);
}

// Display return history
function displayReturnHistory(returns) {
    const tbody = document.getElementById('returnHistoryTableBody');
    
    if (returns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No returned books found</td></tr>';
        return;
    }
    
    tbody.innerHTML = returns.map(issue => `
        <tr>
            <td>${issue.issue_id || issue._id}</td>
            <td>
                <strong>${issue.member_name || 'Unknown'}</strong><br>
                <small>${issue.member_code || ''}</small>
            </td>
            <td>
                <strong>${issue.book_title || 'Unknown'}</strong><br>
                <small>${issue.book_isbn || ''}</small>
            </td>
            <td>${issue.issue_date ? new Date(issue.issue_date).toLocaleDateString() : '-'}</td>
            <td>${issue.return_date ? new Date(issue.return_date).toLocaleDateString() : '-'}</td>
            <td>${issue.actual_return_date ? new Date(issue.actual_return_date).toLocaleDateString() : '-'}</td>
            <td>
                ${issue.fine_amount > 0 
                    ? `<span class="fine-amount-text">₹${issue.fine_amount}</span>` 
                    : '<span class="text-muted">₹0</span>'}
            </td>
            <td><span class="status-badge status-returned">Returned</span></td>
        </tr>
    `).join('');
}

// Load issued books for return
async function loadIssuedBooksForReturn() {
    try {
        const response = await fetch('/issues?status=issued&limit=1000');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('returnIssue');
            select.innerHTML = '<option value="">Choose Issue Record</option>';
            
            data.data.forEach(issue => {
                const option = document.createElement('option');
                option.value = issue._id;
                option.textContent = `${issue.issue_id} - ${issue.member_name || issue.member_id} - ${issue.book_title || issue.book_id}`;
                option.setAttribute('data-return-date', issue.return_date || '');
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load issued books:', error);
    }
}

// Calculate fine
function calculateFine() {
    const returnIssue = document.getElementById('returnIssue');
    const returnDate = document.getElementById('returnDate');
    
    if (!returnIssue.value || !returnDate.value) return;
    
    // Get the expected return date from the selected option
    const selectedOption = returnIssue.options[returnIssue.selectedIndex];
    const expectedReturnDate = selectedOption.getAttribute('data-return-date');
    
    if (!expectedReturnDate) {
        document.getElementById('fineAmount').value = 0;
        return;
    }
    
    const expectedDate = new Date(expectedReturnDate);
    const actualDate = new Date(returnDate.value);
    
    // Compare date only (ignore time)
    const expected = new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate());
    const actual = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
    
    const daysLate = Math.floor((actual - expected) / (1000 * 60 * 60 * 24));
    const fine = daysLate > 0 ? daysLate * 5 : 0; // 5 rupees per day
    
    document.getElementById('fineAmount').value = fine;
}

// Handle return book
async function handleReturnBook(e) {
    e.preventDefault();
    
    const issueId = document.getElementById('returnIssue').value;
    const returnDate = document.getElementById('returnDate').value;
    
    if (!issueId) {
        showToast('Please select an issue record', 'error');
        return;
    }
    
    try {
        const response = await fetch('/return', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                issue_id: issueId,
                return_date: returnDate
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Book returned successfully. Fine: ₹${data.data.fine_amount}`, 'success');
            e.target.reset();
            document.getElementById('returnDate').valueAsDate = new Date();
            loadReturnData();
        } else {
            showToast(data.message || 'Failed to return book', 'error');
        }
    } catch (error) {
        console.error('Error returning book:', error);
        showToast('An error occurred', 'error');
    }
}

// ============ PROFILE FUNCTIONS ============

// Load profile data
async function loadProfileData() {
    try {
        const response = await fetch('/profile');
        const data = await response.json();
        
        if (data.success) {
            const profile = data.data;
            
            document.getElementById('profileFullName').value = profile.full_name || '';
            document.getElementById('profileEmail').value = profile.email || '';
            document.getElementById('profilePhone').value = profile.phone || '';
            document.getElementById('profileUsername').value = profile.username || '';
            document.getElementById('adminName').textContent = profile.full_name || profile.username || 'Admin';
            
            if (profile.profile_image) {
                const imageUrl = `/static/images/uploads/${profile.profile_image}`;
                document.getElementById('profileImage').src = imageUrl;
                document.getElementById('adminProfileImg').src = imageUrl;
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
        full_name: document.getElementById('profileFullName').value,
        email: document.getElementById('profileEmail').value,
        phone: document.getElementById('profilePhone').value
    };
    
    try {
        const response = await fetch('/profile', {
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

// Handle password change
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch('/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Password changed successfully', 'success');
            e.target.reset();
        } else {
            showToast(data.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('An error occurred', 'error');
    }
}

// Trigger image upload
function triggerImageUpload() {
    document.getElementById('imageInput').click();
}

// Upload profile image
async function uploadProfileImage(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    const formData = new FormData();
    formData.append('profile_image', file);
    
    try {
        const response = await fetch('/profile', {
            method: 'PUT',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update the profile image display
            const imageUrl = URL.createObjectURL(file);
            document.getElementById('profileImage').src = imageUrl;
            document.getElementById('adminProfileImg').src = imageUrl;
            
            showToast('Profile photo updated successfully', 'success');
        } else {
            showToast(data.message || 'Failed to upload photo', 'error');
        }
    } catch (error) {
        console.error('Error uploading profile image:', error);
        showToast('An error occurred', 'error');
    }
    
    // Reset input
    e.target.value = '';
}

// ============ SETTINGS FUNCTIONS ============

// Load settings data
async function loadSettingsData() {
    try {
        const response = await fetch('/settings');
        const data = await response.json();
        
        if (data.success) {
            const settings = data.data;
            
            document.getElementById('libraryName').value = settings.library_name || '';
            document.getElementById('libraryAddress').value = settings.address || '';
            document.getElementById('workingHours').value = settings.working_hours || '';
            document.getElementById('finePerDay').value = settings.fine_per_day || 5;
            document.getElementById('maxBooks').value = settings.max_books || 5;
            document.getElementById('issueDays').value = settings.max_issue_days || 14;
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Handle settings update
async function handleSettingsUpdate(e) {
    e.preventDefault();
    
    const data = {
        library_name: document.getElementById('libraryName').value,
        address: document.getElementById('libraryAddress').value,
        working_hours: document.getElementById('workingHours').value,
        fine_per_day: parseInt(document.getElementById('finePerDay').value),
        max_books: parseInt(document.getElementById('maxBooks').value),
        max_issue_days: parseInt(document.getElementById('issueDays').value)
    };
    
    try {
        const response = await fetch('/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Settings updated successfully', 'success');
        } else {
            showToast(result.message || 'Failed to update settings', 'error');
        }
    } catch (error) {
        console.error('Error updating settings:', error);
        showToast('An error occurred', 'error');
    }
}

// ============ PAYMENT FUNCTIONS ============

// Load payments (admin payment received section)
async function loadPayments(page = 1) {
    try {
        currentPage = page;
        const search = document.getElementById('paymentSearch')?.value || '';
        const status = document.getElementById('paymentStatusFilter')?.value || '';

        let url = `/payments?page=${page}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status) url += `&status=${status}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            displayPayments(data.data);
            displayPagination('paymentsPagination', data.pagination, 'loadPayments');
        }
    } catch (error) {
        console.error('Failed to load payments:', error);
        showToast('Failed to load payments', 'error');
    }

    // Load payment statistics
    loadPaymentStats();
}

// Display payments table
function displayPayments(payments) {
    const tbody = document.getElementById('paymentsTableBody');

    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No payments found</td></tr>';
        return;
    }

    tbody.innerHTML = payments.map(payment => {
        const status = (payment.status || 'pending').toLowerCase();
        const statusLabel = status === 'confirmed' ? 'Confirmed' : 'Pending';
        const statusClass = status === 'confirmed' ? 'status-confirmed' : 'status-pending';
        const member = payment.member || {};
        const bookTitles = (payment.book_titles || []).join(', ') || '-';

        return `
            <tr>
                <td>${payment.payment_id || payment._id}</td>
                <td>
                    <strong>${member.name || payment.member_name || 'Unknown'}</strong><br>
                    <small>${member.member_id || ''}</small>
                </td>
                <td>${member.membership_type || payment.membership_type || '-'}</td>
                <td><small>${bookTitles}</small></td>
                <td><span class="fine-amount-text">₹${payment.amount || 0}</span></td>
                <td>${payment.payment_method || '-'}</td>
                <td>${formatPaymentDate(payment.paid_at || payment.created_at)}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    ${payment.status === 'pending' 
                        ? `<button class="btn btn-sm btn-primary" onclick="confirmPayment('${payment._id}')">
                            <i class="fas fa-check"></i> Confirm
                        </button>`
                        : '<span class="text-muted">Done</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

// Load payment statistics
async function loadPaymentStats() {
    try {
        const response = await fetch('/payments/statistics');
        const data = await response.json();

        if (data.success) {
            const stats = data.data;
            document.getElementById('paymentsPendingCount').textContent = stats.pending_count || 0;
            document.getElementById('paymentsConfirmedCount').textContent = stats.confirmed_count || 0;
            document.getElementById('paymentsTotalAmount').textContent = '₹' + (stats.total_confirmed_amount || 0);
            document.getElementById('paymentsPendingAmount').textContent = '₹' + (stats.total_pending_amount || 0);
        }
    } catch (error) {
        console.error('Failed to load payment stats:', error);
    }
}

// Search payments
async function searchPayments() {
    loadPayments(1);
}

// Filter payments
function filterPayments() {
    loadPayments(1);
}

// Confirm a payment (librarian action)
async function confirmPayment(paymentId) {
    if (!confirm('Confirm this payment? The fine will be cleared from the member\'s account.')) return;

    try {
        const response = await fetch(`/payments/${paymentId}/confirm`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Payment confirmed. Fine cleared from member section.', 'success');
            loadPayments();
        } else {
            showToast(data.message || 'Failed to confirm payment', 'error');
        }
    } catch (error) {
        console.error('Error confirming payment:', error);
        showToast('An error occurred', 'error');
    }
}

// Format payment date
function formatPaymentDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (error) {
        return dateString;
    }
}

// ============ REPORTS FUNCTIONS ============

// Generate book report
async function generateBookReport() {
    try {
        const response = await fetch('/reports/books');
        const data = await response.json();
        
        if (data.success) {
            displayReportData(data.data);
            showToast('Report generated successfully', 'success');
        }
    } catch (error) {
        showToast('Failed to generate report', 'error');
    }
}

// Generate member report
async function generateMemberReport() {
    try {
        const response = await fetch('/reports/members');
        const data = await response.json();
        
        if (data.success) {
            displayReportData(data.data);
            showToast('Report generated successfully', 'success');
        }
    } catch (error) {
        showToast('Failed to generate report', 'error');
    }
}

// Generate issue report
async function generateIssueReport() {
    try {
        const response = await fetch('/reports/issues');
        const data = await response.json();
        
        if (data.success) {
            displayReportData(data.data);
            showToast('Report generated successfully', 'success');
        }
    } catch (error) {
        showToast('Failed to generate report', 'error');
    }
}

// Display report data
function displayReportData(data) {
    const content = document.getElementById('reportContent');
    
    // Determine the array to display
    let items = data.books || data.members || data.issues || [];
    
    if (!items || items.length === 0) {
        content.innerHTML = `
            <div class="report-empty">
                <h3>${data.title || 'Report'}</h3>
                <p>Generated: ${data.generated_at || ''}</p>
                <p>No records found.</p>
            </div>
        `;
        return;
    }
    
    // Get column headers from first item
    const headers = Object.keys(items[0]);
    
    content.innerHTML = `
        <h3>${data.title || 'Report'}</h3>
        <p>Generated: ${data.generated_at || ''}</p>
        <p>Total: ${data.total_books || data.total_members || data.total_issues || items.length}</p>
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        ${headers.map(key => `<th>${formatHeader(key)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item =>
                        `<tr>${headers.map(key => 
                            `<td>${formatCellValue(item[key])}</td>`
                        ).join('')}</tr>`
                    ).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Format header names for display
function formatHeader(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Format cell values
function formatCellValue(value) {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') {
        if (value instanceof Date) return value.toLocaleDateString();
        return JSON.stringify(value);
    }
    return String(value);
}

// Export report
async function exportReport() {
    const type = document.getElementById('exportType').value;
    
    try {
        window.location.href = `/reports/export/csv?type=${type}`;
        showToast('Report exported successfully', 'success');
    } catch (error) {
        showToast('Failed to export report', 'error');
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

// Global search
async function globalSearch() {
    const query = document.getElementById('globalSearch').value.trim();
    
    if (!query) return;
    
    try {
        // Search books
        const bookResponse = await fetch(`/books?search=${encodeURIComponent(query)}&limit=5`);
        const bookData = await bookResponse.json();
        
        // Search members
        const memberResponse = await fetch(`/members?search=${encodeURIComponent(query)}&limit=5`);
        const memberData = await memberResponse.json();
        
        // Build results
        let results = [];
        
        if (bookData.success && bookData.data.length > 0) {
            results.push({ type: 'Books', items: bookData.data.map(b => ({
                name: b.title,
                detail: `${b.author} • ${b.isbn}`,
                id: b._id
            }))});
        }
        
        if (memberData.success && memberData.data.length > 0) {
            results.push({ type: 'Members', items: memberData.data.map(m => ({
                name: m.name,
                detail: `${m.email} • ${m.member_id}`,
                id: m._id
            }))});
        }
        
        if (results.length === 0) {
            showToast('No results found for "' + query + '"', 'info');
            return;
        }
        
        // Show results summary
        let message = `Found ${results.reduce((sum, r) => sum + r.items.length, 0)} result(s):\n`;
        results.forEach(group => {
            message += `\n${group.type}:\n`;
            group.items.forEach(item => {
                message += `  • ${item.name} (${item.detail})\n`;
            });
        });
        
        // Navigate to relevant page and populate search
        if (bookData.data.length > 0) {
            navigateTo('books');
            document.getElementById('bookSearch').value = query;
            loadBooks(1);
        } else if (memberData.data.length > 0) {
            navigateTo('members');
            document.getElementById('memberSearch').value = query;
            loadMembers(1);
        }
        
        showToast(`Found ${bookData.data.length} book(s), ${memberData.data.length} member(s)`, 'info');
    } catch (error) {
        console.error('Global search error:', error);
    }
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
        const response = await fetch('/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const addBookModal = document.getElementById('addBookModal');
    const addMemberModal = document.getElementById('addMemberModal');
    const editBookModal = document.getElementById('editBookModal');
    const editMemberModal = document.getElementById('editMemberModal');
    const categoryModal = document.getElementById('categoryModal');
    
    if (event.target === addBookModal) {
        addBookModal.style.display = 'none';
    }
    if (event.target === addMemberModal) {
        addMemberModal.style.display = 'none';
    }
    if (event.target === editBookModal) {
        editBookModal.style.display = 'none';
    }
    if (event.target === editMemberModal) {
        editMemberModal.style.display = 'none';
    }
    if (event.target === categoryModal) {
        categoryModal.style.display = 'none';
    }
}
