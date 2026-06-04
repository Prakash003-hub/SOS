const fs = require('fs');
const path = 'd:/project/g form/src/pages/AdminPortal.jsx';
let content = fs.readFileSync(path, 'utf8');

const startStr = '                    <option value="others">Others</option>\n                  </select>\n                </div>\n';
const endStr = '\n                <div style={{ display: \'flex\', gap: \'10px\', marginTop: \'20px\' }}>\n                  <button type="submit"';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if(startIndex > -1 && endIndex > -1) {
  const newContent = content.substring(0, startIndex + startStr.length) + content.substring(endIndex);
  fs.writeFileSync(path, newContent, 'utf8');
  console.log('Success');
} else {
  console.log('Failed to find markers: start=' + startIndex + ' end=' + endIndex);
}
