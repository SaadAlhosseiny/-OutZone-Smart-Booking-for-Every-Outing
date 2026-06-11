import json
import os
import datetime
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    verify_jwt_in_request,
)
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import or_, inspect
import pymysql
import subprocess
import re
import math
from collections import defaultdict

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.environ.get("ALLOWED_ORIGINS", "*")}})

# ─── Config ───────────────────────────────────────────────────────────────────
app.config["SECRET_KEY"] = os.environ.get("OUTZONE_SECRET_KEY", "super-secret-outzone-key")
app.config["JWT_SECRET_KEY"] = os.environ.get("OUTZONE_JWT_SECRET_KEY", app.config["SECRET_KEY"])
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(
    minutes=int(os.environ.get("OUTZONE_ACCESS_EXPIRES_MINUTES", 30))
)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = datetime.timedelta(
    days=int(os.environ.get("OUTZONE_REFRESH_EXPIRES_DAYS", 30))
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


# ─── DB Connection ────────────────────────────────────────────────────────────
def get_wsl_host_ip():
    try:
        result = subprocess.run(
            ["sh", "-c", "ip route | grep default | awk '{print $3}'"],
            capture_output=True, text=True,
        )
        return result.stdout.strip() or "127.0.0.1"
    except Exception:
        return "127.0.0.1"


mysql_host = os.environ.get("MYSQL_HOST", get_wsl_host_ip())
mysql_user = os.environ.get("MYSQL_USER", "root")
mysql_password = os.environ.get("MYSQL_PASSWORD", "123456")
mysql_port = int(os.environ.get("MYSQL_PORT", 3306))
mysql_db = os.environ.get("MYSQL_DB", "outzone_db")

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_db}"
)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# ─── Constants ────────────────────────────────────────────────────────────────
CATEGORY_DISPLAY = [
    "restaurants", "cafes", "cinemas", "karting", "escape rooms",
    "museums", "kids areas", "VR gaming", "bowling", "art spaces",
    "cultural centers", "theme parks", "live music", "arcade", "family entertainment",
]

# كلمات مرتبطة بكل category لتحسين الفهم
CATEGORY_SYNONYMS = {
    "restaurants": ["أكل", "مطعم", "طعام", "food", "eat", "dining", "مطاعم", "اكل"],
    "cafes": ["قهوة", "كافيه", "cafe", "coffee", "كوفي", "شاي", "tea"],
    "cinemas": ["سينما", "فيلم", "movie", "cinema", "film", "أفلام", "افلام"],
    "karting": ["كارتينج", "سباق", "race", "kart", "driving", "قيادة"],
    "escape rooms": ["escape", "هروب", "puzzle", "غرفة", "لغز", "ألغاز", "الغاز"],
    "museums": ["متحف", "تاريخ", "museum", "history", "حضارة", "ثقافة", "culture"],
    "kids areas": ["أطفال", "اطفال", "kids", "children", "child", "طفل", "playground"],
    "VR gaming": ["vr", "virtual", "افتراضي", "جيمنج", "gaming", "واقع افتراضي"],
    "bowling": ["بولينج", "bowling", "كرات"],
    "art spaces": ["فن", "art", "رسم", "drawing", "gallery", "جاليري", "معرض"],
    "cultural centers": ["ثقافة", "culture", "مسرح", "theater", "opera", "اوبرا", "فعاليات"],
    "theme parks": ["ملاهي", "amusement", "theme park", "rides", "مدينة العاب", "مدينة ألعاب"],
    "live music": ["موسيقى", "music", "حفلة", "concert", "band", "دي جي", "dj"],
    "arcade": ["arcade", "العاب", "ألعاب", "games", "جيمز"],
    "family entertainment": ["عيلة", "عائلة", "family", "families", "اسرة", "أسرة"],
}

BUDGET_SYNONYMS = {
    "low": ["رخيص", "cheap", "affordable", "budget", "مش غالي", "بسيط", "اقتصادي", "low", "ارخص", "قليل"],
    "medium": ["متوسط", "medium", "moderate", "معقول", "وسط"],
    "high": ["غالي", "expensive", "luxury", "فاخر", "high", "راقي", "premium"],
}

AUDIENCE_SYNONYMS = {
    "couples": ["كابل", "couple", "حبيبي", "رومانسي", "romantic", "اثنين", "زوجين"],
    "families": ["عيلة", "عائلة", "family", "families", "اسرة"],
    "friends": ["صحاب", "أصدقاء", "friends", "شلة", "جماعة", "group"],
    "kids": ["أطفال", "اطفال", "kids", "children", "طفل"],
    "students": ["طلاب", "students", "شباب", "youth"],
    "young adults": ["شباب", "young", "youth", "teens", "teenagers"],
    "culture lovers": ["ثقافة", "culture", "تاريخ", "history", "فن", "art"],
    "art lovers": ["فن", "art", "رسم", "drawing", "gallery"],
    "gamers": ["جيمنج", "gaming", "games", "ألعاب"],
}

MOOD_KEYWORDS = {
    "romantic": ["romantic", "رومانسي", "هادي", "quiet", "intimate", "مميز", "special"],
    "fun": ["fun", "مرح", "exciting", "تسلية", "مجنون", "crazy", "نشاط"],
    "relaxing": ["هادي", "relaxing", "calm", "هدوء", "استرخاء", "relax", "chill"],
    "adventurous": ["مغامرة", "adventure", "exciting", "تحدي", "challenge"],
    "educational": ["تعليم", "educational", "learn", "تعلم", "ثقافة", "culture"],
}


# ─── NLP Engine ───────────────────────────────────────────────────────────────
class SmartNLPRecommender:
    """
    محرك NLP محسّن بيستخدم:
    1. TF-IDF مع Arabic/English tokenization
    2. Synonym expansion للعربي والإنجليزي
    3. Weighted scoring لكل field بشكل مختلف
    4. Mood detection
    5. User activity personalization
    """

    def __init__(self):
        self._tfidf_cache = None
        self._places_cache = None

    def _tokenize(self, text: str) -> list[str]:
        """Tokenize مع دعم العربي والإنجليزي"""
        text = text.lower().strip()
        # فصل الكلمات العربية والإنجليزية
        tokens = re.findall(r'[\u0600-\u06FF]+|[a-zA-Z]+', text)
        return [t for t in tokens if len(t) > 1]

    def _expand_query(self, query: str) -> dict:
        """استخراج intent من الـ query"""
        query_lower = query.lower()
        tokens = self._tokenize(query)
        tokens_set = set(tokens)

        detected = {
            "categories": [],
            "budgets": [],
            "audiences": [],
            "moods": [],
            "raw_tokens": tokens,
        }

        # Category detection
        for category, synonyms in CATEGORY_SYNONYMS.items():
            for syn in synonyms:
                if syn in query_lower or any(syn in t for t in tokens):
                    if category not in detected["categories"]:
                        detected["categories"].append(category)

        # Budget detection
        for budget, synonyms in BUDGET_SYNONYMS.items():
            for syn in synonyms:
                if syn in query_lower:
                    if budget not in detected["budgets"]:
                        detected["budgets"].append(budget)

        # Audience detection
        for audience, synonyms in AUDIENCE_SYNONYMS.items():
            for syn in synonyms:
                if syn in query_lower:
                    if audience not in detected["audiences"]:
                        detected["audiences"].append(audience)

        # Mood detection
        for mood, synonyms in MOOD_KEYWORDS.items():
            for syn in synonyms:
                if syn in query_lower:
                    if mood not in detected["moods"]:
                        detected["moods"].append(mood)

        return detected

    def _build_place_tokens(self, place) -> dict[str, list[str]]:
        """بناء tokens لكل field بشكل منفصل"""
        return {
            "name": self._tokenize(place.name or ""),
            "category": self._tokenize(place.category or ""),
            "description": self._tokenize(place.description or ""),
            "audience": self._tokenize(place.audience or ""),
            "budget": self._tokenize(place.budget or ""),
            "location": self._tokenize(place.location or ""),
        }

    def _compute_tfidf(self, places):
        """حساب TF-IDF مع caching"""
        if self._places_cache and len(self._places_cache) == len(places):
            return self._tfidf_cache, self._places_cache

        # بناء corpus
        corpus = []
        for place in places:
            doc = " ".join([
                place.name or "",
                place.category or "",
                (place.description or "") * 2,  # وزن مضاعف للـ description
                place.audience or "",
                place.budget or "",
                place.location or "",
            ])
            corpus.append(doc.lower())

        # حساب TF-IDF يدوياً مع دعم عربي
        term_doc_count = defaultdict(int)
        doc_terms = []

        for doc in corpus:
            tokens = set(self._tokenize(doc))
            doc_terms.append(tokens)
            for token in tokens:
                term_doc_count[token] += 1

        n_docs = len(corpus)
        idf = {
            term: math.log((n_docs + 1) / (count + 1)) + 1
            for term, count in term_doc_count.items()
        }

        tfidf_vectors = []
        for i, doc in enumerate(corpus):
            tokens = self._tokenize(doc)
            tf = defaultdict(float)
            for token in tokens:
                tf[token] += 1
            if tokens:
                for token in tf:
                    tf[token] /= len(tokens)

            vector = {term: tf[term] * idf.get(term, 1) for term in tf}
            tfidf_vectors.append(vector)

        self._tfidf_cache = tfidf_vectors
        self._places_cache = places
        return tfidf_vectors, places

    def _cosine_similarity(self, vec1: dict, vec2: dict) -> float:
        """حساب cosine similarity بين vectorين"""
        if not vec1 or not vec2:
            return 0.0
        common = set(vec1.keys()) & set(vec2.keys())
        dot = sum(vec1[k] * vec2[k] for k in common)
        mag1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
        mag2 = math.sqrt(sum(v ** 2 for v in vec2.values()))
        if mag1 == 0 or mag2 == 0:
            return 0.0
        return dot / (mag1 * mag2)

    def _intent_score(self, place, intent: dict) -> float:
        """حساب score إضافي بناءً على الـ intent"""
        score = 0.0

        # Category match — وزن عالي
        for cat in intent["categories"]:
            if cat.lower() in (place.category or "").lower():
                score += 3.0

        # Budget match
        for budget in intent["budgets"]:
            if budget.lower() in (place.budget or "").lower():
                score += 2.0

        # Audience match
        for audience in intent["audiences"]:
            if audience.lower() in (place.audience or "").lower():
                score += 2.0

        # Mood match — يؤثر على description
        mood_boosts = {
            "romantic": ["couples", "نيل", "nile", "luxury", "view"],
            "fun": ["friends", "karting", "arcade", "bowling", "escape", "vr"],
            "relaxing": ["cafe", "museum", "art", "cultural"],
            "adventurous": ["karting", "escape", "vr", "theme park"],
            "educational": ["museum", "cultural", "history", "art"],
        }
        for mood in intent["moods"]:
            keywords = mood_boosts.get(mood, [])
            place_text = f"{place.category} {place.description} {place.audience}".lower()
            for kw in keywords:
                if kw in place_text:
                    score += 1.0

        return score

    def recommend(self, query: str = None, place_id: int = None,
                  top_n: int = 5, user_id: int = None) -> list:
        places = Place.query.all()
        if not places:
            return []

        tfidf_vectors, places = self._compute_tfidf(places)

        if place_id is not None:
            # Similar places
            target_idx = next((i for i, p in enumerate(places) if p.id == place_id), None)
            if target_idx is None:
                return None
            target_vector = tfidf_vectors[target_idx]
            intent = {}
        else:
            # Query-based
            intent = self._expand_query(query or "")
            # بناء query vector
            query_tokens = self._tokenize(query or "")
            # توسيع الـ query بالمرادفات
            expanded_tokens = list(query_tokens)
            for cat in intent["categories"]:
                expanded_tokens.extend(self._tokenize(cat))
            for audience in intent["audiences"]:
                expanded_tokens.extend(self._tokenize(audience))

            tf = defaultdict(float)
            for token in expanded_tokens:
                tf[token] += 1
            if expanded_tokens:
                for token in tf:
                    tf[token] /= len(expanded_tokens)

            # نحتاج IDF من الـ corpus
            term_doc_count = defaultdict(int)
            for vec in tfidf_vectors:
                for term in vec:
                    term_doc_count[term] += 1

            n_docs = len(tfidf_vectors)
            idf = {
                term: math.log((n_docs + 1) / (count + 1)) + 1
                for term, count in term_doc_count.items()
            }
            target_vector = {term: tf[term] * idf.get(term, 1.0) for term in tf}

        # Personalization: boost places based on user activity
        user_boosts = defaultdict(float)
        if user_id:
            activities = UserActivity.query.filter_by(
                user_id=user_id
            ).order_by(UserActivity.created_at.desc()).limit(50).all()

            for act in activities:
                try:
                    meta = json.loads(act.activity_data or "{}")
                except Exception:
                    meta = {}
                viewed_id = meta.get("place_id")
                if viewed_id:
                    viewed_place = Place.query.get(viewed_id)
                    if viewed_place:
                        # Boost places بنفس الـ category اللي المستخدم بصها
                        for i, p in enumerate(places):
                            if p.category == viewed_place.category and p.id != viewed_id:
                                user_boosts[p.id] += 0.3

        results = []
        for idx, place in enumerate(places):
            if place_id is not None and place.id == place_id:
                continue

            tfidf_score = self._cosine_similarity(target_vector, tfidf_vectors[idx])
            intent_score = self._intent_score(place, intent) if intent else 0.0
            rating_score = (place.rating or 0) / 10.0
            personalization_score = user_boosts.get(place.id, 0.0)

            # Final weighted score
            final_score = (
                tfidf_score * 0.40 +
                intent_score * 0.35 +
                rating_score * 0.15 +
                personalization_score * 0.10
            )

            results.append((final_score, tfidf_score, intent_score, place))

        results.sort(key=lambda x: x[0], reverse=True)

        return [
            {
                "score": round(score, 4),
                "tfidf_score": round(tfidf, 4),
                "intent_score": round(intent_s, 4),
                "matched_intent": intent if intent else {},
                "place": place.to_dict(),
            }
            for score, tfidf, intent_s, place in results[:top_n]
            if score > 0
        ]


# Singleton
nlp_recommender = SmartNLPRecommender()


# ─── Models ───────────────────────────────────────────────────────────────────
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    theme = db.Column(db.String(10), default="light")  # "light" | "dark"
    language = db.Column(db.String(10), default="en")
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    bookings = db.relationship("Booking", backref="user", lazy=True)
    favorites = db.relationship("Favorite", backref="user", lazy=True)
    reviews = db.relationship("Review", backref="user", lazy=True)
    activity = db.relationship("UserActivity", backref="user", lazy=True)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "is_admin": self.is_admin,
            "theme": self.theme,
            "language": self.language,
        }


class Place(db.Model):
    __tablename__ = "places"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(180), nullable=False)
    category = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    budget = db.Column(db.String(60), nullable=False)
    audience = db.Column(db.String(80), nullable=False)
    rating = db.Column(db.Float, nullable=False, default=4.0)
    image_url = db.Column(db.String(512), nullable=False)
    location = db.Column(db.String(160), nullable=True)
    address = db.Column(db.String(256), nullable=True)
    city = db.Column(db.String(120), nullable=True)
    price_range = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    bookings = db.relationship("Booking", backref="place", lazy=True)
    favorites = db.relationship("Favorite", backref="place", lazy=True)
    reviews = db.relationship("Review", backref="place", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "budget": self.budget,
            "audience": self.audience,
            "rating": self.rating,
            "image_url": self.image_url,
            "location": self.location,
            "address": self.address,
            "city": self.city,
            "price_range": self.price_range,
        }


class Booking(db.Model):
    __tablename__ = "bookings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    place_id = db.Column(db.Integer, db.ForeignKey("places.id"), nullable=False)
    start_datetime = db.Column(db.DateTime, nullable=False)
    end_datetime = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(50), default="confirmed")
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "place_id": self.place_id,
            "place_name": self.place.name if self.place else None,
            "start_datetime": self.start_datetime.isoformat(),
            "end_datetime": self.end_datetime.isoformat(),
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }


class Favorite(db.Model):
    __tablename__ = "favorites"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    place_id = db.Column(db.Integer, db.ForeignKey("places.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("user_id", "place_id", name="uix_user_place_favorite"),)

    def to_dict(self):
        return {
            "id": self.id,
            "place": self.place.to_dict() if self.place else None,
            "created_at": self.created_at.isoformat(),
        }


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    place_id = db.Column(db.Integer, db.ForeignKey("places.id"), nullable=False)
    rating = db.Column(db.Float, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("user_id", "place_id", name="uix_user_place_review"),)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "place_id": self.place_id,
            "username": self.user.username if self.user else None,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat(),
        }


class UserActivity(db.Model):
    __tablename__ = "user_activity"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(120), nullable=False)
    activity_data = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        payload = {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "created_at": self.created_at.isoformat(),
        }
        try:
            payload["metadata"] = json.loads(self.activity_data) if self.activity_data else {}
        except Exception:
            payload["metadata"] = self.activity_data or {}
        return payload


# ─── Helpers ──────────────────────────────────────────────────────────────────
def create_response(message, data=None, status=200):
    response = {"message": message}
    if data is not None:
        response["data"] = data
    return jsonify(response), status


def parse_datetime(value: str):
    try:
        return datetime.datetime.fromisoformat(value)
    except ValueError:
        raise ValueError("Use ISO 8601 datetime format: YYYY-MM-DDTHH:MM:SS")


def get_current_user():
    return User.query.get(get_jwt_identity())


def log_activity(user_id, action, metadata=None):
    try:
        record = UserActivity(
            user_id=user_id,
            action=action,
            activity_data=json.dumps(metadata or {}),  # ← صح دلوقتي
        )
        db.session.add(record)
        db.session.commit()
    except Exception:
        db.session.rollback()


def create_database_if_missing():
    try:
        connection = pymysql.connect(
            host=mysql_host, user=mysql_user, password=mysql_password,
            port=mysql_port, cursorclass=pymysql.cursors.DictCursor,
        )
        with connection.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{mysql_db}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
        connection.commit()
        connection.close()
    except Exception as exc:
        app.logger.warning("Could not create database: %s", exc)


# ─── Seed Data ────────────────────────────────────────────────────────────────
def seed_places():
    places = [
        {"name": "Zooba", "category": "restaurants", "description": "Iconic Egyptian street food restaurant with a modern menu and fresh spices.", "budget": "Medium", "audience": "Friends", "rating": 4.7, "image_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80", "location": "Zamalek, Cairo", "address": "26 Abou El Feda St, Zamalek", "city": "Cairo"},
        {"name": "Sequoia", "category": "restaurants", "description": "Luxury riverside dining with seafood and panoramic Nile views.", "budget": "High", "audience": "Couples", "rating": 4.9, "image_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80", "location": "Zamalek, Cairo", "address": "Corniche El Nil, Zamalek", "city": "Cairo"},
        {"name": "Maison Thomas", "category": "restaurants", "description": "Classic Italian pizzeria in the heart of Cairo with a family-friendly atmosphere.", "budget": "Medium", "audience": "Families", "rating": 4.4, "image_url": "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1200&q=80", "location": "Downtown, Cairo", "address": "35 Talaat Harb St, Downtown", "city": "Cairo"},
        {"name": "Abou El Sid", "category": "restaurants", "description": "Authentic Egyptian restaurant serving traditional dishes in a warm setting.", "budget": "Medium", "audience": "Families", "rating": 4.6, "image_url": "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80", "location": "Maadi, Cairo", "address": "26 Saray El Maadi St, Maadi", "city": "Cairo"},
        {"name": "Buddha Bar Cafe", "category": "cafes", "description": "Trendy café for coffee, desserts and chilled evening vibes in New Cairo.", "budget": "High", "audience": "Couples", "rating": 4.5, "image_url": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80", "location": "New Cairo", "address": "1 Dandy Mall, 90 St, New Cairo", "city": "Cairo"},
        {"name": "Beanos Cafe", "category": "cafes", "description": "Comfortable café chain with specialty coffee, snacks and a relaxed social atmosphere.", "budget": "Low", "audience": "Students", "rating": 4.3, "image_url": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80", "location": "Nasr City, Cairo", "address": "15 El Basateen St, Nasr City", "city": "Cairo"},
        {"name": "30 North", "category": "cafes", "description": "Cozy cafe with modern coffee, health bowls and waterfront views.", "budget": "Medium", "audience": "Friends", "rating": 4.4, "image_url": "https://images.unsplash.com/photo-1517686469429-8bdbff2d49a9?auto=format&fit=crop&w=1200&q=80", "location": "Heliopolis, Cairo", "address": "Corniche El Nil, Heliopolis", "city": "Cairo"},
        {"name": "Cilantro", "category": "cafes", "description": "Popular café serving international breakfast, brunch, and coffee favorites.", "budget": "Medium", "audience": "Couples", "rating": 4.2, "image_url": "https://images.unsplash.com/photo-1523475496153-3d6cc83f62de?auto=format&fit=crop&w=1200&q=80", "location": "Zamalek, Cairo", "address": "El Gezira Club, Zamalek", "city": "Cairo"},
        {"name": "VOX Cinemas Mall of Arabia", "category": "cinemas", "description": "Large premium cinema complex with IMAX, 4DX and VIP screening rooms.", "budget": "Medium", "audience": "Friends", "rating": 4.6, "image_url": "https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=1200&q=80", "location": "6th of October", "address": "Mall of Arabia, 6th of October", "city": "Cairo"},
        {"name": "Renaissance Cinema", "category": "cinemas", "description": "Boutique theatre with comfortable seating and a premium viewing experience.", "budget": "Medium", "audience": "Couples", "rating": 4.3, "image_url": "https://images.unsplash.com/photo-1517153296315-9d3092b54e83?auto=format&fit=crop&w=1200&q=80", "location": "Maadi, Cairo", "address": "184 Degla St, Maadi", "city": "Cairo"},
        {"name": "Galaxy Cinema", "category": "cinemas", "description": "Modern multiscreen cinema in a busy entertainment mall.", "budget": "Low", "audience": "Families", "rating": 4.1, "image_url": "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=1200&q=80", "location": "Cairo Festival City", "address": "Cairo Festival City Mall, New Cairo", "city": "Cairo"},
        {"name": "Zawya Cinema", "category": "cinemas", "description": "Independent art house cinema showcasing international films and events.", "budget": "Low", "audience": "Couples", "rating": 4.5, "image_url": "https://images.unsplash.com/photo-1542204165-3f3cd5f5a9dc?auto=format&fit=crop&w=1200&q=80", "location": "6th of October", "address": "Al Masah Plaza, 6th of October", "city": "Cairo"},
        {"name": "Autodrome Karting", "category": "karting", "description": "Indoor and outdoor karting track designed for competitive racing and teams.", "budget": "Medium", "audience": "Friends", "rating": 4.4, "image_url": "https://images.unsplash.com/photo-1517638851339-4dca3f8b1a0d?auto=format&fit=crop&w=1200&q=80", "location": "New Giza, Cairo", "address": "Autodrome, New Giza", "city": "Cairo"},
        {"name": "Go Karting Cairo", "category": "karting", "description": "Indoor electric karting track offering timed races for adults and teens.", "budget": "Medium", "audience": "Young Adults", "rating": 4.2, "image_url": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80", "location": "Downtown, Cairo", "address": "Complex 5, Downtown Cairo", "city": "Cairo"},
        {"name": "Sphinx Karting", "category": "karting", "description": "Family-friendly kart racing with professional timing systems and team events.", "budget": "Medium", "audience": "Families", "rating": 4.0, "image_url": "https://images.unsplash.com/photo-1517630441308-16bf0b30ed01?auto=format&fit=crop&w=1200&q=80", "location": "Zamalek, Cairo", "address": "El Thawra St, Zamalek", "city": "Cairo"},
        {"name": "The Grand Karting", "category": "karting", "description": "Large indoor track for endurance races, birthday parties and group bookings.", "budget": "Medium", "audience": "Groups", "rating": 4.3, "image_url": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80", "location": "Nasr City, Cairo", "address": "City Centre, Nasr City", "city": "Cairo"},
        {"name": "Escapology Cairo", "category": "escape rooms", "description": "Immersive escape room challenges with themed adventures and puzzles.", "budget": "Medium", "audience": "Friends", "rating": 4.5, "image_url": "https://images.unsplash.com/photo-1504805572947-34fad45aed93?auto=format&fit=crop&w=1200&q=80", "location": "6th of October", "address": "Mall of Arabia, 6th of October", "city": "Cairo"},
        {"name": "Room Escape Egypt", "category": "escape rooms", "description": "Fun team-based escape rooms with multiple difficulty levels and seasonal themes.", "budget": "Low", "audience": "Teams", "rating": 4.2, "image_url": "https://images.unsplash.com/photo-1520353411628-511ec800d192?auto=format&fit=crop&w=1200&q=80", "location": "Mohandessin, Cairo", "address": "Giza Street, Mohandessin", "city": "Cairo"},
        {"name": "MindMaze Cairo", "category": "escape rooms", "description": "High-production escape rooms designed for families and corporate groups.", "budget": "Medium", "audience": "Families", "rating": 4.3, "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80", "location": "New Cairo", "address": "Cairo Festival City, New Cairo", "city": "Cairo"},
        {"name": "Art of Escape", "category": "escape rooms", "description": "Creative escape experiences with electronic puzzles and immersive sets.", "budget": "Medium", "audience": "Young Adults", "rating": 4.4, "image_url": "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=80", "location": "Zamalek, Cairo", "address": "15 Sherif St, Zamalek", "city": "Cairo"},
        {"name": "Egyptian Museum", "category": "museums", "description": "World-famous museum housing ancient Egyptian artifacts and royal treasures.", "budget": "Low", "audience": "Culture Lovers", "rating": 4.8, "image_url": "https://images.unsplash.com/photo-1514474959185-2c9c7be1d5ea?auto=format&fit=crop&w=1200&q=80", "location": "Tahrir Square, Cairo", "address": "Tahrir Square, Downtown", "city": "Cairo"},
        {"name": "Museum of Islamic Art", "category": "museums", "description": "Extensive Islamic art collections in a restored palace on the Nile bank.", "budget": "Low", "audience": "Couples", "rating": 4.7, "image_url": "https://images.unsplash.com/photo-1504198266280-5f5b39af6e0f?auto=format&fit=crop&w=1200&q=80", "location": "Bab El Khalq, Cairo", "address": "Al Galaa St, Bab El Khalq", "city": "Cairo"},
        {"name": "National Museum of Egyptian Civilization", "category": "museums", "description": "Modern museum showcasing Egyptian history from pharaonic to modern times.", "budget": "Low", "audience": "Families", "rating": 4.7, "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80", "location": "Fustat, Cairo", "address": "Al Tanzim St, Fustat", "city": "Cairo"},
        {"name": "Coptic Museum", "category": "museums", "description": "Historic museum celebrating Coptic art, textiles and Christian heritage.", "budget": "Low", "audience": "Culture Lovers", "rating": 4.6, "image_url": "https://images.unsplash.com/photo-1578802402122-2691c8e811c4?auto=format&fit=crop&w=1200&q=80", "location": "Coptic Cairo", "address": "Mar Girgis St, Coptic Cairo", "city": "Cairo"},
        {"name": "KidZania Cairo", "category": "kids areas", "description": "Interactive educational city where children role-play careers and learn through play.", "budget": "Medium", "audience": "Kids", "rating": 4.5, "image_url": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", "location": "Cairo Festival City", "address": "Cairo Festival City Mall, New Cairo", "city": "Cairo"},
        {"name": "Magic Planet", "category": "kids areas", "description": "Family entertainment center with arcade games, rides and soft play for children.", "budget": "Medium", "audience": "Families", "rating": 4.3, "image_url": "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&w=1200&q=80", "location": "6th of October", "address": "Mall of Arabia, 6th of October", "city": "Cairo"},
        {"name": "Little Venice Family Entertainment", "category": "kids areas", "description": "Amusement center with mini golf, soft play and family rides inside a themed mall.", "budget": "Low", "audience": "Kids", "rating": 4.1, "image_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80", "location": "New Cairo", "address": "Sun City Complex, New Cairo", "city": "Cairo"},
        {"name": "Birds of a Feather Kids Club", "category": "kids areas", "description": "Creative indoor play and educational activities for young children.", "budget": "Medium", "audience": "Kids", "rating": 4.4, "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80", "location": "Heliopolis, Cairo", "address": "3 Al Orouba St, Heliopolis", "city": "Cairo"},
        {"name": "VR Park Cairo Festival", "category": "VR gaming", "description": "Virtual reality arcade with immersive games, escape experiences and simulator rides.", "budget": "Medium", "audience": "Gamers", "rating": 4.4, "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80", "location": "Cairo Festival City", "address": "Cairo Festival City Mall, New Cairo", "city": "Cairo"},
        {"name": "The VR Studio", "category": "VR gaming", "description": "Private VR suites with multiplayer virtual reality titles and team missions.", "budget": "High", "audience": "Friends", "rating": 4.5, "image_url": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80", "location": "New Cairo", "address": "Cairo Festival City, New Cairo", "city": "Cairo"},
        {"name": "Third Eye VR", "category": "VR gaming", "description": "Modern VR lounge offering futuristic games, virtual tours and immersive challenges.", "budget": "Medium", "audience": "Young Adults", "rating": 4.3, "image_url": "https://images.unsplash.com/photo-1531874826389-0ea1c882ebb5?auto=format&fit=crop&w=1200&q=80", "location": "Dokki, Cairo", "address": "Ahmed Orabi St, Dokki", "city": "Cairo"},
        {"name": "VR Escape Cairo", "category": "VR gaming", "description": "VR escape room sessions where players solve puzzles in virtual spaces.", "budget": "Medium", "audience": "Friends", "rating": 4.2, "image_url": "https://images.unsplash.com/photo-1518779578993-ecb7f0f667df?auto=format&fit=crop&w=1200&q=80", "location": "Mohandessin, Cairo", "address": "Haran St, Mohandessin", "city": "Cairo"},
        {"name": "Aladdin Bowling", "category": "bowling", "description": "Bowling alley with lanes, snacks, event space and live DJ nights.", "budget": "Medium", "audience": "Groups", "rating": 4.3, "image_url": "https://images.unsplash.com/photo-1518226103954-1be68468034e?auto=format&fit=crop&w=1200&q=80", "location": "New Cairo", "address": "5th Settlement, New Cairo", "city": "Cairo"},
        {"name": "Strike Zone", "category": "bowling", "description": "Family friendly bowling alley with arcade games and refreshments.", "budget": "Low", "audience": "Families", "rating": 4.2, "image_url": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80", "location": "Heliopolis, Cairo", "address": "10 El Sarayat St, Heliopolis", "city": "Cairo"},
        {"name": "Dream Bowl", "category": "bowling", "description": "Colorful bowling lanes with party packages and private events.", "budget": "Low", "audience": "Friends", "rating": 4.0, "image_url": "https://images.unsplash.com/photo-1508098682722-e99ad7cf8da7?auto=format&fit=crop&w=1200&q=80", "location": "6th of October", "address": "Mall of Arabia, 6th of October", "city": "Cairo"},
        {"name": "Bowling City", "category": "bowling", "description": "Bowling alley with league play and weekend specials in a large entertainment mall.", "budget": "Medium", "audience": "Groups", "rating": 4.1, "image_url": "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80", "location": "Nasr City, Cairo", "address": "City Centre, Nasr City", "city": "Cairo"},
        {"name": "Townhouse Gallery", "category": "art spaces", "description": "Contemporary art gallery and cultural hub hosting exhibitions and workshops.", "budget": "Low", "audience": "Art Lovers", "rating": 4.6, "image_url": "https://images.unsplash.com/photo-1470506028280-943b7fbdc4f6?auto=format&fit=crop&w=1200&q=80", "location": "Downtown, Cairo", "address": "28 Maydan El Gezira, Downtown", "city": "Cairo"},
        {"name": "Mashrabia Art Space", "category": "art spaces", "description": "Creative studio for painting, ceramics, and community art classes.", "budget": "Low", "audience": "Adults", "rating": 4.4, "image_url": "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?auto=format&fit=crop&w=1200&q=80", "location": "Zamalek, Cairo", "address": "15 El Nozha St, Zamalek", "city": "Cairo"},
        {"name": "Picasso Art Gallery", "category": "art spaces", "description": "Private gallery specializing in modern art exhibitions and artist residencies.", "budget": "Medium", "audience": "Art Lovers", "rating": 4.2, "image_url": "https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=1200&q=80", "location": "Mohandessin, Cairo", "address": "45 El Hegaz St, Mohandessin", "city": "Cairo"},
        {"name": "Almashtal Art Space", "category": "art spaces", "description": "Gallery and workshop venue featuring live painting sessions and classes.", "budget": "Medium", "audience": "Students", "rating": 4.3, "image_url": "https://images.unsplash.com/photo-1473187983305-f615310e7daa?auto=format&fit=crop&w=1200&q=80", "location": "Zamalek, Cairo", "address": "6 Hassan Sabry Street, Zamalek", "city": "Cairo"},
        {"name": "Cairo Opera House", "category": "cultural centers", "description": "Major cultural venue hosting opera, ballet, concerts and cultural festivals.", "budget": "High", "audience": "Culture Lovers", "rating": 4.8, "image_url": "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?auto=format&fit=crop&w=1200&q=80", "location": "Gezira Island, Cairo", "address": "Opera Square, Zamalek", "city": "Cairo"},
        {"name": "El Sawy Culture Wheel", "category": "cultural centers", "description": "Community cultural center for music, theater, cinema and creative events.", "budget": "Low", "audience": "Students", "rating": 4.5, "image_url": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", "location": "Zamalek, Cairo", "address": "26th of July St, Zamalek", "city": "Cairo"},
        {"name": "Gezira Art Center", "category": "cultural centers", "description": "Art and performance space inside the sculpture garden next to Cairo Opera House.", "budget": "Low", "audience": "Culture Lovers", "rating": 4.4, "image_url": "https://images.unsplash.com/photo-1497551060073-4c5ab6435f08?auto=format&fit=crop&w=1200&q=80", "location": "Gezira Island, Cairo", "address": "Cairo Opera House Complex", "city": "Cairo"},
        {"name": "D-CAF Showcase", "category": "cultural centers", "description": "Temporary cultural stage for downtown arts festival performances.", "budget": "Low", "audience": "Young Adults", "rating": 4.5, "image_url": "https://images.unsplash.com/photo-1488188148898-47c8c8f2b2c6?auto=format&fit=crop&w=1200&q=80", "location": "Downtown, Cairo", "address": "GrEEK Campus, Downtown", "city": "Cairo"},
        {"name": "Dream Park", "category": "theme parks", "description": "Major amusement park with roller coasters, carnival rides and live shows.", "budget": "Medium", "audience": "Families", "rating": 4.3, "image_url": "https://images.unsplash.com/photo-1504274066651-8d31a536b11a?auto=format&fit=crop&w=1200&q=80", "location": "6th of October", "address": "Dream Park, 6th of October", "city": "Cairo"},
        {"name": "Sindbad Amusement Park", "category": "theme parks", "description": "Classic amusement park featuring family rides, games and food stalls.", "budget": "Low", "audience": "Kids", "rating": 4.1, "image_url": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80", "location": "6th of October", "address": "Cairo-Alexandria Desert Road", "city": "Cairo"},
        {"name": "Aqua Park", "category": "theme parks", "description": "Water park with slides, wave pools and shaded family areas.", "budget": "Low", "audience": "Families", "rating": 4.2, "image_url": "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1200&q=80", "location": "6th of October", "address": "Aqua Park Road, 6th of October", "city": "Cairo"},
        {"name": "Magic Holidays Aqua Park", "category": "theme parks", "description": "Large waterpark with slides, pools and family cabanas.", "budget": "Medium", "audience": "Groups", "rating": 4.2, "image_url": "https://images.unsplash.com/photo-1496347646636-ea47f6f65f46?auto=format&fit=crop&w=1200&q=80", "location": "6th of October", "address": "Magic Holidays Resort, 6th of October", "city": "Cairo"},
        {"name": "Cairo Jazz Club", "category": "live music", "description": "Iconic live music club hosting bands, DJs and cultural nights.", "budget": "High", "audience": "Young Adults", "rating": 4.7, "image_url": "https://images.unsplash.com/photo-1511376777868-611b54f68947?auto=format&fit=crop&w=1200&q=80", "location": "6th of October", "address": "Cairo Jazz Club, 6th of October", "city": "Cairo"},
        {"name": "Babylon Cairo", "category": "live music", "description": "Hip nightclub with live bands, dance floors and energetic nightlife events.", "budget": "High", "audience": "Friends", "rating": 4.4, "image_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80", "location": "New Cairo", "address": "American University in Cairo, New Cairo", "city": "Cairo"},
        {"name": "The Tap West", "category": "live music", "description": "Brewpub and venue with live concerts, craft drinks and outdoor seating.", "budget": "Medium", "audience": "Friends", "rating": 4.2, "image_url": "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80", "location": "Downtown, Cairo", "address": "Cairo Mall Street, Downtown", "city": "Cairo"},
        {"name": "Cairo Opera Club", "category": "live music", "description": "Live music space inside opera house complex for classical and contemporary shows.", "budget": "High", "audience": "Culture Lovers", "rating": 4.5, "image_url": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80", "location": "Zamalek, Cairo", "address": "Cairo Opera House, Zamalek", "city": "Cairo"},
        {"name": "Funscape Arcade", "category": "arcade", "description": "Arcade center packed with racing games, VR pods and skill challenges.", "budget": "Low", "audience": "Kids", "rating": 4.3, "image_url": "https://images.unsplash.com/photo-1541544180-3a4f9d60a8c0?auto=format&fit=crop&w=1200&q=80", "location": "New Cairo", "address": "Sun City Mall, New Cairo", "city": "Cairo"},
        {"name": "GameHub Arena", "category": "arcade", "description": "Gaming lounge with retro cabinets, competitive consoles and family fun.", "budget": "Low", "audience": "Friends", "rating": 4.2, "image_url": "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80", "location": "Mohandessin, Cairo", "address": "4 Roushdy St, Mohandessin", "city": "Cairo"},
        {"name": "PlayTown Arcade", "category": "arcade", "description": "Bright arcade with ticket games, simulators and multiplayer entertainment.", "budget": "Low", "audience": "Families", "rating": 4.0, "image_url": "https://images.unsplash.com/photo-1494256997604-768d1f608cac?auto=format&fit=crop&w=1200&q=80", "location": "Zamalek, Cairo", "address": "12 El Galaa St, Zamalek", "city": "Cairo"},
        {"name": "Pixel Arcade", "category": "arcade", "description": "Modern gaming arcade with virtual reality, air hockey and classic games.", "budget": "Medium", "audience": "Teenagers", "rating": 4.1, "image_url": "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1200&q=80", "location": "Maadi, Cairo", "address": "11 Road 9, Maadi", "city": "Cairo"},
        {"name": "Adventure World", "category": "family entertainment", "description": "Indoor family playground with obstacle courses, slides and live entertainment.", "budget": "Medium", "audience": "Families", "rating": 4.3, "image_url": "https://images.unsplash.com/photo-1519112239013-db1c93a9cc18?auto=format&fit=crop&w=1200&q=80", "location": "Heliopolis, Cairo", "address": "10 El Hegaz St, Heliopolis", "city": "Cairo"},
        {"name": "Family Fun City", "category": "family entertainment", "description": "Entertainment zone with indoor rides, crafts, and a food court for families.", "budget": "Low", "audience": "Kids", "rating": 4.2, "image_url": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", "location": "New Cairo", "address": "Cairo Festival City, New Cairo", "city": "Cairo"},
        {"name": "Kidzpalace", "category": "family entertainment", "description": "Children's activity center with birthday rooms, arts and crafts, and play areas.", "budget": "Low", "audience": "Kids", "rating": 4.1, "image_url": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80", "location": "6th of October", "address": "Mall of Arabia, 6th of October", "city": "Cairo"},
        {"name": "Cairo Family Park", "category": "family entertainment", "description": "Park and entertainment complex with mini rides, carnival food and family zones.", "budget": "Low", "audience": "Families", "rating": 4.0, "image_url": "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1200&q=80", "location": "New Cairo", "address": "Sun City Arcades, New Cairo", "city": "Cairo"},
    ]
    db.session.bulk_insert_mappings(Place, places)
    db.session.commit()


def init_database():
    create_database_if_missing()
    db.create_all()  # ← مش drop_all، بيخلق الجداول الناقصة بس

    if not User.query.filter_by(username="admin").first():
        admin = User(username="admin", email="admin@outzone.local", is_admin=True)
        admin.set_password("adminpass")
        db.session.add(admin)
        db.session.commit()

    if Place.query.count() == 0:
        seed_places()


with app.app_context():
    init_database()


# ─── Auth Routes ──────────────────────────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return create_response("username, email, and password are required", status=400)
    if User.query.filter(or_(User.username == username, User.email == email)).first():
        return create_response("Username or email already registered", status=400)

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    log_activity(user.id, "register", {"username": username})
    return create_response("User registered successfully", {"user_id": user.id}, status=201)


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return create_response("username and password are required", status=400)
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return create_response("Invalid credentials", status=401)

    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    log_activity(user.id, "login", {"username": username})
    return create_response(
        "Login successful",
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user.to_dict(),
        },
    )


@app.route("/api/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    return create_response("Token refreshed", {"access_token": access_token})


@app.route("/api/auth/profile", methods=["GET"])
@jwt_required()
def profile():
    user = get_current_user()
    if not user:
        return create_response("User not found", status=404)
    return create_response("Profile retrieved", user.to_dict())


@app.route("/api/auth/profile", methods=["PATCH"])
@jwt_required()
def update_profile():
    """تحديث theme أو language"""
    user = get_current_user()
    if not user:
        return create_response("User not found", status=404)
    data = request.get_json() or {}
    if "theme" in data:
        if data["theme"] not in ("light", "dark"):
            return create_response("theme must be 'light' or 'dark'", status=400)
        user.theme = data["theme"]
    if "language" in data:
        if data["language"] not in ("en", "ar", "fr"):
            return create_response("language must be 'en', 'ar', or 'fr'", status=400)
        user.language = data["language"]
    db.session.commit()
    log_activity(user.id, "update_profile", {"theme": user.theme, "language": user.language})
    return create_response("Profile updated", user.to_dict())


# ─── Places Routes ────────────────────────────────────────────────────────────
@app.route("/api/places", methods=["GET"])
def list_places():
    q = request.args.get("q", "", type=str).strip()
    category = request.args.get("category", "", type=str).strip().lower()
    budget = request.args.get("budget", "", type=str).strip().lower()
    audience = request.args.get("audience", "", type=str).strip().lower()

    query = Place.query
    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Place.name.ilike(search),
                Place.category.ilike(search),
                Place.description.ilike(search),
                Place.audience.ilike(search),
                Place.location.ilike(search),
            )
        )
    if category:
        query = query.filter(Place.category.ilike(f"%{category}%"))
    if budget:
        query = query.filter(Place.budget.ilike(f"%{budget}%"))
    if audience:
        query = query.filter(Place.audience.ilike(f"%{audience}%"))

    places = query.order_by(Place.rating.desc()).limit(100).all()
    return create_response("Places retrieved", [p.to_dict() for p in places])


@app.route("/api/places/<int:place_id>", methods=["GET"])
def get_place(place_id):
    place = Place.query.get(place_id)
    if not place:
        return create_response("Place not found", status=404)

    # optional JWT
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        pass

    if user_id:
        log_activity(user_id, "view_place", {"place_id": place.id, "name": place.name})
    return create_response("Place retrieved", place.to_dict())


@app.route("/api/categories", methods=["GET"])
def list_categories():
    return create_response("Categories retrieved", CATEGORY_DISPLAY)


# ─── Recommendation Route ─────────────────────────────────────────────────────
@app.route("/api/recommend", methods=["GET"])
def recommend_route():
    """
    Smart NLP recommendations.

    Query params:
      - q        : natural language query (Arabic or English)
      - place_id : get similar places to a specific place
      - top_n    : number of results (default 5)

    Examples:
      /api/recommend?q=عايز مكان رومانسي مع صحابي بميزانية متوسطة
      /api/recommend?q=fun activities for kids cheap
      /api/recommend?place_id=3
    """
    place_id = request.args.get("place_id", type=int)
    q = request.args.get("q", type=str)
    top_n = request.args.get("top_n", default=5, type=int)

    if not place_id and not q:
        return create_response("place_id or q query parameter required", status=400)

    # optional user for personalization
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        pass

    results = nlp_recommender.recommend(query=q, place_id=place_id, top_n=top_n, user_id=user_id)
    if results is None:
        return create_response("Place not found", status=404)

    # log activity
    if user_id and q:
        log_activity(user_id, "search_recommend", {"query": q})

    return create_response("Recommendations generated", {
        "query": q,
        "place_id": place_id,
        "count": len(results),
        "recommendations": results,
    })


# ─── Reviews Routes ───────────────────────────────────────────────────────────
@app.route("/api/reviews", methods=["POST"])
@jwt_required()
def create_review():
    user = get_current_user()
    data = request.get_json() or {}
    place_id = data.get("place_id")
    rating = data.get("rating")
    comment = data.get("comment", "")

    if not place_id or rating is None:
        return create_response("place_id and rating are required", status=400)
    place = Place.query.get(place_id)
    if not place:
        return create_response("Place not found", status=404)
    if not (1 <= float(rating) <= 5):
        return create_response("Rating must be between 1 and 5", status=400)

    existing = Review.query.filter_by(user_id=user.id, place_id=place.id).first()
    if existing:
        existing.rating = float(rating)
        existing.comment = comment
        db.session.commit()
        review = existing
    else:
        review = Review(user_id=user.id, place_id=place.id, rating=float(rating), comment=comment)
        db.session.add(review)
        db.session.commit()

    # إعادة حساب متوسط الـ rating
    all_reviews = Review.query.filter_by(place_id=place.id).all()
    place.rating = round(sum(r.rating for r in all_reviews) / len(all_reviews), 2)
    db.session.commit()

    # invalidate NLP cache
    nlp_recommender._tfidf_cache = None
    nlp_recommender._places_cache = None

    log_activity(user.id, "review", {"place_id": place.id, "rating": float(rating)})
    return create_response("Review recorded", review.to_dict(), status=201)


@app.route("/api/places/<int:place_id>/reviews", methods=["GET"])
def list_reviews(place_id):
    place = Place.query.get(place_id)
    if not place:
        return create_response("Place not found", status=404)
    reviews = Review.query.filter_by(place_id=place.id).order_by(Review.created_at.desc()).all()
    return create_response("Reviews retrieved", [r.to_dict() for r in reviews])


# ─── Favorites Routes ─────────────────────────────────────────────────────────
@app.route("/api/favorites", methods=["GET"])
@jwt_required()
def list_favorites():
    user = get_current_user()
    favorites = Favorite.query.filter_by(user_id=user.id).all()
    return create_response("Favorites retrieved", [f.to_dict() for f in favorites])


@app.route("/api/favorites", methods=["POST"])
@jwt_required()
def add_favorite():
    user = get_current_user()
    data = request.get_json() or {}
    place_id = data.get("place_id")
    if not place_id:
        return create_response("place_id is required", status=400)
    place = Place.query.get(place_id)
    if not place:
        return create_response("Place not found", status=404)
    existing = Favorite.query.filter_by(user_id=user.id, place_id=place.id).first()
    if existing:
        return create_response("Place already in favorites", status=200)
    favorite = Favorite(user_id=user.id, place_id=place.id)
    db.session.add(favorite)
    db.session.commit()
    log_activity(user.id, "favorite", {"place_id": place.id})
    return create_response("Added to favorites", favorite.to_dict(), status=201)


@app.route("/api/favorites/<int:place_id>", methods=["DELETE"])
@jwt_required()
def remove_favorite(place_id):
    user = get_current_user()
    favorite = Favorite.query.filter_by(user_id=user.id, place_id=place_id).first()
    if not favorite:
        return create_response("Favorite not found", status=404)
    db.session.delete(favorite)
    db.session.commit()
    return create_response("Removed from favorites")


# ─── Bookings Routes ──────────────────────────────────────────────────────────
@app.route("/api/bookings", methods=["GET"])
@jwt_required()
def list_bookings():
    user = get_current_user()
    if user.is_admin:
        bookings = Booking.query.order_by(Booking.start_datetime.desc()).all()
    else:
        bookings = Booking.query.filter_by(user_id=user.id).order_by(Booking.start_datetime.desc()).all()
    return create_response("Bookings retrieved", [b.to_dict() for b in bookings])


@app.route("/api/bookings", methods=["POST"])
@jwt_required()
def create_booking():
    user = get_current_user()
    data = request.get_json() or {}
    place_id = data.get("place_id")
    start_datetime = data.get("start_datetime")
    end_datetime = data.get("end_datetime")

    if not place_id or not start_datetime or not end_datetime:
        return create_response("place_id, start_datetime, and end_datetime are required", status=400)
    place = Place.query.get(place_id)
    if not place:
        return create_response("Place not found", status=404)
    try:
        start = parse_datetime(start_datetime)
        end = parse_datetime(end_datetime)
    except ValueError as exc:
        return create_response(str(exc), status=400)
    if start >= end:
        return create_response("start_datetime must be before end_datetime", status=400)

    conflict = Booking.query.filter(
        Booking.place_id == place.id,
        Booking.status != "cancelled",
        Booking.start_datetime < end,
        Booking.end_datetime > start,
    ).first()
    if conflict:
        return create_response("The selected time slot is already booked", status=409)

    booking = Booking(user_id=user.id, place_id=place.id, start_datetime=start, end_datetime=end)
    db.session.add(booking)
    db.session.commit()
    log_activity(user.id, "booking", {"place_id": place.id, "start": start_datetime, "end": end_datetime})
    return create_response("Booking confirmed", booking.to_dict(), status=201)


@app.route("/api/bookings/<int:booking_id>", methods=["GET"])
@jwt_required()
def get_booking(booking_id):
    user = get_current_user()
    booking = Booking.query.get(booking_id)
    if not booking:
        return create_response("Booking not found", status=404)
    if booking.user_id != user.id and not user.is_admin:
        return create_response("Access denied", status=403)
    return create_response("Booking retrieved", booking.to_dict())


@app.route("/api/bookings/<int:booking_id>", methods=["DELETE"])
@jwt_required()
def cancel_booking(booking_id):
    user = get_current_user()
    booking = Booking.query.get(booking_id)
    if not booking:
        return create_response("Booking not found", status=404)
    if booking.user_id != user.id and not user.is_admin:
        return create_response("Access denied", status=403)
    booking.status = "cancelled"
    db.session.commit()
    log_activity(user.id, "cancel_booking", {"booking_id": booking.id})
    return create_response("Booking cancelled", booking.to_dict())


# ─── Activity Route ───────────────────────────────────────────────────────────
@app.route("/api/activity", methods=["GET"])
@jwt_required()
def get_activity():
    user = get_current_user()
    activities = (
        UserActivity.query
        .filter_by(user_id=user.id)
        .order_by(UserActivity.created_at.desc())
        .limit(100)
        .all()
    )
    return create_response("Activity retrieved", [a.to_dict() for a in activities])


# ─── Error Handlers ───────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(error):
    return create_response("Resource not found", status=404)


@app.errorhandler(400)
def bad_request(error):
    return create_response("Bad request", status=400)


@app.errorhandler(500)
def server_error(error):
    return create_response("Server error", status=500)


@app.route("/", methods=["GET"])
def home():
    return create_response("Welcome to OutZone API!", {"version": "2.0", "nlp": "SmartNLPRecommender"})


# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=os.environ.get("DEBUG", "true").lower() in ["1", "true", "yes"],
    )
