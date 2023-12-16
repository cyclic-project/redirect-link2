const redirectData = require(`../redirects.json`) || "";

function findRedirectByPath(path) {
 return redirectData.find(item => item.path === path);
}

// function deleteRedirectByPath(path) {
//  const index = redirectData.findIndex(item => item.path === `/${path}`);
//  console.log(index)
//  if (index !== -1) {
//   redirectData.splice(index, 1);
//   return true; // Deletion successful
//  }
//  return false; // Redirect not found
// }

// Ekspor fungsi agar dapat digunakan di file lain
module.exports = {
 findRedirectByPath
};