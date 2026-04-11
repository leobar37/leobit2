-- Compound indexes for query performance at scale
-- Covers: customer name search, customer DNI lookup, sales list filtering

-- Customers: compound index for business_id + name (covers LIKE '%search%' and equality filters)
CREATE INDEX IF NOT EXISTS idx_customers_business_name ON customers(business_id, name);

-- Customers: compound index for business_id + dni (covers exact DNI lookup per business)
CREATE INDEX IF NOT EXISTS idx_customers_business_dni ON customers(business_id, dni);

-- Sales: compound index for business_id + status + sale_date (covers main sales list query)
CREATE INDEX IF NOT EXISTS idx_sales_business_status_date ON sales(business_id, status, sale_date DESC);
