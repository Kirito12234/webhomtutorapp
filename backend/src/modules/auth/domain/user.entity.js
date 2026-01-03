export const toUserEntity = (userDoc) => ({
  id: userDoc._id.toString(),
  email: userDoc.email,
  role: userDoc.role,
  createdAt: userDoc.createdAt
});
