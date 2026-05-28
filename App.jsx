import { useState, useEffect, useRef } from "react";

const USERS_DEF = {
  Lucas:    { password: "012012", color: "#fddb92" },
  Renan:    { password: "252011", color: "#ff6b6b" },
  Lucca:    { password: "768798", color: "#a8ff78" },
  Giovanni: { password: "112509", color: "#f7971e" },
  Cristian: { password: "032311", color: "#c471ed" },
  Ruan:     { password: "094578", color: "#12c2e9" },
  Diego:    { password: "378901", color: "#f64f59" },
  Théo:     { password: "769840", color: "#00e5ff" },
};

const ALL_USERS = Object.keys(USERS_DEF);

const INITIAL_STATE = {
  roles: {
    Lucas: "dono", Renan: "leadAdmin",
    Lucca: "normal", Giovanni: "normal",
    Cristian: "normal", Ruan: "normal",
    Diego: "normal", Théo: "normal",
  },
  suspended: {},
  groups: {
    "Chat Geral": { members: ALL_USERS.slice(), messages: [], groupMember: null },
    "Chat 1":     { members: [], messages: [], groupMember: null },
    "Resenha 1":  { members: [], messages: [], groupMember: null },
    "Chat 3":     { members: [], messages: [], groupMember: null },
  },
  pendingRequests: [],
};

let _ch = null;
try { _ch = new BroadcastChannel("chatsec_v3"); } catch {}
let _state = JSON.parse(JSON.stringify(INITIAL_STATE));
let _listeners = [];
function subState(fn) { _listeners.push(fn); return () => { _listeners = _listeners.filter(l => l !== fn); }; }
function pushState(s) { _state = s; _listeners.forEach(fn => fn(s)); if (_ch) _ch.postMessage({ type: "state", state: s }); }

function rankPower(r) { return { dono:5, leadAdmin:4, admin:3, membro:2, normal:1 }[r] || 1; }
function rankLabel(r) { return { dono:"👑 Dono", leadAdmin:"⭐ Lead Admin", admin:"🛡 Admin", membro:"🔑 Membro", normal:"👤 Normal" }[r] || "👤 Normal"; }
function rankColor(r) { return { dono:"#fddb92", leadAdmin:"#ff6b6b", admin:"#c471ed", membro:"#12c2e9", normal:"#555" }[r] || "#555"; }
function canAccess(u, g, s) {
  const r = s.roles[u];
  if (r === "dono" || r === "leadAdmin" || r === "admin") return true;
  return s.groups[g]?.members.includes(u);
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
}

export default function App() {
  const [user, setUser]           = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [pwdInput, setPwdInput]   = useState("");
  const [loginErr, setLoginErr]   = useState("");
  const [appState, setAppState]   = useState(_state);
  const [activeGroup, setActiveGroup] = useState(null);
  const [input, setInput]         = useState("");
  const [panel, setPanel]         = useState("chat"); // "chat" | "admin"
  const [adminTab, setAdminTab]   = useState("usuarios");
  const [isMobile, setIsMobile]   = useState(window.innerWidth < 640);
  const [showGroups, setShowGroups] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (_ch) _ch.onmessage = (e) => { if (e.data?.type === "state") { _state = e.data.state; setAppState({..._state}); } };
    const unsub = subState(s => setAppState({...s}));
    return () => { unsub(); if (_ch) _ch.onmessage = null; };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [appState, activeGroup]);

  // When switching to mobile chat view, hide groups
  useEffect(() => {
    if (isMobile && activeGroup) setShowGroups(false);
  }, [activeGroup, isMobile]);

  function doLogin() {
    const key = ALL_USERS.find(k => k.toLowerCase() === nameInput.trim().toLowerCase());
    if (!key) { setLoginErr("Usuário não encontrado."); return; }
    if (pwdInput !== USERS_DEF[key].password) { setLoginErr("Senha incorreta."); return; }
    if (appState.suspended[key]) { setLoginErr("Conta suspensa."); return; }
    const firstGroup = Object.keys(appState.groups).find(g => canAccess(key, g, appState));
    setUser(key);
    setActiveGroup(firstGroup || null);
    setLoginErr("");
    setNameInput("");
    setPwdInput("");
  }

  function doSend() {
    const text = input.trim();
    if (!text || !activeGroup) return;
    setInput("");
    const ns = JSON.parse(JSON.stringify(appState));
    ns.groups[activeGroup].messages.push({ id: Date.now()+Math.random(), user, text, ts: Date.now() });
    pushState(ns);
  }

  function deleteMsg(group, id) {
    const ns = JSON.parse(JSON.stringify(appState));
    ns.groups[group].messages = ns.groups[group].messages.filter(m => m.id !== id);
    pushState(ns);
  }

  // ── LOGIN ──────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ minHeight:"100vh", background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", padding:16 }}>
        <div style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:20, padding:"40px 32px", width:"100%", maxWidth:300, display:"flex", flexDirection:"column", gap:14, boxShadow:"0 20px 60px #000" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:6, color:"#f0f0f0" }}>CHATSEC</div>
            <div style={{ fontSize:10, color:"#444", letterSpacing:3, marginTop:4 }}>CANAL PRIVADO</div>
          </div>

          <input
            type="text"
            placeholder="Nome"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doLogin()}
            style={{ width:"100%", boxSizing:"border-box", background:"#1a1a1a", border:"1.5px solid #2a2a2a", borderRadius:10, padding:"12px 16px", color:"#eee", fontSize:14, fontFamily:"monospace", outline:"none" }}
          />

          <input
            type="password"
            placeholder="Senha"
            value={pwdInput}
            onChange={e => setPwdInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doLogin()}
            style={{ width:"100%", boxSizing:"border-box", background:"#1a1a1a", border:"1.5px solid #2a2a2a", borderRadius:10, padding:"12px 16px", color:"#eee", fontSize:14, fontFamily:"monospace", outline:"none" }}
          />

          {loginErr && <div style={{ color:"#ff6b6b", fontSize:12, textAlign:"center" }}>{loginErr}</div>}

          <button onClick={doLogin} style={{ width:"100%", padding:"13px 0", borderRadius:10, border:"none", fontWeight:700, fontSize:14, letterSpacing:3, cursor:"pointer", fontFamily:"monospace", background:"#fddb92", color:"#0d0d0d" }}>
            ENTRAR
          </button>
        </div>
      </div>
    );
  }

  const role   = appState.roles[user] || "normal";
  const power  = rankPower(role);
  const myColor = USERS_DEF[user].color;
  const groups = Object.keys(appState.groups);

  // ── ADMIN PANEL ────────────────────────────────────────────
  if (panel === "admin") {
    return <AdminPanel user={user} role={role} power={power} myColor={myColor}
      appState={appState} pushState={pushState} ALL_USERS={ALL_USERS}
      rankLabel={rankLabel} rankColor={rankColor} rankPower={rankPower}
      adminTab={adminTab} setAdminTab={setAdminTab}
      onBack={() => setPanel("chat")} />;
  }

  // ── SIDEBAR ────────────────────────────────────────────────
  const Sidebar = (
    <div style={{
      width: isMobile ? "100%" : 160,
      background:"#0d0d0d",
      borderRight: isMobile ? "none" : "1px solid #1a1a1a",
      borderBottom: isMobile ? "1px solid #1a1a1a" : "none",
      overflowY:"auto",
      flexShrink: 0,
      display:"flex", flexDirection:"column",
    }}>
      {groups.map(g => {
        const accessible = canAccess(user, g, appState);
        const active = g === activeGroup;
        const msgs = appState.groups[g].messages;
        const last = msgs.length > 0 ? msgs[msgs.length-1] : null;
        return (
          <button key={g} onClick={() => { if (!accessible) return; setActiveGroup(g); if (isMobile) setShowGroups(false); }} style={{
            background: active ? "#1e1e1e" : "transparent",
            border:"none",
            borderLeft: !isMobile ? (active ? `3px solid ${myColor}` : "3px solid transparent") : "none",
            borderBottom: isMobile ? "1px solid #151515" : "none",
            padding:"10px 12px",
            textAlign:"left",
            cursor: accessible ? "pointer" : "default",
            fontFamily:"monospace",
            width:"100%",
            boxSizing:"border-box",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight: active ? 700 : 400, color: active ? myColor : accessible ? "#ccc" : "#444" }}>{g}</span>
              {last && <span style={{ fontSize:9, color:"#444", marginLeft:6, flexShrink:0 }}>{fmtTime(last.ts)}</span>}
            </div>
            {last
              ? <div style={{ fontSize:9, color:"#444", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {accessible ? `${last.user[0]}: ${last.text}` : last.text}
                </div>
              : accessible && <div style={{ fontSize:9, color:"#252525", marginTop:2 }}>Sem mensagens</div>
            }
          </button>
        );
      })}
    </div>
  );

  const msgs = activeGroup ? appState.groups[activeGroup].messages : [];

  // ── CHAT ───────────────────────────────────────────────────
  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"#0a0a0a", fontFamily:"monospace" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"1px solid #1a1a1a", background:"#0f0f0f", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {isMobile && activeGroup && !showGroups && (
            <button onClick={() => setShowGroups(true)} style={{ background:"none", border:"none", color:"#555", fontSize:18, cursor:"pointer", padding:"0 6px 0 0" }}>←</button>
          )}
          <span style={{ width:8, height:8, borderRadius:"50%", background:myColor, display:"inline-block" }}/>
          <span style={{ color:myColor, fontWeight:700, fontSize:12 }}>{user}</span>
          <span style={{ fontSize:9, color:rankColor(role), background:"#1a1a1a", borderRadius:6, padding:"2px 7px" }}>{rankLabel(role)}</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {power >= 3 && (
            <button onClick={() => setPanel("admin")} style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", color:"#aaa", borderRadius:8, padding:"5px 10px", fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>⚙</button>
          )}
          <button onClick={() => { setUser(null); setActiveGroup(null); }} style={{ background:"transparent", border:"1px solid #222", color:"#555", borderRadius:8, padding:"5px 10px", fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>Sair</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:"flex", flexDirection: isMobile ? "column" : "row", overflow:"hidden" }}>

        {/* Show sidebar: always on desktop, conditionally on mobile */}
        {(!isMobile || showGroups) && Sidebar}

        {/* Chat area: on mobile hide when showing groups */}
        {(!isMobile || !showGroups) && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            {!activeGroup ? (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#2a2a2a", fontSize:12 }}>Selecione um grupo</div>
            ) : (
              <>
                <div style={{ padding:"8px 14px", borderBottom:"1px solid #1a1a1a", background:"#0f0f0f", fontSize:11, color:"#666", fontWeight:700, letterSpacing:1, flexShrink:0 }}>
                  {activeGroup}
                </div>
                <div style={{ flex:1, overflowY:"auto", padding:"14px 12px 6px", display:"flex", flexDirection:"column", gap:12 }}>
                  {msgs.length === 0 && <div style={{ color:"#222", textAlign:"center", marginTop:40, fontSize:11 }}>Nenhuma mensagem ainda.</div>}
                  {msgs.map(m => {
                    const isMe = m.user === user;
                    const c = USERS_DEF[m.user]?.color || "#aaa";
                    return (
                      <div key={m.id} style={{ display:"flex", alignItems:"flex-end", gap:6, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                        {!isMe && (
                          <div style={{ width:26, height:26, borderRadius:"50%", background:c, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#0d0d0d", flexShrink:0 }}>{m.user[0]}</div>
                        )}
                        <div style={{ maxWidth:"70%", display:"flex", flexDirection:"column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                          <div style={{
                            padding:"7px 12px 9px", wordBreak:"break-word", fontSize:13, lineHeight:1.6,
                            borderRadius:14, borderBottomRightRadius: isMe?3:14, borderBottomLeftRadius: isMe?14:3,
                            background: isMe ? myColor : "#1c1c1c", color: isMe ? "#0d0d0d" : "#ddd",
                            display:"inline-block", minWidth:"fit-content",
                          }}>
                            {!isMe && <div style={{ fontSize:10, fontWeight:700, color:c, marginBottom:2, whiteSpace:"nowrap" }}>{m.user}</div>}
                            {m.text}
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                            <span style={{ fontSize:9, color:"#333" }}>{fmtTime(m.ts)}</span>
                            {power >= 3 && (
                              <button onClick={() => deleteMsg(activeGroup, m.id)} style={{ background:"none", border:"none", color:"#f64f59", fontSize:9, cursor:"pointer", padding:0, fontFamily:"monospace" }}>✕</button>
                            )}
                          </div>
                        </div>
                        {isMe && (
                          <div style={{ width:26, height:26, borderRadius:"50%", background:myColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#0d0d0d", flexShrink:0 }}>{m.user[0]}</div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={bottomRef}/>
                </div>
                <div style={{ display:"flex", gap:8, padding:"10px 12px", borderTop:"1px solid #1a1a1a", background:"#0f0f0f", flexShrink:0 }}>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && doSend()}
                    placeholder="Escreva uma mensagem..."
                    style={{ flex:1, boxSizing:"border-box", background:"#1a1a1a", border:"1.5px solid #252525", borderRadius:12, padding:"10px 14px", color:"#eee", fontSize:13, fontFamily:"monospace", outline:"none" }}
                  />
                  <button onClick={doSend} disabled={!input.trim()} style={{ width:40, height:40, borderRadius:12, border:"none", fontSize:16, cursor:input.trim()?"pointer":"default", fontWeight:700, flexShrink:0, background:input.trim()?myColor:"#1a1a1a", color:input.trim()?"#0d0d0d":"#444" }}>↑</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────
function AdminPanel({ user, role, power, myColor, appState, pushState, ALL_USERS, rankLabel, rankColor, rankPower, adminTab, setAdminTab, onBack }) {

  function setRole(target, newRole) {
    if (target === user && role !== "dono") return;
    const ns = JSON.parse(JSON.stringify(appState));
    if (newRole === "leadAdmin") Object.keys(ns.roles).forEach(u => { if (ns.roles[u]==="leadAdmin") ns.roles[u]="normal"; });
    if (newRole === "dono") Object.keys(ns.roles).forEach(u => { if (ns.roles[u]==="dono") ns.roles[u]="leadAdmin"; });
    ns.roles[target] = newRole;
    pushState(ns);
  }

  function toggleSuspend(target) {
    const ns = JSON.parse(JSON.stringify(appState));
    ns.suspended[target] = !ns.suspended[target];
    pushState(ns);
  }

  function toggleMember(group, target) {
    const ns = JSON.parse(JSON.stringify(appState));
    const g = ns.groups[group];
    g.members = g.members.includes(target) ? g.members.filter(u => u!==target) : [...g.members, target];
    pushState(ns);
  }

  function setGroupMember(group, target) {
    const ns = JSON.parse(JSON.stringify(appState));
    ns.groups[group].groupMember = ns.groups[group].groupMember === target ? null : target;
    if (target && !ns.groups[group].members.includes(target)) ns.groups[group].members.push(target);
    pushState(ns);
  }

  function approveReq(req) {
    const ns = JSON.parse(JSON.stringify(appState));
    if (!ns.groups[req.group].members.includes(req.from)) ns.groups[req.group].members.push(req.from);
    ns.pendingRequests = ns.pendingRequests.filter(r => r.id !== req.id);
    pushState(ns);
  }

  function rejectReq(req) {
    const ns = JSON.parse(JSON.stringify(appState));
    ns.pendingRequests = ns.pendingRequests.filter(r => r.id !== req.id);
    pushState(ns);
  }

  const tabs = ["usuarios","grupos","pedidos"];

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"#0a0a0a", fontFamily:"monospace" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"1px solid #1a1a1a", background:"#0f0f0f" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#555", fontSize:18, cursor:"pointer" }}>←</button>
          <span style={{ color:myColor, fontWeight:700, fontSize:13, letterSpacing:2 }}>PAINEL ADMIN</span>
        </div>
        <span style={{ fontSize:9, color:rankColor(role), background:"#1a1a1a", borderRadius:6, padding:"2px 8px" }}>{rankLabel(role)}</span>
      </div>

      <div style={{ display:"flex", borderBottom:"1px solid #1a1a1a" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setAdminTab(t)} style={{
            flex:1, padding:"10px 0", border:"none", fontFamily:"monospace", fontSize:11, letterSpacing:1, cursor:"pointer",
            background: adminTab===t ? "#1a1a1a" : "#0d0d0d",
            color: adminTab===t ? myColor : "#555",
            borderBottom: adminTab===t ? `2px solid ${myColor}` : "2px solid transparent",
          }}>{t.toUpperCase()}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:14 }}>

        {adminTab==="usuarios" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {ALL_USERS.map(u => {
              const uRole = appState.roles[u] || "normal";
              const uPower = rankPower(uRole);
              const suspended = !!appState.suspended[u];
              const canEdit = power > uPower || power === 5;
              const isMe = u === user;
              return (
                <div key={u} style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: canEdit && !isMe ? 8 : 0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:USERS_DEF[u].color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#0d0d0d" }}>{u[0]}</div>
                      <div>
                        <div style={{ color:USERS_DEF[u].color, fontWeight:700, fontSize:12 }}>{u}{isMe ? " (você)" : ""}</div>
                        <div style={{ fontSize:9, color:rankColor(uRole) }}>{rankLabel(uRole)}{suspended ? " 🚫 SUSPENSO":""}</div>
                      </div>
                    </div>
                    {canEdit && !isMe && (
                      <button onClick={() => toggleSuspend(u)} style={{ background: suspended?"#2a1a1a":"#1a1a1a", border:`1px solid ${suspended?"#f64f59":"#555"}`, color: suspended?"#f64f59":"#777", borderRadius:7, padding:"4px 10px", fontSize:10, cursor:"pointer", fontFamily:"monospace" }}>
                        {suspended ? "Reativar" : "Suspender"}
                      </button>
                    )}
                  </div>
                  {canEdit && !isMe && (
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                      {["normal","membro","admin","leadAdmin","dono"].map(r => {
                        if (r==="dono" && power < 5) return null;
                        if (r==="leadAdmin" && power < 5) return null;
                        if (r==="admin" && power < 4) return null;
                        return (
                          <button key={r} onClick={() => setRole(u, r)} style={{
                            padding:"4px 9px", borderRadius:6, fontSize:9, cursor:"pointer", fontFamily:"monospace", border:"none",
                            background: uRole===r ? rankColor(r) : "#1a1a1a",
                            color: uRole===r ? "#0d0d0d" : "#555",
                          }}>{rankLabel(r)}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {adminTab==="grupos" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {Object.keys(appState.groups).map(g => {
              const grp = appState.groups[g];
              const isExtra = g !== "Chat Geral";
              return (
                <div key={g} style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ color:"#eee", fontWeight:700, fontSize:12, marginBottom:10 }}>
                    {g} <span style={{ color:"#444", fontWeight:400, fontSize:10 }}>({grp.members.length} membros)</span>
                  </div>
                  {isExtra && (
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:9, color:"#555", marginBottom:5, letterSpacing:1 }}>MEMBRO RESPONSÁVEL</div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        {ALL_USERS.map(u => (
                          <button key={u} onClick={() => power>=3 && setGroupMember(g, u)} style={{
                            padding:"4px 9px", borderRadius:6, fontSize:9, cursor:power>=3?"pointer":"default", fontFamily:"monospace", border:"none",
                            background: grp.groupMember===u ? USERS_DEF[u].color : "#1a1a1a",
                            color: grp.groupMember===u ? "#0d0d0d" : "#555",
                          }}>{u}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize:9, color:"#555", marginBottom:5, letterSpacing:1 }}>MEMBROS</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {ALL_USERS.map(u => {
                      const isMember = grp.members.includes(u);
                      const canToggle = g !== "Chat Geral" && power >= 3;
                      return (
                        <button key={u} onClick={() => canToggle && toggleMember(g, u)} style={{
                          padding:"4px 9px", borderRadius:6, fontSize:9, cursor:canToggle?"pointer":"default", fontFamily:"monospace", border:"none",
                          background: isMember ? USERS_DEF[u].color : "#1a1a1a",
                          color: isMember ? "#0d0d0d" : "#444",
                        }}>{u}</button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {adminTab==="pedidos" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {appState.pendingRequests.length === 0 && (
              <div style={{ color:"#333", textAlign:"center", marginTop:40, fontSize:11 }}>Nenhum pedido pendente.</div>
            )}
            {appState.pendingRequests.map(req => (
              <div key={req.id} style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                <div>
                  <div style={{ color:USERS_DEF[req.from]?.color||"#eee", fontWeight:700, fontSize:12 }}>{req.from}</div>
                  <div style={{ fontSize:10, color:"#555" }}>quer entrar em <span style={{ color:"#aaa" }}>{req.group}</span></div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={() => approveReq(req)} style={{ background:"#1a2a1a", border:"1px solid #a8ff78", color:"#a8ff78", borderRadius:7, padding:"5px 10px", fontSize:10, cursor:"pointer", fontFamily:"monospace" }}>✓</button>
                  <button onClick={() => rejectReq(req)} style={{ background:"#2a1a1a", border:"1px solid #f64f59", color:"#f64f59", borderRadius:7, padding:"5px 10px", fontSize:10, cursor:"pointer", fontFamily:"monospace" }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

