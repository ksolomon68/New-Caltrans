import os
import re
import json

TARGET_DIR = r"c:\Users\Keisha\Documents\caltrans\new caltrans"

BANNED_TERMS = {
    # Vendor
    re.compile(r'\bVendor\b'): 'Small Business',
    re.compile(r'\bvendor\b'): 'small business',
    re.compile(r'\bVENDOR\b'): 'SMALL BUSINESS',
    re.compile(r'\bVendors\b'): 'Small Businesses',
    re.compile(r'\bvendors\b'): 'small businesses',
    re.compile(r'\bVENDORS\b'): 'SMALL BUSINESSES',
    
    # SBE
    re.compile(r'\bSBE\b'): 'Small Business',
    re.compile(r'\bsbe\b'): 'small business',
    re.compile(r'\bSBEs\b'): 'Small Businesses',
    re.compile(r'\bsbes\b'): 'small businesses',
    
    # DBE
    re.compile(r'\bDBE\b'): 'Small Business',
    re.compile(r'\bdbe\b'): 'small business',
    re.compile(r'\bDBEs\b'): 'Small Businesses',
    re.compile(r'\bdbes\b'): 'small businesses',
    
    # Disadvantaged Business
    re.compile(r'\bDisadvantaged Business\b'): 'Small Business',
    re.compile(r'\bdisadvantaged business\b'): 'small business',
    re.compile(r'\bDisadvantaged business\b'): 'Small business',
    re.compile(r'\bDisadvantaged Businesses\b'): 'Small Businesses',
    re.compile(r'\bdisadvantaged businesses\b'): 'small businesses',
    re.compile(r'\bDisadvantaged businesses\b'): 'Small businesses',
    
    # Agency
    re.compile(r'\bAgency\b'): 'Prime Contractor',
    re.compile(r'\bagency\b'): 'prime contractor',
    re.compile(r'\bAGENCY\b'): 'PRIME CONTRACTOR',
    re.compile(r'\bAgencies\b'): 'Prime Contractors',
    re.compile(r'\bagencies\b'): 'prime contractors',
    re.compile(r'\bAGENCIES\b'): 'PRIME CONTRACTORS'
}

# Negative lookbehinds/lookaheads to prevent matching inside URLs, paths, or code variable syntax.
# We don't want to replace "vendorId" or "agency_name" or "vendor-profile.html"
def is_safe_context(text, start, end):
    # Check if inside a URL or property like variable-name, variable_name
    if start > 0 and text[start-1] in '-_./': return False
    if end < len(text) and text[end] in '-_./': return False
    
    # Check if preceding or succeeding characters are letters/digits (camelCase)
    if start > 0 and text[start-1].isalpha(): return False
    if end < len(text) and text[end].isalpha(): return False
    
    return True

report = {
    'files_modified': [],
    'skipped_instances': [],
    'ambiguous_cases': [],
    'snippets': []
}

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original_content = f.read()
    except Exception as e:
        return
    
    content = original_content
    modified = False
    
    for pattern, replacement in BANNED_TERMS.items():
        matches = list(pattern.finditer(content))
        # Process in reverse so replacements don't mess up indices
        for match in reversed(matches):
            start, end = match.span()
            matched_str = match.group()
            
            # Context window for snippets/checks
            snippet_start = max(0, start - 30)
            snippet_end = min(len(content), end + 30)
            snippet = content[snippet_start:snippet_end].replace('\n', ' ')
            
            if is_safe_context(content, start, end):
                # Apply replacement
                content = content[:start] + replacement + content[end:]
                modified = True
                if len(report['snippets']) < 50: # Limit snippet collection
                    report['snippets'].append(f"✅ Replaced '{matched_str}' -> '{replacement}' in {os.path.basename(filepath)}: ...{snippet}...")
            else:
                report['skipped_instances'].append(f"⏭️ Skipped '{matched_str}' in {os.path.basename(filepath)} due to unsafe context: ...{snippet}...")
                
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        report['files_modified'].append(filepath)

for root, dirs, files in os.walk(TARGET_DIR):
    if any(ignore in root for ignore in ['node_modules', '.git', '.github']):
        continue
    for file in files:
        if file.endswith(('.html', '.js', '.json', '.sql', '.md', '.css')):
            process_file(os.path.join(root, file))

# Write report
report_path = os.path.join(TARGET_DIR, "TERMINOLOGY_REPORT.md")
with open(report_path, 'w', encoding='utf-8') as f:
    f.write("# Terminology Refactoring Report\n\n")
    f.write("## Summary\n")
    f.write(f"- Files Modified: {len(report['files_modified'])}\n")
    f.write(f"- Instances Skipped: {len(report['skipped_instances'])}\n\n")
    
    f.write("## Modified Files\n")
    for file in report['files_modified']:
        f.write(f"- {file.replace(TARGET_DIR, '')}\n")
    
    f.write("\n## Diff Snippets (Sample)\n")
    for snippet in report['snippets'][:20]:
        f.write(f"- {snippet}\n")
        
    f.write("\n## Skipped Instances (Code/URL variables)\n")
    for skip in report['skipped_instances'][:50]:
        f.write(f"- {skip}\n")

print("Refactoring complete. Report generated at TERMINOLOGY_REPORT.md")
