import { Clips } from './components/clips/Clips'
import { ClipsProvider } from './providers/clips'

function App(): React.JSX.Element {
  return (
    <div className="w-full h-full">
      {/* <UpdaterControl /> */}
      <ClipsProvider>
        <Clips />
      </ClipsProvider>
      {/* <Versions></Versions> */}
    </div>
  )
}

export default App
