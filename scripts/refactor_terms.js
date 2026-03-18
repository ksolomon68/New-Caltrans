const fs = require('fs');
const path = require('path');

const TARGET_DIR = "c:\\Users\\Keisha\\Documents\\caltrans\\new caltrans";

const BANNED_TERMS = [
    { pattern: /\bVendor\b/g, replacement: 'Small Business' },
    { pattern: /\bvendor\b/g, replacement: 'small business' },
    { pattern: /\bVENDOR\b/g, replacement: 'SMALL BUSINESS' },
    { pattern: /\bVendors\b/g, replacement: 'Small Businesses' },
    { pattern: /\bvendors\b/g, replacement: 'small businesses' },
    { pattern: /\bVENDORS\b/g, replacement: 'SMALL BUSINESSES' },
    
    { pattern: /\bSBE\b/g, replacement: 'Small Business' },
    { pattern: /\bsbe\b/g, replacement: 'small business' },
    { pattern: /\bSBEs\b/g, replacement: 'Small Businesses' },
    { pattern: /\bsbes\b/g, replacement: 'small businesses' },

    { pattern: /\bDBE\b/g, replacement: 'Small Business' },
    { pattern: /\bdbe\b/g, replacement: 'small business' },
    { pattern: /\bDBEs\b/g, replacement: 'Small Businesses' },
    { pattern: /\bdbes\b/g, replacement: 'small businesses' },

    { pattern: /\bDisadvantaged Business\b/g, replacement: 'Small Business' },
    { pattern: /\bdisadvantaged business\b/g, replacement: 'small business' },
    { pattern: /\bDisadvantaged business\b/g, replacement: 'Small business' },
    { pattern: /\bDisadvantaged Businesses\b/g, replacement: 'Small Businesses' },
    { pattern: /\bdisadvantaged businesses\b/g, replacement: 'small businesses' },
    { pattern: /\bDisadvantaged businesses\b/g, replacement: 'Small businesses' },
    
    { pattern: /\bAgency\b/g, replacement: 'Prime Contractor' },
    { pattern: /\bagency\b/g, replacement: 'prime contractor' },
    { pattern: /\bAGENCY\b/g, replacement: 'PRIME CONTRACTOR' },
    { pattern: /\bAgencies\b/g, replacement: 'Prime Contractors' },
    { pattern: /\bagencies\b/g, replacement: 'prime contractors' },
    { pattern: /\bAGENCIES\b/g, replacement: 'PRIME CONTRACTORS' }
];

const report = {
    files_modified: [],
    skipped_instances: [],
    ambiguous_cases: [],
    snippets: []
};

// Negative lookbehinds/lookaheads (simulated due to JS regex engine limits)
function isSafeContext(text, matchIndex, matchLength) {
    const start = matchIndex;
    const end = matchIndex + matchLength;
    
    // Check if inside a URL or property like variable-name, variable_name
    if (start > 0 && ['-', '_', '.', '/'].includes(text[start-1])) return false;
    if (end < text.length && ['-', '_', '.', '/'].includes(text[end])) return false;
    
    // Check if preceding or succeeding characters are letters/digits (camelCase)
    if (start > 0 && /[a-zA-Z]/.test(text[start-1])) return false;
    if (end < text.length && /[a-zA-Z]/.test(text[end])) return false;
    
    return true;
}

function processFile(filepath) {
    try {
        let content = fs.readFileSync(filepath, 'utf-8');
        let originalContent = content;
        let modified = false;
        
        // We will do replacements manually to check safe context and keep track
        BANNED_TERMS.forEach(({ pattern, replacement }) => {
            let match;
            // Reset regex to start
            pattern.lastIndex = 0;
            // We use matchAll approach loop
            // We must collect matches first, process in reverse
            const matches = [];
            while ((match = pattern.exec(content)) !== null) {
                matches.push({
                    index: match.index,
                    str: match[0],
                    length: match[0].length
                });
            }
            
            for (let i = matches.length - 1; i >= 0; i--) {
                const { index, str, length } = matches[i];
                const snippetStart = Math.max(0, index - 30);
                const snippetEnd = Math.min(content.length, index + length + 30);
                const snippet = content.substring(snippetStart, snippetEnd).replace(/\n/g, ' ');
                
                if (isSafeContext(content, index, length)) {
                    content = content.substring(0, index) + replacement + content.substring(index + length);
                    modified = true;
                    if (report.snippets.length < 50) {
                        report.snippets.push(`✅ Replaced '${str}' -> '${replacement}' in ${path.basename(filepath)}: ...${snippet}...`);
                    }
                } else {
                    report.skipped_instances.push(`⏭️ Skipped '${str}' in ${path.basename(filepath)} due to unsafe context: ...${snippet}...`);
                }
            }
        });
        
        if (modified) {
            fs.writeFileSync(filepath, content, 'utf-8');
            report.files_modified.push(filepath);
        }
    } catch (e) {
        console.error(`Error processing ${filepath}: ${e.message}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (['node_modules', '.git', '.github'].includes(file)) continue;
        
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (['.html', '.js', '.json', '.sql', '.md', '.css'].includes(path.extname(fullPath))) {
            processFile(fullPath);
        }
    }
}

walkDir(TARGET_DIR);

const reportPath = path.join(TARGET_DIR, "TERMINOLOGY_REPORT.md");
let reportContent = "# Terminology Refactoring Report\n\n";
reportContent += "## Summary\n";
reportContent += `- Files Modified: ${report.files_modified.length}\n`;
reportContent += `- Instances Skipped: ${report.skipped_instances.length}\n\n`;

reportContent += "## Modified Files\n";
report.files_modified.forEach(file => {
    reportContent += `- ${file.replace(process.cwd(), '')}\n`;
});

reportContent += "\n## Diff Snippets (Sample)\n";
report.snippets.slice(0, 50).forEach(snippet => {
    reportContent += `- ${snippet}\n`;
});

reportContent += "\n## Skipped Instances (Code/URL variables)\n";
report.skipped_instances.slice(0, 50).forEach(skip => {
    reportContent += `- ${skip}\n`;
});

fs.writeFileSync(reportPath, reportContent, 'utf-8');
console.log("Refactoring complete. Report generated at TERMINOLOGY_REPORT.md");
