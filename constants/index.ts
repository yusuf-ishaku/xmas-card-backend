import { genSaltSync } from "bcryptjs";

export const USER_ID = "USER_ID";
export const PASSWORD_HASH_SALT = genSaltSync(10);
