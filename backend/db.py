"""
db.py — MySQL (XAMPP) နှင့် ချိတ်ဆက်ခြင်း
-------------------------------------------------
mysql-connector-python ကို အသုံးပြုသည်။
connection pool ဖြင့် performance ကောင်းအောင် ပြုလုပ်ထားသည်။
"""

import os
from contextlib import contextmanager

import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "rice_market"),
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
}

# Connection pool တစ်ခုတည်းဆောက်ထားသည် (lazy init)
_pool = None


def get_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="rice_pool",
            pool_size=5,
            **DB_CONFIG,
        )
    return _pool


@contextmanager
def get_cursor(dictionary=True, commit=False):
    """
    with get_cursor() as (cur, conn):
        cur.execute(...)
    """
    conn = get_pool().get_connection()
    cur = conn.cursor(dictionary=dictionary)
    try:
        yield cur, conn
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def query_all(sql, params=None):
    with get_cursor() as (cur, _):
        cur.execute(sql, params or ())
        return cur.fetchall()


def query_one(sql, params=None):
    with get_cursor() as (cur, _):
        cur.execute(sql, params or ())
        return cur.fetchone()


def execute(sql, params=None):
    """INSERT / UPDATE / DELETE — last row id ကို ပြန်ပေးသည်"""
    with get_cursor(commit=True) as (cur, _):
        cur.execute(sql, params or ())
        return cur.lastrowid
# -------------------------------------------------
# Heatmap အတွက် သီးသန့် Helper Functions များ
# -------------------------------------------------

def save_heatmap_price(region_name, year, month, week_label, price, color_level):
    """
    MRF Data အစစ်ကို region_prices Table ထဲသို့ ထည့်ခြင်း / Update လုပ်ခြင်း
    """
    sql = """
        INSERT INTO region_prices (region_name, year, month, week_label, price, color_level)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            price = VALUES(price),
            color_level = VALUES(color_level)
    """
    return execute(sql, (region_name, year, month, week_label, price, color_level))


def get_heatmap_data(year, month):
    """
    Frontend က လနှင့် နှစ် ရွေးလိုက်သည့်အခါ အဆိုပါလ၏ ပတ်စဉ် Data များကို ဆွဲထုတ်ပေးခြင်း
    """
    sql = """
        SELECT region_name, year, month, week_label, price, color_level
        FROM region_prices
        WHERE year = %s AND month = %s
        ORDER BY region_name, week_label
    """
    return query_all(sql, (year, month))

import mysql.connector
import datetime
import decimal

# Database Connection setup
def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="rice_market"
    )

# -------------------------------------------------
# JSON Data Serializer Helper (Date & Decimal Type များ ပြောင်းလဲရန်)
# -------------------------------------------------
def serialize_data(data):
    if isinstance(data, list):
        return [serialize_data(item) for item in data]
    if isinstance(data, dict):
        new_dict = {}
        for key, value in data.items():
            if isinstance(value, (datetime.date, datetime.datetime)):
                new_dict[key] = value.isoformat()
            elif isinstance(value, decimal.Decimal):
                new_dict[key] = float(value)
            else:
                new_dict[key] = value
        return new_dict
    return data

# -------------------------------------------------
# Database Helper Functions (execute, query_one, query_all)
# -------------------------------------------------
def execute(sql, params=()):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    conn.commit()
    cursor.close()
    conn.close()

def query_one(sql, params=()):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(sql, params)
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return serialize_data(result) if result else None

def query_all(sql, params=()):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(sql, params)
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return serialize_data(results)

# -------------------------------------------------
# 1. Rice Varieties Functions
def get_all_rice():
    sql = """
        SELECT 
            rice_id AS id, 
            rice_name AS name, 
            rice_photo AS image, 
            rice_type AS type, 
            description 
        FROM rice_catalog 
        ORDER BY rice_id ASC
    """
    return query_all(sql)
def get_rice_by_id(rice_id):
    rice = query_one("SELECT * FROM rice_varieties WHERE id = %s", (rice_id,))
    if rice:
        guide_rows = query_all("SELECT step_text FROM rice_guides WHERE rice_id = %s", (rice_id,))
        rice['guide'] = [row['step_text'] for row in guide_rows]
    return rice

def update_rice(rice_id, name, badge, description, image, rice_type, price, origin, main_region, soil, harvest, recommendation):
    sql = """
        UPDATE rice_varieties 
        SET name = %s, badge = %s, description = %s, image = %s, type = %s, 
            price = %s, origin = %s, main_region = %s, soil = %s, harvest = %s, recommendation = %s
        WHERE id = %s
    """
    execute(sql, (name, badge, description, image, rice_type, price, origin, main_region, soil, harvest, recommendation, rice_id))

def add_rice(rice_id, name, badge, description, image, rice_type, price, origin, main_region, soil, harvest, recommendation):
    sql = """
        INSERT INTO rice_varieties 
        (id, name, badge, description, image, type, price, origin, main_region, soil, harvest, recommendation) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    execute(sql, (rice_id, name, badge, description, image, rice_type, price, origin, main_region, soil, harvest, recommendation))

def delete_rice(rice_id):
    execute("DELETE FROM rice_varieties WHERE id = %s", (rice_id,))

# -------------------------------------------------
# 2. Price History & Notification Functions
# -------------------------------------------------
def add_price_record(rice_name, week_no, price, record_date):
    sql = """
        INSERT INTO price_history (rice_name, week_no, price, record_date)
        VALUES (%s, %s, %s, %s)
    """
    execute(sql, (rice_name, week_no, price, record_date))

def get_previous_week_price(rice_name, week_no):
    prev_week = int(week_no) - 1
    sql = """
        SELECT price FROM price_history 
        WHERE rice_name = %s AND week_no = %s 
        ORDER BY price_id DESC LIMIT 1
    """
    return query_one(sql, (rice_name, prev_week))

def save_notification(rice_name, title, message, trend, change_percent, prediction_price=None):
    sql = """
        INSERT INTO notifications (rice_name, title, message, trend, change_percent, prediction_price)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    execute(sql, (rice_name, title, message, trend, change_percent, prediction_price))

def get_latest_notifications():
    sql = """
        SELECT * 
        FROM notifications 
        ORDER BY created_at DESC 
        LIMIT 10
    """
    return query_all(sql)

def get_all_price_history():
    sql = """
        SELECT price_id, rice_name, week_no, price, record_date 
        FROM price_history
        ORDER BY price_id DESC
    """
    return query_all(sql)

def delete_price_record(price_id):
    sql = "DELETE FROM price_history WHERE price_id = %s"
    execute(sql, (price_id,))

def update_price_record(price_id, rice_name, week_no, price, record_date):
    sql = """
        UPDATE price_history 
        SET rice_name = %s, week_no = %s, price = %s, record_date = %s 
        WHERE price_id = %s
    """
    execute(sql, (rice_name, week_no, price, record_date, price_id))