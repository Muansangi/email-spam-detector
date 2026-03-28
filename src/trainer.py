import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

def train_model(data_path, model_dir):
    print(f"Loading dataset from {data_path}...")
    df = pd.read_csv(data_path)
    
    # Drop rows with missing values if any
    df = df.dropna(subset=['text', 'label_num'])
    
    X = df['text']
    y = df['label_num']
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Vectorizing text data...")
    vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    print("Training Naive Bayes model...")
    model = MultinomialNB()
    model.fit(X_train_vec, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test_vec)
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save artifacts
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
        
    model_path = os.path.join(model_dir, 'spam_model.pkl')
    vec_path = os.path.join(model_dir, 'vectorizer.pkl')
    
    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vec_path)
    
    print(f"Model saved to {model_path}")
    print(f"Vectorizer saved to {vec_path}")

if __name__ == "__main__":
    DATA_PATH = r"c:\Users\muans\Desktop\chehchawl\random project\Email_spam\spam_ham_dataset.csv"
    MODEL_DIR = r"c:\Users\muans\Desktop\chehchawl\random project\Email_spam\models"
    train_model(DATA_PATH, MODEL_DIR)
