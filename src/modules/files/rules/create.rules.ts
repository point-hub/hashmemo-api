/**
 * Available rules
 * https://github.com/mikeerickson/validatorjs?tab=readme-ov-file#available-rules
 */

export const createRules = {
  pdf_url: ['required', 'string'],
  approvals: ['required'],
  signatures: ['required'],
};
