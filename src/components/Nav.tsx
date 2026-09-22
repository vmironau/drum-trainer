import { Home, Drum, ListMusic, Music, Settings } from 'lucide-react';
import type { Route } from '../router';
import { routeToHash } from '../router';

const NAV_ITEMS: { route: Route; label: string; icon: typeof Home }[] = [
  { route: { name: 'home' }, label: 'Home', icon: Home },
  { route: { name: 'midi' }, label: 'MIDI', icon: Settings },
  { route: { name: 'drumtest' }, label: 'Drum Test', icon: Drum },
  { route: { name: 'lessons' }, label: 'Lessons', icon: ListMusic },
];

export function Nav({ current }: { current: Route }) {
  const isActive = (r: Route) => r.name === current.name;

  return (
    <nav className="flex items-center gap-1 bg-ink-900/80 backdrop-blur-md border-b border-ink-700/50 px-4 py-3 sticky top-0 z-50">
      <a
        href={`#${routeToHash({ name: 'home' })}`}
        className="flex items-center gap-2 mr-4"
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
          <Music className="w-5 h-5 text-ink-950" />
        </div>
        <span className="text-lg font-bold text-ink-50 tracking-tight">Drum Trainer</span>
      </a>
      <div className="flex items-center gap-1 ml-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.route);
          return (
            <a
              key={item.label}
              href={`#${routeToHash(item.route)}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-accent-500/15 text-accent-400'
                  : 'text-ink-400 hover:text-ink-100 hover:bg-ink-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
