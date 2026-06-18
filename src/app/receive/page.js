'use client';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const CHUNK_SIZE = 64 * 1024;
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
  ]
};

export default function ReceivePage() {
  const [status, setStatus] = useState('connecting');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const chunksRef = useRef([]);
  const metaRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (!roomId) { setStatus('invalid'); return; }

    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Receiver] Socket connected, joining room:', roomId);
      socket.emit('join-room', roomId);
    });

    socket.on('connect_error', (err) => {
      console.error('[Receiver] Socket connection error:', err.message);
      setStatus('error');
      setErrorMsg('Could not connect to server. Please try again.');
    });

    socket.on('joined-as-receiver', () => {
      console.log('[Receiver] Joined room, waiting for offer...');
      setStatus('waiting');
      // Do NOT call initPC here — wait for the offer to arrive
      // This prevents a race condition where two PeerConnections get created
    });

    socket.on('room-full', () => {
      setStatus('error');
      setErrorMsg('This transfer room is full. Only one receiver is allowed.');
    });

    socket.on('offer', async ({ offer }) => {
      try {
        console.log('[Receiver] Received offer, creating PeerConnection...');
        // Create PC only once — this is the single entry point
        if (!pcRef.current) {
          initPC(socket, roomId);
        }
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer });
        console.log('[Receiver] Answer sent');
      } catch (err) {
        console.error('[Receiver] Error handling offer:', err);
        setStatus('error');
        setErrorMsg('Failed to establish connection. Please try again.');
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {
          console.warn('[Receiver] ICE candidate error (non-critical):', e.message);
        }
      }
    });

    socket.on('peer-disconnected', () => {
      if (status !== 'done') {
        setStatus('error');
        setErrorMsg('Sender disconnected before the transfer completed.');
      }
    });

    return () => {
      socket.disconnect();
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  function initPC(socket, roomId) {
    // Prevent double-init
    if (pcRef.current) {
      console.warn('[Receiver] initPC called but PC already exists, skipping');
      return;
    }
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('ice-candidate', { roomId, candidate: e.candidate });
    };

    pc.onconnectionstatechange = () => {
      console.log('[Receiver] Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed') {
        setStatus('error');
        setErrorMsg('Connection failed. The sender may have closed their browser.');
      }
    };

    pc.ondatachannel = (e) => {
      const dc = e.channel;
      dc.binaryType = 'arraybuffer';
      
      dc.onopen = () => {
        console.log('[Receiver] Data channel open');
        setStatus('receiving');
      };
      
      dc.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'meta') {
            metaRef.current = msg;
            chunksRef.current = [];
            setFileName(msg.fileName);
            console.log('[Receiver] Receiving file:', msg.fileName, 'size:', msg.fileSize);
          }
          if (msg.type === 'file-end') {
            const blob = new Blob(chunksRef.current, { type: metaRef.current.fileType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = metaRef.current.fileName;
            a.click();
            setDone(true);
            setStatus('done');
            dc.send(JSON.stringify({ type: 'file-done' }));
            console.log('[Receiver] File received and download triggered');
          }
        } else {
          chunksRef.current.push(ev.data);
          const pct = Math.round((chunksRef.current.length / (metaRef.current?.totalChunks || 1)) * 100);
          setProgress(pct);
        }
      };

      dc.onerror = (err) => {
        console.error('[Receiver] Data channel error:', err);
        setStatus('error');
        setErrorMsg('Transfer error. Please try again.');
      };
    };
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-2xl">⚡</span>
        </div>
        {status === 'connecting' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2">Connecting...</h2>
            <p className="text-gray-400 mb-4">Establishing connection to sender</p>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 mx-auto mt-4"></div>
          </>
        )}
        {status === 'waiting' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Receive</h2>
            <p className="text-gray-400">Waiting for sender to start transfer...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500 mx-auto mt-4"></div>
          </>
        )}
        {status === 'receiving' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2">Receiving...</h2>
            <p className="text-gray-400 mb-4">{fileName}</p>
            <div className="bg-gray-800 rounded-full h-3 mb-2">
              <div className="bg-green-600 h-3 rounded-full transition-all" style={{width: progress+'%'}}></div>
            </div>
            <p className="text-gray-400 text-sm">{progress}%</p>
          </>
        )}
        {status === 'done' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-2">File Received!</h2>
            <p className="text-gray-400">Download started automatically</p>
          </>
        )}
        {status === 'invalid' && (
          <>
            <h2 className="text-2xl font-bold text-red-400 mb-2">Invalid Link</h2>
            <p className="text-gray-400">This transfer link is not valid. Make sure you copied the full URL.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">Connection Error</h2>
            <p className="text-gray-400">{errorMsg}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
