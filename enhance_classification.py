# enhance_classification.py
import os

def enhance_classification():
    """Enhance the classification system with more nuanced perspective and credibility analysis"""
    file_path = 'perspective_engine/api/search.py'
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Create an enhanced classification function
    enhanced_classification = """
            # Process results with enhanced classification
            for result in results:
                # Get URL and title for analysis
                url = result.get('link', '').lower()
                title = result.get('title', '').lower()
                snippet = result.get('snippet', '').lower()
                
                # Initialize credibility factors
                source_reputation = 0
                evidence_quality = 0
                bias_level = 0
                transparency = 0
                
                # ===== SOURCE REPUTATION ANALYSIS =====
                # Government and educational institutions (highest credibility)
                if any(domain in url for domain in ['.gov', '.mil', '.edu', 'who.int', 'un.org', 'europa.eu', 'nih.gov', 'cdc.gov']):
                    source_reputation = 9
                    result['source_type_label'] = 'government'
                
                # Major news organizations with established fact-checking
                elif any(domain in url for domain in ['reuters.com', 'apnews.com', 'bloomberg.com', 'economist.com']):
                    source_reputation = 8
                    result['source_type_label'] = 'news_media_mainstream'
                
                # Established mainstream news sources
                elif any(domain in url for domain in ['nytimes.com', 'washingtonpost.com', 'wsj.com', 'bbc.', 
                                                    'cnn.com', 'nbcnews.com', 'abcnews.go.com', 'cbsnews.com']):
                    source_reputation = 7
                    result['source_type_label'] = 'news_media_mainstream'
                
                # Other mainstream news sources
                elif any(domain in url for domain in ['foxnews.com', 'msnbc.com', 'usatoday.com', 'latimes.com', 
                                                    'newsweek.com', 'time.com', 'theatlantic.com']):
                    source_reputation = 6
                    result['source_type_label'] = 'news_media_mainstream'
                
                # Academic publishers and encyclopedias
                elif any(domain in url for domain in ['nature.com', 'science.org', 'jstor.org', 'springer', 
                                                    'wikipedia.org', 'britannica.com', 'scholarpedia.org']):
                    source_reputation = 8
                    result['source_type_label'] = 'encyclopedia'
                
                # Established blogs and opinion sites
                elif any(domain in url for domain in ['medium.com', 'substack.com', 'wordpress.com', 'blogspot.com']):
                    source_reputation = 4
                    result['source_type_label'] = 'news_media_other_or_blog'
                
                # Social media platforms
                elif any(domain in url for domain in ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 
                                                    'reddit.com', 'youtube.com', 'linkedin.com']):
                    source_reputation = 3
                    result['source_type_label'] = 'social_media_platform'
                
                # Alternative news sources
                elif any(domain in url for domain in ['breitbart.com', 'infowars.com', 'dailycaller.com', 'thegatewaypundit.com',
                                                    'motherjones.com', 'democracynow.org', 'counterpunch.org']):
                    source_reputation = 4
                    result['source_type_label'] = 'news_media_other_or_blog'
                
                # Default for other websites
                else:
                    source_reputation = 5
                    result['source_type_label'] = 'website_general'
                
                # ===== EVIDENCE QUALITY ASSESSMENT =====
                # Look for indicators of evidence in snippet
                evidence_indicators = ['according to', 'study', 'research', 'evidence', 'data', 'survey', 'report', 
                                    'analysis', 'found that', 'statistics', 'experts say', 'published in']
                evidence_count = sum(1 for indicator in evidence_indicators if indicator in snippet)
                evidence_quality = min(8, evidence_count * 2 + 2)  # Base of 2, max of 8
                
                # ===== BIAS ASSESSMENT =====
                # Check for emotional or biased language
                bias_indicators = ['shocking', 'outrageous', 'scandal', 'hoax', 'conspiracy', 'truth', 'exposed', 
                                'they don\\'t want you to know', 'mainstream media won\\'t tell you', 'wake up']
                bias_count = sum(1 for indicator in bias_indicators if indicator in title.lower() or indicator in snippet.lower())
                bias_level = max(0, 10 - bias_count * 2)  # Higher score means less bias
                
                # ===== TRANSPARENCY ASSESSMENT =====
                # Higher for sources that typically provide clear authorship
                if result['source_type_label'] in ['government', 'news_media_mainstream', 'encyclopedia']:
                    transparency = 8
                elif result['source_type_label'] in ['news_media_other_or_blog']:
                    transparency = 5
                else:
                    transparency = 4
                
                # ===== CALCULATE OVERALL CREDIBILITY SCORE =====
                # Weighted average of factors (out of 100)
                credibility_score = int((
                    (source_reputation * 4) +  # 40% weight
                    (evidence_quality * 3) +   # 30% weight
                    (bias_level * 2) +         # 20% weight
                    (transparency * 1)         # 10% weight
                ) * 10 / 10)  # Convert to 0-100 scale
                
                result['intrinsic_credibility_score'] = credibility_score
                
                # Assign credibility level
                if credibility_score >= 75:
                    result['source_credibility'] = 'high'
                elif credibility_score >= 50:
                    result['source_credibility'] = 'medium'
                elif credibility_score >= 25:
                    result['source_credibility'] = 'low'
                else:
                    result['source_credibility'] = 'unknown'
                
                # ===== PERSPECTIVE CLASSIFICATION =====
                # Neutral: Factual, balanced, minimal bias
                if (result['source_type_label'] in ['encyclopedia'] or
                    (bias_level >= 8 and evidence_quality >= 6)):
                    result['perspective'] = 'neutral'
                
                # Mainstream: Established viewpoints, conventional wisdom
                elif (result['source_type_label'] in ['government', 'news_media_mainstream'] or
                     (source_reputation >= 6)):
                    result['perspective'] = 'mainstream'
                
                # Alternative: Divergent viewpoints, challenges consensus
                elif (result['source_type_label'] in ['social_media_platform', 'news_media_other_or_blog'] or
                     (bias_level <= 5) or
                     any(term in title.lower() or term in snippet.lower() for term in 
                         ['conspiracy', 'alternative', 'truth movement', 'cover-up', 'hidden', 'secret'])):
                    result['perspective'] = 'alternative'
                
                # Default fallback
                else:
                    result['perspective'] = 'neutral'
                
                # Add detailed analysis data
                result['credibility_factors'] = {
                    'source_reputation': source_reputation,
                    'evidence_quality': evidence_quality,
                    'bias_level': bias_level,
                    'transparency': transparency
                }
        """
    
    # Find where to insert the enhanced classification
    if 'for result in results:' in content:
        # Replace the existing loop with our enhanced version
        new_content = content.replace('for result in results:', enhanced_classification)
    else:
        # Insert before the return statement
        return_index = content.find('return {')
        if return_index > 0:
            new_content = content[:return_index] + enhanced_classification + content[return_index:]
        else:
            # Fallback - add at the end of the function
            new_content = content + "\n" + enhanced_classification
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    print(f"Updated {file_path} with enhanced classification system")
    return True

if __name__ == "__main__":
    enhance_classification()
