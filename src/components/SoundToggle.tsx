import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sound';

export function SoundToggle() {
  const [on, setOn] = useState(() => isSoundEnabled());

  function toggle() {
    const next = !on;
    setSoundEnabled(next);
    setOn(next);
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-muted hover:bg-panel2 hover:text-ink"
      aria-label={on ? 'Mute sound' : 'Enable sound'}
      title={on ? 'Sound on' : 'Sound off'}
    >
      {on ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
    </button>
  );
}
