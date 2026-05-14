import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";

const Login = () => {
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetData, setResetData] = useState({ email: "", newPassword: "" });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleResetChange = (e) => setResetData({ ...resetData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        try {
            await login(formData.email, formData.password);
        } catch (err) {
            setError(err.response?.data?.message || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        try {
            const { data } = await API.post("/auth/reset-password", resetData);
            setMessage(data.message || "Password reset successfully! You can now login.");
            setIsForgotPassword(false);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h2>{isForgotPassword ? "Reset Password" : "Welcome Back"}</h2>
                <p>{isForgotPassword ? "Enter your email and a new password" : "Login to your account to continue"}</p>

                {error && <div className="error-message">{error}</div>}
                {message && <div style={{ color: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>{message}</div>}

                {!isForgotPassword ? (
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-input-group">
                            <label htmlFor="email">Email</label>
                            <input type="email" id="email" name="email" className="auth-input" placeholder="Enter your email" value={formData.email} onChange={handleChange} required />
                        </div>
                        <div className="auth-input-group">
                            <label htmlFor="password">Password</label>
                            <input type="password" id="password" name="password" className="auth-input" placeholder="Enter your password" value={formData.password} onChange={handleChange} required />
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <button type="button" onClick={() => { setIsForgotPassword(true); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontSize: "0.8rem" }}>
                                Forgot Password?
                            </button>
                        </div>
                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? "Logging in..." : "Login"}
                        </button>
                    </form>
                ) : (
                    <form className="auth-form" onSubmit={handleResetSubmit}>
                        <div className="auth-input-group">
                            <label htmlFor="reset-email">Email</label>
                            <input type="email" id="reset-email" name="email" className="auth-input" placeholder="Enter your email" value={resetData.email} onChange={handleResetChange} required />
                        </div>
                        <div className="auth-input-group">
                            <label htmlFor="reset-password">New Password</label>
                            <input type="password" id="reset-password" name="newPassword" className="auth-input" placeholder="Enter new password" value={resetData.newPassword} onChange={handleResetChange} required />
                        </div>
                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                        <button type="button" onClick={() => setIsForgotPassword(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", marginTop: "0.5rem" }}>
                            Back to Login
                        </button>
                    </form>
                )}

                {!isForgotPassword && (
                    <div className="auth-link">
                        Don't have an account? <Link to="/register">Sign up</Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
