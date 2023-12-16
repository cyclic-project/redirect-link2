const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { findRedirectByPath } = require(`./views/redirect-tools`);
const session = require('express-session');
const cookieParser = require('cookie-parser');
var passwordAuth = "marsel"

const app = express();
const PORT = 3000;
function hasLeadingSlash(str) {
 return str.startsWith('/');
}

// Middleware untuk parsing body pada request
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Menggunakan EJS sebagai view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Membaca data redirect dari file JSON
const redirectDataPath = path.join(__dirname, 'redirects.json');
let redirectData = [];

try {
 const data = fs.readFileSync(redirectDataPath);
 redirectData = JSON.parse(data);
} catch (err) {
 console.error('Error reading redirects.json:', err.message);
}

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
 secret: passwordAuth,
 resave: true,
 saveUninitialized: true
}));

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
 res.cookie('next', req.url)
 if (req.session.authenticated) {
  // res.setHeader('Set-Cookie', 'next=');
  return next();
 }
 res.redirect('/login');
}

// Render the login page
app.get('/login', (req, res) => {
 res.render('login');
});

// Handle login
app.post('/login', (req, res) => {
 const { password } = req.body;

 // Check the password (replace 'adminpassword' with your desired password)
 if (password === passwordAuth) {
  req.session.authenticated = true;
  var next = req.cookies.next || "/admin";
  res.clearCookie('next');
  res.redirect(next);
 } else {
  res.redirect('/login?wrong');
 }
});

app.get('/logout', (req, res) => {
 req.session.destroy((err) => {
  if (err) {
   console.error('Error during logout:', err);
   res.status(500).send('Internal Server Error');
  } else {
   // Redirect ke halaman login atau halaman lainnya setelah logout
   res.redirect('/login');
  }
 });
})

// Menampilkan halaman admin
app.get('/admin', isAuthenticated, (req, res) => {
 req.session.authenticated = true;
 res.render('admin', { redirects: redirectData });
});

// Menyimpan data redirect baru
app.post('/admin/add', isAuthenticated, (req, res) => {
 const { path, url } = req.body;

 if (path && url) {
  var newRedirect;
  if (hasLeadingSlash(path)) {
   newRedirect = { path, url };
  } else {
   newRedirect = { path: `/${path}`, url };
  }
  redirectData.push(newRedirect);

  updateRedirectsFile(redirectData, (err) => {
   if (err) {
    // Tangani kesalahan, misalnya, kirim respons kesalahan ke klien
    res.status(500).send('Internal Server Error');
   } else {
    req.session.authenticated = true;
    res.redirect('/admin');
   }
  });
 } else {
  res.status(400).send('Bad Request');
 }
});

app.post('/admin/delete/:path', isAuthenticated, (req, res) => {
 const { path } = req.params;
 const index = redirectData.findIndex(item => item.path === `/${path}`);
 if (index !== -1) {
  redirectData.splice(index, 1);
 }
 updateRedirectsFile(redirectData, () => {
  req.session.authenticated = true;
  res.redirect('/admin');
 })
 // deleteRedirectByPath(path);
});

// Menampilkan halaman edit
app.get('/admin/edit/:path', isAuthenticated, (req, res) => {
 const { path } = req.params;
 const redirect = redirectData.find(r => r.path === `/${path}`);

 if (redirect) {
  req.session.authenticated = true;
  res.render('edit', { redirect });
 } else {
  res.status(404).send('Not Found');
 }
});

// Menyimpan perubahan data redirect
app.post('/admin/edit/:path', (req, res) => {
 const { path: oldPath } = req.params;
 const { path: newPath, url } = req.body;

 if (newPath && url) {
  const index = redirectData.findIndex(r => r.path === `/${oldPath}`);

  if (index !== -1) {
   // Perbarui path dan URL
   redirectData[index] = { path: `/${newPath}`, url };

   updateRedirectsFile(redirectData, () => {
    req.session.authenticated = true;
    res.redirect('/admin');
   });
  } else {
   res.status(404).send('Not Found');
  }
 } else {
  res.status(400).send('Bad Request');
 }
});

// Menangani redirect
app.get('/redirect/:path', (req, res) => {
 const { path } = req.params;
 const redirect = redirectData.find(r => r.path === `/${path}`);

 if (redirect) {
  res.redirect(redirect.url);
 } else {
  res.status(404).send('Not Found');
 }
});

app.get('/:path', (req, res) => {
 const { path } = req.params;
 const redirect = findRedirectByPath(`/${path}`);

 if (redirect) {
  // Sajikan halaman redirect
  res.render('redirect', { redirect });
 } else {
  res.status(404).send('Not Found');
 }
});

// Menjalankan server
app.listen(PORT, () => {
 console.log(`Server is running on http://localhost:${PORT}`);
});

// Fungsi untuk menyimpan data redirect ke file
function updateRedirectsFile(data, callback) {
 fs.writeFile(redirectDataPath, JSON.stringify(data, null, 2), (err) => {
  if (err) {
   console.error('Error saat menulis redirects.json:', err.message);
   if (callback) {
    callback(err);
   }
  } else {
   console.log('File redirects berhasil diperbarui');
   if (callback) {
    callback(null);
   }
  }
 });
}
