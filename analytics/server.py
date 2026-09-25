"""Private card analytics and rate-limited DeepSeek blessing generation."""

import hmac
import json
import os
import re
import sqlite3
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from contextlib import contextmanager
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock

DATABASE = os.environ.get("MOONLIT_ANALYTICS_DB", "/data/analytics.sqlite3")
TOKEN = os.environ.get("MOONLIT_STATS_TOKEN", "")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-flash")
AUDIENCES = {"friend", "elder", "teacher"}
AUDIENCE_LABELS = {"friend": "朋友", "elder": "长辈", "teacher": "师长"}
EVENTS = {"created", "share_copy", "share_native", "share_poster", "opened"}
ID_PATTERN = re.compile(r"^[a-f0-9]{64}$")
VISITOR_PATTERN = re.compile(r"^[a-f0-9-]{36}$")
BLESSING_LIMIT = 5
BLESSING_WINDOW_SECONDS = 60
blessing_requests = defaultdict(deque)
blessing_lock = Lock()


@contextmanager
def connection():
    db = sqlite3.connect(DATABASE, timeout=10)
    try:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("PRAGMA busy_timeout=10000")
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def setup():
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
    with connection() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS cards (
                card_id TEXT PRIMARY KEY,
                creator_id TEXT NOT NULL,
                audience TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS shares (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id TEXT NOT NULL,
                visitor_id TEXT NOT NULL,
                method TEXT NOT NULL,
                shared_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS opens (
                card_id TEXT NOT NULL,
                visitor_id TEXT NOT NULL,
                opened_at TEXT NOT NULL,
                PRIMARY KEY (card_id, visitor_id)
            );
            CREATE INDEX IF NOT EXISTS shares_card ON shares(card_id);
        """)


def valid_event(data):
    return (isinstance(data, dict) and set(data) == {"event", "cardId", "visitorId", "audience"}
            and isinstance(data["event"], str) and data["event"] in EVENTS
            and isinstance(data["audience"], str) and data["audience"] in AUDIENCES
            and isinstance(data["cardId"], str) and ID_PATTERN.fullmatch(data["cardId"])
            and isinstance(data["visitorId"], str) and VISITOR_PATTERN.fullmatch(data["visitorId"]))


def record(data):
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with connection() as db:
        if data["event"] == "created":
            db.execute("INSERT OR IGNORE INTO cards VALUES (?, ?, ?, ?)",
                       (data["cardId"], data["visitorId"], data["audience"], now))
        elif data["event"] == "opened":
            db.execute("INSERT OR IGNORE INTO opens VALUES (?, ?, ?)",
                       (data["cardId"], data["visitorId"], now))
        else:
            db.execute("INSERT INTO shares (card_id, visitor_id, method, shared_at) VALUES (?, ?, ?, ?)",
                       (data["cardId"], data["visitorId"], data["event"], now))


def metrics():
    with connection() as db:
        db.row_factory = sqlite3.Row
        summary = dict(db.execute("""
            SELECT (SELECT COUNT(DISTINCT creator_id) FROM cards) AS creators,
                   (SELECT COUNT(*) FROM cards) AS cards,
                   (SELECT COUNT(DISTINCT visitor_id) FROM shares) AS sharers,
                   (SELECT COUNT(DISTINCT c.creator_id) FROM cards c JOIN shares s
                    ON s.card_id = c.card_id AND s.visitor_id = c.creator_id) AS creatorSharers,
                   (SELECT COUNT(*) FROM shares) AS shareActions,
                   (SELECT COUNT(DISTINCT card_id) FROM shares) AS cardsShared,
                   (SELECT COUNT(DISTINCT o.card_id) FROM opens o JOIN cards c USING(card_id)
                    WHERE o.visitor_id != c.creator_id) AS cardsOpenedByOthers,
                   (SELECT COUNT(*) FROM opens o JOIN cards c USING(card_id)
                    WHERE o.visitor_id != c.creator_id) AS recipientOpens
        """).fetchone())
        by_audience = [dict(row) for row in db.execute("""
            SELECT audience, COUNT(*) AS cards, COUNT(DISTINCT creator_id) AS creators,
                   (SELECT COUNT(DISTINCT s.card_id) FROM shares s JOIN cards c2 USING(card_id)
                    WHERE c2.audience = c.audience) AS cardsShared,
                   (SELECT COUNT(DISTINCT o.card_id) FROM opens o JOIN cards c3 USING(card_id)
                    WHERE c3.audience = c.audience AND o.visitor_id != c3.creator_id) AS cardsOpenedByOthers
            FROM cards c GROUP BY audience ORDER BY audience
        """)]
        by_method = {row["method"]: row["total"] for row in db.execute(
            "SELECT method, COUNT(*) AS total FROM shares GROUP BY method")}
        return {"summary": summary, "byAudience": by_audience, "byMethod": by_method,
                "asOf": datetime.now(timezone.utc).isoformat(timespec="seconds")}


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        if self.path == "/api/blessings":
            return self.generate_blessing()
        if self.path != "/api/events":
            return self.respond(404, {"error": "Not found"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 512 or self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                return self.respond(400, {"error": "Invalid request"})
            data = json.loads(self.rfile.read(size))
            if not valid_event(data):
                return self.respond(400, {"error": "Invalid event"})
            record(data)
            return self.respond(202, {"ok": True})
        except (ValueError, json.JSONDecodeError):
            return self.respond(400, {"error": "Invalid JSON"})

    def generate_blessing(self):
        if not DEEPSEEK_API_KEY:
            return self.respond(503, {"error": "DeepSeek 写作服务尚未配置，请稍后再试。"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 128 or self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                return self.respond(400, {"error": "请求内容无效。"})
            data = json.loads(self.rfile.read(size))
            if (not isinstance(data, dict) or set(data) != {"audience"}
                    or not isinstance(data["audience"], str) or data["audience"] not in AUDIENCES):
                return self.respond(400, {"error": "祝福对象无效。"})
        except (ValueError, json.JSONDecodeError):
            return self.respond(400, {"error": "请求内容无效。"})

        forwarded_for = self.headers.get("X-Forwarded-For", "")
        client = (forwarded_for.split(",", 1)[0].strip() if forwarded_for else self.client_address[0])[:64]
        now = time.monotonic()
        with blessing_lock:
            recent = blessing_requests[client]
            while recent and now - recent[0] >= BLESSING_WINDOW_SECONDS:
                recent.popleft()
            if len(recent) >= BLESSING_LIMIT:
                return self.respond(429, {"error": "生成得有些频繁，请稍等一分钟再试。"})
            recent.append(now)
            if len(blessing_requests) > 1000:
                expired = [address for address, requests in blessing_requests.items()
                           if not requests or now - requests[-1] >= BLESSING_WINDOW_SECONDS]
                for address in expired:
                    blessing_requests.pop(address, None)

        audience = AUDIENCE_LABELS[data["audience"]]
        payload = {
            "model": DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": "你是中文节日祝福语写作助手。写简洁、真诚、温暖的中秋祝福，避免俗套、夸张和商业推销。只输出一段可直接填写进贺卡的祝福正文，最多两句话、80个汉字，不加标题、引号、称呼、落款或解释。内容要通用，不使用具体人名、职业、个人经历或占位符。"},
                {"role": "user", "content": f"写一段适合送给{audience}的通用中秋祝福。"},
            ],
            "temperature": 1.0,
            "max_tokens": 160,
            "stream": False,
        }
        request = urllib.request.Request(
            "https://api.deepseek.com/chat/completions",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Authorization": "Bearer " + DEEPSEEK_API_KEY,
                     "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=22) as response:
                result = json.loads(response.read(64 * 1024))
            message = result["choices"][0]["message"]["content"]
            if not isinstance(message, str):
                raise ValueError("Invalid model response")
            message = re.sub(r"\s+", " ", message).strip().strip('「」『』“”\"')
            if not message:
                raise ValueError("Empty model response")
            return self.respond(200, {"message": message[:240]})
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError,
                KeyError, IndexError, TypeError, json.JSONDecodeError):
            return self.respond(502, {"error": "DeepSeek 暂时没有写好，请稍后重试。"})

    def do_GET(self):
        if self.path == "/healthz":
            return self.respond(200, {"ok": True})
        if self.path != "/api/stats":
            return self.respond(404, {"error": "Not found"})
        auth = self.headers.get("Authorization", "")
        if not TOKEN or not hmac.compare_digest(auth, "Bearer " + TOKEN):
            return self.respond(401, {"error": "Access denied"})
        return self.respond(200, metrics())


if __name__ == "__main__":
    if not TOKEN:
        raise SystemExit("MOONLIT_STATS_TOKEN is required")
    setup()
    ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
