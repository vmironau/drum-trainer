import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'midi' }
  | { name: 'drumtest' }
  | { name: 'lessons' }
  | { name: 'trainer'; lessonIndex: number }
  | { name: 'result'; resultIndex: number };

function parseHash(): Route {
  const hash = window.location.hash.slice(1);
  const parts = hash.split('/');
  if (parts[0] === 'midi') return { name: 'midi' };
  if (parts[0] === 'drumtest') return { name: 'drumtest' };
  if (parts[0] === 'lessons') return { name: 'lessons' };
  if (parts[0] === 'trainer' && parts[1]) return { name: 'trainer', lessonIndex: Number(parts[1]) };
  if (parts[0] === 'result' && parts[1]) return { name: 'result', resultIndex: Number(parts[1]) };
  return { name: 'home' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home': return '';
    case 'midi': return 'midi';
    case 'drumtest': return 'drumtest';
    case 'lessons': return 'lessons';
    case 'trainer': return `trainer/${route.lessonIndex}`;
    case 'result': return `result/${route.resultIndex}`;
  }
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((r: Route) => {
    window.location.hash = routeToHash(r);
  }, []);

  return { route, navigate };
}
