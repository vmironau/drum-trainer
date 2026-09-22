import { Music, Drum, ListMusic, Settings, ArrowRight } from 'lucide-react';
import type { Route } from '../router';
import { routeToHash } from '../router';

const CARDS: {
  route: Route;
  title: string;
  desc: string;
  icon: typeof Music;
}[] = [
  {
    route: { name: 'midi' },
    title: 'MIDI Devices',
    desc: 'Connect your electronic drum kit via USB MIDI',
    icon: Settings,
  },
  {
    route: { name: 'drumtest' },
    title: 'Drum Test',
    desc: 'Hit any pad to see the instrument and velocity',
    icon: Drum,
  },
  {
    route: { name: 'lessons' },
    title: 'Lessons',
    desc: 'Start learning with beginner rock patterns',
    icon: ListMusic,
  },
];

export function HomeScreen({ navigate }: { navigate: (r: Route) => void }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 mb-6 shadow-lg shadow-accent-500/20">
          <Music className="w-10 h-10 text-ink-950" />
        </div>
        <h1 className="text-4xl font-bold text-ink-50 mb-3 tracking-tight">
          Drum Trainer
        </h1>
        <p className="text-ink-400 text-lg max-w-md mx-auto">
          Learn electronic drums with real-time timing feedback. Connect your kit
          and start practicing.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <a
              key={card.title}
              href={`#${routeToHash(card.route)}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(card.route);
              }}
              className="group bg-ink-800/60 border border-ink-700/50 rounded-xl p-6 hover:border-accent-500/40 hover:bg-ink-800 transition-all duration-200 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-lg bg-ink-700/50 flex items-center justify-center mb-4 group-hover:bg-accent-500/15 transition-colors">
                <Icon className="w-6 h-6 text-ink-300 group-hover:text-accent-400 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-ink-50 mb-1">{card.title}</h3>
              <p className="text-sm text-ink-400 mb-3">{card.desc}</p>
              <div className="flex items-center gap-1 text-accent-400 text-sm font-medium">
                <span>Open</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
