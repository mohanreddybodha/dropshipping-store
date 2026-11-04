import os, json, re
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv('storefront/.env.local')

print("="*60)
print("1. DATABASE AUDIT (ORDERS TABLE)")
print("="*60)
try:
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT id, internal_order_number, status, carrier_name, tracking_number, customer_email, total_retail, created_at FROM orders ORDER BY id ASC")
    orders = cur.fetchall()
    print(f"Total orders in DB: {len(orders)}")
    for o in orders:
        print(f"  Order #{o['id']} | {o['internal_order_number']} | Status: {o['status']} | Carrier: {o['carrier_name']} | Tracking: {o['tracking_number']} | Email: {o['customer_email']}")
    conn.close()
except Exception as e:
    print("Database error:", e)

print("\n" + "="*60)
print("2. REPOSITORY FILE SEARCH FOR MOCK / SAMPLE / TEST PATTERNS")
print("="*60)

ignore_dirs = {'.git', 'node_modules', '.next', '__pycache__', '.pytest_cache', '.venv', 'venv'}

patterns = [
    r'9400\d{10,}',
    r'mock',
    r'dummy',
    r'sample',
    r'fake',
    r'test_',
]

findings = {}

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in ignore_dirs]
    for file in files:
        if file.endswith(('.tsx', '.ts', '.py', '.json', '.sql', '.js')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    for line_no, line in enumerate(f, 1):
                        for p in patterns:
                            if re.search(p, line, re.IGNORECASE):
                                # Filter out common benign hits
                                if 'test' in filepath.lower() and ('pytest' in line or 'def test_' in line):
                                    continue
                                if 'scripts/audit_codebase.py' in filepath.replace('\\', '/'):
                                    continue
                                if filepath not in findings:
                                    findings[filepath] = []
                                findings[filepath].append((line_no, line.strip()))
                                break
            except Exception:
                pass

for fp, matches in list(findings.items())[:35]:
    print(f"\nFile: {fp} ({len(matches)} matches)")
    for lno, text in matches[:5]:
        print(f"   Line {lno}: {text[:100]}")
