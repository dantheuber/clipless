import UpdaterControl from './components/UpdaterControl'
import Versions from './components/Versions'
import { ClipsProvider } from './providers/clips'
import { StorageSettings } from './components/StorageSettings'

function App(): React.JSX.Element {
  return (
    <div className="w-full h-full p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Clipless Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure your clipboard manager preferences
          </p>
        </header>

        <ClipsProvider>
          <div className="grid gap-6">
            {/* Storage Settings Section */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Storage & Clips
              </h2>
              <StorageSettings />
            </section>

            {/* App Updates Section */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Application Updates
              </h2>
              <UpdaterControl />
            </section>

            {/* Version Information */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Version Information
              </h2>
              <Versions />
            </section>
          </div>
        </ClipsProvider>
      </div>
    </div>
  )
}

export default App
