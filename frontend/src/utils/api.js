/**
 * API client — handles auth tokens and request formatting.
 */

const BASE_URL = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('brandguard_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('brandguard_token', token);
    } else {
      localStorage.removeItem('brandguard_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('brandguard_token');
  }

  async request(path, options = {}) {
    const headers = { ...options.headers };
    const token = this.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 204) return null;

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || `Request failed: ${res.status}`);
    }

    return data;
  }

  // Auth
  async register(email, name, password, role = 'member', team = '') {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password, role, team }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async getTeam() {
    return this.request('/auth/team');
  }

  logout() {
    this.setToken(null);
  }

  // Rule Sets
  async getRuleSets() {
    return this.request('/rulesets/');
  }

  async createRuleSet(data) {
    return this.request('/rulesets/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadBrandKit(file, name = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    return this.request('/rulesets/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async activateRuleSet(id) {
    return this.request(`/rulesets/${id}/activate`, { method: 'POST' });
  }

  async deleteRuleSet(id) {
    return this.request(`/rulesets/${id}`, { method: 'DELETE' });
  }

  // Guidelines
  async getGuidelines(category = null, ruleSetId = null) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (ruleSetId) params.set('rule_set_id', ruleSetId);
    const qs = params.toString();
    return this.request(`/guidelines/${qs ? '?' + qs : ''}`);
  }

  async getGuidelinesSummary() {
    return this.request('/guidelines/summary');
  }

  async createGuideline(data) {
    return this.request('/guidelines/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGuideline(id, data) {
    return this.request(`/guidelines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteGuideline(id) {
    return this.request(`/guidelines/${id}`, { method: 'DELETE' });
  }

  // Scans
  async uploadAndScan(file, department = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('department', department);

    return this.request('/scans/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getScans(status = null, limit = 20, offset = 0) {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.set('status', status);
    return this.request(`/scans/?${params}`);
  }

  async getScan(id) {
    return this.request(`/scans/${id}`);
  }

  async getDashboard() {
    return this.request('/scans/dashboard');
  }

  async deleteScan(id) {
    return this.request(`/scans/${id}`, { method: 'DELETE' });
  }

  // Issues
  async getIssues(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.severity) params.set('severity', filters.severity);
    if (filters.category) params.set('category', filters.category);
    return this.request(`/issues/?${params}`);
  }

  async getIssueStats() {
    return this.request('/issues/stats');
  }

  async updateIssue(id, data) {
    return this.request(`/issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async resolveIssue(id) {
    return this.request(`/issues/${id}/resolve`, { method: 'POST' });
  }
}

export const api = new ApiClient();
export default api;
