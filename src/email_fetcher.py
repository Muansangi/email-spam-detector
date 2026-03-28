import imaplib
import email
from email.header import decode_header
import re
import socket

class EmailFetcher:
    """Handles fetching emails via IMAP."""
    
    def __init__(self, username, password, imap_server="imap.gmail.com"):
        self.username = username
        self.password = password
        self.imap_server = imap_server
        self.mail = None
        
    def connect_and_login(self):
        """Attempts to connect and login to the IMAP server."""
        try:
            self.mail = imaplib.IMAP4_SSL(self.imap_server, timeout=10)
            self.mail.login(self.username, self.password)
            return True, "Login successful"
        except imaplib.IMAP4.error as e:
            return False, f"IMAP Error: {e}"
        except socket.error as e:
            return False, f"Network Error: Could not connect to {self.imap_server}. {e}"
        except Exception as e:
            return False, f"Unexpected Error: {e}"

    def fetch_recent_emails(self, limit=15):
        """Fetches the N most recent emails from the Inbox."""
        if not self.mail:
            success, msg = self.connect_and_login()
            if not success:
                raise Exception(msg)
                
        try:
            self.mail.select("inbox")
            # Search for ALL emails to get the latest, or UNSEEN if preferable
            status, messages = self.mail.search(None, "ALL")
            if status != "OK":
                raise Exception("Failed to search inbox")
                
            email_ids = messages[0].split()
            if not email_ids:
                return []
                
            # Get the latest `limit` emails
            latest_email_ids = email_ids[-limit:]
            latest_email_ids.reverse() # Newest first
            
            emails_data = []
            
            for eid in latest_email_ids:
                status, msg_data = self.mail.fetch(eid, "(RFC822)")
                if status != "OK":
                    continue
                    
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        # Extract subject
                        subject = self._decode_header(msg.get("Subject", "(No Subject)"))
                        
                        # Extract sender
                        sender = self._decode_header(msg.get("From", "(Unknown Sender)"))
                        
                        # Extract body text
                        body = self._extract_body(msg)
                        snippet = body[:200] + "..." if len(body) > 200 else body
                        
                        emails_data.append({
                            "id": eid.decode('utf-8'),
                            "subject": subject,
                            "sender": sender,
                            "snippet": snippet,
                            "body": body
                        })
                        
            return emails_data
            
        except Exception as e:
            raise Exception(f"Failed to fetch emails: {e}")

    def delete_emails(self, email_ids):
        """Marks emails as deleted and expunges them."""
        if not self.mail:
            success, msg = self.connect_and_login()
            if not success:
                return False, msg
                
        try:
            self.mail.select("inbox")
            for eid in email_ids:
                # Add \Deleted flag to the message
                self.mail.store(eid, '+FLAGS', '\\Deleted')
            
            # Permanently delete all messages marked with \Deleted in the currently selected mailbox
            self.mail.expunge()
            return True, f"Successfully deleted {len(email_ids)} emails."
        except Exception as e:
            return False, f"Failed to delete emails: {e}"
            
    def close(self):
        if self.mail:
            try:
                self.mail.close()
                self.mail.logout()
            except:
                pass

    def _decode_header(self, raw_header):
        """Decodes an email header into a plain string."""
        decoded, charset = decode_header(raw_header)[0]
        if isinstance(decoded, bytes):
            charset = charset or 'utf-8'
            try:
                return decoded.decode(charset)
            except (LookupError, UnicodeDecodeError):
                return decoded.decode('utf-8', errors='replace')
        return decoded

    def _extract_body(self, msg):
        """Extracts plain text body from the email message."""
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))

                # Skip any text/plain parts that are attachments
                if "attachment" in content_disposition:
                    continue

                if content_type == "text/plain":
                    try:
                        body = part.get_payload(decode=True).decode()
                        break # Found the text body, we can stop
                    except:
                        pass
        else:
            if msg.get_content_type() == "text/plain":
                try:
                    body = msg.get_payload(decode=True).decode()
                except:
                    pass
                    
        # Clean up whitespace and HTML-like tags if any snuck in
        if body:
            body = re.sub(r'\s+', ' ', body).strip()
            
        return body
