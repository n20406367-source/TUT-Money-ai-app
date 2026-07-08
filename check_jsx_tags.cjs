const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'MemberDashboard.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const tagStack = [];

// Simple regex to find JSX tags (like <div ...> or </div>)
// Skipping self-closing tags (like <img ... /> or <div />)
const tagRegex = /<\/?([a-zA-Z0-9]+)(?:\s+[^>]*[^\/]>|>)/g;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Clean line of comments to avoid matching fake tags inside comments
  const cleanLine = line.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  
  let match;
  while ((match = tagRegex.exec(cleanLine)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    
    // Check if it's self-closing or a comment
    if (fullTag.endsWith('/>') || fullTag.startsWith('<!--') || fullTag.startsWith('<!')) {
      continue;
    }
    
    if (fullTag.startsWith('</')) {
      // Closing tag
      if (tagStack.length === 0) {
        console.log(`Unmatched closing tag ${fullTag} on line ${i + 1}`);
      } else {
        const lastOpen = tagStack.pop();
        if (lastOpen.name !== tagName) {
          // Sometimes nesting can be loose, but let's print mismatches
          console.log(`Mismatch on line ${i + 1}: found ${fullTag}, but last open was <${lastOpen.name}> from line ${lastOpen.line}`);
        }
      }
    } else {
      // Opening tag
      tagStack.push({ name: tagName, line: i + 1 });
    }
  }
}

console.log("Remaining open tags in stack:", tagStack.length);
if (tagStack.length > 0) {
  console.log("Top 10 open tags:", tagStack.slice(-10));
}
