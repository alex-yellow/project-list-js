const express = require('express');
const router = express.Router();
const db = require('../db');


// Список задач
router.get('/projects', async (req, res) => {
    try {
        const user = req.user;

        db.query('SELECT * FROM projects WHERE user_id = ?', [user.id], (error, results) => {
            if (error) {
                console.error('Ошибка при получении проекта:', error);
                res.status(500).send('Internal Server Error');
            } else {
                // Отправим задачи на страницу
                res.render('project/index', { projects: results, session: req.session, title:'Projects' });
            }
        });
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Форма создания задачи
router.get('/projects/create', (req, res) => {
    try {
        res.render('project/create', { user: req.session.user, title:'Create Task' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Маршрут для обработки POST-запроса на добавление задачи
router.post('/projects/create', (req, res) => {
    const name = req.body.name;
    const user_id = req.session.user.id;

    const query = 'INSERT INTO projects (name, user_id) VALUES (?, ?)';

    db.query(query, [name, user_id], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        req.flash('success', 'Проект создан успешно!');
        res.redirect('/projects');
    });
});

router.get('/projects/edit/:projectId', (req, res) => {
    const projectId = req.params.projectId;

    const query = 'SELECT * FROM projects WHERE id = ?';

    db.query(query, [projectId], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        const project = result[0];
        // Отображаем страницу редактирования с данными задачи
        res.render('project/edit', { project, user: req.session.user, title:'Edit Task'});
    });
});

router.post('/projects/edit/:projectId', (req, res) => {
    const projectId = req.params.projectId;
    const newName = req.body.name;

    const query = 'UPDATE projects SET name = ? WHERE id = ?';

    db.query(query, [newName, projectId], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        req.flash('success', 'Проект обновлен успешно!');
        // Возвращаемся на страницу с задачами (здесь нужно уточнить ваш путь)
        res.redirect('/projects');
    });
});


router.post('/projects/:projectId/delete', (req, res) => {
    const projectId = req.params.projectId;
    const user = req.session.user;

    // Удаляем связанные задачи
    const deleteTasksQuery = 'DELETE FROM tasks WHERE project_id = ?';
    db.query(deleteTasksQuery, [projectId], (err, result) => {
        if (err) {
            console.error('Ошибка при удалении задач:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        // Теперь удаляем проект
        const deleteProjectQuery = 'DELETE FROM projects WHERE id = ? AND user_id = ?';
        db.query(deleteProjectQuery, [projectId, user.id], (err, result) => {
            if (err) {
                console.error('Ошибка при выполнении запроса:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            req.flash('success', 'Проект удален успешно!');
            res.redirect('/projects');
        });
    });
});

module.exports = router;