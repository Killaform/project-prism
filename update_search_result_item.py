# update_search_result_item.py
import os

def update_search_result_item():
    """Update SearchResultItem to show credibility score"""
    file_path = 'frontend/src/components/search/SearchResultItem.jsx'
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check if credibility badge already exists
    if 'credibility-badge' not in content:
        # Find the title section
        title_section = content.find('<h3 className="text-gray-900 text-lg font-semibold mb-1">')
        if title_section > 0:
            # Find the end of the title div
            end_of_title = content.find('</div>', title_section)
            
            # Add credibility badge code after the title
            credibility_badge = """
                        {result.source_credibility && (
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium credibility-badge
                                    ${result.source_credibility === 'high' ? 'bg-green-100 text-green-800' : 
                                      result.source_credibility === 'medium' ? 'bg-blue-100 text-blue-800' :
                                      result.source_credibility === 'low' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-800'}`}
                                >
                                    {result.source_credibility === 'high' ? 'High Credibility' : 
                                     result.source_credibility === 'medium' ? 'Medium Credibility' :
                                     result.source_credibility === 'low' ? 'Low Credibility' : 
                                     'Unknown Credibility'}
                                </span>
                                {result.intrinsic_credibility_score && (
                                    <span className="ml-2 text-xs text-gray-500">
                                        Score: {result.intrinsic_credibility_score}/100
                                    </span>
                                )}
                            </div>
                        )}"""
            
            # Insert the badge
            new_content = content[:end_of_title] + credibility_badge + content[end_of_title:]
            
            with open(file_path, 'w') as f:
                f.write(new_content)
            
            print(f"Updated {file_path} with credibility badge")
            return True
    
    print("No updates needed - credibility badge already exists")
    return False

if __name__ == "__main__":
    update_search_result_item()
