#Set of instructions that tells your app how to talk to the MySQL database.
from database import get_db
from mysql.connector import Error

class Task:
    @staticmethod #A label that says "This function doesn't need to remember anything between uses" eg You don't need to remember past recipes to cook a new one!
    def get_all():
        """Get all tasks from database"""
        db = get_db()
        if db is None: #checking if db connection exists
            print("❌ No database connection")
            return []
            
        try:
            cursor = db.cursor(dictionary=True) # Get a notepad
            cursor.execute("SELECT * FROM tasks ORDER BY created_at DESC") #Show newest tasks first
            tasks = cursor.fetchall() #fetch all tasks
            cursor.close() #close notepad
            return tasks #give tasks back
        #if something goes wrong
        except Error as e: 
            print(f"❌ Error in get_all: {e}")
            return []
    
    @staticmethod
    def get_by_id(task_id):
        """Get one task by ID"""
        db = get_db()
        if db is None:
            print("❌ No database connection in get_by_id")
            return None
            
        try:
            cursor = db.cursor(dictionary=True)
            cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,)) #The comma in (task_id,) is important! It makes it a tuple (a list of one item).
            task = cursor.fetchone()
            cursor.close()
            return task
        except Error as e:
            print(f"❌ Error in get_by_id: {e}")
            return None
    
    @staticmethod
    def create(title, description):
        """Create new task"""
        db = get_db()
        if db is None:
            print("❌ No database connection in create")
            return None
            
        try:
            
            cursor = db.cursor(dictionary=True)
            #Step 1: Insert new task
            cursor.execute(
                "INSERT INTO tasks (title, description) VALUES (%s, %s)",
                (title, description)
            )
            #Step 2: save changes permanently
            db.commit()
            #Step 3: get ID of the new task
            task_id = cursor.lastrowid

          # Step 4: Fetch the new task using the SAME cursor
            cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            new_task = cursor.fetchone()
            cursor.close()

            return new_task
            
        except Error as e:
            print(f"❌ Error in create: {e}")
            db.rollback() # "UNDO everything if something went wrong"
            return None
    
    @staticmethod
    def update(task_id, data):
        """Update existing task"""
        db = get_db()
        if db is None:
            print("❌ No database connection in update")
            return None
        
        try:
            cursor = db.cursor(dictionary=True)
            
            # FIRST: Check if task exists
            cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            existing = cursor.fetchone()
            
            if not existing:
                print(f"❌ Task {task_id} not found in database")
                cursor.close()
                return None
                
            print(f"✅ Found task to update: {existing}")
            
            # Build updates
            updates = []
            values = []
            
            if 'title' in data:
                updates.append("title = %s")
                values.append(data['title'])
                
            if 'description' in data:
                updates.append("description = %s")
                values.append(data['description'])
                
            if 'completed' in data:
                updates.append("completed = %s")
                # Convert bool to int for MySQL
                mysql_bool = 1 if data['completed'] else 0
                values.append(mysql_bool)
            
            if not updates:
                # No changes, return existing task
                cursor.close()
                return existing
            
            # Add task_id at the end
            values.append(task_id)
            query = f"UPDATE tasks SET {', '.join(updates)} WHERE id = %s"
            
            print(f"Executing: {query}")
            print(f"Values: {values}")
            
            cursor.execute(query, values)
            db.commit()
            
            # Get the updated task
            cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            updated = cursor.fetchone()
            cursor.close()
            
            print(f"✅ Updated task: {updated}")
            return updated
            
        except Error as e:
            print(f"❌ Error in update: {e}")
            db.rollback()
            return None
    
    @staticmethod
    def delete(task_id):
        """Delete task"""
        db = get_db()
        if db is None:
            print("❌ No database connection in delete")
            return False
            
        try:
            cursor = db.cursor()
            cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
            db.commit()
            cursor.close()
            return True
        except Error as e:
            print(f"❌ Error in delete: {e}")
            db.rollback()
            return False


# class Task:
#     @staticmethod
#     def get_all():
#         db = get_db()
#         if db is None:
#             print("No database connection in get_all()")
#             return None
#         try:
#             cursor = db.cursor(dictionary=True)
#             cursor.execute("SELECT * FROM tasks ORDER BY  created_at DESC")
#             tasks = cursor.fetchall()
#             cursor.close()
#             return tasks
#         except Error as e:
#             print(f"Error in get_all: {e}")
#             return None
        
#     @staticmethod
#     def get_by_id(task_id):
#         db = get_db()
#         if db is None:
#             print("No database connection in get_by_id")
#             return None
#         try:
#             cursor = db.cursor(dictionary=True)
#             cursor.execute("SELECT * FROM tasks WHERE ID=%s", (task_id,))
#             task = cursor.fetchone()
#             cursor.close()
#             return task
#         except Error as e:
#             print(f"Error in get_by_id: {e}")
#             return None
        
#     @staticmethod
#     def create(title, description):
#         db = get_db()
#         if db is None:
#             print("No database connection in create")
#             return None
#         try:
#             cursor = db.cursor()
#             cursor.execute("INSERT INTO tasks (title, description) VALUES(%s, %s)", (title, description))
#             db.commit()
#             task_id = cursor.lastrowid
#             cursor.execute("SELECT * FROM tasks WHERE ID=%s", (task_id,))
#             new_task = cursor.fetchone()
#             cursor.close()
#             return new_task
#         except Error as e:
#             print(f"Error in create: {e}")
#             db.rollback()
#             return None
        
#     @staticmethod
#     def update(task_id, data):
#         db = get_db()
#         if db is None:
#             print("No database connection in update")
#             return None
#         try:
#             cursor = db.cursor()
#             updates = []
#             values = []

#             if 'title' in data:
#                 updates.append("title=%s")
#                 values.append(data['title'])
#             if 'description' in data:
#                 updates.append("description'=%s")
#                 values.append(data['description'])
#             if 'completed' in data:
#                 updates.append("completed=%s")
#                 values.append(data['completed'])

#             if not updates:
#                 return Task.get_by_id(task_id)

#             values.append(task_id)
#             query = ("UPDATE tasks SET {', '.join(updates)} WHERE ID=%s")
#             cursor.execute(query, values)
#             db.commit()
#             cursor.close()
#             return Task.get_by_id(task_id)
#         except Error as e:
#             print(f"Error in update: {e}")
#             db.rollback()
#             return None
        
#     @staticmethod
#     def delete(task_id):
#         db = get_db()
#         if db is None:
#             print("No database connection in delete")
#             return False
#         try:
#             cursor = db.cursor()
#             cursor.execute("DELETE FROM tasks WHERE ID=%s", (task_id,))
#             db.commit()
#             cursor.close()
#             return True
#         except Error as e:
#             print(f"Error in delete: {e}")
#             return False


