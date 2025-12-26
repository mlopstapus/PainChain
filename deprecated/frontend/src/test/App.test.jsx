import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import App from '../App'

// Mock fetch globally
global.fetch = vi.fn()

describe('App', () => {
  it('renders without crashing', () => {
    // Mock fetch to return empty data
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    })

    // App already has BrowserRouter inside, don't wrap it again
    render(<App />)

    // Basic sanity check - app should render
    expect(document.body).toBeTruthy()
  })
})
