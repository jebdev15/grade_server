const AuthService = require("../services/authService");
const { startConnection, endConnection } = require("../config/conn")

const AuthController = {
    login: async (req, res) => {
        const conn = await startConnection(req);
        try {
            const { status, response } = await AuthService.login(conn, req)
            res.status(status).json(response)
        } catch (error) {
            console.log({error});
            res.json({message: error.message, email: req.body.email});
        } finally {
            await endConnection(conn);
        }
    }
}

module.exports = AuthController;