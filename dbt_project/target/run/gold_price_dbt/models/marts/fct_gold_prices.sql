
  create view "postgres"."gold_mart"."fct_gold_prices__dbt_tmp"
    
    
  as (
    with staging as (
    select * from "postgres"."gold_mart"."stg_gold_prices"   -- ref() tạo dependency graph
),
hourly_metrics as (
    select
        brand,
        date_trunc('hour', price_timestamp) as price_hour,  -- Truncate xuống giờ
        avg(buy_price) as avg_buy_price,       -- Trung bình giá mua
        avg(sell_price) as avg_sell_price,      -- Trung bình giá bán
        min(buy_price) as min_buy_price,        -- Giá mua thấp nhất
        max(buy_price) as max_buy_price,        -- Giá mua cao nhất
        count(*) as data_points                 -- Số lượng data points
    from staging
    group by 1, 2
)
select * from hourly_metrics
  );