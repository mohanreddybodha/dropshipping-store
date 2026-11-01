with open('src/api/routes/orders.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace mock tracking numbers
content = content.replace(
    'tracking_num = f"94001118995625{int(time.time())}"',
    'tracking_num = payload.tracking_number or None'
)
content = content.replace(
    'tracking_num = payload.tracking_number or f"94001118995625{int(time.time())}"',
    'tracking_num = payload.tracking_number or None'
)

with open('src/api/routes/orders.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully cleaned up src/api/routes/orders.py")
