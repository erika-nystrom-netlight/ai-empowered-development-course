import { VibeKanbanWebCompanion } from 'vibe-kanban-web-companion';

// Todos array (Feature 1)
let todos = [];
let nextId = 1;

// Current filter (Feature 2)
let currentFilter = 'all';

// Undo/redo history
let history = [];
let historyIndex = -1;

// Drag-and-drop state
let dragSrcIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    init();
    initVibeKanban();
});

function init() {
    initDarkMode();

    document.getElementById('addBtn').addEventListener('click', addTodo);
    document.getElementById('todoInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });

    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);

    document.addEventListener('keydown', (e) => {
        const ctrlOrCmd = navigator.platform.toUpperCase().includes('MAC') ? e.metaKey : e.ctrlKey;
        if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (ctrlOrCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    });

    saveToHistory();
    updateUndoRedoButtons();
    renderTodos();
}

function initVibeKanban() {
    const companion = new VibeKanbanWebCompanion();
    companion.render(document.body);
}

// Dark mode
function initDarkMode() {
    const btn = document.getElementById('darkModeBtn');
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
        btn.textContent = 'Light Mode';
    }
    btn.addEventListener('click', toggleDarkMode);
}

function toggleDarkMode() {
    const btn = document.getElementById('darkModeBtn');
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    btn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
}

// Undo/redo
function saveToHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push(JSON.parse(JSON.stringify(todos)));
    historyIndex = history.length - 1;
    updateUndoRedoButtons();
}

function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    todos = JSON.parse(JSON.stringify(history[historyIndex]));
    nextId = todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1;
    updateUndoRedoButtons();
    renderTodos();
}

function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    todos = JSON.parse(JSON.stringify(history[historyIndex]));
    nextId = todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1;
    updateUndoRedoButtons();
    renderTodos();
}

function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = historyIndex <= 0;
    document.getElementById('redoBtn').disabled = historyIndex >= history.length - 1;
}

// Feature 1: Add, toggle, delete todos
function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();

    if (text === '') return;

    saveToHistory();
    todos.push({
        id: nextId++,
        text: text,
        completed: false,
        checklist: [],
        checklistOpen: false,
        nextChecklistId: 1
    });

    input.value = '';
    renderTodos();
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        renderTodos();
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    renderTodos();
}

// Checklist functions
function addChecklistItem(todoId, text) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    saveToHistory();
    todo.checklist.push({ id: todo.nextChecklistId++, text: text, checked: false });
    renderTodos();
}

function toggleChecklistItem(todoId, itemId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    const item = todo.checklist.find(c => c.id === itemId);
    if (!item) return;
    saveToHistory();
    item.checked = !item.checked;
    renderTodos();
}

function deleteChecklistItem(todoId, itemId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    saveToHistory();
    todo.checklist = todo.checklist.filter(c => c.id !== itemId);
    renderTodos();
}

function toggleChecklist(todoId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    todo.checklistOpen = !todo.checklistOpen;
    renderTodos();
}

// Feature 1: Render todos
function renderTodos() {
    const todoList = document.getElementById('todoList');
    const filteredTodos = getFilteredTodos();

    todoList.innerHTML = '';

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        if (todo.completed) li.classList.add('completed');
        li.draggable = true;

        // Top row
        const topRow = document.createElement('div');
        topRow.className = 'todo-top-row';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => { saveToHistory(); toggleTodo(todo.id); });

        const textSpan = document.createElement('span');
        textSpan.className = 'todo-text';
        textSpan.textContent = todo.text;

        const checkedCount = todo.checklist.filter(c => c.checked).length;
        const totalCount = todo.checklist.length;

        const countBadge = document.createElement('span');
        countBadge.className = 'checklist-count';
        countBadge.textContent = `${checkedCount}/${totalCount}`;
        if (totalCount === 0) countBadge.style.display = 'none';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'checklist-toggle-btn';
        toggleBtn.textContent = todo.checklistOpen ? '▲' : '▼';
        toggleBtn.addEventListener('click', () => toggleChecklist(todo.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'todo-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => { saveToHistory(); deleteTodo(todo.id); });

        topRow.appendChild(checkbox);
        topRow.appendChild(textSpan);
        topRow.appendChild(countBadge);
        topRow.appendChild(toggleBtn);
        topRow.appendChild(deleteBtn);

        // Checklist section
        const checklistSection = document.createElement('div');
        checklistSection.className = 'checklist-section';
        if (!todo.checklistOpen) checklistSection.classList.add('hidden');

        todo.checklist.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'checklist-item';

            const itemCheckbox = document.createElement('input');
            itemCheckbox.type = 'checkbox';
            itemCheckbox.checked = item.checked;
            itemCheckbox.addEventListener('change', () => toggleChecklistItem(todo.id, item.id));

            const itemText = document.createElement('span');
            itemText.className = 'checklist-item-text';
            if (item.checked) itemText.classList.add('checked');
            itemText.textContent = item.text;

            const itemDelete = document.createElement('button');
            itemDelete.className = 'checklist-item-delete';
            itemDelete.textContent = '×';
            itemDelete.addEventListener('click', () => deleteChecklistItem(todo.id, item.id));

            itemRow.appendChild(itemCheckbox);
            itemRow.appendChild(itemText);
            itemRow.appendChild(itemDelete);
            checklistSection.appendChild(itemRow);
        });

        // Add checklist item row
        const addRow = document.createElement('div');
        addRow.className = 'checklist-add-row';

        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.className = 'checklist-input';
        addInput.placeholder = 'Add checklist item...';
        addInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && addInput.value.trim()) {
                addChecklistItem(todo.id, addInput.value.trim());
            }
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'checklist-add-btn';
        addBtn.textContent = 'Add';
        addBtn.addEventListener('click', () => {
            if (addInput.value.trim()) {
                addChecklistItem(todo.id, addInput.value.trim());
            }
        });

        addRow.appendChild(addInput);
        addRow.appendChild(addBtn);
        checklistSection.appendChild(addRow);

        li.appendChild(topRow);
        li.appendChild(checklistSection);

        // Drag-and-drop events
        li.addEventListener('dragstart', (e) => {
            dragSrcIndex = todos.indexOf(todo);
            li.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        li.addEventListener('dragend', () => {
            document.querySelectorAll('.todo-item').forEach(el => {
                el.classList.remove('dragging', 'drag-over');
            });
        });

        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            document.querySelectorAll('.todo-item').forEach(el => el.classList.remove('drag-over'));
            li.classList.add('drag-over');
        });

        li.addEventListener('dragleave', () => {
            li.classList.remove('drag-over');
        });

        li.addEventListener('drop', (e) => {
            e.preventDefault();
            const dropIndex = todos.indexOf(todo);
            if (dragSrcIndex === null || dragSrcIndex === dropIndex) return;
            saveToHistory();
            const [moved] = todos.splice(dragSrcIndex, 1);
            todos.splice(dropIndex, 0, moved);
            dragSrcIndex = null;
            renderTodos();
        });

        todoList.appendChild(li);
    });
}

// Feature 2: Filter todos based on current filter
function getFilteredTodos() {
    if (currentFilter === 'active') {
        return todos.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        return todos.filter(t => t.completed);
    }
    return todos; // 'all'
}

// Feature 2: Set filter and update UI
function setFilter(filter) {
    currentFilter = filter;

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });

    renderTodos();
}
