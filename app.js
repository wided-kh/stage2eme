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
  try {
      const { prenom, nom, email, numero_telephone, date_naissance, password } = req.body;

      // Hachage du mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insertion des données dans la base de données
      await sql.query`
          INSERT INTO utilisateurs (prenom, nom, email, numero_telephone, date_naissance, password)
          VALUES (${prenom}, ${nom}, ${email}, ${numero_telephone}, ${date_naissance}, ${hashedPassword})
      `;

      // Redirection vers la page de connexion après l'inscription
      res.redirect('/');
  } catch (err) {
      console.error('Erreur lors de l\'inscription :', err.message);
      res.status(500).send('Erreur serveur');
  }
});
// Route pour le tableau de bord VR
app.get('/vr', async (req, res) => {
  try {
    // Première requête pour obtenir le nombre de clients et le solde total
    const summaryResult = await sql.query(`
    SELECT 
        COUNT(name) AS clientCount,
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

   // Requête pour obtenir le total des jeux distincts
   const summaryResultGames = await sql.query(`
    SELECT 
      COUNT(DISTINCT(jeux1.nomdejeux)) AS totalGamesCount
    FROM jeux1
    WHERE CAST(jeux1.date AS DATE) >= '2024-01-13';
  `);


    // Troisième requête pour obtenir les statistiques pour le graphique en barres
   const chartResult = await sql.query(`
  SELECT
    COUNT( VR.name) AS numberOfClients,  -- Nombre de clients distincts
    SUM(VR.cumulative_consumption_amount) AS solde,  -- Somme des montants de consommation cumulés
    SUM(VR.Deposit_amount) AS remainingBalance,  -- Somme des montants de dépôt restants
    COALESCE(SUM(sub.returningClients), 0) AS returningClients  -- Somme des visites de clients distinctes dans jeux1
  FROM VR
  LEFT JOIN export_client ON VR.name = export_client.clientLastname
  LEFT JOIN (
    SELECT name, COUNT(DISTINCT CAST(date AS DATE)) AS returningClients
    FROM jeux1
    GROUP BY name
  ) sub ON VR.name = sub.name
  WHERE CAST(last_consumption_time AS DATE) >= '2024-01-13';
`);


// Quatrième requête pour obtenir la somme totale des visites, des jeux et des soldes pour le graphique en doughnut
const doughnutDataResult = await sql.query(`
  SELECT 
    COUNT(DISTINCT( jeux1.nomdejeux)) AS total_jeux,
    COUNT(DISTINCT(name)) AS total_visites
FROM jeux1
WHERE CAST(jeux1.date AS DATE) >= '2024-01-13';
`);


// Requête pour obtenir le nombre de meilleurs clients
const topClientsResult = await sql.query(`
  SELECT
      COUNT(DISTINCT(name)) AS top_clients
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
    
  },
  total_games_sum: summaryResultGames.recordset[0].totalGamesCount // Utilisation du total des jeux distincts
  
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
        COUNT(DISTINCT jeux1.nomdejeux) AS nombre_de_jeux,
        COUNT(DISTINCT CAST(jeux1.date AS DATE)) AS nombre_de_visites,
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
// Route pour obtenir les données de fidélité des clients et les dépenses par client
// Route pour obtenir les données de fidélité des clients et les dépenses par client
// Votre route dans Node.js (app.js ou routes.js)
app.get('/fid', async (req, res) => {
  try {
    // Exécute la requête SQL pour obtenir le nombre de clients fidèles
    const topClientsResult = await sql.query(`
      SELECT
          COUNT(DISTINCT(name)) AS top_clients
      FROM jeux1
      WHERE CAST(date AS DATE) >= '2024-01-13';
    `);
    const top_clients = topClientsResult.recordset.length > 0 ? topClientsResult.recordset[0].top_clients : 0;

    // Exécute la requête SQL pour obtenir les dépenses cumulées par client
    const depensesResult = await sql.query(`
      SELECT
          name,
          SUM(cumulative_consumption_amount) AS total_depenses
      FROM VR
      GROUP BY name
      ORDER BY total_depenses DESC;
    `);
    const depenses_par_client = depensesResult.recordset;

    // Calculer le total des dépenses cumulées de tous les clients
    const total_depenses = depenses_par_client.reduce((total, client) => total + client.total_depenses, 0);

    // Correction de la requête pour obtenir le nombre de clients
    const summaryResult = await sql.query(`
      SELECT 
          COUNT(name) AS clientCount
      FROM VR
      WHERE CAST(last_consumption_time AS DATE) >= '2024-01-13';
    `);
    const clientCount = summaryResult.recordset.length > 0 ? summaryResult.recordset[0].clientCount : 0;

    // Rendre la vue avec les données
    res.render('fid', {
      title: 'Fidélité Clients',
      top_clients,
      depenses_par_client,
      total_depenses,
      clientCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur lors de la récupération des données');
  }
});

 



// Route pour obtenir les dépenses par client
app.get('/depenses_par_client', async (req, res) => {
  try {
    // Exécute la requête SQL pour obtenir les dépenses cumulées par client
    const depensesResult = await sql.query(`
      SELECT
          name,
          SUM(cumulative_consumption_amount) AS total_depenses
      FROM VR
      GROUP BY name
      ORDER BY total_depenses DESC;
    `);

    // Récupère les résultats sous forme de tableau d'objets
    const depenses_par_client = depensesResult.recordset;

    // Rendre la vue avec les données ou envoyer les données en JSON
    res.render('depenses_par_client', {
      title: 'Dépenses par Client',
      depenses_par_client
    });

  } catch (err) {
    console.error("Erreur lors de la récupération des données :", err);
    res.status(500).send("Erreur du serveur");
  }
});



app.get('/profile', async (req, res) => {
  try {
      // Vérification si l'utilisateur est connecté
      if (!req.session.user) {
          return res.redirect('/login'); // Redirige vers la page de connexion si non connecté
      }

      // Récupération de l'email de l'utilisateur connecté à partir de la session
      const email = req.session.user.email;

      // Récupération des informations de l'administrateur à partir de la base de données
      const request = new sql.Request();
      request.input('email', sql.VarChar, email);

      const result = await request.query(`
          SELECT prenom, nom, email, numero_telephone, date_naissance
          FROM [crm].[wided].[utilisateurs]
          WHERE email = @email
      `);

      if (result.recordset.length === 0) {
          return res.status(404).send('Administrateur non trouvé');
      }

      const admin = result.recordset[0];

      // Formatage de la date de naissance
      const dateNaissance = new Date(admin.date_naissance);
      admin.jour_naissance = dateNaissance.getDate();
      admin.mois_naissance = dateNaissance.getMonth() + 1; // Les mois sont indexés à partir de 0
      admin.annee_naissance = dateNaissance.getFullYear();

      // Rendu de la vue 'profile' avec les informations de l'administrateur
      res.render('profile', { 
          title: 'Profil Administrateur',
          admin: admin 
      });
  } catch (err) {
      console.error('Erreur lors de la récupération du profil :', err.message);
      res.status(500).send('Erreur serveur');
  }
});

// Afficher le formulaire de modification du profil
app.get('/profile/edit', async (req, res) => {
  try {
      if (!req.session.user) {
          return res.redirect('/login');
      }

      const email = req.session.user.email;

      const request = new sql.Request();
      request.input('email', sql.VarChar, email);

      const result = await request.query(`
          SELECT prenom, nom, email, numero_telephone, date_naissance
          FROM [crm].[wided].[utilisateurs]
          WHERE email = @email
      `);

      if (result.recordset.length === 0) {
          return res.status(404).send('Administrateur non trouvé');
      }

      const admin = result.recordset[0];
      const dateNaissance = new Date(admin.date_naissance);
      admin.jour_naissance = dateNaissance.getDate();
      admin.mois_naissance = dateNaissance.getMonth() + 1;
      admin.annee_naissance = dateNaissance.getFullYear();

      res.render('profile-edit', {
          title: 'Modifier le Profil',
          admin: admin
      });
  } catch (err) {
      console.error('Erreur lors de l\'affichage du formulaire de modification :', err.message);
      res.status(500).send('Erreur serveur');
  }
});

// Traitement de la modification du profil
app.post('/profile/edit', async (req, res) => {
  try {
      if (!req.session.user) {
          return res.redirect('/login');
      }

      const email = req.session.user.email;
      const { prenom, nom, numero_telephone, date_naissance } = req.body;

      const request = new sql.Request();
      request.input('prenom', sql.VarChar, prenom);
      request.input('nom', sql.VarChar, nom);
      request.input('numero_telephone', sql.VarChar, numero_telephone);
      request.input('date_naissance', sql.Date, new Date(date_naissance));
      request.input('email', sql.VarChar, email);

      await request.query(`
          UPDATE [crm].[wided].[utilisateurs]
          SET prenom = @prenom,
              nom = @nom,
              numero_telephone = @numero_telephone,
              date_naissance = @date_naissance
          WHERE email = @email
      `);

      res.redirect('/profile');
  } catch (err) {
      console.error('Erreur lors de la mise à jour du profil :', err.message);
      res.status(500).send('Erreur serveur');
  }
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
