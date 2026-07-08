const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'MemberDashboard.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

// Let's analyze the subscription block (from line 1890 to 2410)
console.log("Analyzing subscription block...");
let divCount = 0;
let braceCount = 0;

for (let i = 1890; i < 2410; i++) {
  const line = lines[i];
  if (!line) continue;
  
  // Count divs and braces on this line
  const openDivs = (line.match(/<div/g) || []).length;
  const closeDivs = (line.match(/<\/div>/g) || []).length;
  const openBraces = (line.match(/\{/g) || []).length;
  const closeBraces = (line.match(/\}/g) || []).length;
  
  divCount += openDivs - closeDivs;
  braceCount += openBraces - closeBraces;
  
  if (openDivs > 0 || closeDivs > 0 || openBraces > 0 || closeBraces > 0) {
    console.log(`Line ${i + 1}: ${line.trim()} | divs: ${divCount} (change ${openDivs - closeDivs}) | braces: ${braceCount} (change ${openBraces - closeBraces})`);
  }
}
