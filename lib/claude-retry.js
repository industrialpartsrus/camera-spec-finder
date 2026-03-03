// lib/claude-retry.js
// Shared retry logic for Claude API calls (handles 529/503/429 overload errors)

export async function callClaudeWithRetry(client, params, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.messages.create(params);
      return response;
    } catch (error) {
      const isOverloaded = error.status === 529 ||
        error.status === 503 ||
        error.status === 429;

      if (isOverloaded && attempt < maxRetries - 1) {
        // Exponential backoff: 2s, 4s, 8s
        const waitTime = Math.pow(2, attempt + 1) * 1000;
        console.warn(
          `Claude API overloaded (attempt ${attempt + 1}/${maxRetries}), ` +
          `retrying in ${waitTime/1000}s...`
        );
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      throw error;
    }
  }
}
