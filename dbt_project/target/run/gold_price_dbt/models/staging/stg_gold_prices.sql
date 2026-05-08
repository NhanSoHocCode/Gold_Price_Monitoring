
  create view "postgres"."gold_mart"."stg_gold_prices__dbt_tmp"
    
    
  as (
    with parent as (
    select * from "postgres"."gold_raw"."gold_prices"        -- Bảng parent
),
child as (
    select * from "postgres"."gold_raw"."gold_prices__entries" -- Bảng child (flattened by dlt)
),
joined as (
    select
        p.timestamp::timestamp as price_timestamp,  -- Cast text → timestamp
        p.date::date as price_date,                 -- Cast text → date
        c.brand,                                    -- Tên thương hiệu
        c.buy::numeric as buy_price,                -- Cast → numeric
        c.sell::numeric as sell_price                -- Cast → numeric
    from parent p
    join child c on p._dlt_id = c._dlt_parent_id    -- JOIN qua dlt internal IDs
)
select * from joined
  );