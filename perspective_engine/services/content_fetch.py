import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def fetch_text_from_url(url):
    """Extract main text content from a URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        response.raise_for_status()
        
        content_type = response.headers.get('content-type', '').lower()
        if not ('html' in content_type or 'xml' in content_type or 'text/plain' in content_type):
            print(f"Skipping URL {url}, content type: {content_type}")
            return None
            
        response.encoding = response.apparent_encoding if response.apparent_encoding else 'utf-8'
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Remove non-content elements
        for el_name in ["script", "style", "header", "footer", "nav", "aside", "form", 
                        "button", "iframe", "noscript", "figure", "figcaption", "img", 
                        "svg", "link", "meta"]:
            for el in soup.find_all(el_name):
                el.decompose()
        
        # Try to find main content
        main_selectors = ['article', 'main', '[role="main"]', '.main-content', '.article-body',
                         '#content', '#main', '.post-content', '.entry-content', '.story-body', 
                         '.articletext']
        
        content_element = None
        for selector in main_selectors:
            content_element = soup.select_one(selector)
            if content_element:
                break
                
        if not content_element:
            content_element = soup.body
            
        if content_element:
            text_chunks = []
            for element in content_element.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                                                    'li', 'td', 'pre', 'blockquote'], recursive=True):
                chunk = element.get_text(separator=' ', strip=True)
                if chunk and len(chunk.split()) > 3:
                    text_chunks.append(chunk)
                    
            if not text_chunks and content_element:
                text = content_element.get_text(separator='\n', strip=True)
            else:
                text = "\n".join(text_chunks)
                
            text = '\n'.join([line.strip() for line in text.splitlines() 
                             if line.strip() and len(line.strip().split()) > 2])
            
            print(f"Extracted ~{len(text)} chars from {url}")
            return text if len(text) > 150 else None
            
        return None
        
    except requests.exceptions.Timeout:
        print(f"Timeout URL {url}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Request error URL {url}: {e}")
        return None
    except Exception as e:
        print(f"Parsing error URL {url}: {type(e).__name__} - {e}")
        return None
