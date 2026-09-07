export class InputManager {
  keys = new Set<string>(); device = 'keyboard'; previousPause = false; previousConfirm = false;
  constructor(private command: (key: string) => void) {}
  down = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    this.device = 'keyboard';
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) this.command(e.code);
    this.keys.add(e.code);
  };
  up = (e: KeyboardEvent) => { this.keys.delete(e.code); };
  clear = () => { this.keys.clear(); };
  mount() { window.addEventListener('keydown', this.down); window.addEventListener('keyup', this.up); window.addEventListener('blur', this.clear); return () => { window.removeEventListener('keydown', this.down); window.removeEventListener('keyup', this.up); window.removeEventListener('blur', this.clear); }; }
  read() {
    let x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    let z = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    const pad = Array.from(navigator.getGamepads?.() ?? []).find(p => p?.connected);
    if (pad) {
      const px = pad.axes[0] ?? 0, pz = pad.axes[1] ?? 0, m = Math.hypot(px, pz);
      if (m > .18) { const strength = Math.min(1, (m - .18) / .82); x = px / m * strength; z = pz / m * strength; this.device = 'gamepad'; }
      const pause = !!pad.buttons[9]?.pressed, confirm = !!pad.buttons[0]?.pressed;
      if (pause && !this.previousPause) { this.device = 'gamepad'; this.command('Escape'); }
      if (confirm && !this.previousConfirm) { this.device = 'gamepad'; this.command('Enter'); }
      this.previousPause = pause; this.previousConfirm = confirm;
    } else { this.previousPause = this.previousConfirm = false; }
    return { x, z };
  }
}
