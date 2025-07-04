import Versions from './components/Versions'
import UpdaterControl from './components/UpdaterControl'
import electronLogo from './assets/electron.svg'
import { Clips } from './components/clips/Clips'
import { ClipsProvider } from './providers/clips'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

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
