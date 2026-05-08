import pandas as pd

# Chú ý chữ 'r' ở đầu và đổi read_csv thành read_excel
đường_dẫn_file = r"C:\Users\AD\Downloads\demo1\backend\src\models\hpg_statadata_KTL.xlsx"

# Thêm tuỳ chọn engine='openpyxl' để chắc chắn đọc được file .xlsx
df_usd = pd.read_excel(đường_dẫn_file, engine='openpyxl') 

print(df_usd.head()) # In thử 5 dòng đầu ra xem đã đọc thành công chưa