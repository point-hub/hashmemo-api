export const verifyEmailRules = {
  code: ['required', 'string'],
  name: ['required', 'string'],
  birthdate: ['required', 'string'],
  nik: ['required', 'string'],
  initial_name: ['required', 'max:3', 'string'],
  photo_id_url: ['required', 'string'],
  password: ['required', 'min:8', 'string'],
};
