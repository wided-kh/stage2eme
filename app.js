const express = require('express');
const path = require('path');
const sql = require('./dbconfig'); // Assurez-vous que le chemin est correct
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// Définir le moteur de vue EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Assurez-vous que ce chemin est correct

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Pour servir les fichiers statiques comme CSS, JS, images
app.use(session({
  secret: 'yourSecretKey', // Changez cette clé pour une clé secrète plus sécurisée
  resave: false,
  saveUninitialized: true,
}));

// Route pour la page de connexion
app.get('/', (req, res) => {
  res.render('login');
});

// Route pour gérer la connexion
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await sql.query`SELECT * FROM utilisateurs WHERE email = ${email}`;
    const user = result.recordset[0];

    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = user;
      res.redirect('/vr'); // Redirigez vers une page protégée après connexion
    } else {
      res.status(401).send('Identifiants incorrects');
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Route pour gérer l'inscription
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await sql.query`INSERT INTO utilisateurs (email, password) VALUES (${email}, ${hashedPassword})`;
    res.redirect('/');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Route pour le tableau de bord VR
app.get('/vr', async (req, res) => {
    try {
        // Exemple de récupération des données depuis la base de données ou d'autres sources
        const clientCount = 100; // Remplacez par la vraie valeur
        const balance = '100$'; // Remplacez par la vraie valeur
        const activityCount = 5; // Remplacez par la vraie valeur

        // Exemple de données pour les graphiques
        const lineChartLabels = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const lineChartData = [2024, 2025, 2026, 2027, 2028, 2029];
        const doughnutLabels = ["Clients", "Soldes", "Activité"];
        const doughnutData = [30, 30, 40];
        const doughnutColors = ["#b91d47", "#2b5797", "#e8c3b9"];

        res.render('vr', {
            title: 'VR LAND',
            clientCount,
            balance,
            activityCount,
            lineChartLabels,
            lineChartData,
            doughnutLabels,
            doughnutData,
            doughnutColors
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Route pour la page FID
app.get('/fid', (req, res) => {
    // Vous pouvez ajuster les variables passées à la vue selon vos besoins
    res.render('fid', {
        title: 'FID',
        clientCount: 100,       // Remplacez par la valeur réelle
        paymentAmount: '100$',  // Remplacez par la valeur réelle
        activityCount: 5        // Remplacez par la valeur réelle
    });
});

// Route pour le tableau de bord PME
app.get('/pme', (req, res) => {
    res.render('pme', {
        title: 'PME',
        visitCount: 100,           // Valeur d'exemple
        withdrawalCount: 100,      // Valeur d'exemple
        activityCount: 5,          // Valeur d'exemple
        clientCount: 5             // Valeur d'exemple
    });
});

// Route pour la déconnexion
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.redirect('/');
    });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
