const AuthDAO = require("../dataAccess/authDAO");
const AuthUtil = require("../utils/authUtil");
const { NODE_ENV } = require("../utils/envVariables");

const AuthService = {
    login: async (conn, req) => {
        const { email } = req.body
        const accessLevels = {
            admin: ["Administrator","Registrar","Dean","Chairperson"],
            faculty: ["Faculty", "Partime"]
        }
        const rows = await AuthDAO.login(conn, email);
        const path = (accessLevels.admin.includes(rows?.accessLevel)) 
                        ? "/admin" 
                        : (accessLevels.faculty.includes(rows?.accessLevel)) 
                            ? "/home"
                            : "/"
        if(Object.entries(rows).length > 0) {
            const token = AuthUtil.generateToken(rows)
            const data = [];
            Object.keys(rows).map(key => data.push({name:key, value: rows[key]}));
            const finalData = [
                ...data, 
                {name: "token", value: token}, 
                {name: "email", value: email}
            ]
            return {
                status: 200,
                response: {message: "Success", token, rows:finalData, path, email}
            }
        } else {
            return {
                status: 401,
                response: {message: "Invalid Credentials"},
            }
        }
    } 
}

module.exports = AuthService