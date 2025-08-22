const fs = require('fs');
const path = require('path');

// Path to the built HTML file
const htmlPath = path.join(__dirname, '../renderer/dist/index.html');

try {
  console.log(`Looking for HTML file at: ${htmlPath}`);
  
  // Read the HTML file
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');
  console.log('Original HTML content:\n', htmlContent);
  
  // Replace absolute paths with relative paths - handle multiple formats
  htmlContent = htmlContent.replace(/src="\//g, 'src="./');
  htmlContent = htmlContent.replace(/href="\//g, 'href="./');
  htmlContent = htmlContent.replace(/crossorigin src="\//g, 'crossorigin src="./');
  htmlContent = htmlContent.replace(/crossorigin href="\//g, 'crossorigin href="./');
  
  console.log('Modified HTML content:\n', htmlContent);
  
  // Write the modified content back
  fs.writeFileSync(htmlPath, htmlContent);
  
  // Create a backup for verification
  fs.writeFileSync(`${htmlPath}.fixed`, htmlContent);
  
  console.log('Successfully fixed asset paths in HTML file.');
} catch (err) {
  console.error('Error fixing HTML paths:', err);
}
