import requests
from bs4 import BeautifulSoup
from datetime import datetime
import mysql.connector
import re

def calculate_color_level(price):
    """ ဈေးနှုန်းအလိုက် Heatmap အရောင် Level (1 မှ 6) တွက်ချက်ပေးသည့် Logic """
    if price < 70000:
        return 1
    elif price < 85000:
        return 2
    elif price < 100000:
        return 3
    elif price < 115000:
        return 4
    elif price < 130000:
        return 5
    else:
        return 6

def get_current_week_label():
    """ 
    လက်ရှိလ၏ ရက်စွဲ (Day 1..31) အပေါ် မူတည်ပြီး Week Label သတ်မှတ်ပေးခြင်း 
    ( Frontend ရက်စွဲ Logic နှင့် ကွက်တိ ကိုက်ညီစေရန် )
    """
    day = datetime.now().day
    if day <= 7:
        return "Week 1"
    elif day <= 14:
        return "Week 2"
    elif day <= 21:
        return "Week 3"
    else:
        return "Week 4"

def scrape_and_save_mrf_data():
    print(f"🔄 [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] MRF ဝဘ်ဆိုက်မှ Live ဒေတာ စတင်ဆွဲယူနေပါသည်...")
    
    url = "https://www.myanmarricefederation.org/"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    regions = ["ဧရာဝတီ", "ပဲခူး", "ရန်ကုန်", "မန္တလေး", "စစ်ကိုင်း", "မကွေး", "တနင်္သာရီ"]
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            all_text = " ".join([text for text in soup.stripped_strings])
            
            # MRF Webpage ပေါ်မှ ဈေးနှုန်း ကိန်းဂဏန်းများကို ရှာဖွေခြင်း
            numbers = re.findall(r'\b\d{2,3},?\d{3}\b', all_text)
            valid_prices = [int(num.replace(',', '')) for num in numbers if 55000 <= int(num.replace(',', '')) <= 250000]
            
            # 💡 အကယ်၍ MRF ဝဘ်ဆိုက်တွင် တကယ့် ဈေးနှုန်းဒေတာများ မရှိသေးပါက
            if not valid_prices:
                print("ℹ️ [MRF Info] ယနေ့အတွက် MRF မှ ဈေးနှုန်းဒေတာ မထုတ်ပြန်သေးပါ။ ဒေတာဘေ့စ်သို့ မည်သည့် ဒေတာမှ ထည့်သွင်းမည် မဟုတ်ပါ။")
                return

            # တကယ့် ဒေတာအစစ် ရရှိပါကမှသာ DB ထဲသို့ ထည့်သွင်းမည်
            current_week = get_current_week_label()
            conn = mysql.connector.connect(
                host="localhost", user="root", password="", database="rice_market"
            )
            cursor = conn.cursor()
            
            # MRF မှ ရရှိသော တကယ့် ဈေးနှုန်းအစစ် (ဥပမာ - valid_prices[0]) ကို သုံးမည်
            scraped_real_price = valid_prices[0]
            
            print(f"📈 [Live Data Found] MRF မှ ရရှိသော ဈေးနှုန်း: {scraped_real_price:,} ကျပ်")
            
            for region_name in regions:
                color_level = calculate_color_level(scraped_real_price)
                
                # 💡 ဒေတာဟောင်းများကို DELETE မလုပ်ဘဲ ယခုအပတ်အတွက် အသစ်ထည့်မည် (သို့မဟုတ်) Update လုပ်မည်
                query = """
                    INSERT INTO region_prices (region_name, week_label, price, color_level, created_at) 
                    VALUES (%s, %s, %s, %s, NOW())
                    ON DUPLICATE KEY UPDATE price = VALUES(price), color_level = VALUES(color_level)
                """
                cursor.execute(query, (region_name, current_week, scraped_real_price, color_level))
            
            conn.commit()
            cursor.close()
            conn.close()
            print("💾 [Success] MRF ဒေတာအစစ်ကို region_prices ဒေတာဘေ့စ်ထဲ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီရှင်။")
            
        else:
            print(f"⚠️ MRF ဝဘ်ဆိုက် ချိတ်ဆက်၍ မရပါ (Status Code: {response.status_code})။ ဒေတာ မသွင်းပါ။")
            
    except Exception as e:
        print(f"❌ [Error] Scraper အလုပ်လုပ်စဉ် အမှားအယွင်း ဖြစ်ပေါ်ခဲ့ပါသည်: {e}")

if __name__ == "__main__":
    scrape_and_save_mrf_data()