import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.ensemble import RandomForestClassifier

# ===============================
# 1. LOAD DATA
# ===============================
X = pd.read_csv("X.csv")
y = pd.read_csv("y.csv").values.ravel()  # flatten target

print("Data loaded:")
print("X shape:", X.shape)
print("y shape:", y.shape)

# ===============================
# 2. TRAIN–TEST SPLIT
# ===============================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ===============================
# 3. TRAIN MODEL
# ===============================
model = RandomForestClassifier(
    n_estimators=200,
    random_state=42
)

model.fit(X_train, y_train)

# ===============================
# 4. EVALUATE MODEL
# ===============================
y_pred = model.predict(X_test)

accuracy = a
