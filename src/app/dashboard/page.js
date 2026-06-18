'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Link from 'next/link';

const CHUNK_SIZE = 64 * 1024;
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeView, setActiveView] = useState('home');
  const [files, setFiles] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [transferStatus, setTransferStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState('0 MB/s');
  const [receiveLink, setReceiveLink] = useState('');
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const receivedChunksRef = useRef([]);
  const currentFileMetaRef = useRef(null);
  const startTimeRef = useRef(null);
  const bytesSentRef = useRef(0);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase() +
           Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  function initSocket() {
    if (socketRef.current) socketRef.current.disconnect();
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    const socket = io();
    socketRef.current = socket;
    return socket;
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  // ---- SENDER ----
  function startSending() {
    if (files.length === 0) return;
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    const link = `${window.location.origin}/receive?room=${newRoomId}`;
    setShareLink(link);
    setShowPopup(true);
    setTransferStatus('waiting');
    setConnectionStatus('Waiting for receiver to open the link...');

    const socket = initSocket();

    socket.on('connect', () => {
      console.log('[Sender] Socket connected, creating room:', newRoomId);
      socket.emit('create-room', newRoomId);
    });

    socket.on('connect_error', (err) => {
      console.error('[Sender] Socket error:', err);
      setConnectionStatus('Connection error. Please refresh and try again.');
    });

    socket.on('receiver-joined', () => {
      console.log('[Sender] Receiver joined!');
      setConnectionStatus('Receiver connected! Starting transfer...');
      setTransferStatus('connected');
      startWebRTCSender(socket, newRoomId);
    });

    socket.on('answer', async ({ answer }) => {
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('[Sender] Error setting answer:', err);
        }
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
      }
    });

    socket.on('peer-disconnected', () => {
      if (transferStatus !== 'done') {
        setConnectionStatus('Receiver disconnected.');
      }
    });
  }

  async function startWebRTCSender(socket, rId) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('ice-candidate', { roomId: rId, candidate: e.candidate });
    };

    pc.onconnectionstatechange = () => {
      console.log('[Sender] Connection state:', pc.connectionState);
    };

    const dataChannel = pc.createDataChannel('fileTransfer', { ordered: true });
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log('[Sender] Data channel open, starting file transfer');
      setConnectionStatus('Connected! Transferring...');
      setTransferStatus('transferring');
      setShowPopup(false);
      startTimeRef.current = Date.now();
      bytesSentRef.current = 0;
      sendAllFiles(dataChannel);
    };

    dataChannel.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'file-done') {
        console.log('[Sender] Transfer complete!');
        setTransferStatus('done');
        setConnectionStatus('Transfer complete!');
        setProgress(100);
        setShowPopup(false);
      }
    };

    dataChannel.onerror = (err) => {
      console.error('[Sender] Data channel error:', err);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { roomId: rId, offer });
  }

  async function sendAllFiles(dataChannel) {
    let totalSize = files.reduce((a, f) => a + f.size, 0);
    let totalSent = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      dataChannel.send(JSON.stringify({
        type: 'meta',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        totalChunks,
        fileIndex: i,
        totalFiles: files.length
      }));

      for (let chunk = 0; chunk < totalChunks; chunk++) {
        while (dataChannel.bufferedAmount > 1024 * 1024) {
          await new Promise(r => setTimeout(r, 50));
        }
        const start = chunk * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const data = await file.slice(start, end).arrayBuffer();
        dataChannel.send(data);
        totalSent += (end - start);
        bytesSentRef.current = totalSent;

        const pct = Math.round((totalSent / totalSize) * 100);
        setProgress(pct);

        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed > 0) {
          const spd = totalSent / elapsed;
          setSpeed(spd > 1024 * 1024 ? (spd / (1024 * 1024)).toFixed(2) + ' MB/s' : (spd / 1024).toFixed(1) + ' KB/s');
        }
      }

      dataChannel.send(JSON.stringify({ type: 'file-end', fileIndex: i }));
    }
  }

  // ---- RECEIVER ----
  function startReceiving() {
    if (!receiveLink) return;
    let rId;
    try {
      const url = new URL(receiveLink);
      rId = url.searchParams.get('room');
    } catch (e) {
      alert('Invalid link! Please paste a valid transfer URL.');
      return;
    }
    if (!rId) { alert('Invalid link! No room ID found.'); return; }

    setTransferStatus('connecting');
    setConnectionStatus('Connecting to sender...');

    const socket = initSocket();

    socket.on('connect', () => {
      socket.emit('join-room', rId);
    });

    socket.on('joined-as-receiver', () => {
      setConnectionStatus('Connected! Waiting for files...');
    });

    socket.on('offer', async ({ offer }) => {
      try {
        if (!pcRef.current) initReceiverPC(socket, rId);
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('answer', { roomId: rId, answer });
      } catch (err) {
        console.error('[Dashboard Receiver] Error handling offer:', err);
        setConnectionStatus('Failed to establish connection.');
        setTransferStatus('idle');
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
      }
    });

    socket.on('room-full', () => {
      setConnectionStatus('Room is full. Only one receiver allowed.');
      setTransferStatus('idle');
    });

    socket.on('peer-disconnected', () => {
      if (transferStatus !== 'done') {
        setConnectionStatus('Sender disconnected.');
      }
    });
  }

  function initReceiverPC(socket, rId) {
    if (pcRef.current) return;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('ice-candidate', { roomId: rId, candidate: e.candidate });
    };

    pc.ondatachannel = (e) => {
      const dataChannel = e.channel;
      dataChannel.binaryType = 'arraybuffer';

      dataChannel.onopen = () => {
        setConnectionStatus('Receiving files...');
        setTransferStatus('transferring');
        startTimeRef.current = Date.now();
      };

      dataChannel.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'meta') {
            currentFileMetaRef.current = msg;
            receivedChunksRef.current = [];
            setConnectionStatus(`Receiving: ${msg.fileName}`);
          }
          if (msg.type === 'file-end') {
            reconstructFile();
            dataChannel.send(JSON.stringify({ type: 'file-done' }));
          }
        } else {
          receivedChunksRef.current.push(ev.data);
          const received = receivedChunksRef.current.length;
          const total = currentFileMetaRef.current?.totalChunks || 1;
          setProgress(Math.round((received / total) * 100));
        }
      };
    };
  }

  function reconstructFile() {
    const meta = currentFileMetaRef.current;
    const blob = new Blob(receivedChunksRef.current, { type: meta.fileType });
    const url = URL.createObjectURL(blob);
    setReceivedFiles(prev => [...prev, { name: meta.fileName, size: meta.fileSize, url }]);
    setTransferStatus('done');
    setConnectionStatus('File received!');

    const a = document.createElement('a');
    a.href = url;
    a.download = meta.fileName;
    a.click();
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function resetSender() {
    if (socketRef.current) socketRef.current.disconnect();
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    setTransferStatus('idle');
    setFiles([]);
    setProgress(0);
    setShareLink('');
    setShowPopup(false);
    setSpeed('0 MB/s');
    setLinkCopied(false);
  }

  function resetReceiver() {
    if (socketRef.current) socketRef.current.disconnect();
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    setTransferStatus('idle');
    setReceivedFiles([]);
    setProgress(0);
    setReceiveLink('');
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Popup Warning */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-yellow-500 rounded-2xl p-8 max-w-md text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-3">Do Not Close This Window!</h2>
            <p className="text-gray-400 mb-6">Keep this window open until the transfer is complete. Closing it will cancel the transfer.</p>
            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-gray-400 text-sm mb-2">Share this link with receiver:</p>
              <p className="text-blue-400 text-sm break-all font-mono">{shareLink}</p>
            </div>
            <button onClick={() => copyToClipboard(shareLink)}
              className={`px-6 py-2 rounded-lg transition-all ${linkCopied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
              {linkCopied ? '✓ Copied!' : 'Copy Link'}
            </button>
            <button onClick={() => setShowPopup(false)}
              className="block mx-auto mt-3 text-gray-500 hover:text-gray-300 text-sm transition-all">
              Close this popup
            </button>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">⚡</span>
            </div>
            <span className="text-white font-bold text-xl">P2P Transfer</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">Welcome, <span className="text-white font-medium">{session?.user?.name}</span></span>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-all">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* HOME */}
        {activeView === 'home' && (
          <>
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-400">Choose what you want to do today</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button onClick={() => { setActiveView('send'); resetSender(); }}
                className="bg-gray-900 border border-gray-800 hover:border-blue-500 rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 group">
                <div className="w-14 h-14 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition-all">
                  <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Send Files</h2>
                <p className="text-gray-400 text-sm">Share files directly to anyone, anywhere</p>
              </button>

              <button onClick={() => { setActiveView('receive'); resetReceiver(); }}
                className="bg-gray-900 border border-gray-800 hover:border-green-500 rounded-2xl p-8 text-left transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 group">
                <div className="w-14 h-14 bg-green-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-600/30 transition-all">
                  <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Receive Files</h2>
                <p className="text-gray-400 text-sm">Enter a transfer link to receive files</p>
              </button>
            </div>
          </>
        )}

        {/* SEND */}
        {activeView === 'send' && (
          <div>
            <button onClick={() => { resetSender(); setActiveView('home'); }} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition-all">
              ← Back
            </button>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Send Files</h2>

              {transferStatus === 'idle' && (
                <>
                  <div
                    onClick={() => document.getElementById('fileInput').click()}
                    className="border-2 border-dashed border-gray-700 rounded-xl p-12 text-center hover:border-blue-500 transition-all cursor-pointer mb-6">
                    <div className="text-5xl mb-4">📁</div>
                    <p className="text-white font-medium mb-2">Drop files here or click to select</p>
                    <p className="text-gray-400 text-sm">Any file type, any size — multiple files supported</p>
                    <input id="fileInput" type="file" multiple className="hidden"
                      onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} />
                  </div>

                  {files.length > 0 && (
                    <div className="mb-6 space-y-2">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                          <span className="text-white text-sm">{f.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-sm">{formatSize(f.size)}</span>
                            <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">✕</button>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => document.getElementById('fileInput').click()}
                        className="text-blue-400 hover:text-blue-300 text-sm mt-2">+ Add More Files</button>
                    </div>
                  )}

                  <button onClick={startSending} disabled={files.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all">
                    Generate Transfer Link
                  </button>
                </>
              )}

              {(transferStatus === 'waiting' || transferStatus === 'connected' || transferStatus === 'transferring') && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-white font-medium mb-2">{connectionStatus}</p>
                  {transferStatus === 'transferring' && (
                    <>
                      <div className="bg-gray-800 rounded-full h-3 mt-6 mb-2">
                        <div className="bg-blue-600 h-3 rounded-full transition-all" style={{ width: progress + '%' }}></div>
                      </div>
                      <p className="text-gray-400 text-sm">{progress}% — {speed}</p>
                    </>
                  )}
                  {shareLink && (
                    <div className="mt-6 bg-gray-800 rounded-xl p-4">
                      <p className="text-gray-400 text-sm mb-2">Share this link:</p>
                      <p className="text-blue-400 text-sm break-all font-mono">{shareLink}</p>
                      <button onClick={() => copyToClipboard(shareLink)}
                        className={`mt-3 px-4 py-2 rounded-lg text-sm transition-all ${linkCopied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                        {linkCopied ? '✓ Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {transferStatus === 'done' && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Transfer Complete!</h3>
                  <p className="text-gray-400 mb-6">All files sent successfully</p>
                  <button onClick={resetSender}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all">
                    Send More Files
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RECEIVE */}
        {activeView === 'receive' && (
          <div>
            <button onClick={() => { resetReceiver(); setActiveView('home'); }} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition-all">
              ← Back
            </button>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Receive Files</h2>

              {transferStatus === 'idle' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Enter Transfer Link</label>
                    <input type="text" placeholder="Paste your transfer link here..."
                      value={receiveLink}
                      onChange={(e) => setReceiveLink(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:outline-none focus:border-green-500" />
                  </div>
                  <button onClick={startReceiving} disabled={!receiveLink}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all">
                    Start Receiving
                  </button>
                </div>
              )}

              {(transferStatus === 'connecting' || transferStatus === 'transferring') && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-white font-medium mb-4">{connectionStatus}</p>
                  {transferStatus === 'transferring' && (
                    <>
                      <div className="bg-gray-800 rounded-full h-3 mt-4 mb-2">
                        <div className="bg-green-600 h-3 rounded-full transition-all" style={{ width: progress + '%' }}></div>
                      </div>
                      <p className="text-gray-400 text-sm">{progress}%</p>
                    </>
                  )}
                </div>
              )}

              {transferStatus === 'done' && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Files Received!</h3>
                  <p className="text-gray-400 mb-6">Download started automatically</p>
                  <div className="space-y-3 mb-6">
                    {receivedFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                        <span className="text-white text-sm">{f.name}</span>
                        <a href={f.url} download={f.name} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition-all">
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                  <button onClick={resetReceiver}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-all">
                    Receive More Files
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
