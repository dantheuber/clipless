import Versions from './components/Versions'
import UpdaterControl from './components/UpdaterControl'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      <UpdaterControl />
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      
      {/* Tailwind CSS Test */}
      <div className="bg-blue-500 text-white p-4 rounded-lg shadow-lg mb-4 max-w-md text-center">
        <h2 className="text-xl font-bold mb-2">Tailwind CSS is working!</h2>
        <p className="text-sm">This blue box is styled with Tailwind utility classes.</p>
      </div>
      
      <div className="actions">
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div>
      </div>
      <Versions></Versions>
    </>
  )
}

export default App
