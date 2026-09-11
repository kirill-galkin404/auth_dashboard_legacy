"""GET /api/dashboard: reproduces the legacy mock KPI/transaction payload
from server/app.js's `/api/dashboard` handler, using Python's `random` and
`datetime` in place of Math.random()/Date -- same ranges, same counts,
same shapes:

    kpis: { revenue: rnd(10000,99999), users: rnd(100,9999),
            orders: rnd(50,2000), conversion: (Math.random()*10).toFixed(2)+'%' }
    transactions: 10 x { id, customer, amount, status, date }

The 401 "not logged in" case is handled by the shared `login_required`
guard from backend/app.py.
"""

import random
from datetime import date, timedelta

from flask import Blueprint, jsonify

from app import login_required

dashboard_bp = Blueprint("dashboard", __name__)

_CUSTOMER_NAMES = [
    "Acme",
    "Globex",
    "Initech",
    "Umbrella",
    "Soylent",
    "Hooli",
    "Stark",
    "Wayne",
]
_STATUSES = ["paid", "pending", "failed"]


def _random_transaction(txn_id):
    txn_date = date.today() - timedelta(days=random.randint(0, 30))
    return {
        "id": txn_id,
        "customer": random.choice(_CUSTOMER_NAMES) + " Inc",
        "amount": random.randint(50, 5000),
        "status": random.choice(_STATUSES),
        "date": txn_date.isoformat(),
    }


@dashboard_bp.route("/api/dashboard", methods=["GET"])
@login_required
def dashboard():
    kpis = {
        "revenue": random.randint(10000, 99999),
        "users": random.randint(100, 9999),
        "orders": random.randint(50, 2000),
        "conversion": "%.2f%%" % (random.random() * 10),
    }
    transactions = [_random_transaction(i + 1) for i in range(10)]
    return jsonify(kpis=kpis, transactions=transactions)
