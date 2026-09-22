import { useRouter } from './router';
import { Nav } from './components/Nav';
import { HomeScreen } from './components/HomeScreen';
import { MidiScreen } from './components/MidiScreen';
import { DrumTestScreen } from './components/DrumTestScreen';
import { LessonsScreen } from './components/LessonsScreen';
import { TrainerScreen } from './components/TrainerScreen';
import { ResultScreen } from './components/ResultScreen';

function App() {
  const { route, navigate } = useRouter();

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <Nav current={route} />
      <main>
        {route.name === 'home' && <HomeScreen navigate={navigate} />}
        {route.name === 'midi' && <MidiScreen />}
        {route.name === 'drumtest' && <DrumTestScreen />}
        {route.name === 'lessons' && <LessonsScreen navigate={navigate} />}
        {route.name === 'trainer' && (
          <TrainerScreen lessonIndex={route.lessonIndex} navigate={navigate} />
        )}
        {route.name === 'result' && (
          <ResultScreen resultIndex={route.resultIndex} navigate={navigate} />
        )}
      </main>
    </div>
  );
}

export default App;
