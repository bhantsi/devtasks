-- Enhanced Database Schema for Task Manager
-- Run these commands in your Supabase SQL Editor

-- 1. Enhance tasks table with new columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'personal';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6b7280',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, user_id)
);

-- 3. Create task_attachments table for future file uploads
CREATE TABLE IF NOT EXISTS task_attachments (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for tasks table
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "Users can view own tasks" ON tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks
    FOR DELETE USING (auth.uid() = user_id);

-- 7. Create RLS policies for categories table
DROP POLICY IF EXISTS "Users can manage own categories" ON categories;

CREATE POLICY "Users can manage own categories" ON categories
    FOR ALL USING (auth.uid() = user_id);

-- 8. Create RLS policies for task_attachments table
DROP POLICY IF EXISTS "Users can manage attachments for own tasks" ON task_attachments;

CREATE POLICY "Users can manage attachments for own tasks" ON task_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_attachments.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

-- 9. Create function to get task statistics
CREATE OR REPLACE FUNCTION get_task_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_tasks', COUNT(*),
        'completed_tasks', COUNT(*) FILTER (WHERE status = 'done'),
        'ongoing_tasks', COUNT(*) FILTER (WHERE status = 'ongoing'),
        'todo_tasks', COUNT(*) FILTER (WHERE status = 'todo'),
        'overdue_tasks', COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'done'),
        'tasks_by_priority', json_build_object(
            'urgent', COUNT(*) FILTER (WHERE priority = 'urgent'),
            'high', COUNT(*) FILTER (WHERE priority = 'high'),
            'medium', COUNT(*) FILTER (WHERE priority = 'medium'),
            'low', COUNT(*) FILTER (WHERE priority = 'low')
        ),
        'tasks_by_category', (
            SELECT json_object_agg(category, task_count)
            FROM (
                SELECT category, COUNT(*) as task_count
                FROM tasks
                WHERE user_id = user_uuid
                GROUP BY category
            ) cat_counts
        ),
        'completion_rate', 
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'done')::NUMERIC / COUNT(*)) * 100, 2)
            ELSE 0 
        END,
        'productivity_this_week', (
            SELECT COUNT(*)
            FROM tasks
            WHERE user_id = user_uuid
            AND completed_at >= DATE_TRUNC('week', NOW())
            AND status = 'done'
        ),
        'upcoming_due_tasks', (
            SELECT COUNT(*)
            FROM tasks
            WHERE user_id = user_uuid
            AND due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
            AND status != 'done'
        )
    ) INTO result
    FROM tasks
    WHERE user_id = user_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to update task updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Insert some default categories for new users (optional)
CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO categories (name, color, user_id) VALUES
        ('Personal', '#22c55e', NEW.id),
        ('Work', '#3b82f6', NEW.id),
        ('Shopping', '#f59e0b', NEW.id),
        ('Health', '#ef4444', NEW.id)
    ON CONFLICT (name, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create trigger to add default categories for new users
DROP TRIGGER IF EXISTS create_user_default_categories ON auth.users;
CREATE TRIGGER create_user_default_categories
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_categories();

-- 14. Create function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(user_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'tasks_created_last_n_days', (
            SELECT COUNT(*)
            FROM tasks
            WHERE user_id = user_uuid
            AND created_at >= NOW() - INTERVAL '1 day' * days_back
        ),
        'tasks_completed_last_n_days', (
            SELECT COUNT(*)
            FROM tasks
            WHERE user_id = user_uuid
            AND completed_at >= NOW() - INTERVAL '1 day' * days_back
            AND status = 'done'
        ),
        'average_completion_time_hours', (
            SELECT ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600), 2)
            FROM tasks
            WHERE user_id = user_uuid
            AND completed_at IS NOT NULL
            AND created_at >= NOW() - INTERVAL '1 day' * days_back
        ),
        'most_productive_day', (
            SELECT TO_CHAR(DATE_TRUNC('day', completed_at), 'Day')
            FROM tasks
            WHERE user_id = user_uuid
            AND completed_at >= NOW() - INTERVAL '1 day' * days_back
            AND status = 'done'
            GROUP BY DATE_TRUNC('day', completed_at)
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ),
        'busiest_category', (
            SELECT category
            FROM tasks
            WHERE user_id = user_uuid
            AND created_at >= NOW() - INTERVAL '1 day' * days_back
            GROUP BY category
            ORDER BY COUNT(*) DESC
            LIMIT 1
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
