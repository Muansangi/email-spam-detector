from flask import Flask, request, jsonify, render_template
from src.predictor import SpamPredictor
from src.email_fetcher import EmailFetcher
import os

app = Flask(__name__)
MODEL_DIR = os.path.join(os.getcwd(), 'models')
predictor = None

try:
    predictor = SpamPredictor(MODEL_DIR)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Warning: Model could not be loaded. {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    imap_server = data.get('imap_server', 'imap.gmail.com')
    
    fetcher = EmailFetcher(email, password, imap_server)
    success, msg = fetcher.connect_and_login()
    fetcher.close()
    
    if success:
        return jsonify({"success": True, "message": "Login successful"})
    else:
        return jsonify({"success": False, "message": msg}), 401

@app.route('/api/emails', methods=['POST'])
def api_emails():
    if not predictor:
        return jsonify({"error": "Model not loaded"}), 500
        
    data = request.json
    email_addr = data.get('email')
    password = data.get('password')
    imap_server = data.get('imap_server', 'imap.gmail.com')
    limit = data.get('limit', 15)
    
    fetcher = EmailFetcher(email_addr, password, imap_server)
    try:
        emails = fetcher.fetch_recent_emails(limit=limit)
        
        # Analyze each email
        for mail in emails:
            # The exact format might depend on how the vectorizer was trained, 
            # usually combining subject and body works well.
            text_to_predict = f"Subject: {mail['subject']}\r\n\r\n{mail['body']}"
            prediction = predictor.predict(text_to_predict)
            mail['prediction'] = prediction # "Spam" or "Ham"
            
        return jsonify({"success": True, "emails": emails})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        fetcher.close()

@app.route('/api/delete', methods=['POST'])
def api_delete():
    data = request.json
    email_addr = data.get('email')
    password = data.get('password')
    imap_server = data.get('imap_server', 'imap.gmail.com')
    email_ids = data.get('email_ids', [])
    
    if not email_ids:
        return jsonify({"error": "No email IDs provided"}), 400
        
    fetcher = EmailFetcher(email_addr, password, imap_server)
    try:
        success, msg = fetcher.delete_emails(email_ids)
        if success:
            return jsonify({"success": True, "message": msg})
        else:
            return jsonify({"error": msg}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        fetcher.close()

@app.route('/api/check_text', methods=['POST'])
def check_text():
    if not predictor:
        return jsonify({"error": "Model not loaded"}), 500
    
    data = request.json
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "No text provided"}), 400
        
    prediction = predictor.predict(text)
    return jsonify({"success": True, "prediction": prediction})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
