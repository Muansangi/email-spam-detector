import joblib
import os

class SpamPredictor:
    def __init__(self, model_dir):
        model_path = os.path.join(model_dir, 'spam_model.pkl')
        vec_path = os.path.join(model_dir, 'vectorizer.pkl')
        
        if not os.path.exists(model_path) or not os.path.exists(vec_path):
            raise FileNotFoundError("Model or Vectorizer not found. Please run trainer.py first.")
            
        self.model = joblib.load(model_path)
        self.vectorizer = joblib.load(vec_path)
        
    def predict(self, text):
        text_vec = self.vectorizer.transform([text])
        prediction = self.model.predict(text_vec)
        return "Spam" if prediction[0] == 1 else "Ham"

if __name__ == "__main__":
    # Test prediction
    MODEL_DIR = r"c:\Users\muans\Desktop\chehchawl\random project\Email_spam\models"
    try:
        predictor = SpamPredictor(MODEL_DIR)
        test_text = "WINNER! You have won a 1000$ gift card. Click here!"
        print(f"Testing with: {test_text}")
        print(f"Result: {predictor.predict(test_text)}")
    except Exception as e:
        print(f"Error: {e}")
