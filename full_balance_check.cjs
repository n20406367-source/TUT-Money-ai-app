const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'MemberDashboard.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

let braceStack = [];
let parenStack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') {
      braceStack.push({ line: i + 1, col: j + 1 });
    } else if (char === '}') {
      if (braceStack.length === 0) {
        console.log(`Unmatched } at line ${i + 1}:${j + 1}`);
      } else {
        braceStack.pop();
      }
    } else if (char === '(') {
      parenStack.push({ line: i + 1, col: j + 1 });
    } else if (char === ')') {
      if (parenStack.length === 0) {
        console.log(`Unmatched ) at line ${i + 1}:${j + 1}`);
      } else {
        parenStack.pop();
      }
    }
  }
}

console.log("Finished brace and paren check.");
console.log("Remaining open braces:", braceStack.length);
if (braceStack.length > 0) {
  console.log("Top 5 unclosed braces:", braceStack.slice(-5));
}
console.log("Remaining open parens:", parenStack.length);
if (parenStack.length > 0) {
  console.log("Top 5 unclosed parens:", parenStack.slice(-5));
}
