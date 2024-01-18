const mysql = require('mysql');

// Конфигурация подключения к базе данных
const db = mysql.createConnection({
  host: 'localhost', // Адрес хоста базы данных
  user: 'root', // Имя пользователя базы данных
  password: '', // Пароль пользователя базы данных
  database: 'projects-list' // Имя базы данных
});

// Установка соединения с базой данных
db.connect((err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err);
    return;
  }
  console.log('Успешное подключение к базе данных');
});

// Закрытие соединения с базой данных при завершении работы приложения
process.on('SIGINT', () => {
  connection.end();
  process.exit();
});

module.exports = db;