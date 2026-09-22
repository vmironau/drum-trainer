import { useEffect, useState } from 'react';
import { Trophy, ArrowLeft, RotateCcw, ListMusic } from 'lucide-react';
import { getLastResult, getLastSessionResult, subscribeToResult } from '../state/resultStore';
import type { LessonResult } from '../domain/LessonResult';
import type { Route } from '../router';
import { routeToHash } from '../router';

const RATING_COLORS: Record<string, string> = {
  perfect: 'text-success-400 bg-success-500/10 border-success-500/30',
  good: 'text-accent-400 bg-accent-500/10 border-accent-500/30',
  ok: 'text-warning-400 bg-warning-500/10 border-warning-500/30',
  miss: 'text-error-400 bg-error-500/10 border-error-500/30',
};

export function ResultScreen({
  resultIndex,
  navigate,
}: {
  resultIndex: number;
  navigate: (r: Route) => void;
}) {
  const [result, setResult] = useState<LessonResult | null>(getLastResult());

  useEffect(() => {
    const unsub = subscribeToResult(() => setResult(getLastResult()));
    return unsub;
  }, []);

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <p className="text-ink-400 mb-4">No lesson result available.</p>
        <a
          href="#lessons"
          onClick={(e) => {
            e.preventDefault();
            navigate({ name: 'lessons' });
          }}
          className="text-accent-400 hover:underline"
        >
          Back to Lessons
        </a>
      </div>
    );
  }

  const accuracyColor =
    result.accuracy >= 80 ? 'text-success-400' :
    result.accuracy >= 50 ? 'text-warning-400' :
    'text-error-400';

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <a
          href={`#${routeToHash({ name: 'trainer', lessonIndex: resultIndex })}`}
          onClick={(e) => {
            e.preventDefault();
            navigate({ name: 'trainer', lessonIndex: resultIndex });
          }}
          className="p-2 rounded-lg bg-ink-700/50 text-ink-300 hover:text-ink-100 hover:bg-ink-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-ink-50">{result.lessonName}</h1>
          <p className="text-ink-400 text-sm">Lesson Complete</p>
        </div>
      </div>

      {/* Accuracy display */}
      <div className="bg-ink-800/60 border border-ink-700/50 rounded-xl p-8 text-center mb-6">
        <Trophy className="w-12 h-12 text-accent-400 mx-auto mb-4" />
        <p className="text-ink-400 text-sm uppercase tracking-wide mb-2">Accuracy</p>
        <p className={`text-6xl font-bold font-mono ${accuracyColor}`}>
          {result.accuracy}%
        </p>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className={`rounded-lg border p-4 text-center ${RATING_COLORS.perfect}`}>
          <p className="text-xs uppercase tracking-wide opacity-70 mb-1">Perfect</p>
          <p className="text-3xl font-bold font-mono">{result.perfect}</p>
        </div>
        <div className={`rounded-lg border p-4 text-center ${RATING_COLORS.good}`}>
          <p className="text-xs uppercase tracking-wide opacity-70 mb-1">Good</p>
          <p className="text-3xl font-bold font-mono">{result.good}</p>
        </div>
        <div className={`rounded-lg border p-4 text-center ${RATING_COLORS.ok}`}>
          <p className="text-xs uppercase tracking-wide opacity-70 mb-1">OK</p>
          <p className="text-3xl font-bold font-mono">{result.ok}</p>
        </div>
        <div className={`rounded-lg border p-4 text-center ${RATING_COLORS.miss}`}>
          <p className="text-xs uppercase tracking-wide opacity-70 mb-1">Miss</p>
          <p className="text-3xl font-bold font-mono">{result.miss}</p>
        </div>
      </div>

      {/* Wrong instrument */}
      {result.wrongInstrument > 0 && (
        <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-4 mb-6 text-center">
          <p className="text-error-400 text-sm">
            {result.wrongInstrument} hit{result.wrongInstrument > 1 ? 's' : ''} with the wrong instrument
          </p>
        </div>
      )}

      {/* Total */}
      <div className="text-center text-ink-400 text-sm mb-8">
        {result.totalHits} total notes
      </div>

      {getLastSessionResult() && (
        <div className="mb-8 space-y-2">
          <p className="text-ink-400 text-xs uppercase tracking-wide mb-2">Per step</p>
          {getLastSessionResult()!.stepResults.map((s) => (
            <div
              key={s.stepId}
              className="flex items-center justify-between rounded-lg border border-ink-700/50 bg-ink-800/40 px-4 py-3 text-sm"
            >
              <span className="text-ink-200">{s.stepTitle}</span>
              <span className="font-mono text-accent-400">{s.accuracy}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => navigate({ name: 'trainer', lessonIndex: resultIndex })}
          className="flex items-center gap-2 px-5 py-3 rounded-lg bg-accent-500 text-ink-950 font-semibold hover:bg-accent-400 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Try Again
        </button>
        <button
          onClick={() => navigate({ name: 'lessons' })}
          className="flex items-center gap-2 px-5 py-3 rounded-lg bg-ink-700/50 text-ink-300 font-medium hover:bg-ink-700 transition-colors"
        >
          <ListMusic className="w-5 h-5" />
          All Lessons
        </button>
      </div>
    </div>
  );
}
