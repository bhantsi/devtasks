import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const signIn = async () => {
        setLoading(true);
        setError('');
        setMessage('');

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
        }

        setLoading(false);
    };

    const signUp = async () => {
        setLoading(true);
        setError('');
        setMessage('');

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            setError(error.message);
        } else if (data?.user && !data.session) {
            setMessage('Please check your email and click the confirmation link to complete your signup.');
        } else if (data?.session) {
            setMessage('Account created successfully!');
        }

        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Task Manager</h2>
                <p className="auth-subtitle">Sign in to manage your tasks</p>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="success-message">
                        {message}
                    </div>
                )}

                <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
                    <div className="input-group">
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            className="auth-input"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            className="auth-input"
                            required
                        />
                    </div>
                    <div className="button-group">
                        <button
                            type="button"
                            onClick={signIn}
                            disabled={loading || !email || !password}
                            className="auth-btn primary"
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                        <button
                            type="button"
                            onClick={signUp}
                            disabled={loading || !email || !password}
                            className="auth-btn secondary"
                        >
                            {loading ? 'Signing Up...' : 'Sign Up'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
