import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Users, Shield, MessageSquare, AlertCircle, Plus, Mic, Paperclip, X, Volume2, Check, Menu, Lock, EyeOff, Clock, UserPlus, MessageCircle, ChevronLeft, Phone, Video, PhoneOff } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useChatStore from '../store/useChatStore';
import useDirectMessageStore from '../store/useDirectMessageStore';
import getEcho from '../utils/echo';
import OnlineUsers from '../components/OnlineUsers';
import CallOverlay, { IncomingCallToast } from '../components/CallOverlay';

// Helper to format message time
const formatMsgTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function Chat() {
  const { guest, token, viewedGuestProfile } = useAuthStore();
  const { 
    messages, 
    onlineUsers, 
    typingUsers, 
    groups,
    activeGroupId,
    fetchMessages, 
    fetchGroups,
    createGroup,
    joinGroup,
    setActiveGroupId,
    sendMessage, 
    addMessage, 
    setOnlineUsers, 
    addOnlineUser, 
    removeOnlineUser, 
    setUserTyping,
    loading,
    error,
    pendingRequests,
    fetchPendingRequests,
    resolveRequest
  } = useChatStore();

  const {
    conversations,
    activeChatReceiverId,
    messages: dmMessages,
    conversationsLoading,
    messagesLoading: dmMessagesLoading,
    dmError,
    fetchConversations,
    fetchMessages: fetchDmMessages,
    sendMessage: sendDirectMessage,
    addIncomingMessage,
    setActiveChatReceiverId,
  } = useDirectMessageStore();

  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupVisibility, setNewGroupVisibility] = useState('public');
  const [newGroupPasscode, setNewGroupPasscode] = useState('');

  // Passcode join states
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeValue, setPasscodeValue] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [pendingJoinGroupId, setPendingJoinGroupId] = useState(null);

  // Private request join states
  const [showRequestConfirmModal, setShowRequestConfirmModal] = useState(false);
  const [pendingRequestGroupId, setPendingRequestGroupId] = useState(null);

  // Sidebar tab states
  const [activeRightTab, setActiveRightTab] = useState('members');
  const [activeLeftTab, setActiveLeftTab] = useState('channels'); // channels or dms

  // Mobile drawers states
  const [showMobileRooms, setShowMobileRooms] = useState(false);
  const [showMobileMembers, setShowMobileMembers] = useState(false);

  // Call states
  const [callState, setCallState]       = useState(null); // null = no call
  const [incomingCall, setIncomingCall] = useState(null); // { callerId, callerNickname, callerAvatar, type, offer }

  // Media states
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState(null); // 'image' or 'video'
  const [uploading, setUploading] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch initial group list and chat logs
  useEffect(() => {
    fetchGroups();
    if (!activeChatReceiverId) {
      fetchMessages();
    }
  }, [fetchGroups, fetchMessages, activeGroupId, activeChatReceiverId]);

  // Fetch DM conversations on mount
  useEffect(() => {
    if (guest) {
      fetchConversations();
    }
  }, [guest, fetchConversations]);

  // When navigating to Chat from a profile modal, auto-open the DM
  useEffect(() => {
    if (activeChatReceiverId && activeLeftTab !== 'dms') {
      setActiveLeftTab('dms');
    }
  }, [activeChatReceiverId]);

  // Handle auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, dmMessages, typingUsers]);

  // Setup Pusher real-time bindings via Laravel Echo based on active room
  useEffect(() => {
    const echo = getEcho(token);
    if (!echo) return;

    const channelName = activeGroupId ? `group-chat.${activeGroupId}` : 'chat';

    const channel = echo.join(channelName)
      .here((users) => {
        setOnlineUsers(users);
      })
      .joining((user) => {
        addOnlineUser(user);
      })
      .leaving((user) => {
        removeOnlineUser(user.id);
      })
      .listen('ChatMessageSent', (data) => {
        addMessage(data);
      })
      .listenForWhisper('typing', (data) => {
        setUserTyping(data.userId, data.nickname, data.isTyping);
      });

    return () => {
      echo.leave(channelName);
    };
  }, [token, activeGroupId, setOnlineUsers, addOnlineUser, removeOnlineUser, addMessage, setUserTyping]);

  // Subscribe to private direct-chat channel for incoming DMs + call signals
  useEffect(() => {
    if (!token || !guest) return;
    const echo = getEcho(token);
    if (!echo) return;

    const dmChannelName = `direct-chat.${guest.id}`;
    echo.private(dmChannelName)
      .listen('DirectMessageSent', (data) => {
        addIncomingMessage(data);
      })
      .listenForWhisper('incoming-call', (data) => {
        // data: { callerId, callerNickname, callerAvatar, type }
        if (data.callerId === guest.id) return;
        setIncomingCall(data);
      });

    return () => {
      echo.leave(dmChannelName);
    };
  }, [token, guest, addIncomingMessage]);

  // ── Call handlers ──────────────────────────────────────────────
  const startCall = useCallback((type) => {
    if (!activeChatReceiverId) return;

    const echo = getEcho(token);
    if (!echo) return;

    // Look up recipient directly from store state to avoid forward reference
    const recipient = conversations.find((c) => c.id === activeChatReceiverId);

    // Notify receiver via their DM channel
    echo.private(`direct-chat.${activeChatReceiverId}`)
      .whisper('incoming-call', {
        callerId: guest.id,
        callerNickname: guest.nickname,
        callerAvatar: guest.avatar_url,
        type,
      });

    setCallState({
      active: true,
      type,
      receiverId: activeChatReceiverId,
      receiverNickname: recipient?.nickname,
      receiverAvatar: recipient?.avatar_url,
      isIncoming: false,
    });
  }, [activeChatReceiverId, conversations, guest, token]);

  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    setCallState({
      active: true,
      type: incomingCall.type,
      callerId: incomingCall.callerId,
      callerNickname: incomingCall.callerNickname,
      callerAvatar: incomingCall.callerAvatar,
      receiverId: incomingCall.callerId,
      receiverNickname: incomingCall.callerNickname,
      receiverAvatar: incomingCall.callerAvatar,
      isIncoming: true,
      autoAccept: true,
    });
    setIncomingCall(null);
  }, [incomingCall]);

  const declineIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const handleCallEnd = useCallback(() => {
    setCallState(null);
  }, []);

  // Recording timer effect
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingSeconds(0);
    }

    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  // Format recording seconds (e.g. 0:05)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle typing indicators
  const handleTextChange = (e) => {
    setText(e.target.value);

    const echo = getEcho(token);
    if (!echo) return;

    const channelName = activeGroupId ? `group-chat.${activeGroupId}` : 'chat';

    if (!isTyping) {
      setIsTyping(true);
      echo.join(channelName).whisper('typing', {
        userId: guest.id,
        nickname: guest.nickname,
        isTyping: true,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      echo.join(channelName).whisper('typing', {
        userId: guest.id,
        nickname: guest.nickname,
        isTyping: false,
      });
    }, 2000);
  };

  // Submit standard text or media message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !selectedFile) return;

    setUploading(true);
    const messageContent = text;
    const fileToSend = selectedFile;
    const typeToSend = fileType;

    // Reset input states immediately
    setText('');
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);

    if (activeChatReceiverId) {
      // Route to Direct Message
      await sendDirectMessage(messageContent, fileToSend, typeToSend);
    } else {
      // Route to Group / Global Chat
      const echo = getEcho(token);
      const channelName = activeGroupId ? `group-chat.${activeGroupId}` : 'chat';
      if (echo && isTyping) {
        setIsTyping(false);
        echo.join(channelName).whisper('typing', {
          userId: guest.id,
          nickname: guest.nickname,
          isTyping: false,
        });
      }
      await sendMessage(messageContent, fileToSend, typeToSend);
    }

    setUploading(false);
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const voiceFile = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });

        setUploading(true);
        if (activeChatReceiverId) {
          await sendDirectMessage('', voiceFile, 'voice');
        } else {
          await sendMessage('', voiceFile, 'voice');
        }
        setUploading(false);

        // Stop all tracks on the stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied', err);
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // File attachments pickers
  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('File size exceeds the 20MB limit.');
      return;
    }

    setSelectedFile(file);
    
    // Determine type
    const isVideo = file.type.includes('video');
    setFileType(isVideo ? 'video' : 'image');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const isCreatorOfActiveGroup = activeGroup && activeGroup.is_creator;
  const showModerationTab = isCreatorOfActiveGroup && activeGroup.type === 'private';

  useEffect(() => {
    if (activeGroupId && isCreatorOfActiveGroup && activeGroup.type === 'private') {
      fetchPendingRequests(activeGroupId);
    }
  }, [activeGroupId, activeGroup, isCreatorOfActiveGroup, fetchPendingRequests]);

  // Switch chat room
  const handleRoomSelect = async (groupId) => {
    if (groupId === activeGroupId) return;
    
    if (groupId === null) {
      setActiveGroupId(null);
      return;
    }

    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // If already a member or creator, activate right away
    if (group.is_member || group.is_creator) {
      setActiveGroupId(groupId);
      return;
    }

    // Otherwise, trigger join prompt based on type
    if (group.type === 'protected') {
      setPendingJoinGroupId(groupId);
      setPasscodeValue('');
      setPasscodeError('');
      setShowPasscodeModal(true);
    } else if (group.type === 'private') {
      if (group.request_status === 'pending') {
        alert('Your request to join this group is pending approval from the creator.');
      } else if (group.request_status === 'rejected') {
        alert('Your request to join this group was rejected by the creator.');
      } else {
        setPendingRequestGroupId(groupId);
        setShowRequestConfirmModal(true);
      }
    } else {
      // Public group
      const res = await joinGroup(groupId);
      if (res.success) {
        setActiveGroupId(groupId);
      } else {
        alert(res.error || 'Failed to join group.');
      }
    }
  };

  // Submit passcode
  const handlePasscodeSubmit = async (e) => {
    e.preventDefault();
    if (!passcodeValue.trim() || !pendingJoinGroupId) return;

    setPasscodeError('');
    const res = await joinGroup(pendingJoinGroupId, passcodeValue);
    if (res.success) {
      setShowPasscodeModal(false);
      setActiveGroupId(pendingJoinGroupId);
      setPendingJoinGroupId(null);
    } else {
      setPasscodeError(res.error || 'Invalid passcode.');
    }
  };

  // Submit join request
  const handleRequestConfirmSubmit = async () => {
    if (!pendingRequestGroupId) return;

    const res = await joinGroup(pendingRequestGroupId);
    setShowRequestConfirmModal(false);
    setPendingRequestGroupId(null);
    if (res.success) {
      alert(res.message || 'Join request submitted for creator approval.');
    } else {
      alert(res.error || 'Failed to submit request.');
    }
  };

  // Create group chat handler
  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const group = await createGroup(newGroupName, newGroupVisibility, newGroupPasscode);
    if (group) {
      setNewGroupName('');
      setNewGroupVisibility('public');
      setNewGroupPasscode('');
      setShowCreateModal(false);
      // Automatically enter new group
      setActiveGroupId(group.id);
    }
  };

  const activeRoomName = activeChatReceiverId
    ? (conversations.find((c) => c.id === activeChatReceiverId)?.nickname || 'Direct Message')
    : activeGroupId
      ? groups.find((g) => g.id === activeGroupId)?.name || 'Group Chat'
      : 'Global Room';

  const activeDmRecipient = activeChatReceiverId
    ? conversations.find((c) => c.id === activeChatReceiverId)
    : null;

  const typingList = Object.values(typingUsers);

  const renderRightSidebarContents = () => {
    if (!showModerationTab) {
      return (
        <div className="flex flex-col space-y-4 h-full">
          <h3 className="font-bold text-slate-800 dark:text-slate-105 text-sm flex items-center gap-2 text-left">
            <Users size={16} className="text-indigo-500" />
            Online Users ({onlineUsers.length})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {onlineUsers.map((user) => {
              const isSelf = user.id === guest?.id;
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                    isSelf 
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold uppercase text-[9px] text-slate-550 shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.nickname?.substring(0, 2)
                    )}
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-350 truncate flex-1 text-left">
                    {user.nickname} {isSelf && '(You)'}
                  </span>
                  {user.is_admin && (
                    <Shield size={12} className="text-indigo-505 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-4 h-full">
        {/* Tab Header */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-1">
          <button
            onClick={() => setActiveRightTab('members')}
            className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
              activeRightTab === 'members'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`}
          >
            Members ({onlineUsers.length})
          </button>
          <button
            onClick={() => setActiveRightTab('requests')}
            className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer relative ${
              activeRightTab === 'requests'
                ? 'border-indigo-600 text-indigo-605 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 right-2 bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-0 text-left">
          {activeRightTab === 'members' ? (
            <div className="space-y-2">
              {onlineUsers.map((user) => {
                const isSelf = user.id === guest?.id;
                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                      isSelf 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold uppercase text-[9px] text-slate-500 shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        user.nickname?.substring(0, 2)
                      )}
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-350 truncate flex-1">
                      {user.nickname} {isSelf && '(You)'}
                    </span>
                    {user.is_admin && (
                      <Shield size={12} className="text-indigo-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.length > 0 ? (
                pendingRequests.map((req) => (
                  <div key={req.id} className="p-3 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-205 dark:border-slate-800/50 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-850 flex items-center justify-center font-bold uppercase text-[9px] text-slate-500 shrink-0">
                        {req.guest?.avatar_url ? (
                          <img src={req.guest.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          req.guest?.nickname?.substring(0, 2)
                        )}
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate flex-1">
                        {req.guest?.nickname}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveRequest(activeGroupId, req.id, 'approved')}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check size={10} /> Approve
                      </button>
                      <button
                        onClick={() => resolveRequest(activeGroupId, req.id, 'rejected')}
                        className="flex-1 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-300 text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <X size={10} /> Reject
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 space-y-1">
                  <Clock size={20} className="stroke-1" />
                  <p className="text-[10px] font-bold">No pending requests.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)] max-w-6xl mx-auto relative">

      {/* Sidebar: Left Panel (Desktop - 3 Cols) */}
      <div className="hidden md:flex md:col-span-1 lg:col-span-3 flex-col glass-card rounded-3xl overflow-hidden border border-white/20 h-full">
        
        {/* Tab Header: Channels / DMs */}
        <div className="flex border-b border-slate-200/60 dark:border-slate-800/60 bg-white/20 dark:bg-slate-900/20">
          <button
            onClick={() => setActiveLeftTab('channels')}
            className={`flex-1 py-3 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeLeftTab === 'channels'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <MessageSquare size={13} /> Channels
          </button>
          <button
            onClick={() => setActiveLeftTab('dms')}
            className={`flex-1 py-3 text-[11px] font-bold flex items-center justify-center gap-1.5 relative transition-colors border-b-2 ${
              activeLeftTab === 'dms'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <MessageCircle size={13} /> Messages
            {conversations.some((c) => (c.unread_count || 0) > 0) && (
              <span className="absolute top-2 right-5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Channels Tab Content */}
        {activeLeftTab === 'channels' && (
          <div className="flex flex-col flex-1 overflow-hidden p-4 space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500">Rooms</span>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 cursor-pointer transition-colors"
                title="Create group chat"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {/* Global Channel */}
              <button
                onClick={() => { setActiveChatReceiverId(null); handleRoomSelect(null); }}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-all cursor-pointer flex justify-between items-center ${
                  activeGroupId === null && !activeChatReceiverId
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/15'
                    : 'bg-white/40 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="text-xs truncate">🌎 Global Room</span>
              </button>
              {/* User Created Channels */}
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => { setActiveChatReceiverId(null); handleRoomSelect(group.id); }}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-all cursor-pointer flex justify-between items-center ${
                    activeGroupId === group.id && !activeChatReceiverId
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/15'
                      : 'bg-white/40 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs truncate">💬 {group.name}</span>
                    {!group.is_member && !group.is_creator && (
                      group.type === 'protected' ? (
                        <Lock size={10} className={activeGroupId === group.id ? 'text-white/70' : 'text-slate-400'} />
                      ) : group.type === 'private' ? (
                        group.request_status === 'pending' ? (
                          <Clock size={10} className="text-amber-500 animate-pulse" />
                        ) : (
                          <EyeOff size={10} className={activeGroupId === group.id ? 'text-white/70' : 'text-slate-400'} />
                        )
                      ) : null
                    )}
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${
                    activeGroupId === group.id && !activeChatReceiverId ? 'bg-white/20 text-white' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {group.members_count || 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DMs Tab Content */}
        {activeLeftTab === 'dms' && (
          <div className="flex flex-col flex-1 overflow-hidden p-4 space-y-3">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500 px-1">Direct Messages</span>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {conversationsLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-600 space-y-2">
                  <MessageCircle size={28} className="stroke-1" />
                  <p className="text-[10px] font-bold text-center">No conversations yet.<br/>Click a user's name to start chatting.</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = activeChatReceiverId === conv.id;
                  const unread = conv.unread_count || 0;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => fetchDmMessages(conv.id)}
                      className={`w-full text-left px-3 py-3 rounded-2xl transition-all cursor-pointer flex items-center gap-3 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/15'
                          : 'bg-white/40 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold uppercase text-slate-500 shrink-0 relative">
                        {conv.avatar_url ? (
                          <img src={conv.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          conv.nickname?.substring(0, 2)
                        )}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-xs font-bold truncate ${
                          isActive ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                        }`}>{conv.nickname}</p>
                        {conv.last_message && (
                          <p className={`text-[10px] truncate mt-0.5 ${
                            isActive ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {conv.last_message.content || (conv.last_message.media_type === 'image' ? '📷 Photo' : conv.last_message.media_type === 'video' ? '🎥 Video' : '🎤 Voice note')}
                          </p>
                        )}
                      </div>
                      {/* Unread Badge */}
                      {unread > 0 && !isActive && (
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shrink-0 animate-bounce">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Messages Pane (Desktop - 6 Cols, Mobile - Full Width) */}
      <div className="md:col-span-3 lg:col-span-6 flex flex-col glass-card rounded-3xl overflow-hidden border border-white/20 h-full">
        {/* Chat Pane Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Channels Toggle Button */}
            <button
              onClick={() => setShowMobileRooms(true)}
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
            >
              <Menu size={18} />
            </button>

            {/* Avatar / Icon in Header */}
            {activeChatReceiverId && activeDmRecipient ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 uppercase shrink-0 relative">
                {activeDmRecipient.avatar_url ? (
                  <img src={activeDmRecipient.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  activeDmRecipient.nickname?.substring(0, 2)
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                #
              </div>
            )}

            <div className="min-w-0">
              <h1 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[8rem] sm:max-w-[12rem] md:max-w-[15rem]">
                {activeRoomName}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                {activeChatReceiverId ? (
                  <><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Private Chat</>
                ) : (
                  <><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" /> {onlineUsers.length} online</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Voice & Video call buttons — DM mode only */}
            {activeChatReceiverId && (
              <>
                <button
                  onClick={() => startCall('voice')}
                  title="Voice Call"
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 cursor-pointer transition-all hover:scale-105"
                >
                  <Phone size={16} />
                </button>
                <button
                  onClick={() => startCall('video')}
                  title="Video Call"
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30 cursor-pointer transition-all hover:scale-105"
                >
                  <Video size={16} />
                </button>
                <button
                  onClick={() => { setActiveChatReceiverId(null); setActiveLeftTab('channels'); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                >
                  <ChevronLeft size={14} />
                  <span className="hidden sm:inline">Back</span>
                </button>
              </>
            )}
            {/* Mobile/Tablet Members List Toggle Button (only for group/global chats) */}
            {!activeChatReceiverId && (
              <button
                onClick={() => setShowMobileMembers(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
              >
                <Users size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* ---- DM Mode ---- */}
          {activeChatReceiverId ? (
            dmError ? (
              <div className="h-full flex flex-col items-center justify-center text-rose-500 space-y-2">
                <AlertCircle size={40} className="stroke-1 animate-bounce" />
                <p className="text-sm font-bold">{dmError}</p>
              </div>
            ) : dmMessagesLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : dmMessages.length > 0 ? (
              dmMessages.map((msg) => {
                const msgAuthor = msg.sender || msg.guest;
                const isOwn = msgAuthor?.id === guest?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwn && (
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 uppercase select-none shrink-0">
                        {msgAuthor?.avatar_url ? (
                          <img src={msgAuthor.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          msgAuthor?.nickname?.substring(0, 2)
                        )}
                      </div>
                    )}
                    <div className="max-w-[80%] sm:max-w-[70%] space-y-0.5">
                      {!isOwn && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5 block mb-1">
                          {msgAuthor?.nickname}
                        </span>
                      )}
                      <div
                        className={`rounded-2xl text-sm break-words relative overflow-hidden ${
                          isOwn
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/40 rounded-bl-none shadow-sm'
                        } ${msg.media_type === 'image' ? 'p-1.5' : 'px-4 py-2.5'}`}
                      >
                        {msg.media_type === 'image' && msg.media_url && (
                          <div className="relative overflow-hidden rounded-xl max-w-full sm:max-w-sm">
                            <div
                              className="absolute inset-0 z-10 select-none bg-transparent cursor-default"
                              onContextMenu={(e) => e.preventDefault()}
                              draggable="false"
                            />
                            <img
                              src={msg.media_url}
                              alt="Shared media"
                              className="w-full max-h-60 object-cover rounded-xl select-none"
                              onContextMenu={(e) => e.preventDefault()}
                              draggable="false"
                            />
                          </div>
                        )}
                        {msg.media_type === 'video' && msg.media_url && (
                          <video
                            src={msg.media_url}
                            controls
                            controlsList="nodownload"
                            onContextMenu={(e) => e.preventDefault()}
                            className="max-w-full sm:max-w-xs max-h-60 rounded-xl bg-black"
                            draggable="false"
                          />
                        )}
                        {msg.media_type === 'voice' && msg.media_url && (
                          <div className="flex items-center gap-2 sm:gap-3 py-1 min-w-[170px] sm:min-w-[200px] max-w-full select-none">
                            <Volume2 size={16} className={isOwn ? 'text-indigo-200 shrink-0' : 'text-slate-400 shrink-0'} />
                            <audio
                              src={msg.media_url}
                              controls
                              controlsList="nodownload"
                              onContextMenu={(e) => e.preventDefault()}
                              className="w-full h-8"
                            />
                          </div>
                        )}
                        {msg.content && (
                          <p className={msg.media_type === 'image' ? 'p-2 pt-1 text-xs' : ''}>
                            {msg.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 space-y-2">
                <MessageCircle size={40} className="stroke-1" />
                <p className="text-sm">Start the conversation!</p>
              </div>
            )
          ) : (
          /* ---- Group / Global Chat Mode ---- */
            error ? (
              <div className="h-full flex flex-col items-center justify-center text-rose-500 dark:text-rose-400 space-y-2">
                <AlertCircle size={40} className="stroke-1 animate-bounce" />
                <p className="text-sm font-bold">{error}</p>
              </div>
            ) : messages.length > 0 ? (
              messages.map((msg) => {
                const isOwn = msg.guest?.id === guest?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwn && (
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 uppercase select-none shrink-0">
                        {msg.guest?.avatar_url ? (
                          <img src={msg.guest.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          msg.guest?.nickname?.substring(0, 2)
                        )}
                      </div>
                    )}
                    <div className="max-w-[80%] sm:max-w-[70%] space-y-0.5">
                      {!isOwn && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5 flex items-center gap-1 mb-1">
                          {msg.guest?.nickname}
                          {msg.guest?.is_admin && (
                            <span className="text-indigo-500"><Shield size={10} /></span>
                          )}
                        </span>
                      )}
                      <div
                        className={`rounded-2xl text-sm break-words relative overflow-hidden ${
                          isOwn
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/40 rounded-bl-none shadow-sm'
                        } ${msg.media_type === 'image' ? 'p-1.5' : 'px-4 py-2.5'}`}
                      >
                        {msg.media_type === 'image' && msg.media_url && (
                          <div className="relative overflow-hidden rounded-xl max-w-full sm:max-w-sm">
                            <div
                              className="absolute inset-0 z-10 select-none bg-transparent cursor-default"
                              onContextMenu={(e) => e.preventDefault()}
                              draggable="false"
                            />
                            <img
                              src={msg.media_url}
                              alt="Shared media"
                              className="w-full max-h-60 object-cover rounded-xl select-none"
                              onContextMenu={(e) => e.preventDefault()}
                              draggable="false"
                            />
                          </div>
                        )}
                        {msg.media_type === 'video' && msg.media_url && (
                          <video
                            src={msg.media_url}
                            controls
                            controlsList="nodownload"
                            onContextMenu={(e) => e.preventDefault()}
                            className="max-w-full sm:max-w-xs max-h-60 rounded-xl bg-black"
                            draggable="false"
                          />
                        )}
                        {msg.media_type === 'voice' && msg.media_url && (
                          <div className="flex items-center gap-2 sm:gap-3 py-1 min-w-[170px] sm:min-w-[200px] max-w-full select-none">
                            <Volume2 size={16} className={isOwn ? 'text-indigo-200 shrink-0' : 'text-slate-400 shrink-0'} />
                            <audio
                              src={msg.media_url}
                              controls
                              controlsList="nodownload"
                              onContextMenu={(e) => e.preventDefault()}
                              className="w-full h-8"
                            />
                          </div>
                        )}
                        {msg.content && (
                          <p className={msg.media_type === 'image' ? 'p-2 pt-1 text-xs' : ''}>
                            {msg.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : !loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 space-y-2">
                <MessageSquare size={40} className="stroke-1" />
                <p className="text-sm">No messages yet. Say hello!</p>
              </div>
            ) : null
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicators (only for group/global chats) */}
        {!activeChatReceiverId && (
          <div className="px-6 h-6 flex items-center text-xs text-slate-500 dark:text-slate-400">
            <AnimatePresence>
              {typingList.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="flex items-center gap-1"
                >
                  <span className="font-semibold">{typingList.join(', ')}</span>
                  <span>{typingList.length === 1 ? 'is' : 'are'} typing...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Message Input Panel (with File Previews & Recording layouts) */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 space-y-3">
          
          {/* File Upload Preview Panel */}
          {filePreview && (
            <div className="relative p-2 bg-slate-550/5 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between max-w-xs animate-fade-in">
              <div className="flex items-center gap-3 overflow-hidden">
                {fileType === 'video' ? (
                  <video src={filePreview} className="w-12 h-12 object-cover rounded-lg bg-black" />
                ) : (
                  <img src={filePreview} className="w-12 h-12 object-cover rounded-lg bg-slate-100" />
                )}
                <div className="text-left overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                    {selectedFile?.name}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-black">
                    {fileType}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearFileSelection}
                className="p-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-850 text-slate-450 dark:text-slate-400 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Form and Recording Controllers */}
          {isRecording ? (
            /* Voice Recording Panel */
            <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/20 rounded-2xl py-3 px-4 text-rose-500">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="text-[10px] sm:text-xs font-black uppercase truncate">Recording Voice...</span>
                <span className="text-xs sm:text-sm font-bold pl-1 shrink-0">{formatTime(recordingSeconds)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecording(false)} // Cancel recording
                  className="p-2 rounded-xl hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer text-[10px] sm:text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={stopRecording} // Stop and Submit recording
                  className="px-3 sm:px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] sm:text-xs shadow-md transition-all cursor-pointer"
                >
                  Send Note
                </button>
              </div>
            </div>
          ) : (
            /* Standard Text Submission Form */
            <form onSubmit={handleSend} className="flex gap-2 items-center">
              
              {/* Media Picker Button */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={triggerFileSelect}
                disabled={uploading}
                className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Paperclip size={18} />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={text}
                onChange={handleTextChange}
                placeholder={selectedFile ? "Add caption..." : "Type a message..."}
                maxLength={500}
                disabled={uploading}
                className="flex-1 px-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm min-w-0"
              />

              {/* Voice Note Button (only when text field is empty) */}
              {!text.trim() && !selectedFile && (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={uploading}
                  className="w-12 h-12 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <Mic size={18} />
                </button>
              )}

              {/* Submit Button */}
              {(text.trim() || selectedFile) && (
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 transition-all shrink-0 cursor-pointer"
                >
                  <Send size={18} />
                </button>
              )}

            </form>
          )}

        </div>
      </div>

      {/* Sidebar: Online Members Panel (Desktop - 3 Cols) */}
      <div className="hidden lg:block lg:col-span-3 h-full glass-card rounded-3xl p-5 border border-white/20">
        {renderRightSidebarContents()}
      </div>

      {/* Create Group Modal Overlay */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-55 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm glass-card rounded-3xl p-6 border border-white/20 shadow-2xl pointer-events-auto bg-white dark:bg-slate-900"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Create New Group Chat</h3>
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="p-1 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] uppercase font-bold text-slate-450">Group Room Name</label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g. Vibe Room"
                      maxLength={30}
                      required
                      className="w-full px-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] uppercase font-bold text-slate-450">Visibility Type</label>
                    <select
                      value={newGroupVisibility}
                      onChange={(e) => {
                        setNewGroupVisibility(e.target.value);
                        if (e.target.value !== 'protected') {
                          setNewGroupPasscode('');
                        }
                      }}
                      className="w-full px-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm font-bold bg-transparent"
                    >
                      <option value="public" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">🌐 Public (Anyone can join)</option>
                      <option value="protected" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">🔒 Protected (Passcode required)</option>
                      <option value="private" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">👁️ Private (Creator approval required)</option>
                    </select>
                  </div>

                  {newGroupVisibility === 'protected' && (
                    <div className="space-y-1 text-left animate-fade-in">
                      <label className="text-[10px] uppercase font-bold text-slate-450">Passcode</label>
                      <input
                        type="password"
                        value={newGroupPasscode}
                        onChange={(e) => setNewGroupPasscode(e.target.value)}
                        placeholder="Enter room passcode"
                        maxLength={20}
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-955/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm font-bold"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!newGroupName.trim() || (newGroupVisibility === 'protected' && !newGroupPasscode.trim())}
                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    Create and Enter Room
                  </button>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile left drawer (Rooms + DMs) */}
      <AnimatePresence>
        {showMobileRooms && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileRooms(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden pointer-events-auto"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-950 shadow-2xl flex flex-col md:hidden pointer-events-auto border-r border-slate-200 dark:border-slate-800"
            >
              {/* Mobile Drawer Header with Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setActiveLeftTab('channels')}
                  className={`flex-1 py-4 text-[11px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                    activeLeftTab === 'channels'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  <MessageSquare size={13} /> Channels
                </button>
                <button
                  onClick={() => setActiveLeftTab('dms')}
                  className={`flex-1 py-4 text-[11px] font-bold flex items-center justify-center gap-1.5 border-b-2 relative transition-colors ${
                    activeLeftTab === 'dms'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  <MessageCircle size={13} /> Messages
                  {conversations.some((c) => (c.unread_count || 0) > 0) && (
                    <span className="absolute top-2 right-3 w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </button>
                <button
                  onClick={() => setShowMobileRooms(false)}
                  className="px-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Channels Tab */}
              {activeLeftTab === 'channels' && (
                <div className="flex flex-col flex-1 overflow-hidden p-4 space-y-3">
                  <button
                    onClick={() => { setShowMobileRooms(false); setShowCreateModal(true); }}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-100/50 dark:border-indigo-900/10"
                  >
                    <Plus size={14} /> Create Room
                  </button>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    <button
                      onClick={() => { setActiveChatReceiverId(null); handleRoomSelect(null); setShowMobileRooms(false); }}
                      className={`w-full text-left px-4 py-3 rounded-2xl transition-all cursor-pointer flex justify-between items-center ${
                        activeGroupId === null && !activeChatReceiverId
                          ? 'bg-indigo-600 text-white font-bold shadow-md'
                          : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/50'
                      }`}
                    >
                      <span className="text-xs truncate">🌎 Global Room</span>
                    </button>
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => { setActiveChatReceiverId(null); handleRoomSelect(group.id); setShowMobileRooms(false); }}
                        className={`w-full text-left px-4 py-3 rounded-2xl transition-all cursor-pointer flex justify-between items-center ${
                          activeGroupId === group.id && !activeChatReceiverId
                            ? 'bg-indigo-600 text-white font-bold shadow-md'
                            : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs truncate">💬 {group.name}</span>
                          {!group.is_member && !group.is_creator && (
                            group.type === 'protected' ? (
                              <Lock size={10} className={activeGroupId === group.id ? 'text-white/70' : 'text-slate-400'} />
                            ) : group.type === 'private' ? (
                              group.request_status === 'pending' ? (
                                <Clock size={10} className="text-amber-500 animate-pulse" />
                              ) : (
                                <EyeOff size={10} className={activeGroupId === group.id ? 'text-white/70' : 'text-slate-400'} />
                              )
                            ) : null
                          )}
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${
                          activeGroupId === group.id && !activeChatReceiverId ? 'bg-white/20 text-white' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {group.members_count || 1}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DMs Tab (mobile drawer) */}
              {activeLeftTab === 'dms' && (
                <div className="flex flex-col flex-1 overflow-hidden p-4 space-y-3">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500 px-1">Direct Messages</span>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-slate-400 space-y-2">
                        <MessageCircle size={28} className="stroke-1" />
                        <p className="text-[10px] font-bold text-center">No conversations yet.</p>
                      </div>
                    ) : (
                      conversations.map((conv) => {
                        const isActive = activeChatReceiverId === conv.id;
                        const unread = conv.unread_count || 0;
                        return (
                          <button
                            key={conv.id}
                            onClick={() => { fetchDmMessages(conv.id); setShowMobileRooms(false); }}
                            className={`w-full text-left px-3 py-3 rounded-2xl transition-all cursor-pointer flex items-center gap-3 ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/50'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold uppercase text-slate-500 shrink-0">
                              {conv.avatar_url ? (
                                <img src={conv.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                conv.nickname?.substring(0, 2)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${
                                isActive ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                              }`}>{conv.nickname}</p>
                              {conv.last_message && (
                                <p className={`text-[10px] truncate mt-0.5 ${
                                  isActive ? 'text-indigo-100' : 'text-slate-400'
                                }`}>
                                  {conv.last_message.content || (conv.last_message.media_type === 'image' ? '📷 Photo' : conv.last_message.media_type === 'video' ? '🎥 Video' : '🎤 Voice note')}
                                </p>
                              )}
                            </div>
                            {unread > 0 && !isActive && (
                              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                {unread > 9 ? '9+' : unread}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile right drawer (Online Members) */}
      <AnimatePresence>
        {showMobileMembers && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMembers(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden pointer-events-auto"
            />
            <motion.div
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 right-0 z-50 w-72 bg-white dark:bg-slate-955 p-5 shadow-2xl flex flex-col space-y-4 lg:hidden pointer-events-auto border-l border-slate-200 dark:border-slate-850"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-900">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                  <Users size={16} /> Online Members
                </h3>
                <button
                  onClick={() => setShowMobileMembers(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {renderRightSidebarContents()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Passcode Modal Overlay */}
      <AnimatePresence>
        {showPasscodeModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasscodeModal(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-55 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm glass-card rounded-3xl p-6 border border-white/20 shadow-2xl pointer-events-auto bg-white dark:bg-slate-900"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-805 dark:text-slate-100 text-sm flex items-center gap-1.5">
                    <Lock size={16} className="text-indigo-500" /> Enter Passcode
                  </h3>
                  <button 
                    onClick={() => setShowPasscodeModal(false)}
                    className="p-1 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] uppercase font-bold text-slate-455">Room Passcode</label>
                    <input
                      type="password"
                      value={passcodeValue}
                      onChange={(e) => setPasscodeValue(e.target.value)}
                      placeholder="Enter the passcode to enter"
                      required
                      autoFocus
                      className="w-full px-4 py-3 rounded-2xl bg-white/40 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm font-bold"
                    />
                    {passcodeError && (
                      <p className="text-rose-500 text-xs font-bold mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {passcodeError}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!passcodeValue.trim()}
                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    Join Group
                  </button>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Join Request Confirmation Modal */}
      <AnimatePresence>
        {showRequestConfirmModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRequestConfirmModal(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-55 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm glass-card rounded-3xl p-6 border border-white/20 shadow-2xl pointer-events-auto bg-white dark:bg-slate-900 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                  <UserPlus size={24} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-2">Request Access</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  This room is private. You must send a request, and the group creator will need to approve it before you can participate.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowRequestConfirmModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-850 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestConfirmSubmit}
                    className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    Send Request
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ── Voice / Video Call Overlay ─────────────────────── */}
      <CallOverlay
        callState={callState}
        guest={guest}
        token={token}
        onEnd={handleCallEnd}
      />

      {/* ── Incoming Call Toast ────────────────────────────── */}
      {incomingCall && (
        <IncomingCallToast
          call={incomingCall}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
        />
      )}

    </div>
  );
}
