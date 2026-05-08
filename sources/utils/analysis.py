from dotenv import load_dotenv 
import os
from sqlalchemy import create_engine
import pandas as pd

load_dotenv()

def analysis_gold_price():
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        print("SUPABASE_DB_URL is not defined")
        return
    
    try:
        engine = create_engine(db_url)
        query = "SELECT * FROM gold_mart.fct_gold_prices ORDER BY price_hour DESC"
        df = pd.read_sql(query, engine)

        if df.empty:
            print("No data found in the table")
            return

        print("\n" + "="*50)
        print("Gold Price Analysis")
        print("="*50)

        print("\n--- Recent Hourly Averages ---")
        print(df.head(10))

        print("\n" + "="*50)
        print("Price comparison: latest vs previous hour for PNJ TP.HCM")
        print("="*50)
        npj_hcm = df[(df['brand'] == 'PNJ TP.HCM')].sort_values(by='price_hour', ascending=False)
        if len(npj_hcm) >= 2:
            latest = npj_hcm.iloc[0]
            prev = npj_hcm.iloc[1]
            diff_sell = latest['avg_sell_price'] - prev['avg_sell_price']
            diff_buy = latest['avg_buy_price'] - prev['avg_buy_price']
            percent_sell = diff_sell / latest['avg_sell_price'] * 100
            percent_buy = diff_buy / latest['avg_buy_price'] * 100
            
            print("\n[PNJ TP.HCM BRAND COMPARISON]")
            print(f"Time: {latest['price_hour']} vs {prev['price_hour']}")
            print(f"Sell Price Change: {diff_sell:,.0f} VND ({percent_sell:.2f}%)")
            print(f"Buy Price Change: {diff_buy:,.0f} VND ({percent_buy:.2f}%)")
            print(f"Latest: Sell {latest['avg_sell_price']:,.0f}, Buy {latest['avg_buy_price']:,.0f}")
            print(f"Previous: Sell {prev['avg_sell_price']:,.0f}, Buy {prev['avg_buy_price']:,.0f}")
        
        else: 
            print("Not enough history data for PNJ TP.HCM to compare")
        print("="*50 + "\n")
    except Exception as e:
        print(f"Error during analysis: {e}")
    
if __name__ == "__main__":
    analysis_gold_price()