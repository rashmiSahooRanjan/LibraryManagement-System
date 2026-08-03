# Smart Library Management System

A comprehensive Library Management System built with Python Flask, MongoDB, HTML5, CSS3, and Vanilla JavaScript. This is a complete production-ready application for managing books, members, issues, returns, and fine calculations.

## Features

✅ **Authentication System**
- Admin Registration and Login
- Session Management
- Password Hashing with bcrypt
- Forgot Password Functionality
- Remember Me Option

✅ **Student & Teacher Portal**
- Separate Student and Teacher login (tabbed)
- Browse and search library books
- View personal issued books with issue & due dates
- Live fine calculation for overdue books
- View new book arrivals
- Update personal profile
- Role-based theming (blue for Student, purple for Teacher)

✅ **Dashboard**
- Real-time Statistics Cards (Total Books, Available Books, Issued Books, Members)
- Dynamic Charts (Issue Statistics, Book Categories)
- Quick Actions
- Recent Activities

✅ **Book Management**
- Add, Edit, Delete Books
- Book Search (by Title, Author, ISBN, Category)
- Category Management
- Book Cover Image Upload
- Inventory Tracking
- Stock Management

✅ **Member Management**
- Add, Edit, Delete Members
- Member Search
- Multiple Membership Types (Student, Teacher, Guest)
- Profile Management with Image Upload
- Member Status Tracking

✅ **Book Issue & Return**
- Issue Books to Members
- Return Books with Fine Calculation
- Automatic Fine Calculation
- Overdue Book Tracking
- Issue History
- Fine Payment Tracking

✅ **Reports**
- Book Reports
- Member Reports
- Issue Reports
- Export to CSV
- PDF Export Ready

✅ **User Profile**
- Update Personal Information
- Change Password
- Profile Picture Upload

✅ **Settings**
- Library Configuration
- Fine Settings
- Maximum Books Setting
- Issue Days Configuration
- Logo Upload

✅ **Security**
- Password Hashing
- Session Management
- CSRF Protection
- Input Validation
- MongoDB Injection Prevention
- Server-side Validation

✅ **Responsive Design**
- Mobile-friendly Interface
- Dark Blue Professional Theme
- Smooth Animations
- Loading Spinners
- Toast Notifications

## Technology Stack

**Frontend:**
- HTML5
- CSS3 (Responsive, Modern Design)
- Vanilla JavaScript (No Framework)
- Chart.js for Analytics

**Backend:**
- Python 3.10+
- Flask 2.3.2
- Flask-PyMongo
- Flask-CORS

**Database:**
- MongoDB Atlas (Cloud)

**Security:**
- Bcrypt for Password Hashing
- Flask Sessions
- CSRF Protection
- Input Validation

## Project Structure

```
library-management/
│
├── app.py                          # Main Flask Application
├── config.py                       # Configuration File
├── requirements.txt                # Python Dependencies
├── .env                           # Environment Variables
├── README.md                      # Documentation
│
├── models/                        # Data Models
│   ├── __init__.py
│   ├── User.py                   # Admin/User Model
│   ├── Book.py                   # Book Model
│   ├── Member.py                 # Member Model
│   ├── Issue.py                  # Issue/Return Model
│   └── Category.py               # Category Model
│
├── routes/                       # API Routes
│   ├── __init__.py
│   ├── auth.py                  # Authentication Routes
│   ├── books.py                 # Book Management Routes
│   ├── members.py               # Member Management Routes
│   ├── issue.py                 # Issue/Return Routes
│   └── settings.py              # Settings & Reports Routes
│
├── database/                    # Database Configuration
│   ├── __init__.py
│   └── mongodb.py              # MongoDB Connection & Operations
│
├── utils/                      # Utility Functions
│   ├── __init__.py
│   ├── validation.py           # Input Validation
│   └── helpers.py              # Helper Functions
│
├── static/                     # Static Files
│   ├── css/
│   │   └── style.css          # Main Stylesheet
│   ├── js/
│   │   └── dashboard.js       # Dashboard JavaScript
│   └── images/
│       └── uploads/           # User Uploaded Images
│
└── templates/                 # HTML Templates
    ├── login.html            # Login Page
    ├── register.html         # Registration Page
    ├── dashboard.html        # Main Dashboard
    ├── books.html           # Books Management
    ├── members.html         # Members Management
    ├── issue.html          # Book Issue
    ├── return.html         # Book Return
    ├── reports.html        # Reports
    ├── profile.html        # User Profile
    └── settings.html       # Settings
```

## Installation & Setup

### Prerequisites
- Python 3.10 or higher
- MongoDB Atlas Account (Free Tier Available)
- Git
- pip (Python Package Manager)

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd library-management
```

### Step 2: Create Virtual Environment
```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Configure MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a Free Account or Sign In
3. Create a New Cluster (Choose Free Tier)
4. Wait for Cluster to Deploy (3-5 minutes)
5. Click "Connect" Button
6. Choose "Connect Your Application"
7. Copy the Connection String
8. Replace `<username>` and `<password>` with your credentials

### Step 5: Create .env File
Create a `.env` file in the root directory with the following content:

```env
# Flask Configuration
FLASK_ENV=development
DEBUG=True
SECRET_KEY=your-secret-key-change-in-production-12345

# MongoDB Atlas Configuration
# Replace username, password, and cluster name
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/library_db?retryWrites=true&w=majority

# Library Settings
LIBRARY_NAME=Smart Library
MAX_BOOKS=5
ISSUE_DAYS=14
FINE_PER_DAY=5
```

### Step 6: Run Application
```bash
# Development Mode
python app.py

# Or using Flask CLI
flask run

# Access at http://localhost:5000
```

## First Time Setup

1. **Navigate to Registration**: http://localhost:5000/register
2. **Create Admin Account**: Fill in all required details
3. **Login**: Use credentials to login
4. **Setup Library**: Go to Settings and configure
5. **Add Categories**: Create book categories
6. **Add Books**: Start adding books to the library
7. **Add Members**: Add library members
8. **Issue Books**: Start issuing books to members

## Default Credentials
After registration, use your created credentials.

## Self-Registration (Student, Teacher & Librarian)

Anyone can create an account by choosing their role on the **Register** page:

1. Go to **http://localhost:5000/register**
2. Select one of the three **radio cards**:
   - 🎓 **Student** → registers as a Student, auto-opens the **Student dashboard**
   - 🧑‍🏫 **Teacher** → registers as a Teacher, auto-opens the **Teacher dashboard**
   - 👔 **Librarian** → registers as a Librarian (admin), auto-opens the **Admin dashboard**
3. Fill in your details (Full Name, Email, Phone, Username, Password)
4. Student/Teacher also provide **Department** and **Roll Number** (optional)
5. Click **Create Account** — you are **automatically logged in** and taken to the correct dashboard

### Role-Based Auto-Redirect
| Selected Role | Account Created In | Redirected To |
|---------------|-------------------|---------------|
| Student | `members` (membership_type=Student) | `/member/dashboard` |
| Teacher | `members` (membership_type=Teacher) | `/member/dashboard` |
| Librarian | `admins` | `/dashboard` |

### Login Pages
- **Student / Teacher** → `http://localhost:5000/member/login` (Student or Teacher tab)
- **Librarian / Admin** → `http://localhost:5000/login` (the Librarian tab on the member login page redirects here)

## Member Portal Setup (Student & Teacher Login)

Members (Students & Teachers) can log in to their own portal at:
```
http://localhost:5000/member/login
```

### How Members Get Login Credentials

1. **Admin creates a member** (Members page → Add Member):
   - The "Add Member" form now includes **Username** and **Password** fields for portal login.
   - If left blank:
     - **Username** is auto-generated from the email prefix (e.g., `john.doe`).
     - **Password** defaults to `Member@123`.
   - After adding, the admin sees an alert with the generated credentials.

2. **Existing members** (created before this feature) can log in with:
   - **Username**: their email address
   - **Password**: `Member@123` (default fallback)
   - *Note:* After first login, members should update their phone/address in the Profile page.

### Portal Features
- **Dashboard**: Overview of total books, available books, books currently with the member, new arrivals, and pending fines.
- **Browse Books**: Search books by title, author, ISBN, or filter by category.
- **My Issued Books**: Full issue history with issue date, due date, return date, status, and fine amounts (live overdue fine calculation).
- **New Arrivals**: Books added to the library in the last 30 days.
- **My Profile**: View and update personal contact information.

### Login Tabs
- **Student tab**: Only Student accounts can log in here.
- **Teacher tab**: Only Teacher accounts can log in here.
- The system verifies the member type matches the selected tab.

### Security
- Member passwords are hashed with bcrypt (same as admins).
- Member sessions are separate from admin sessions.
- The admin dashboard remains accessible only to admins.

## API Endpoints

### Authentication
- `POST /register` - Register new admin
- `POST /login` - Login admin
- `POST /logout` - Logout admin
- `GET /verify-session` - Verify session
- `POST /forgot-password` - Forgot password

### Books
- `GET /books` - Get all books (paginated)
- `GET /books/<id>` - Get single book
- `POST /books` - Create book
- `PUT /books/<id>` - Update book
- `DELETE /books/<id>` - Delete book
- `GET /books/search/<type>` - Search books
- `GET /books/category/<name>` - Get books by category
- `GET /categories` - Get all categories
- `POST /categories` - Create category
- `PUT /categories/<id>` - Update category
- `DELETE /categories/<id>` - Delete category

### Members
- `GET /members` - Get all members (paginated)
- `GET /members/<id>` - Get single member
- `POST /members` - Create member
- `PUT /members/<id>` - Update member
- `DELETE /members/<id>` - Delete member
- `GET /members/search/<type>` - Search members
- `GET /members/status/<status>` - Get by status

### Issue & Return
- `POST /issue` - Issue book
- `GET /issues` - Get issued books
- `POST /return` - Return book
- `GET /overdue-books` - Get overdue books
- `GET /today-issues` - Today's issues
- `GET /today-returns` - Today's returns

### Reports & Settings
- `GET /settings` - Get settings
- `PUT /settings` - Update settings
- `GET /profile` - Get admin profile
- `PUT /profile` - Update profile
- `POST /change-password` - Change password
- `GET /reports/books` - Book report
- `GET /reports/members` - Member report
- `GET /reports/issues` - Issue report
- `GET /reports/export/csv` - Export CSV
- `GET /dashboard-stats` - Dashboard statistics

### Student & Teacher Portal
- `GET /member/login` - Member login page (Student/Teacher tabs)
- `POST /member/login` - Member login handler
- `POST /member/logout` - Member logout
- `GET /member/verify-session` - Verify member session
- `GET /member/dashboard` - Member portal dashboard
- `GET /member/api/dashboard-stats` - Member dashboard stats (incl. pending fines)
- `GET /member/api/books` - Browse/search books (paginated)
- `GET /member/api/books/new` - Newly added books (last 30 days)
- `GET /member/api/categories` - All book categories
- `GET /member/api/my-issues` - Member's issue history with fines
- `GET /member/api/profile` - Get member profile
- `PUT /member/api/profile` - Update member profile

## Database Collections

### admins
- _id, username, email, phone, full_name, password, profile_image, status, created_at, updated_at, last_login

### books
- _id, book_id, isbn, title, author, publisher, category, language, edition, publication_year, price, quantity, available_quantity, shelf_number, cover_image, description, status, created_at, updated_at

### members
- _id, member_id, name, gender, dob, phone, email, address, college, department, roll_number, membership_type, profile_image, status, joining_date, created_at

### categories
- _id, name, description, created_at, updated_at

### issued_books
- _id, issue_id, member_id, book_id, issue_date, return_date, actual_return_date, status, fine_amount, fine_paid, created_at, updated_at

### returned_books
- _id, issue_id, member_id, book_id, return_date, fine_amount, created_at

### fine_payments
- _id, issue_id, member_id, amount, reason, paid, paid_date, created_at, updated_at

### activity_logs
- _id, admin_id, action, description, details, timestamp, ip_address

### settings
- _id, library_name, logo, address, working_hours, max_books, max_issue_days, fine_per_day, updated_at

## Fine Calculation
- 1 Day Late: ₹5
- 2 Days Late: ₹10
- Every Extra Day: ₹5 per day

## Security Features

1. **Password Security**: Bcrypt hashing with salt
2. **Session Management**: Secure session cookies
3. **CSRF Protection**: Flask built-in CSRF protection
4. **Input Validation**: Client and server-side validation
5. **Database Security**: MongoDB connection string in environment variables
6. **SQL Injection Prevention**: Using MongoDB parameterized queries
7. **XSS Protection**: HTML escaping in templates

## Validation Rules

### Registration/Login
- Username: 3+ characters, alphanumeric and underscore only
- Password: 6+ characters, must include uppercase, lowercase, numbers
- Email: Valid email format
- Phone: 10 digits

### Books
- ISBN: Valid ISBN-10 or ISBN-13
- Title: Required
- Author: Required
- Category: Required
- Quantity: Positive number

### Members
- Name: Required
- Email: Valid email, unique
- Phone: 10 digits, valid format
- Membership Type: Student, Teacher, or Guest

## Testing

### Test Credentials (Create your own during registration)
- Username: admin
- Email: admin@library.com
- Phone: 9999999999
- Password: Admin@123

### Test Book Data
- ISBN: 9788189490234
- Title: The Alchemist
- Author: Paulo Coelho
- Publisher: HarperCollins

## Troubleshooting

### MongoDB Connection Error
```
Error: "Could not connect to MongoDB"
```
**Solution**: 
- Verify MongoDB Atlas connection string in .env
- Check username and password
- Ensure IP is whitelisted in MongoDB Atlas security settings
- Check internet connection

### Port Already in Use
```
Error: "Address already in use"
```
**Solution**:
```bash
# Change port in app.py or use:
flask run --port 5001
```

### Module Import Error
```
Error: "No module named 'flask'"
```
**Solution**:
```bash
pip install -r requirements.txt
```

### Image Upload Not Working
**Solution**:
- Ensure `static/images/uploads/` folder exists
- Check file permissions
- Verify file size is under 5MB

## Performance Optimization

1. **Database Indexing**: Indexes created on frequently queried fields
2. **Pagination**: Limited results per page to improve performance
3. **Lazy Loading**: Charts load asynchronously
4. **Caching**: Browser caching enabled for static files
5. **Minification**: CSS and JS can be minified for production

## Deployment

### Production Deployment (Heroku, AWS, etc.)

1. Update .env with production values:
```env
FLASK_ENV=production
DEBUG=False
SECRET_KEY=generate-secure-key
```

2. Use production server:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

3. Set environment variables on hosting platform

4. Ensure MongoDB Atlas allows connections from production server IP

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check README troubleshooting section
2. Review MongoDB Atlas documentation
3. Check Flask documentation
4. Open an issue on GitHub

## Future Enhancements

- [ ] Email notifications for overdue books
- [ ] SMS notifications
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Barcode scanning for books
- [ ] QR code generation for members
- [ ] Online book renewal system
- [ ] Email receipts and confirmations
- [ ] Book rating and reviews

## Changelog

### Version 1.0.0 (Initial Release)
- Complete CRUD operations for books and members
- Book issue and return system
- Automatic fine calculation
- User authentication and authorization
- Dashboard with statistics
- Reports generation
- Profile management
- Settings configuration
- Responsive design
- Production-ready code

## Contact

For questions and support, please contact the development team - https://portfolio-yxmp.onrender.com/

---

**Happy Library Management! 📚**

Built with ❤️ using Python, Flask, and MongoDB
