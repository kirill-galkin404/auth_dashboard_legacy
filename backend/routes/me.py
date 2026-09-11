"""GET /api/me: returns the logged-in username, matching legacy server/app.js:

    if (req.session && req.session.user) {
      res.json({ username: req.session.user.username });
    } else {
      res.status(401).json({ error: 'not logged in' });
    }

The 401 case is handled by the shared `login_required` guard from
backend/app.py, so this view only needs to cover the authenticated case.
"""

from flask import Blueprint, jsonify, session

from app import login_required

me_bp = Blueprint("me", __name__)


@me_bp.route("/api/me", methods=["GET"])
@login_required
def me():
    return jsonify(username=session["user"]["username"])
