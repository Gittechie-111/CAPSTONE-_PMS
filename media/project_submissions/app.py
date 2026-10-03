from flask import Flask, jsonify
from flask_cors import CORS
from database import close_db
from routes.task_routes import task_bp

# Create Flask app
app = Flask(__name__)

# Allow requests from other domains (like React frontend)
CORS(app)

# Register task routes
app.register_blueprint(task_bp)

# Close database connection after each request
app.teardown_appcontext(close_db) #This ensures close_db() runs automatically after each request, regardless of success or failure.

@app.route('/')
def home():
    """Root URL - Show available endpoints"""
    return jsonify({
        "message": "Task Manager API",
        "endpoints": {
            "GET /api/tasks": "Get all tasks",
            "GET /api/tasks/{id}": "Get one task",
            "POST /api/tasks": "Create task",
            "PUT /api/tasks/{id}": "Update task",
            "DELETE /api/tasks/{id}": "Delete task"
        }
    })

if __name__ == '__main__':
    # Start the server
    app.run(debug=True, port=5000)
