import { memo, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Search, Send, ImagePlus, ArrowLeft, MoreVertical, Reply, Smile, Settings, Plus, LogOut, Users, MessageCircle, UserRound, X, Check, CheckCircle2, UserPlus, Trash2, Moon, Sun, ExternalLink, Camera, Zap, ShoppingBag, Sparkles, Heart, ThumbsUp, Laugh, CircleHelp, Frown, Hand, LockKeyhole } from "lucide-react";
import api, { API } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ThemePicker from "../components/ThemePicker";
const reactions = [{
  id: "heart",
  label: "Heart",
  Icon: Heart
}, {
  id: "thumbs-up",
  label: "Like",
  Icon: ThumbsUp
}, {
  id: "laugh",
  label: "Laugh",
  Icon: Laugh
}, {
  id: "surprised",
  label: "Surprised",
  Icon: CircleHelp
}, {
  id: "sad",
  label: "Sad",
  Icon: Frown
}, {
  id: "clap",
  label: "Clap",
  Icon: Hand
}];
const reactionIcons = {
  heart: Heart,
  "thumbs-up": ThumbsUp,
  laugh: Laugh,
  surprised: CircleHelp,
  sad: Frown,
  clap: Hand,
  "\u2764\uFE0F": Heart,
  "\uD83D\uDC4D": ThumbsUp,
  "\uD83D\uDE02": Laugh,
  "\uD83D\uDE2E": CircleHelp,
  "\uD83D\uDE22": Frown,
  "\uD83D\uDC4F": Hand
};
function ReactionIcon({
  reaction,
  size = 14
}) {
  const Icon = reactionIcons[reaction];
  return Icon ? <Icon size={size} aria-hidden="true" /> : <Smile size={size} aria-hidden="true" />;
}
const PULSY_EMOTES = [{
  id: "peepoFlower",
  name: "peepoFlower",
  label: "PEEPOFLOWER",
  price: 20,
  imageUrl: "/emotes/peepoFlower-3x.webp"
}, {
  id: "EZY",
  name: "EZY",
  label: "EZY",
  price: 20,
  imageUrl: "/emotes/EZY-3x.webp"
}, {
  id: "pepeSadJam",
  name: "pepeSadJam",
  label: "PEPESADJAM",
  price: 20,
  imageUrl: "/emotes/pepeSadJam-3x.webp"
}, {
  id: "DonoWall",
  name: "DonoWall",
  label: "DONOWALL",
  price: 20,
  imageUrl: "/emotes/donowall-3x.webp"
}, {
  id: "KEKW",
  name: "KEKW",
  label: "KEKW",
  price: 20,
  imageUrl: "/emotes/KEKW-3x.webp"
}, {
  id: "catJAM",
  name: "catJAM",
  label: "CATJAM",
  price: 20,
  imageUrl: "/emotes/catJAM-3x.webp"
}, {
  id: "monkaHmm",
  name: "monkaHmm",
  label: "MONKAHMM",
  price: 20,
  imageUrl: "/emotes/monkaHmm-3x.webp"
}, {
  id: "ALO",
  name: "ALO",
  label: "ALO",
  price: 20,
  imageUrl: "/emotes/ALO-3x.webp"
}];
const PULSY_BORDERS = [{
  id: "aurora",
  name: "Aurora",
  price: 20,
  description: "Cool northern-light RGB"
}, {
  id: "cyber",
  name: "Cyber",
  price: 20,
  description: "Electric cyan + violet"
}, {
  id: "synthwave",
  name: "Synthwave",
  price: 20,
  description: "Pink + purple arcade glow"
}, {
  id: "ocean",
  name: "Ocean",
  price: 20,
  description: "Aqua + blue current"
}, {
  id: "sunset",
  name: "Sunset",
  price: 20,
  description: "Warm orange + magenta"
}, {
  id: "plasma",
  name: "Plasma",
  price: 20,
  description: "Violet + blue plasma"
}, {
  id: "rainbow",
  name: "Rainbow",
  price: 20,
  description: "Full-spectrum RGB"
}, {
  id: "electric",
  name: "Electric",
  price: 20,
  description: "Blue + white lightning"
}, {
  id: "fireice",
  name: "Fire & Ice",
  price: 20,
  description: "Icy blue meets ember red"
}, {
  id: "neon",
  name: "Neon",
  price: 20,
  description: "Classic neon RGB"
}];
export default function ChatPage({
  theme,
  setTheme,
  colorTheme,
  setColorTheme
}) {
  const {
    user,
    logout,
    setUser
  } = useAuth();
  const [socket, setSocket] = useState(null);
  const [groups, setGroups] = useState([]);
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [reply, setReply] = useState(null);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [menu, setMenu] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [groupSettings, setGroupSettings] = useState(null);
  const [groupManager, setGroupManager] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState([]);
  const [pendingMember, setPendingMember] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [showPulsy, setShowPulsy] = useState(false);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [pulsy, setPulsy] = useState({
    balance: Number(user?.pulsy_balance || 0),
    messageCount: Number(user?.message_count || 0),
    owned: [],
    ownedBorders: [],
    profileBorderId: user?.profile_border_id || null,
    emotes: PULSY_EMOTES,
    borders: PULSY_BORDERS
  });
  const [selectedEmote, setSelectedEmote] = useState(null);
  const [pulsyNotice, setPulsyNotice] = useState("");
  const [profileUser, setProfileUser] = useState(null);
  const endRef = useRef(null);
  const activeRef = useRef(null);
  const groupManagerRef = useRef(null);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    groupManagerRef.current = groupManager;
  }, [groupManager]);
  useEffect(() => {
    let mounted = true;
    api.get("/pulsy").then(response => {
      if (!mounted) return;
      const data = response.data || {};
      setPulsy({
        balance: Number(data.balance || 0),
        messageCount: Number(data.messageCount || 0),
        owned: data.owned || [],
        ownedBorders: data.ownedBorders || [],
        profileBorderId: data.profileBorderId || null,
        emotes: data.emotes || PULSY_EMOTES,
        borders: data.borders || PULSY_BORDERS
      });
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!pulsyNotice) return;
    const timer = window.setTimeout(() => setPulsyNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [pulsyNotice]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [groupsResponse, conversationsResponse] = await Promise.all([api.get("/groups"), api.get("/conversations")]);
        if (!mounted) return;
        setGroups(groupsResponse.data.groups || []);
        setConvos(conversationsResponse.data.conversations || []);
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || "Could not load chats.");
        }
      }
    };
    load();
    const token = localStorage.getItem("pulse_token");
    const newSocket = io(API, {
      auth: {
        token
      }
    });
    setSocket(newSocket);
    newSocket.on("connect_error", () => {
      setError("Realtime connection unavailable. Retrying…");
    });
    newSocket.on("connect", () => {
      setError("");
      const current = activeRef.current;
      if (current) {
        newSocket.emit(current.type === "group" ? "join:group" : "join:conversation", current.id);
      }
    });
    newSocket.on("message:new", message => {
      const current = activeRef.current;
      const isMine = Number(message.sender_id) === Number(user?.id);
      const isCurrentDm = current?.type === "dm" && Number(message.conversation_id) === Number(current.id);
      const isCurrentGroup = current?.type === "group" && Number(message.group_id) === Number(current.id);
      if (isCurrentDm || isCurrentGroup) {
        setMessages(currentMessages => {
          if (currentMessages.some(item => item.id === message.id)) return currentMessages;
          return [...currentMessages, message];
        });
        if (!isMine && message.conversation_id) {
          api.post(`/conversations/${message.conversation_id}/read`).catch(() => {});
        }
      }

      // Keep the private-chat list live. The recipient gets the sender's
      // username/avatar and an unread badge; the recipient's own username is
      // never used for the incoming row.
      if (message.conversation_id) {
        setConvos(currentConvos => {
          const existing = currentConvos.find(item => Number(item.id) === Number(message.conversation_id));
          if (existing) {
            const shouldUnread = !isMine && !isCurrentDm;
            const updated = {
              ...existing,
              last_message_id: message.id,
              last_text: message.text,
              last_image: message.image_url,
              last_at: message.created_at,
              ...(shouldUnread ? {
                unread_count: Number(existing.unread_count || 0) + 1
              } : {
                unread_count: isCurrentDm ? 0 : Number(existing.unread_count || 0)
              })
            };
            return [updated, ...currentConvos.filter(item => Number(item.id) !== Number(message.conversation_id))];
          }
          if (isMine) return currentConvos;
          return [{
            id: message.conversation_id,
            conversation_id: message.conversation_id,
            other_id: message.sender_id,
            username: message.username,
            avatar: message.avatar,
            profile_border_id: message.profile_border_id,
            last_message_id: message.id,
            last_text: message.text,
            last_image: message.image_url,
            last_at: message.created_at,
            unread_count: isCurrentDm ? 0 : 1
          }, ...currentConvos];
        });
      }
    });
    newSocket.on("user:avatar_changed", updatedUser => {
      setConvos(current => current.map(conversation => conversation.other_id === updatedUser.id ? {
        ...conversation,
        avatar: updatedUser.avatar
      } : conversation));
    });
    newSocket.on("user:profile_updated", updatedUser => {
      setConvos(current => current.map(conversation => conversation.other_id === updatedUser.id ? {
        ...conversation,
        ...updatedUser
      } : conversation));
      setProfileUser(current => current?.id === updatedUser.id ? {
        ...current,
        ...updatedUser
      } : current);
      setMessages(current => current.map(message => message.sender_id === updatedUser.id ? {
        ...message,
        avatar: updatedUser.avatar,
        profile_border_id: updatedUser.profile_border_id,
        username: updatedUser.username
      } : message));
    });
    newSocket.on("group:added", group => {
      setGroups(current => {
        if (current.some(item => item.id === group.id)) return current;
        return [...current, group].sort((a, b) => a.name.localeCompare(b.name));
      });
    });
    newSocket.on("group:updated", group => {
      setGroups(current => current.map(item => item.id === group.id ? {
        ...item,
        ...group
      } : item).sort((a, b) => a.name.localeCompare(b.name)));
      setGroupSettings(current => current?.id === group.id ? {
        ...current,
        ...group
      } : current);
    });
    newSocket.on("group:members_changed", ({
      groupId
    }) => {
      const current = groupManagerRef.current;
      if (current?.id === groupId) {
        loadMembers(groupId);
      }
    });
    newSocket.on("typing", data => {
      setTyping(data?.username || "");
      window.clearTimeout(window.__pulseTypingTimer);
      window.__pulseTypingTimer = window.setTimeout(() => setTyping(""), 1200);
    });
    newSocket.on("reaction:update", payload => {
      setMessages(current => current.map(message => message.id === payload.messageId ? {
        ...message,
        reactions: payload.reactions || []
      } : message));
    });
    return () => {
      mounted = false;
      window.clearTimeout(window.__pulseTypingTimer);
      newSocket.disconnect();
    };
  }, []);
  useEffect(() => {
    const openImage = event => setLightbox(event.detail);
    window.addEventListener("pulse:open-image", openImage);
    return () => window.removeEventListener("pulse:open-image", openImage);
  }, []);
  useEffect(() => {
    const openShop = () => {
      setShowSettings(false);
      setShowPulsy(true);
    };
    window.addEventListener("pulse:open-shop", openShop);
    return () => window.removeEventListener("pulse:open-shop", openShop);
  }, []);
  useEffect(() => {
    if (!active) return;
    let mounted = true;
    const loadMessages = async () => {
      try {
        setReply(null);
        setMessages([]);
        const params = active.type === "group" ? {
          groupId: active.id
        } : {
          conversationId: active.id
        };
        const response = await api.get("/messages", {
          params
        });
        if (mounted) setMessages(response.data.messages || []);
        if (active.type === "dm") {
          await api.post(`/conversations/${active.id}/read`).catch(() => {});
          setConvos(current => current.map(conversation => Number(conversation.id) === Number(active.id) ? {
            ...conversation,
            unread_count: 0
          } : conversation));
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || "Could not load messages.");
        }
      }
    };
    loadMessages();
    if (socket) {
      socket.emit(active.type === "group" ? "join:group" : "join:conversation", active.id);
    }
    return () => {
      mounted = false;
    };
  }, [active?.id, active?.type, socket]);
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages.length]);
  const activeTitle = useMemo(() => {
    if (!active) return "";
    if (active.type === "group") {
      return groups.find(group => group.id === active.id)?.name || "Group conversation";
    }
    return convos.find(conversation => conversation.id === active.id)?.username || "Private conversation";
  }, [active, groups, convos]);
  const doSearch = async query => {
    setSearch(query);
    if (!query.trim()) {
      setUsers([]);
      return;
    }
    try {
      const response = await api.get("/users", {
        params: {
          q: query
        }
      });
      setUsers(response.data.users || []);
    } catch {
      setUsers([]);
    }
  };
  const openProfile = async targetUser => {
    if (!targetUser?.username) return;
    try {
      const response = await api.get(`/users/${encodeURIComponent(targetUser.username)}`);
      setProfileUser(response.data.user);
    } catch {
      setProfileUser(targetUser);
    }
  };
  const openPrivate = async targetUser => {
    try {
      const response = await api.post("/conversations", {
        userId: targetUser.id
      });
      const conversation = response.data.conversation;
      setConvos(current => {
        const existing = current.find(item => Number(item.id) === Number(conversation.id));
        if (existing) {
          return [{
            ...existing,
            username: existing.username || targetUser.username,
            avatar: existing.avatar || targetUser.avatar,
            unread_count: 0
          }, ...current.filter(item => Number(item.id) !== Number(conversation.id))];
        }
        return [{
          ...conversation,
          other_id: targetUser.id,
          username: targetUser.username,
          avatar: targetUser.avatar,
          profile_border_id: targetUser.profile_border_id,
          unread_count: 0
        }, ...current];
      });
      setActive({
        type: "dm",
        id: conversation.id
      });
      setSearch("");
      setUsers([]);
    } catch (err) {
      setError(err.response?.data?.message || "Could not open chat.");
    }
  };
  const send = async () => {
    if (!active || !text.trim() && !selectedEmote) return;
    try {
      const response = await api.post("/messages", {
        [active.type === "group" ? "groupId" : "conversationId"]: active.id,
        ...(selectedEmote ? {
          emoteId: selectedEmote.id
        } : {
          text: text.trim()
        }),
        replyTo: reply?.id || null
      });
      const message = response.data.message;
      setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
      setText("");
      setSelectedEmote(null);
      setReply(null);
      if (response.data?.pulsy) {
        setPulsy(current => ({
          ...current,
          ...response.data.pulsy
        }));
        setUser(current => current ? {
          ...current,
          pulsy_balance: response.data.pulsy.balance,
          message_count: response.data.pulsy.messageCount
        } : current);
        if (response.data.pulsy.reward > 0) setPulsyNotice(`+${response.data.pulsy.reward} Pulsy earned!`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not send message.");
    }
  };
  const upload = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !active) return;
    if (!file.type || !file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    const formData = new FormData();
    formData.append("image", file, file.name);
    setUploading(true);
    try {
      const uploadResponse = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      const imageUrl = uploadResponse.data.url;
      if (!imageUrl) throw new Error("Server did not return an image URL.");
      const messageResponse = await api.post("/messages", {
        [active.type === "group" ? "groupId" : "conversationId"]: active.id,
        imageUrl,
        replyTo: reply?.id || null
      });
      const message = messageResponse.data.message;
      setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
      setReply(null);
      if (messageResponse.data?.pulsy) {
        setPulsy(current => ({
          ...current,
          ...messageResponse.data.pulsy
        }));
        setUser(current => current ? {
          ...current,
          pulsy_balance: messageResponse.data.pulsy.balance,
          message_count: messageResponse.data.pulsy.messageCount
        } : current);
        if (messageResponse.data.pulsy.reward > 0) setPulsyNotice(`+${messageResponse.data.pulsy.reward} Pulsy earned!`);
      }
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      setError(serverMessage || err.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };
  const buyEmote = async emote => {
    if (emote.kind === "border") {
      try {
        const ownedBorder = (pulsy.ownedBorders || []).includes(emote.id);
        const response = await api.post(`/pulsy/borders/${encodeURIComponent(emote.id)}/${ownedBorder ? "equip" : "buy"}`);
        setPulsy(current => ({
          ...current,
          balance: Number(response.data.balance ?? current.balance),
          ownedBorders: response.data.ownedBorders || current.ownedBorders,
          profileBorderId: response.data.profileBorderId ?? current.profileBorderId
        }));
        setUser(current => current ? {
          ...current,
          pulsy_balance: Number(response.data.balance ?? current.pulsy_balance),
          profile_border_id: response.data.profileBorderId
        } : current);
        setPulsyNotice(ownedBorder ? `${emote.name} equipped.` : `${emote.name} purchased and equipped.`);
      } catch (err) {
        setError(err.response?.data?.message || "Could not update this border.");
      }
      return;
    }
    if (pulsy.owned.includes(emote.id)) {
      setSelectedEmote(emote);
      setShowPulsy(false);
      return;
    }
    try {
      const response = await api.post(`/pulsy/${emote.id}/buy`);
      setPulsy(current => ({
        ...current,
        balance: response.data.balance,
        owned: response.data.owned || current.owned
      }));
      setUser(current => current ? {
        ...current,
        pulsy_balance: response.data.balance
      } : current);
      setSelectedEmote(emote);
      setShowPulsy(false);
      setPulsyNotice(`${emote.name} is ready to use.`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not buy this emote.");
    }
  };
  const react = async (message, reaction) => {
    try {
      const response = await api.post(`/messages/${message.id}/reaction`, {
        reaction
      });
      setMessages(current => current.map(item => item.id === message.id ? {
        ...item,
        reactions: response.data.reactions || []
      } : item));
    } catch (err) {
      setError(err.response?.data?.message || "Could not update reaction.");
    }
  };
  const openGroupSettings = group => {
    if (!group || Number(group.owner_id) !== Number(user?.id)) {
      setError("Only the group admin can edit group settings.");
      return;
    }
    setGroupSettings(group);
  };
  const saveGroupSettings = async ({
    name,
    description,
    file
  }) => {
    if (!groupSettings) return;
    try {
      let avatar = groupSettings.avatar || null;
      if (file) {
        const formData = new FormData();
        formData.append("image", file, file.name);
        const uploadResponse = await api.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        avatar = uploadResponse.data.url;
      }
      const response = await api.patch(`/groups/${groupSettings.id}/settings`, {
        name,
        description,
        avatar
      });
      const updated = response.data.group;
      setGroups(current => current.map(item => item.id === updated.id ? {
        ...item,
        ...updated
      } : item).sort((a, b) => a.name.localeCompare(b.name)));
      setGroupSettings(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update group settings.");
    }
  };
  const createGroup = async () => {
    const name = groupName.trim();
    if (!name) return;
    try {
      const response = await api.post("/groups", {
        name
      });
      const group = response.data.group;
      setGroups(current => current.some(item => item.id === group.id) ? current : [...current, group].sort((a, b) => a.name.localeCompare(b.name)));
      setGroupName("");
      setShowCreate(false);
      setActive({
        type: "group",
        id: group.id
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not create group.");
    }
  };
  async function loadMembers(groupId) {
    try {
      const response = await api.get(`/groups/${groupId}/members`);
      setGroupMembers(response.data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load members.");
    }
  }
  const openGroupManager = async group => {
    groupManagerRef.current = group;
    setGroupManager(group);
    setMemberSearch("");
    setMemberResults([]);
    await loadMembers(group.id);
  };
  const searchMembers = async query => {
    setMemberSearch(query);
    if (!query.trim()) {
      setMemberResults([]);
      return;
    }
    try {
      const response = await api.get("/users", {
        params: {
          q: query
        }
      });
      setMemberResults(response.data.users || []);
    } catch {
      setMemberResults([]);
    }
  };
  const addMember = async targetUser => {
    if (!groupManager) return;
    try {
      await api.post(`/groups/${groupManager.id}/members/${targetUser.id}`);
      await loadMembers(groupManager.id);
      setMemberSearch("");
      setMemberResults([]);
      setPendingMember(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not add member.");
    }
  };
  const removeMember = async targetUser => {
    if (!groupManager || targetUser.id === user.id) return;
    try {
      await api.delete(`/groups/${groupManager.id}/members/${targetUser.id}`);
      await loadMembers(groupManager.id);
    } catch (err) {
      setError(err.response?.data?.message || "Could not remove member.");
    }
  };
  return <div className="app-shell">
      <aside className={`sidebar ${active ? "mobile-hidden" : ""}`}>
        <header className="side-head">
          <button className="profile-chip" onClick={() => setShowSettings(true)}>
            <Avatar user={user} onClick={event => {
            event.stopPropagation();
            openProfile(user);
          }} />
            <div>
              <b>{user?.username}</b>
              <small>Online</small>
            </div>
          </button>

          <div className="head-actions">
            <ThemePicker colorTheme={colorTheme} setColorTheme={setColorTheme} />
            <button className="icon-btn theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme" title={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
              <Settings size={19} />
            </button>
          </div>
        </header>

        <div className="search-box">
          <Search size={18} />
          <input value={search} onChange={event => doSearch(event.target.value)} placeholder="Search exact username…" />
        </div>

        {search && <div className="search-results">
            {users.length ? users.map(targetUser => <button key={targetUser.id} onClick={() => openPrivate(targetUser)}>
                  <Avatar user={targetUser} onClick={event => {
            event.stopPropagation();
            openProfile(targetUser);
          }} />
                  <span>@{targetUser.username}</span>
                </button>) : <div className="empty-mini">No users found</div>}
          </div>}

        <section className="chat-list">
          <div className="list-title">
            <span>Groups</span>
            <button className="tiny" onClick={() => setShowCreate(true)} aria-label="Create group">
              <Plus size={16} />
            </button>
          </div>

          {groups.map(group => <ChatRow key={`group-${group.id}`} title={group.name} subtitle={`${group.members || 1} members`} avatar={group.avatar} icon={<Users size={17} />} active={active?.type === "group" && active.id === group.id} onClick={() => setActive({
          type: "group",
          id: group.id
        })} />)}

          <div className="list-title">
            <span>Private chats</span>
          </div>

          {convos.map(conversation => <ChatRow key={`conversation-${conversation.id}`} title={conversation.username} avatar={conversation.avatar} subtitle="Private conversation" profileBorderId={conversation.profile_border_id} unreadCount={conversation.unread_count} active={active?.type === "dm" && active.id === conversation.id} onClick={() => setActive({
          type: "dm",
          id: conversation.id
        })} onAvatarClick={event => {
          event.stopPropagation();
          openProfile({
            id: conversation.other_id,
            username: conversation.username,
            avatar: conversation.avatar,
            profile_border_id: conversation.profile_border_id
          });
        }} />)}
        </section>

        <footer className="side-foot">
          <button className="pulsy-balance-button" onClick={() => setShowPulsy(true)} title="Open Pulsy shop">
            <span className="pulsy-icon"><Zap size={16} fill="currentColor" /></span>
            <span><b>{pulsy.balance}</b> Pulsy</span>
            <ShoppingBag size={16} />
          </button>
          <button onClick={logout}>
            <LogOut size={18} />
            Sign out
          </button>
        </footer>
      </aside>

      <main className={`conversation ${active ? "active" : ""}`}>
        {!active ? <div className="welcome">
            <div className="welcome-icon">
              <MessageCircle />
            </div>
            <h2>Select a conversation</h2>
            <p>Choose a group or private chat to start messaging.</p>
          </div> : <>
            <header className="conversation-head">
              <button className="mobile-back" onClick={() => setActive(null)} aria-label="Back">
                <ArrowLeft />
              </button>

              {active.type === "group" && <Avatar user={groups.find(item => item.id === active.id) || {}} />}
              <div className="conversation-title">
                <h2>{activeTitle}</h2>
                <span>
                  {active.type === "group" ? groups.find(item => item.id === active.id)?.description || "Group conversation" : "Private conversation"}
                </span>
              </div>

              {active.type === "group" && <button className="icon-btn" onClick={() => {
            const group = groups.find(item => item.id === active.id);
            if (group) openGroupManager(group);
          }} aria-label="Group members">
                  <Users size={19} />
                </button>}

              {active.type !== "group" || Number(groups.find(item => item.id === active.id)?.owner_id) === Number(user?.id) ? <button className="icon-btn" aria-label={active.type === "group" ? "Group settings" : "More options"} title={active.type === "group" ? "Group settings" : "More options"} onClick={() => {
            if (active.type === "group") {
              const group = groups.find(item => item.id === active.id);
              if (group) openGroupSettings(group);
            }
          }}>
                  <MoreVertical />
                </button> : null}
            </header>

            <div className="messages">
              {messages.map(message => <Message key={message.id} message={message} mine={Number(message.sender_id) === Number(user?.id)} onReply={() => setReply(message)} onReact={reaction => react(message, reaction)} onUserClick={openPrivate} onProfileClick={openProfile} menu={menu === message.id} setMenu={value => setMenu(value ? message.id : null)} />)}

              {typing && <div className="typing">{typing} is typing…</div>}
              <div ref={endRef} />
            </div>

            {reply && <div className="reply-bar">
                <Reply size={17} />
                <div>
                  <small>Replying to {reply.username || "message"}</small>
                  <span>{reply.text || "Image"}</span>
                </div>
                <button onClick={() => setReply(null)} aria-label="Cancel reply">
                  <X size={17} />
                </button>
              </div>}

            <footer className="composer">
              {error && <div className="toast">
                  {error}
                  <button onClick={() => setError("")} aria-label="Close">
                    <X size={14} />
                  </button>
                </div>}

              <label className={`icon-btn attach ${uploading ? "busy" : ""}`} title="Send image" aria-label="Send image">
                <ImagePlus size={20} />
                <input type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.gif" onChange={upload} disabled={uploading} />
              </label>

              <button className="emote-picker-trigger icon-btn" onClick={() => setShowEmotePicker(current => !current)} aria-label="Open Pulsy emotes" title="Pulsy emotes">
                <Sparkles size={19} />
              </button>

              {showEmotePicker && <div className="composer-emote-popover">
                  <div className="composer-emote-head">
                    <div><b>Pulsy Emotes</b><small>{pulsy.balance} Pulsy available</small></div>
                    <button className="icon-btn" onClick={() => setShowEmotePicker(false)} aria-label="Close emotes"><X size={15} /></button>
                  </div>
                  <div className="composer-emote-grid">
                    {(pulsy.emotes || PULSY_EMOTES).map(emote => {
                const owned = pulsy.owned.includes(emote.id);
                return <button key={emote.id} className={`composer-emote ${owned ? "owned" : "locked"}`} onClick={() => {
                  if (owned) {
                    setSelectedEmote(emote);
                    setShowEmotePicker(false);
                  } else {
                    setShowEmotePicker(false);
                    setShowPulsy(true);
                  }
                }} title={owned ? `Use ${emote.name}` : `Locked · ${emote.price} Pulsy`}>
                          <span className="composer-emote-img">{emote.imageUrl ? <img src={emote.imageUrl} alt="" /> : <Zap size={16} aria-hidden="true" />}</span>
                          <small>{emote.name}</small>
                          {!owned && <span className="emote-lock" aria-label="Locked"><LockKeyhole size={12} aria-hidden="true" /></span>}
                        </button>;
              })}
                  </div>
                  <button className="emote-shop-link" onClick={() => setShowPulsy(true)}>Open Pulsy Shop</button>
                </div>}

              {selectedEmote && <button className="selected-emote" onClick={() => setSelectedEmote(null)} title="Remove emote">
                  <span>{selectedEmote.imageUrl ? <img src={selectedEmote.imageUrl} alt="" /> : <Zap size={16} aria-hidden="true" />}</span>
                  <b>{selectedEmote.name}</b>
                  <X size={13} />
                </button>}

              <input value={text} onChange={event => {
            setText(event.target.value);
            if (event.target.value) setSelectedEmote(null);
            if (socket && active) {
              socket.emit("typing", {
                [active.type === "group" ? "groupId" : "conversationId"]: active.id
              });
            }
          }} onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }} placeholder="Write a message…" dir="auto" />

              <button className="send" onClick={send} aria-label="Send message">
                <Send size={18} />
              </button>
            </footer>
          </>}
      </main>

      {lightbox && <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Close image">
            <X size={22} />
          </button>
          <img src={lightbox} alt="Full size shared image" onClick={event => event.stopPropagation()} />
        </div>}

      {pulsyNotice && <div className="pulsy-notice"><Zap size={15} fill="currentColor" />{pulsyNotice}</div>}

      {profileUser && <ProfileModal user={profileUser} own={Number(profileUser.id) === Number(user?.id)} close={() => setProfileUser(null)} openPrivate={openPrivate} edit={() => {
      setProfileUser(null);
      setShowSettings(true);
    }} openShop={() => {
      setProfileUser(null);
      setShowPulsy(true);
    }} />}

      {showPulsy && <PulsyShopModal pulsy={pulsy} close={() => setShowPulsy(false)} onBuy={buyEmote} />}

      {showSettings && <SettingsModal user={user} ownedBorders={pulsy.ownedBorders || []} borders={pulsy.borders || PULSY_BORDERS} close={() => setShowSettings(false)} onSaved={updatedUser => {
      setUser(updatedUser);
      setPulsy(current => ({
        ...current,
        profileBorderId: updatedUser?.profile_border_id || null
      }));
      setShowSettings(false);
    }} />}

      {showCreate && <Modal title="Create group" close={() => setShowCreate(false)}>
          <p className="modal-note">
            Anyone can create a group. You can add members after creating it.
          </p>
          <input className="modal-input" autoFocus value={groupName} onChange={event => setGroupName(event.target.value)} placeholder="Group name" />
          <button className="primary" onClick={createGroup}>
            Create group
          </button>
        </Modal>}

      {groupSettings && <GroupSettingsModal group={groupSettings} close={() => setGroupSettings(null)} onSave={saveGroupSettings} />}

      {groupManager && <Modal title={`${groupManager.name} · Members`} close={() => {
      groupManagerRef.current = null;
      setGroupManager(null);
    }}>
          <div className="member-search">
            <Search size={17} />
            <input value={memberSearch} onChange={event => searchMembers(event.target.value)} placeholder="Search someone to add…" />
          </div>

          {memberResults.length > 0 && <div className="member-results">
              {memberResults.map(targetUser => <button key={targetUser.id} onClick={() => setPendingMember(targetUser)}>
                  <Avatar user={targetUser} onClick={event => {
            event.stopPropagation();
            openProfile(targetUser);
          }} />
                  <span>@{targetUser.username}</span>
                  <UserPlus size={16} />
                </button>)}
            </div>}

          {pendingMember && <div className="member-confirm">
              <Avatar user={pendingMember} />
              <div>
                <b>@{pendingMember.username}</b>
                <small>Add this person to the group?</small>
              </div>
              <div className="member-confirm-actions">
                <button className="confirm-add" onClick={async () => {
            await addMember(pendingMember);
            setPendingMember(null);
          }} aria-label="Confirm add member">
                  <CheckCircle2 size={18} />
                </button>
                <button className="cancel-add" onClick={() => setPendingMember(null)} aria-label="Cancel">
                  <X size={18} />
                </button>
              </div>
            </div>}

          <div className="members-list">
            {groupMembers.map(member => <div className="member-row" key={member.id}>
                <Avatar user={member} onClick={event => {
            event.stopPropagation();
            openProfile(member);
          }} />
                <div>
                  <button className="user-link" onClick={() => openPrivate(member)} title={`Open @${member.username}`}>
                    @{member.username}
                    <ExternalLink size={12} />
                  </button>
                  {member.id === user.id && <small>You</small>}
                </div>
                {member.id !== user.id && <button className="member-remove" onClick={() => removeMember(member)} title="Remove member">
                    <Trash2 size={15} />
                  </button>}
              </div>)}
          </div>
        </Modal>}
    </div>;
}
function Avatar({
  user,
  onClick
}) {
  const content = user?.avatar ? <img className="avatar" src={user.avatar.startsWith("http") ? user.avatar : `${API}${user.avatar}`} alt={user.username || "User"} /> : <div className="avatar placeholder"><UserRound size={18} /></div>;
  const border = user?.profile_border_id || "none";
  return <span className={`profile-ring ring-${border}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? event => {
    if (event.key === "Enter" || event.key === " ") onClick(event);
  } : undefined}>{content}</span>;
}
function ChatRow({
  title,
  subtitle,
  avatar,
  icon,
  active,
  onClick,
  onAvatarClick,
  profileBorderId,
  unreadCount = 0
}) {
  return <button className={`chat-row ${active ? "selected" : ""}`} onClick={onClick}>
      {avatar ? <Avatar user={{
      avatar,
      username: title,
      profile_border_id: profileBorderId
    }} onClick={onAvatarClick} /> : <div className="avatar placeholder">
          {icon || <MessageCircle size={18} />}
        </div>}
      <div className="chat-row-copy">
        <b>{title}</b>
        <small>{subtitle || "Open conversation"}</small>
      </div>
      {Number(unreadCount) > 0 && <span className="unread-badge">{Number(unreadCount) > 99 ? "99+" : unreadCount}</span>}
    </button>;
}
const Message = memo(function Message({
  message,
  mine,
  onReply,
  onReact,
  onUserClick,
  onProfileClick,
  menu,
  setMenu
}) {
  const [mobileActions, setMobileActions] = useState(false);
  const [swipe, setSwipe] = useState(0);
  const startX = useRef(null);
  const moved = useRef(false);
  const createdAt = message.created_at ? new Date(`${message.created_at}Z`).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  }) : "";
  const handleTouchStart = event => {
    startX.current = event.touches[0].clientX;
    moved.current = false;
  };
  const handleTouchMove = event => {
    if (startX.current == null) return;
    const delta = event.touches[0].clientX - startX.current;
    if (Math.abs(delta) < 4) return;
    moved.current = true;
    const limited = Math.max(-92, Math.min(92, delta));
    setSwipe(limited);
  };
  const handleTouchEnd = () => {
    if (startX.current == null) return;
    const delta = swipe;
    startX.current = null;
    setSwipe(0);
    if (delta <= -62) {
      onReply();
    }
  };
  return <div className={`message-wrap ${mine ? "mine" : ""}`} onClick={event => {
    if (window.innerWidth <= 760 && event.target.closest("button, img, input")) return;
    if (window.innerWidth <= 760) setMobileActions(v => !v);
  }}>
      <div className="message-swipe-area" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="reply-swipe-icon" style={{
        opacity: Math.min(1, Math.abs(swipe) / 62)
      }}>
          <Reply size={17} />
        </div>

        <div className={`message ${message.image_url && !message.text && !message.emote_id ? "has-image-only" : ""}`} style={{
        transform: `translateX(${swipe}px)`
      }}>
          {!mine && message.avatar && <button type="button" className="message-avatar-button" onClick={event => {
          event.stopPropagation();
          onProfileClick({
            id: message.sender_id,
            username: message.username,
            avatar: message.avatar,
            profile_border_id: message.profile_border_id
          });
        }}>
              <Avatar user={message} onClick={event => event.stopPropagation()} />
            </button>}
          <div className="message-meta">
            {!mine && message.username && <button className="user-link message-user-link" onClick={() => onUserClick({
            id: message.sender_id,
            username: message.username,
            avatar: message.avatar
          })} title={`Open @${message.username}`}>
                @{message.username}
              </button>}
            <span>{createdAt}</span>
            {mine && <Check size={13} />}
          </div>

          {message.reply_to && <div className="quoted">
              <Reply size={13} />
              <span>
                {message.reply_username ? <button className="user-link quoted-user-link" onClick={() => onUserClick({
              id: message.reply_user_id,
              username: message.reply_username
            })}>
                    @{message.reply_username}
                  </button> : "Message"}
                {": "}
                {message.reply_text || "Image"}
              </span>
            </div>}

          {message.image_url && <img className="msg-image" src={`${API}${message.image_url}`} alt="Shared" loading="lazy" onClick={() => window.dispatchEvent(new CustomEvent("pulse:open-image", {
          detail: `${API}${message.image_url}`
        }))} />}

          {message.emote_id ? (() => {
          const emote = PULSY_EMOTES.find(item => item.id === message.emote_id);
          return <div className="emote-message" title={emote?.name || "Pulsy emote"}>
                  {emote?.imageUrl ? <img src={emote.imageUrl} alt={emote.name} /> : <Zap size={24} aria-hidden="true" />}
                  <small>{emote?.label || "PULSY"}</small>
                </div>;
        })() : message.text ? <div className="msg-text" dir="auto">
              {message.text}
            </div> : null}

          <div className="message-actions desktop-message-actions">
            <button onClick={onReply} aria-label="Reply">
              <Reply size={14} />
            </button>
            <button onClick={() => setMenu(!menu)} aria-label="React">
              <Smile size={14} />
            </button>
          </div>

          {mobileActions && <div className="mobile-message-menu" onClick={event => event.stopPropagation()}>
              <button type="button" onClick={() => {
            onReply();
            setMobileActions(false);
          }}><Reply size={15} /> Reply</button>
            </div>}

          {menu && <div className="reaction-pop">
              {reactions.map(({
            id,
            label,
            Icon
          }) => <button key={id} type="button" aria-label={label} title={label} onClick={() => {
            onReact(id);
            setMenu(false);
          }}>
                  <Icon size={16} aria-hidden="true" />
                </button>)}
            </div>}

          {message.reactions?.length > 0 && <div className="reactions">
              {message.reactions.map(reaction => <button type="button" className="reaction-chip" key={reaction.reaction} onClick={() => onReact(reaction.reaction)} title="React to this message">
                  <ReactionIcon reaction={reaction.reaction} /> <span>{reaction.count}</span>
                </button>)}
            </div>}
        </div>
      </div>
    </div>;
}, (prev, next) => {
  // Ignore callback identity changes so typing/searching does not re-render all 100 messages.
  return prev.mine === next.mine && prev.menu === next.menu && prev.message === next.message;
});
function ProfileModal({
  user,
  own,
  close,
  openPrivate,
  edit,
  openShop
}) {
  return <div className="overlay" onClick={close}>
      <div className="modal profile-modal" onClick={event => event.stopPropagation()}>
        <header>
          <h3>Profile</h3>
          <button className="icon-btn" onClick={close} aria-label="Close"><X /></button>
        </header>
        <div className="profile-hero">
          <Avatar user={user} />
          <div className="profile-name">@{user?.username}</div>
          <div className="profile-role">{user?.role === "admin" ? "Administrator" : "Member"}</div>
          {own && <div className="profile-pulsy"><Zap size={13} fill="currentColor" /> {Number(user?.pulsy_balance || 0)} Pulsy</div>}
        </div>
        <div className="profile-actions">
          {own ? <>
              <button className="secondary-button" onClick={edit}>Edit profile</button>
              <button className="primary" onClick={openShop}><ShoppingBag size={15} /> Pulsy Shop</button>
            </> : <button className="primary" onClick={() => {
          close();
          openPrivate(user);
        }}>Message</button>}
        </div>
      </div>
    </div>;
}
function PulsyShopModal({
  pulsy,
  close,
  onBuy
}) {
  const owned = new Set(pulsy.owned || []);
  const ownedBorders = new Set(pulsy.ownedBorders || []);
  const nextReward = 200 - (Number(pulsy.messageCount || 0) % 200 || 200);
  const progress = Number(pulsy.messageCount || 0) % 200;
  return <Modal title="Pulsy Shop" close={close} className="pulsy-shop-modal">
      <div className="pulsy-hero">
        <div className="pulsy-hero-icon"><Zap size={28} fill="currentColor" /></div>
        <div><b>{pulsy.balance} Pulsy</b><span>Earn 10 Pulsy every 200 messages.</span></div>
      </div>
      <div className="pulsy-progress">
        <div className="pulsy-progress-head"><span>Message progress</span><b>{progress}/200</b></div>
        <div className="pulsy-progress-track"><i style={{
          width: `${progress / 200 * 100}%`
        }} /></div>
        <small>{nextReward} messages until your next +10 Pulsy reward.</small>
      </div>
      <div className="shop-section-title"><span><Zap size={15} /> Emotes</span><small>20 Pulsy each</small></div>
      <div className="pulsy-shop-content">
      <div className="pulsy-grid">
        {pulsy.emotes.map(emote => {
          const isOwned = owned.has(emote.id);
          return <div className="pulsy-card" key={emote.id}>
            <div className="pulsy-emote-art">{emote.imageUrl ? <img src={emote.imageUrl} alt={emote.name} /> : <Zap size={24} aria-hidden="true" />}<small>{emote.label}</small></div>
            <b>{emote.name}</b><span className="pulsy-price"><Zap size={12} fill="currentColor" /> {emote.price}</span>
            <button className={isOwned ? "secondary-button" : "primary"} onClick={() => onBuy(emote)}>{isOwned ? "Use emote" : `Buy · ${emote.price}`}</button>
          </div>;
        })}
      </div>
      <div className="shop-section-title border-shop-title"><span><Sparkles size={15} /> Profile borders</span><small>RGB animated • 20 Pulsy</small></div>
      <div className="border-shop-grid">
        {(pulsy.borders || []).map(border => {
          const ownedBorder = ownedBorders.has(border.id);
          const equipped = pulsy.profileBorderId === border.id;
          return <div className="border-shop-card" key={border.id}>
            <div className={`shop-profile-preview profile-ring ring-${border.id}`}><div className="avatar placeholder"><UserRound size={22} /></div></div>
            <b>{border.name}</b><small>{border.description}</small>
            <span className="pulsy-price"><Zap size={12} fill="currentColor" /> {border.price}</span>
            {!ownedBorder && !equipped && <span className="border-lock" aria-label="Locked"><LockKeyhole size={12} aria-hidden="true" /></span>}
            <button className={equipped ? "secondary-button" : "primary"} onClick={() => onBuy({
              ...border,
              kind: "border"
            })}>
              {equipped ? "Equipped" : ownedBorder ? "Equip" : `Buy · ${border.price}`}
            </button>
          </div>;
        })}
      </div>
      </div>
    </Modal>;
}
function Modal({
  title,
  close,
  children,
  className = ""
}) {
  return <div className="overlay">
      <div className={`modal ${className}`}>
        <header>
          <h3>{title}</h3>
          <button className="icon-btn" onClick={close} aria-label="Close">
            <X />
          </button>
        </header>
        {children}
      </div>
    </div>;
}
function GroupSettingsModal({
  group,
  close,
  onSave
}) {
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [preview, setPreview] = useState(group?.avatar || "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const chooseImage = event => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) return;
    if (selected.size > 5 * 1024 * 1024) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };
  const save = async () => {
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    if (cleanName.length < 2) return;
    setBusy(true);
    try {
      await onSave({
        name: cleanName,
        description: cleanDescription,
        file
      });
    } finally {
      setBusy(false);
    }
  };
  return <Modal title="Group settings" close={close}>
      <div className="group-settings-avatar-wrap">
        {preview ? <img className="group-settings-avatar" src={preview.startsWith("blob:") || preview.startsWith("http") ? preview : `${API}${preview}`} alt="Group" /> : <div className="group-settings-avatar placeholder"><Users size={25} /></div>}
        <label className="group-avatar-upload" title="Change group photo">
          <Camera size={15} />
          <input type="file" accept="image/*" onChange={chooseImage} />
        </label>
      </div>

      <label className="field">
        <span>Group name</span>
        <input className="modal-input" value={name} maxLength={50} onChange={event => setName(event.target.value)} placeholder="Group name" />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea className="modal-textarea" value={description} maxLength={300} onChange={event => setDescription(event.target.value)} placeholder="Add a short group description…" rows={4} dir="auto" />
        <small className="char-count">{description.length}/300</small>
      </label>

      <button className="primary" onClick={save} disabled={busy || name.trim().length < 2}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </Modal>;
}
function SettingsModal({
  user,
  ownedBorders = [],
  borders = PULSY_BORDERS,
  close,
  onSaved
}) {
  const [username, setUsername] = useState(user?.username || "");
  const [preview, setPreview] = useState(user?.avatar || "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selectedBorder, setSelectedBorder] = useState(user?.profile_border_id || "none");
  const fileRef = useRef(null);
  const chooseImage = event => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) return;
    if (selected.size > 5 * 1024 * 1024) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };
  const save = async () => {
    const cleanUsername = username.trim();
    setBusy(true);
    try {
      let updatedUser = user;
      if (cleanUsername && cleanUsername !== user?.username) {
        const usernameResponse = await api.patch("/users/me/username", {
          username: cleanUsername
        });
        localStorage.setItem("pulse_token", usernameResponse.data.token);
        updatedUser = usernameResponse.data.user;
      }
      if (file) {
        const formData = new FormData();
        formData.append("avatar", file);
        const avatarResponse = await api.post("/users/me/avatar", formData);
        updatedUser = avatarResponse.data.user;
      }
      if (selectedBorder !== (user?.profile_border_id || "none")) {
        const endpoint = selectedBorder === "none" ? "/pulsy/borders/none/equip" : `/pulsy/borders/${encodeURIComponent(selectedBorder)}/equip`;
        const borderResponse = await api.post(endpoint);
        updatedUser = {
          ...updatedUser,
          ...borderResponse.data.user,
          profile_border_id: borderResponse.data.profileBorderId
        };
      }
      onSaved(updatedUser);
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not save profile changes.");
    } finally {
      setBusy(false);
    }
  };
  return <Modal title="Profile & settings" close={close}>
      <div className="settings-profile">
        <Avatar user={{
        ...user,
        avatar: preview,
        profile_border_id: selectedBorder === "none" ? null : selectedBorder
      }} />
        <div>
          <b>@{user?.username}</b>
          <small>Choose a profile picture from your device</small>
        </div>
      </div>

      <label className="field profile-username-field">
        <span>Username</span>
        <input className="modal-input" value={username} maxLength={24} onChange={event => setUsername(event.target.value)} placeholder="Username" autoComplete="off" />
        <small className="field-hint">Only available if this username is not already taken.</small>
      </label>

      <input ref={fileRef} type="file" accept="image/*" onChange={chooseImage} hidden />

      <button className="secondary-button" onClick={() => fileRef.current?.click()}>
        <ImagePlus size={17} />
        Choose profile picture
      </button>

      <div className="profile-border-settings">
        <div className="profile-border-settings-head"><span>Profile border</span><small>Choose one you own</small></div>
        <div className="profile-border-settings-options">
          <button type="button" className={`border-choice ${selectedBorder === "none" ? "active" : ""}`} onClick={() => setSelectedBorder("none")}>
            <Avatar user={{
            ...user,
            profile_border_id: null
          }} /><span>None</span>
          </button>
          {borders.filter(border => ownedBorders.includes(border.id)).map(border => <button type="button" key={border.id} className={`border-choice ${selectedBorder === border.id ? "active" : ""}`} onClick={() => setSelectedBorder(border.id)}>
              <Avatar user={{
            ...user,
            profile_border_id: border.id
          }} /><span>{border.name}</span>
            </button>)}
        </div>
        {!ownedBorders.length && <small className="field-hint">Buy a border from Pulsy Shop first.</small>}
      </div>

      <button className="settings-shop-button secondary-button" type="button" onClick={() => window.dispatchEvent(new CustomEvent("pulse:open-shop"))}>
        <ShoppingBag size={17} />
        Open Pulsy Shop
        <span className="settings-shop-balance"><Zap size={12} fill="currentColor" /> {Number(user?.pulsy_balance || 0)}</span>
      </button>

      <button className="primary" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </Modal>;
}
