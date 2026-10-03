#This code reads secret information from your .env file so your app can use it.

import os #gives Python the ability to read environment variables (settings from outside the code)
from dotenv import load_dotenv #imports a function that can read your .env file

# Load variables from .env file
load_dotenv()

class Config:
    # Database connection settings
    DB_CONFIG = {
        'host': os.getenv('DB_HOST'),
        'user': os.getenv('DB_USER'),
        'password': os.getenv('DB_PASSWORD'),
        'database': os.getenv('DB_NAME')
    }
    SECRET_KEY = os.getenv('SECRET_KEY')
