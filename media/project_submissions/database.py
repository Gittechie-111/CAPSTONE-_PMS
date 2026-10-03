import mysql.connector # The tool that talks to MySQL
from flask import g  # g = "global" - temporary storage for ONE request
from config import Config  # Your database settings (host, user, password)

# def get_db():    
#     # When your API needs the database, it calls get_db()

# #     It checks if there's already a connection stored in g

# #     If NO connection exists → creates a new MySQL connection

# #     If YES connection exists → reuses the existing one

# #     Returns the connection so your code can run queries

# # The ** unpacks your Config
#     """Get database connection for current request"""
#     if 'db' not in g:
#         # Connect to MySQL using settings from config
#         g.db = mysql.connector.connect(**Config.DB_CONFIG)
#     return g.db

# def close_db(e=None):
#     """Close database connection after request ends"""
#     db = g.pop('db', None)
#     if db is not None:
#         db.close()
    # After Flask finishes handling an API request, it calls this function

    # It takes the connection out of g (.pop() removes it)

    # If there was a connection, it closes it

    # This prevents "too many connections" errors

# How it works in real life:
# When you make an API call:
# 1. GET /api/tasks                 (you make request)
# 2. Flask creates a new 'g' object  (empty storage)
# 3. Your code calls get_db()        (needs database)
# 4. get_db() creates connection     (mysql connects)
# 5. Your code runs queries          (gets data)
# 6. Flask finishes request          
# 7. close_db() runs automatically   (closes connection)
# 8. 'g' is destroyed                (cleanup done)
# Why use 'g'? Creates a single connection to MySQL that can be reused during a request
#(A sticky note that only lasts while I'm handling this one request)

# Without 'g', every function would create its own connection which is inefficient

def get_db(): #Creates and returns a database connection
    if 'db' not in g: #checks for existing connection
        #exception handling for debugging
        try:
             g.db = mysql.connector.connect(**Config.DB_CONFIG)
        except mysql.connector.Error as e:
            print(f"Connection failed: {e}")
            return None #if there's no connection db returns nothing
        return g.db #return existing connection

def close_db(e=None):
    db =g.pop('db', None) #Removes connection from g (.pop()), If there's no handle: Just get None (nothing)
    if db is not None: #Closes it only if it existed
        db.close() #Properly closes the connection when done so we don't leave connections hanging open






