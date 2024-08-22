const AuthService = require("../services/authService");
const {startConnection, endConnection } = require("../config/conn")

const AuthController = {
    login: async (req, res) => {
        const conn = await startConnection(req);
        try {
            const { status, response } = await AuthService.login(conn, req)
            res.status(status).json(response)
        } catch (error) {
            res.json({message: error.message, email});
        } finally {
            await endConnection(conn);
        }
        // try {
        //     console.log("OK");
        //     res.json({message:"OK"})
        // } catch (error) {
        //     console.error(error)
        // }
    }
}

module.exports = AuthController;