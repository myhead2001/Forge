import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import App from './App';

describe('App Component', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders loading status initially', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'UP' }),
    });

    render(<App />);
    expect(screen.getByText(/Backend Health Status:/i)).toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent('LOADING');
  });

  it('renders status UP on successful fetch', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'UP' }),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('UP');
    });
  });

  it('renders status ERROR on failed fetch', async () => {
    fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ERROR');
    });
  });
});
