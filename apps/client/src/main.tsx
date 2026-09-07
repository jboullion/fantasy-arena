import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { type Config, defaults } from '@arena/game-data';
import { Scene } from './Scene';
import { audio, input, pause, refresh, restart, sim, useUI } from './runtime';
import './style.css';
import { Lobby } from './Lobby';
import { characters } from '@arena/game-data';
import { leave, networked, send, useNetwork } from './network';
import { Shop } from './Shop';

const fields: [keyof Config, string, number, number, number][] = [
  ['playerSpeed', 'Warrior speed', 2, 12, .5], ['enemySpeed', 'Goblin speed', .5, 7, .25],
  ['enemyHealth', 'Goblin health · new spawns', 10, 150, 5], ['swordDamage', 'Sword damage', 5, 100, 5],
  ['swordRange', 'Sword reach', 1, 5, .1], ['swordCooldown', 'Seconds per attack', .2, 2, .05],
  ['swordArc', 'Swing arc', 60, 180, 5], ['knockback', 'Knockback', 0, 15, .5],
  ['spawnInterval', 'Spawn interval', .2, 4, .1], ['maxEnemies', 'Enemy cap', 25, 500, 25],
  ['cameraHeight', 'Camera height', 12, 30, 1], ['cameraDistance', 'Camera distance', 10, 25, 1], ['cameraFov', 'Field of view', 35, 65, 1],
];
function DebugPanel() {
  const ui = useUI();
  return <aside className="debug" aria-label="Combat tuning">
    <div className="panel-heading"><h2>Combat lab</h2><button onClick={() => useUI.setState({ debug: false })} aria-label="Close tuning">×</button></div>
    <div className="metrics"><span>{ui.fps} FPS</span><span>{sim.enemies.length} alive</span><span>{ui.simulationMs.toFixed(2)} ms sim</span></div>
    <p className="small">Live changes. Heal, clear and stress tests mark this run as assisted.</p>
    <div className="stress" aria-label="Stress presets">{[25, 50, 100, 200].map(n => <button key={n} onClick={() => { sim.assisted = true; sim.config.maxEnemies = Math.max(n, sim.config.maxEnemies); sim.enemies = []; sim.spawn(n); refresh(); }}>{n}</button>)}</div>
    {fields.map(([key, label, min, max, step]) => <label className="slider" key={key}><span>{label}<output>{Number(sim.config[key].toFixed(2))}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={sim.config[key]} onChange={e => { sim.config[key] = Number(e.target.value); sim.assisted = true; refresh(); }}/></label>)}
    <p className="small">Target #{sim.targetId ?? '—'} · Spawn multiplier {sim.spawnScale.toFixed(2)}×</p>
    <div className="debug-actions"><button onClick={() => { sim.player.hp = sim.config.playerHealth; sim.assisted = true; refresh(); }}>Heal · H</button><button onClick={() => { sim.killAll(); refresh(); }}>Clear · K</button></div>
    <button className="wide" onClick={() => { Object.assign(sim.config, defaults); sim.spawnScale = 1; restart(); }}>Reset defaults & restart</button>
    <p className="small">R restart · + / − spawn pressure · F2 tuning<br/>Arena dimensions: packages/game-data/src/index.ts</p>
  </aside>;
}
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  render() { return this.state.error ? <div className="fallback"><h1>Unable to start the arena</h1><p>{this.state.error}</p><button onClick={() => location.reload()}>Reload</button></div> : this.props.children; }
}
function App() {
  const ui = useUI();
  const net = useNetwork();
  const [finishedDeath, setFinishedDeath] = useState(false);
  useEffect(() => {
    setFinishedDeath(false);
    if (net.lobby?.stage !== 'lost') return;
    const timer = window.setTimeout(() => setFinishedDeath(true), 1600);
    return () => window.clearTimeout(timer);
  }, [net.lobby?.stage]);
  const showingDeath = net.status === 'connected' && net.lobby?.stage === 'lost' && !finishedDeath;
  useEffect(() => {
    const detach = input.mount();
    const blur = () => { if (networked) { input.clear(); send('input', { x: 0, z: 0 }); useNetwork.setState({ menu: true }); } else if (sim.phase === 'playing') { sim.phase = 'paused'; refresh(); } };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pointerdown', audio.unlock);
    return () => { detach(); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pointerdown', audio.unlock); };
  }, []);
  if (networked && !showingDeath && net.status === 'connected' && net.lobby && ['shop', 'won', 'lost'].includes(net.lobby.stage)) return <Shop/>;
  if (networked && !showingDeath && (net.status !== 'connected' || net.lobby?.stage !== 'game')) return <Lobby/>;
  const seconds = Math.max(0, Math.ceil(sim.config.duration - sim.time));
  const over = sim.phase === 'dead' || sim.phase === 'complete';
  return <main>
    <ErrorBoundary><Scene/></ErrorBoundary>
    <div className={`damage-vignette ${sim.player.flash > 0 ? 'active' : ''}`}/>
    <header className="hud">
      <div className="identity"><span className="crest">⚔</span><div><div className="eyebrow">FANTASY ARENA <span>0.1</span></div><h1>The forest trial</h1></div></div>
      <div className="health-label"><span>{networked ? sim.player.name : 'WARRIOR'}</span><span>{sim.player.hp} <small>/ {sim.player.maxHealth}</small></span></div>
      <div className="health" role="progressbar" aria-label="Warrior health" aria-valuemin={0} aria-valuemax={sim.player.maxHealth} aria-valuenow={sim.player.hp}><i style={{ width: `${sim.player.hp / sim.player.maxHealth * 100}%` }}/></div>
      <div className="stats"><div><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong><span>TO SURVIVE</span></div><div><strong>{String(sim.kills).padStart(2, '0')}</strong><span>ENEMIES SLAIN</span></div></div>
    </header>
    {networked && <aside className="team-hud" aria-label="Team">{sim.players.map(p => <div key={p.id}><span className={`team-dot ${p.character}`}/><span>{p.name}{p.id === sim.localPlayerId ? ' (you)' : ''}<small>{characters[p.character].name}</small></span><b>{p.hp > 0 ? `${p.hp} HP` : 'Fallen'}</b></div>)}</aside>}
    <nav className="tools" aria-label="Game controls"><button onClick={pause}>{networked ? 'Menu' : sim.phase === 'paused' ? 'Resume' : 'Pause'} <kbd>Esc</kbd></button><button aria-pressed={ui.muted} onClick={() => { audio.muted = !audio.muted; useUI.setState({ muted: audio.muted }); }}>{ui.muted ? 'Sound off' : 'Sound on'}</button>{!networked && <button aria-expanded={ui.debug} onClick={() => useUI.setState({ debug: !ui.debug })}>Tune <kbd>F2</kbd></button>}</nav>
    <div className="controls"><span className="key-cluster">{ui.device === 'gamepad' ? 'LEFT STICK' : 'W A S D'}</span><span>Move <b>·</b> Your sword attacks automatically</span></div>
    <div className="slice-label">{networked ? `ROUND ${net.lobby?.round} / 10 · ${sim.players.length} ADVENTURERS · TEAM KILLS` : 'CORE COMBAT SANDBOX'} {sim.assisted && <span>· ASSISTED RUN</span>}</div>
    {networked && <div className="round-banner">Round {net.lobby?.round} / 10{sim.enemies.some(e => e.enemyType === 'boss') && <span> · Defeat the Forest Warlord{seconds === 0 ? ' to finish the round' : ''}</span>}</div>}
    {sim.enemies.filter(e => e.enemyType === 'boss').map(boss => <div className="boss-health" key={boss.id}><span>FOREST WARLORD · {boss.hp} / {boss.maxHealth}</span><div><i style={{width:`${boss.hp / (boss.maxHealth || 1) * 100}%`}}/></div></div>)}
    {ui.debug && !networked && <DebugPanel/>}
    {networked && sim.player.hp <= 0 && !over && <div className="fallen-message">You have fallen. Your party is still fighting.</div>}
    {networked && net.menu && !over && <div className="scrim"><section className="result" role="dialog" aria-modal="true" aria-label="Game menu"><h2>Your party fights on</h2><p>Multiplayer keeps running while this menu is open.</p><button className="primary" onClick={pause}>Return to game</button><button className="text-button" onClick={leave}>Leave game</button></section></div>}
    {networked && over && !showingDeath && <div className="scrim"><section className="result" role="dialog" aria-modal="true" aria-label="Round result"><div className="eyebrow">LEVEL 1 · THE FOREST TRIAL</div><h2>{sim.phase === 'complete' ? 'Round complete' : 'Your party has fallen'}</h2><p>{sim.kills} goblins slain · {sim.time.toFixed(1)} seconds survived</p>{net.lobby?.hostId === net.sessionId ? <button className="primary" onClick={() => send('return')}>Back to lobby</button> : <p className="small">Waiting for the host to return the party to the lobby.</p>}<button className="text-button" onClick={leave}>Leave party</button></section></div>}
    {!networked && (over || sim.phase === 'paused') && <div className="scrim"><section className="result" role="dialog" aria-modal="true" aria-label={sim.phase === 'paused' ? 'Paused' : 'Round result'}>
      <div className="eyebrow">THE FOREST TRIAL</div><div className="result-icon">{sim.phase === 'complete' ? '✧' : sim.phase === 'dead' ? '⚔' : 'Ⅱ'}</div>
      <h2>{sim.phase === 'complete' ? 'Round complete' : sim.phase === 'dead' ? 'You died' : 'Take a breath'}</h2>
      <p>{sim.phase === 'paused' ? 'The clearing can wait.' : `${sim.kills} goblins slain · ${sim.time.toFixed(1)} seconds survived`}</p>
      {sim.assisted && <p className="small">Assisted / tuned run</p>}
      <button className="primary" autoFocus onClick={sim.phase === 'paused' ? pause : restart}>{sim.phase === 'paused' ? 'Return to the clearing' : 'Try again'} <span>↵</span></button>
      <p className="small">{ui.device === 'gamepad' ? 'A / Cross to continue' : sim.phase === 'paused' ? 'Esc or Enter to resume' : 'R or Enter to restart'}</p>
    </section></div>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
