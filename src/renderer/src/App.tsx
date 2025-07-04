import { Clips } from './components/clips/Clips'
import { ClipsProvider, useClips, createTextClip, createHtmlClip, createImageClip, createRtfClip, createBookmarkClip } from './providers/clips'

function TestButtons(): React.JSX.Element {
  const { clipboardUpdated } = useClips()

  const addTestClips = () => {
    clipboardUpdated(createTextClip('Hello, this is a text clip!'))
    clipboardUpdated(createHtmlClip('<b>Bold HTML content</b>'))
    clipboardUpdated(
      createImageClip(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      )
    )
    clipboardUpdated(
      createRtfClip(
        '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}} \\f0\\fs24 Hello RTF!}'
      )
    )
    clipboardUpdated(createBookmarkClip('Google', 'https://www.google.com'))
  }

  return (
    <div style={{ padding: '1rem', borderBottom: '1px solid #374151' }}>
      <button
        onClick={addTestClips}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#374151',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
        }}
      >
        Add Test Clips
      </button>
    </div>
  )
}

function App(): React.JSX.Element {
  return (
    <div className="w-full h-full">
      {/* <UpdaterControl /> */}
      <ClipsProvider>
        <TestButtons />
        <Clips />
      </ClipsProvider>
      {/* <Versions></Versions> */}
    </div>
  )
}

export default App
