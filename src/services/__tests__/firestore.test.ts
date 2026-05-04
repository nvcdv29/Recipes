import { describe, it, expect, vi } from 'vitest';
import { handleFirestoreError } from '../firestore';
import { OperationType } from '../../types';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  }
}));

describe('handleFirestoreError', () => {
  it('should format error string and throw', () => {
    expect(() => {
      handleFirestoreError(new Error('test db error'), OperationType.CREATE, 'path/to/doc');
    }).toThrow('test db error');
  });

  it('should format message if not instance of error', () => {
    expect(() => {
      handleFirestoreError('string error', OperationType.DELETE, 'users');
    }).toThrow('string error');
  });
});
