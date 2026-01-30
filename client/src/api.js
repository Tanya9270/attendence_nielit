const jsonSafe = async (res) => {
  try { return await res.json(); } catch (e) { return null; }
};

export const api = {
  async request(path, opts = {}, token) {
    const headers = Object.assign({}, opts.headers || {});
    if (!headers['Content-Type'] && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(path, Object.assign({}, opts, { headers }));
    const body = await jsonSafe(res);
    return Object.assign({ ok: res.ok, status: res.status }, body);
  },

  getTeachers(token) { return this.request('/api/teachers', { method: 'GET' }, token); },
  getCourses(token) { return this.request('/api/courses', { method: 'GET' }, token); },
  getStudents(token) { return this.request('/api/students', { method: 'GET' }, token); },

  createTeacher(token, username, password, course_code, course_name) {
    return this.request('/api/teachers', {
      method: 'POST',
      body: JSON.stringify({ username, password, course_code, course_name })
    }, token);
  },
  updateTeacher(token, id, payload) {
    return this.request(`/api/teachers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }, token);
  },
  deleteTeacher(token, id) {
    return this.request(`/api/teachers/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);
  },

  createStudent(token, roll_number, name, course_codes, password) {
    return this.request('/api/students', {
      method: 'POST',
      body: JSON.stringify({ roll_number, name, course_codes, password })
    }, token);
  },
  updateStudent(token, id, payload) {
    return this.request(`/api/students/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }, token);
  },
  deleteStudent(token, id) {
    return this.request(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);
  },

  deleteCourse(token, code) {
    return this.request(`/api/courses/${encodeURIComponent(code)}`, { method: 'DELETE' }, token);
  },

  normalizeUsername(token, id) {
    return this.request(`/api/students/${encodeURIComponent(id)}/normalize`, { method: 'POST' }, token);
  }
};
export default api;
