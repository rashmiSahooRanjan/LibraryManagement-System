"""
Smart Library Management System - Main Application
"""
import os
from flask import Flask, render_template, redirect, url_for, session
from flask_cors import CORS
from config import config
from database.mongodb import DatabaseInit, mongo
from routes import auth_bp, books_bp, members_bp, issue_bp, settings_bp, member_bp, payments_bp


def create_app(config_name=None):
    """Create and configure Flask application"""
    
    # Determine config
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    
    config_obj = config.get(config_name, config['default'])
    
    # Create Flask app
    app = Flask(__name__)
    app.config.from_object(config_obj)
    
    # Initialize extensions
    CORS(app)
    DatabaseInit.init_db(app)
    mongo.init_app(app)
    
    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(books_bp)
    app.register_blueprint(members_bp)
    app.register_blueprint(issue_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(member_bp)
    app.register_blueprint(payments_bp)
    
    # Main routes
    @app.route('/')
    def index():
        """Redirect to dashboard if logged in, else to login"""
        if 'admin_id' in session:
            return redirect(url_for('dashboard'))
        if 'member_id' in session:
            return redirect(url_for('member.dashboard'))
        return redirect(url_for('auth.login'))
    
    @app.route('/dashboard')
    def dashboard():
        """Dashboard page (admin only)"""
        if 'member_id' in session and 'admin_id' not in session:
            return redirect(url_for('member.dashboard'))
        if 'admin_id' not in session:
            return redirect(url_for('auth.login'))
        return render_template('dashboard.html')
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors"""
        return {'success': False, 'message': 'Resource not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors"""
        return {'success': False, 'message': 'Internal server error'}, 500
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle 401 errors"""
        return {'success': False, 'message': 'Unauthorized'}, 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle 403 errors"""
        return {'success': False, 'message': 'Forbidden'}, 403
    
    # Serve static files
    @app.route('/static/<path:filename>')
    def static_files(filename):
        """Serve static files"""
        return app.send_static_file(filename)
    
    return app


# Create app for Gunicorn
app = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=False
    )
