const fs = require('fs');
const path = require('path');

const dir = process.cwd();

function processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
        if (item === 'node_modules' || item === '.git') continue;
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Fix email links
            if (content.includes('<a href="mailto:SBEss@dot.ca.gov">SBEss@dot.ca.gov</a>')) {
                content = content.replace(
                    /<li><a href="mailto:SBEss@dot\.ca\.gov">SBEss@dot\.ca\.gov<\/a><\/li>/g,
                    '<li><a href="mailto:SBEss@dot.ca.gov" aria-label="Email Caltrans Small Business Support at SBEss@dot.ca.gov">SBEss@dot.ca.gov</a></li>'
                );
                // Also handle non-li cases just in case
                content = content.replace(
                    /<a href="mailto:SBEss@dot\.ca\.gov">SBEss@dot\.ca\.gov<\/a>/g,
                    '<a href="mailto:SBEss@dot.ca.gov" aria-label="Email Caltrans Small Business Support at SBEss@dot.ca.gov">SBEss@dot.ca.gov</a>'
                );
                modified = true;
            }

            // Fix external link sr-only in global footer
            if (content.includes('Service Request Form &nearrow;</a>')) {
                content = content.replace(
                    />Service Request Form &nearrow;<\/a>/g,
                    '>Service Request Form <span class="sr-only">(opens in new window)</span>&nearrow;</a>'
                );
                content = content.replace(
                    />Text Notifications &nearrow;<\/a>/g,
                    '>Text Notifications <span class="sr-only">(opens in new window)</span>&nearrow;</a>'
                );
                content = content.replace(
                    />BDP Interest Form &nearrow;<\/a>/g,
                    '>BDP Interest Form <span class="sr-only">(opens in new window)</span>&nearrow;</a>'
                );
                content = content.replace(
                    />Workforce Development &nearrow;<\/a>/g,
                    '>Workforce Development <span class="sr-only">(opens in new window)</span>&nearrow;</a>'
                );
                content = content.replace(
                    />Caltrans Home &nearrow;<\/a>/g,
                    '>Caltrans Home <span class="sr-only">(opens in new window)</span>&nearrow;</a>'
                );
                content = content.replace(
                    />Civil\s*Rights &nearrow;<\/a>/g,
                    '>Civil Rights <span class="sr-only">(opens in new window)</span>&nearrow;</a>'
                );
                content = content.replace(
                    />SB & Workforce Dev &nearrow;<\/a>/g,
                    '>SB & Workforce Dev <span class="sr-only">(opens in new window)</span>&nearrow;</a>'
                );
                content = content.replace(
                    />Contracting Portal\s*&nearrow;<\/a>/g,
                    '>Contracting Portal <span class="sr-only">(opens in new window)</span>&nearrow;</a>'
                );
                content = content.replace(
                    />Mentor Protege &nearrow;<\/a>/g,
                    '>Mentor Protege <span class="sr-only">(opens in new window)</span>&nearrow;</a>'
                );
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${item}`);
            }
        }
    }
}

processDirectory(dir);
console.log('Done.');
