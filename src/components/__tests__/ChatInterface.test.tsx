import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import ChatInterface from '../ChatInterface';

// Mock Clerk
jest.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user' } }),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ search: '' }),
}));

describe('ChatInterface', () => {
  it('renders without crashing', () => {
    render(<ChatInterface />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays message input field', () => {
    render(<ChatInterface />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Type your message...');
  });
});
