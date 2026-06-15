import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import getEcho from '../utils/echo';

/**
 * CallOverlay — WebRTC peer-to-peer voice/video call using Laravel Echo for signaling.
 *
 * Props:
 *  - callState: { active, type, receiverId, receiverNickname, receiverAvatar, isIncoming, callerId, callerNickname, callerAvatar }
 *  - guest: current logged-in guest object
 *  - token: auth token
 *  - onEnd: () => void — called to reset callState in parent
 */

// STUN config — defined at module level to avoid re-creation
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function CallOverlay({ callState, guest, token, onEnd }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting | ringing | active | ended

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);
  const channelRef     = useRef(null);

  // Determine the signal channel name — always use sorted IDs so both ends share the same channel
  const getChannelName = useCallback(() => {
    if (!callState || !guest) return null;
    const otherId = callState.isIncoming ? callState.callerId : callState.receiverId;
    const [a, b] = [guest.id, otherId].sort((x, y) => x - y);
    return `call-signal.${a}.${b}`;
  }, [callState, guest]);

  // ── Setup peer connection ───────────────────────────────
  const setupPeerConnection = useCallback((echo, channelName) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    // Send ICE candidates to the other peer via Echo signal channel
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        echo.private(channelName).whisper('ice-candidate', {
          candidate,
          from: guest.id,
        });
      }
    };

    // When remote track arrives, pipe to remote video element
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setCallStatus('active');
    };

    return pc;
  }, [guest]);

  // ── Get local media ─────────────────────────────────────
  const getLocalMedia = useCallback(async (type) => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video' ? { facingMode: 'user', width: 640, height: 480 } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Media access error:', err);
      alert('Camera/microphone access is required for calls.');
      onEnd();
      return null;
    }
  }, [onEnd]);

  // ── Initiate call (caller side) ─────────────────────────
  const initiateCall = useCallback(async (echo, channelName) => {
    const stream = await getLocalMedia(callState.type);
    if (!stream) return;

    const pc = setupPeerConnection(echo, channelName);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    setCallStatus('ringing');

    // Signal the offer
    echo.private(channelName).whisper('call-offer', {
      offer,
      from: guest.id,
      fromNickname: guest.nickname,
      fromAvatar: guest.avatar_url,
      type: callState.type,
    });
  }, [callState, guest, getLocalMedia, setupPeerConnection]);

  // ── Accept call (callee side) ───────────────────────────
  const acceptCall = useCallback(async (echo, channelName, offer) => {
    const stream = await getLocalMedia(callState.type);
    if (!stream) return;

    const pc = setupPeerConnection(echo, channelName);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    setCallStatus('active');

    echo.private(channelName).whisper('call-answer', {
      answer,
      from: guest.id,
    });
  }, [callState, guest, getLocalMedia, setupPeerConnection]);

  // ── Handle incoming signals ─────────────────────────────
  useEffect(() => {
    if (!callState?.active || !token || !guest) return;

    const echo = getEcho(token);
    if (!echo) return;

    const channelName = getChannelName();
    if (!channelName) return;

    const channel = echo.private(channelName);
    channelRef.current = channelName;

    let pendingOffer = null;

    channel.listenForWhisper('call-offer', async (data) => {
      if (data.from === guest.id) return; // ignore own signal
      if (callState.isIncoming) {
        pendingOffer = data.offer;
      }
    });

    channel.listenForWhisper('call-answer', async (data) => {
      if (data.from === guest.id) return;
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallStatus('active');
      }
    });

    channel.listenForWhisper('ice-candidate', async (data) => {
      if (data.from === guest.id) return;
      try {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (_) {}
    });

    channel.listenForWhisper('call-end', () => {
      setCallStatus('ended');
      endCall(false);
    });

    // Auto-start based on role
    if (!callState.isIncoming) {
      initiateCall(echo, channelName);
    } else if (callState.autoAccept) {
      setCallStatus('connecting');
      // Wait briefly for offer whisper to arrive
      const timer = setTimeout(async () => {
        if (pendingOffer) await acceptCall(echo, channelName, pendingOffer);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [callState?.active]);

  // ── End call cleanup ────────────────────────────────────
  const endCall = useCallback((notify = true) => {
    if (notify && channelRef.current && token) {
      const echo = getEcho(token);
      if (echo) {
        echo.private(channelRef.current).whisper('call-end', { from: guest?.id });
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localVideoRef.current)  localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setCallStatus('ended');
    setTimeout(onEnd, 400);
  }, [guest, token, onEnd]);

  // ── Toggle mute ─────────────────────────────────────────
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  };

  // ── Toggle video ────────────────────────────────────────
  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoOff((prev) => !prev);
  };

  if (!callState?.active) return null;

  const isVideo = callState.type === 'video';
  const otherName = callState.isIncoming ? callState.callerNickname : callState.receiverNickname;
  const otherAvatar = callState.isIncoming ? callState.callerAvatar : callState.receiverAvatar;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-between"
      >
        {/* Video streams */}
        {isVideo && (
          <div className="absolute inset-0 overflow-hidden">
            {/* Remote (full-screen) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Local (pip) */}
            <motion.div
              drag
              dragMomentum={false}
              className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-800 cursor-grab active:cursor-grabbing z-10"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                  <VideoOff size={20} className="text-slate-400" />
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Caller info card */}
        <div className="relative z-10 flex flex-col items-center pt-16 sm:pt-20 px-6 text-center">
          {/* Status label */}
          <span className={`text-xs font-bold uppercase tracking-widest mb-4 px-3 py-1 rounded-full ${
            callStatus === 'active'
              ? 'bg-emerald-500/20 text-emerald-400'
              : callStatus === 'ringing'
              ? 'bg-amber-500/20 text-amber-400 call-pulse'
              : 'bg-slate-500/20 text-slate-400'
          }`}>
            {callStatus === 'active'    ? '● Connected'
            : callStatus === 'ringing'  ? '◎ Ringing…'
            : callStatus === 'ended'    ? 'Call Ended'
            :                            '↺ Connecting…'}
          </span>

          {/* Avatar */}
          <div className="relative mb-3">
            <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-slate-800 ring-4 ${
              callStatus === 'active' ? 'ring-emerald-500/40 online-pulse' : 'ring-white/10'
            } transition-all`}>
              {otherAvatar ? (
                <img src={otherAvatar} alt="caller" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-slate-400">
                  {otherName?.substring(0, 2)?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Call type badge */}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
              {isVideo ? <Video size={14} className="text-white" /> : <Phone size={14} className="text-white" />}
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white mb-1">{otherName}</h2>
          <p className="text-slate-400 text-sm">{isVideo ? 'Video Call' : 'Voice Call'}</p>
        </div>

        {/* Control buttons */}
        <div className="relative z-10 w-full px-6 pb-12 sm:pb-16">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            {/* Mute */}
            <button
              onClick={toggleMute}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-600/80 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* End Call */}
            <button
              onClick={() => endCall(true)}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-2xl shadow-rose-500/40 transition-all scale-100 hover:scale-105 cursor-pointer"
            >
              <PhoneOff size={26} />
            </button>

            {/* Toggle video (only for video calls) */}
            {isVideo ? (
              <button
                onClick={toggleVideo}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isVideoOff
                    ? 'bg-rose-600/80 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16" /> /* spacer */
            )}
          </div>

          <p className="text-center text-[11px] text-slate-500 mt-4">
            {callStatus === 'active' ? 'Drag the small window to reposition' : ''}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * IncomingCallToast — small non-intrusive toast shown when receiving a call request.
 * The caller sends a whisper to the callee's notification channel.
 */
export function IncomingCallToast({ call, onAccept, onDecline }) {
  if (!call) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0,   scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.92 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-[90vw] max-w-sm glass-card rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700/40 px-4 py-3 flex items-center gap-4"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800">
            {call.callerAvatar ? (
              <img src={call.callerAvatar} alt="caller" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-sm">
                {call.callerNickname?.substring(0, 2)?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
            {call.type === 'video'
              ? <Video size={10} className="text-white" />
              : <Phone size={10} className="text-white" />}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Incoming {call.type === 'video' ? 'Video' : 'Voice'} Call</p>
          <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{call.callerNickname}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onDecline}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <PhoneOff size={16} />
          </button>
          <button
            onClick={onAccept}
            className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 transition-all cursor-pointer call-pulse"
          >
            <Phone size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
