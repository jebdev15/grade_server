const AuthModel = require('../models/authModel');

const AuthDAO = {
  login: async (conn, email) => {
    const query = `SELECT faculty_id, accessLevel, college_code, program_code FROM emails WHERE email = ? AND status = ?`;
    const [rows] = await conn.execute(query,[email, 1]);
    if (rows.length > 0) {
      return new AuthModel(
        rows[0]?.faculty_id,
        rows[0]?.accessLevel,
        rows[0]?.college_code,
        rows[0]?.program_code
      );
    }
    return {};
  }
}

module.exports = AuthDAO