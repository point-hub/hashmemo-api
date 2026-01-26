export const createRules = {
  email: ['required', 'string', 'email'],
  username: ['required', 'string', 'min:5', 'max:24', 'username_format'],
  role_id: ['required', 'string'],
};
