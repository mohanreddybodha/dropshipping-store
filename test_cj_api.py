import os
import json
import urllib.request
import urllib.error
from pathlib import Path

def load_env(env_path=".env"):
    """Simple parser for .env files without requiring third-party libraries."""
    p = Path(env_path)
    if not p.is_file():
        return
    with p.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

def test_api():
    load_env()
    api_key = os.environ.get("CJ_API_KEY", "CJ5980063@api@316e4ee1d9424829969ee1debaf63eaf")

    print("==================================================")
    print("Testing CJ Dropshipping API Key...")
    masked_key = f"{api_key[:12]}...{api_key[-6:]}" if len(api_key) > 18 else "******"
    print(f"API Key: {masked_key}")
    print("==================================================\n")

    auth_url = "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken"
    auth_payload = json.dumps({"apiKey": api_key}).encode("utf-8")
    auth_req = urllib.request.Request(
        auth_url,
        data=auth_payload,
        headers={"Content-Type": "application/json", "User-Agent": "CJ-API-Tester/1.0"},
        method="POST"
    )

    print(f"1. Authenticating via getAccessToken endpoint:\n   {auth_url}")
    try:
        with urllib.request.urlopen(auth_req, timeout=15) as resp:
            status_code = resp.status
            body = json.loads(resp.read().decode("utf-8"))
            print(f"   HTTP Status: {status_code}")
            print(f"   API Response Code: {body.get('code')}")
            print(f"   API Message: {body.get('message')}")

            if body.get("code") == 200 or body.get("result") is True:
                token_data = body.get("data", {})
                access_token = token_data.get("accessToken")
                refresh_token = token_data.get("refreshToken")
                expiry = token_data.get("accessTokenExpiryDate")
                
                print("\n   [SUCCESS] Authentication Successful!")
                print(f"   - Access Token: {access_token[:12]}...{access_token[-8:] if access_token else ''}")
                print(f"   - Token Expiry: {expiry}")
                if refresh_token:
                    print(f"   - Refresh Token: {refresh_token[:12]}...{refresh_token[-8:]}")

                # Follow-up test 1: Product catalog check
                print("\n2. Testing Authenticated Query (Product List V2)...")
                product_url = "https://developers.cjdropshipping.com/api2.0/v1/product/listV2?page=1&size=2"
                product_req = urllib.request.Request(
                    product_url,
                    headers={"CJ-Access-Token": access_token, "User-Agent": "CJ-API-Tester/1.0"},
                    method="GET"
                )
                with urllib.request.urlopen(product_req, timeout=15) as p_resp:
                    p_body = json.loads(p_resp.read().decode("utf-8"))
                    print(f"   Product API Code: {p_body.get('code')} ({p_body.get('message')})")
                    if p_body.get("code") == 200:
                        data_content = p_body.get("data", {})
                        total_records = data_content.get("totalRecords")
                        content_list = data_content.get("content", [])
                        products = []
                        for entry in content_list:
                            products.extend(entry.get("productList", []))
                        print(f"   [SUCCESS] Connected to product catalog! (Total available records: {total_records})")
                        for idx, item in enumerate(products[:2], 1):
                            print(f"     {idx}. {item.get('nameEn')} (SKU: {item.get('sku')})")

                # Follow-up test 2: Check account balance
                print("\n3. Testing Account Balance Endpoint...")
                try:
                    balance_url = "https://developers.cjdropshipping.com/api2.0/v1/shopping/pay/getBalance"
                    balance_req = urllib.request.Request(
                        balance_url,
                        headers={"CJ-Access-Token": access_token, "User-Agent": "CJ-API-Tester/1.0"},
                        method="GET"
                    )
                    with urllib.request.urlopen(balance_req, timeout=15) as b_resp:
                        b_body = json.loads(b_resp.read().decode("utf-8"))
                        print(f"   Balance API Code: {b_body.get('code')} ({b_body.get('message')})")
                        if b_body.get("code") == 200:
                            print(f"   Account Balance Data: {b_body.get('data')}")
                except Exception as ex:
                    print(f"   Balance check note: {ex}")

                # Follow-up test 3: Check connected shops
                print("\n4. Testing Connected Shops Endpoint...")
                try:
                    shops_url = "https://developers.cjdropshipping.com/api2.0/v1/shop/getShops"
                    shops_req = urllib.request.Request(
                        shops_url,
                        headers={"CJ-Access-Token": access_token, "User-Agent": "CJ-API-Tester/1.0"},
                        method="GET"
                    )
                    with urllib.request.urlopen(shops_req, timeout=15) as s_resp:
                        s_body = json.loads(s_resp.read().decode("utf-8"))
                        print(f"   Shops API Code: {s_body.get('code')}")
                        if s_body.get("code") == 200:
                            shops = s_body.get("data", [])
                            print(f"   Connected Shops Count: {len(shops) if isinstance(shops, list) else 0}")
                except Exception as ex:
                    print(f"   Shop check note: {ex}")

            else:
                print(f"\n   [FAILED] Authentication failed: {body}")

    except urllib.error.HTTPError as e:
        print(f"   [HTTP ERROR] {e.code} {e.reason}")
        print(f"   Response Body: {e.read().decode('utf-8')}")
    except urllib.error.URLError as e:
        print(f"   [NETWORK ERROR] {e.reason}")
    except Exception as e:
        print(f"   [UNEXPECTED ERROR] {e}")

if __name__ == "__main__":
    test_api()
