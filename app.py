# app.py

import os
import json
import re
import requests
import openai
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment
load_dotenv()
SERPAPI_KEY    = os.getenv("SERPAPI_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not SERPAPI_KEY:
    raise RuntimeError("Please set SERPAPI_KEY in your .env")
if not OPENAI_API_KEY:
    raise RuntimeError("Please set OPENAI_API_KEY in your .env")

openai.api_key = OPENAI_API_KEY

app = Flask(__name__)
CORS(app,
     resources={r"/*": {"origins": "*"}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET","POST","OPTIONS"])

DEFAULT_ENGINES = ["google", "bing", "duckduckgo"]

# 1) Base trust by category
BASE_TRUST = {
    "academic":         90,
    "government":       75,
    "mainstream-news":  70,
    "corporate":        60,
    "blog":             50,
    "alternative-news": 30,
    "social-media":     20,
    "other":            50
}

def classify_result(title: str, snippet: str, link: str) -> dict:
    domain = urlparse(link).netloc.lower()

    # Source type
    if domain.endswith((".gov", ".mil")):
        st = "government"
    elif domain.endswith(".edu") or domain.endswith(".org") or "journal" in domain:
        st = "academic"
    elif any(x in domain for x in ("cnn.com","bbc.com","nytimes.com","theguardian.com")):
        st = "mainstream-news"
    elif any(x in domain for x in ("tiktok.com","reddit.com","facebook.com","x.com","instagram.com","youtube.com")):
        st = "social-media"
    elif domain.endswith(".com"):
        st = "corporate"
    elif "blog" in domain or "medium.com" in domain:
        st = "blog"
    else:
        st = "other"

    # Sentiment (existing logic)
    txt = (title + " " + snippet).lower()
    if any(w in txt for w in ["decline","drop","dead","die"]):
        sentiment = "Negative"
    elif any(w in txt for w in ["rise","boom","gain"]):
        sentiment = "Positive"
    else:
        sentiment = "Neutral"

    return {"sentiment": sentiment, "source_type": st}

@app.route("/search")
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error":"Missing query"}), 400

    engines_param = request.args.get("engines","")
    engines = [e for e in engines_param.split(",") if e] or DEFAULT_ENGINES

    raw = []
    for engine in engines:
        params = {
            "api_key": SERPAPI_KEY,
            "q": query,
            "engine": engine,
            "num": 10
        }
        r = requests.get("https://serpapi.com/search", params=params)
        if r.status_code != 200:
            continue
        data = r.json()
        for item in data.get("organic_results", []):
            raw.append({
                "link": item.get("link",""),
                "title": item.get("title",""),
                "snippet": item.get("snippet",""),
                "sourceEngine": engine
            })

    results = []
    for r0 in raw:
        cls = classify_result(r0["title"], r0["snippet"], r0["link"])
        r0.update(cls)
        # expose base trust
        r0["base_trust"] = BASE_TRUST.get(r0["source_type"], 50)
        # recency flag: snippet mentions 2024 or 2025?
        years = re.findall(r"\b(20(?:24|25))\b", r0["snippet"])
        r0["recency_boost"] = 5 if any(int(y) >= 2024 for y in years) else 0
        results.append(r0)

    return jsonify({"query":query, "results":results})

@app.route("/summarize", methods=["POST","OPTIONS"])
def summarize():
    if request.method=="OPTIONS":
        return jsonify({}),200
    body = request.get_json(force=True)
    items = body.get("results",[])[:5]
    if not items:
        return jsonify({"error":"No results to summarize"}),400

    prompt = "Provide a concise (3-4 sentence) neutral summary of the following search results:\n\n"
    for i,r in enumerate(items,1):
        prompt += f"{i}. Title: {r.get('title','')}\n   Snippet: {r.get('snippet','')}\n\n"
    prompt += "\nSummary:\n"

    resp = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role":"user","content":prompt}],
        temperature=0.5
    )
    summary = resp.choices[0].message.content.strip()
    return jsonify({"summary":summary})

@app.route("/factcheck", methods=["POST","OPTIONS"])
def factcheck():
    if request.method=="OPTIONS":
        return jsonify({}),200
    data = request.get_json(force=True)
    title, snippet, link = data.get("title",""), data.get("snippet",""), data.get("link","")
    prompt = f"""
You are an expert fact-checker.
Given this search result:
Title: {title}
Snippet: {snippet}
URL: {link}

1. What claim(s) does this snippet make?
2. Based on your knowledge (cutoff May 2025), is each claim True, False, or Uncertain?
3. Provide a 2–3 sentence reasoning for your verdict.
4. If you cite any external sources, list their URLs in an array.

Respond strictly in JSON:
{{ "verdict":"...","reasoning":"...","sources":["..."] }}
"""
    resp = openai.chat.completions.create(
        model="gpt-4",
        messages=[{"role":"user","content":prompt}],
        temperature=0
    )
    content = resp.choices[0].message.content
    try:
        return jsonify(json.loads(content))
    except:
        return jsonify({"error":"Invalid JSON from AI","raw":content}),500

@app.route("/score", methods=["POST","OPTIONS"])
def score():
    """
    POST body expects:
    {
      source_type: "...",
      factcheck: { verdict: "True"/"False"/"Uncertain" }, // Optional, can be missing or factcheck.verdict can be null/undefined
      slider: Number (0-100),
      recency_boost: Number (this is the boost value, not a boolean)
    }
    Returns:
    {
        "credibility_score": Number (0-100),
        "breakdown": {
            "base_trust": Number,
            "fact_check_adjustment": Number,
            "slider_influence": Number,
            "recency_boost_value": Number
        }
    }
    """
    if request.method=="OPTIONS":
        return jsonify({}),200
    
    data = request.get_json(force=True)
    if not data: # Ensure data is not None
        return jsonify({"error": "Request body must be JSON and not empty"}), 400

    st       = data.get("source_type","other")
    # Handle potentially missing factcheck or verdict
    factcheck_data = data.get("factcheck", {}) 
    verdict = factcheck_data.get("verdict") if factcheck_data else None

    slider   = float(data.get("slider", 50)) # Default to 50 if not provided
    recency_boost_value = int(data.get("recency_boost", 0)) # This is already the boost value

    base_trust = BASE_TRUST.get(st,50)
    
    fact_check_adjustment = 0
    if verdict == "True":
        fact_check_adjustment = 10
    elif verdict == "False":
        fact_check_adjustment = -20
    # If verdict is "Uncertain" or missing, adjustment remains 0

    # Slider influence: scales from -10 at slider=0 to +10 at slider=100
    # Midpoint slider=50 means 0 influence.
    slider_influence = (slider - 50) * 0.2 
    
    raw_score  = base_trust + fact_check_adjustment + slider_influence + recency_boost_value
    final_score = max(0, min(100, round(raw_score)))
    
    breakdown = {
        "base_trust": base_trust,
        "fact_check_adjustment": fact_check_adjustment,
        "slider_influence": round(slider_influence, 2), # round for cleaner display
        "recency_boost_value": recency_boost_value
    }
    
    return jsonify({"credibility_score": final_score, "breakdown": breakdown})

if __name__=="__main__":
    app.run(debug=True)