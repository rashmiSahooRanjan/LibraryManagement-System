#!/bin/bash

# Smart Library Management System - Run Script

echo "================================================"
echo "Smart Library Management System"
echo "================================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3.10 or higher."
    exit 1
fi

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  .env file not found!"
    echo "Please create a .env file with MongoDB connection string."
    echo "Example:"
    echo "MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/library_db"
    echo ""
    exit 1
fi

# Run Flask application
echo ""
echo "Starting Flask application..."
echo "🚀 Access the application at http://localhost:5000"
echo ""
python app.py
