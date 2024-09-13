const UserService = require("../services/userService");

const UserController = {
    createUser: async (req, res) => {
        try {
          const response = await UserService.createUser(req);
          res.json(response)
        } catch (error) {
          response = {"success": 0, message: "Unable to Create.", error: err.message}
          console.error(err.message);
        }
    },
    updateUser: async (req, res) => {
        try {
            const response = await UserService.updateUser(req);
            res.json(response)
        } catch (error) {
            console.error(error.message);
            res.json({message: "Failed to Update", error: error.message});
        }
    }
}

module.exports = UserController