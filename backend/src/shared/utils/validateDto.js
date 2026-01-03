export const validateDto = (schema) => (req, res, next) => {
  schema.parse(req.body);
  next();
};
