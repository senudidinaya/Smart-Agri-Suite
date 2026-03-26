const fs = require('fs');
const path = require('path');

const walkSync = function (dir, filelist) {
    const files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            if (file !== 'node_modules' && file !== '.expo') {
                filelist = walkSync(path.join(dir, file), filelist);
            }
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                filelist.push(path.join(dir, file));
            }
        }
    });
    return filelist;
};

const allFiles = walkSync(path.join(__dirname, 'app')).concat(walkSync(path.join(__dirname, 'src')));

for (const filepath of allFiles) {
    let content = fs.readFileSync(filepath, 'utf8');

    // First, let's look for "SafeAreaView" inside react-native imports.
    // We'll replace lines like "    SafeAreaView," with empty string.
    let newContent = content.replace(/[ \t]*SafeAreaView,[ \t]*\r?\n/g, '');
    newContent = newContent.replace(/[ \t]*SafeAreaView[ \t]*\r?\n/g, '');

    // Remove if it's inline "import { View, SafeAreaView } from 'react-native'"
    newContent = newContent.replace(/import\s*\{([^}]*)SafeAreaView([^}]*)\}\s*from\s*['"]react-native['"]/g, "import {$1$2} from 'react-native'");

    // Clean up empty commas
    newContent = newContent.replace(/,\s*,/g, ',');
    newContent = newContent.replace(/\{\s*,/g, '{');
    newContent = newContent.replace(/,\s*\}/g, '}');

    // Add SafeAreaView to react-native-safe-area-context
    if (content !== newContent) {
        if (newContent.includes('react-native-safe-area-context')) {
            newContent = newContent.replace(/import\s*\{([^}]*)\}\s*from\s*['"]react-native-safe-area-context['"];/, 'import {$1, SafeAreaView} from "react-native-safe-area-context";');
        } else {
            newContent = 'import { SafeAreaView } from "react-native-safe-area-context";\n' + newContent;
        }

        fs.writeFileSync(filepath, newContent, 'utf8');
        console.log("Updated: " + filepath);
    }
}
