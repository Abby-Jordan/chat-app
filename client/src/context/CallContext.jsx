import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { useSocket } from './SocketContext'
import { useAuth } from './AuthContext'
import SimplePeer from 'simple-peer'

const CallContext = createContext()

export const CallProvider = ({ children }) => {
    const { socket } = useSocket()
    const { user } = useAuth()

    // Call state
    const [callState, setCallState] = useState('idle') // idle | incoming | calling | in-call
    const [callType, setCallType] = useState('video')  // 'video' | 'audio'
    const [callRoomId, setCallRoomId] = useState(null)
    const [callerName, setCallerName] = useState('')
    const [callerId, setCallerId] = useState(null)
    const [participants, setParticipants] = useState([]) // [{ userId, userName, stream }]

    // Refs
    const localStreamRef = useRef(null)
    const peersRef = useRef({})  // { socketId: SimplePeer }
    const localVideoRef = useRef(null)

    // ── Helpers ─────────────────────────────────────────────────────────

    const getLocalStream = useCallback(async (video = true) => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video,
            audio: true,
        })
        localStreamRef.current = stream
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
        return stream
    }, [])

    const createPeer = useCallback((targetSocketId, stream, initiator) => {
        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream,
        })

        peer.on('signal', (data) => {
            if (data.type === 'offer') {
                socket.emit('send_offer', {
                    to: targetSocketId,
                    offer: data,
                    from: socket.id,
                    fromName: user?.name,
                })
            } else if (data.type === 'answer') {
                socket.emit('send_answer', {
                    to: targetSocketId,
                    answer: data,
                    from: socket.id,
                })
            } else {
                socket.emit('send_ice_candidate', {
                    to: targetSocketId,
                    candidate: data,
                    from: socket.id,
                })
            }
        })

        peer.on('stream', (remoteStream) => {
            setParticipants(prev => {
                const exists = prev.find(p => p.socketId === targetSocketId)
                if (exists) {
                    return prev.map(p => p.socketId === targetSocketId ? { ...p, stream: remoteStream } : p)
                }
                return [...prev, { socketId: targetSocketId, stream: remoteStream }]
            })
        })

        peer.on('error', (err) => console.error('Peer error', err))

        peersRef.current[targetSocketId] = peer
        return peer
    }, [socket, user])

    const cleanupCall = useCallback(() => {
        // Stop local stream tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop())
            localStreamRef.current = null
        }
        // Destroy all peer connections
        Object.values(peersRef.current).forEach(p => p.destroy())
        peersRef.current = {}
        setParticipants([])
        setCallState('idle')
        setCallRoomId(null)
        setCallerName('')
        setCallerId(null)
    }, [])

    // ── Actions ─────────────────────────────────────────────────────────

    const startCall = useCallback(async (roomId, type = 'video') => {
        try {
            const stream = await getLocalStream(type === 'video')
            setCallType(type)
            setCallRoomId(roomId)
            setCallState('calling')

            socket.emit('call_room', {
                roomId,
                callType: type,
                callerName: user?.name,
                callerId: socket.id,
            })

            socket.emit('join_call', {
                roomId,
                userId: socket.id,
                userName: user?.name,
            })
        } catch (err) {
            console.error('Failed to start call:', err)
            alert('Could not access camera/microphone.')
            cleanupCall()
        }
    }, [socket, user, getLocalStream, cleanupCall])

    const acceptCall = useCallback(async () => {
        try {
            const stream = await getLocalStream(callType === 'video')
            setCallState('in-call')

            socket.emit('join_call', {
                roomId: callRoomId,
                userId: socket.id,
                userName: user?.name,
            })
        } catch (err) {
            console.error('Failed to accept call:', err)
            alert('Could not access camera/microphone.')
            cleanupCall()
        }
    }, [socket, user, callRoomId, callType, getLocalStream, cleanupCall])

    const rejectCall = useCallback(() => {
        socket.emit('reject_call', { roomId: callRoomId })
        cleanupCall()
    }, [socket, callRoomId, cleanupCall])

    const endCall = useCallback(() => {
        socket.emit('end_call', { roomId: callRoomId })
        cleanupCall()
    }, [socket, callRoomId, cleanupCall])

    // ── Socket event listeners ───────────────────────────────────────────

    useEffect(() => {
        if (!socket) return

        socket.on('incoming_call', ({ roomId, callType: type, callerName: name, callerId: cid }) => {
            setCallRoomId(roomId)
            setCallType(type)
            setCallerName(name)
            setCallerId(cid)
            setCallState('incoming')
        })

        socket.on('user_joined_call', async ({ userId, userName }) => {
            // New participant joined — initiate peer as the initiator side
            if (localStreamRef.current && !peersRef.current[userId]) {
                const peer = createPeer(userId, localStreamRef.current, true)
                setParticipants(prev => {
                    if (prev.find(p => p.socketId === userId)) return prev
                    return [...prev, { socketId: userId, userName, stream: null }]
                })
            }
            setCallState('in-call')
        })

        socket.on('receive_offer', ({ offer, from, fromName }) => {
            if (!localStreamRef.current) return
            const peer = createPeer(from, localStreamRef.current, false)
            peer.signal(offer)
            setParticipants(prev => {
                if (prev.find(p => p.socketId === from)) return prev
                return [...prev, { socketId: from, userName: fromName, stream: null }]
            })
        })

        socket.on('receive_answer', ({ answer, from }) => {
            const peer = peersRef.current[from]
            if (peer) peer.signal(answer)
        })

        socket.on('receive_ice_candidate', ({ candidate, from }) => {
            const peer = peersRef.current[from]
            if (peer) peer.signal(candidate)
        })

        socket.on('call_ended', () => {
            cleanupCall()
        })

        socket.on('call_rejected', () => {
            cleanupCall()
        })

        return () => {
            socket.off('incoming_call')
            socket.off('user_joined_call')
            socket.off('receive_offer')
            socket.off('receive_answer')
            socket.off('receive_ice_candidate')
            socket.off('call_ended')
            socket.off('call_rejected')
        }
    }, [socket, createPeer, cleanupCall])

    return (
        <CallContext.Provider value={{
            callState, callType, callRoomId, callerName, callerId,
            participants, localVideoRef, localStreamRef,
            startCall, acceptCall, rejectCall, endCall,
        }}>
            {children}
        </CallContext.Provider>
    )
}

export const useCall = () => useContext(CallContext)
