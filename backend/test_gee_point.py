import requests, json

r = requests.get('http://localhost:8000/api/analysis/point?lat=6.9271&lng=79.8612', timeout=120)
data = r.json()
intel = data.get('intelligence', {})
spices = intel.get('spices', [])
print(f"Spices: {len(spices)}")
for s in spices:
    print(f"  {s['name']}: {s['score']}/100 ({s['label']})")
ic = intel.get('intercropping', {})
print(f"Intercropping good pairs: {len(ic.get('good_pairs', []))}")
print(f"Intercropping avoid pairs: {len(ic.get('avoid_pairs', []))}")
health = intel.get('health', {})
print(f"Health: {health.get('headline', 'N/A')}")
pred = data.get('prediction', {})
print(f"Prediction: {pred.get('label', 'N/A')} (conf: {pred.get('confidence', 'N/A')})")
