import { useState } from 'react'

function UpdaterControl(): React.JSX.Element {
  const [updateStatus, setUpdateStatus] = useState<string>('Ready')
  const [isChecking, setIsChecking] = useState(false)

  const handleCheckForUpdates = async (): Promise<void> => {
    setIsChecking(true)
    setUpdateStatus('Checking for updates...')
    
    try {
      const result = await window.api.checkForUpdates()
      if (result) {
        setUpdateStatus('Update available! Downloading...')
        await window.api.downloadUpdate()
        setUpdateStatus('Update downloaded. Click to restart and install.')
      } else {
        setUpdateStatus('No updates available')
      }
    } catch (error) {
      setUpdateStatus('Error checking for updates')
      console.error('Update check failed:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleInstallUpdate = async (): Promise<void> => {
    await window.api.quitAndInstall()
  }

  return (
    <div className="updater-control">
      <div className="updater-status">
        <span>Update Status: {updateStatus}</span>
      </div>
      <div className="updater-actions">
        <button 
          onClick={handleCheckForUpdates} 
          disabled={isChecking}
          className="update-button"
        >
          {isChecking ? 'Checking...' : 'Check for Updates'}
        </button>
        {updateStatus.includes('downloaded') && (
          <button 
            onClick={handleInstallUpdate}
            className="install-button"
          >
            Restart & Install
          </button>
        )}
      </div>
    </div>
  )
}

export default UpdaterControl
