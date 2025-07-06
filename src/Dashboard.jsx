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

    useEffect(() => {
        fetchTasks();
    }, [sortBy]);

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
            // Fallback stats calculation
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(t => t.status === 'done').length;
            const overdueTask = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            setStats({
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                completion_rate: completionRate,
                overdue_tasks: overdueTask
            });
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
            fetchStats();
            setEditingTask(null);
        }
    };

    const deleteTask = async (id) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) console.error(error);
        else {
            fetchTasks();
            fetchStats();
        }
    };

    const saveTaskEdit = () => {
        if (!editingTask.title.trim()) return;
        updateTask(editingTask.id, {
            title: editingTask.title.trim(),
            description: editingTask.description.trim(),
            priority: editingTask.priority,
            category: editingTask.category,
            due_date: editingTask.due_date || null
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const getDueDateStatus = (dueDate) => {
        if (!dueDate) return '';
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'overdue';
        if (diffDays === 0) return 'due-today';
        if (diffDays <= 3) return 'due-soon';
        return '';
    };

    // Filter and sort tasks
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    return (
        <div className="dashboard-container">
            <div className="dashboard-background"></div>

            <div className="dashboard-content">
                {/* Enhanced Header */}
                <header className="dashboard-header">
                    <div className="header-top">
                        <div className="header-title">
                            <img src="/logo.png" alt="TaskFlow" className="dashboard-logo" />
                            <div className="dashboard-title">
                                <h1>TaskFlow</h1>
                            </div>
                        </div>
                        <div className="user-info">
                            <div className="user-avatar">
                                {session.user.email.charAt(0).toUpperCase()}
                            </div>
                            <span>Welcome, {session.user.email.split('@')[0]}</span>
                            <button className="sign-out-btn" onClick={() => supabase.auth.signOut()}>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </header>

                {/* Stats Grid */}
                {stats && (
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
                )}

                {/* Controls Section */}
                <div className="controls-section">
                    <div className="controls-grid">
                        <div className="control-group">
                            <label>Search Tasks</label>
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="enhanced-input"
                            />
                        </div>
                        <div className="control-group">
                            <label>Filter by Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="enhanced-select"
                            >
                                <option value="all">All Status</option>
                                <option value="todo">To Do</option>
                                <option value="ongoing">Ongoing</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        <div className="control-group">
                            <label>Filter by Priority</label>
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="enhanced-select"
                            >
                                <option value="all">All Priorities</option>
                                <option value="high">High Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="low">Low Priority</option>
                            </select>
                        </div>
                        <div className="control-group">
                            <label>Sort by</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="enhanced-select"
                            >
                                <option value="created_at">Date Created</option>
                                <option value="due_date">Due Date</option>
                                <option value="priority">Priority</option>
                                <option value="title">Title</option>
                            </select>
                        </div>
                        <div className="control-group">
                            <label>&nbsp;</label>
                            <div className="action-buttons">
                                <button
                                    className="btn-enhanced"
                                    onClick={() => setShowAnalytics(!showAnalytics)}
                                >
                                    📊 {showAnalytics ? 'Hide' : 'Show'} Analytics
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analytics Panel */}
                {showAnalytics && stats && (
                    <div className="analytics-panel">
                        <div className="analytics-header">
                            <h2 className="analytics-title">Task Analytics Dashboard</h2>
                        </div>
                        <div className="analytics-grid">
                            <div className="chart-container">
                                <h4 className="chart-title">Task Distribution</h4>
                                <div className="chart-placeholder">
                                    <p>📊 Chart visualization would go here</p>
                                    <p>Todo: {filteredTasks.filter(t => t.status === 'todo').length}</p>
                                    <p>Ongoing: {filteredTasks.filter(t => t.status === 'ongoing').length}</p>
                                    <p>Done: {filteredTasks.filter(t => t.status === 'done').length}</p>
                                </div>
                            </div>
                            <div className="chart-container">
                                <h4 className="chart-title">Priority Breakdown</h4>
                                <div className="chart-placeholder">
                                    <p>📈 Priority chart would go here</p>
                                    <p>High: {filteredTasks.filter(t => t.priority === 'high').length}</p>
                                    <p>Medium: {filteredTasks.filter(t => t.priority === 'medium').length}</p>
                                    <p>Low: {filteredTasks.filter(t => t.priority === 'low').length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Task Form */}
                <div className="task-form">
                    <h3>➕ {editingTask ? 'Edit Task' : 'Create New Task'}</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="task-title">Task Title</label>
                            <input
                                id="task-title"
                                type="text"
                                placeholder="Enter task title..."
                                value={editingTask ? editingTask.title : newTask.title}
                                onChange={(e) => editingTask
                                    ? setEditingTask({ ...editingTask, title: e.target.value })
                                    : setNewTask({ ...newTask, title: e.target.value })
                                }
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-description">Description</label>
                            <textarea
                                id="task-description"
                                placeholder="Enter task description..."
                                value={editingTask ? editingTask.description : newTask.description}
                                onChange={(e) => editingTask
                                    ? setEditingTask({ ...editingTask, description: e.target.value })
                                    : setNewTask({ ...newTask, description: e.target.value })
                                }
                                disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-priority">Priority</label>
                            <select
                                id="task-priority"
                                value={editingTask ? editingTask.priority : newTask.priority}
                                onChange={(e) => editingTask
                                    ? setEditingTask({ ...editingTask, priority: e.target.value })
                                    : setNewTask({ ...newTask, priority: e.target.value })
                                }
                                disabled={loading}
                            >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-category">Category</label>
                            <select
                                id="task-category"
                                value={editingTask ? editingTask.category : newTask.category}
                                onChange={(e) => editingTask
                                    ? setEditingTask({ ...editingTask, category: e.target.value })
                                    : setNewTask({ ...newTask, category: e.target.value })
                                }
                                disabled={loading}
                            >
                                {categories.map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-due-date">Due Date</label>
                            <input
                                id="task-due-date"
                                type="date"
                                value={editingTask ? editingTask.due_date : newTask.due_date}
                                onChange={(e) => editingTask
                                    ? setEditingTask({ ...editingTask, due_date: e.target.value })
                                    : setNewTask({ ...newTask, due_date: e.target.value })
                                }
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <div className="form-actions">
                        {editingTask && (
                            <button
                                className="btn-enhanced secondary"
                                onClick={() => setEditingTask(null)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            className="btn-enhanced"
                            onClick={editingTask ? saveTaskEdit : addTask}
                            disabled={loading || (editingTask ? !editingTask.title.trim() : !newTask.title.trim())}
                        >
                            {loading ? '⏳ Saving...' : editingTask ? '💾 Update Task' : '➕ Add Task'}
                        </button>
                    </div>
                </div>

                {/* Tasks Grid */}
                {loading ? (
                    <div className="loading-spinner-container">
                        <div className="loading-spinner-large"></div>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📝</div>
                        <h3>No tasks found</h3>
                        <p>Create your first task to get started with productivity!</p>
                    </div>
                ) : (
                    <div className="tasks-grid">
                        {filteredTasks.map((task) => (
                            <div
                                key={task.id}
                                className="task-card"
                                data-priority={task.priority}
                            >
                                <div className="task-header">
                                    <h3 className="task-title">{task.title}</h3>
                                    <span className={`task-status ${task.status}`}>
                                        {task.status}
                                    </span>
                                </div>

                                {task.description && (
                                    <p className="task-description">{task.description}</p>
                                )}

                                <div className="task-meta">
                                    <div className="task-meta-item">
                                        <span className={`priority-badge priority-${task.priority}`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <div className="task-meta-item">
                                        📂 {task.category}
                                    </div>
                                    {task.due_date && (
                                        <div className="task-meta-item">
                                            📅 {formatDate(task.due_date)}
                                        </div>
                                    )}
                                    {task.completed_at && (
                                        <div className="task-meta-item">
                                            ✅ {formatDate(task.completed_at)}
                                        </div>
                                    )}
                                </div>

                                <div className="task-actions">
                                    <button
                                        onClick={() => setEditingTask(task)}
                                        className="task-btn edit"
                                        title="Edit Task"
                                    >
                                        Edit
                                    </button>
                                    {task.status !== 'done' && (
                                        <button
                                            onClick={() => updateTaskStatus(task.id,
                                                task.status === 'todo' ? 'ongoing' : 'done'
                                            )}
                                            className="task-btn status"
                                            title={task.status === 'todo' ? 'Start Task' : 'Complete Task'}
                                        >
                                            {task.status === 'todo' ? 'Start' : 'Done'}
                                        </button>
                                    )}
                                    {task.status === 'done' && (
                                        <button
                                            onClick={() => updateTaskStatus(task.id, 'ongoing')}
                                            className="task-btn status"
                                            title="Reopen Task"
                                        >
                                            Reopen
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        className="task-btn delete"
                                        title="Delete Task"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
