const fs = require('fs');
const { execSync } = require('child_process');

const replaceInFile = (file, processFunc) => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = processFunc(content);
  if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    console.log(`Updated ${file}`);
  }
};

const allFiles = execSync('find src -type f -name "*.tsx"').toString().split('\n').filter(Boolean);

allFiles.forEach(file => {
  replaceInFile(file, (content) => {
    // Replace bg-white with bg-white dark:bg-surface-container-low
    let c = content.replace(/(?<=className=(['"`]|{`)[^'"`}]*?\s?)bg-white/g, 'bg-white dark:bg-surface-container-low');
    
    // Some classes use template literals className={`bg-white...
    // The regex above tries to catch them if bg-white is at the start or spaced.

    // Let's add dark:border-white/10 to border-gray-100 or border-outline-variant/10
    c = c.replace(/border-gray-100/g, 'border-gray-100 dark:border-white/10');
    c = c.replace(/border-gray-200/g, 'border-gray-200 dark:border-white/10');
    
    // Add dark:text-white to text-gray-900
    c = c.replace(/text-gray-900/g, 'text-gray-900 dark:text-white');
    c = c.replace(/text-gray-800/g, 'text-gray-800 dark:text-gray-200');

    // Add dark:bg-gray-800 to bg-gray-50
    c = c.replace(/bg-gray-50/g, 'bg-gray-50 dark:bg-surface-container-high');

    // For images, add dark:brightness-90
    c = c.replace(/(<img\s+[^>]*?className=(['"`]{1}|{`))([^>]*?>)/g, (match, prefix, quote, suffix) => {
       if (suffix.includes('dark:brightness-90')) return match;
       return `${prefix}dark:brightness-90 transition-all ${suffix}`;
    });

    return c;
  });
});
