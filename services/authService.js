const AuthDAO = require("../dataAccess/authDAO");

const AuthService = {
    login: async (conn, req) => {
        const { email } = req.body
        console.log(email);
        
        const accessLevels = ["Administrator","Registrar","Dean","Chairperson"];
        const rows = await AuthDAO.login(conn, email);
        if(rows.length > 0) {
            // const path = (accessLevels.includes(rows.accessLevel)) ? "/admin" : "/home"
            return {
                status: 200,
                response: {message: "Success", rows}
            }
        } else {
            return {
                status: 401,
                response: {message: "Invalid Credentials", email},
            }
        }
    } 
}

module.exports = AuthService