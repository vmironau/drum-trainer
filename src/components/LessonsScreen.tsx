import { ListMusic, Play, Music2 } from 'lucide-react';
import { LESSONS } from '../lessons/lessons';
import type { Route } from '../router';
import { routeToHash } from '../router';

export function LessonsScreen({ navigate }: { navigate: (r: Route) => void }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-lg bg-ink-700/50 flex items-center justify-center">
          <ListMusic className="w-6 h-6 text-accent-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink-50">Lessons</h1>
          <p className="text-ink-400 text-sm">Step-based deliberate practice</p>
        </div>
      </div>

      <div className="space-y-3">
        {LESSONS.map((lesson, i) => (
          <a
            key={lesson.id}
            href={`#${routeToHash({ name: 'trainer', lessonIndex: i })}`}
            onClick={(e) => {
              e.preventDefault();
              navigate({ name: 'trainer', lessonIndex: i });
            }}
            className="group flex items-center gap-4 bg-ink-800/60 border border-ink-700/50 rounded-xl p-5 hover:border-accent-500/40 hover:bg-ink-800 transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent-400/20 to-accent-600/20 flex items-center justify-center group-hover:from-accent-400/30 group-hover:to-accent-600/30 transition-colors">
              <Music2 className="w-6 h-6 text-accent-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-ink-50">{lesson.title}</h3>
              <div className="flex items-center gap-4 text-sm text-ink-400 mt-0.5">
                <span>{lesson.bpm} BPM</span>
                <span>
                  {lesson.timeSignature.numerator}/{lesson.timeSignature.denominator}
                </span>
                <span>{lesson.steps.length} steps</span>
              </div>
              {lesson.description && (
                <p className="text-ink-500 text-sm mt-1">{lesson.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-accent-400 text-sm font-medium">
              <span className="hidden sm:inline">Start</span>
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
