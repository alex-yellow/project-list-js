const express = require('express');
const router = express.Router();
const db = require('../db');
const Handlebars = require('handlebars');
const paginate = require('handlebars-paginate');

// Регистрация хелпера handlebars-paginate
Handlebars.registerHelper('paginate', paginate);

// Список задач
router.get('/projects/:projectId/tasks', async (req, res) => {
    try {
        const user = req.user;
        const projectId = req.params.projectId;
        const getPrioritiesSql = 'SELECT * FROM priorities';

        // Параметры пагинации
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 4; // Установите желаемый лимит
        const offset = (page - 1) * limit;

        let getTasksSql = 'SELECT * FROM tasks WHERE project_id = ?';
        const queryParams = [projectId];

        if (req.query.priority_id) {
            getTasksSql += ' AND priority_id = ?';
            queryParams.push(req.query.priority_id);
        }

        if (req.query.search) {
            getTasksSql += ' AND title LIKE ?';
            queryParams.push(`%${req.query.search}%`);
        }

        getTasksSql += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        db.query(getPrioritiesSql, (errPriorities, priorities) => {
            if (errPriorities) {
                console.error('Error fetching priorities:', errPriorities);
                res.status(500).send('Internal Server Error');
                return;
            }

            db.query(getTasksSql, queryParams, (errTasks, tasks) => {
                if (errTasks) {
                    console.error('Error fetching tasks:', errTasks);
                    res.status(500).send('Internal Server Error');
                    return;
                }

                const tasksWithDetails = tasks.map(task => {
                    const priority = priorities.find(prio => prio.id === task.priority_id);

                    return {
                        ...task,
                        priority: priority ? priority.name : null,
                    };
                });

                res.render('task/index', {
                    tasks: tasksWithDetails,
                    user: req.session.user,
                    priorities: priorities,
                    projectId,
                    // Передаем параметры пагинации в представление
                    pagination: { page, limit, totalCount: tasks.length },
                    title: 'Tasks'
                });
            });
        });
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Форма создания задачи
router.get('/projects/:projectId/tasks/create', (req, res) => {
    try {
        // Выполняем запросы к базе данных
        const projectId = req.params.projectId;
        db.query('SELECT * FROM priorities', (priorityError, priorityResults) => {
            if (priorityError) {
                console.error(priorityError);
                // Обработка ошибки запроса категорий
                return res.status(500).send('Internal Server Error');
            }

            db.query('SELECT * FROM projects WHERE id=?', [projectId], (error, projects) => {
                if (error) {
                    console.error(error);
                    // Обработка ошибки запроса приоритетов
                    return res.status(500).send('Internal Server Error');
                }
                const project = projects[0];
                // Передаем результаты запросов в шаблон
                res.render('task/create', {
                    user: req.session.user,
                    priorities: priorityResults,
                    projectId,
                    title: 'Create Task'
                });
            });
        });
    } catch (error) {
        console.error(error);
        // Обработка неожиданной ошибки
        res.status(500).send('Internal Server Error');
    }
});

// Маршрут для обработки POST-запроса на добавление задачи
router.post('/projects/:projectId/tasks/create', (req, res) => {
    const title = req.body.title;
    const projectId = req.params.projectId;
    const priority_id = req.body.priority_id;


    const query = 'INSERT INTO tasks (title, project_id, priority_id) VALUES (?, ?, ?)';

    db.query(query, [title, projectId, priority_id], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        req.flash('success', 'Задача создана успешно!');
        // Возвращаемся на страницу с задачами (здесь нужно уточнить ваш путь)
        res.redirect(`/projects/${projectId}/tasks`);
    });
});

router.get('/tasks/:taskId/edit', (req, res) => {
    const taskId = req.params.taskId;

    const query = 'SELECT * FROM tasks WHERE id = ?';

    db.query(query, [taskId], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        const task = result[0];
        db.query('SELECT * FROM priorities', (priorityError, priorityResults) => {
            if (priorityError) {
                console.error(priorityError);
                // Обработка ошибки запроса приоритетов
                return res.status(500).send('Internal Server Error');
            }

            // Отображаем страницу редактирования с данными задачи
            res.render('task/edit', { task, taskId, user: req.session.user, priorities: priorityResults, projectId: task.project_id, title: 'Edit Task' });
        });
    });
});

router.post('/tasks/:taskId/edit', (req, res) => {
    const taskId = req.params.taskId;
    const newTitle = req.body.title;
    const newPriority = req.body.priority_id;
    const projectId = req.body.projectId;

    const query = 'UPDATE tasks SET title = ?, priority_id =? WHERE id = ?';

    db.query(query, [newTitle, newPriority, taskId], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        req.flash('success', 'Задача обновлена успешно!');
        // Возвращаемся на страницу с задачами (здесь нужно уточнить ваш путь)
        res.redirect(`/projects/${projectId}/tasks`);
    });
});


router.post('/tasks/:taskId/complete', (req, res) => {
    const taskId = req.params.taskId;

    const query = 'SELECT * FROM tasks WHERE id = ?';

    db.query(query, [taskId], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (result.length === 0) {
            console.error('Задача не найдена');
            res.status(404).send('Not Found');
            return;
        }

        const task = result[0];
        const projectId = task.project_id;
        // Обновляем значение completed в противоположное
        const updatedCompleted = !task.completed;

        // Обновляем значение completed в базе данных
        const updateQuery = 'UPDATE tasks SET completed = ? WHERE id = ?';

        db.query(updateQuery, [updatedCompleted, taskId], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Ошибка при обновлении задачи:', updateErr);
                res.status(500).send('Internal Server Error');
                return;
            }
            req.flash('success', 'Задача обновлена успешно!');
            console.log('Задача обновлена');
            res.redirect(`/projects/${projectId}/tasks`);
        });
    });
});

router.post('/tasks/:id/delete', (req, res) => {
    const taskId = req.params.id;
    const user = req.session.user;
    const queryFind = 'SELECT * FROM tasks WHERE id = ?';

    db.query(queryFind, [taskId], (err, result) => {
        if (err) {
            console.error('Ошибка при выполнении запроса:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (result.length === 0) {
            console.error('Задача не найдена');
            res.status(404).send('Not Found');
            return;
        }

        const task = result[0];
        const projectId = task.project_id;

        const query = 'DELETE FROM tasks WHERE id = ?';

        db.query(query, [taskId], (err, result) => {
            if (err) {
                console.error('Ошибка при выполнении запроса:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            req.flash('success', 'Задача удалена успешно!');
            // После успешного удаления задачи, перенаправьте пользователя на страницу с задачами
            res.redirect(`/projects/${projectId}/tasks`);
        });
    });

});

module.exports = router;