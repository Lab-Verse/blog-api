const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src/modules/import/import.service.ts');
let content = fs.readFileSync(filePath, 'utf-8');
const eol = content.includes('\r\n') ? '\r\n' : '\n';
content = content.replace(/\r\n/g, '\n');
const marker = '  private async hashPassword(password: string): Promise<string> {\n    return bcrypt.hash(password, 10);\n  }\n}\n';
if (!content.includes(marker)) {
  console.log('ERROR: Marker not found!');
  process.exit(1);
}
const newCode = fs.readFileSync(path.join(__dirname, 'patch-methods.txt'), 'utf-8').replace(/\r\n/g, '\n');
content = content.replace(marker, newCode);
if (eol === '\r\n') content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content);
console.log('Done. Lines:', content.split(eol).length);
