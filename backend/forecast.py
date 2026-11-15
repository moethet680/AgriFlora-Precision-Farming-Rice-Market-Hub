# """
# forecast.py — AI ဈေးနှုန်းခန့်မှန်းခြင်း (scikit-learn)
# =====================================================================
# နည်းလမ်း:
#   * Database ထဲက price_records (historical) ကို ဆွဲထုတ်သည်
#   * Time index (လ) ကို feature အဖြစ်အသုံးပြုပြီး
#     Polynomial Regression (degree=2) model ကို train လုပ်သည်
#   * နောက်လာမည့် N လ၏ ဈေးနှုန်းကို predict လုပ်သည်
#   * R² score ဖြင့် confidence (ယုံကြည်စိတ်ချရမှု %) တွက်သည်

# ဘာကြောင့် Polynomial Regression?
#   * ဈေးနှုန်းသည် ရိုးရှင်းသော မျဉ်းဖြောင့်မဟုတ်ဘဲ
#     seasonal curve ပုံစံ ရှိတတ်သည်။ degree=2 က trend ကို
#     ပိုကောင်းစွာ ဖမ်းနိုင်သည်။
# =====================================================================
# """

# from datetime import date
# from dateutil.relativedelta import relativedelta

# import numpy as np
# from sklearn.linear_model import LinearRegression
# from sklearn.preprocessing import PolynomialFeatures
# from sklearn.pipeline import make_pipeline
# from sklearn.metrics import r2_score

# from db import query_all


# def _month_index(d: date, base: date) -> int:
#     """base နေ့ကနေ စပြီး လ အရေအတွက် (integer index)"""
#     return (d.year - base.year) * 12 + (d.month - base.month)


# def get_history(variety_id: int, region_id: int):
#     """variety + region အလိုက် လစဉ်ပျမ်းမျှ ဈေးနှုန်း history"""
#     rows = query_all(
#         """
#         SELECT DATE_FORMAT(record_date, '%Y-%m-01') AS month,
#                AVG(price) AS avg_price
#         FROM price_records
#         WHERE variety_id = %s AND region_id = %s
#         GROUP BY month
#         ORDER BY month ASC
#         """,
#         (variety_id, region_id),
#     )
#     history = []
#     for r in rows:
#         # month သည် 'YYYY-MM-01' string
#         y, m, _ = str(r["month"]).split("-")
#         history.append(
#             {"date": f"{y}-{m}-01", "price": round(float(r["avg_price"]), 2)}
#         )
#     return history


# def forecast_price(variety_id: int, region_id: int, months_ahead: int = 3):
#     """
#     နောက် `months_ahead` လအတွက် ဈေးနှုန်းခန့်မှန်းချက်ကို ပြန်ပေးသည်။
#     return dict: history, forecast, confidence, trend, recommendation
#     """
#     history = get_history(variety_id, region_id)

#     if len(history) < 4:
#         return {
#             "ok": False,
#             "reason": "လုံလောက်သော historical data မရှိသေးပါ (အနည်းဆုံး ၄ လ လိုအပ်သည်)။",
#             "history": history,
#             "forecast": [],
#             "confidence": 0,
#         }

#     # base = date.fromisoformat(history[0]["date"])
#     base = date.fromisoformat(str(history[0]["record_date"]))
#     X = np.array(
#         [[_month_index(date.fromisoformat(h["date"]), base)] for h in history]
#     )
#     y = np.array([h["price"] for h in history])

#     # Polynomial Regression (degree=2) pipeline
#     model = make_pipeline(PolynomialFeatures(degree=2), LinearRegression())
#     model.fit(X, y)

#     # training fit ၏ R² ကို confidence အဖြစ် အသုံးပြုသည်
#     y_fit = model.predict(X)
#     r2 = r2_score(y, y_fit)
#     confidence = max(0, min(100, round(r2 * 100, 1)))

#     # နောက်လာမည့် လများကို predict
#     last_idx = int(X[-1][0])
#     last_date = date.fromisoformat(history[-1]["date"])
#     forecast = []
#     for i in range(1, months_ahead + 1):
#         idx = last_idx + i
#         pred = float(model.predict(np.array([[idx]]))[0])
#         f_date = last_date + relativedelta(months=i)
#         forecast.append(
#             {"date": f_date.strftime("%Y-%m-01"), "price": round(pred, 2)}
#         )

#     # trend တွက်ချက် (နောက်ဆုံး history vs နောက်ဆုံး forecast)
#     current_price = history[-1]["price"]
#     future_price = forecast[-1]["price"]
#     change_pct = round(((future_price - current_price) / current_price) * 100, 1)

#     if change_pct > 2:
#         trend = "up"
#         recommendation = (
#             "ဈေးနှုန်း တက်လာနိုင်သည်။ ဖြစ်နိုင်လျှင် ဆိုင်းငံ့ပြီးမှ ရောင်းချရန် အကြံပြုသည်။"
#         )
#     elif change_pct < -2:
#         trend = "down"
#         recommendation = (
#             "ဈေးနှုန်း ကျဆင်းနိုင်သည်။ ယခုလက်ရှိ ဈေးဖြင့် ရောင်းချရန် စဉ်းစားသင့်သည်။"
#         )
#     else:
#         trend = "stable"
#         recommendation = "ဈေးနှုန်း တည်ငြိမ်နေမည်ဟု ခန့်မှန်းရသည်။"

#     return {
#         "ok": True,
#         "history": history,
#         "forecast": forecast,
#         "confidence": confidence,
#         "current_price": current_price,
#         "predicted_price": future_price,
#         "change_pct": change_pct,
#         "trend": trend,
#         "recommendation": recommendation,
#     }
# # forecast.py ရဲ့ အောက်ဆုံးက dummy function နေရာမှာ ဒါလေး အစားထိုးပေးပါ

# def predict_future_trends(region_name: str, rice_type_name: str):
#     """
#     app.py က ပို့ပေးတဲ့ စာသား (ဥပမာ- 'ဧရာဝတီ', 'ပေါ်ဆန်းမွှေး') ကို ယူပြီး 
#     Database ထဲက ID တွေနဲ့ ချိတ်ဆက်ကာ AI Forecasting လုပ်ပေးသည်။
#     """
#     # ၁။ ဒေသအမည် နှင့် ဆန်အမျိုးအစားအမည်ကို မူတည်ပြီး ID ရှာဖွေခြင်း
#     # (ငြိမ်းလေးရဲ့ database table တည်ဆောက်ပုံအလိုက် region သို့မဟုတ် varieties table ကနေ ဆွဲတာပါ)
#     region_row = query_all("SELECT id FROM regions WHERE name = %s", (region_name,))
#     variety_row = query_all("SELECT id FROM varieties WHERE name = %s", (rice_type_name,))
    
#     if not region_row or not variety_row:
#         return {"ok": False, "reason": "မှန်ကန်သော ဒေသ သို့မဟုတ် ဆန်အမျိုးအစား မဟုတ်ပါ။"}
        
#     region_id = region_row[0]["id"]
#     variety_id = variety_row[0]["id"]
    
#     # ၂။ ငြိမ်းလေး ရေးထားပြီးသား AI Forecasting Function ကို လှမ်းခေါ်ခြင်း
#     result = forecast_price(variety_id, region_id, months_ahead=3)
    
#     if not result["ok"]:
#         return result
        
#     # ၃။ Supply Level ကို လက်ရှိ ပစ္စည်းအခြေအနေအပေါ် မူတည်ပြီး တွက်ချက်ခြင်း (ဥပမာ Logic)
#     # ဈေးနှုန်း တအားတက်နေရင် ဝယ်လိုအားများပြီး ပစ္စည်းပြတ်နိုင်ခြေ (low supply) လို့ ယူဆခြင်း
#     supply_level = "stable"
#     if result["change_pct"] > 10:
#         supply_level = "low"
#     elif result["change_pct"] < -5:
#         supply_level = "high"
        
#     return {
#         "ok": True,
#         "price_change": result["change_pct"],
#         "supply_level": supply_level,
#         "trend": result["trend"],
#         "recommendation": result["recommendation"]
#     }
# """
# forecast.py — AI ဈေးနှုန်းခန့်မှန်းခြင်း (scikit-learn)
# =====================================================================
# နည်းလမ်း:
#   * Database ထဲက price_records (historical) ကို ဆွဲထုတ်သည်
#   * Time index (လ) ကို feature အဖြစ်အသုံးပြုပြီး
#     Polynomial Regression (degree=2) model ကို train လုပ်သည်
#   * နောက်လာမည့် N လ၏ ဈေးနှုန်းကို predict လုပ်သည်
#   * R² score ဖြင့် confidence (ယုံကြည်စိတ်ချရမှု %) တွက်သည်

# ဘာကြောင့် Polynomial Regression?
#   * ဈေးနှုန်းသည် ရိုးရှင်းသော မျဉ်းဖြောင့်မဟုတ်ဘဲ
#     seasonal curve ပုံစံ ရှိတတ်သည်။ degree=2 က trend ကို
#     ပိုကောင်းစွာ ဖမ်းနိုင်သည်။
# =====================================================================
# """

# from datetime import date
# from dateutil.relativedelta import relativedelta

# import numpy as np
# from sklearn.linear_model import LinearRegression
# from sklearn.preprocessing import PolynomialFeatures
# from sklearn.pipeline import make_pipeline
# from sklearn.metrics import r2_score

# from db import query_all


# def _month_index(d: date, base: date) -> int:
#     """base နေ့ကနေ စပြီး လ အရေအတွက် (integer index)"""
#     return (d.year - base.year) * 12 + (d.month - base.month)


# def get_history(variety_id: int, region_id: int):
#     """variety + region အလိုက် လစဉ်ပျမ်းမျှ ဈေးနှုန်း history"""
#     rows = query_all(
#         """
#         SELECT DATE_FORMAT(record_date, '%Y-%m-01') AS month,
#                AVG(price) AS avg_price
#         FROM price_records
#         WHERE variety_id = %s AND region_id = %s
#         GROUP BY month
#         ORDER BY month ASC
#         """,
#         (variety_id, region_id),
#     )
#     history = []
#     for r in rows:
#         # month သည် 'YYYY-MM-01' string
#         y, m, _ = str(r["month"]).split("-")
#         history.append(
#             {"date": f"{y}-{m}-01", "price": round(float(r["avg_price"]), 2)}
#         )
#     return history


# def forecast_price(variety_id: int, region_id: int, months_ahead: int = 3):
#     """
#     နောက် `months_ahead` လအတွက် ဈေးနှုန်းခန့်မှန်းချက်ကို ပြန်ပေးသည်။
#     return dict: history, forecast, confidence, trend, recommendation
#     """
#     history = get_history(variety_id, region_id)

#     if len(history) < 4:
#         return {
#             "ok": False,
#             "reason": "လုံလောက်သော historical data မရှိသေးပါ (အနည်းဆုံး ၄ လ လိုအပ်သည်)။",
#             "history": history,
#             "forecast": [],
#             "confidence": 0,
#         }

#     # 💡 [KeyError ပြင်ဆင်ပြီး] get_history က ပြန်ပေးတဲ့ Dict ထဲမှာ 'date' ပဲ ပါဝင်လို့ 'date' ကို အသုံးပြုရပါမယ်
#     base = date.fromisoformat(history[0]["date"])
#     X = np.array(
#         [[_month_index(date.fromisoformat(h["date"]), base)] for h in history]
#     )
#     y = np.array([h["price"] for h in history])

#     # Polynomial Regression (degree=2) pipeline
#     model = make_pipeline(PolynomialFeatures(degree=2), LinearRegression())
#     model.fit(X, y)

#     # training fit ၏ R² ကို confidence အဖြစ် အသုံးပြုသည်
#     y_fit = model.predict(X)
#     r2 = r2_score(y, y_fit)
#     confidence = max(0, min(100, round(r2 * 100, 1)))

#     # နောက်လာမည့် လများကို predict
#     last_idx = int(X[-1][0])
#     last_date = date.fromisoformat(history[-1]["date"])
#     forecast = []
#     for i in range(1, months_ahead + 1):
#         idx = last_idx + i
#         pred = float(model.predict(np.array([[idx]]))[0])
#         f_date = last_date + relativedelta(months=i)
#         forecast.append(
#             {"date": f_date.strftime("%Y-%m-01"), "price": round(pred, 2)}
#         )

#     # trend တွက်ချက် (နောက်ဆုံး history vs နောက်ဆုံး forecast)
#     current_price = history[-1]["price"]
#     future_price = forecast[-1]["price"]
#     change_pct = round(((future_price - current_price) / current_price) * 100, 1)

#     if change_pct > 2:
#         trend = "up"
#         recommendation = (
#             "ဈေးနှုန်း တက်လာနိုင်သည်။ ဖြစ်နိုင်လျှင် ဆိုင်းငံ့ပြီးမှ ရောင်းချရန် အကြံပြုသည်။"
#         )
#     elif change_pct < -2:
#         trend = "down"
#         recommendation = (
#             "ဈေးနှုန်း ကျဆင်းနိုင်သည်။ ယခုလက်ရှိ ဈေးဖြင့် ရောင်းချရန် စဉ်းစားသင့်သည်။"
#         )
#     else:
#         trend = "stable"
#         recommendation = "ဈေးနှုန်း တည်ငြိမ်နေမည်ဟု ခန့်မှန်းရသည်။"

#     return {
#         "ok": True,
#         "history": history,
#         "forecast": forecast,
#         "confidence": confidence,
#         "current_price": current_price,
#         "predicted_price": future_price,
#         "change_pct": change_pct,
#         "trend": trend,
#         "recommendation": recommendation,
#     }


# def predict_future_trends(region_name: str, rice_type_name: str):
#     """
#     app.py က ပို့ပေးတဲ့ စာသား (ဥပမာ- 'ဧရာဝတီ', 'ပေါ်ဆန်းမွှေး') ကို ယူပြီး 
#     Database ထဲက ID တွေနဲ့ ချိတ်ဆက်ကာ AI Forecasting လုပ်ပေးသည်။
#     """
#     # ၁။ ဒေသအမည် နှင့် ဆန်အမျိုးအစားအမည်ကို မူတည်ပြီး ID ရှာဖွေခြင်း
#     region_row = query_all("SELECT id FROM regions WHERE name = %s", (region_name,))
#     variety_row = query_all("SELECT id FROM varieties WHERE name = %s", (rice_type_name,))
    
#     if not region_row or not variety_row:
#         return {"ok": False, "reason": "မှန်ကန်သော ဒေသ သို့မဟုတ် ဆန်အမျိုးအစား မဟုတ်ပါ။"}
        
#     region_id = region_row[0]["id"]
#     variety_id = variety_row[0]["id"]
    
#     # ၂။ AI Forecasting Function ကို လှမ်းခေါ်ခြင်း
#     result = forecast_price(variety_id, region_id, months_ahead=3)
    
#     if not result["ok"]:
#         return result
        
#     # ၃။ Supply Level ကို လက်ရှိ ပစ္စည်းအခြေအနေအပေါ် မူတည်ပြီး တွက်ချက်ခြင်း
#     supply_level = "stable"
#     if result["change_pct"] > 10:
#         supply_level = "low"
#     elif result["change_pct"] < -5:
#         supply_level = "high"
        
#     return {
#         "ok": True,
#         "price_change": result["change_pct"],
#         "supply_level": supply_level,
#         "trend": result["trend"],
#         "recommendation": result["recommendation"]
#     }
"""
forecast.py — AI ဈေးနှုန်းခန့်မှန်းခြင်း (scikit-learn)
=====================================================================
နည်းလမ်း:
  * Database ထဲက price_records (historical) ကို ဆွဲထုတ်သည်
  * Time index (လ) ကို feature အဖြစ်အသုံးပြုပြီး
    Polynomial Regression (degree=2) model ကို train လုပ်သည်
  * နောက်လာမည့် N လ၏ ဈေးနှုန်းကို predict လုပ်သည်
  * R² score ဖြင့် confidence (ယုံကြည်စိတ်ချရမှု %) တွက်သည်

ဘာကြောင့် Polynomial Regression?
  * ဈေးနှုန်းသည် ရိုးရှင်းသော မျဉ်းဖြောင့်မဟုတ်ဘဲ
    seasonal curve ပုံစံ ရှိတတ်သည်။ degree=2 က trend ကို
    ပိုကောင်းစွာ ဖမ်းနိုင်သည်။
=====================================================================
"""

from datetime import date
from dateutil.relativedelta import relativedelta

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline
from sklearn.metrics import r2_score

from db import query_all


def _month_index(d: date, base: date) -> int:
    """base နေ့ကနေ စပြီး လ အရေအတွက် (integer index)"""
    return (d.year - base.year) * 12 + (d.month - base.month)


def get_history(variety_id: int, region_id: int):
    """variety + region အလိုက် လစဉ်ပျမ်းမျှ ဈေးနှုန်း history"""
    rows = query_all(
        """
        SELECT DATE_FORMAT(record_date, '%Y-%m-01') AS month,
               AVG(price) AS avg_price
        FROM price_records
        WHERE variety_id = %s AND region_id = %s
        GROUP BY month
        ORDER BY month ASC
        """,
        (variety_id, region_id),
    )
    history = []
    for r in rows:
        # month သည် 'YYYY-MM-01' string
        if not r["month"] or str(r["month"]).startswith("0000"):
            continue # 💡 ဒေတာဘေ့စ်ထဲမှာ ရက်စွဲမှားနေရင် ကျော်သွားမည်
            
        try:
            y, m, _ = str(r["month"]).split("-")
            # နှစ်အပိုင်းက 0 ဖြစ်နေရင် ကျော်ပစ်ရန်
            if int(y) <= 0:
                continue
                
            history.append(
                {"date": f"{y}-{m}-01", "price": round(float(r["avg_price"]), 2)}
            )
        except Exception:
            continue # ပုံစံမမှန်တဲ့ ရက်စွဲတစ်ခုခုရှိရင်လည်း Error မတက်ဘဲ ကျော်သွားမည်
            
    return history


def forecast_price(variety_id: int, region_id: int, months_ahead: int = 3):
    """
    နောက် `months_ahead` လအတွက် ဈေးနှုန်းခန့်မှန်းချက်ကို ပြန်ပေးသည်။
    return dict: history, forecast, confidence, trend, recommendation
    """
    history = get_history(variety_id, region_id)

    if len(history) < 4:
        return {
            "ok": False,
            "reason": "လုံလောက်သော historical data မရှိသေးပါ (အနည်းဆုံး ၄ လ လိုအပ်သည်)။",
            "history": history,
            "forecast": [],
            "confidence": 0,
        }

    # 💡 [ValueError ပြင်ဆင်ပြီး] ဒေတာဘေ့စ်ကလာတဲ့ ဒေတာက ပုံစံမှန်မမှန်ကိုပါ ကာကွယ်ထားပါသည်
    try:
        base = date.fromisoformat(history[0]["date"])
    except ValueError:
        return {
            "ok": False,
            "reason": "ဒေတာဘေ့စ်ထဲရှိ ရက်စွဲပုံစံ မှားယွင်းနေသဖြင့် AI မတွက်ချက်နိုင်ပါ။",
            "history": history,
            "forecast": [],
            "confidence": 0,
        }

    X = np.array(
        [[_month_index(date.fromisoformat(h["date"]), base)] for h in history]
    )
    y = np.array([h["price"] for h in history])

    # Polynomial Regression (degree=2) pipeline
    model = make_pipeline(PolynomialFeatures(degree=2), LinearRegression())
    model.fit(X, y)

    # training fit ၏ R² ကို confidence အဖြစ် အသုံးပြုသည်
    y_fit = model.predict(X)
    r2 = r2_score(y, y_fit)
    confidence = max(0, min(100, round(r2 * 100, 1)))

    # နောက်လာမည့် လများကို predict
    last_idx = int(X[-1][0])
    last_date = date.fromisoformat(history[-1]["date"])
    forecast = []
    for i in range(1, months_ahead + 1):
        idx = last_idx + i
        pred = float(model.predict(np.array([[idx]]))[0])
        f_date = last_date + relativedelta(months=i)
        forecast.append(
            {"date": f_date.strftime("%Y-%m-01"), "price": round(pred, 2)}
        )

    # trend တွက်ချက် (နောက်ဆုံး history vs နောက်ဆုံး forecast)
    current_price = history[-1]["price"]
    future_price = forecast[-1]["price"]
    change_pct = round(((future_price - current_price) / current_price) * 100, 1)

    if change_pct > 2:
        trend = "up"
        recommendation = (
            "ဈေးနှုန်း တက်လာနိုင်သည်။ ဖြစ်နိုင်လျှင် ဆိုင်းငံ့ပြီးမှ ရောင်းချရန် အကြံပြုသည်။"
        )
    elif change_pct < -2:
        trend = "down"
        recommendation = (
            "ဈေးနှုန်း ကျဆင်းနိုင်သည်။ ယခုလက်ရှိ ဈေးဖြင့် ရောင်းချရန် စဉ်းစားသင့်သည်။"
        )
    else:
        trend = "stable"
        recommendation = "ဈေးနှုန်း တည်ငြိမ်နေမည်ဟု ခန့်မှန်းရသည်။"

    return {
        "ok": True,
        "history": history,
        "forecast": forecast,
        "confidence": confidence,
        "current_price": current_price,
        "predicted_price": future_price,
        "change_pct": change_pct,
        "trend": trend,
        "recommendation": recommendation,
    }


def predict_future_trends(region_name: str, rice_type_name: str):
    """
    app.py က ပို့ပေးတဲ့ စာသား (ဥပမာ- 'ဧရာဝတီ', 'ပေါ်ဆန်းမွှေး') ကို ယူပြီး 
    Database ထဲက ID တွေနဲ့ ချိတ်ဆက်ကာ AI Forecasting လုပ်ပေးသည်။
    """
    # ၁။ ဒေသအမည် နှင့် ဆန်အမျိုးအစားအမည်ကို မူတည်ပြီး ID ရှာဖွေခြင်း
    region_row = query_all("SELECT id FROM regions WHERE name = %s", (region_name,))
    variety_row = query_all("SELECT id FROM varieties WHERE name = %s", (rice_type_name,))
    
    if not region_row or not variety_row:
        return {"ok": False, "reason": "မှန်ကန်သော ဒေသ သို့မဟုတ် ဆန်အမျိုးအစား မဟုတ်ပါ။"}
        
    region_id = region_row[0]["id"]
    variety_id = variety_row[0]["id"]
    
    # ၂။ AI Forecasting Function ကို လှမ်းခေါ်ခြင်း
    result = forecast_price(variety_id, region_id, months_ahead=3)
    
    if not result["ok"]:
        return result
        
    # ၃။ Supply Level ကို လက်ရှိ ပစ္စည်းအခြေအနေအပေါ် မူတည်ပြီး တွက်ချက်ခြင်း
    supply_level = "stable"
    if result["change_pct"] > 10:
        supply_level = "low"
    elif result["change_pct"] < -5:
        supply_level = "high"
        
    return {
        "ok": True,
        "price_change": result["change_pct"],
        "supply_level": supply_level,
        "trend": result["trend"],
        "recommendation": result["recommendation"]
    }