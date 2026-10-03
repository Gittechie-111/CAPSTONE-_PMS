import pymysql
from django.db.backends.base.base import BaseDatabaseWrapper

pymysql.install_as_MySQLdb()

# Bypass the strict Django 6.1 version check for MySQL 8.0
BaseDatabaseWrapper.check_database_version_supported = lambda self: None
