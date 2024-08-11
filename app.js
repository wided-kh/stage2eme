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
  secret: 'c3f3c9bda6a5f8d6e74b7f5c8f8ebda2c5c9a8bda3b5c8d9e7f3b2a5c8d9e7f3a5c8d9e7f3c5a9b8',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
// Route pour la page de connexion
app.get('/', (req, res) => {
  res.render('login', { imagePath: 'public/images/lac.png' });
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
    // Première requête pour obtenir le nombre de clients et le solde total
    const summaryResult = await sql.query(`
      SELECT 
          COUNT(*) AS clientCount,
          SUM(cumulative_consumption_amount) AS totalBalance
      FROM VR
      WHERE CAST(last_consumption_time AS DATE) >= '2024-01-13';
    `);

    // Deuxième requête pour obtenir les détails des clients pour le tableau
    const clientsResult = await sql.query(`
        SELECT 
            name AS nom,
            phone_number AS numero_de_telephone,
            the_shop_where_opened_this_VIP_card AS site,
            birthday AS date_de_naissance,
            cumulative_consumption_amount AS solde,
            Deposit_amount AS reste_du_solde
        FROM VR
        WHERE CAST(last_consumption_time AS DATE) >= '2024-01-13';
    `);

    // Troisième requête pour obtenir les statistiques pour le graphique en barres
    const chartResult = await sql.query(`
      SELECT
        COUNT(*) AS numberOfClients,  -- Nombre de clients distincts
        SUM(VR.cumulative_consumption_amount) AS solde,  -- Somme des montants de consommation cumulés
        SUM(VR.Deposit_amount) AS remainingBalance,  -- Somme des montants de dépôt restants
        COALESCE(SUM(export_client.clientNbVisite), 0) AS returningClients  -- Somme des visites de clients (avec 0 si pas de visites)
      FROM VR
      LEFT JOIN export_client ON VR.name = export_client.clientFirstname
      WHERE CAST(last_consumption_time AS DATE) >= '2024-01-13';
    `);

// Quatrième requête pour obtenir la somme totale des visites, des jeux et des soldes pour le graphique en doughnut
const doughnutDataResult = await sql.query(`
  SELECT 
    COUNT(DISTINCT( jeux1.nomdejeux)) AS total_jeux,
    SUM(jeux1.nbvisite) AS total_visites
FROM jeux1
WHERE CAST(jeux1.date AS DATE) >= '2024-01-13';
`);


// Requête pour obtenir le nombre de meilleurs clients
const topClientsResult = await sql.query(`
  SELECT
      COUNT(*) AS top_clients
  FROM jeux1
  WHERE CAST(date AS DATE) >= '2024-01-13';
`);
if (doughnutDataResult.recordset.length > 0) {
  console.log("Données reçues:", doughnutDataResult.recordset[0]);
} else {
  console.log("Aucune donnée trouvée.");
}

// Rendre la vue avec toutes les données
res.render('vr', {
  title: 'VR',
  clientCount: summaryResult.recordset[0].clientCount,
  balance: summaryResult.recordset[0].totalBalance,
  remainingBalance: chartResult.recordset[0].remainingBalance,
  returningClients: chartResult.recordset[0].returningClients,
  clients: clientsResult.recordset,
  top_clients: topClientsResult.recordset[0].top_clients,
  doughnutData: {
    total_visites: doughnutDataResult.recordset[0].total_visites || 0,
    total_jeux: doughnutDataResult.recordset[0].total_jeux || 0
    
  }
  
});


  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).send('Internal Server Error');
  }
});


// Route pour afficher les détails des clients
app.get('/clients', async (req, res) => {
  try {
      

      // Requête pour obtenir les détails des clients
      const clients = await sql.query(`
          SELECT 
              name AS nom,
              phone_number AS numero_de_telephone,
              the_shop_where_opened_this_VIP_card AS site,
              birthday AS date_de_naissance,
              cumulative_consumption_amount AS solde,
              Deposit_amount AS reste_du_solde
          FROM VR
          WHERE CAST(last_consumption_time AS DATE) >= '2024-01-13';
      `);

      res.render('clients', {
          title: 'Liste des Clients',
          clients: clients.recordset
      });
  } catch (err) {
      console.error('Database query error:', err);
      res.status(500).send('Internal Server Error');
  }
});

// Route pour afficher le solde
app.get('/solde', async (req, res) => {
  try {
      

      // Requête pour obtenir le solde total
      const result = await sql.query(`
          SELECT 
              SUM(cumulative_consumption_amount) AS totalBalance
          FROM VR
          WHERE CAST(last_consumption_time AS DATE) >= '2024-01-13';
      `);

      res.render('solde', {
          title: '',
          balance: result.recordset[0].totalBalance
      });
  } catch (err) {
      console.error('Database query error:', err);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/top-clients', async (req, res) => {
  try {
      
      // Requête pour obtenir les données des meilleurs clients
      const result = await sql.query(`
       SELECT
    jeux1.name AS nom,
    COUNT(jeux1.nomdejeux) AS nombre_de_jeux,
    SUM(jeux1.nbvisite) AS nombre_de_visites,
    COALESCE(VR.cumulative_consumption_amount, 0) AS solde,
    COALESCE(VR.Deposit_amount, 0) AS reste_du_solde
FROM jeux1
LEFT JOIN VR ON jeux1.name = VR.name
WHERE CAST(jeux1.date AS DATE) >= '2024-01-13'
GROUP BY jeux1.name, VR.cumulative_consumption_amount, VR.Deposit_amount
ORDER BY nombre_de_visites DESC;

    `);


      // Rendre la vue avec les données
      res.render('top-clients', {
          title: '',
          clients: result.recordset
      });
  } catch (err) {
      console.error('Database query error:', err);
      res.status(500).send('Internal Server Error');
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
