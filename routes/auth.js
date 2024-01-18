const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// Рендеринг главной страницы
router.get('/', (req, res) => {
    res.render('auth/index', {user:req.session.user, title:'Task Manager'});
});

// Рендеринг страницы регистрации
router.get('/register', (req, res) => {
    res.render('auth/register', {title:'Register user'});
});

// Обработка данных регистрации
router.post('/register', (req, res) => {
    try {
        const { name, password } = req.body;
        // Валидация данных
        if (!name || !password) {
            return res.render('auth/register', { error: 'Please provide both name and password' });
        }

        // Проверка существования пользователя с таким именем
        db.query('SELECT * FROM users WHERE name = ?', [name], (error, results) => {
            if (error) {
                console.error(error);
                return res.render('auth/register', { error: 'Database error' });
            }

            if (results.length > 0) {
                return res.render('auth/register', { error: 'User with this name already exists' });
            }

            // Хеширование пароля
            bcrypt.hash(password, 10, (hashError, hashedPassword) => {
                if (hashError) {
                    console.error(hashError);
                    return res.render('auth/register', { error: 'Hashing failed' });
                }

                // Создание нового пользователя
                db.query('INSERT INTO users (name, password) VALUES (?, ?)', [name, hashedPassword], (insertError) => {
                    if (insertError) {
                        console.error(insertError);
                        return res.render('auth/register', { error: 'Registration failed' });
                    }
                    req.session.successreg = 'Registration completed success';
                    res.redirect('/login');
                });
            });
        });
    } catch (error) {
        console.error(error);
        res.render('auth/register', { error: 'Unexpected error' });
    }
});

// Рендеринг страницы входа
router.get('/login', (req, res) => {
    const successReg = req.session.successreg;
    delete req.session.successreg;
    res.render('auth/login', {successReg, title:'Login'});
});

// Обработка данных входа
router.post('/login', (req, res) => {
    const { name, password } = req.body;
    // Валидация данных
    if (!name || !password) {
        return res.render('auth/login', { error: 'Please provide both name and password' });
    }

    // Поиск пользователя по имени
    db.query('SELECT * FROM users WHERE name = ?', [name], (error, results) => {
        if (error) {
            console.error(error);
            return res.render('auth/login', { error: 'Database error' });
        }

        const user = results[0];

        // Проверка пароля
        if (user) {
            bcrypt.compare(password, user.password, (compareError, passwordMatch) => {
                if (compareError) {
                    console.error(compareError);
                    return res.render('auth/login', { error: 'Login failed' });
                }

                if (passwordMatch) {
                    // Аутентификация успешна
                    req.session.user = user;
                    res.redirect('/');
                } else {
                    res.render('auth/login', { error: 'Invalid name or password' });
                }
            });
        } else {
            res.render('auth/login', { error: 'Invalid name or password' });
        }
    });
});

// Выход
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;