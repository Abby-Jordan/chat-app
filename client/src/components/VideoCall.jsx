import { useEffect, useRef } from 'react'
import { useCall } from '../context/CallContext'

// Renders a single remote participant video/audio tile
const RemoteTile = ({ stream, userName }) => {
    const videoRef = useRef(null)
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])
    return (
        <div style={styles.tile}>
            <video ref={videoRef} autoPlay playsInline style={styles.video} />
            <span style={styles.tileName}>{userName || 'Participant'}</span>
        </div>
    )
}

const VideoCall = () => {
    const { callState, callType, callerName, participants, localVideoRef, endCall, acceptCall, rejectCall } = useCall()

    if (callState === 'idle') return null

    // Incoming call notification
    if (callState === 'incoming') {
        return (
            <div style={styles.incomingOverlay}>
                <div style={styles.incomingBox}>
                    <div style={styles.callIcon}>{callType === 'video' ? '📹' : '📞'}</div>
                    <h3 style={styles.callerText}>{callerName}</h3>
                    <p style={styles.callSubText}>Incoming {callType} call...</p>
                    <div style={styles.callActions}>
                        <button onClick={rejectCall} style={{ ...styles.callBtn, ...styles.rejectBtn }}>✕ Decline</button>
                        <button onClick={acceptCall} style={{ ...styles.callBtn, ...styles.acceptBtn }}>✓ Accept</button>
                    </div>
                </div>
            </div>
        )
    }

    // Calling / in-call UI
    return (
        <div style={styles.callOverlay}>
            {/* Header */}
            <div style={styles.callHeader}>
                <span style={styles.callHeaderTitle}>
                    {callState === 'calling' ? '📡 Calling...' : callType === 'video' ? '📹 Video Call' : '📞 Audio Call'}
                </span>
                <button onClick={endCall} style={styles.endBtn}>📵 End Call</button>
            </div>

            {/* Remote participants grid */}
            <div style={{
                ...styles.videoGrid,
                gridTemplateColumns: participants.length <= 1 ? '1fr' :
                    participants.length <= 4 ? '1fr 1fr' : '1fr 1fr 1fr'
            }}>
                {participants.length === 0 ? (
                    <div style={styles.waitingText}>⏳ Waiting for others to join...</div>
                ) : (
                    participants.map((p) => (
                        <RemoteTile key={p.socketId} stream={p.stream} userName={p.userName} />
                    ))
                )}
            </div>

            {/* Local video (picture-in-picture) */}
            {callType === 'video' && (
                <div style={styles.localVideoContainer}>
                    <video ref={localVideoRef} autoPlay muted playsInline style={styles.localVideo} />
                    <span style={styles.localLabel}>You</span>
                </div>
            )}
        </div>
    )
}

const styles = {
    // Incoming call
    incomingOverlay: {
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
    },
    incomingBox: {
        background: '#1e1e2e', borderRadius: '20px',
        padding: '2.5rem 2rem', textAlign: 'center',
        minWidth: '280px', border: '1px solid #3b3b5c',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    },
    callIcon: { fontSize: '3rem', marginBottom: '1rem' },
    callerText: { fontSize: '1.4rem', color: '#fff', margin: '0 0 0.3rem' },
    callSubText: { color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1.5rem' },
    callActions: { display: 'flex', gap: '1rem', justifyContent: 'center' },
    callBtn: {
        padding: '0.7rem 1.5rem', borderRadius: '50px',
        border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem',
    },
    rejectBtn: { background: '#ef4444', color: '#fff' },
    acceptBtn: { background: '#22c55e', color: '#fff' },

    // In-call overlay
    callOverlay: {
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0f0f1a',
        display: 'flex', flexDirection: 'column',
    },
    callHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        background: 'rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    callHeaderTitle: { color: '#fff', fontWeight: '600', fontSize: '1rem' },
    endBtn: {
        background: '#ef4444', color: '#fff', border: 'none',
        padding: '0.5rem 1.25rem', borderRadius: '50px',
        cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
    },
    videoGrid: {
        flex: 1, display: 'grid', gap: '8px',
        padding: '1rem', alignItems: 'center', justifyItems: 'center',
    },
    tile: {
        position: 'relative', width: '100%', maxHeight: '400px',
        background: '#1e1e2e', borderRadius: '12px', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    tileName: {
        position: 'absolute', bottom: '8px', left: '12px',
        color: '#fff', fontSize: '0.8rem', fontWeight: '600',
        background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '10px',
    },
    waitingText: {
        color: '#94a3b8', fontSize: '1.1rem', textAlign: 'center',
        gridColumn: '1/-1',
    },
    // Local PiP
    localVideoContainer: {
        position: 'absolute', bottom: '24px', right: '24px',
        width: '140px', height: '100px',
        borderRadius: '10px', overflow: 'hidden',
        border: '2px solid #6366f1',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        zIndex: 10,
    },
    localVideo: { width: '100%', height: '100%', objectFit: 'cover' },
    localLabel: {
        position: 'absolute', bottom: '4px', left: '6px',
        color: '#fff', fontSize: '0.7rem',
        background: 'rgba(0,0,0,0.5)', padding: '1px 6px', borderRadius: '8px',
    },
}

export default VideoCall
