const AuthDAO = require("../dataAccess/authDAO");
const AuthUtil = require("../utils/authUtil");

const AuthService = {
    login: async (conn, req) => {
        const { email } = req.body
        console.log(email);
        
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
            return {
                status: 200,
                response: {message: "Success", rows, token, path}
            }
        } else {
            return {
                status: 401,
                response: {message: "Invalid Credentials", rows: null, token: null, path: "/"},
            }
        }
    } 
}

module.exports = AuthService