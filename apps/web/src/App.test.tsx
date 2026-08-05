import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders the honest GeoOps bootstrap screen', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /consola operacional geoespacial/i })).toBeTruthy();
    expect(screen.getByText(/sin modelos ni fuentes reales todavía/i)).toBeTruthy();
  });
});
