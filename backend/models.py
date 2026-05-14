from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Deployment(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    repo       = db.Column(db.String(200))
    branch     = db.Column(db.String(100))
    status     = db.Column(db.String(50))   # 'success' or 'failed'
    build_time = db.Column(db.Float)         # seconds
    created_at = db.Column(db.DateTime, default=datetime.utcnow)