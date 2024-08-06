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

async function testConnection() {
  try {
    await sql.connect(config);
    console.log('Connection successful');
  } catch (err) {
    console.error('Connection error:', err);
  }
}

testConnection();

module.exports = sql;
