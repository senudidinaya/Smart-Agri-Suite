const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/freak/smart-agri-suite/frontend/app/(tabs)';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace {" "} with empty string across all files safely
    const newContent = content.replace(/\{\s*"\s*"\s*\}/g, '');

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Cleaned JSX literals in ${file}`);
    }
});
