"""
Database layer for the Deepfake Detector app.
Uses plain sqlite3 (no extra dependency) for users, sessions, and detection history.
"""
import sqlite3
import os
import secrets
import hashlib
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            organization TEXT DEFAULT '',
            photo TEXT DEFAULT '',
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at REAL NOT NULL
        )
    """)
    # Migration-safe: add 'photo' column if the DB already existed without it.
    try:
        cur.execute("ALTER TABLE users ADD COLUMN photo TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass  # column already exists

    cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at REAL NOT NULL,
            expires_at REAL NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS reset_tokens (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at REAL NOT NULL,
            expires_at REAL NOT NULL,
            used INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS detections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            media_type TEXT NOT NULL,   -- 'image' or 'video'
            verdict TEXT NOT NULL,      -- 'fake' or 'real'
            confidence REAL NOT NULL,
            sha256 TEXT NOT NULL,
            n_frames_analyzed INTEGER,
            created_at REAL NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    conn.commit()
    conn.close()


# ---------- password hashing (stdlib only, PBKDF2-SHA256) ----------

def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    if salt is None:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 100_000
    ).hex()
    return pwd_hash, salt


def verify_password(password: str, salt: str, stored_hash: str) -> bool:
    computed, _ = hash_password(password, salt)
    return secrets.compare_digest(computed, stored_hash)


# ---------- user operations ----------

def create_user(name: str, email: str, password: str) -> int:
    conn = get_conn()
    cur = conn.cursor()
    pwd_hash, salt = hash_password(password)
    try:
        cur.execute(
            "INSERT INTO users (name, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)",
            (name, email.lower().strip(), pwd_hash, salt, time.time()),
        )
        conn.commit()
        user_id = cur.lastrowid
        return user_id
    except sqlite3.IntegrityError:
        raise ValueError("Email already registered")
    finally:
        conn.close()


def get_user_by_email(email: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def update_user(user_id: int, name: str = None, organization: str = None):
    conn = get_conn()
    cur = conn.cursor()
    if name is not None:
        cur.execute("UPDATE users SET name = ? WHERE id = ?", (name, user_id))
    if organization is not None:
        cur.execute("UPDATE users SET organization = ? WHERE id = ?", (organization, user_id))
    conn.commit()
    conn.close()


def update_password(user_id: int, new_password: str):
    conn = get_conn()
    cur = conn.cursor()
    pwd_hash, salt = hash_password(new_password)
    cur.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", (pwd_hash, salt, user_id))
    conn.commit()
    conn.close()


def update_photo(user_id: int, photo_base64: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("UPDATE users SET photo = ? WHERE id = ?", (photo_base64, user_id))
    conn.commit()
    conn.close()


# ---------- password reset operations ----------

def create_reset_token(user_id: int, ttl_seconds: int = 30 * 60) -> str:
    conn = get_conn()
    cur = conn.cursor()
    token = secrets.token_urlsafe(24)
    now = time.time()
    # invalidate any previous unused tokens for this user
    cur.execute("UPDATE reset_tokens SET used = 1 WHERE user_id = ? AND used = 0", (user_id,))
    cur.execute(
        "INSERT INTO reset_tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token, user_id, now, now + ttl_seconds),
    )
    conn.commit()
    conn.close()
    return token


def consume_reset_token(token: str):
    """Validates a reset token, marks it used, and returns the user_id. Returns None if invalid/expired/used."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM reset_tokens WHERE token = ?", (token,))
    row = cur.fetchone()
    if not row or row["used"] or row["expires_at"] < time.time():
        conn.close()
        return None
    cur.execute("UPDATE reset_tokens SET used = 1 WHERE token = ?", (token,))
    conn.commit()
    user_id = row["user_id"]
    conn.close()
    return user_id


# ---------- session / token operations ----------

def create_session(user_id: int, ttl_seconds: int = 7 * 24 * 3600) -> str:
    conn = get_conn()
    cur = conn.cursor()
    token = secrets.token_urlsafe(32)
    now = time.time()
    cur.execute(
        "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token, user_id, now, now + ttl_seconds),
    )
    conn.commit()
    conn.close()
    return token


def get_user_from_token(token: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM sessions WHERE token = ?", (token,))
    session = cur.fetchone()
    if not session:
        conn.close()
        return None
    if session["expires_at"] < time.time():
        cur.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()
        return None
    cur.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],))
    user = cur.fetchone()
    conn.close()
    return dict(user) if user else None


# ---------- detection history operations ----------

def add_detection(user_id: int, filename: str, media_type: str, verdict: str,
                   confidence: float, sha256: str, n_frames_analyzed: int = None):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO detections
           (user_id, filename, media_type, verdict, confidence, sha256, n_frames_analyzed, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, filename, media_type, verdict, confidence, sha256, n_frames_analyzed, time.time()),
    )
    conn.commit()
    detection_id = cur.lastrowid
    conn.close()
    return detection_id


def get_history(user_id: int, page: int = 1, page_size: int = 10,
                 verdict_filter: str = None, media_type_filter: str = None):
    conn = get_conn()
    cur = conn.cursor()
    query = "SELECT * FROM detections WHERE user_id = ?"
    params = [user_id]
    if verdict_filter and verdict_filter != "all":
        query += " AND verdict = ?"
        params.append(verdict_filter)
    if media_type_filter and media_type_filter != "all":
        query += " AND media_type = ?"
        params.append(media_type_filter)

    count_query = query.replace("SELECT *", "SELECT COUNT(*)")
    cur.execute(count_query, params)
    total = cur.fetchone()[0]

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([page_size, (page - 1) * page_size])
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows, total


def get_analytics(user_id: int):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM detections WHERE user_id = ?", (user_id,))
    total = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM detections WHERE user_id = ? AND verdict = 'fake'", (user_id,))
    fake_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM detections WHERE user_id = ? AND verdict = 'real'", (user_id,))
    real_count = cur.fetchone()[0]

    cur.execute("SELECT AVG(confidence) FROM detections WHERE user_id = ?", (user_id,))
    avg_conf = cur.fetchone()[0] or 0.0

    cur.execute("""
        SELECT media_type, COUNT(*) as cnt, AVG(confidence) as avg_conf
        FROM detections WHERE user_id = ? GROUP BY media_type
    """, (user_id,))
    by_media_type = [dict(r) for r in cur.fetchall()]

    cur.execute("""
        SELECT date(created_at, 'unixepoch') as day, COUNT(*) as cnt,
               SUM(CASE WHEN verdict = 'fake' THEN 1 ELSE 0 END) as fake_cnt
        FROM detections WHERE user_id = ?
        GROUP BY day ORDER BY day ASC
    """, (user_id,))
    timeseries = [dict(r) for r in cur.fetchall()]

    conn.close()
    return {
        "total_analyzed": total,
        "fake_count": fake_count,
        "real_count": real_count,
        "avg_confidence": round(avg_conf, 4),
        "by_media_type": by_media_type,
        "timeseries": timeseries,
    }
