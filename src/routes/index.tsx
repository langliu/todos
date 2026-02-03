import { createFileRoute } from '@tanstack/react-router'
import '../App.css'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div className='App'>
      <header className='App-header'>
        <img src='/tanstack-circle-logo.png' className='App-logo' alt='TanStack Logo' />
        <p className="text-3xl font-bold text-blue-500 mb-4">
          Tailwind CSS v4 is working!
        </p>
        <p>
          Edit <code>src/routes/index.tsx</code> and save to reload.
        </p>
        <a
          className='App-link'
          href='https://reactjs.org'
          target='_blank'
          rel='noopener noreferrer'
        >
          Learn React
        </a>
        <a
          className='App-link'
          href='https://tanstack.com'
          target='_blank'
          rel='noopener noreferrer'
        >
          Learn TanStack
        </a>
      </header>
    </div>
  )
}
