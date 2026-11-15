from flask import Blueprint, request, jsonify
from db import (
    add_price_record, 
    get_previous_week_price, 
    save_notification, 
    get_latest_notifications,
    get_all_price_history,
    delete_price_record,
    update_price_record
)

price_bp = Blueprint('price_bp', __name__)

# 1. Weekly Price Entry & Trend Prediction API
@price_bp.route('/api/add-price', methods=['POST'])
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
        add_price_record(rice_name, week_no, price, record_date)

        # ၂။ ရှေ့အပတ် (Previous Week) ဈေးနှုန်းကို DB မှ ဆွဲထုတ်ခြင်း
        prev_result = get_previous_week_price(rice_name, week_no)
        prev_price = prev_result['price'] if prev_result else None

        # ၃။ Trend Analysis & Prediction Logic
        if prev_price and float(prev_price) > 0:
            prev_price = float(prev_price)
            change_percent = ((price - prev_price) / prev_price) * 100

            if change_percent > 1.5:
                trend = 'UP'
                title = f"{rice_name} ဈေးတက်နိုင်ပါသည်"
                message = f"ယခင်အပတ်ထက် {abs(change_percent):.2f}% မြင့်တက်ခဲ့ပါသည်။ နောက်အပတ်တွင် ဈေးတက်နိုင်ပါသည်။"
            elif change_percent < -1.5:
                trend = 'DOWN'
                title = f"{rice_name} ဈေးကျနိုင်ပါသည်"
                message = f"ယခင်အပတ်ထက် {abs(change_percent):.2f}% ကျဆင်းခဲ့ပါသည်။ နောက်အပတ်တွင် ဈေးကျနိုင်ပါသည်။"
            else:
                trend = 'STABLE'
                title = f"{rice_name} ဈေးတည်ငြိမ်နိုင်ပါသည်"
                message = f"ဈေးနှုန်းပြောင်းလဲမှု နည်းပါးပါသည်။ နောက်အပတ်တွင် တည်ငြိမ်နိုင်ပါသည်။"
        else:
            trend = 'STABLE'
            change_percent = 0.0
            title = f"{rice_name} ဈေးနှုန်းအသစ်ထည့်သွင်းပြီးပါပြီ"
            message = f"Week {week_no} အတွက် ဈေးနှုန်းမှတ်တမ်း အသစ်ထည့်သွင်းထားပါသည်။"

        # ၄။ Notification & Prediction DB ထဲသိမ်းခြင်း
        predicted_next_price = price * (1 + (change_percent / 100))
        save_notification(
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


# 2. Admin Table - Fetch Price History
@price_bp.route('/api/price-history', methods=['GET'])
def fetch_price_history():
    try:
        history = get_all_price_history()
        return jsonify({"status": "success", "data": history}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# 3. Delete Price Record API
@price_bp.route('/api/delete-price/<int:price_id>', methods=['DELETE'])
def delete_price(price_id):
    try:
        delete_price_record(price_id)
        return jsonify({"status": "success", "message": "ဈေးနှုန်းမှတ်တမ်း ဖျက်ပြီးပါပြီ။"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# 4. Fetch Notifications API
@price_bp.route('/api/notifications', methods=['GET'])
def fetch_notifications():
    try:
        notifications = get_latest_notifications()
        return jsonify({"status": "success", "data": notifications}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# 5. Update Price Record API
@price_bp.route('/api/update-price/<int:price_id>', methods=['PUT'])
def update_price(price_id):
    try:
        data = request.json or {}
        rice_name = data.get('rice_name', '').strip()
        week_no = int(data.get('week_no', 0))
        price = float(data.get('price', 0))
        record_date = data.get('record_date') or data.get('date')

        update_price_record(price_id, rice_name, week_no, price, record_date)
        return jsonify({"status": "success", "message": "ဈေးနှုန်း ပြင်ဆင်ပြီးပါပြီ။"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500