import { SocialScene } from './SocialScene';
import { useEffect, useState } from 'react';
import { enemyTypes, upgrades, runRules, type UpgradeId } from '@arena/game-data';
import { leave, send, useNetwork } from './network';
import { exportReport, readReports, saveReport } from './runArchive';

export function Shop() {
  const net = useNetwork();
  const member = net.lobby?.members.find(m => m.sessionId === net.sessionId);
  if (!net.lobby?.run || !member || !net.lobby.run.players.some(p => p.id === member.actorId)) return null;
  return <ShopContent net={net}/>;
}
function ShopContent({ net }: { net: ReturnType<typeof useNetwork.getState> }) {
  const lobby = net.lobby!, run = lobby.run!;
  const member = lobby.members.find(m => m.sessionId === net.sessionId)!;
  const me = run.players.find(p => p.id === member.actorId)!;
  const [showStats, setShowStats] = useState(false);
  const [selected, setSelected] = useState(member.actorId);
  const [saved, setSaved] = useState(false), [showHistory, setShowHistory] = useState(false);
  const [reports, setReports] = useState(readReports);
  useEffect(() => { setSaved(saveReport(run, member.actorId)); setReports(readReports()); }, [run, member.actorId]);
  const player = run.players.find(p => p.id === selected) ?? me;
  const shopping = lobby.stage === 'shop';
  const ready = lobby.members.every(p => p.ready);
  const nextEnemy = Object.values(enemyTypes).find(e => e.unlock === lobby.round + 1 && e !== enemyTypes.boss);
  return <div className={`lobby-screen shop-screen ${shopping ? 'camp-menu' : 'end-menu'}`}>{shopping && <SocialScene camp/>}<div className="lobby-shell">
    <header className="lobby-title"><div className="eyebrow">THE FOREST TRIAL · ROUND {lobby.round} / {runRules.rounds}</div><h1>{lobby.stage === 'won' ? 'You win!' : lobby.stage === 'lost' ? 'The party has fallen.' : 'Rest. Reforge. Return.'}</h1><p>{shopping ? `Round ${lobby.round} cleared. Each adventurer earned ${runRules.reward} gold. Your party returns at full health.` : lobby.stage === 'won' ? 'Ten rounds conquered. Your final expedition report.' : 'Rest where you fell. Retry this level with your upgrades, or return to the tavern.'}</p></header>
    <div className="lobby-layout shop-layout">
      <section className="lobby-panel"><div hidden={!shopping}><div className="shop-heading"><div className="eyebrow">THE QUARTERMASTER</div><strong className="gold" data-testid="gold">{me.gold} gold</strong></div>
        {(Object.keys(upgrades) as UpgradeId[]).map(item => {
          const upgrade = upgrades[item], level = item === 'weapon' ? me.weaponLevel : me.armorLevel;
          const price = upgrade.baseCost + level * upgrade.costStep;
          return <article className="upgrade-card" key={item}><span className="upgrade-icon" aria-hidden="true">{item === 'weapon' ? '⚔' : '⬡'}</span><div><h2>{upgrade.name}</h2><p>{upgrade.description}</p><small>Rank {level} / {upgrade.maxLevel}</small></div><button aria-label={`Buy ${upgrade.name}`} disabled={!shopping || level >= upgrade.maxLevel || me.gold < price} onClick={() => send('buy', item)}>{level >= upgrade.maxLevel ? 'Max rank' : !shopping ? 'Shop closed' : `${price} gold`}</button></article>;
        })}
        </div>
        {shopping && <><p className="next-round">NEXT · ROUND {lobby.round + 1}{(lobby.round + 1) % 5 === 0 ? ' · Forest Warlord boss' : nextEnemy ? ` · ${nextEnemy.name} joins the horde` : ' · The forest trial'}</p><div className="shop-party">{lobby.members.map(m => <div key={m.sessionId}><span>{m.name}{m.sessionId === net.sessionId ? ' (you)' : ''}</span><b className={m.ready ? 'ready-badge' : 'waiting-badge'}>{m.ready ? 'Ready' : 'Shopping'}</b></div>)}</div><button className="wide ready-button" onClick={() => send('ready', !member.ready)}>{member.ready ? 'Unready' : 'Ready for next round'}</button>{lobby.hostId === net.sessionId ? <button className="primary" disabled={!ready} onClick={() => send('launch')}>Start round {lobby.round + 1}</button> : <p className="small lobby-wait">The host starts the next round when everyone is ready.</p>}</>}
        {!shopping && lobby.stage === 'lost' && lobby.hostId === net.sessionId && <button className="primary" onClick={() => send('retry')}>Retry level {lobby.round}</button>}
        {!shopping && (lobby.hostId === net.sessionId ? <button className="primary" onClick={() => send('return')}>Back to lobby</button> : <p className="small lobby-wait">Waiting for the host to retry or return the party to the lobby.</p>)}
        <button className="wide stats-toggle" aria-expanded={showStats} onClick={() => setShowStats(!showStats)}>{showStats ? 'Hide player stats' : 'View player stats'}</button>
        <button className="text-button" onClick={leave}>Leave party</button>
        {net.error && <p className="network-error" role="alert">{net.error}</p>}
      </section>
      <section hidden={!showStats} className="lobby-panel report-panel" aria-label="Play statistics"><div className="shop-heading"><div className="eyebrow">EXPEDITION RECORD</div><button onClick={() => setShowHistory(!showHistory)}>{showHistory ? 'Current run' : 'Saved runs'}</button></div>
        {showHistory ? <div className="saved-reports">{reports.length === 0 ? <p>No saved runs yet.</p> : reports.map(report => { const p = report.run.players.find(p => p.id === report.playerId); return <article key={report.key}><strong>{p?.name ?? 'Adventurer'} · {report.run.result === 'won' ? 'Victory' : report.run.result === 'lost' ? 'Defeat' : 'In progress'}</strong><p>{report.run.roundsCompleted} rounds cleared · {p?.stats.totalDamage.toLocaleString()} damage</p><small>{new Date(report.savedAt).toLocaleString()}</small><details><summary>Weapon breakdown</summary>{Object.entries(p?.stats.damageByWeapon ?? {}).map(([weapon, damage]) => <p key={weapon}>{weapon === 'weapon.longsword' ? 'Longsword' : weapon}: {damage.toLocaleString()} damage</p>)}</details><button onClick={() => exportReport(report.run)}>Export JSON</button></article>; })}</div> : <>
          <label className="name-field">Adventurer<select aria-label="Statistics player" value={player.id} onChange={e => setSelected(Number(e.target.value))}>{run.players.map(p => <option key={p.id} value={p.id}>{p.name}{p.id === me.id ? ' (you)' : ''}</option>)}</select></label>
          <div className="report-totals"><div><strong data-testid="total-damage">{player.stats.totalDamage.toLocaleString()}</strong><span>TOTAL DAMAGE</span></div><div><strong>{player.stats.kills}</strong><span>ENEMIES SLAIN</span></div><div><strong>{player.stats.damageTaken}</strong><span>DAMAGE TAKEN</span></div><div><strong>{run.roundsCompleted} / 10</strong><span>ROUNDS CLEARED</span></div></div>
          <h2>Damage by weapon</h2><table className="weapon-stats"><thead><tr><th>Weapon</th><th>Damage</th></tr></thead><tbody>{Object.entries(player.stats.damageByWeapon).map(([id, value]) => <tr key={id}><td>{id === 'weapon.longsword' ? 'Longsword' : id}</td><td>{value.toLocaleString()}</td></tr>)}</tbody></table>
          <p className="small">Totals accumulate across this run, including failed attempts. Damage measures health removed, excluding overkill. Sword upgrades contribute to the same weapon total.</p><button className="wide" onClick={() => exportReport(run)}>Export run statistics</button>
        </>}
        <p className="save-status" role="status">{saved ? 'Saved on this browser · latest 20 run reports' : 'Browser storage unavailable. Export JSON to save your report.'}</p>
      </section>
    </div>
  </div></div>;
}

