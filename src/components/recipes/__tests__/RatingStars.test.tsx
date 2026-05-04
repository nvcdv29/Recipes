import { render, fireEvent } from '@testing-library/react';
import { RatingStars } from '../RatingStars';
import { vi, test, expect } from 'vitest';

test('renders correct number of filled and empty stars', () => {
  const { container } = render(<RatingStars rating={3.5} count={10} />);
  // Should render 5 stars total (filled/half/empty depending on the rating)
  const svgElements = container.querySelectorAll('svg');
  // It renders rating out of 5.
  expect(svgElements.length).toBe(5);
});

test('handles interactive state properly', () => {
  const onRate = vi.fn();
  const { container } = render(<RatingStars rating={0} interactive={true} onRate={onRate} />);
  const buttons = container.querySelectorAll('button');
  
  fireEvent.mouseEnter(buttons[2]);
  fireEvent.mouseLeave(buttons[2]);
  fireEvent.click(buttons[3]);

  expect(onRate).toHaveBeenCalledWith(4);
});
