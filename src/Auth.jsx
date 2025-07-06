import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('signin'); // 'signin', 'signup', 'reset'

    const handleSignIn = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage('Successfully signed in!');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            console.error('Sign in error:', err);
        }

        setLoading(false);
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password
            });

            if (error) {
                setError(error.message);
            } else if (data?.user && !data.session) {
                setMessage('Please check your email and click the confirmation link to complete your signup.');
            } else if (data?.session) {
                setMessage('Account created successfully!');
            }
        } catch (err) {
            setError('Failed to create account. Please try again.');
            console.error('Sign up error:', err);
        }

        setLoading(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(true);
        setError('');
        setMessage('');

        if (!email.trim()) {
            setError('Please enter your email address');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                setError(error.message);
            } else {
                setMessage('Password reset link has been sent to your email!');
                setMode('signin');
            }
        } catch (err) {
            setError('Failed to send reset email. Please try again.');
            console.error('Reset password error:', err);
        }

        setLoading(false);
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setError('');
        setMessage('');
        setEmail('');
        setPassword('');
    };

    return (
        <div className="auth-container">
            <div className="auth-background">
                <div className="floating-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                    <div className="shape shape-4"></div>
                </div>
            </div>

            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo-container">
                        <img src="/logo.png" alt="TaskFlow" className="logo" />
                        <h1>TaskFlow</h1>
                    </div>
                    <p className="auth-subtitle">
                        {mode === 'signin' && 'Welcome back! Sign in to your account'}
                        {mode === 'signup' && 'Create your account to get started'}
                        {mode === 'reset' && 'Reset your password'}
                    </p>
                </div>

                {error && (
                    <div className="message error-message">
                        <span className="message-icon">⚠️</span>
                        {error}
                    </div>
                )}

                {message && (
                    <div className="message success-message">
                        <span className="message-icon">✅</span>
                        {message}
                    </div>
                )}

                <form className="auth-form" onSubmit={
                    mode === 'signin' ? handleSignIn :
                        mode === 'signup' ? handleSignUp :
                            handleResetPassword
                }>
                    <div className="input-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>

                    {mode !== 'reset' && (
                        <div className="input-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                                minLength={6}
                            />
                        </div>
                    )}

                    <div className="auth-actions">
                        {mode === 'signin' && (
                            <>
                                <button
                                    type="submit"
                                    disabled={loading || !email || !password}
                                    className="btn-primary"
                                >
                                    {loading ? (
                                        <span className="loading-content">
                                            <span className="spinner"></span>
                                            Signing In...
                                        </span>
                                    ) : 'Sign In'}
                                </button>

                                <div className="auth-links">
                                    <button
                                        type="button"
                                        onClick={() => switchMode('reset')}
                                        className="link-button"
                                        disabled={loading}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                <div className="auth-switch">
                                    <span>Don't have an account?</span>
                                    <button
                                        type="button"
                                        onClick={() => switchMode('signup')}
                                        className="link-button"
                                        disabled={loading}
                                    >
                                        Sign Up
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === 'signup' && (
                            <>
                                <button
                                    type="submit"
                                    disabled={loading || !email || !password}
                                    className="btn-primary"
                                >
                                    {loading ? (
                                        <span className="loading-content">
                                            <span className="spinner"></span>
                                            Creating Account...
                                        </span>
                                    ) : 'Create Account'}
                                </button>

                                <div className="auth-switch">
                                    <span>Already have an account?</span>
                                    <button
                                        type="button"
                                        onClick={() => switchMode('signin')}
                                        className="link-button"
                                        disabled={loading}
                                    >
                                        Sign In
                                    </button>
                                </div>
                            </>
                        )}

                        {mode === 'reset' && (
                            <>
                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    className="btn-primary"
                                >
                                    {loading ? (
                                        <span className="loading-content">
                                            <span className="spinner"></span>
                                            Sending Reset Link...
                                        </span>
                                    ) : 'Send Reset Link'}
                                </button>

                                <div className="auth-switch">
                                    <button
                                        type="button"
                                        onClick={() => switchMode('signin')}
                                        className="link-button"
                                        disabled={loading}
                                    >
                                        ← Back to Sign In
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </form>

                <div className="auth-footer">
                    <p>Secure • Fast • Reliable</p>
                </div>
            </div>
        </div>
    );
}
