import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedInfo = JSON.parse(storedUser);
            setUser(parsedInfo);
            setToken(parsedInfo.token);
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const { data } = await API.post("/auth/login", { email, password });
        localStorage.setItem("user", JSON.stringify(data));
        setUser(data);
        setToken(data.token);
        return data;
    };

    const register = async (name, email, password) => {
        const { data } = await API.post("/auth/register", { name, email, password });
        localStorage.setItem("user", JSON.stringify(data));
        setUser(data);
        setToken(data.token);
        return data;
    };

    const logout = () => {
        localStorage.removeItem("user");
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
