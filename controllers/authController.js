const AuthService = require("../services/authService");
const { startConnection, endConnection } = require("../config/conn");
const { NODE_ENV } = require("../utils/envVariables");

const AuthController = {
    login: async (req, res) => {
        const conn = await startConnection(req);
        try {
            const { status, response } = await AuthService.login(conn, req)
            if(NODE_ENV === 'production') {
                // Loop through the response object and set each value as a cookie
                if(status === 200) {
                    response.rows.map(({ name, value}) => {
                        res.cookie(name, value, {
                            httpOnly: true,   // Prevents client-side access
                            secure: true,     // Ensure cookies are sent only via HTTPS (set to false for local dev)
                            sameSite: 'Lax',  // Allow cross-site cookie
                            maxAge: 24 * 60 * 60 * 1000 // Will expire after 24 hours
                        });
                    });
                }
                const { email, env, rows, ...filteredResponse } = response;
                res.status(status).json(filteredResponse);
            } 
            else {
                res.status(status).json(response);
            }
        } catch (error) {
            console.log({error});
            res.json({message: error.message, email: req.body.email});
        } finally {
            await endConnection(conn);
        }
    }
}

module.exports = AuthController;