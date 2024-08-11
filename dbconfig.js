const sql = require('mssql');

const config = {
  user: 'wided', // Remplacez par votre nom d'utilisateur SQL
  password: 'wided123*', // Remplacez par votre mot de passe SQL
  server: 'localhost\\SQLEXPRESS', // Utilisation de localhost
  database: 'crm',
  options: {
    encrypt: false, // Changez à true si vous utilisez Azure SQL
    trustServerCertificate: true // Changez à false pour plus de sécurité en production
  }
};

// Connexion à la base de données
sql.connect(config)
    .then(pool => {
        if (pool.connecting) {
            console.log('Connecting to database...');
        }
        if (pool.connected) {
            console.log('Connected to database.');
        }
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });

module.exports = sql;
