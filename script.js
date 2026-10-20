'use strict';
const $ = selector => document.querySelector(selector);
const STORAGE_KEY = 'taskflow.tasks.v1';
const THEME_KEY = 'taskflow.theme.v1';
const categoryNames = {
    study: 'Таҳсил',
    work: 'Кор',
    personal: 'Шахсӣ'
};
const priorityNames = {
    high: 'Баланд',
    medium: 'Миёна',
    low: 'Паст'
};
let tasks = loadTasks();
let activeFilter = 'all';
let editingId = null;
let toastTimer = null;

function loadTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(t => t && typeof t.id === 'string' && typeof t.title === 'string')
            .map(t => ({
                id: t.id,
                title: t.title,
                category: categoryNames[t.category] ? t.category : 'study',
                priority: priorityNames[t.priority] ? t.priority : 'medium',
                done: Boolean(t.done),
                createdAt: Number(t.createdAt) || Date.now()
            }));
    } catch (error) {
        console.warn('Хондани маълумоти захирашуда имкон нашуд:', error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        showToast('Маълумот захира нашуд. Эҳтимол, хотираи браузер дастнорас аст.');
    }
}

function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } [ch]));
}

function createId() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function addTask(title, category, priority) {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
        showToast('Аввал номи вазифаро навис.');
        $('#taskInput').focus();
        return false;
    }
    tasks.unshift({
        id: createId(),
        title: cleanTitle,
        category,
        priority,
        done: false,
        createdAt: Date.now()
    });
    saveTasks();
    render();
    showToast('Вазифа илова шуд.');
    return true;
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;
    saveTasks();
    render();
    showToast(task.done ? 'Офарин! Вазифа иҷро шуд.' : 'Вазифа ба рӯйхати боқимонда баргашт.');
}

function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
    showToast('Вазифа нест карда шуд.');
}

function openEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    editingId = id;
    $('#editTaskInput').value = task.title;
    $('#editCategory').value = task.category;
    $('#editPriority').value = task.priority;
    $('#editModal').classList.add('open');
    $('#editTaskInput').focus();
}

function closeEdit() {
    editingId = null;
    $('#editModal').classList.remove('open');
}

function saveEdit(event) {
    event.preventDefault();
    const task = tasks.find(t => t.id === editingId);
    if (!task) {
        closeEdit();
        return;
    }
    const title = $('#editTaskInput').value.trim();
    if (!title) {
        showToast('Номи вазифа холӣ буда наметавонад.');
        return;
    }
    task.title = title;
    task.category = $('#editCategory').value;
    task.priority = $('#editPriority').value;
    saveTasks();
    render();
    closeEdit();
    showToast('Тағйирот нигоҳ дошта шуд.');
}

function getVisibleTasks() {
    const query = $('#searchInput').value.trim().toLocaleLowerCase();
    return tasks.filter(t => {
        const matchFilter = activeFilter === 'all' || (activeFilter === 'done' ? t.done : !t.done);
        const matchSearch = t.title.toLocaleLowerCase().includes(query);
        return matchFilter && matchSearch;
    });
}

function render() {
    const list = $('#taskList');
    const visible = getVisibleTasks();
    list.replaceChildren();
    $('#visibleCount').textContent = `${visible.length} вазифа`;
    if (!visible.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        const icon = document.createElement('div');
        icon.className = 'empty-icon';
        icon.textContent = $('#searchInput').value.trim() ? '⌕' : '✦';
        const title = document.createElement('b');
        title.textContent = $('#searchInput').value.trim() ? 'Натиҷа ёфт нашуд' : 'Ҳоло вазифа нест';
        const desc = document.createElement('span');
        desc.textContent = $('#searchInput').value.trim() ? 'Калимаи дигарро ҷустуҷӯ кун.' : 'Вазифаи аввалини худро илова кун ва оғоз намо.';
        empty.append(icon, title, desc);
        list.append(empty);
    } else {
        visible.forEach(task => {
            const article = document.createElement('article');
            article.className = 'task' + (task.done ? ' completed' : '');
            const check = document.createElement('input');
            check.type = 'checkbox';
            check.className = 'check';
            check.checked = task.done;
            check.setAttribute('aria-label', task.done ? 'Баргардонидани вазифа ба интизор' : 'Иҷрошуда қайд кардан');
            check.addEventListener('change', () => toggleTask(task.id));
            const main = document.createElement('div');
            main.className = 'task-main';
            const title = document.createElement('div');
            title.className = 'task-title';
            title.textContent = task.title;
            const meta = document.createElement('div');
            meta.className = 'task-meta';
            const cat = document.createElement('span');
            cat.className = 'tag';
            cat.textContent = categoryNames[task.category];
            const priority = document.createElement('span');
            priority.className = 'tag ' + task.priority;
            priority.textContent = 'Афзалият: ' + priorityNames[task.priority];
            const date = document.createElement('span');
            date.className = 'task-date';
            date.textContent = new Date(task.createdAt).toLocaleDateString('tg-TJ', {
                day: 'numeric',
                month: 'short'
            });
            meta.append(cat, priority, date);
            main.append(title, meta);
            const actions = document.createElement('div');
            actions.className = 'task-actions';
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.textContent = '✎';
            edit.title = 'Таҳрир';
            edit.setAttribute('aria-label', 'Таҳрири ' + task.title);
            edit.addEventListener('click', () => openEdit(task.id));
            const del = document.createElement('button');
            del.type = 'button';
            del.textContent = '×';
            del.title = 'Нест кардан';
            del.className = 'delete';
            del.setAttribute('aria-label', 'Нест кардани ' + task.title);
            del.addEventListener('click', () => deleteTask(task.id));
            actions.append(edit, del);
            article.append(check, main, actions);
            list.append(article);
        });
    }
    const total = tasks.length,
        done = tasks.filter(t => t.done).length,
        pending = total - done,
        percent = total ? Math.round(done / total * 100) : 0;
    $('#totalStat').textContent = total;
    $('#doneStat').textContent = done;
    $('#pendingStat').textContent = pending;
    $('#percentStat').textContent = percent + '%';
    $('#progressText').textContent = percent + '%';
    $('#progressFill').style.width = percent + '%';
    $('#studyCount').textContent = tasks.filter(t => t.category === 'study').length;
    $('#workCount').textContent = tasks.filter(t => t.category === 'work').length;
    $('#personalCount').textContent = tasks.filter(t => t.category === 'personal').length;
    $('#clearDoneBtn').disabled = done === 0;
    $('#clearDoneBtn').title = done === 0 ? 'Ҳоло вазифаи иҷрошуда нест' : 'Нест кардани ' + done + ' вазифаи иҷрошуда';
}

function setFilter(filter) {
    activeFilter = filter;
    document.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === filter));
    render();
}
$('#addForm').addEventListener('submit', event => {
    event.preventDefault();
    const added = addTask($('#taskInput').value, $('#categoryInput').value, $('#priorityInput').value);
    if (added) {
        $('#taskInput').value = '';
        $('#taskInput').focus();
    }
});
$('#filters').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (button) setFilter(button.dataset.filter);
});
$('#searchInput').addEventListener('input', render);
$('#clearDoneBtn').addEventListener('click', () => {
    const count = tasks.filter(t => t.done).length;
    if (!count) return;
    if (!confirm(` ${count} вазифаи иҷрошударо нест мекунӣ?`)) return;
    tasks = tasks.filter(t => !t.done);
    saveTasks();
    render();
    showToast('Вазифаҳои иҷрошуда тоза шуданд.');
});
$('#showPending').addEventListener('click', () => {
    setFilter('pending');
    $('#taskInput').focus();
});
$('#showAll').addEventListener('click', () => setFilter('all'));
$('#editForm').addEventListener('submit', saveEdit);
$('#cancelEdit').addEventListener('click', closeEdit);
$('#editModal').addEventListener('click', event => {
    if (event.target === $('#editModal')) closeEdit();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeEdit();
});
$('#themeBtn').addEventListener('click', () => {
    document.body.classList.toggle('light');
    try {
        localStorage.setItem(THEME_KEY, document.body.classList.contains('light') ? 'light' : 'dark');
    } catch (e) {}
});
try {
    if (localStorage.getItem(THEME_KEY) === 'light') document.body.classList.add('light');
} catch (e) {}
$('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taskflow-tasks.json';
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Файли JSON омода шуд.');
});
$('#demoBtn').addEventListener('click', () => {
    if (tasks.some(t => t.title === 'Такрори JavaScript')) {
        showToast('Мисолҳо аллакай илова шудаанд.');
        return;
    }
    const samples = [{
            title: 'Такрори JavaScript',
            category: 'study',
            priority: 'high',
            done: false
        },
        {
            title: 'Сохтани лоиҳаи HTML ва CSS',
            category: 'work',
            priority: 'medium',
            done: false
        },
        {
            title: '15 дақиқа китоб хондан',
            category: 'personal',
            priority: 'low',
            done: true
        }
    ];
    samples.forEach(t => tasks.push({
        ...t,
        id: createId(),
        createdAt: Date.now()
    }));
    saveTasks();
    render();
    showToast('3 вазифаи намунавӣ илова шуд.');
});
const today = new Date();
$('#todayLabel').textContent = today.toLocaleDateString('tg-TJ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
});
const tips = ['Аввал вазифаи муҳимтаринро интихоб кун. Пас аз анҷом додан, онро ҳамчун иҷрошуда қайд намо.', 'Вазифаи калонро ба қадамҳои хурд ҷудо кун.', 'Ҳар рӯз се ҳадафи асосӣ интихоб кун ва диққататро ба онҳо равона намо.', 'Пас аз анҷоми ҳар вазифа пешрафти худро қадр кун.'];
$('#tipText').textContent = tips[today.getDate() % tips.length];
render();
