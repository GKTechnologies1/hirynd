import os
from dotenv import load_dotenv
from pathlib import Path

# Paths relative to where the server usually runs
env_path = Path(__file__).resolve().parent / '.env'
print(f"Checking for .env at: {env_path}")
print(f"File exists: {env_path.exists()}")

load_dotenv()

key_id = os.getenv('RAZORPAY_KEY_ID')
print(f"RAZORPAY_KEY_ID: '{key_id}'")
print(f"Starts with rzp_test_mock: {str(key_id).startswith('rzp_test_mock') if key_id else 'N/A'}")
