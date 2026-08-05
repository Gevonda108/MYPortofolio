import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

test('suggestions and reviews can be stored and retrieved via the API', { skip: !hasDatabaseUrl }, async () => {
  const app = createApp();
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const suggestionsResponse = await fetch(`${baseUrl}/api/suggestions`);
    assert.equal(suggestionsResponse.status, 200);
    assert.deepEqual(await suggestionsResponse.json(), []);

    const suggestionResponse = await fetch(`${baseUrl}/api/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Ada', message: 'Add more projects' }),
    });
    assert.equal(suggestionResponse.status, 200);
    const createdSuggestion = await suggestionResponse.json();
    assert.equal(createdSuggestion.username, 'Ada');

    const secondSuggestionResponse = await fetch(`${baseUrl}/api/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Grace', message: 'Add a contact form' }),
    });
    assert.equal(secondSuggestionResponse.status, 200);
    const latestSuggestionsResponse = await fetch(`${baseUrl}/api/suggestions`);
    const latestSuggestions = await latestSuggestionsResponse.json();
    assert.equal(latestSuggestions[0].username, 'Grace');
    assert.equal(latestSuggestions[1].username, 'Ada');

    const reviewsResponse = await fetch(`${baseUrl}/api/reviews`);
    assert.equal(reviewsResponse.status, 200);
    assert.deepEqual(await reviewsResponse.json(), []);

    const reviewResponse = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Grace', review: 'Amazing work', stars: 5, help: 'Portfolio guidance' }),
    });
    assert.equal(reviewResponse.status, 200);
    const createdReview = await reviewResponse.json();
    assert.equal(createdReview.name, 'Grace');

    const secondReviewResponse = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ada', review: 'Very helpful', stars: 4, help: 'Design feedback' }),
    });
    assert.equal(secondReviewResponse.status, 200);
    const latestReviewsResponse = await fetch(`${baseUrl}/api/reviews`);
    const latestReviews = await latestReviewsResponse.json();
    assert.equal(latestReviews[0].name, 'Ada');
    assert.equal(latestReviews[1].name, 'Grace');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
