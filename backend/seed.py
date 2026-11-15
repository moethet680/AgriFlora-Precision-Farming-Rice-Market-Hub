"""
seed.py — နမူနာ data ထည့်သွင်းခြင်း
=====================================================================
ဒီ script ကို schema.sql ကို import ပြီးနောက် တစ်ကြိမ် run ပါ:

    python seed.py

လုပ်ဆောင်ချက်:
  * users (password hash အစစ်ဖြင့်)
  * ၂၄ လစာ price_records (variety × region) — AI train ရန်
  * demand_supply history
  * alerts
=====================================================================
"""

import math
import random
from datetime import date
from dateutil.relativedelta import relativedelta

from werkzeug.security import generate_password_hash

from db import execute, query_all, query_one

random.seed(42)

# ---------------------------------------------------------------------
# 1) Users
# ---------------------------------------------------------------------
def seed_users():
    if query_one("SELECT id FROM users LIMIT 1"):
        print("• users ရှိပြီးသား — ကျော်သွားသည်")
        return
    users = [
        ("09250000000", "ဦးအောင်မြင့်", "1234", "farmer", 1),
        ("09251111111", "ကိုဇော်ဇော်", "1234", "trader", 5),
    ]
    for phone, name, pw, role, region in users:
        execute(
            "INSERT INTO users (phone, name, password_hash, role, region_id) "
            "VALUES (%s,%s,%s,%s,%s)",
            (phone, name, generate_password_hash(pw), role, region),
        )
    print(f"• users {len(users)} ဦး ထည့်ပြီး (login: 09250000000 / 1234)")


# ---------------------------------------------------------------------
# 2) Price history (၂၄ လ) — variety × region
# ---------------------------------------------------------------------
# variety အလိုက် base price (ကျပ်/အိတ်) — ပေါ်ဆန်းက အဈေးအကြီးဆုံး
VARIETY_BASE = {1: 95000, 2: 72000, 3: 60000, 4: 52000}
# region အလိုက် price multiplier (ရန်ကုန်က အနည်းငယ်ပိုကြီး)
REGION_MULT = {1: 0.97, 2: 0.99, 3: 0.98, 4: 1.0, 5: 1.05, 6: 1.0}


def seed_prices():
    if query_one("SELECT id FROM price_records LIMIT 1"):
        print("• price_records ရှိပြီးသား — ကျော်သွားသည်")
        return

    varieties = [v["id"] for v in query_all("SELECT id FROM rice_varieties")]
    regions = [r["id"] for r in query_all("SELECT id FROM regions")]

    start = date.today().replace(day=1) - relativedelta(months=23)
    count = 0
    for vid in varieties:
        for rid in regions:
            base = VARIETY_BASE.get(vid, 60000) * REGION_MULT.get(rid, 1.0)
            for m in range(24):
                d = start + relativedelta(months=m)
                # seasonal (sin) + upward trend + noise
                seasonal = math.sin((d.month / 12) * 2 * math.pi) * 0.05
                trend = (m / 24) * 0.12  # ၂ နှစ်အတွင်း ~12% တက်
                noise = random.uniform(-0.02, 0.02)
                price = base * (1 + seasonal + trend + noise)
                execute(
                    "INSERT INTO price_records (variety_id, region_id, price, record_date, source) "
                    "VALUES (%s,%s,%s,%s,%s)",
                    (vid, rid, round(price, 2), d.isoformat(), "seed"),
                )
                count += 1
    print(f"• price_records {count} ခု ထည့်ပြီး (၂၄ လ × variety × region)")


# ---------------------------------------------------------------------
# 3) Demand & Supply history
# ---------------------------------------------------------------------
def seed_demand_supply():
    if query_one("SELECT id FROM demand_supply LIMIT 1"):
        print("• demand_supply ရှိပြီးသား — ကျော်သွားသည်")
        return
    regions = [r["id"] for r in query_all("SELECT id FROM regions")]
    start = date.today().replace(day=1) - relativedelta(months=11)
    count = 0
    for rid in regions:
        demand = random.randint(1100, 1400)
        supply = random.randint(1300, 1600)
        for m in range(12):
            d = start + relativedelta(months=m)
            demand += random.randint(-60, 140)
            supply += random.randint(-120, 80)
            execute(
                "INSERT INTO demand_supply (region_id, record_date, demand, supply) "
                "VALUES (%s,%s,%s,%s)",
                (rid, d.isoformat(), max(500, demand), max(500, supply)),
            )
            count += 1
    print(f"• demand_supply {count} ခု ထည့်ပြီး")


# ---------------------------------------------------------------------
# 4) Alerts
# ---------------------------------------------------------------------
def seed_alerts():
    if query_one("SELECT id FROM alerts LIMIT 1"):
        print("• alerts ရှိပြီးသား — ကျော်သွားသည်")
        return
    rows = [
        ("price", "danger", "ဈေးနှုန်း ရုတ်တရက် ကျဆင်းမှု",
         "ဧရာဝတီဒေသတွင် ပေါ်ဆန်းမွှေး ဈေးနှုန်း ၅% ကျဆင်းသွားသည်။", 1),
        ("shortage", "warning", "ပစ္စည်းပြတ်လပ်နိုင်ခြေ",
         "ရန်ကုန်ဈေးကွက်တွင် ဝယ်လိုအား မြင့်တက်နေပြီး ပစ္စည်းပြတ်လပ်နိုင်သည်။", 5),
        ("overstock", "warning", "ပစ္စည်းပိုလျှံမှု",
         "မန္တလေးဒေသတွင် ရောင်းလိုအား ဝယ်လိုအားထက် ၂၀% ပိုများနေသည်။", 4),
        ("forecast", "info", "AI ခန့်မှန်းချက်",
         "လာမည့် ၃ လအတွင်း ပေါ်ဆန်းမွှေး ဈေးနှုန်း တက်လာနိုင်သည်ဟု ခန့်မှန်းရသည်။", None),
    ]
    for t, s, title, msg, rid in rows:
        execute(
            "INSERT INTO alerts (type, severity, title_mm, message_mm, region_id) "
            "VALUES (%s,%s,%s,%s,%s)",
            (t, s, title, msg, rid),
        )
    print(f"• alerts {len(rows)} ခု ထည့်ပြီး")



if __name__ == "__main__":
    print("=== Seed data ထည့်သွင်းနေသည် ===")
    seed_users()
    seed_prices()
    seed_demand_supply()
    seed_alerts()
    
    print("=== ပြီးဆုံးပါပြီ ===")
