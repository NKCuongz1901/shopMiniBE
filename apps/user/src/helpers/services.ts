const bcrypt = require('bcrypt');
const saltRounds = 10;

export const comparePassword = async (plainPassword: string, hashPassword?: string) => {
    try {
        return await bcrypt.compare(plainPassword, hashPassword);
    } catch (error) {
        console.log(error);
    }
}