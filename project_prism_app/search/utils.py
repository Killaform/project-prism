# C:\project-prism\project_prism_app\search\utils.py
import os # Added os for getenv for server keys as fallbacks
import json
import ast
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from serpapi import SerpApiClient
from openai import OpenAI
import google.generativeai as genai

# Domain lists can stay here or be moved to a shared constants file later
KNOWN_SOCIAL_MEDIA_PLATFORMS = [ "x.com", "twitter.com", "instagram.com", "tiktok.com", "youtube.com", "youtu.be", "facebook.com", "reddit.com", "linkedin.com", "pinterest.com", "tumblr.com", "medium.com", "quora.com", "threads.net" ]
KNOWN_MAINSTREAM_NEWS_DOMAINS = [ "nytimes.com", "bbc.com", "cnn.com", "reuters.com", "apnews.com", "washingtonpost.com", "wsj.com", "theguardian.com", "npr.org", "abcnews.go.com", "cbsnews.com", "nbcnews.com", "foxnews.com", "usatoday.com", "bloomberg.com", "forbes.com", "news.google.com", "cnbc.com", "politico.com", "axios.com", "theatlantic.com", "newyorker.com", "time.com", "latimes.com", "chicagotribune.com", "chron.com"  ]
KNOWN_ACADEMIC_PUBLISHERS_AND_REPOSITORIES = [ "arxiv.org", "pubmed.ncbi.nlm.nih.gov", "nature.com", "sciencemag.org", "jamanetwork.com", "thelancet.com", "ieee.org", "acm.org", "springer.com", "elsevier.com", "wiley.com", "sagepub.com", "jstor.org", "plos.org", "frontiersin.org", "bmj.com", "cell.com" ]


def fetch_text_from_url(url):
    # ... (Exact same as the last working version with the corrected loop) ...
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36','Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9','Accept-Language': 'en-US,en;q=0.9', 'DNT': '1', 'Connection': 'keep-alive', 'Upgrade-Insecure-Requests': '1'}
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True); response.raise_for_status()
        content_type = response.headers.get('content-type', '').lower()
        if not ('html' in content_type or 'xml' in content_type or 'text/plain' in content_type): print(f"Skipping URL {url}, content type: {content_type}"); return None
        response.encoding = response.apparent_encoding if response.apparent_encoding else 'utf-8'; soup = BeautifulSoup(response.text, 'lxml')
        for el_name in ["script","style","header","footer","nav","aside","form","button","iframe","noscript","figure","figcaption","img","svg","link","meta"]:
            for el in soup.find_all(el_name): el.decompose()
        main_selectors = ['article','main','[role="main"]','.main-content','.article-body','#content','#main','.post-content','.entry-content','.story-body','.articletext']
        content_element = None
        for selector in main_selectors: 
            content_element = soup.select_one(selector)
            if content_element: break 
        if not content_element: content_element = soup.body
        if content_element:
            text_chunks = []; current_element_for_check = content_element 
            for element in content_element.find_all(['p','h1','h2','h3','h4','h5','h6','li','td','pre','blockquote'], recursive=True):
                is_direct_child = False; parent = element.parent
                while parent and parent != soup:
                    if parent == current_element_for_check: is_direct_child = True; break
                    if parent.name in ['body','html'] and parent != current_element_for_check: break 
                    parent = parent.parent
                if is_direct_child or (current_element_for_check and current_element_for_check.name in ['p','li'] and element.parent == current_element_for_check):
                     chunk = element.get_text(separator=' ', strip=True)
                     if chunk and len(chunk.split()) > 3: text_chunks.append(chunk)
            if not text_chunks and content_element: text = content_element.get_text(separator='\n', strip=True)
            else: text = "\n".join(text_chunks)
            text = '\n'.join([line.strip() for line in text.splitlines() if line.strip() and len(line.strip().split()) > 2]) 
            print(f"Extracted ~{len(text)} chars from {url}"); return text if len(text) > 150 else None 
        return None
    except requests.exceptions.Timeout: print(f"Timeout URL {url}"); return None
    except requests.exceptions.RequestException as e: print(f"Request error URL {url}: {e}"); return None
    except Exception as e: print(f"Parsing error URL {url}: {type(e).__name__} - {e}"); return None

def classify_source_type(result_url, source_engine_name=None):
    # ... (Exact same as the last working version) ...
    if not result_url: return "unknown_url"
    try:
        parsed_url = urlparse(result_url); netloc = parsed_url.netloc.lower(); path = parsed_url.path.lower()
        if netloc.startswith("www."): netloc = netloc[4:]
        if netloc.endswith((".gov",".mil")) or ".gov." in netloc or ".mil." in netloc: return "government"
        if netloc.endswith(".edu"): return "academic_institution"
        if "wikipedia.org" in netloc: return "encyclopedia"
        for domain in KNOWN_SOCIAL_MEDIA_PLATFORMS:
            if domain == netloc or netloc.endswith("."+domain) or domain in netloc:
                if (domain == "youtube.com" or "youtube.com" in netloc or "youtu.be" in netloc) and ("/channel/" in path or "/c/" in path or "/user/" in path or path.startswith("/@")): return "social_media_channel_creator"
                if ("youtube.com" in netloc or "youtu.be" in netloc): return "social_media_platform_video"
                if "medium.com" in netloc: p_parts=[p for p in path.split('/') if p]; return p_parts and (p_parts[0].startswith('@')or(not'.'in p_parts[0]and p_parts[0]not in['search','tag','topic','collections','about','jobs','policy','help','settings','explore','me','new-story']))and"social_blogging_platform_user_pub"or"social_blogging_platform"
                return "social_media_platform"
        for domain in KNOWN_ACADEMIC_PUBLISHERS_AND_REPOSITORIES:
            if domain in netloc: return "research_publication"
        for domain in KNOWN_MAINSTREAM_NEWS_DOMAINS:
            if domain == netloc or netloc.endswith("."+domain): return any(p in path for p in ["/blog","/opinion","/contributor","/live/"])and"news_opinion_blog_live"or"news_media_mainstream"
        if netloc.endswith(".org"):
            if any(p in path for p in ["/blog","/news","/press","/report","/briefing","/article","/story"]): return "ngo_nonprofit_publication"
            if any(p in netloc for p in ["foundation","institute","society","association","charity","trust","fund","council","union"]): return "ngo_nonprofit_organization"
            return "ngo_nonprofit_general"
        if any(p in path for p in ["/blog","/press-release","/newsroom","/insights","/pr/","/investors","/company/about","/about-us","/corporate"]):
            if not any(n_dom in netloc for n_dom in KNOWN_MAINSTREAM_NEWS_DOMAINS): return "corporate_blog_pr_info"
        if any(p in path for p in ["/news/","/article/","/story/","/post/","/views/"]) and any(tld in netloc for tld in [".com",".net",".info",".co",".online",".io",".news",".press",".report",".blog"]): return "news_media_other_or_blog"
        if any(tld in netloc for tld in [".com",".net",".biz",".info",".org",".co",".io",".app",".site",".online",".me",".tv",".news",".blog",".press",".report"]): return "website_general"
        return "unknown_other"
    except Exception as e: print(f"Error classifying URL '{result_url}': {type(e).__name__} - {e}"); return "unknown_error_parsing"

def get_sentiment_and_bias(text_content, ai_provider='openai', user_openai_key=None, user_gemini_key=None, server_openai_key=None):
    # Modified to accept specific keys
    if not text_content: return {"score": 0.0, "label": "neutral_no_content"}, {"score": 0.0, "label": "neutral_no_content"}
    print(f"UTILS [AI SENTIMENT] Provider: {ai_provider}, User OpenAI Key: {'Yes' if user_openai_key else 'No'}, User Gemini Key: {'Yes' if user_gemini_key else 'No'}")

    if ai_provider == 'openai':
        determined_key = user_openai_key or server_openai_key
        if not determined_key: print("[AI SENTIMENT] OpenAI key unavailable."); return {"score":0.0,"label":"neutral_key_missing"},{"score":0.0,"label":"neutral_key_missing"}
        openai_client_instance = OpenAI(api_key=determined_key)
        try:
            prompt = (f"Analyze sentiment and political bias...Return ONLY valid JSON...Text: \"{str(text_content)[:1500]}\"")
            response = openai_client_instance.chat.completions.create(model="gpt-3.5-turbo", messages=[{"role":"system","content":"Analyze text for sentiment/bias. Respond ONLY with valid JSON."},{"role":"user","content":prompt}],temperature=0.1,max_tokens=150)
            data = json.loads(response.choices[0].message.content.strip())
            return {"score":float(data.get("sentiment_score",0.0)),"label":data.get("sentiment_label","neutral").lower()},{"score":0.0,"label":data.get("bias_label","neutral").lower()}
        except Exception as e: print(f"Error OpenAI sentiment in util: {type(e).__name__}-{e}"); return {"score":0.0,"label":"neutral_openai_error"},{"score":0.0,"label":"neutral_openai_error"}
    
    elif ai_provider == 'gemini':
        if not user_gemini_key: print("[AI SENTIMENT] Gemini key missing."); return {"score":0.0,"label":"neutral_key_missing"},{"score":0.0,"label":"neutral_key_missing"}
        try:
            genai.configure(api_key=user_gemini_key); model = genai.GenerativeModel('gemini-1.5-flash-latest')
            prompt = (f"Analyze sentiment/bias...MUST be JSON... 'sentiment_label', 'sentiment_score', 'bias_label'.\n\nSnippet: \"{str(text_content)[:30000]}\"")
            gen_config = genai.types.GenerationConfig(response_mime_type="application/json")
            response = model.generate_content(prompt,generation_config=gen_config); data = json.loads(response.text)
            return {"score":float(data.get("sentiment_score",0.0)),"label":data.get("sentiment_label","neutral").lower()},{"score":0.0,"label":data.get("bias_label","neutral").lower()}
        except Exception as e:
            print(f"Error Gemini sentiment util (JSON mode failed): {type(e).__name__}-{e}")
            try: # Fallback for Gemini
                model = genai.GenerativeModel('gemini-1.5-flash-latest'); text_to_analyze = str(text_content)[:30000]
                text_prompt = (f"Analyze the sentiment and political bias... Your entire response MUST be a single, valid JSON object... 'sentiment_label', 'sentiment_score', 'bias_label'.\n\nText Snippet: \"{text_to_analyze}\"")
                response = model.generate_content(text_prompt); res_text = response.text.strip()
                if res_text.startswith("```json"): res_text = res_text[7:]
                if res_text.endswith("```"): res_text = res_text[:-3]
                data = json.loads(res_text.strip())
                return {"score":float(data.get("sentiment_score",0.0)),"label":data.get("sentiment_label","neutral").lower()},{"score":0.0,"label":data.get("bias_label","neutral").lower()}
            except Exception as e_fb: print(f"Error Gemini sentiment util fallback: {type(e_fb).__name__}-{e_fb}"); return {"score":0.0,"label":"neutral_gemini_error"},{"score":0.0,"label":"neutral_gemini_error"}
    return {"score":0.0,"label":"neutral_provider_unknown"},{"score":0.0,"label":"neutral_provider_unknown"}

def fetch_results_via_serpapi(query, engine_name, api_key_to_use, num_results=10):
    # ... (Exact same as the last working version) ...
    if not api_key_to_use: print(f"SerpApi Util: No API key for {engine_name}."); return []
    params = {"q":query,"engine":engine_name.lower(),"api_key":api_key_to_use,"num":num_results,"hl":"en","gl":"us"}
    print(f"SerpApi Util: Querying {engine_name} for '{query}' (num:{num_results})")
    try:
        s_client = SerpApiClient(params); r_data = s_client.get_dict(); o_results = r_data.get("organic_results",[])
        if not o_results: print(f"SerpApi Util: No organic_results for '{query}' on {engine_name}. R: {r_data.get('error','Unknown')}"); return []
        p_results = [{"title":i.get("title","No title"),"link":i.get("link"),"snippet":i.get("snippet","No snippet."),"source_engine":engine_name.capitalize()} for i in o_results if i.get("link")]
        print(f"SerpApi Util: Found {len(p_results)} for {engine_name}"); return p_results
    except Exception as e: print(f"SerpApi Util Error {engine_name}: {type(e).__name__} - {e}"); return []

def perform_summarization(data, user_openai_key=None, server_openai_key=None, user_gemini_key=None):
    provider = data.get('ai_provider','openai')
    text_fb = data.get('text')
    url = data.get('url')

    if not url and not text_fb: return jsonify({"error":"URL or text required"}), 400
    
    determined_key = None
    if provider == 'openai': determined_key = user_openai_key or server_openai_key
    elif provider == 'gemini': determined_key = user_gemini_key

    if not determined_key: return jsonify({"error":f"{provider.capitalize()} API key unavailable."}), 503
        
    content=text_fb or "";src="snippet/title"
    if url: ext=fetch_text_from_url(url)
    if url and ext: content=ext;src="fetched URL content"
    elif url and not ext and text_fb:print(f"Summarize Util: Failed URL fetch {url}, using fallback.");
    elif url and not ext and not text_fb:print(f"Summarize Util: Failed URL fetch {url}, no fallback.");
    if not content.strip(): return jsonify({"error":"No content to summarize."}), 400
    
    print(f"Summarize Util ({provider}): Content from {src} (len: {len(content)})")
    try:
        c_send=content[:8000];summary_text="Error processing summary."
        if provider=='openai':
            openai_client = OpenAI(api_key=determined_key)
            resp=openai_client.chat.completions.create(model="gpt-3.5-turbo",messages=[{"role":"system","content":"Summarize (3-5 sentences)."},{"role":"user","content":f"Summarize:\n\n{c_send}"}],max_tokens=250,temperature=.3)
            summary_text=resp.choices[0].message.content.strip()
        elif provider=='gemini':
            genai.configure(api_key=determined_key);model=genai.GenerativeModel('gemini-1.5-flash-latest')
            resp=model.generate_content(f"Summarize this text concisely (3-5 sentences):\n\n{c_send}");summary_text=resp.text.strip()
        return jsonify({"summary":summary_text,"summarized_from":src})
    except Exception as e:print(f"Error {provider} summarization util: {type(e).__name__}-{e}");return jsonify({"error":f"Summarize failed ({provider}):{type(e).__name__}"}),500


def perform_fact_check(data, user_openai_key=None, server_openai_key=None, user_gemini_key=None):
    provider = data.get('ai_provider','openai')
    claim_fb = data.get('claim')
    url = data.get('url')

    if not url and not claim_fb: return jsonify({"error":"URL or claim required"}), 400

    determined_key = None
    if provider == 'openai': determined_key = user_openai_key or server_openai_key
    elif provider == 'gemini': determined_key = user_gemini_key
    
    if not determined_key: return jsonify({"claim":claim_fb or "N/A","verdict":"service_unavailable","explanation":f"{provider.capitalize()} API key unavailable.","source":"System"}), 503

    context=claim_fb or "";src_ctx="snippet/title";p_claim=claim_fb or ""
    if url: ext=fetch_text_from_url(url)
    if url and ext: context=ext;src_ctx="fetched URL content"
    elif url and not ext and claim_fb:print(f"Fact-check Util: Failed URL fetch {url}, using fallback.");
    elif url and not ext and not claim_fb:print(f"Fact-check Util: Failed URL fetch {url}, no fallback.");
    if not p_claim.strip()and context.strip():p_claim=context[:300]
    if not p_claim.strip()and not context.strip():return jsonify({"error":"No claim/context."}),400
    if not p_claim.strip():p_claim="Evaluate general credibility of provided context."
    
    print(f"Fact-check Util ({provider}): Claim '{p_claim[:100]}...' context from {src_ctx} (len: {len(context)})")
    try:
        ctx_send=context[:8000];claim_send=p_claim[:1000];verdict,explanation="error_processing",f"Could not process fact-check with {provider}."
        sys_prompt=("Analyze claim... Respond ONLY with valid JSON: {\"verdict\":\"string\", \"explanation\":\"string\"}.")
        user_prompt=f"Claim: \"{claim_send}\"\n\nContext: \"{ctx_send}\"";fc_str=""
        if provider=='openai':
            openai_client=OpenAI(api_key=determined_key)
            resp=openai_client.chat.completions.create(model="gpt-3.5-turbo",messages=[{"role":"system","content":sys_prompt},{"role":"user","content":user_prompt}],max_tokens=350,temperature=.2)
            fc_str=resp.choices[0].message.content.strip()
        elif provider=='gemini':
            genai.configure(api_key=determined_key);model=genai.GenerativeModel('gemini-1.5-flash-latest')
            try:
                gen_config = genai.types.GenerationConfig(response_mime_type="application/json")
                gemini_response = model.generate_content([sys_prompt, user_prompt],generation_config=gen_config)
                fc_str = gemini_response.text ; print(f"Gemini raw JSON mode response: '{fc_str}'") 
            except Exception as e_json_mode:
                print(f"Gemini JSON mode failed ({e_json_mode}), trying plain text."); text_user_prompt_for_gemini = (f"Analyze claim...Format as JSON...Claim: \"{claim_send}\"\n\nContext: \"{ctx_send}\"")
                gemini_response = model.generate_content(text_user_prompt_for_gemini);fc_str=gemini_response.text.strip()
                if fc_str.startswith("```json"):fc_str=fc_str[7:];fc_str=fc_str.endswith("```")and fc_str[:-3]or fc_str
        else:raise ValueError(f"Unsupported AI provider: {provider}")
        
        print(f"Attempting to parse AI response ({provider}): '{fc_str}'")
        try:
            fc_data=json.loads(fc_str);verdict=fc_data.get("verdict","needs_context").lower().replace(" ","_");expl=fc_data.get("explanation","AI provided no detail.")
        except json.JSONDecodeError:
            print(f"Fact-check Util ({provider}): Not direct JSON. Trying ast.literal_eval. Raw: '{fc_str}'")
            try:
                pseudo_json=ast.literal_eval(fc_str);_ = isinstance(pseudo_json,dict)or ValueError("ast.literal_eval not dict.")
                verdict=pseudo_json.get("verdict","needs_context_ast").lower().replace(" ","_");expl=pseudo_json.get("explanation",f"AI explanation (from dict-like by {provider}): {fc_str}")
                print(f"Fact-check Util ({provider}): Successfully parsed with ast.literal_eval. Verdict: {verdict}")
            except Exception as e_ast:print(f"Fact-check Util ({provider}): ast.literal_eval failed: {e_ast}. Keyword fallback.");expl=f"AI response format error ({provider}). Raw: {fc_str}";verdict="verified"if"verified"in fc_str.lower()else"disputed_false"if"disputed"in fc_str.lower()or"false"in fc_str.lower()else"lacks_consensus"if"lacks consensus"in fc_str.lower()else"needs_context_fallback"
        return jsonify({"claim":claim_send,"verdict":verdict,"explanation":expl,"source":f"AI Analysis ({provider.capitalize()}, Context: {src_ctx})"})
    except Exception as e:print(f"Error {provider} fact-checking util: {type(e).__name__}-{e}");return jsonify({"error":f"Fact-check failed ({provider}):{type(e).__name__}","claim":p_claim}),500

def calculate_intrinsic_score(data):
    # ... (Paste the exact intrinsic score calculation logic from the last working /score endpoint here)
    if not data: return jsonify({"error": "Invalid JSON payload for score util"}), 400
    s_type=data.get('source_type','unknown').lower();b_trust=float(data.get('base_trust',50));r_boost=float(data.get('recency_boost',0));fc_v=data.get('factcheckVerdict','pending').lower();BTS_MAX=60;RMS_MAX=15;FCS_MAX=20;ITA_MAX=10;bts=min(max(b_trust/100*BTS_MAX,0),BTS_MAX);rs=min(max(r_boost/100*RMS_MAX,0),RMS_MAX);fcs_map={"verified":FCS_MAX,"neutral":0,"disputed":-FCS_MAX,"disputed_false":-FCS_MAX,"pending":-2,"lacks_consensus":-int(FCS_MAX*.4),"needs_context":0,"needs_context_format_error":0,"needs_context_ast_eval":0,"needs_context_fallback":0,"service_unavailable":0,"unverifiable":-int(FCS_MAX*.6),"error_parsing":-5,"neutral_unavailable":0,"neutral_parsing_error":0,"neutral_error":0,"error":-5};fcs=fcs_map.get(fc_v,0);itq_map={"government":.8,"academic_institution":.9,"research_publication":.9,"encyclopedia":.7,"news_media_mainstream":.6,"news_opinion_blog_live":.3,"ngo_nonprofit_publication":.5,"ngo_nonprofit_organization":.4,"ngo_nonprofit_general":.2,"corporate_blog_pr_info":.1,"news_media_other_or_blog":-.3,"social_media_platform":-.8,"social_media_platform_video":-.7,"social_media_channel_creator":-.5,"social_blogging_platform_user_pub":-.4,"social_blogging_platform":-.6,"website_general":0.,"unknown_url":-.9,"unknown_other":-.9,"unknown_error_parsing":-1.,"mainstream":.6,"alternative":-.4,"unknown":-.7};tqv=itq_map.get(s_type,0.);ita=tqv*ITA_MAX;tis=bts+rs+fcs+ita;fs=int(round(min(max(tis,0),100)));return jsonify({"intrinsic_credibility_score":fs,"factors":{"base_trust_contribution":round(bts,2),"recency_contribution":round(rs,2),"fact_check_contribution":round(fcs,2),"type_quality_adjustment":round(ita,2)}})