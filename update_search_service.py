# update_search_service.py
import os

def update_search_service():
    """Update search service to properly calculate credibility scores"""
    search_file = 'perspective_engine/services/search_service.py'
    
    with open(search_file, 'r') as f:
        content = f.read()
    
    # Check if the file already has credibility calculation
    if 'source_credibility' not in content:
        # Find the end of the processing loop
        insert_point = content.find('result[\'intrinsic_credibility_score\'] = fs')
        if insert_point > 0:
            # Add credibility level calculation
            new_code = """
        result['intrinsic_credibility_score'] = fs
        
        # Set source credibility level based on score
        if fs >= 75:
            result['source_credibility'] = 'high'
        elif fs >= 50:
            result['source_credibility'] = 'medium'
        elif fs >= 25:
            result['source_credibility'] = 'low'
        else:
            result['source_credibility'] = 'unknown'"""
            
            # Replace the original line with our enhanced code
            content = content.replace('result[\'intrinsic_credibility_score\'] = fs', new_code)
            
            with open(search_file, 'w') as f:
                f.write(content)
            
            print(f"Updated {search_file} with credibility level calculation")
            return True
    
    print("No updates needed - credibility calculation already exists")
    return False

if __name__ == "__main__":
    update_search_service()
