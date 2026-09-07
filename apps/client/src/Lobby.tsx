import { SocialScene } from './SocialScene';
import { useState } from 'react';
import { characters, type CharacterId } from '@arena/game-data';
import { connect, leave, send, useNetwork } from './network';

export function Lobby() {
  const net = useNetwork();
  const [name, setName] = useState(() => net.lobby?.members.find(m => m.sessionId === net.sessionId)?.name ?? 'Adventurer');
  const [character, setCharacter] = useState<CharacterId>(() => net.lobby?.members.find(m => m.sessionId === net.sessionId)?.character ?? 'warrior');
  const [code, setCode] = useState(new URLSearchParams(location.search).get('room') || '');
  const [copied, setCopied] = useState(false);
  const me = net.lobby?.members.find(m => m.sessionId === net.sessionId);
  const selected = me?.character ?? character;
  const isHost = net.lobby?.hostId === net.sessionId;
  const allReady = !!net.lobby?.members.length && net.lobby.members.every(m => m.ready);
  const profile = (nextName = name, nextCharacter = selected) => { if (me && nextName.trim()) send('profile', { name: nextName, character: nextCharacter }); };
  return <main className="lobby-screen">
    <SocialScene character={selected}/>
    <div className="lobby-shell">
      <header className="lobby-title"><div className="eyebrow">FANTASY ARENA <span>CO-OP PROTOTYPE</span></div><h1>Gather your party.</h1><p>Meet at the tavern. Venture out together.</p></header>
      <div className="lobby-layout">
        <section className="lobby-panel character-panel" aria-label="Your adventurer">
          <div className="eyebrow">01 / YOUR ADVENTURER</div>
          <label className="name-field">Your name<input aria-label="Your name" maxLength={20} value={name} onChange={e => setName(e.target.value)} onBlur={() => profile()} onKeyDown={e => { if (e.key === 'Enter') { profile(); e.currentTarget.blur(); } }} placeholder="Enter a name"/></label>
          <div className="character-choices">{(Object.keys(characters) as CharacterId[]).map(id => <button key={id} className={`character-choice ${selected === id ? 'selected' : ''}`} aria-pressed={selected === id} onClick={() => { setCharacter(id); profile(name, id); }}>
            <span className={`portrait ${id}`} aria-hidden="true"><i className="helmet"/><i className="body"/><i className="blade"/><i className="shield"/></span>
            <span className="character-name">{characters[id].name}</span><span className="small">{characters[id].title}</span>
          </button>)}</div>
          <p className="character-description">{characters[selected].description}</p>
          <div className="character-stats"><span><strong>{characters[selected].health}</strong> HEALTH</span><span><strong>{characters[selected].damage}</strong> DAMAGE</span><span><strong>{characters[selected].speed}</strong> SPEED</span></div>
        </section>
        <section className="lobby-panel party-panel" aria-label="Party lobby">
          <div className="eyebrow">02 / YOUR PARTY <span>{net.lobby ? `${net.lobby.members.length} / 4` : 'UP TO 4 PLAYERS'}</span></div>
          {!net.lobby ? <div className="join-options">
            <h2>A place by the fire</h2><p className="small">Create a lobby and share its code, or join your friends.</p>
            <button className="primary" disabled={net.status === 'connecting' || !name.trim()} onClick={() => void connect(name, selected)}>{net.status === 'connecting' ? 'Connecting…' : 'Create lobby'} <span aria-hidden="true">→</span></button>
            <div className="join-divider">OR JOIN A PARTY</div>
            <label className="name-field">Lobby code<input aria-label="Lobby code" value={code} maxLength={32} onChange={e => setCode(e.target.value)} placeholder="Paste a lobby code"/></label>
            <button className="wide" disabled={net.status === 'connecting' || !code.trim() || !name.trim()} onClick={() => void connect(name, selected, code)}>Join lobby</button>
          </div> : <>
            <div className="room-code"><div><span className="small">LOBBY CODE</span><strong data-testid="room-code">{net.lobby.roomId}</strong></div><button onClick={async () => { try { await navigator.clipboard.writeText(net.lobby!.roomId); setCopied(true); } catch { useNetwork.setState({ error: 'Select and copy the lobby code above.' }); } }}>{copied ? 'Copied' : 'Copy code'}</button></div>
            <div className="party-slots">{Array.from({ length: 4 }, (_, index) => {
              const member = net.lobby!.members[index];
              return <div className={`party-slot ${member ? '' : 'empty'}`} key={index}>{member ? <><span className={`slot-icon ${member.character}`}>⚔</span><div><strong>{member.name} {member.sessionId === net.sessionId && <small>(you)</small>}</strong><span>{characters[member.character].name}{member.sessionId === net.lobby!.hostId ? ' · Host' : ''}</span></div><b className={member.ready ? 'ready-badge' : 'waiting-badge'}>{member.ready ? 'Ready' : 'Not ready'}</b></> : <><span className="slot-icon">+</span><span>Waiting for an adventurer</span></>}</div>;
            })}</div>
            <button className={`wide ready-button ${me?.ready ? 'is-ready' : ''}`} disabled={!name.trim()} onClick={() => { profile(); send('ready', !me?.ready); }}>{me?.ready ? 'Unready' : 'Ready up'}</button>
            {isHost ? <button className="primary" disabled={!allReady} onClick={() => send('launch')}>Launch Level 1 <span aria-hidden="true">→</span></button> : <p className="small lobby-wait">{allReady ? 'Everyone is ready. Waiting for the host to launch.' : 'Ready up when you are happy with your adventurer.'}</p>}
            <button className="text-button" onClick={leave}>Leave lobby</button>
          </>}
          {net.error && <p className="network-error" role="alert">{net.error}</p>}
        </section>
      </div>
      <footer className="lobby-footer"><span>LEVEL 1 <b>THE FOREST TRIAL</b></span><span>WASD / left stick to move · Automatic attacks</span></footer>
    </div>
  </main>;
}


