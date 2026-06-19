'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const CHUNK_SIZE = 64 * 1024;

// Use only reliable, free STUN servers.
// TURN servers require valid credentials — the free openrelay ones are defunct.
// For production, use your own TURN server (e.g., via Metered.ca, Twilio, or self-hosted coturn).
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

// Timeout for ICE connection establishment (30 seconds)
const ICE_TIMEOUT_MS = 30000;

export default function ReceivePage() {
  const [status, setStatus] = useState('connecting');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [fileCount, setFileCount] = useState({ current: 0, total: 0 });
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [speed, setSpeed] = useState('');

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const chunksRef = useRef([]);
  const metaRef = useRef(null);
  const statusRef = useRef('connecting');
  const iceCandidateQueueRef = useRef([]);
  const iceTimeoutRef = useRef(null);
  const startTimeRef = useRef(null);
  const bytesReceivedRef = useRef(0);

  // Keep statusRef in sync so event handlers always see the latest value
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const cleanup = useCallback(() => {
    if (iceTimeoutRef.current) clearTimeout(iceTimeoutRef.current);
    if (socketRef.current) socketRef.current.disconnect();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (!roomId) {
      setStatus('invalid');
      return;
    }

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Receiver] Socket connected, joining room:', roomId);
      socket.emit('join-room', roomId);
    });

    socket.on('connect_error', (err) => {
      console.error('[Receiver] Socket connection error:', err.message);
      setStatus('error');
      setErrorMsg('Could not connect to server. Please check your internet connection and try again.');
    });

    socket.on('room-not-found', () => {
      console.log('[Receiver] Room not found');
      setStatus('error');
      setErrorMsg('This transfer room does not exist. The sender may have closed their browser or the link has expired.');
    });

    socket.on('joined-as-receiver', () => {
      console.log('[Receiver] Joined room, waiting for offer...');
      setStatus('waiting');

      // Set a timeout — if no offer arrives within 30s, show error
      iceTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'waiting') {
          console.warn('[Receiver] Timed out waiting for offer');
          setStatus('error');
          setErrorMsg('Timed out waiting for sender. The sender may have closed their browser.');
        }
      }, ICE_TIMEOUT_MS);
    });

    socket.on('room-full', () => {
      setStatus('error');
      setErrorMsg('This transfer room is full. Only one receiver is allowed per transfer link.');
    });

    socket.on('offer', async ({ offer }) => {
      try {
        console.log('[Receiver] Received offer, creating PeerConnection...');
        if (iceTimeoutRef.current) clearTimeout(iceTimeoutRef.current);

        // Create PC only once
        if (!pcRef.current) {
          initPC(socket, roomId);
        }

        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));

        // Flush queued ICE candidates that arrived before setRemoteDescription
        console.log(`[Receiver] Flushing ${iceCandidateQueueRef.current.length} queued ICE candidates`);
        for (const candidate of iceCandidateQueueRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[Receiver] Queued ICE candidate error:', e.message);
          }
        }
        iceCandidateQueueRef.current = [];

        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer });
        console.log('[Receiver] Answer sent');
      } catch (err) {
        console.error('[Receiver] Error handling offer:', err);
        setStatus('error');
        setErrorMsg('Failed to establish peer connection. Please try again.');
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (!candidate) return;

      // If remote description isn't set yet, queue the candidate
      if (!pcRef.current || !pcRef.current.remoteDescription) {
        console.log('[Receiver] Queuing ICE candidate (remote description not set yet)');
        iceCandidateQueueRef.current.push(candidate);
        return;
      }

      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[Receiver] ICE candidate error (non-critical):', e.message);
      }
    });

    socket.on('peer-disconnected', () => {
      // Use ref to get current status (avoids stale closure)
      if (statusRef.current !== 'done') {
        setStatus('error');
        setErrorMsg('The sender disconnected before the transfer was completed.');
      }
    });

    return () => cleanup();
  }, [cleanup]);

  function initPC(socket, roomId) {
    if (pcRef.current) {
      console.warn('[Receiver] initPC called but PC already exists, skipping');
      return;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice-candidate', { roomId, candidate: e.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[Receiver] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        // Try ICE restart before giving up
        console.log('[Receiver] ICE failed, attempting restart...');
        pc.restartIce();
      }
      if (pc.iceConnectionState === 'disconnected') {
        // Give it a few seconds to recover before showing error
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected' && statusRef.current !== 'done') {
            setStatus('error');
            setErrorMsg('Connection lost. The sender may have closed their browser.');
          }
        }, 5000);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[Receiver] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('[Receiver] Peer connection established!');
      }
      if (pc.connectionState === 'failed') {
        setStatus('error');
        setErrorMsg('Connection failed. This may be due to network restrictions (firewall/NAT). Try connecting from a different network.');
      }
    };

    pc.ondatachannel = (e) => {
      const dc = e.channel;
      dc.binaryType = 'arraybuffer';

      dc.onopen = () => {
        console.log('[Receiver] Data channel open');
        setStatus('receiving');
        startTimeRef.current = Date.now();
        bytesReceivedRef.current = 0;
      };

      dc.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'meta') {
            metaRef.current = msg;
            chunksRef.current = [];
            bytesReceivedRef.current = 0;
            startTimeRef.current = Date.now();
            setFileName(msg.fileName);
            setFileCount({ current: (msg.fileIndex || 0) + 1, total: msg.totalFiles || 1 });
            setProgress(0);
            console.log('[Receiver] Receiving file:', msg.fileName, 'size:', msg.fileSize);
          }
          if (msg.type === 'file-end') {
            const meta = metaRef.current;
            const blob = new Blob(chunksRef.current, { type: meta?.fileType || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = meta?.fileName || 'download';
            a.click();

            setReceivedFiles(prev => [...prev, {
              name: meta?.fileName || 'download',
              size: meta?.fileSize || 0,
              url
            }]);

            // Check if this is the last file
            const isLastFile = (msg.fileIndex !== undefined && meta?.totalFiles)
              ? (msg.fileIndex + 1) >= meta.totalFiles
              : true;

            if (isLastFile) {
              setStatus('done');
            }

            dc.send(JSON.stringify({ type: 'file-done' }));
            console.log('[Receiver] File received and download triggered');
          }
        } else {
          chunksRef.current.push(ev.data);
          bytesReceivedRef.current += ev.data.byteLength;
          const totalChunks = metaRef.current?.totalChunks || 1;
          const pct = Math.round((chunksRef.current.length / totalChunks) * 100);
          setProgress(Math.min(pct, 100));

          // Calculate speed
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          if (elapsed > 0.5) {
            const spd = bytesReceivedRef.current / elapsed;
            setSpeed(spd > 1024 * 1024
              ? (spd / (1024 * 1024)).toFixed(1) + ' MB/s'
              : (spd / 1024).toFixed(0) + ' KB/s');
          }
        }
      };

      dc.onerror = (err) => {
        console.error('[Receiver] Data channel error:', err);
        if (statusRef.current !== 'done') {
          setStatus('error');
          setErrorMsg('Transfer error occurred. Please try again.');
        }
      };

      dc.onclose = () => {
        console.log('[Receiver] Data channel closed');
        if (statusRef.current === 'receiving') {
          setStatus('error');
          setErrorMsg('Transfer was interrupted. The sender may have closed their browser.');
        }
      };
    };
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
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
            <p className="text-gray-400 mb-1">{fileName}</p>
            {fileCount.total > 1 && (
              <p className="text-gray-500 text-sm mb-3">File {fileCount.current} of {fileCount.total}</p>
            )}
            <div className="bg-gray-800 rounded-full h-3 mb-2">
              <div className="bg-green-600 h-3 rounded-full transition-all duration-300" style={{ width: progress + '%' }}></div>
            </div>
            <div className="flex justify-between text-gray-400 text-sm">
              <span>{progress}%</span>
              {speed && <span>{speed}</span>}
            </div>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {receivedFiles.length > 1 ? 'All Files Received!' : 'File Received!'}
            </h2>
            <p className="text-gray-400 mb-4">Download started automatically</p>
            {receivedFiles.length > 0 && (
              <div className="space-y-2 mb-4">
                {receivedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2">
                    <span className="text-white text-sm truncate mr-2">{f.name}</span>
                    <a href={f.url} download={f.name}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs transition-all whitespace-nowrap">
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {status === 'invalid' && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">Invalid Link</h2>
            <p className="text-gray-400">This transfer link is not valid. Make sure you copied the full URL including the room parameter.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">Connection Error</h2>
            <p className="text-gray-400 mb-6">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
