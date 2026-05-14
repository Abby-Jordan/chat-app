import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export const SocketProvider = ({ children }) => {
    const { token } = useAuth()
    const [socket, setSocket] = useState(null)

    useEffect(() => {
        if (!token) return

        const s = io(import.meta.env.VITE_SERVER_URL, {
            auth: { token }   // sends JWT to the server's socket middleware
        })

        s.on('connect', () => console.log('Socket connected'))
        s.on('connect_error', (err) => console.error('Socket error:', err.message))

        setSocket(s)

        return () => s.disconnect()   // cleanup on logout
    }, [token])

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => useContext(SocketContext)