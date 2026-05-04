// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Example API mock
  // If the app makes fetch calls to a 3rd party AI service or backend APIs
  http.post('https://api.example.com/v1/scan', () => {
    return HttpResponse.json({
      success: true,
      data: {
        title: 'Mock Recipe from MSW',
        ingredients: ['1 Apple', '1 Cup Sugar']
      }
    });
  }),
];
