/**
 * Frontend API Client for CineGraph
 */
const BASE_URL = '/api';

export const Api = {
  async getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    return await res.json();
  },

  async getStats() {
    const res = await fetch(`${BASE_URL}/stats`);
    return await res.json();
  },

  async getMovies({ search = '', genre = '', yearMin = '', yearMax = '' } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (genre) params.append('genre', genre);
    if (yearMin) params.append('yearMin', yearMin);
    if (yearMax) params.append('yearMax', yearMax);
    const res = await fetch(`${BASE_URL}/movies?${params.toString()}`);
    return await res.json();
  },

  async getMovie(title) {
    const res = await fetch(`${BASE_URL}/movies/${encodeURIComponent(title)}`);
    return await res.json();
  },

  async createMovie(data) {
    const res = await fetch(`${BASE_URL}/movies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateMovie(oldTitle, data) {
    const res = await fetch(`${BASE_URL}/movies/${encodeURIComponent(oldTitle)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async deleteMovie(title) {
    const res = await fetch(`${BASE_URL}/movies/${encodeURIComponent(title)}`, {
      method: 'DELETE'
    });
    return await res.json();
  },

  async addReview(title, reviewData) {
    const res = await fetch(`${BASE_URL}/movies/${encodeURIComponent(title)}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    });
    return await res.json();
  },

  async getGenres() {
    const res = await fetch(`${BASE_URL}/genres`);
    return await res.json();
  },

  async getPeople() {
    const res = await fetch(`${BASE_URL}/people`);
    return await res.json();
  },

  async getDegreesOfSeparation(person1, person2) {
    const params = new URLSearchParams({ person1, person2 });
    const res = await fetch(`${BASE_URL}/paths/degrees?${params.toString()}`);
    return await res.json();
  },

  async getRecommendations(title) {
    const res = await fetch(`${BASE_URL}/recommendations/${encodeURIComponent(title)}`);
    return await res.json();
  },

  async getCoStars() {
    const res = await fetch(`${BASE_URL}/collaborations/costars`);
    return await res.json();
  },

  async getGraphData(centerTitle = '') {
    const url = centerTitle 
      ? `${BASE_URL}/graph/visualization?centerTitle=${encodeURIComponent(centerTitle)}`
      : `${BASE_URL}/graph/visualization`;
    const res = await fetch(url);
    return await res.json();
  },

  async runCustomCypher(query) {
    const res = await fetch(`${BASE_URL}/cypher/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return await res.json();
  }
};
