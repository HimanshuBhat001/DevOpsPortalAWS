from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required
from flask_socketio import SocketIO
from flask_cors import CORS
from models import db, Deployment
from dotenv import load_dotenv
import anthropic
import threading, time, os

print(">>> app.py loaded", flush=True)
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "fallback_key")
app.config["JWT_TOKEN_LOCATION"] = ["headers"]
app.config["JWT_HEADER_TYPE"] = "Bearer"
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///devops.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
jwt = JWTManager(app)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)

LOG_PATH = "deploy.log"

with app.app_context():
    db.create_all()

# ── LOGIN ────────────────────────────────────────────────
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if username == "admin" and password == "1234":
        token = create_access_token(identity=username)
        return jsonify(token=token)

    return jsonify({"msg": "Invalid credentials"}), 401


# ── METRICS ─────────────────────────────────────────────
@app.route('/metrics', methods=['GET'])
def metrics():
    total = Deployment.query.count()
    success = Deployment.query.filter_by(status='success').count()
    rate = round((success / total * 100), 1) if total > 0 else 0

    times = [d.build_time for d in Deployment.query.all() if d.build_time]
    avg_time = round(sum(times) / len(times), 1) if times else 0

    active = Deployment.query.filter_by(status='success').count()

    return jsonify({
        "total_deploys": total,
        "success_rate": rate,
        "avg_build_time": avg_time,
        "active_services": min(active, 9)
    })


# ── DEPLOY ──────────────────────────────────────────────
@app.route('/deploy', methods=['POST'])
@jwt_required()
def deploy():
    try:
        data = request.json
        repo = data.get('repo')
        branch = data.get('branch', 'main')

        record = Deployment(repo=repo, branch=branch, status='running', build_time=0)
        db.session.add(record)
        db.session.commit()
        record_id = record.id

        def run():
            from deploy import run_deploy

            status, elapsed = run_deploy(repo, branch, LOG_PATH)

            with app.app_context():
                dep = Deployment.query.get(record_id)
                dep.status = status
                dep.build_time = elapsed
                db.session.commit()

            print("EMITTING DEPLOY DONE", flush=True)
            socketio.emit('deploy_done', {"status": status, "build_time": elapsed}, broadcast=True)

        # ✅ START THREAD OUTSIDE run()
        threading.Thread(target=run, daemon=True).start()

        # ✅ ALWAYS RETURN RESPONSE
        return jsonify({
            "msg": "Deployment started",
            "id": record_id,
            "status": "running"
        }), 200

    except Exception as e:
        print("❌ DEPLOY ERROR:", str(e), flush=True)
        return jsonify({"error": str(e)}), 500


# ── LOGS ────────────────────────────────────────────────
@app.route('/logs', methods=['GET'])
def logs():
    if not os.path.exists(LOG_PATH):
        return jsonify({"logs": []})

    with open(LOG_PATH) as f:
        return jsonify({"logs": f.readlines()})


# ── LIVE LOG STREAM ─────────────────────────────────────
def tail_log():
    last_size = 0
    while True:
        time.sleep(1)
        if not os.path.exists(LOG_PATH):
            continue

        size = os.path.getsize(LOG_PATH)
        if size > last_size:
            with open(LOG_PATH) as f:
                f.seek(last_size)
                new_lines = f.read()

            last_size = size

            for line in new_lines.splitlines():
                if line.strip():
                    socketio.emit('log', {"line": line})


threading.Thread(target=tail_log, daemon=True).start()


@socketio.on('connect')
def handle_connect():
    print("✅ Client connected via WebSocket", flush=True)


if __name__ == '__main__':
    print(">>> Starting Flask app...", flush=True)
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)