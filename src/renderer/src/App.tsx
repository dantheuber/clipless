import { Clips } from './components/clips/Clips'
import { ClipsProvider } from './providers/clips'
import { StatusBar } from './components/StatusBar'

function App(): React.JSX.Element {
  return (
    <div className="w-full h-full flex flex-col">
      {/* <UpdaterControl /> */}
      <ClipsProvider>
        <div className="flex-1 overflow-hidden">
          <Clips />
        </div>
        <StatusBar />
      </ClipsProvider>
      {/* <Versions></Versions> */}
    </div>
  )
}

export default App
