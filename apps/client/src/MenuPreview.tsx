import { useState } from 'react';
import { SocialScene } from './SocialScene';
import { characters, type CharacterId } from '@arena/game-data';

const screens = ['Welcome', 'Adventurer', 'Party', 'Camp shop', 'Pause', 'Victory', 'Defeat', 'Statistics'] as const;
type Screen = typeof screens[number];
/** Isolated presentation sandbox: sample values never enter multiplayer state. */
export function MenuPreview() {
  const [screen, setScreen] = useState<Screen>('Welcome');
  const [character, setCharacter] = useState<CharacterId>('warrior');
  const [ready, setReady] = useState(false);
  const [gold, setGold] = useState(150);
  const [purchased, setPurchased] = useState(false);
  const [sound, setSound] = useState(true);
  return <main className="ui-preview">
    <SocialScene character={character} camp={screen === 'Camp shop'}/>
    <nav className="preview-nav" aria-label="Menu previews">{screens.map(s => <button key={s} aria-pressed={s === screen} onClick={() => setScreen(s)}>{s}</button>)}<a href="/">Play game →</a></nav>
    <div className="preview-stage"><section className="preview-panel" aria-label={screen}>
      <div className="eyebrow">FANTASY ARENA · THE FOREST TRIAL</div>
      {screen === 'Welcome' && <><h1>Adventure awaits.</h1><p>A fire to gather around. A forest to conquer.<br/>Four adventurers. Ten rounds. One party.</p><button className="primary" onClick={() => setScreen('Adventurer')}>Gather your party →</button><button onClick={() => setScreen('Statistics')}>Expedition records</button></>}
      {screen === 'Adventurer' && <><h1>Choose your calling.</h1><label className="name-field">Adventurer name<input defaultValue="Adventurer" maxLength={20}/></label><div className="character-choices">{(Object.keys(characters) as CharacterId[]).map(id => <button key={id} className={`character-choice ${character === id ? 'selected' : ''}`} aria-pressed={character === id} onClick={() => setCharacter(id)}>{characters[id].name}</button>)}</div><p>{characters[character].description}</p><div className="character-stats"><span><strong>{characters[character].health}</strong>HEALTH</span><span><strong>{characters[character].damage}</strong>DAMAGE</span><span><strong>{characters[character].speed}</strong>SPEED</span></div><button className="primary" onClick={() => setScreen('Party')}>Continue →</button></>}
      {screen === 'Party' && <><h1>A place by the fire.</h1><div className="room-code"><span>PARTY CODE</span><strong>EMBER7</strong></div>{['You · '+characters[character].name,'Rowan · Guardian','Waiting for adventurer…','Waiting for adventurer…'].map((name,i) => <div className="party-slot" key={name}><div><strong>{name}</strong></div><span>{i===0 ? ready ? 'Ready' : 'Not ready' : i===1 ? 'Ready' : '—'}</span></div>)}<button onClick={() => setReady(!ready)}>{ready ? 'Unready' : 'Ready up'}</button><button className="primary" disabled={!ready} onClick={() => setScreen('Pause')}>Enter the forest →</button></>}
      {screen === 'Camp shop' && <><h1>Rest. Reforge. Return.</h1><div className="shop-heading"><span className="eyebrow">THE QUARTERMASTER</span><strong className="gold">{gold} gold</strong></div><p>Round 3 cleared. Prepare for the next wave.</p><div className="preview-row"><span><h2>Ember blade</h2><p>A burning edge for the battles ahead.</p></span><button className="secondary" disabled={purchased} onClick={() => {setGold(gold-75);setPurchased(true);}}>{purchased ? 'Equipped' : '75 gold'}</button></div><button className="secondary" aria-pressed={ready} onClick={() => setReady(!ready)}>{ready ? 'Unready' : 'Ready for next round'}</button><button className="primary" disabled={!ready} onClick={() => setScreen('Pause')}>Start round 4 →</button><button className="secondary" onClick={() => setScreen('Statistics')}>View player stats</button></>}
      {screen === 'Pause' && <><h1>A moment of respite.</h1><p>Single-player pause menu. In multiplayer, the party continues fighting.</p><button className="primary" onClick={() => setScreen('Welcome')}>Return to preview</button><button aria-pressed={sound} onClick={() => setSound(!sound)}>Sound {sound ? 'on' : 'off'}</button><button onClick={() => setScreen('Welcome')}>Return to tavern</button></>}
      {(screen === 'Victory' || screen === 'Defeat') && <><div className="result-icon" aria-hidden="true">{screen === 'Victory' ? '✧' : '⚔'}</div><h1>{screen === 'Victory' ? 'The forest remembers.' : 'The party has fallen.'}</h1><p>{screen === 'Victory' ? 'Ten rounds conquered. Together, you stood against the horde.' : 'Your journey is not over. Keep your upgrades and attempt the round again.'}</p><button className="primary" onClick={() => setScreen(screen === 'Victory' ? 'Party' : 'Pause')}>{screen === 'Victory' ? 'Back to the tavern' : 'Retry round 4'}</button><button onClick={() => setScreen('Statistics')}>View expedition record</button></>}
      {screen === 'Statistics' && <><h1>Expedition record.</h1><p>Adventurer · Warrior</p><div className="report-totals">{[['12,480','DAMAGE DEALT'],['186','ENEMIES SLAIN'],['340','DAMAGE TAKEN'],['10 / 10','ROUNDS CLEARED']].map(([v,l]) => <div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div><h2>Damage by weapon</h2><div className="preview-row"><span>Longsword</span><strong>4,200</strong></div><div className="preview-row"><span>Ember blade</span><strong>8,280</strong></div><button className="primary" onClick={() => setScreen('Party')}>Back to party</button></>}
    </section><p className="preview-note">Menu art preview · sample data and local interactions</p></div>
  </main>;
}

