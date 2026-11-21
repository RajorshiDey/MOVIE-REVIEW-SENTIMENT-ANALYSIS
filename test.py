import requests

url = "http://127.0.0.1:8000/predict"
payload = {"review": "Ranbir Kapoor as Lord Ram is just divine - so calm, so graceful, so powerful. You will feel the divinity in every scene."}

response = requests.post(url, json=payload)
print(response.status_code, response.json())
