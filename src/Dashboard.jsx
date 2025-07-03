import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Dashboard({ session }) {
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'medium',
        category: 'personal',
        due_date: ''
    });
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [sortBy, setSortBy] = useState('created_at');
    const [editingTask, setEditingTask] = useState(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session) {
            fetchTasks();
            fetchCategories();
            fetchStats();
            setupRealtimeSubscription();
        }
    }, [session]);

    const setupRealtimeSubscription = () => {
        const channel = supabase
            .channel('tasks-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `user_id=eq.${session.user.id}`
                },
                (payload) => {
                    console.log('Change received!', payload);
                    fetchTasks();
                    fetchStats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const fetchTasks = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order(sortBy, { ascending: sortBy === 'title' });

        if (error) console.error(error);
        else setTasks(data || []);
    };

    const fetchCategories = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id);

        if (error) console.error(error);
        else setCategories(data || []);
    };

    const fetchStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.rpc('get_task_stats', {
                user_uuid: user.id
            });

            if (error) console.error('Stats error:', error);
            else setStats(data);
        } catch (error) {
            console.error('Stats fetch error:', error);
        }
    };

    const addTask = async () => {
        if (!newTask.title.trim()) return;

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('tasks').insert([
            {
                title: newTask.title.trim(),
                description: newTask.description.trim(),
                priority: newTask.priority,
                category: newTask.category,
                due_date: newTask.due_date || null,
                status: 'todo',
                user_id: user.id,
            },
        ]);

        if (error) console.error(error);
        else {
            setNewTask({
                title: '',
                description: '',
                priority: 'medium',
                category: 'personal',
                due_date: ''
            });
            fetchTasks();
            fetchStats();
        }
        setLoading(false);
    };

    const updateTaskStatus = async (id, newStatus) => {
        const updates = {
            status: newStatus,
            completed_at: newStatus === 'done' ? new Date().toISOString() : null
        };

        const { error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', id);

        if (error) console.error(error);
        else {
            fetchTasks();
            fetchStats();
        }
    };

    const updateTask = async (taskId, updates) => {
        const { error } = await supabase
            .from('tasks')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', taskId);

        if (error) console.error(error);
        else {
            fetchTasks();
            setEditingTask(null);
        }
    };

    const deleteTask = async (id) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);

        if (error) console.error(error);
        else {
            fetchTasks();
            fetchStats();
        }
    };

    const addCategory = async (name, color) => {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('categories').insert([
            { name, color, user_id: user.id }
        ]);

        if (error) console.error(error);
        else fetchCategories();
    };

    // Filter and sort tasks
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
        return matchesSearch && matchesStatus && matchesPriority;
    });

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'var(--danger-500)';
            case 'high': return 'var(--warning-600)';
            case 'medium': return 'var(--primary-500)';
            case 'low': return 'var(--success-500)';
            default: return 'var(--gray-500)';
        }
    };

    const getDueDateStatus = (dueDate) => {
        if (!dueDate) return '';
        const today = new Date();
        const due = new Date(dueDate);
        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'overdue';
        if (diffDays <= 1) return 'due-soon';
        return 'due-later';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="user-info">
                        <h2>Welcome, {session.user.email}</h2>
                        <div className="header-actions">
                            <button
                                className="analytics-btn"
                                onClick={() => setShowAnalytics(!showAnalytics)}
                            >
                                📊 Analytics
                            </button>
                            <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {showAnalytics && stats && (
                <div className="analytics-section">
                    <div className="analytics-container">
                        <h3>Task Analytics</h3>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-value">{stats.total_tasks}</div>
                                <div className="stat-label">Total Tasks</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{stats.completion_rate}%</div>
                                <div className="stat-label">Completion Rate</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{stats.completed_tasks}</div>
                                <div className="stat-label">Completed</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{stats.overdue_tasks}</div>
                                <div className="stat-label">Overdue</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="filters-section">
                <div className="filters-container">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="filter-controls">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Status</option>
                            <option value="todo">To Do</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="done">Done</option>
                        </select>
                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Priority</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="filter-select"
                        >
                            <option value="created_at">Date Created</option>
                            <option value="due_date">Due Date</option>
                            <option value="priority">Priority</option>
                            <option value="title">Title</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="add-task-section">
                <div className="add-task-form">
                    <div className="task-form-row">
                        <input
                            type="text"
                            placeholder="Task title..."
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            className="task-input"
                        />
                        <textarea
                            placeholder="Task description (optional)..."
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            className="task-textarea"
                            rows="2"
                        />
                    </div>
                    <div className="task-form-row">
                        <select
                            value={newTask.priority}
                            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                            className="task-select"
                        >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                            <option value="urgent">Urgent</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Category"
                            value={newTask.category}
                            onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                            className="task-input"
                        />
                        <input
                            type="date"
                            value={newTask.due_date}
                            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                            className="task-input"
                        />
                        <button
                            onClick={addTask}
                            className="add-btn"
                            disabled={!newTask.title.trim() || loading}
                        >
                            {loading ? 'Adding...' : 'Add Task'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="tasks-section">
                <div className="tasks-grid">
                    <div className="task-column">
                        <h3 className="column-title todo">
                            To Do ({filteredTasks.filter(task => task.status === 'todo').length})
                        </h3>
                        <div className="task-list">
                            {filteredTasks.filter(task => task.status === 'todo').map((task) => (
                                <div key={task.id} className={`task-card todo ${getDueDateStatus(task.due_date)}`}>
                                    <div className="task-header">
                                        <div className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}></div>
                                        <span className="task-category">{task.category}</span>
                                        {task.due_date && (
                                            <span className={`task-due-date ${getDueDateStatus(task.due_date)}`}>
                                                {formatDate(task.due_date)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="task-content">
                                        <h4 className="task-title">{task.title}</h4>
                                        {task.description && (
                                            <p className="task-description">{task.description}</p>
                                        )}
                                    </div>
                                    <div className="task-actions">
                                        <button
                                            onClick={() => setEditingTask(task)}
                                            className="edit-btn"
                                            title="Edit Task"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => updateTaskStatus(task.id, 'ongoing')}
                                            className="status-btn ongoing"
                                            title="Mark as Ongoing"
                                        >
                                            ▶️
                                        </button>
                                        <button
                                            onClick={() => updateTaskStatus(task.id, 'done')}
                                            className="status-btn done"
                                            title="Mark as Done"
                                        >
                                            ✅
                                        </button>
                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            className="delete-btn"
                                            title="Delete Task"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="task-column">
                        <h3 className="column-title ongoing">
                            Ongoing ({filteredTasks.filter(task => task.status === 'ongoing').length})
                        </h3>
                        <div className="task-list">
                            {filteredTasks.filter(task => task.status === 'ongoing').map((task) => (
                                <div key={task.id} className={`task-card ongoing ${getDueDateStatus(task.due_date)}`}>
                                    <div className="task-header">
                                        <div className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}></div>
                                        <span className="task-category">{task.category}</span>
                                        {task.due_date && (
                                            <span className={`task-due-date ${getDueDateStatus(task.due_date)}`}>
                                                {formatDate(task.due_date)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="task-content">
                                        <h4 className="task-title">{task.title}</h4>
                                        {task.description && (
                                            <p className="task-description">{task.description}</p>
                                        )}
                                    </div>
                                    <div className="task-actions">
                                        <button
                                            onClick={() => setEditingTask(task)}
                                            className="edit-btn"
                                            title="Edit Task"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => updateTaskStatus(task.id, 'todo')}
                                            className="status-btn todo"
                                            title="Move to Todo"
                                        >
                                            ⬅️
                                        </button>
                                        <button
                                            onClick={() => updateTaskStatus(task.id, 'done')}
                                            className="status-btn done"
                                            title="Mark as Done"
                                        >
                                            ✅
                                        </button>
                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            className="delete-btn"
                                            title="Delete Task"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="task-column">
                        <h3 className="column-title done">
                            Done ({filteredTasks.filter(task => task.status === 'done').length})
                        </h3>
                        <div className="task-list">
                            {filteredTasks.filter(task => task.status === 'done').map((task) => (
                                <div key={task.id} className="task-card done">
                                    <div className="task-header">
                                        <div className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}></div>
                                        <span className="task-category">{task.category}</span>
                                        {task.completed_at && (
                                            <span className="task-completed-date">
                                                ✓ {formatDate(task.completed_at)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="task-content">
                                        <h4 className="task-title">{task.title}</h4>
                                        {task.description && (
                                            <p className="task-description">{task.description}</p>
                                        )}
                                    </div>
                                    <div className="task-actions">
                                        <button
                                            onClick={() => updateTaskStatus(task.id, 'ongoing')}
                                            className="status-btn ongoing"
                                            title="Move to Ongoing"
                                        >
                                            ↩️
                                        </button>
                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            className="delete-btn"
                                            title="Delete Task"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {editingTask && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Edit Task</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            updateTask(editingTask.id, {
                                title: editingTask.title,
                                description: editingTask.description,
                                priority: editingTask.priority,
                                category: editingTask.category,
                                due_date: editingTask.due_date
                            });
                        }}>
                            <input
                                type="text"
                                value={editingTask.title}
                                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                className="modal-input"
                                placeholder="Task title"
                                required
                            />
                            <textarea
                                value={editingTask.description || ''}
                                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                className="modal-textarea"
                                placeholder="Task description"
                                rows="3"
                            />
                            <select
                                value={editingTask.priority}
                                onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                                className="modal-select"
                            >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                                <option value="urgent">Urgent</option>
                            </select>
                            <input
                                type="text"
                                value={editingTask.category}
                                onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                                className="modal-input"
                                placeholder="Category"
                            />
                            <input
                                type="date"
                                value={editingTask.due_date || ''}
                                onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                                className="modal-input"
                            />
                            <div className="modal-actions">
                                <button type="submit" className="save-btn">Save Changes</button>
                                <button type="button" onClick={() => setEditingTask(null)} className="cancel-btn">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
