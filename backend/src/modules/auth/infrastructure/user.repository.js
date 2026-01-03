import { UserModel } from "./user.model.js";

const findByEmail = (email) => UserModel.findOne({ email }).exec();
const createUser = (data) => UserModel.create(data);
const findById = (id) => UserModel.findById(id).exec();

export const userRepository = {
  findByEmail,
  createUser,
  findById
};
