import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import App from '../App'
import type { Mock } from 'vitest'

vi.mock('axios')
const mockedAxios = vi.mocked(axios)
const mockedGet = axios.get as Mock

vi.mock('./hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value)
}))

const mockPerformanceNow = vi.fn()
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
})

describe('App Component', () => {
  const mockUsers = [
    { login: 'testuser1' },
    { login: 'testuser2' },
    { login: 'testuser3' }
  ]
  const mockRepos = [
    {
      id: 1,
      name: 'repo1',
      description: 'Test repository 1',
      stargazers_count: 100
    },
    {
      id: 2,
      name: 'repo2',
      description: 'Test repository 2',
      stargazers_count: 50
    },
    {
      id: 3,
      name: 'repo3',
      description: null,
      stargazers_count: 0
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockPerformanceNow.mockReturnValue(1000)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Initial Render', () => {
    it('renders the main title and search input', () => {
      render(<App />)
      expect(screen.getByText('GitHub User Explorer')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter GitHub username')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('renders in centered layout initially', () => {
      render(<App />)
      const container = screen.getByText('GitHub User Explorer').closest('div')
      expect(container).toHaveClass('justify-center', 'h-[80vh]')
    })

    it('has search button disabled when input is empty', () => {
      render(<App />)
      const searchButton = screen.getByRole('button', { name: /search/i })
      expect(searchButton).toBeDisabled()
    })
  })

  describe('User Input and Search', () => {
    it('enables search button when input has value', async () => {
      const user = userEvent.setup()
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.type(input, 'testuser')
      expect(searchButton).not.toBeDisabled()
    })

    it('shows clear button when input has value', async () => {
      const user = userEvent.setup()
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      await user.type(input, 'testuser')
      expect(screen.getByLabelText('Clear input')).toBeInTheDocument()
    })

    it('clears input when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      await user.type(input, 'testuser')
      await user.click(screen.getByLabelText('Clear input'))
      expect(input).toHaveValue('')
    })

    it('focuses input after clearing', async () => {
      const user = userEvent.setup()
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      await user.type(input, 'testuser')
      await user.click(screen.getByLabelText('Clear input'))
      expect(input).toHaveFocus()
    })
  })

  describe('User Search API', () => {
    it('makes API call when search button is clicked', async () => {
      const user = userEvent.setup()
      mockedGet.mockResolvedValueOnce({ data: { items: mockUsers } })
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.type(input, 'testuser')
      await user.click(searchButton)
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/search/users?q=testuser&per_page=10')
    })

    it('shows loading state during user search', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockedGet.mockReturnValueOnce(promise as unknown)
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.type(input, 'testuser')
      await user.click(searchButton)
      expect(screen.getAllByTestId('loading-skeleton-user').length).toBeGreaterThan(0)
      resolvePromise!({ data: { items: mockUsers } })
      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton-user')).not.toBeInTheDocument()
      })
    })

    it('displays users after successful search', async () => {
      const user = userEvent.setup()
      mockedGet.mockResolvedValueOnce({ data: { items: mockUsers } })
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.type(input, 'testuser')
      await user.click(searchButton)
      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument()
        expect(screen.getByText('testuser2')).toBeInTheDocument()
        expect(screen.getByText('testuser3')).toBeInTheDocument()
      })
    })

    it('displays search time after successful search', async () => {
      const user = userEvent.setup()
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1500)
      mockedGet.mockResolvedValueOnce({ data: { items: mockUsers } })
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.type(input, 'testuser')
      await user.click(searchButton)
      await waitFor(() => {
        expect(screen.getByText(/Showing users for "testuser" completed in 500ms/)).toBeInTheDocument()
      })
    })

    it('handles API error gracefully', async () => {
      const user = userEvent.setup()
      mockedGet.mockRejectedValueOnce(new Error('API Error'))
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.type(input, 'testuser')
      await user.click(searchButton)
      await waitFor(() => {
        expect(screen.getByText('Failed to fetch users.')).toBeInTheDocument()
      })
    })

    it('changes layout when results are present', async () => {
      const user = userEvent.setup()
      mockedGet.mockResolvedValueOnce({ data: { items: mockUsers } })
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.type(input, 'testuser')
      await user.click(searchButton)
      await waitFor(() => {
        const container = screen.getByText('GitHub User Explorer').closest('div')
        expect(container).toHaveClass('mt-4', 'max-w-3xl', 'mx-auto')
        expect(container).not.toHaveClass('justify-center', 'h-[80vh]')
      })
    })
  })

  describe('Repository Loading', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      mockedGet.mockResolvedValueOnce({ data: { items: mockUsers } })
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.type(input, 'testuser')
      await user.click(searchButton)
      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument()
      })
    })

    it('loads repositories when accordion item is clicked', async () => {
      const user = userEvent.setup()
      mockedGet.mockResolvedValueOnce({ data: mockRepos })
      await user.click(screen.getByText('testuser1'))
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/users/testuser1/repos')
    })

    it('shows loading state when loading repositories', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockedGet.mockReturnValueOnce(promise as unknown)
      await user.click(screen.getByText('testuser1'))
      expect(screen.getAllByTestId('loading-skeleton').length).toBeGreaterThan(0)
      resolvePromise!({ data: mockRepos })
      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
      })
    })

    it('displays repositories after loading', async () => {
      const user = userEvent.setup()
      mockedGet.mockResolvedValueOnce({ data: mockRepos })
      await user.click(screen.getByText('testuser1'))
      await waitFor(() => {
        expect(screen.getByText('repo1')).toBeInTheDocument()
        expect(screen.getByText('repo2')).toBeInTheDocument()
        expect(screen.getByText('repo3')).toBeInTheDocument()
        expect(screen.getByText('Test repository 1')).toBeInTheDocument()
        expect(screen.getByText('Test repository 2')).toBeInTheDocument()
      })
    })

    it('displays star counts correctly', async () => {
      const user = userEvent.setup()
      mockedGet.mockResolvedValueOnce({ data: mockRepos })
      await user.click(screen.getByText('testuser1'))
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('50')).toBeInTheDocument()
        expect(screen.getByText('0')).toBeInTheDocument()
      })
    })

    it('handles repositories with no description', async () => {
      const user = userEvent.setup()
      mockedGet.mockResolvedValueOnce({ data: mockRepos })
      await user.click(screen.getByText('testuser1'))
      await waitFor(() => {
        expect(screen.getByText('No description')).toBeInTheDocument()
      })
    })

    it('displays message when no repositories found', async () => {
      const user = userEvent.setup()
      mockedGet.mockResolvedValueOnce({ data: [] })
      await user.click(screen.getByText('testuser1'))
      await waitFor(() => {
        expect(screen.getByText('No repositories found.')).toBeInTheDocument()
      })
    })

    it('does not re-fetch repos on second click (cache works)', async () => {
      const user = userEvent.setup()
      mockedGet.mockResolvedValueOnce({ data: mockRepos })
      await user.click(screen.getByText('testuser1'))
      await waitFor(() => {
        expect(screen.getByText('repo1')).toBeInTheDocument()
      })
      mockedGet.mockClear()
      await user.click(screen.getByText('testuser1'))
      expect(mockedAxios.get).not.toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('does not search when input is empty or whitespace', async () => {
      const user = userEvent.setup()
      render(<App />)
      const input = screen.getByPlaceholderText('Enter GitHub username')
      const searchButton = screen.getByRole('button', { name: /search/i })

      await user.type(input, '   ')
      expect(searchButton).toBeDisabled()
      await user.clear(input)
      expect(searchButton).toBeDisabled()
    })
  })
})
