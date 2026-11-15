import os
import db
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from db import query_all, query_one, execute, get_heatmap_data
from db import get_all_rice, update_rice, add_rice, delete_rice
from db import get_all_rice  # db.py ထဲမှ Function ကို ခေါ်သုံးခြင်း
# app.py ရဲ့ ထိပ်ဆုံးနားမှာ ဒီလိုမျိုး ပြင်ပေးပါ
from db import get_all_rice, get_rice_by_id, add_rice, update_rice, delete_rice
from forecast import forecast_price, predict_future_trends

from flask import Flask
from flask_cors import CORS  # <--- ၁။ Import လုပ်ပါ

app = Flask(__name__)
CORS(app)  # <--- ၂။ ဒီလိုင်း ထည့်လိုက်ရင် Cross-Origin ရပါပြီ
# -------------------------------------------------------------
# Global Mapping Reference Data
# -------------------------------------------------------------
VARIETY_MAP = {
    "ပေါ်ဆန်းမွှေး": 1,
    "ဧည့်မထ": 2,
    "ရွှေဘိုပေါ်ဆန်း": 3,
    "ဧရာမင်း": 4
}

REGION_MAP = {
    "မန္တလေး": 1,
    "ရန်ကုန်": 2,
    "ဧရာဝတီ": 3,
    "စစ်ကိုင်း": 4
}

# ---------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------
def safe_int(val, default=1):
    if not val or val in ["", "undefined", "null", "အားလုံး"]:
        return default
    try:
        return int(val)
    except ValueError:
        return default

# ---------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------
@app.get("/health")
@app.get("/api/health")
def health():
    return jsonify({"ok": True, "service": "rice-market-api"})


# ---------------------------------------------------------------------
# Login & Register
# ---------------------------------------------------------------------
@app.post("/api/register")
def register_api():
    data = request.get_json(force=True, silent=True) or {}
    
    name = data.get("name") or data.get("reg_name")
    phone = data.get("phone") or data.get("reg_phone")
    password = data.get("password") or data.get("reg_password")
    
    if not name or not phone or not password:
        return jsonify({"error": "အချက်အလက် လိုအပ်နေပါသည်"}), 400
        
    phone = str(phone).strip()
    password = str(password).strip()
    
    existing_user = query_all("SELECT id FROM users WHERE phone = %s", (phone,))
    if existing_user:
        return jsonify({"error": "ဒီဖုန်းနံပါတ်ဖြင့် အကောင့်ဖွင့်ထားပြီးသား ဖြစ်နေပါသည်"}), 400
        
    try:
        execute(
            "INSERT INTO users (phone, name, password, region_id) VALUES (%s, %s, %s, %s)",
            (phone, name, password, 1)
        )
    except Exception as e:
        print(f"[DATABASE ERROR]: {str(e)}")
        return jsonify({"error": "ဒေတာဘေ့စ်ထဲ သိမ်းဆည်းရာတွင် အမှားအယွင်းရှိနေပါသည်"}), 500
        
    return jsonify({"message": "အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်", "user": {"name": name, "phone": phone}})

@app.post("/api/login")
def login_api():
    data = request.get_json(force=True, silent=True) or {}
    
    phone = data.get("phone") or data.get("reg_phone")
    password = data.get("password") or data.get("reg_password")
    
    if not phone or not password:
        return jsonify({"error": "ဖုန်းနံပါတ်နှင့် စကားဝှက် ဖြည့်စွက်ပေးပါ"}), 400
        
    phone = str(phone).strip()
    password = str(password).strip()
    
    user_data = query_all("SELECT id, name, phone, password FROM users WHERE phone = %s", (phone,))
    
    if not user_data:
        print(f"\n❌ [LOGIN FAILED]: ဒေတာဘေ့စ်ထဲမှာ ဖုန်းနံပါတ် {phone} ကို ရှာမတွေ့ပါရှင်။")
        return jsonify({"error": "အကောင့်မရှိသေးပါ သို့မဟုတ် ဖုန်းနံပါတ် မှားယွင်းနေပါသည်"}), 401
        
    logged_in_user = user_data[0]
    
    if isinstance(logged_in_user, dict):
        db_password = str(logged_in_user.get("password", "")).strip()
        user_id = logged_in_user.get("id")
        user_name = logged_in_user.get("name")
        user_phone = logged_in_user.get("phone")
    else:
        db_password = str(logged_in_user[3]).strip()
        user_id = logged_in_user[0]
        user_name = logged_in_user[1]
        user_phone = logged_in_user[2]
        
    if password != db_password:
        return jsonify({"error": "စကားဝှက် မှားယွင်းနေပါသည်"}), 401
        
    return jsonify({
        "message": "လော့ဂ်အင်ဝင်ခြင်း အောင်မြင်ပါသည်",
        "user": {"id": user_id, "name": user_name, "phone": user_phone}
    })

# ---------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------
@app.get("/regions")
@app.get("/api/regions")
def regions():
    return jsonify(query_all("SELECT id, name_mm, name_en FROM regions ORDER BY id"))


@app.get("/varieties")
@app.get("/api/varieties")
def varieties():
    return jsonify(
        query_all("SELECT id, name_mm, name_en FROM rice_varieties ORDER BY id")
    )

# ---------------------------------------------------------------------
# Prices (Market Price Collection)
# ---------------------------------------------------------------------
@app.get("/prices")
@app.get("/api/prices")
def get_prices():
    rows = query_all(
        """
        SELECT pr.variety_id, v.name_mm AS variety,
               pr.region_id, r.name_mm AS region,
               pr.price, pr.record_date
        FROM price_records pr
        JOIN rice_varieties v ON v.id = pr.variety_id
        JOIN regions r        ON r.id = pr.region_id
        JOIN (
            SELECT variety_id, region_id, MAX(record_date) AS md
            FROM price_records GROUP BY variety_id, region_id
        ) last
          ON last.variety_id = pr.variety_id
         AND last.region_id  = pr.region_id
         AND last.md         = pr.record_date
        ORDER BY pr.variety_id, pr.region_id
        """
    )
    for row in rows:
        row["price"] = float(row["price"])
        row["record_date"] = row["record_date"].isoformat()
    return jsonify(rows)


@app.post("/prices")
@app.post("/api/prices")
def add_price():
    data = request.get_json(force=True) or {}
    try:
        variety_id = int(data["variety_id"])
        region_id = int(data["region_id"])
        price = float(data["price"])
        record_date = data["record_date"]
    except (KeyError, ValueError, TypeError):
        return jsonify({"ok": False, "error": "မပြည့်စုံသော သို့မဟုတ် မမှန်ကန်သော data"}), 400

    new_id = execute(
        "INSERT INTO price_records (variety_id, region_id, price, record_date, source) "
        "VALUES (%s,%s,%s,%s,%s)",
        (variety_id, region_id, price, record_date, data.get("source", "manual")),
    )
    return jsonify({"ok": True, "id": new_id})

# ---------------------------------------------------------------------
# Dashboard KPIs 
# ---------------------------------------------------------------------
@app.get("/dashboard")
@app.get("/api/dashboard")
def dashboard():
    raw_variety = request.args.get("variety_id", "1")
    raw_region = request.args.get("region_id", "1")

    if raw_variety in VARIETY_MAP:
        variety_id = VARIETY_MAP[raw_variety]
    else:
        variety_id = safe_int(raw_variety, 1)

    if raw_region in REGION_MAP:
        region_id = REGION_MAP[raw_region]
    else:
        region_id = safe_int(raw_region, 1)

    fc = forecast_price(variety_id, region_id, months_ahead=3)

    if not fc.get("ok", True):
        return jsonify({
            "current_price": 0,
            "predicted_price": 0,
            "price_change_pct": 0,
            "demand": 0,
            "supply": 0,
            "demand_trend": "stable",
            "supply_trend": "stable",
            "monthly_profit": 0,
            "confidence": 0
        })

    ds = query_one(
        "SELECT demand, supply FROM demand_supply "
        "WHERE region_id = %s ORDER BY record_date DESC LIMIT 1",
        (region_id,),
    ) or {"demand": 0, "supply": 0}

    current = fc.get("current_price", 0) or 0
    predicted = fc.get("predicted_price", 0) or 0
    avg_sales = ds.get("supply", 0) or 0
    monthly_profit = round((predicted - current) * avg_sales, 0)

    return jsonify({
        "current_price": current,
        "predicted_price": predicted,
        "price_change_pct": fc.get("change_pct", 0),
        "demand": ds.get("demand", 0),
        "supply": ds.get("supply", 0),
        "demand_trend": "up" if ds.get("demand", 0) >= ds.get("supply", 0) else "down",
        "supply_trend": "down" if ds.get("demand", 0) >= ds.get("supply", 0) else "up",
        "monthly_profit": monthly_profit,
        "confidence": fc.get("confidence", 0),
    })

# ---------------------------------------------------------------------
# Trends (Demand / Supply) — Bar chart
# ---------------------------------------------------------------------
@app.get("/trends")
@app.get("/api/trends")
def trends():
    variety_id_raw = request.args.get("variety_id", "1")
    region_id_raw = request.args.get("region_id", "1")
    months_raw = request.args.get("months", "12")

    variety_id = safe_int(variety_id_raw, 1)
    region_id = safe_int(region_id_raw, 1)
    months = safe_int(months_raw, 12)

    full_year_sample = [
        {"month": "ဇန်နဝါရီ", "demand": 1200, "supply": 1000},
        {"month": "ဖေဖော်ဝါရီ", "demand": 1500, "supply": 1100},
        {"month": "မတ်", "demand": 1800, "supply": 1300},
        {"month": "ဧပြီ", "demand": 1400, "supply": 1200},
        {"month": "မေ", "demand": 1600, "supply": 1450},
        {"month": "ဇွန်", "demand": 1700, "supply": 1500},
        {"month": "ဇူလိုင်", "demand": 1900, "supply": 1600},
        {"month": "ဩဂုတ်", "demand": 2000, "supply": 1750},
        {"month": "စက်တင်ဘာ", "demand": 1850, "supply": 1650},
        {"month": "အောက်တိုဘာ", "demand": 1750, "supply": 1550},
        {"month": "နိုဝင်ဘာ", "demand": 1650, "supply": 1400},
        {"month": "ဒီဇင်ဘာ", "demand": 1800, "supply": 1500}
    ]

    try:
        result = predict_future_trends(variety_id, region_id, months)
        trends_list = result.get("trends", result.get("history", []))

        if not trends_list:
            trends_list = full_year_sample

        return jsonify(trends_list)
    except Exception as e:
        print("Trends Error:", str(e))
        return jsonify(full_year_sample)

    
@app.get("/api/demand-supply")
def demand_supply_api():
    region_id = safe_int(request.args.get("region_id", 1), 1)
    latest_price_row = query_one(
        "SELECT price FROM price_records WHERE region_id = %s ORDER BY record_date DESC LIMIT 1",
        (region_id,)
    )
    
    base_price = float(latest_price_row["price"]) if latest_price_row else 85000.0
    rows = query_all(
        "SELECT record_date, demand, supply FROM demand_supply "
        "WHERE region_id = %s ORDER BY record_date ASC LIMIT 7",
        (region_id,),
    )
    
    mm_months = ["ဇန်", "ဖေ", "မတ်", "ဧပြီ", "မေ", "ဇွန်", "ဇူ", "ဩ", "စက်", "အောက်", "နို", "ဒီ"]
    formatted_rows = []
    price_factor = base_price / 85000.0 if base_price > 0 else 1.0
    
    for r in rows:
        month_idx = r["record_date"].month - 1
        dynamic_demand = int(int(r["demand"]) / price_factor)  
        dynamic_supply = int(int(r["supply"]) * price_factor)  
        
        formatted_rows.append({
            "month_name": mm_months[month_idx] if month_idx < 12 else str(r["record_date"].month),
            "demand": dynamic_demand,
            "supply": dynamic_supply
        })
    
    if not formatted_rows:
        formatted_rows = [
            {"month_name": "ဇန်", "demand": int(410/price_factor), "supply": int(470*price_factor)},
            {"month_name": "ဖေ", "demand": int(430/price_factor), "supply": int(450*price_factor)},
            {"month_name": "မတ်", "demand": int(450/price_factor), "supply": int(435*price_factor)},
            {"month_name": "ဧပြီ", "demand": int(490/price_factor), "supply": int(415*price_factor)},
            {"month_name": "မေ", "demand": int(505/price_factor), "supply": int(395*price_factor)},
            {"month_name": "ဇွန်", "demand": int(525/price_factor), "supply": int(380*price_factor)},
            {"month_name": "ဇူ", "demand": int(550/price_factor), "supply": int(365*price_factor)}
        ]
        
    return jsonify(formatted_rows)

@app.route('/api/region-price-cards', methods=['GET'])
def get_region_price_cards():
    month = request.args.get('month', default=6, type=int)
    year = request.args.get('year', default=2026, type=int)

    query = """
        SELECT region_name, price, week_label
        FROM region_prices
        WHERE month = %s AND year = %s
        ORDER BY id DESC
    """
    
    rows = query_all(query, (month, year))

    cards_data = []
    region_dict = {}

    if rows:
        for row in rows:
            reg = row['region_name'] if isinstance(row, dict) else row[0]
            price = row['price'] if isinstance(row, dict) else row[1]
            
            if reg not in region_dict:
                region_dict[reg] = []
            region_dict[reg].append(price)

    for reg, prices in region_dict.items():
        current_price = prices[0] if len(prices) > 0 else 0
        prev_price = prices[1] if len(prices) > 1 else current_price
        diff = current_price - prev_price

        cards_data.append({
            'region': reg,
            'current_price': current_price,
            'diff': diff,
            'status': 'up' if diff > 0 else ('down' if diff < 0 else 'same')
        })

    return jsonify({'status': 'success', 'data': cards_data})
# ---------------------------------------------------------------------
# AI Forecast — Line chart
# ---------------------------------------------------------------------
@app.get("/forecast")
@app.get("/api/forecast")
def get_forecast_api():
    raw_variety = request.args.get("variety_id", "1")
    raw_region = request.args.get("region_id", "1")
    months = request.args.get("months", "3")

    months_ahead = safe_int(months, 3)

    if raw_variety in VARIETY_MAP:
        variety_id = VARIETY_MAP[raw_variety]
    else:
        variety_id = safe_int(raw_variety, 1)

    if raw_region in REGION_MAP:
        region_id = REGION_MAP[raw_region]
    else:
        region_id = safe_int(raw_region, 1)

    fc = forecast_price(variety_id, region_id, months_ahead=months_ahead)
    return jsonify(fc)

# ---------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------
@app.get("/alerts")
@app.get("/api/alerts")
def alerts():
    rows = query_all(
        """
        SELECT a.id, a.type, a.severity, a.title_mm, a.message_mm,
               a.is_read, a.created_at, r.name_mm AS region
        FROM alerts a
        LEFT JOIN regions r ON r.id = a.region_id
        ORDER BY a.created_at DESC
        """
    )
    for r in rows:
        r["created_at"] = r["created_at"].isoformat()
    return jsonify(rows)


@app.post("/alerts/<int:alert_id>/read")
@app.post("/api/alerts/<int:alert_id>/read")
def read_alert(alert_id):
    execute("UPDATE alerts SET is_read = 1 WHERE id = %s", (alert_id,))
    return jsonify({"ok": True})

# ---------------------------------------------------------------------
# Offline Sync
# ---------------------------------------------------------------------
@app.post("/sync")
@app.post("/api/sync")
def sync():
    data = request.get_json(force=True) or {}
    records = data.get("records", [])
    inserted = 0
    for rec in records:
        try:
            execute(
                "INSERT INTO price_records (variety_id, region_id, price, record_date, source) "
                "VALUES (%s,%s,%s,%s,%s)",
                (
                    int(rec["variety_id"]),
                    int(rec["region_id"]),
                    float(rec["price"]),
                    rec["record_date"],
                    "offline",
                ),
            )
            inserted += 1
        except (KeyError, ValueError, TypeError):
            continue
    return jsonify({"ok": True, "inserted": inserted})

# ---------------------------------------------------------------------
# AI Notifications
# ---------------------------------------------------------------------
@app.get('/api/ai-notifications')
def get_ai_notifications():
    try:
        query = """
            SELECT p.price, r.name_mm AS region_name, v.name_mm AS variety_name 
            FROM price_records p
            JOIN regions r ON p.region_id = r.id
            JOIN rice_varieties v ON p.variety_id = v.id
            WHERE p.id IN (
                SELECT MAX(id) FROM price_records GROUP BY region_id, variety_id
            )
            ORDER BY r.name_mm ASC
        """
        rows = query_all(query)
        
        notifications = []
        if rows:
            for idx, row in enumerate(rows):
                reg = row['region_name']
                rice = row['variety_name']
                curr_price = row['price']
                
                if idx % 3 == 0:
                    title = "💡 AI ဈေးနှုန်းခန့်မှန်းချက် (တက်နိုင်သည်)"
                    msg = f"နောက်လာမည့် လများတွင် {reg}၌ {rice} ဈေးနှုန်းသည် လက်ရှိ {curr_price:,} ကျပ်မှ ၅.၄% ခန့် ဆက်လက်မြင့်တက်နိုင်ခြေ ရှိပါသည်။"
                    severity = "warning"
                elif idx % 3 == 1:
                    title = "🚨 AI သတိပေးချက် (ပြတ်လပ်မှုအန္တရာယ်)"
                    msg = f"{reg} ဒေသတွင် {rice} ရောင်းလိုအား ကျဆင်းနေသဖြင့် လာမည့်ရက်သတ္တပတ်များ၌ ဝယ်လိုအား မြင့်တက်ပြီး ဈေးနှုန်း ကစားလာနိုင်ပါသည်။"
                    severity = "danger"
                else:
                    title = "✅ AI စျေးကွက်သုံးသပ်ချက် (ပိုလျှံမှု)"
                    msg = f"{reg} တွင် {rice} အထွက်နှုန်း ကောင်းမွန်သဖြင့် စျေးကွက်အတွင်း ပိုလျှံမှုရှိလာပြီး ဈေးနှုန်း ခေတ္တ တည်ငြိမ်နေပါမည်။"
                    severity = "success"
                    
                notifications.append({
                    "title": title, "message": msg, "severity": severity,
                    "date": "ယနေ့", "region": reg, "rice_type": rice
                })
        else:
            notifications.append({
                "title": "📋 စနစ်သတိပေးချက်",
                "message": "စနစ်အတွင်း ဈေးနှုန်းမှတ်တမ်းများ မရှိသေးပါ။",
                "severity": "info", "date": "ယနေ့", "region": "အားလုံး", "rice_type": "အားလုံး"
            })
        return jsonify(notifications)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify([{"title": "❌ အမှားအယွင်း", "message": str(e), "severity": "danger", "region": "Error", "rice_type": "Error"}])

app = Flask(__name__)
CORS(app)
app.json.ensure_ascii = False  # မြန်မာစာ ပုံမှန်အတိုင်း ပေါ်စေရန်


# ==========================================
# API ROUTES (Frontend & Database ချိတ်ဆက်ရန်)
# ==========================================

# ၁။ ဆန်အမျိုးအစား အားလုံးကို ယူမည့် Route (GET)
@app.route('/api/rice-varieties', methods=['GET'])
def get_rice():
    try:
        data = get_all_rice()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ၂။ ဆန်အမျိုးအစား တစ်ခုချင်းစီ၏ Detail (စိုက်ပျိုးနည်းပါဝင်) ကို ယူမည့် Route (GET)
@app.route('/api/rice-varieties/<int:rice_id>', methods=['GET'])
def get_rice_detail(rice_id):
    try:
        rice = get_rice_by_id(rice_id)

        if not rice:
            return jsonify({'message': 'Rice variety not found'}), 404

        # Guide Data စစ်ဆေးခြင်း
        guide_data = rice.get('guide', [])
        if isinstance(guide_data, str):
            guide_data = [g.strip() for g in guide_data.split('\n') if g.strip()]

        return jsonify({
            'id': rice.get('id', rice_id),
            'name': rice.get('name', ''),
            'badge': rice.get('badge', 'Rice Variety 🌿'),
            'description': rice.get('description', ''),
            'image': rice.get('image', ''),
            'type': rice.get('type', rice.get('name', '')),
            'price': rice.get('price', ''),
            'origin': rice.get('origin', ''),
            'mainRegion': rice.get('main_region', rice.get('mainRegion', '')),
            'soil': rice.get('soil', rice.get('soil_type', '')),
            'harvest': rice.get('harvest', rice.get('harvest_season', '')),
            'recommendation': rice.get('recommendation', ''),
            'guide': guide_data
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ၃။ Data အသစ် ထည့်မည့် Route (POST)
@app.route('/api/rice-varieties', methods=['POST'])
def add_rice_route():
    try:
        data = request.json or {}

        rice_id = data.get('id')
        name = data.get('name')
        badge = data.get('badge')
        description = data.get('description')
        image = data.get('image')
        rice_type = data.get('type')
        price = data.get('price')
        origin = data.get('origin')
        main_region = data.get('main_region')
        soil = data.get('soil')
        harvest = data.get('harvest')
        recommendation = data.get('recommendation')

        add_rice(rice_id, name, badge, description, image, rice_type, price, origin, main_region, soil, harvest, recommendation)
        return jsonify({'message': 'Data inserted successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ၄။ Data ပြင်ဆင်/Update လုပ်မည့် Route (PUT)
@app.route('/api/rice-varieties/<int:rice_id>', methods=['PUT'])
def update_rice_route(rice_id):
    try:
        data = request.json or {}

        name = data.get('name')
        badge = data.get('badge')
        description = data.get('description')
        image = data.get('image')
        rice_type = data.get('type')
        price = data.get('price')
        origin = data.get('origin')
        main_region = data.get('main_region')
        soil = data.get('soil')
        harvest = data.get('harvest')
        recommendation = data.get('recommendation')

        update_rice(rice_id, name, badge, description, image, rice_type, price, origin, main_region, soil, harvest, recommendation)
        return jsonify({'message': 'Database updated successfully'}), 200
    except Exception as e:
        print("Error detail:", str(e))
        return jsonify({'error': str(e)}), 500


# ၅။ Data ဖျက်မည့် Route (DELETE)
@app.route('/api/rice-varieties/<int:rice_id>', methods=['DELETE'])
def delete_rice_route(rice_id):
    try:
        delete_rice(rice_id)
        return jsonify({'message': 'Data deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



from flask import Flask, request, jsonify
from flask_cors import CORS
import db

app = Flask(__name__)
CORS(app)

# -------------------------------------------------
# 1. Rice Varieties APIs
# -------------------------------------------------

# Get all rice varieties
@app.route('/api/rice', methods=['GET'])
def get_rice_list():
    try:
        rice_list = db.get_all_rice()
        return jsonify({"status": "success", "data": rice_list}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Get rice details by ID
@app.route('/api/rice/<int:rice_id>', methods=['GET'])
def get_rice_detail(rice_id):
    try:
        rice = db.get_rice_by_id(rice_id)
        if rice:
            return jsonify({"status": "success", "data": rice}), 200
        return jsonify({"status": "error", "message": "Rice not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Add new rice variety
@app.route('/api/rice', methods=['POST'])
def add_rice_variety():
    try:
        data = request.json or {}
        db.add_rice(
            data.get('id'),
            data.get('name'),
            data.get('badge'),
            data.get('description'),
            data.get('image'),
            data.get('type'),
            data.get('price'),
            data.get('origin'),
            data.get('main_region'),
            data.get('soil'),
            data.get('harvest'),
            data.get('recommendation')
        )
        return jsonify({"status": "success", "message": "Rice added successfully!"}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Update rice variety
@app.route('/api/rice/<int:rice_id>', methods=['PUT'])
def update_rice_variety(rice_id):
    try:
        data = request.json or {}
        db.update_rice(
            rice_id,
            data.get('name'),
            data.get('badge'),
            data.get('description'),
            data.get('image'),
            data.get('type'),
            data.get('price'),
            data.get('origin'),
            data.get('main_region'),
            data.get('soil'),
            data.get('harvest'),
            data.get('recommendation')
        )
        return jsonify({"status": "success", "message": "Rice updated successfully!"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Delete rice variety
@app.route('/api/rice/<int:rice_id>', methods=['DELETE'])
def delete_rice_variety(rice_id):
    try:
        db.delete_rice(rice_id)
        return jsonify({"status": "success", "message": "Rice deleted successfully!"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# -------------------------------------------------
# 2. Price History & Prediction APIs
# -------------------------------------------------

# Add weekly price record and generate trend prediction
@app.route('/api/add-price', methods=['POST'])
def add_weekly_price():
    try:
        data = request.json or {}
        rice_name = data.get('rice_name', '').strip()
        week_no = int(data.get('week_no', 0))
        price = float(data.get('price', 0))
        record_date = data.get('record_date') or data.get('date')

        if not rice_name:
            return jsonify({"status": "error", "message": "ဆန်အမည် ထည့်သွင်းပေးပါ။"}), 400

        # ၁။ ဈေးနှုန်းသစ်ကို price_history ထဲ သိမ်းခြင်း
        db.add_price_record(rice_name, week_no, price, record_date)

        # ၂။ ရှေ့အပတ် (Previous Week) ဈေးနှုန်းကို DB မှ ဆွဲထုတ်ခြင်း
        prev_result = db.get_previous_week_price(rice_name, week_no)
        prev_price = prev_result['price'] if prev_result else None

# ၃။ Trend Analysis & Prediction Logic
        if prev_price and float(prev_price) > 0:
            prev_price = float(prev_price)
            price = float(price)
            diff_price = abs(price - prev_price)
            
            # Pylance Error မတက်အောင် change_percent ကိုပါ တွက်ပေးထားပါမည်
            change_percent = ((price - prev_price) / prev_price) * 100

            # ကွာခြားချက်ကို ဖတ်ရလွယ်အောင် ကော်မာ (,) ပုံစံပြောင်းခြင်း
            formatted_price = f"{int(price):,}"
            formatted_diff = f"{int(diff_price):,}"

            # ဈေးနှုန်း တက်/ကျ/တည်ငြိမ် စစ်ဆေးခြင်း
            if price > prev_price:
                trend = 'UP'
                title = f"{rice_name}"
                message = f"ယခုအပတ်တွင် ဈေးနှုန်း {formatted_price} MMK ဖြစ်လာပြီး ယခင်အပတ်ထက် {formatted_diff} MMK မြင့်တက်ခဲ့ပါသည်။"
            elif price < prev_price:
                trend = 'DOWN'
                title = f"{rice_name}"
                message = f"ယခုအပတ်တွင် ဈေးနှုန်း {formatted_price} MMK ဖြစ်လာပြီး ယခင်အပတ်ထက် {formatted_diff} MMK ကျဆင်းခဲ့ပါသည်။"
            else:
                trend = 'STABLE'
                title = f"{rice_name}"
                message = f"ယခုအပတ်တွင် ဈေးနှုန်း {formatted_price} MMK ဖြစ်ပြီး ယခင်အပတ်အတိုင်း ဈေးနှုန်းတည်ငြိမ်နေပါသည်။"
        else:
            trend = 'STABLE'
            change_percent = 0.0
            formatted_price = f"{int(price):,}" if price else '0'
            title = f"{rice_name}"
            message = f"Week {week_no} အတွက် ဈေးနှုန်းမှတ်တမ်း အသစ် ({formatted_price} MMK) ထည့်သွင်းထားပါသည်။"

        # ၄။ Notification & Prediction DB ထဲသိမ်းခြင်း
        predicted_next_price = price * (1 + (change_percent / 100))
        db.save_notification(
            rice_name=rice_name, 
            title=title, 
            message=message, 
            trend=trend, 
            change_percent=round(change_percent, 2),
            prediction_price=round(predicted_next_price, 2)
        )

        return jsonify({
            "status": "success",
            "message": "Price saved and notification generated successfully!",
            "data": {
                "rice_name": rice_name,
                "trend": trend,
                "change_percent": round(change_percent, 2)
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# Get price history for admin
@app.route('/api/price-history', methods=['GET'])
def fetch_price_history():
    try:
        history = db.get_all_price_history()
        return jsonify({"status": "success", "data": history}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# Update price record
@app.route('/api/update-price/<int:price_id>', methods=['PUT'])
def update_price(price_id):
    try:
        data = request.json or {}
        rice_name = data.get('rice_name', '').strip()
        week_no = int(data.get('week_no', 0))
        price = float(data.get('price', 0))
        record_date = data.get('record_date') or data.get('date')

        db.update_price_record(price_id, rice_name, week_no, price, record_date)
        return jsonify({"status": "success", "message": "ဈေးနှုန်း ပြင်ဆင်ပြီးပါပြီ။"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# Delete price record
@app.route('/api/delete-price/<int:price_id>', methods=['DELETE'])
def delete_price(price_id):
    try:
        db.delete_price_record(price_id)
        return jsonify({"status": "success", "message": "ဈေးနှုန်းမှတ်တမ်း ဖျက်ပြီးပါပြီ။"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# Get latest notifications
@app.route('/api/notifications', methods=['GET'])
def fetch_notifications():
    try:
        notifications = db.get_latest_notifications()
        return jsonify({"status": "success", "data": notifications}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # use_reloader=False ထည့်ပေးခြင်းဖြင့် Windows Socket Error ကို ရှင်းပေးပါသည်
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)